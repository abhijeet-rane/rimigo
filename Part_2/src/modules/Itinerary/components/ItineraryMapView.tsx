/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    useState,
    useMemo,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useImperativeHandle,
    forwardRef,
    type CSSProperties
} from 'react'
import { AnimatePresence } from 'framer-motion'
import {
    Binoculars,
    Bus,
    Car,
    ChevronLeft,
    ChevronRight,
    Home,
    Plane,
    Train,
    Wine,
    type LucideIcon
} from 'lucide-react'
import type { ItineraryStay } from '@/api/itineraryApi'
import { GenericMap, type MapMarker } from '@/components/shared/Map'
import { StayChip } from './StayChip'
import { deriveDayStayMap } from '../utils/deriveStayMap'
import { MAP_CONFIG } from '@/components/shared/Map/mapConfig'
import { DayMapData } from '../hooks/useItineraryMapData'
import { transformItineraryToEvents } from './RenderCalenderEventmobile'
import Typography from '@/components/shared/Typography'
import { formatDate } from '../utils/ItineraryUtils'
import type { KanbanPendingPlacement, KanbanPlacementCommitPayload, KanbanCustomTimeOpenArgs } from './kanbanPlacementUtils'
import {
    mergePendingIntoSortedList,
    sortedVisibleForDay,
    computePlacementAnchorUtcMs,
    getEventDurationMs,
    kanbanDropIsNoOpSamePosition,
    scrollKanbanPendingPlacementIntoView
} from './kanbanPlacementUtils'
import { ChooseStartTimeStrip } from './ChooseStartTimeStrip'
import { KanbanEventCard } from './DesktopKanbanView'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { SLOT_TYPE_CONFIG, resolveTransportSlotType, type SlotType } from './BaseEventLayout'
import { isTransportKind } from '../constants/transportKinds'

export type ItineraryMapViewHandle = {
    /** Same as clicking a day pill: updates selection and scrolls the sidebar list to that day. */
    selectDayAndScrollTo: (dayIndex: number) => void
}

interface ItineraryMapViewProps {
    dayMapData: DayMapData[]
    /** @deprecated Unused; kept optional for older call sites */
    allMarkers?: MapMarker[]
    getMarkersForDay: (dayIndex: number) => MapMarker[]
    isLoading: boolean
    primaryCityName: string
    days: any[]
    /** Canonical itinerary events (same source as Kanban) — enables drag/drop + placement strip */
    events?: any[]
    highlightedSlots?: Set<string>
    selectedDayIndex: number
    onSelectedDayIndexChange: (dayIndex: number) => void
    getDayRouteCoordinates?: (dayIndex: number) => [number, number][]
    hideExactDates?: boolean
    canEdit?: boolean
    isViewer?: boolean
    pendingPlacement?: KanbanPendingPlacement | null
    onPendingPlacementChange?: (p: KanbanPendingPlacement | null) => void
    onPlacementCommit?: (payload: KanbanPlacementCommitPayload) => void | Promise<void>
    onOpenCustomPlacementTime?: (args: KanbanCustomTimeOpenArgs) => void
    hidePlacementTimeUi?: boolean
    placementSavingSlotId?: string | null
    onEditEvent?: (event: any) => void
    onDeleteEvent?: (event: any) => void
    shortlistedExperienceIds?: Set<string>
    onViewMap?: (experienceId: string, dayIndex?: number) => void
    changedSlotBadges?: Set<string>
    /** Itinerary-level stays; used by the day header chip to show the
     *  attached hotel (or offer an Add Stay affordance when empty). */
    stays?: ItineraryStay[]
    /** Open the inline stay picker drawer for this city. */
    onAddStay?: (cityId: string) => void
    /** Row-level menu action on an existing stay (same contract the
     *  Kanban view uses). Only ``'change'`` is fired from this header. */
    onStayAction?: (
        action: 'remove' | 'change',
        stayId: string,
        cityId: string | null
    ) => void
}

/** Vertical dashed spine — avoid w-0+border (border-box collapses the stroke). */
const MAP_TIMELINE_SPINE_STYLE = (heightPx: number): CSSProperties => ({
    width: 2,
    height: heightPx,
    flexShrink: 0,
    borderRadius: 1,
    backgroundImage:
        'repeating-linear-gradient(to bottom, #8f8f9c 0px, #8f8f9c 5px, transparent 5px, transparent 10px)'
})

const insertIndexFromListClientY = (listEl: HTMLElement, clientY: number, listLength: number) => {
    const nodes = listEl.querySelectorAll<HTMLElement>('[data-map-slot-index]')
    for (let i = 0; i < nodes.length; i++) {
        const rect = nodes[i].getBoundingClientRect()
        if (clientY < rect.top + rect.height / 2) return i
    }
    return listLength
}

