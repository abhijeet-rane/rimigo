import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { BudgetLoader } from './BudgetLoader'
import { useHotelDeals } from '@/hooks/useHotelDeals'
import type { PlatformPrice } from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import { useTripBudget } from '../../hooks/useTripBudget'
import { removeFlightFromItinerary } from '@/api/itineraryApi'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { getBudgetBreakdown, formatCurrency } from './bookingsUtils'
import { CostOverviewCard } from './CostOverviewCard'
import { FilterBar } from './FilterBar'
import { FlightsBudgetSection } from './FlightsBudgetSection'
import { StaysBudgetGroup } from './StaysBudgetGroup'
import { ActivitiesBudgetGroup } from './ActivitiesBudgetGroup'
import { CuratedBookingsSection, curatedItemPrice } from './CuratedBookingsSection'
import { extractItineraryTransportSlots } from './itineraryTransportSlots'
import { useCuratedBookings } from '../../hooks/useCuratedBookings'
import { useItineraryCompletedData } from '@/modules/Itinerary/hooks/ItineraryHook'
import { useUserInfo } from '@/hooks/useUserInfo'
import { ANCILLARY_ICON, TRANSPORT_ICON } from '@/constants/thiingsIcons'
import { CATEGORIES, CATEGORY_ORDER } from './bookingsTypes'
import { ExpertBanner } from './ExpertBanner'
import { ReportSectionOpenContext } from './sectionExpansion'
import { OnboardingOverlay } from './OnboardingOverlay'
import { BudgetTrackProvider } from './useBudgetTrack'
import { useBudgetTrack } from './budgetTrackContext'
import { POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'

/* ── Sticky Budget Bar ── */
const StickyBudgetBar: React.FC<{
    visible: boolean
    ppMin: number
    breakdown: Record<string, { min: number; max: number }>
    isRecalculating?: boolean
    isPublic?: boolean
    /** Measured by the parent so the FilterBar can stick directly below this
     *  fixed bar instead of overlapping it on scroll. */
    barRef?: React.Ref<HTMLDivElement>
    /** Live viewport-Y of the scroll content's top edge — equals the COLLAPSED
     *  header's bottom. Drives the bar's mobile `top` so it stays flush under the
     *  tab bar even as the trip-name row collapses on scroll (no magic numbers,
     *  no gap). Desktop keeps a static class since its header doesn't collapse. */
    mobileTopPx: number
}> = ({ visible, ppMin, breakdown, isRecalculating, isPublic = false, barRef, mobileTopPx }) => {
    // Desktop header is a fixed height (no collapsing trip-name row) → static
    // class. Mobile reads the measured content-top via the --bbar-top var below.
    const topClass = isPublic ? 'md:top-[120px]' : 'md:top-[72px]'

    return (
        <div
            ref={barRef}
            // Shown on mobile too: the FilterBar parks itself directly below this
            // bar via topOffsetPx={stickyBarHeight}, so the two pinned headers
            // stack cleanly instead of overlapping. `top` is NOT transitioned so
            // it tracks the collapsing header instantly (no lag/gap on scroll);
            // only transform/opacity animate the show/hide.
            style={{ ['--bbar-top' as string]: `${mobileTopPx}px` }}
            className={`fixed left-0 right-0 z-40 top-[var(--bbar-top)] ${topClass} transition-[transform,opacity] duration-300 ease-out ${visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
            <div className="bg-white border-b border-grey-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <div className="max-w-[1280px] mx-auto pt-3 pb-3 md:py-2.5 px-4 md:px-8 lg:px-12 flex flex-col gap-2">
                    {/* Row 1 — "Total Budget (per person)" label + the per-person
                        total, mirroring the cost overview card (design sketch). */}
                    <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 min-w-0">
                            {isRecalculating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-default shrink-0" />}
                            <p className="font-red-hat-display text-[12px] font-bold tracking-[-0.24px] leading-4 text-grey-1 uppercase">
                                Total Budget (per head)
                            </p>
                        </span>
                        <p className="font-red-hat-display text-[18px] md:text-[22px] font-bold tracking-[-0.4px] text-grey-0 leading-tight shrink-0">
                            {formatCurrency(ppMin)}
                        </p>
                    </div>

                    {/* Row 2 — category breakdown pills (kept as-is) */}
                    <div className="flex items-center gap-2 md:gap-4 overflow-x-auto scrollbar-hide">
                        {CATEGORY_ORDER.map((key) => {
                            const cat = breakdown[key]
                            if (!cat || (cat.min === 0 && cat.max === 0)) return null
                            const info = CATEGORIES[key]
                            const pricingLabel = '/head'
                            return (
                                <div
                                    key={key}
                                    className="flex items-center gap-2 rounded-[12px] border border-grey-4 bg-white px-2 py-1 md:px-2.5 md:py-1.5 shrink-0">
                                    <span className="text-[12px] md:text-[14px] leading-none">{info.icon}</span>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-manrope text-[9px] md:text-[10px] font-medium text-grey-3 uppercase tracking-wide leading-tight">
                                            {info.label}
                                        </span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="font-red-hat-display text-[12px] md:text-[13px] font-bold text-grey-0 whitespace-nowrap leading-tight">
                                                {formatCurrency(cat.min)}
                                            </span>
                                            {pricingLabel && (
                                                <span className="font-manrope text-[8px] md:text-[9px] text-grey-3 whitespace-nowrap leading-tight">
                                                    {pricingLabel}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

interface BookingsTabProps {
    identifier: string | undefined
    onSwapActivity?: (slotId: string) => void
    fromCity?: string
    toCity?: string
    readOnly?: boolean
    isPublic?: boolean
    /** When false, the Budget tab is mounted but hidden (other tab active).
     *  Used to gate the budget API + per-activity live tour fetches so they
     *  only fire once the user actually opens this tab. */
    isActive?: boolean
}

export const BookingsTab: React.FC<BookingsTabProps> = (props) => (
    <BudgetTrackProvider
        identifier={props.identifier}
        isPublic={props.isPublic}>
        <BookingsTabInner {...props} />
    </BudgetTrackProvider>
)

const BookingsTabInner: React.FC<BookingsTabProps> = ({
    identifier,
    onSwapActivity,
    fromCity,
    toCity,
    readOnly = false,
    isPublic = false,
    isActive = true
}) => {
    const track = useBudgetTrack()

    // Page view — fire once per mount. `track` from context is stable enough
    // (re-created only if identifier/isPublic change, which don't during a mount).
    useEffect(() => {
        track(POSTHOG_EVENTS.BUDGET_TAB_VIEW)
    }, [])

    const {
        budget,
        isLoading,
        isError,
        isStale,
        forceRecalculate,
        setActivityOverride,
        setStayProviderOverride,
        setActivityTourOverride,
        setFlightProviderOverride,
        isRecalculating
    } = useTripBudget(identifier, isPublic, isActive)

    // Tab navigation for cross-tab CTA (e.g. "Go to Stays")
    const [searchParams, setSearchParams] = useSearchParams()
    const navigateToStaysTab = useCallback(() => {
        track(POSTHOG_EVENTS.BUDGET_TAB_STAY_NAVIGATE_TO_STAYS_TAB)
        const next = new URLSearchParams(searchParams)
        next.set('tab', 'stays')
        setSearchParams(next, { replace: true })
    }, [searchParams, setSearchParams, track])

    const navigateToFlightsTab = useCallback(() => {
        track(POSTHOG_EVENTS.BUDGET_TAB_FLIGHT_NAVIGATE_TO_FLIGHTS_TAB)
        const next = new URLSearchParams(searchParams)
        next.set('tab', 'flights')
        setSearchParams(next, { replace: true })
    }, [searchParams, setSearchParams, track])

    // Itinerary context for adding stays from budget tab
    const queryClient = useQueryClient()
    const travelerCtx = useOptionalTravelerTrips()
    const itineraryId = travelerCtx?.activeTrip?.tripItinerary?.id

    // Fetch live platform deals for stays
    const { deals, loading: dealsLoading, fetchDeals } = useHotelDeals()

    // For public collections, always use today+30 dates (matching frontend Stays Tab fallback)
    const fallbackDates = useMemo(() => {
        const today = new Date()
        const checkIn = new Date(today)
        checkIn.setDate(checkIn.getDate() + 30)
        const checkOut = new Date(checkIn)
        checkOut.setDate(checkOut.getDate() + 1)
        const fmt = (d: Date) => d.toISOString().split('T')[0]
        return { checkIn: fmt(checkIn), checkOut: fmt(checkOut) }
    }, [])

    useEffect(() => {
        if (!budget?.stays || budget.stays.length === 0) return

        // Include selected hotels + all available alternatives. Each hotel
        // carries its OWN city + check-in/out — a multi-city trip's stays span
        // different cities and date ranges, and the compare SERP lookup only
        // matches when those are correct (alternatives inherit their parent
        // stay's city/dates). Public collections use the today+30 fallback.
        const seen = new Set<string>()
        const hotels: { zentrumHubId: string; hotelName: string; city: string; checkIn: string; checkOut: string }[] = []
        for (const stay of budget.stays) {
            const stayCheckIn = isPublic ? fallbackDates.checkIn : stay.check_in
            const stayCheckOut = isPublic ? fallbackDates.checkOut : stay.check_out
            if (stay.zentrum_hub_id && !seen.has(stay.zentrum_hub_id)) {
                seen.add(stay.zentrum_hub_id)
                hotels.push({
                    zentrumHubId: stay.zentrum_hub_id,
                    hotelName: stay.hotel_name,
                    city: stay.city_name,
                    checkIn: stayCheckIn,
                    checkOut: stayCheckOut
                })
            }
            for (const alt of stay.available_hotels || []) {
                if (alt.zentrum_hub_id && !seen.has(alt.zentrum_hub_id)) {
                    seen.add(alt.zentrum_hub_id)
                    hotels.push({
                        zentrumHubId: alt.zentrum_hub_id,
                        hotelName: alt.name,
                        city: stay.city_name,
                        checkIn: stayCheckIn,
                        checkOut: stayCheckOut
                    })
                }
            }
        }

        if (hotels.length === 0) return

        const firstStay = budget.stays[0]
        const checkIn = isPublic ? fallbackDates.checkIn : firstStay.check_in
        const checkOut = isPublic ? fallbackDates.checkOut : firstStay.check_out

        fetchDeals({
            hotels,
            city: firstStay.city_name,
            checkIn,
            checkOut,
            adults: budget.group_size || 2,
            children: 0,
            childAges: [],
            tripId: identifier || 'budget',
            currency: 'INR',
            rimigoPrice: false
        })
    }, [budget?.stays, budget?.group_size, identifier, fetchDeals, isPublic, fallbackDates])

    // Build stayPricesMap from live deals — includes selected + alternative hotels
    const stayPricesMap = useMemo(() => {
        const map = new Map<string, { displayPrice: number; platforms: PlatformPrice[]; isPriceLoading: boolean; isPriceUnavailable: boolean }>()
        if (!budget?.stays) return map

        const processHotel = (hubId: string, fallbackRate: number) => {
            if (!hubId || map.has(hubId)) return
            const platforms = deals[hubId] || []
            const isLoading = !!dealsLoading[hubId]

            if (platforms.length > 0) {
                const cheapest = platforms.reduce((min, p) => (p.price < min.price ? p : min))
                map.set(hubId, {
                    displayPrice: cheapest.price,
                    platforms,
                    isPriceLoading: isLoading,
                    isPriceUnavailable: false
                })
            } else if (isLoading) {
                map.set(hubId, {
                    displayPrice: fallbackRate,
                    platforms: [],
                    isPriceLoading: true,
                    isPriceUnavailable: false
                })
            } else if (fallbackRate <= 0) {
                // Compare waterfall + today+30 fallback both missed on the
                // backend (rate_per_night=0), and the frontend deal-fetch has
                // settled with zero platforms. Mark the hub unavailable so
                // downstream cards render "No prices available" instead of ₹0.
                map.set(hubId, {
                    displayPrice: 0,
                    platforms: [],
                    isPriceLoading: false,
                    isPriceUnavailable: true
                })
            }
        }

        for (const stay of budget.stays) {
            processHotel(stay.zentrum_hub_id, stay.rate_per_night)
            for (const alt of stay.available_hotels || []) {
                processHotel(alt.zentrum_hub_id, alt.rate_per_night)
            }
        }
        return map
    }, [budget?.stays, deals, dealsLoading])

    // Filter state
    const [activeCategory, setActiveCategory] = useState('all')

    // Track which sections are expanded so the ExpertBanner can match the
    // content background (grey while any section is open, white when all closed).
    const [openSections, setOpenSections] = useState<Set<string>>(() => new Set())
    const reportSectionOpen = useCallback((key: string, open: boolean) => {
        setOpenSections((prev) => {
            if (open === prev.has(key)) return prev
            const next = new Set(prev)
            if (open) next.add(key)
            else next.delete(key)
            return next
        })
    }, [])
    const anySectionExpanded = openSections.size > 0

    // Live activities total — reported up from ActivitiesBudgetGroup using
    // the same filter (entity_id ∧ not-excluded ∧ has-tours) and live tour
    // prices that the section header displays. `null` = not yet reported,
    // fall back to backend breakdown in that case.
    const [liveActivitiesTotal, setLiveActivitiesTotal] = useState<number | null>(null)

    // Curated Transport/Ancillary items (rimigo_internal-populated on the
    // tripboard). Read for everyone; edit affordances gated to internal users.
    const { isRimigoInternal } = useUserInfo()
    const {
        items: curatedItems,
        createItem: createCuratedItem,
        updateItem: updateCuratedItem,
        deleteItem: deleteCuratedItem
    } = useCuratedBookings(identifier, isActive)
    const transportItems = useMemo(() => curatedItems.filter((item) => item.category === 'transport'), [curatedItems])
    const ancillaryItems = useMemo(() => curatedItems.filter((item) => item.category === 'ancillary'), [curatedItems])
    // Visible-only sums (cheapest offer per item) — fed into the cost overview.
    const curatedTotals = useMemo(() => {
        const sum = (items: typeof curatedItems) => items.filter((i) => i.is_visible).reduce((acc, i) => acc + (curatedItemPrice(i) || 0), 0)
        return { transport: sum(transportItems), ancillary: sum(ancillaryItems) }
    }, [transportItems, ancillaryItems])

    // Itinerary's own transport legs (non-flight) listed for internal users
    // beside the curated Transport section — each leg's booking provider is
    // derived from its attachment link. Fetched only for internal users on a
    // private tripboard (public collections have no itinerary context).
    const { data: itineraryData } = useItineraryCompletedData(isRimigoInternal && itineraryId ? itineraryId : '')
    const itineraryTransportSlots = useMemo(() => extractItineraryTransportSlots(itineraryData), [itineraryData])
    // YYYY-MM-DD → day number, so dated transport items render under the same
    // "Day N · date" header the Activities section uses.
    const dateToDayNumber = useMemo(() => {
        const map = new Map<string, number>()
        itineraryData?.days?.forEach((day: { date?: string }, i: number) => {
            if (day?.date) map.set(String(day.date).slice(0, 10), i + 1)
        })
        return map
    }, [itineraryData])

    // Budget breakdown for cost overview. When the activities group has
    // reported a live total, override the backend's baseline `activities`
    // entry so CostOverview + sticky bar + breakdown pills all match what
    // the Activities section header shows (avoids "55k vs 96k" drift).
    // Curated totals fold in as their own categories.
    const breakdown = useMemo(() => {
        if (!budget) return {}
        const bd = getBudgetBreakdown(budget, stayPricesMap)
        if (liveActivitiesTotal != null && bd.activities) {
            bd.activities = { min: liveActivitiesTotal, max: Math.round(liveActivitiesTotal * 1.2) }
        }
        if (curatedTotals.transport > 0) bd.transport = { min: curatedTotals.transport, max: curatedTotals.transport }
        if (curatedTotals.ancillary > 0) bd.ancillary = { min: curatedTotals.ancillary, max: curatedTotals.ancillary }
        return bd
    }, [budget, stayPricesMap, liveActivitiesTotal, curatedTotals])

    // Count bookings per category for the overview card
    const totalBookings = useMemo(() => {
        if (!budget) return 0
        const flightCount = budget.flights?.length || 0
        const stayCount = budget.stays?.length || 0
        const activityCount = budget.days?.reduce((sum: number, d: { items: unknown[] }) => sum + d.items.length, 0) || 0
        return flightCount + stayCount + activityCount + transportItems.length + ancillaryItems.length
    }, [budget, transportItems, ancillaryItems])

    // Excluded sets
    const excludedActivities = useMemo(() => new Set(budget?.excluded_activities || []), [budget?.excluded_activities])

    const hasActivities = !!(budget?.days && budget.days.some((d: { items: unknown[] }) => d.items.length > 0))
    const hasStays = !!(budget?.stays && budget.stays.length > 0)

    const availableCategories = useMemo(() => {
        const cats = new Set<string>()
        // Flights are excluded from public collection budgets by product rule
        // (a notice tells the traveler the budget excludes flights). Private
        // always shows flights (empty state when the itinerary has none).
        if (!isPublic) cats.add('flights')
        // Private always shows stays (empty state when no itinerary stays).
        // Public hides the section entirely when there are no stays (its
        // itinerary.stays is empty) — same treatment as flights.
        if (!isPublic || hasStays) cats.add('stays')
        if (hasActivities) cats.add('activities')
        return cats
    }, [hasActivities, hasStays, isPublic])

    // For public collections, confirm before any override action
    const requiresConfirm = isPublic && !readOnly
    const confirmPublicChange = useCallback(
        <T extends unknown[]>(action: (...args: T) => void) => {
            return (...args: T) => {
                if (requiresConfirm) {
                    const confirmed = window.confirm(
                        'This is a public tripboard. Your changes will affect the budget all regular travelers see.\n\nContinue with this change?'
                    )
                    if (!confirmed) return
                }
                action(...args)
            }
        },
        [requiresConfirm]
    )

    // Handlers — wrapped with confirmation for public collections.
    // Include/exclude both available on the Budget Tab — excluded rows stay
    // visible with a struck-through price and the include button in-row.
    const handleExcludeActivity = confirmPublicChange((slotId: string) => {
        track(POSTHOG_EVENTS.BUDGET_TAB_ACTIVITY_EXCLUDE_CLICK, { slot_id: slotId })
        setActivityOverride('exclude', slotId)
    })
    const handleIncludeActivity = confirmPublicChange((slotId: string) => {
        track(POSTHOG_EVENTS.BUDGET_TAB_ACTIVITY_INCLUDE_CLICK, { slot_id: slotId })
        setActivityOverride('include', slotId)
    })
    const handleRemoveFlightFromItinerary = useCallback(
        async (sectionId: string) => {
            if (!itineraryId) {
                toast.error('Could not remove flight — missing itinerary context.')
                return
            }
            track(POSTHOG_EVENTS.BUDGET_TAB_FLIGHT_REMOVE_CONFIRM, { section_id: sectionId })
            try {
                await removeFlightFromItinerary(itineraryId, sectionId)
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['itineraryCompleted', itineraryId] }),
                    queryClient.invalidateQueries({ queryKey: ['itineraryRouteSummary', itineraryId] }),
                    queryClient.invalidateQueries({ queryKey: ['traveler-collection'] }),
                    queryClient.invalidateQueries({ queryKey: ['tripBudget', identifier] })
                ])
                forceRecalculate()
                toast.success('Flight removed from itinerary')
            } catch (err) {
                const message =
                    (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                    (err as { message?: string })?.message ||
                    'Could not remove the flight from the itinerary.'
                toast.error(message)
            }
        },
        [itineraryId, identifier, queryClient, forceRecalculate, track]
    )

    const handleFlightProviderSelect = confirmPublicChange((sectionId: string, provider: string | null) => {
        track(POSTHOG_EVENTS.BUDGET_TAB_FLIGHT_PROVIDER_SELECT, { section_id: sectionId, provider, deselected: provider === null })
        setFlightProviderOverride(sectionId, provider)
    })
    const handleStayProviderSelect = confirmPublicChange((cityId: string, provider: string | null) => {
        track(POSTHOG_EVENTS.BUDGET_TAB_STAY_PROVIDER_SELECT, { city_id: cityId, platform: provider, deselected: provider === null })
        setStayProviderOverride(cityId, provider)
    })
    const handleActivityTourSelect = confirmPublicChange((slotId: string, tourId: string | null) => {
        track(POSTHOG_EVENTS.BUDGET_TAB_ACTIVITY_TOUR_SELECT, { slot_id: slotId, tour_id: tourId })
        setActivityTourOverride(slotId, tourId)
    })
    // Sticky bar: show when CostOverviewCard scrolls out of view, and track the
    // live top of the scroll-content area so the fixed bar sits flush under the
    // (collapsing) header instead of at a fixed 96px that gaps once the
    // trip-name row collapses.
    const overviewRef = useRef<HTMLDivElement>(null)
    const [showStickyBar, setShowStickyBar] = useState(false)
    // 96 = full mobile header (56 trip-name + 40 tab bar) — only the pre-measure
    // default; the effect overwrites it with the real (collapsed) value.
    const [contentTopPx, setContentTopPx] = useState(96)

    useEffect(() => {
        const checkScroll = () => {
            const el = overviewRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            setShowStickyBar(rect.bottom < 0)

            // Flush-mount the fixed budget bar under the header by reading the
            // tab bar's live bottom edge (tagged data-tripboard-tabbar). It moves
            // up as the trip-name row collapses, so the bar tracks it with no gap
            // and no magic offset. Pick the visible one (the hidden responsive
            // variant measures 0). Falls back to the pre-measure default.
            const tabbars = document.querySelectorAll('[data-tripboard-tabbar]')
            let bottom = 0
            tabbars.forEach((node) => {
                const r = (node as HTMLElement).getBoundingClientRect()
                if (r.height > 0 && r.bottom > bottom) bottom = r.bottom
            })
            if (bottom > 0) setContentTopPx(Math.round(bottom))
        }

        document.addEventListener('scroll', checkScroll, { passive: true, capture: true })
        window.addEventListener('resize', checkScroll)
        checkScroll()

        return () => {
            document.removeEventListener('scroll', checkScroll, { capture: true } as EventListenerOptions)
            window.removeEventListener('resize', checkScroll)
        }
    }, [budget])

    // The StickyBudgetBar is `position: fixed` at the top of the content area
    // (top-[96px] mobile) and the FilterBar is `sticky top-0` — so when the
    // bar appears on scroll-down they pile up at the same Y and the chips +
    // first row peek out behind it ("weird header"). Measure the bar's height
    // so the FilterBar can stick exactly below it (self-adjusting, no magic
    // numbers) only while the bar is visible.
    const stickyBarRef = useRef<HTMLDivElement>(null)
    const [stickyBarHeight, setStickyBarHeight] = useState(0)
    useEffect(() => {
        const el = stickyBarRef.current
        if (!el || typeof ResizeObserver === 'undefined') return
        const measure = () => setStickyBarHeight(el.offsetHeight)
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const makeRecalculateHandler = (source: 'stale_warning' | 'overview_mobile' | 'overview_desktop') => async () => {
        track(POSTHOG_EVENTS.BUDGET_TAB_RECALCULATE_CLICK, { source })
        if (requiresConfirm) {
            const confirmed = window.confirm(
                'This is a public tripboard. Recalculating will update the budget all regular travelers see.\n\nContinue?'
            )
            if (!confirmed) return
        }
        await forceRecalculate()
    }
    const handleStaleRecalculate = makeRecalculateHandler('stale_warning')
    const handleOverviewRecalculate = makeRecalculateHandler('overview_desktop')

    if (isLoading) {
        // Fill the parent column's height so the loader's container shares
        // the same ``bg-grey-5`` extent as the loaded-state view. Without the
        // min-height the loader only takes ~460px and the surrounding column
        // collapses to that height, exposing the white page body below — the
        // grey/white seam reported on the Budget tab.
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-72px)] w-full">
                <BudgetLoader
                    loading={true}
                    fromCity={fromCity}
                    toCity={toCity}
                />
            </div>
        )
    }

    if (isError || !budget) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-grey-3">
                <AlertTriangle className="h-8 w-8 mb-3" />
                <p className="font-red-hat-display text-sm font-medium text-grey-1">Could not load budget</p>
                <p className="font-manrope text-xs text-grey-3 mt-1">Try refreshing or check back later</p>
            </div>
        )
    }

    // Flights excluded entirely on public collections (product rule).
    const showFlights = !isPublic && (activeCategory === 'all' || activeCategory === 'flights')
    // On public collections, hide the Stays section when there are no stays
    // (empty itinerary.stays) — mirrors the flights exclusion.
    const showStays = (activeCategory === 'all' || activeCategory === 'stays') && (!isPublic || hasStays)
    const showActivities = activeCategory === 'all' || activeCategory === 'activities'
    // Curated sections aren't filter chips, so they show only under "All".
    const showCurated = activeCategory === 'all'

    const nothingToShow = !showFlights && !showStays && (!hasActivities || !showActivities)

    // Use breakdown range for sticky bar (estimated range)
    // All breakdown values are per-person. Estimated total shown is per-person only.
    const stickyPpMin = Object.values(breakdown).reduce((s, c) => s + c.min, 0)

    return (
        // Extra bottom padding on mobile (max-md:pb-28) so the expert banner
        // clears the fixed "Continue editing" chat bar instead of sitting behind it.
        <div className="flex flex-col pb-16 max-md:pb-40 max-w-[846px] mx-auto w-full">
            {/* First-visit intro sheet — only while this tab is active */}
            {isActive && <OnboardingOverlay />}

            {/* Stale warning — not shown in readOnly mode */}
            {!readOnly && isStale && (
                <button
                    onClick={handleStaleRecalculate}
                    className="flex items-center justify-center gap-2 rounded-xl border border-warning-border bg-warning-bg px-4 py-2.5 font-manrope text-xs font-medium text-warning-text hover:bg-warning-hover transition-colors mt-4 mx-5 md:mx-0">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Your itinerary changed — tap to refresh prices
                </button>
            )}

            {/* Budget summary card — gates its big shimmer to
                full_recalculate internally via budget.recalculation_trigger. */}
            {/* Mobile: full-bleed flat sections with hairline dividers (Figma);
                desktop: floating rounded cards */}
            <div
                className="md:mt-6"
                ref={overviewRef}>
                <CostOverviewCard
                    budget={budget}
                    breakdown={breakdown}
                    totalBookings={totalBookings}
                    onRecalculate={readOnly ? undefined : handleOverviewRecalculate}
                    isRecalculating={isRecalculating}
                    isPublic={isPublic}
                />
            </div>

            {/* Sticky Budget Bar — icon spinner reflects any recalc in
                progress (not just full_recalculate) so the user sees
                feedback on scoped actions too. */}
            <StickyBudgetBar
                barRef={stickyBarRef}
                visible={showStickyBar}
                mobileTopPx={contentTopPx}
                ppMin={stickyPpMin}
                breakdown={breakdown}
                isRecalculating={isRecalculating}
                isPublic={isPublic}
            />

            {/* Bookings stack — one white card: filter strip header +
                collapsible category sections (Figma: Bookings Tab). Provider lets
                sections report expansion so the ExpertBanner matches the bg. */}
            <ReportSectionOpenContext.Provider value={reportSectionOpen}>
                <div className="md:mt-6 md:rounded-2xl bg-white md:shadow-[0px_2px_4px_rgba(13,12,13,0.16)] overflow-hidden">
                    {/* Filter strip — not shown in readOnly mode */}
                    {!readOnly && (
                        <FilterBar
                            activeCategory={activeCategory}
                            setActiveCategory={(key) => {
                                track(POSTHOG_EVENTS.BUDGET_TAB_FILTER_SELECT, { category: key })
                                setActiveCategory(key)
                            }}
                            availableCategories={availableCategories}
                            topOffsetPx={showStickyBar ? stickyBarHeight : 0}
                        />
                    )}

                    {/* Empty state */}
                    {nothingToShow && (
                        <div className="text-center py-12 px-4">
                            <p className="text-base font-medium font-manrope text-grey-1">No bookings match your filters</p>
                        </div>
                    )}

                    {/* Flights Section — itinerary is the source of truth.
                    Always rendered (mirrors stays empty-state pattern) so
                    travelers see the "Explore Flights" affordance even when
                    the budget has no flights yet. Removing a row deletes
                    the flight slot(s) from the itinerary; private
                    tripboards only (public collection viewers can't mutate
                    the underlying itinerary). */}
                    {showFlights && (
                        <FlightsBudgetSection
                            flights={budget.flights}
                            identifier={identifier}
                            isPublic={isPublic}
                            onProviderSelect={readOnly ? undefined : handleFlightProviderSelect}
                            onRemoveFromItinerary={readOnly || isPublic ? undefined : handleRemoveFlightFromItinerary}
                            onNavigateToFlights={readOnly || isPublic ? undefined : navigateToFlightsTab}
                            recalculationTrigger={isRecalculating ? budget.recalculation_trigger : undefined}
                        />
                    )}

                    {/* Stays Section — always shown (empty state when no itinerary stays).
                    UI#6 — keep `+ Select` visible on tripboard private even when itineraryId is
                    still loading, but render it disabled with a tooltip so the user gets feedback. */}
                    {showStays && (
                        <StaysBudgetGroup
                            stays={budget.stays}
                            onProviderSelect={readOnly ? undefined : handleStayProviderSelect}
                            stayPricesMap={stayPricesMap}
                            tripStartDate={budget.days?.[0]?.date}
                            requiresConfirm={requiresConfirm}
                            isPublic={isPublic}
                            days={budget.days}
                            recalculationTrigger={isRecalculating ? budget.recalculation_trigger : undefined}
                            onNavigateToStays={!readOnly && !isPublic ? navigateToStaysTab : undefined}
                        />
                    )}

                    {/* Activities Section */}
                    {hasActivities && showActivities && (
                        <ActivitiesBudgetGroup
                            days={budget.days}
                            excludedActivities={excludedActivities}
                            onExclude={handleExcludeActivity}
                            onInclude={readOnly ? undefined : handleIncludeActivity}
                            onSwap={onSwapActivity}
                            isPublic={isPublic}
                            onTourSelect={readOnly ? undefined : handleActivityTourSelect}
                            recalculationTrigger={isRecalculating ? budget.recalculation_trigger : undefined}
                            onSectionTotalReport={setLiveActivitiesTotal}
                            isActive={isActive}
                        />
                    )}

                    {/* Curated Transport / Ancillary sections — populated by
                    rimigo_internal users; each hides itself for travelers when
                    empty. Totals already folded into the cost overview above.
                    Transport also surfaces the itinerary's own transport legs
                    (internal only) for one-tap promotion into curated items. */}
                    {showCurated && (
                        <CuratedBookingsSection
                            category="transport"
                            icon={TRANSPORT_ICON}
                            title="Transport"
                            items={transportItems}
                            isInternal={isRimigoInternal}
                            itinerarySlots={itineraryTransportSlots}
                            dateToDayNumber={dateToDayNumber}
                            onCreate={createCuratedItem}
                            onUpdate={(itemId, payload) => updateCuratedItem({ itemId, payload })}
                            onDelete={deleteCuratedItem}
                        />
                    )}
                    {showCurated && (
                        <CuratedBookingsSection
                            category="ancillary"
                            icon={ANCILLARY_ICON}
                            title="Ancillaries"
                            items={ancillaryItems}
                            isInternal={isRimigoInternal}
                            onCreate={createCuratedItem}
                            onUpdate={(itemId, payload) => updateCuratedItem({ itemId, payload })}
                            onDelete={deleteCuratedItem}
                        />
                    )}

                    {/* Travel-expert hand-off — desktop renders in-flow here;
                    mobile portals a fixed banner above the chat pill. Gated on
                    isActive: the mobile portal escapes to <body>, so without
                    this it would stay visible on other tabs (this tab is kept
                    mounted-but-hidden when inactive). */}
                    {isActive && <ExpertBanner expanded={anySectionExpanded} />}
                </div>
            </ReportSectionOpenContext.Provider>
        </div>
    )
}
