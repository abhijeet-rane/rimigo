import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { ArrowRight, Bike, Bus, Car, Footprints, Plane, Ship, TrainFront } from 'lucide-react'
import { type ItineraryViewMode } from './HeaderCalender'
import { useItineraryRouteSummary, type IItineraryCompletedResponse } from '../hooks/ItineraryHook'
import type { RouteSummaryHop } from '@/api/itineraryApi'
import { capitalizeFirstLetter } from '@/utils/formatTextUtil'
import { findTransportMode } from '../constants/transportModes'

type ItineraryDay = NonNullable<IItineraryCompletedResponse['days']>[number]

interface CityRouteBarProps {
    itineraryId: string
    days: ItineraryDay[]
    viewMode: ItineraryViewMode
}

interface CitySegment {
    cityName: string
    cityId: string
    nights: number
    firstDayIndex: number
}

// Number of visible columns — must match DesktopKanbanView
const VISIBLE_COLUMNS = 4.25

// ---------- Helpers ----------

/**
 * Derive flat city segments from the days[] prop. Used as a fallback when
 * the route-summary API is loading, errors out, or returns no data — keeps
 * the header strip intact in shared-link views where the new endpoint
 * might be slow or temporarily unreachable.
 */
const deriveFromDays = (days: ItineraryDay[]): CitySegment[] => {
    if (!days?.length) return []

    const segments: CitySegment[] = []
    let currentCity: string | null = null
    let currentCityId: string | null = null
    let nightCount = 0
    let firstDayIndex = 0

    days.forEach((day, index) => {
        const cityName = day.base_city?.name || day.destination_city?.name || 'Unknown'
        const cityId = day.base_city?.id || day.destination_city?.id || ''

        if (cityName === currentCity) {
            nightCount++
        } else {
            if (currentCity) {
                segments.push({
                    cityName: currentCity,
                    cityId: currentCityId!,
                    nights: nightCount,
                    firstDayIndex
                })
            }
            currentCity = cityName
            currentCityId = cityId
            nightCount = 1
            firstDayIndex = index
        }
    })

    if (currentCity) {
        segments.push({
            cityName: currentCity,
            cityId: currentCityId!,
            nights: nightCount,
            firstDayIndex
        })
    }

    return segments
}

/**
 * Map a transport mode string to a lucide-react icon.
 *
 * Prefers the canonical icon from ``transportModes.ts`` when the mode
 * label matches a known entry (~150 curated modes with per-category
 * icons). Falls back to a regex sweep for legacy free-form modes
 * ("Rajdhani", "Local train", "Speedboat #3") that predate the picker.
 * Conservative default is ``ArrowRight`` — a neutral connector rather
 * than a specific icon claim for unknown modes.
 */
const pickTransportIcon = (mode: string) => {
    const canonical = findTransportMode(mode)
    if (canonical) return canonical.icon
    const m = (mode || '').toLowerCase()
    if (!m) return ArrowRight
    if (/helicopter|chopper/.test(m)) return Plane
    if (/flight|plane|air|jet/.test(m)) return Plane
    if (/shinkansen|train|rail|metro|subway|tram|funicular|monorail/.test(m)) return TrainFront
    if (/scooter|motorbike|bike|bicycle|pedicab|rickshaw/.test(m)) return Bike
    if (/car|taxi|uber|ride|transfer|tuk|auto/.test(m)) return Car
    if (/bus|coach|minibus|shuttle|brt|jeepney|matatu/.test(m)) return Bus
    if (/ferry|boat|cruise|water|gondola|longtail|dhow|junk|kayak|yacht/.test(m)) return Ship
    if (/walk|hike|foot/.test(m)) return Footprints
    return ArrowRight
}

// ---------- Component ----------