// MAP_TRANSPORT_KINDS migrated to shared
// ``src/modules/Itinerary/constants/transportKinds.ts::isTransportKind``

/** Align with calendar slot semantics; hotel/stay uses wine glass, activities use binoculars (see BaseEventLayout). */
const resolveMapSidebarSlotType = (event: any): SlotType => {
    const kind = String(event?.kind || '').toLowerCase()
    const type = String(event?.type || '').toLowerCase()
    if (type === 'stay' || kind === 'stay') return 'hotel'
    if (type === 'restaurant' || kind === 'meal') return 'meal'
    if (type === 'experience' || kind === 'experience') return 'experience'
    if (type === 'visit' || kind === 'visit') return 'visit'
    if (type === 'transport' || isTransportKind(kind)) return resolveTransportSlotType(kind)
    if (type === 'custom' || kind === 'custom') return 'visit'
    return 'default'
}

const MAP_SIDEBAR_BADGE_ICON: Record<SlotType, LucideIcon> = {
    meal: Wine,
    hotel: Wine,
    experience: Binoculars,
    visit: Binoculars,
    flight: Plane,
    train: Train,
    bus: Bus,
    car: Car,
    transport: Plane,
    default: Home
}

const MapSidebarSlotTypeBadge = ({ event }: { event: any }) => {
    const slotType = resolveMapSidebarSlotType(event)
    const cfg = SLOT_TYPE_CONFIG[slotType]
    const Icon = MAP_SIDEBAR_BADGE_ICON[slotType] ?? Home
    return (
        <div
            className="pointer-events-none absolute bottom-0 right-0 z-[6] flex h-7 w-7 items-center justify-center rounded-tl-[12px]"
            style={{ backgroundColor: cfg.iconBgColor, color: cfg.iconColor }}
            aria-hidden>
            <Icon
                size={14}
                strokeWidth={2}
            />
        </div>
    )
}