const CityRouteBar = ({ itineraryId, days, viewMode }: CityRouteBarProps) => {
    const [activeIndex, setActiveIndex] = useState(0)
    const isClickScrollingRef = useRef(false)
    const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const { data: routeSummary, isLoading: isRouteLoading } = useItineraryRouteSummary(itineraryId)

    // Build a lookup: city-id → index of its first day in the days[] array.
    // Needed so clicks on stay pills can scroll the kanban/calendar to the
    // correct day even when the pill ordering comes from the API.
    const cityIdToDayIndex = useMemo(() => {
        const map = new Map<string, number>()
        if (!days?.length) return map
        days.forEach((day, index) => {
            const cityId = day.base_city?.id || day.destination_city?.id
            if (cityId && !map.has(cityId)) {
                map.set(cityId, index)
            }
        })
        return map
    }, [days])

    // Fallback segments if the API isn't ready / errored / returned empty
    const fallbackSegments = useMemo(() => deriveFromDays(days), [days])

    // The API's ``route_chain`` IS the deduped city-level walk:
    // origin → each stay → final destination, with the inbound
    // transit attached to every non-origin hop. Day-trip cities are
    // already excluded by the backend. Render-time work is therefore
    // a single linear walk — no grouping, no collapse pass, no
    // stopover bookkeeping.
    const hops = useMemo<RouteSummaryHop[] | null>(() => {
        const chain = routeSummary?.route_chain
        if (!chain || chain.length === 0) return null
        return chain
    }, [routeSummary])

    // Active-tracking anchors: only hops the user actually slept in
    // (nights > 0) are scroll targets. Origin / final-destination
    // hops (nights = 0) are visual bookends.
    const stayAnchors = useMemo(() => {
        if (!hops) {
            return fallbackSegments.map((s, i) => ({
                cityId: s.cityId,
                firstDayIndex: s.firstDayIndex,
                entryIndex: i,
            }))
        }
        const anchors: { cityId: string; firstDayIndex: number; entryIndex: number }[] = []
        hops.forEach((hop, i) => {
            if (hop.nights <= 0) return
            const dayIdx = cityIdToDayIndex.get(hop.city.id) ?? -1
            if (dayIdx >= 0) {
                anchors.push({ cityId: hop.city.id, firstDayIndex: dayIdx, entryIndex: i })
            }
        })
        return anchors
    }, [hops, fallbackSegments, cityIdToDayIndex])

    // Derive column width from the scroll container's width
    const getColumnWidth = useCallback(() => {
        const containerId = viewMode === 'kanban' ? 'kanban-scroll-container' : 'calendar-root'
        const container = document.getElementById(containerId)
        if (!container) return 260 // fallback
        const w = container.clientWidth
        return w > 0 ? Math.floor(w / VISIBLE_COLUMNS) : 260
    }, [viewMode])

    // Ensure the first stay is highlighted on initial render — before any
    // scroll happens. Without this, `activeIndex` sits at 0 (often an
    // endpoint bookend like the home city), so nothing appears selected
    // until the user scrolls. Re-syncs whenever the anchor list changes
    // (e.g. after the API payload replaces the fallback).
    useEffect(() => {
        if (stayAnchors.length === 0) return
        setActiveIndex((prev) => {
            const pointsToStay = stayAnchors.some((a) => a.entryIndex === prev)
            return pointsToStay ? prev : stayAnchors[0].entryIndex
        })
    }, [stayAnchors])

    // Track scroll position to highlight active city. Only stay entries are
    // "anchors" — day_trip / stopover pills don't become the active city.
    useEffect(() => {
        const containerId = viewMode === 'kanban' ? 'kanban-scroll-container' : 'calendar-root'
        const container = document.getElementById(containerId)
        if (!container) return

        const handleScroll = () => {
            if (isClickScrollingRef.current) return

            const colW = getColumnWidth()
            const scrollLeft = container.scrollLeft
            const visibleDayIndex = Math.round(scrollLeft / colW)

            for (let i = stayAnchors.length - 1; i >= 0; i--) {
                if (visibleDayIndex >= stayAnchors[i].firstDayIndex) {
                    setActiveIndex(stayAnchors[i].entryIndex)
                    break
                }
            }
        }

        container.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()
        return () => container.removeEventListener('scroll', handleScroll)
    }, [viewMode, stayAnchors, getColumnWidth])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)
        }
    }, [])

    const scrollToDayIndex = useCallback(
        (dayIndex: number, entryIndex: number) => {
            const containerId = viewMode === 'kanban' ? 'kanban-scroll-container' : 'calendar-root'
            const container = document.getElementById(containerId)
            if (!container) return

            isClickScrollingRef.current = true
            if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)
            clickTimeoutRef.current = setTimeout(() => {
                isClickScrollingRef.current = false
            }, 800)

            const colW = getColumnWidth()
            const scrollTarget = dayIndex * colW
            container.scrollTo({ left: scrollTarget, behavior: 'smooth' })
            setActiveIndex(entryIndex)
        },
        [viewMode, getColumnWidth]
    )

    // ---------- Loading shimmer ----------
    // While the first route-summary fetch is in flight, render pill-shaped
    // skeletons instead of the days-derived fallback. We only drop to the
    // fallback after the request completes without usable data (empty
    // response or error), so there's no flash of fallback pills before the
    // real ones arrive.
    if (isRouteLoading) {
        const skeletonWidths = [96, 88, 104, 84, 100]
        return (
            <div
                className="flex items-center gap-2 px-3 py-2 bg-white overflow-x-auto flex-1 min-w-0"
                style={{ scrollbarWidth: 'none' }}>
                {skeletonWidths.map((width, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-2 shrink-0">
                        <div
                            style={{ width: `${width}px` }}
                            className="h-9 rounded-[32px] bg-grey-4/70 animate-pulse"
                        />
                        {index < skeletonWidths.length - 1 && <span className="w-5 border-t border-dashed border-grey-4" />}
                    </div>
                ))}
            </div>
        )
    }

    // ---------- Fallback render (days[] only) ----------

    if (!hops) {
        if (fallbackSegments.length === 0) return null
        return (
            <div
                className="flex items-center gap-2 px-3 py-2 bg-white overflow-x-auto flex-1 min-w-0"
                style={{ scrollbarWidth: 'none' }}>
                {fallbackSegments.map((segment, index) => {
                    const isActive = activeIndex === index
                    return (
                        <button
                            key={`${segment.cityId}-${index}`}
                            onClick={() => scrollToDayIndex(segment.firstDayIndex, index)}
                            className={`shrink-0 px-3.5 py-1.5 rounded-full cursor-pointer transition-all text-[13px] font-manrope whitespace-nowrap
                                ${isActive ? 'bg-grey-0 text-white font-semibold' : 'bg-grey-5 text-grey-1 hover:bg-grey-4 font-medium'}`}>
                            {segment.cityName}
                            <span className={`ml-1.5 ${isActive ? 'text-white/70' : 'text-grey-2'}`}>
                                {segment.nights} {segment.nights === 1 ? 'night' : 'nights'}
                            </span>
                        </button>
                    )
                })}
            </div>
        )
    }

    // ---------- API-driven render ----------

    /** Origin / final-destination pill — same shape as a stay, no
     *  nights tag, not interactive. ``capitalizeFirstLetter`` because
     *  backend bookends sometimes carry lowercase names lifted from a
     *  transport title parse. */
    const renderEndpointHop = (hop: RouteSummaryHop, key: string) => (
        <div
            key={key}
            className="shrink-0 flex items-center py-2 px-5 rounded-[32px] bg-grey-5 whitespace-nowrap">
            <span className="font-red-hat-display text-[14px] leading-[18px] tracking-[-0.56px] font-[645] text-grey-0">
                {capitalizeFirstLetter(hop.city.name)}
            </span>
        </div>
    )

    /** A stay hop — scrollable, active-tracking, ``N nights`` tag. */
    const renderStayHop = (hop: RouteSummaryHop, hopIndex: number) => {
        const isActive = activeIndex === hopIndex
        const dayIndex = cityIdToDayIndex.get(hop.city.id)
        const canScroll = dayIndex !== undefined
        return (
            <button
                key={`stay-${hop.city.id}-${hopIndex}`}
                onClick={() => (canScroll ? scrollToDayIndex(dayIndex!, hopIndex) : undefined)}
                disabled={!canScroll}
                className={`shrink-0 flex items-center gap-2 py-2 px-5 rounded-[32px] transition-colors whitespace-nowrap
                    ${canScroll ? 'cursor-pointer' : 'cursor-default'}
                    ${isActive ? 'bg-grey-0 hover:bg-grey-0' : 'bg-grey-5 hover:bg-grey-4'}`}>
                <span
                    className={`font-red-hat-display text-[14px] leading-[18px] tracking-[-0.56px] font-[645]
                        ${isActive ? 'text-white' : 'text-grey-0'}`}>
                    {hop.city.name}
                </span>
                <span
                    className={`font-manrope text-[12px] leading-[18px] tracking-[-0.48px] font-bold
                        ${isActive ? 'text-white/70' : 'text-grey-2'}`}>
                    {hop.nights} {hop.nights === 1 ? 'night' : 'nights'}
                </span>
            </button>
        )
    }

    /** Inbound-transit icon — dashed connectors flanking a mode glyph. */
    const renderTransitLink = (link: NonNullable<RouteSummaryHop['arrived_via']>, key: string) => {
        const Icon = pickTransportIcon(link.mode)
        return (
            <span
                key={key}
                className="shrink-0 flex items-center gap-1 text-grey-1"
                aria-label={link.mode || 'transport'}>
                <span className="w-2 border-t border-dashed border-grey-4" />
                <span className="flex items-center justify-center px-1.5 py-1 rounded-full bg-grey-4">
                    <Icon size={12} strokeWidth={2.5} />
                </span>
                <span className="w-2 border-t border-dashed border-grey-4" />
            </span>
        )
    }

    return (
        <div
            className="flex items-center gap-2 px-3 py-2 bg-white overflow-x-auto flex-1 min-w-0"
            style={{ scrollbarWidth: 'none' }}>
            {hops!.flatMap((hop, idx) => {
                const nodes: React.ReactNode[] = []
                if (hop.arrived_via) {
                    nodes.push(renderTransitLink(hop.arrived_via, `link-${idx}`))
                }
                nodes.push(
                    hop.nights > 0
                        ? renderStayHop(hop, idx)
                        : renderEndpointHop(hop, `endpoint-${idx}`),
                )
                return nodes
            })}
        </div>
    )
}

export default CityRouteBar