const ItineraryMapView = forwardRef<ItineraryMapViewHandle, ItineraryMapViewProps>(function ItineraryMapView(
    {
        dayMapData,
        getMarkersForDay,
        isLoading: _isLoading,
        primaryCityName,
        days,
        events: eventsProp,
        highlightedSlots,
        selectedDayIndex,
        onSelectedDayIndexChange,
        getDayRouteCoordinates,
        hideExactDates = false,
        canEdit = false,
        isViewer = false,
        pendingPlacement = null,
        onPendingPlacementChange,
        onPlacementCommit,
        onOpenCustomPlacementTime,
        hidePlacementTimeUi = false,
        placementSavingSlotId = null,
        onEditEvent,
        onDeleteEvent,
        shortlistedExperienceIds,
        onViewMap,
        changedSlotBadges,
        stays,
        onAddStay,
        onStayAction
    },
    ref
) {
    const { trackButtonClickCustom } = usePostHog()
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [localEvents, setLocalEvents] = useState<any[]>([])
    const events = eventsProp ?? localEvents

    const eventsScrollRef = useRef<HTMLDivElement>(null)
    const isScrollingProgrammatically = useRef(false)
    const scrollTimeout = useRef<number | null>(null)
    const listInitialScrollDoneRef = useRef(false)
    /** While true, scroll-spy must not overwrite parent selection (avoids flash to Day 1 before initial scroll). */
    const suppressScrollSpyRef = useRef(true)
    const selectedDayIndexRef = useRef(selectedDayIndex)
    selectedDayIndexRef.current = selectedDayIndex

    const [draggingEvent, setDraggingEvent] = useState<any>(null)
    const [dragOverDayIndex, setDragOverDayIndex] = useState<number | null>(null)
    const [insertionTarget, setInsertionTarget] = useState<{ dayIndex: number; insertIndex: number } | null>(null)

    const draggingEventRef = useRef<any>(null)
    const insertionTargetRef = useRef<{ dayIndex: number; insertIndex: number } | null>(null)
    const dropHandledRef = useRef(false)

    const resetDragState = useCallback(() => {
        setDraggingEvent(null)
        setDragOverDayIndex(null)
        setInsertionTarget(null)
        draggingEventRef.current = null
        insertionTargetRef.current = null
    }, [])

    const setInsertionTargetBoth = useCallback((val: { dayIndex: number; insertIndex: number } | null) => {
        const prev = insertionTargetRef.current
        if (val === null && prev === null) return
        if (
            val !== null &&
            prev !== null &&
            prev.dayIndex === val.dayIndex &&
            prev.insertIndex === val.insertIndex
        ) {
            return
        }
        insertionTargetRef.current = val
        setInsertionTarget(val)
    }, [])

    useEffect(() => {
        if (eventsProp !== undefined) return
        if (!days || days.length === 0) return
        setLocalEvents(transformItineraryToEvents(days, highlightedSlots))
    }, [days, highlightedSlots, eventsProp])

    /**
     * After events exist, scroll the sidebar list to match `selectedDayIndex` from the parent once.
     * (Board "View on map", overview day cards, ?itineraryDay=…&itineraryMap=1, etc.)
     */
    useEffect(() => {
        if (events.length === 0) return

        let cancelled = false
        const scrollTimer = window.setTimeout(() => {
            if (cancelled || listInitialScrollDoneRef.current) return
            listInitialScrollDoneRef.current = true

            const enableSpy = () => {
                window.requestAnimationFrame(() => {
                    suppressScrollSpyRef.current = false
                })
            }

            if (selectedDayIndex === 0) {
                enableSpy()
                return
            }

            const container = eventsScrollRef.current
            const section = container?.querySelector<HTMLElement>(
                `.day-section[data-day-index="${selectedDayIndex}"]`
            )
            if (!container || !section) {
                enableSpy()
                return
            }

            isScrollingProgrammatically.current = true
            container.scrollTo({ top: section.offsetTop - 80, behavior: 'smooth' })

            if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
            scrollTimeout.current = window.setTimeout(() => {
                isScrollingProgrammatically.current = false
                suppressScrollSpyRef.current = false
            }, 1000)
        }, 100)

        return () => {
            cancelled = true
            clearTimeout(scrollTimer)
        }
    }, [events.length, selectedDayIndex])

    // Scrollspy: sync selected day + map with whichever day section is active in the sidebar list.
    const scrollSpyRaf = useRef<number | null>(null)
    useEffect(() => {
        const root = eventsScrollRef.current
        if (!root) return

        const FOCUS_OFFSET_PX = 96

        const computeActiveDay = () => {
            if (suppressScrollSpyRef.current || isScrollingProgrammatically.current) return
            const sections = Array.from(root.querySelectorAll<HTMLElement>('.day-section'))
            if (sections.length === 0) return

            const rootRect = root.getBoundingClientRect()
            const nearBottom = root.scrollTop + root.clientHeight >= root.scrollHeight - 12

            let active = 0
            if (nearBottom) {
                const last = sections[sections.length - 1]
                const idx = Number(last.getAttribute('data-day-index'))
                active = Number.isNaN(idx) ? sections.length - 1 : idx
            } else {
                const focusY = rootRect.top + FOCUS_OFFSET_PX
                for (const sec of sections) {
                    const idx = Number(sec.getAttribute('data-day-index'))
                    if (Number.isNaN(idx)) continue
                    const r = sec.getBoundingClientRect()
                    if (r.top <= focusY) {
                        active = idx
                    }
                }
            }

            if (active !== selectedDayIndexRef.current) {
                onSelectedDayIndexChange(active)
            }
        }

        const onScroll = () => {
            if (scrollSpyRaf.current != null) return
            scrollSpyRaf.current = window.requestAnimationFrame(() => {
                scrollSpyRaf.current = null
                computeActiveDay()
            })
        }

        root.addEventListener('scroll', onScroll, { passive: true })
        computeActiveDay()

        return () => {
            root.removeEventListener('scroll', onScroll)
            if (scrollSpyRaf.current != null) {
                cancelAnimationFrame(scrollSpyRaf.current)
                scrollSpyRaf.current = null
            }
        }
    }, [days.length, events.length, onSelectedDayIndexChange])

    useEffect(() => {
        const onDragEnd = () => {
            window.setTimeout(() => {
                if (dropHandledRef.current) {
                    dropHandledRef.current = false
                    return
                }
                if (draggingEventRef.current) resetDragState()
            }, 0)
        }
        window.addEventListener('dragend', onDragEnd)
        return () => window.removeEventListener('dragend', onDragEnd)
    }, [resetDragState])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || !pendingPlacement || !onPendingPlacementChange) return
            onPendingPlacementChange(null)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [pendingPlacement, onPendingPlacementChange])

    useLayoutEffect(() => {
        if (!pendingPlacement || hidePlacementTimeUi) return
        let innerRaf = 0
        const outerRaf = requestAnimationFrame(() => {
            innerRaf = requestAnimationFrame(() => {
                scrollKanbanPendingPlacementIntoView(eventsScrollRef.current)
            })
        })
        return () => {
            cancelAnimationFrame(outerRaf)
            cancelAnimationFrame(innerRaf)
        }
    }, [pendingPlacement?.event?.slot_id, pendingPlacement?.targetDayIndex, hidePlacementTimeUi])

    const handleDateClick = useCallback(
        (index: number) => {
            onSelectedDayIndexChange(index)

            setTimeout(() => {
                const container = eventsScrollRef.current
                const section = container?.querySelector<HTMLElement>(`.day-section[data-day-index="${index}"]`)
                if (!container || !section) return

                isScrollingProgrammatically.current = true
                if (scrollTimeout.current) clearTimeout(scrollTimeout.current)

                container.scrollTo({ top: section.offsetTop - 80, behavior: 'smooth' })

                scrollTimeout.current = window.setTimeout(() => {
                    isScrollingProgrammatically.current = false
                }, 1000)
            }, 50)
        },
        [onSelectedDayIndexChange]
    )

    useImperativeHandle(
        ref,
        () => ({
            selectDayAndScrollTo: handleDateClick
        }),
        [handleDateClick]
    )

    const activeMarkers = useMemo(() => getMarkersForDay(selectedDayIndex), [getMarkersForDay, selectedDayIndex])

    const activeRouteCoordinates = useMemo(() => {
        if (getDayRouteCoordinates) {
            return getDayRouteCoordinates(selectedDayIndex)
        }
        return []
    }, [selectedDayIndex, getDayRouteCoordinates])

    const activeRouteStyle = useMemo(
        () => ({
            color: MAP_CONFIG.routeLine.day.color,
            width: MAP_CONFIG.routeLine.day.width,
            opacity: MAP_CONFIG.routeLine.day.opacity,
            dashArray: [...MAP_CONFIG.routeLine.day.dashArray]
        }),
        []
    )

    const activeCityName = useMemo(() => {
        const day = dayMapData[selectedDayIndex]
        return day?.cityName || primaryCityName || ''
    }, [selectedDayIndex, dayMapData, primaryCityName])

    const handlePopupButtonClick = useCallback(
        (action: 'view_deal' | 'view_details' | 'directions' | 'instagram', marker: MapMarker) => {
            if (action === 'view_deal' && marker.zentrum_hub_id) {
                const clickData = marker.onClickData as {
                    cityId?: string
                    cityName?: string
                    checkIn?: string
                    checkOut?: string
                } | undefined

                const params = new URLSearchParams({
                    hotel_name: marker.name,
                    zentrum_hub_id: marker.zentrum_hub_id,
                    accommodation_id: String(marker.accommodation_id || marker.id),
                    check_in: clickData?.checkIn || '',
                    check_out: clickData?.checkOut || '',
                    city_id: clickData?.cityId || '',
                    city_name: clickData?.cityName || '',
                    travel_purpose: 'leisure_relaxation',
                    group_type: 'couple',
                    city_prefs: '',
                    review_type: 'complete',
                    adults: '2',
                    children: '0',
                    infants: '0'
                })

                window.open(`/stays/${marker.zentrum_hub_id}?${params.toString()}`, '_blank')
            } else if (action === 'view_details' && marker.experience_id) {
                // Experience marker -> open the experience details page.
                // On mobile browsers, window.open('_blank') from inside a callback chain is treated
                // as a blocked popup (no direct user-gesture context). Same-tab navigation via
                // window.location.assign works reliably on mobile; desktop keeps the new-tab behavior.
                const searchParamsString = (marker.onClickData as { searchParams?: string } | undefined)?.searchParams
                const query = searchParamsString ?? ''
                const url = `/experiences/${marker.experience_id}/${query ? `?${query}` : ''}`
                const isMobileViewport =
                    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
                if (isMobileViewport) {
                    window.location.assign(url)
                } else {
                    window.open(url, '_blank', 'noopener')
                }
            }
        },
        []
    )

    const handleMarkerClick = useCallback(
        (markerId: string | number) => {
            const markerStr = String(markerId)
            for (const day of dayMapData) {
                const slot = day.slots.find((s) => s.slotId === markerStr)
                if (slot) {
                    handleDateClick(day.dayIndex)
                    break
                }
            }
        },
        [dayMapData, handleDateClick]
    )

    const selectedDay = dayMapData[selectedDayIndex] ?? null

    const staysById = useMemo(() => {
        const map = new Map<string, ItineraryStay>()
        for (const s of stays ?? []) {
            if (s?.stay_id) map.set(s.stay_id, s)
        }
        return map
    }, [stays])

    const dayStayMap = useMemo(
        () => deriveDayStayMap(days || [], stays || []),
        [days, stays]
    )

    const placementEnabled =
        canEdit &&
        !isViewer &&
        !!onPendingPlacementChange &&
        !!onPlacementCommit &&
        !!onEditEvent &&
        !!onDeleteEvent

    const shortlisted = shortlistedExperienceIds ?? new Set<string>()

    const finalizeDropAsPending = useCallback(
        (dayIndex: number, dayDate: Date, sortedForHit: any[]) => {
            if (!onPendingPlacementChange || pendingPlacement) return
            const ev = draggingEventRef.current
            if (!ev?.slot_id) return

            dropHandledRef.current = true

            if (
                kanbanDropIsNoOpSamePosition(ev, dayIndex, sortedForHit, events, insertionTargetRef.current)
            ) {
                resetDragState()
                return
            }

            let insertIndex =
                insertionTargetRef.current?.dayIndex === dayIndex ? insertionTargetRef.current.insertIndex : sortedForHit.length

            if (ev.dayIndex === dayIndex) {
                const cur = sortedForHit.findIndex((x) => x.slot_id === ev.slot_id)
                if (cur !== -1) {
                    insertIndex = cur < insertIndex ? insertIndex - 1 : insertIndex
                }
            }

            const listWithout = sortedVisibleForDay(events, dayIndex).filter((x) => x.slot_id !== ev.slot_id)
            insertIndex = Math.max(0, Math.min(insertIndex, listWithout.length))

            const durationMs = getEventDurationMs(ev)
            const anchorUtcMs = computePlacementAnchorUtcMs(dayDate, insertIndex, listWithout, durationMs)

            trackButtonClickCustom({
                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_SLOT_DRAG_DROP_PENDING,
                buttonAction: POSTHOG_ACTIONS.DRAG_DROP,
                extra: {
                    source_day_index: ev.dayIndex,
                    target_day_index: dayIndex,
                    insert_index: insertIndex,
                    slot_id: ev.slot_id,
                    surface: 'map_sidebar'
                }
            })

            onPendingPlacementChange({
                event: ev,
                sourceDayIndex: ev.dayIndex,
                targetDayIndex: dayIndex,
                insertIndex,
                anchorUtcMs,
                durationMs
            })
            resetDragState()
        },
        [events, onPendingPlacementChange, pendingPlacement, resetDragState, trackButtonClickCustom]
    )

    const mapListDragOver = useCallback(
        (e: React.DragEvent, dayIndex: number, sortedForHit: any[]) => {
            if (!placementEnabled || !draggingEventRef.current || pendingPlacement) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (dragOverDayIndex !== dayIndex) setDragOverDayIndex(dayIndex)

            const sc = eventsScrollRef.current
            if (sc) {
                const r = sc.getBoundingClientRect()
                const pad = 72
                if (e.clientY < r.top + pad) sc.scrollTop -= 28
                else if (e.clientY > r.bottom - pad) sc.scrollTop += 28
            }

            const listEl = e.currentTarget
            if (!(listEl instanceof HTMLElement)) return
            const insertIndex = insertIndexFromListClientY(listEl, e.clientY, sortedForHit.length)
            setInsertionTargetBoth({ dayIndex, insertIndex })
        },
        [dragOverDayIndex, pendingPlacement, placementEnabled, setInsertionTargetBoth]
    )

    if (!days || days.length === 0) return null

    return (
        <div className="flex w-full h-full">
            {!isSidebarCollapsed && (
                <div className="flex shrink-0 border-r border-grey-4 overflow-hidden" style={{ width: '420px' }}>
                    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-grey-5">
                        <button
                            type="button"
                            onClick={() => setIsSidebarCollapsed(true)}
                            title="Collapse sidebar"
                            className="absolute right-2 top-2 z-30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-grey-4/80 bg-white/95 shadow-sm backdrop-blur-sm hover:bg-grey-5">
                            <ChevronLeft size={16} className="text-grey-2" />
                        </button>

                        <div
                            ref={eventsScrollRef}
                            className="min-h-0 flex-1 overflow-y-auto bg-grey-5"
                            style={{ overscrollBehavior: 'contain', scrollbarWidth: 'thin' }}>
                            {days.map((day: any, dayIndex: number) => {
                                const cityName = day?.base_city?.name || day?.destination_city?.name || ''
                                const cityId =
                                    (day?.base_city?.id as string | undefined) ??
                                    (day?.destination_city?.id as string | undefined) ??
                                    null
                                const stayIdForDay = dayStayMap.get(dayIndex)
                                const stayForDay: ItineraryStay | null =
                                    (stayIdForDay && staysById.get(stayIdForDay)) || null
                                const date = new Date(day.date)
                                const sortedEvents = mergePendingIntoSortedList(dayIndex, events, pendingPlacement)
                                const sortedForDragHit = mergePendingIntoSortedList(dayIndex, events, null)
                                const activeDrag = draggingEventRef.current
                                const isCrossDayTarget = dragOverDayIndex === dayIndex && activeDrag?.dayIndex !== dayIndex

                                return (
                                    <div
                                        key={dayIndex}
                                        className={`day-section ${isCrossDayTarget ? 'bg-primary-default/[0.04]' : ''}`}
                                        data-day-index={dayIndex}
                                        onDragOver={(e) => {
                                            if (!placementEnabled || !draggingEventRef.current || pendingPlacement) return
                                            e.preventDefault()
                                            e.dataTransfer.dropEffect = 'move'
                                            if (dragOverDayIndex !== dayIndex) setDragOverDayIndex(dayIndex)
                                            const ev = draggingEventRef.current
                                            if (ev.dayIndex === dayIndex && !insertionTargetRef.current) {
                                                setInsertionTargetBoth({ dayIndex, insertIndex: sortedForDragHit.length })
                                            }
                                        }}
                                        onDragLeave={(e) => {
                                            const rel = e.relatedTarget as Node | null
                                            if (rel !== null && !e.currentTarget.contains(rel)) {
                                                setDragOverDayIndex(null)
                                            }
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault()
                                            if (!placementEnabled || pendingPlacement) return
                                            finalizeDropAsPending(dayIndex, date, sortedForDragHit)
                                        }}>
                                        <div className="sticky top-0 z-[5] border-b border-grey-4 bg-white py-4 pl-5 pr-14 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                                            <Typography size="14" weight="bold" family="redhat" color="grey-0">
                                                {hideExactDates ? `Day ${dayIndex + 1}` : formatDate(day?.date)}
                                            </Typography>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                {cityName ? (
                                                    <Typography
                                                        size="13"
                                                        weight="medium"
                                                        family="manrope"
                                                        color="grey-2">
                                                        {cityName}
                                                    </Typography>
                                                ) : null}
                                                {(onAddStay || onStayAction) && (canEdit || stayForDay) ? (
                                                    <StayChip
                                                        stay={stayForDay}
                                                        cityId={cityId}
                                                        onAdd={canEdit ? onAddStay : undefined}
                                                        onChange={
                                                            canEdit && onStayAction
                                                                ? (stayId, sCityId) =>
                                                                      onStayAction('change', stayId, sCityId)
                                                                : undefined
                                                        }
                                                        onRemove={
                                                            canEdit && onStayAction
                                                                ? (stayId, sCityId) =>
                                                                      onStayAction('remove', stayId, sCityId)
                                                                : undefined
                                                        }
                                                    />
                                                ) : null}
                                            </div>
                                        </div>

                                        <div
                                            className="relative px-5 pb-8 pt-5"
                                            onDragOver={(e) => mapListDragOver(e, dayIndex, sortedForDragHit)}
                                            onDrop={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                if (!placementEnabled || pendingPlacement) return
                                                finalizeDropAsPending(dayIndex, date, sortedForDragHit)
                                            }}>
                                            {sortedEvents.length > 0 ? (
                                                <>
                                                    {sortedEvents.map((event: any, index: number) => {
                                                        const showGapBefore =
                                                            activeDrag &&
                                                            insertionTarget?.dayIndex === dayIndex &&
                                                            insertionTarget.insertIndex === index &&
                                                            activeDrag.slot_id !== event.slot_id

                                                        const showTimeStrip =
                                                            pendingPlacement &&
                                                            !hidePlacementTimeUi &&
                                                            pendingPlacement.event.slot_id === event.slot_id &&
                                                            pendingPlacement.targetDayIndex === dayIndex

                                                        const placementUiBlocksOtherDrags =
                                                            Boolean(pendingPlacement && !hidePlacementTimeUi)
                                                        const isDimmedDuringPlacement =
                                                            placementUiBlocksOtherDrags && !showTimeStrip

                                                        const slotPlacementSaving =
                                                            placementSavingSlotId != null &&
                                                            placementSavingSlotId === event.slot_id

                                                        const isFirst = index === 0

                                                        return (
                                                            <div
                                                                key={event.slot_id || event.id || index}
                                                                {...(showTimeStrip ? { 'data-kanban-pending-slot': '' } : {})}
                                                                className={`relative z-[1] transition-[opacity,transform] duration-300 ${isFirst ? '' : '-mt-3'} mb-4 last:mb-2 ${
                                                                    showTimeStrip ? 'z-[3]' : ''
                                                                } ${isDimmedDuringPlacement ? 'scale-[0.985] opacity-[0.4]' : ''}`}>
                                                                {/* No line above the first card of each day; connectors only between cards */}
                                                                {!isFirst && (
                                                                    <div
                                                                        className="pointer-events-none flex justify-center pt-1"
                                                                        aria-hidden>
                                                                        <div style={MAP_TIMELINE_SPINE_STYLE(32)} />
                                                                    </div>
                                                                )}

                                                                <div
                                                                    className={`relative z-[2] flex flex-col gap-2 ${isFirst ? '' : '-mt-1'}`}>
                                                                    {showGapBefore && (
                                                                        <div className="mx-0.5 min-h-14 rounded-xl border-2 border-dashed border-primary-default/40 bg-primary-default/[0.07]" />
                                                                    )}
                                                                    <div
                                                                        data-map-slot-index={index}
                                                                        draggable={
                                                                            placementEnabled && !pendingPlacement && !!event.slot_id
                                                                        }
                                                                        onDragStart={(e) => {
                                                                            if (!placementEnabled || pendingPlacement) {
                                                                                e.preventDefault()
                                                                                return
                                                                            }
                                                                            if (!event.slot_id) {
                                                                                e.preventDefault()
                                                                                return
                                                                            }
                                                                            draggingEventRef.current = event
                                                                            setDraggingEvent(event)
                                                                            setInsertionTargetBoth({ dayIndex, insertIndex: index })
                                                                            e.dataTransfer.effectAllowed = 'move'
                                                                            e.dataTransfer.setData(
                                                                                'text/plain',
                                                                                event.slot_id || event.id || ''
                                                                            )
                                                                            if (e.currentTarget instanceof HTMLElement) {
                                                                                e.dataTransfer.setDragImage(e.currentTarget, 20, 20)
                                                                            }
                                                                        }}
                                                                        className={`relative transition-opacity duration-150 ${
                                                                            draggingEvent?.slot_id === event.slot_id
                                                                                ? 'cursor-grabbing opacity-35 [&_*]:cursor-grabbing'
                                                                                : placementEnabled && !pendingPlacement
                                                                                  ? 'cursor-grab active:cursor-grabbing [&_*]:cursor-inherit [&_button]:cursor-pointer'
                                                                                  : ''
                                                                        }`}>
                                                                        <div
                                                                            className={`relative overflow-hidden rounded-xl ${
                                                                                showTimeStrip
                                                                                    ? 'ring-2 ring-primary-default shadow-[0_12px_40px_-8px_rgba(15,23,42,0.14),0_0_0_4px_rgba(124,58,237,0.12)]'
                                                                                    : 'shadow-[0_2px_14px_rgba(15,23,42,0.07)] ring-1 ring-grey-4/90'
                                                                            }`}>
                                                                            {showTimeStrip && (
                                                                                <div
                                                                                    className="flex items-center gap-2 rounded-t-xl border-b border-primary-default/25 bg-primary-default-12 px-3 py-2"
                                                                                    role="status"
                                                                                    aria-live="polite">
                                                                                    <span className="relative flex h-2 w-2 shrink-0">
                                                                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-default/40 opacity-75" />
                                                                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-default" />
                                                                                    </span>
                                                                                    <span className="font-manrope text-[12px] font-semibold leading-tight text-primary-default">
                                                                                        Choose a start time below to finish moving this slot
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            <div className="relative">
                                                                                <MapSidebarSlotTypeBadge event={event} />
                                                                                <KanbanEventCard
                                                                                    event={event}
                                                                                    onEdit={onEditEvent ?? (() => {})}
                                                                                    onDelete={onDeleteEvent ?? (() => {})}
                                                                                    canEdit={canEdit && !!onEditEvent}
                                                                                    shortlistedExperienceIds={shortlisted}
                                                                                    onViewMap={onViewMap}
                                                                                    changedSlotBadges={changedSlotBadges}
                                                                                    attachTimeStripBelow={showTimeStrip}
                                                                                    suppressHoverPopup
                                                                                    placementSaving={slotPlacementSaving}
                                                                                    suppressHoverAiSuggestions
                                                                                />
                                                                            </div>
                                                                            <AnimatePresence>
                                                                                {showTimeStrip &&
                                                                                    onPlacementCommit &&
                                                                                    onPendingPlacementChange && (
                                                                                        <ChooseStartTimeStrip
                                                                                            key={`${pendingPlacement!.event.slot_id}-map-time`}
                                                                                            anchorUtcMs={pendingPlacement!.anchorUtcMs}
                                                                                            durationMs={pendingPlacement!.durationMs}
                                                                                            targetDayDate={date}
                                                                                            analyticsSurface="map_sidebar"
                                                                                            onDismiss={() => onPendingPlacementChange(null)}
                                                                                            onPick={(startUtcMs) => {
                                                                                                const p = pendingPlacement
                                                                                                if (!p) return
                                                                                                const endMs = startUtcMs + p.durationMs
                                                                                                void onPlacementCommit({
                                                                                                    event: p.event,
                                                                                                    sourceDayIndex: p.sourceDayIndex,
                                                                                                    targetDayIndex: p.targetDayIndex,
                                                                                                    insertIndex: p.insertIndex,
                                                                                                    newStartIso: new Date(startUtcMs).toISOString(),
                                                                                                    newEndIso: new Date(endMs).toISOString()
                                                                                                })
                                                                                            }}
                                                                                            onCustom={() => {
                                                                                                const p = pendingPlacement
                                                                                                if (!p || !onOpenCustomPlacementTime) return
                                                                                                const s = new Date(p.anchorUtcMs)
                                                                                                const en = new Date(p.anchorUtcMs + p.durationMs)
                                                                                                const dayCity = day?.base_city || day?.destination_city
                                                                                                onOpenCustomPlacementTime({
                                                                                                    event: p.event,
                                                                                                    sourceDayIndex: p.sourceDayIndex,
                                                                                                    targetDayIndex: p.targetDayIndex,
                                                                                                    insertIndex: p.insertIndex,
                                                                                                    provisionalStart: s,
                                                                                                    provisionalEnd: en,
                                                                                                    baseCity: dayCity?.id
                                                                                                        ? {
                                                                                                              id: dayCity.id,
                                                                                                              name: dayCity.name,
                                                                                                              country:
                                                                                                                  (dayCity as { country?: string })
                                                                                                                      .country || ''
                                                                                                          }
                                                                                                        : undefined
                                                                                                })
                                                                                            }}
                                                                                        />
                                                                                    )}
                                                                            </AnimatePresence>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center px-4 py-16 gap-3">
                                                    <span className="text-4xl">🏖️</span>
                                                    <Typography size="13" weight="medium" family="manrope" color="grey-3">
                                                        Nothing planned today
                                                    </Typography>
                                                </div>
                                            )}

                                            {activeDrag &&
                                                insertionTarget?.dayIndex === dayIndex &&
                                                insertionTarget.insertIndex === sortedForDragHit.length &&
                                                sortedForDragHit.length > 0 && (
                                                    <div className="relative z-[1] mx-1 mt-2 min-h-14 rounded-xl border-2 border-dashed border-primary-default/40 bg-primary-default/[0.07]" />
                                                )}
                                        </div>
                                    </div>
                                )
                            })}
                            <div className="h-24" />
                        </div>
                    </div>
                </div>
            )}

            {isSidebarCollapsed && (
                <button
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="w-10 shrink-0 bg-white border-r border-grey-4 flex items-center justify-center hover:bg-grey-5 cursor-pointer"
                    title="Expand sidebar"
                    type="button">
                    <ChevronRight size={16} className="text-grey-2" />
                </button>
            )}

            <div className="flex-1 relative min-h-0">
                <GenericMap
                    key={selectedDayIndex}
                    cityName={activeCityName || primaryCityName || 'Trip'}
                    markers={activeMarkers}
                    onMarkerClick={handleMarkerClick}
                    onPopupButtonClick={handlePopupButtonClick}
                    height="100%"
                    className="h-full"
                    expandbtnClassName="hidden"
                    routeCoordinates={activeRouteCoordinates}
                    routeLineStyle={activeRouteStyle}
                    emptyZoom={11}
                />

                {selectedDay && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white rounded-full shadow-lg px-2 py-1.5 z-10">
                        <button
                            type="button"
                            disabled={selectedDayIndex === 0}
                            onClick={() => {
                                const newIndex = Math.max(0, selectedDayIndex - 1)
                                handleDateClick(newIndex)
                            }}
                            className="w-8 h-8 rounded-full hover:bg-grey-5 flex items-center justify-center disabled:opacity-30 cursor-pointer disabled:cursor-default">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-[13px] font-bold font-manrope text-grey-0 px-2 min-w-[100px] text-center">
                            Day {selectedDay.dayNumber} · {selectedDay.cityName}
                        </span>
                        <button
                            type="button"
                            disabled={selectedDayIndex === dayMapData.length - 1}
                            onClick={() => {
                                const newIndex = Math.min(dayMapData.length - 1, selectedDayIndex + 1)
                                handleDateClick(newIndex)
                            }}
                            className="w-8 h-8 rounded-full hover:bg-grey-5 flex items-center justify-center disabled:opacity-30 cursor-pointer disabled:cursor-default">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
})

export default ItineraryMapView
