import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpDown, Check, Loader, Plane, RefreshCw, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { searchFlights, type FlightSearchResponse } from '@/api/flights/flightSearchAPI'
import TripboardFlightCard from './TripboardFlightCard'
import FlightFiltersRail, {
    EMPTY_FILTERS,
    MobileFiltersSheet,
    applyFilters,
    computeFacets,
    countActiveFilters,
    isFiltersEmpty,
    sortFlights,
    type FlightFilterState,
    type SortKey
} from './FlightFiltersRail'
import type { FlightLeg } from '../../api/travelerCollectionApi'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { useCollectionId } from '@/modules/Tripboard/context/TripCollectionRecommendationsContext'

const LEG_KIND_HUMAN: Record<FlightLeg['kind'], string> = {
    outbound: 'Outbound',
    inter_city: 'Inter-city',
    return: 'Return',
    round_trip: 'Round trip'
}

// "Fri 22 May" for a single date, "Fri 22 → Sat 30 May" when both dates fall
// in the same calendar month (drops the month from the first), or
// "Sat 30 Mar → Sun 5 Apr" when they straddle months.
const formatDateRangeLabel = (start?: string | null, end?: string | null): string => {
    if (!start) return ''
    const s = new Date(start)
    if (Number.isNaN(s.getTime())) return start
    const sWd = s.toLocaleDateString('en-IN', { weekday: 'short' })
    const sDay = s.getDate()
    const sMon = s.toLocaleDateString('en-IN', { month: 'short' })
    if (!end) return `${sWd} ${sDay} ${sMon}`
    const e = new Date(end)
    if (Number.isNaN(e.getTime())) return `${sWd} ${sDay} ${sMon}`
    const eWd = e.toLocaleDateString('en-IN', { weekday: 'short' })
    const eDay = e.getDate()
    const eMon = e.toLocaleDateString('en-IN', { month: 'short' })
    if (sMon === eMon && s.getFullYear() === e.getFullYear()) {
        return `${sWd} ${sDay} → ${eWd} ${eDay} ${eMon}`
    }
    return `${sWd} ${sDay} ${sMon} → ${eWd} ${eDay} ${eMon}`
}

const computeNights = (start?: string | null, end?: string | null): number | null => {
    if (!start || !end) return null
    const s = new Date(start)
    const e = new Date(end)
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null
    const diff = Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000))
    return diff > 0 ? diff : null
}

interface ExploreFlightSegment {
    airline: { code: string; name: string; flight_number: string }
    origin: { airport_code: string; airport_name: string; city_code: string; city_name: string; departure_time: string }
    destination: { airport_code: string; airport_name: string; city_code: string; city_name: string; arrival_time: string }
    duration: { minutes: number; formatted: string }
}

interface ExploreFlight {
    reference_id: string
    /** Opaque flight_cache token the BE minted for this result. Round-tripped
     *  to the concierge on "Add to Itinerary" so it resolves this exact flight
     *  from cache instead of re-searching. Absent when the BE couldn't pin a
     *  composite reference for the flight. */
    rimigo_id?: string | null
    total_price: string
    formatted_duration: string
    stop_count: number
    total_layovers: number
    is_refundable: boolean
    is_live?: boolean
    journey_type: number
    departure_date?: string | null
    return_date?: string | null
    segments: ExploreFlightSegment[]
    best_offer?: {
        provider?: string
        price?: number
        currency?: string
        affiliate_url?: string | null
        provider_logo_url?: string | null
        is_rimigo?: boolean
    }
    price_comparison?: Array<{
        provider: string
        price: number
        currency?: string
        affiliate_url?: string | null
        cabin?: string
        is_self_transfer?: boolean
    }>
}

interface FlightExploreViewProps {
    leg: FlightLeg
    /** entity_ids of flights already shortlisted for THIS leg, so we can render "Saved" pill. */
    shortlistedReferenceIds: Set<string>
    /** Single-click shortlist — caller wires the addFlightToCollection mutation. */
    onShortlist: (flight: ExploreFlight) => Promise<void> | void
    /** Single-click unshortlist — caller wires the deleteSection mutation
     *  by looking up the section that matches the flight's reference_id. */
    onUnshortlist: (flight: ExploreFlight) => Promise<void> | void
    /**
     * Whether the search has been triggered for this leg already. State is
     * managed by the parent so that out-of-component actions (e.g. the
     * empty-shortlist "Browse Flights" CTA) can pre-trigger before the
     * view flips, and so that auto-trigger conditions (existing shortlisted
     * flights on the leg) can short-circuit the manual gate.
     */
    hasSearched: boolean
    /** Asks the parent to mark this leg as "user-triggered" so search runs. */
    onTriggerSearch: () => void
    /** entity_ids of flights already attached to the trip itinerary (any leg).
     *  Cards in this set flip CTA → "In your Itinerary" badge. */
    inItineraryReferenceIds?: Set<string>
    /** When supplied, cards expose an "Add to Itinerary" CTA that opens the
     *  shared modal in the parent. Omitted in read-only / pre-trip states. */
    onAddToItinerary?: (flight: ExploreFlight) => void
    /** True when the active leg already has a flight anchored on the
     *  itinerary. Threads down to each result card so the CTA reads
     *  "+ Swap into itinerary" instead of "Add to Itinerary". */
    hasItineraryFlightOnLeg?: boolean
    /** Fires when the search query resolves with fresh results. The parent
     *  uses this to drive the anchor-card auto-redirect: it sees the live
     *  result whose reference_id matches the saved anchor section and opens
     *  THAT result's fresh affiliate_url (the saved one expires hourly).
     *  Identity of ``flights`` is tied to the React Query cache for the
     *  leg so the parent can de-dupe per render. */
    onResultsLoaded?: (legId: string, flights: ExploreFlight[]) => void
    /** Trip ObjectId in scope. Forwarded to flight-search so the minted
     *  AttributionContext is bucketed against the trip (matches tours/hotels). */
    tripId?: string | null
}

const FlightExploreView: React.FC<FlightExploreViewProps> = ({
    leg,
    shortlistedReferenceIds,
    onShortlist,
    onUnshortlist,
    hasSearched,
    onTriggerSearch,
    inItineraryReferenceIds,
    onAddToItinerary,
    hasItineraryFlightOnLeg = false,
    onResultsLoaded,
    tripId = null
}) => {
    const [shortlistingId, setShortlistingId] = useState<string | null>(null)
    // Collection (TC or CC) ObjectId in scope — forwarded to flight-search so
    // BE captures the surface on the minted AttributionContext.
    const collectionIdForAttribution = useCollectionId()

    const canSearch = !!(leg.from && leg.to && leg.date)
    const isRoundTrip = leg.kind === 'round_trip'

    const queryKey = useMemo(
        () => ['flight-search-leg', leg.id, leg.from, leg.to, leg.date, leg.return_date],
        [leg.id, leg.from, leg.to, leg.date, leg.return_date]
    )

    const searchQuery = useQuery<FlightSearchResponse>({
        queryKey,
        enabled: canSearch && hasSearched,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        queryFn: () =>
            searchFlights({
                origin: leg.from ? [leg.from] : undefined,
                destination: leg.to ? [leg.to] : undefined,
                preferredDepartureTime: leg.date ? [leg.date] : undefined,
                preferredReturnDepartureTime: isRoundTrip && leg.return_date ? [leg.return_date] : undefined,
                adultCount: 1,
                childCount: 0,
                infantCount: 0,
                journeyType: isRoundTrip ? 2 : 1,
                flightCabinClass: 1
            }, { travelerCollectionId: collectionIdForAttribution, tripId })
    })

    // Auto-trigger when the user has already shortlisted on this leg.
    // Parent decides whether to set hasSearched proactively (existing
    // shortlists on the leg, or the empty-shortlist "Browse Flights"
    // CTA pre-triggers); this effect only runs the search if the gate
    // is open and we have a fully-populated leg.
    useEffect(() => {
        if (!canSearch) return
        if (!hasSearched) return
        // No-op — query auto-runs via `enabled: canSearch && hasSearched`.
        // Effect kept for parity with future imperative refresh hooks.
    }, [canSearch, hasSearched, leg.id])

    const flights: ExploreFlight[] = useMemo(() => (searchQuery.data?.top_flights as ExploreFlight[]) || [], [searchQuery.data])

    // Notify the parent every time the cached results identity changes for
    // this leg. The parent listens to fulfill the anchor "Book" auto-redirect
    // once live results arrive.
    useEffect(() => {
        if (!onResultsLoaded) return
        if (!searchQuery.data) return
        onResultsLoaded(leg.id, flights)
        // ``flights`` identity is memoized off ``searchQuery.data`` so this
        // only fires when fresh results land, not on filter/sort changes.
    }, [flights, leg.id, onResultsLoaded, searchQuery.data])

    // Filters + sort live per-leg. Reset when leg changes so we don't carry
    // an unrelated airline filter across legs (PEN→BLR has different carriers
    // than BLR→KUL). Same reasoning for the price slider.
    const [filters, setFilters] = useState<FlightFilterState>(EMPTY_FILTERS)
    const [sortKey, setSortKey] = useState<SortKey>('best')
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
    const [isMobileSortOpen, setIsMobileSortOpen] = useState(false)
    const { trackButtonClickCustom } = usePostHog()
    const trackExplore = (eventName: string, extras?: Record<string, unknown>) => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.FLIGHT_PAGE,
            buttonName: eventName,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { leg_id: leg.id, leg_kind: leg.kind, ...extras }
        })
    }
    const handleSortChange = (next: SortKey) => {
        if (next !== sortKey) {
            trackExplore(POSTHOG_EVENTS.FLIGHTS_TAB_SORT_CHANGE, {
                from: sortKey,
                to: next
            })
        }
        setSortKey(next)
    }
    const handleFiltersClear = () => {
        trackExplore(POSTHOG_EVENTS.FLIGHTS_TAB_FILTERS_CLEAR)
        setFilters(EMPTY_FILTERS)
    }
    const handleFiltersChange = (next: FlightFilterState) => {
        // Best-effort change tracking — emit a single event per applied
        // change. Frequent toggling will fire multiple events; the
        // properties tell us which dimension was touched.
        trackExplore(POSTHOG_EVENTS.FLIGHTS_TAB_FILTER_CHANGE, {
            active_filter_count: countActiveFilters(next)
        })
        setFilters(next)
    }
    useEffect(() => {
        setFilters(EMPTY_FILTERS)
        setSortKey('best')
        setIsMobileFiltersOpen(false)
        setIsMobileSortOpen(false)
    }, [leg.id])

    const facets = useMemo(() => computeFacets(flights), [flights])
    const filteredFlights = useMemo(() => applyFilters(flights, filters), [flights, filters])
    const orderedFlights = useMemo(() => {
        const sorted = sortFlights(filteredFlights, sortKey)
        // Float flights already on the itinerary to the top so the user
        // sees committed picks before browsing alternatives. Within each
        // group the user-selected sort order is preserved.
        if (!inItineraryReferenceIds || inItineraryReferenceIds.size === 0) {
            return sorted
        }
        const inItinerary: ExploreFlight[] = []
        const others: ExploreFlight[] = []
        for (const f of sorted) {
            if (inItineraryReferenceIds.has(f.reference_id)) {
                inItinerary.push(f)
            } else {
                others.push(f)
            }
        }
        return [...inItinerary, ...others]
    }, [filteredFlights, sortKey, inItineraryReferenceIds])

    const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="w-full max-w-5xl mx-auto px-4 py-4">{children}</div>

    if (!canSearch) {
        const missing: string[] = []
        if (!leg.from) missing.push('origin airport')
        if (!leg.to) missing.push('destination airport')
        if (!leg.date) missing.push('travel date')
        return (
            <Container>
                <div className="text-center py-12">
                    <Plane
                        className="w-10 h-10 mx-auto mb-3"
                        style={{ color: '#AEAEAE' }}
                    />
                    <p
                        className="font-red-hat-display"
                        style={{ fontWeight: 700, fontSize: 15, color: '#101010', letterSpacing: '-0.02em' }}>
                        Set the {missing.join(' and ')} to start searching
                    </p>
                    <p
                        className="font-manrope mt-1.5"
                        style={{ fontWeight: 500, fontSize: 13, color: '#747474' }}>
                        Use the pencil on this leg to fill in the missing details, then tap Search.
                    </p>
                </div>
            </Container>
        )
    }

    // Pre-search state: leg is fully populated but the user hasn't asked
    // for results yet, and we have no cached data. We deliberately don't
    // auto-search — searches are slow and quota-bounded, so the user opts in.
    // Compact info strip mirrors the cells the search will run on so the
    // user can verify everything at a glance before triggering the call.
    if (!hasSearched && !searchQuery.data) {
        const dateRangeLabel = isRoundTrip ? formatDateRangeLabel(leg.date, leg.return_date) : formatDateRangeLabel(leg.date)
        const nights = isRoundTrip ? computeNights(leg.date, leg.return_date) : null
        const durationLabel = nights ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : isRoundTrip ? '—' : 'One way'

        return (
            <div className="w-full max-w-5xl mx-auto px-4 pt-1 pb-2">
                <div>
                    <div className="bg-white rounded-2xl border border-[#dfdde0] shadow-[0px_2px_10px_-2px_rgba(112,17,246,0.08)] flex flex-col md:flex-row md:items-stretch px-4 md:px-5 py-3 md:py-2.5 gap-3 md:gap-0">
                        <div className="flex items-center gap-3 md:pr-5 md:border-r md:border-grey-5">
                            <span
                                className="grid place-items-center rounded-full bg-[#F5F0FE] shrink-0"
                                style={{ width: 40, height: 40 }}>
                                <Plane
                                    className="w-4 h-4"
                                    style={{ color: '#7011F6' }}
                                />
                            </span>
                            <div className="flex flex-col min-w-0">
                                <span className="font-manrope text-[11px] font-semibold uppercase tracking-[0.06em] text-grey-2 leading-none">
                                    {LEG_KIND_HUMAN[leg.kind]}
                                </span>
                                <span className="font-red-hat-display font-extrabold text-[15px] tracking-[-0.02em] text-grey-0 leading-tight mt-1 truncate">
                                    {leg.from || '—'} {isRoundTrip ? '⇄' : '→'} {leg.to || '—'}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col md:px-5 md:border-r md:border-grey-5 md:flex-1 min-w-0 justify-center">
                            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[0.06em] text-grey-2 leading-none truncate">
                                {dateRangeLabel || (isRoundTrip ? 'Dates not set' : 'Departure')}
                            </span>
                            <span className="font-red-hat-display font-extrabold text-[15px] tracking-[-0.02em] text-grey-0 leading-tight mt-1">
                                {durationLabel}
                            </span>
                        </div>

                        <div className="flex flex-col md:px-5 md:flex-1 min-w-0 justify-center">
                            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[0.06em] text-grey-2 leading-none">
                                Travelers
                            </span>
                            <span className="font-red-hat-display font-extrabold text-[15px] tracking-[-0.02em] text-grey-0 leading-tight mt-1">
                                1 adult · Economy
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                trackExplore(POSTHOG_EVENTS.FLIGHTS_TAB_EXPLORE_SEARCH_TRIGGER, {
                                    from: leg.from,
                                    to: leg.to,
                                    date: leg.date,
                                    return_date: leg.return_date
                                })
                                onTriggerSearch()
                            }}
                            className="bg-primary-default text-white font-red-hat-display font-bold text-[13px] tracking-[-0.26px] px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary-dark transition-colors cursor-pointer w-full md:w-auto shrink-0 md:self-center">
                            <Sparkles className="w-4 h-4" />
                            Search flights
                        </button>
                    </div>
                    <p className="text-[11px] font-medium font-manrope text-grey-3 tracking-[-0.22px] leading-4 mt-2.5 text-center md:text-left md:px-1">
                        Live search across 100+ booking partners takes ~30s. Final price confirmed at provider checkout.
                    </p>
                </div>
            </div>
        )
    }

    if (searchQuery.isLoading) {
        return (
            <Container>
                <div className="text-center py-12">
                    <Loader
                        className="w-6 h-6 animate-spin mx-auto"
                        style={{ color: '#7011F6' }}
                    />
                    <p
                        className="font-red-hat-display mt-3"
                        style={{ fontWeight: 600, fontSize: 13, color: '#363636' }}>
                        Searching across providers — this can take up to 30 seconds.
                    </p>
                </div>
            </Container>
        )
    }

    if (searchQuery.isError) {
        return (
            <Container>
                <div className="text-center py-12">
                    <p
                        className="font-red-hat-display"
                        style={{ fontWeight: 700, fontSize: 14, color: '#E73434' }}>
                        Couldn't fetch flights for this leg.
                    </p>
                    <button
                        type="button"
                        onClick={() => searchQuery.refetch()}
                        className="font-red-hat-display inline-flex items-center gap-1.5 mt-3 cursor-pointer"
                        style={{
                            padding: '8px 14px',
                            borderRadius: 8,
                            border: '1px solid #E0E0E0',
                            background: '#FFFFFF',
                            color: '#363636',
                            fontWeight: 600,
                            fontSize: 13
                        }}>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Try again
                    </button>
                </div>
            </Container>
        )
    }

    if (flights.length === 0) {
        return (
            <Container>
                <div className="text-center py-12">
                    <Plane
                        className="w-10 h-10 mx-auto mb-3"
                        style={{ color: '#AEAEAE' }}
                    />
                    <p
                        className="font-red-hat-display"
                        style={{ fontWeight: 700, fontSize: 14, color: '#101010' }}>
                        No flights found for this date
                    </p>
                    <p
                        className="font-manrope mt-1.5"
                        style={{ fontWeight: 500, fontSize: 12, color: '#747474' }}>
                        Try shifting the date by a day or two.
                    </p>
                </div>
            </Container>
        )
    }

    const handleToggleShortlist = async (flight: ExploreFlight) => {
        const isSaved = shortlistedReferenceIds.has(flight.reference_id)
        setShortlistingId(flight.reference_id)
        try {
            if (isSaved) {
                await onUnshortlist(flight)
            } else {
                await onShortlist(flight)
            }
        } finally {
            setShortlistingId(null)
        }
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col lg:flex-row gap-4">
                <FlightFiltersRail
                    facets={facets}
                    filters={filters}
                    onChange={handleFiltersChange}
                    onReset={handleFiltersClear}
                />
                <div className="flex-1 min-w-0">
                    {/* Sticky sort + filter-trigger + counter row.
                        Docks under the tripboard header (56/72px) + LegStrip +
                        ViewToggle cluster (~118px) with a 16px gap so the
                        normal-state breathing room above the Sort/Filters
                        is preserved when scrolled — the gap shows the page
                        bg between the white header strip and this row.
                        Background matches the page so flight cards scroll cleanly behind it.
                        Soft drop shadow gives the bar lift over the scrolling cards. */}
                    <div
                        className="max-lg:static lg:sticky lg:top-[206px] z-20 -mx-1 px-1 pt-1 pb-3"
                        style={{
                            background: '#F5F4F7',
                            boxShadow: '0 6px 8px -6px rgba(16, 16, 16, 0.12)'
                        }}>
                        {/* Desktop: full sort chips. The full row would wrap awkwardly
                            on phone widths, so on mobile we collapse to a Sort trigger
                            (alongside Filters) that each open a dedicated bottom sheet. */}
                        <div className="hidden lg:block">
                            <SortChips
                                active={sortKey}
                                onChange={handleSortChange}
                            />
                        </div>
                        <div className="lg:hidden flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsMobileSortOpen(true)}
                                className="font-red-hat-display inline-flex items-center gap-1.5 cursor-pointer"
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 999,
                                    border: '1px solid #E0E0E0',
                                    background: '#FFFFFF',
                                    color: '#363636',
                                    fontWeight: 700,
                                    fontSize: 12,
                                    letterSpacing: '-0.02em'
                                }}>
                                <ArrowUpDown className="w-3.5 h-3.5" />
                                Sort
                                <span className="font-manrope text-[11px] font-semibold text-grey-2">· {SORT_LABELS[sortKey]}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsMobileFiltersOpen(true)}
                                className="font-red-hat-display inline-flex items-center gap-1.5 cursor-pointer relative"
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 999,
                                    border: `1px solid ${isFiltersEmpty(filters) ? '#E0E0E0' : '#7011F6'}`,
                                    background: isFiltersEmpty(filters) ? '#FFFFFF' : '#F5F0FE',
                                    color: isFiltersEmpty(filters) ? '#363636' : '#7011F6',
                                    fontWeight: 700,
                                    fontSize: 12,
                                    letterSpacing: '-0.02em'
                                }}>
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                Filters
                                {!isFiltersEmpty(filters) && (
                                    <span
                                        className="inline-flex items-center justify-center"
                                        style={{
                                            minWidth: 16,
                                            height: 16,
                                            padding: '0 4px',
                                            borderRadius: 999,
                                            background: '#7011F6',
                                            color: '#FFFFFF',
                                            fontSize: 10,
                                            fontWeight: 700
                                        }}>
                                        {countActiveFilters(filters)}
                                    </span>
                                )}
                            </button>
                        </div>
                        <div className="flex items-center justify-between px-1 mt-3 flex-wrap gap-2">
                            <span className="font-manrope text-[12px] text-grey-2">
                                {orderedFlights.length === flights.length
                                    ? `${flights.length} option${flights.length === 1 ? '' : 's'}`
                                    : `${orderedFlights.length} of ${flights.length} shown`}
                                {!isFiltersEmpty(filters) && (
                                    <button
                                        type="button"
                                        onClick={() => setFilters(EMPTY_FILTERS)}
                                        className="ml-2 text-primary-default hover:text-primary-deep cursor-pointer">
                                        Clear filters
                                    </button>
                                )}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    trackExplore(POSTHOG_EVENTS.FLIGHTS_TAB_EXPLORE_REFRESH_CLICK)
                                    searchQuery.refetch()
                                }}
                                disabled={searchQuery.isFetching}
                                className="font-red-hat-display inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 999,
                                    border: '1px solid #E0E0E0',
                                    background: '#FFFFFF',
                                    color: '#363636',
                                    fontWeight: 600,
                                    fontSize: 12
                                }}>
                                <RefreshCw className={`w-3 h-3 ${searchQuery.isFetching ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                    </div>
                    {orderedFlights.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-[#dfdde0]">
                            <Plane
                                className="w-10 h-10 mx-auto mb-3"
                                style={{ color: '#AEAEAE' }}
                            />
                            <p className="font-red-hat-display text-[14px] font-bold text-grey-0">No flights match these filters</p>
                            <button
                                type="button"
                                onClick={() => setFilters(EMPTY_FILTERS)}
                                className="font-manrope text-[12px] text-primary-default hover:text-primary-deep mt-2">
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <div
                            data-flight-explore-list
                            className="flex flex-col gap-3">
                            {orderedFlights.map((flight) => {
                                const alreadyShortlisted = shortlistedReferenceIds.has(flight.reference_id)
                                const isShortlisting = shortlistingId === flight.reference_id
                                const isInItinerary = !!inItineraryReferenceIds?.has(flight.reference_id)
                                return (
                                    <TripboardFlightCard
                                        key={flight.reference_id}
                                        flight={flight}
                                        alreadyShortlisted={alreadyShortlisted}
                                        isShortlisting={isShortlisting}
                                        onShortlist={() => {
                                            if (isShortlisting) return
                                            handleToggleShortlist(flight)
                                        }}
                                        onOpenAffiliate={() => {
                                            const url = flight.best_offer?.affiliate_url
                                            if (url) window.open(url, '_blank', 'noopener,noreferrer')
                                        }}
                                        isInItinerary={isInItinerary}
                                        onAddToItinerary={onAddToItinerary ? () => onAddToItinerary(flight) : undefined}
                                        hasItineraryFlightOnLeg={hasItineraryFlightOnLeg}
                                    />
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
            <MobileFiltersSheet
                open={isMobileFiltersOpen}
                onClose={() => setIsMobileFiltersOpen(false)}
                facets={facets}
                filters={filters}
                onChange={handleFiltersChange}
                onReset={handleFiltersClear}
                resultCount={orderedFlights.length}
            />
            <MobileSortSheet
                open={isMobileSortOpen}
                onClose={() => setIsMobileSortOpen(false)}
                active={sortKey}
                onChange={handleSortChange}
            />
        </div>
    )
}

const SORT_LABELS: Record<SortKey, string> = {
    best: 'Best match',
    cheapest: 'Cheapest',
    fastest: 'Fastest',
    earliest: 'Earliest'
}

const SORT_HELP: Record<SortKey, string> = {
    best: 'Balanced ranking from our search partners',
    cheapest: 'Lowest total fare first',
    fastest: 'Shortest total trip duration',
    earliest: 'Departs first by clock time'
}

interface MobileSortSheetProps {
    open: boolean
    onClose: () => void
    active: SortKey
    onChange: (k: SortKey) => void
}

/**
 * Bottom sheet for sort selection on mobile — mirrors MobileFiltersSheet's
 * scrim/transition behavior so both feel like the same control surface.
 * Tapping a row applies that sort and closes the sheet immediately —
 * sort is single-select, no need for an Apply CTA.
 */
const MobileSortSheet: React.FC<MobileSortSheetProps> = ({ open, onClose, active, onChange }) => {
    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [open])

    if (!open) return null

    const items: SortKey[] = ['best', 'cheapest', 'fastest', 'earliest']

    return (
        <div className="lg:hidden fixed inset-0 z-[100] flex flex-col justify-end">
            <button
                type="button"
                aria-label="Close sort"
                onClick={onClose}
                className="absolute inset-0 bg-black/40 cursor-pointer"
            />
            <div className="relative bg-white rounded-t-2xl shadow-[0_-8px_24px_rgba(16,16,16,0.16)] flex flex-col max-h-[88vh]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-grey-4 shrink-0">
                    <span className="text-[15px] font-bold font-red-hat-display text-grey-0 tracking-[-0.3px]">Sort</span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close sort"
                        className="grid place-items-center w-7 h-7 rounded-full hover:bg-grey-6 cursor-pointer">
                        <X className="w-4 h-4 text-grey-1" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                    {items.map((key) => {
                        const isActive = key === active
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => {
                                    onChange(key)
                                    onClose()
                                }}
                                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer transition-colors ${
                                    isActive ? 'bg-primary-pale-purple' : 'hover:bg-grey-6'
                                }`}>
                                <div className="min-w-0">
                                    <div
                                        className={`font-red-hat-display text-[14px] font-bold tracking-[-0.28px] ${
                                            isActive ? 'text-primary-default' : 'text-grey-0'
                                        }`}>
                                        {SORT_LABELS[key]}
                                    </div>
                                    <div className="font-manrope text-[12px] text-grey-2 mt-0.5">{SORT_HELP[key]}</div>
                                </div>
                                {isActive && <Check className="w-4 h-4 text-primary-default shrink-0" />}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

interface SortChipsProps {
    active: SortKey
    onChange: (k: SortKey) => void
}

const SortChips: React.FC<SortChipsProps> = ({ active, onChange }) => {
    const keys: SortKey[] = ['best', 'cheapest', 'fastest', 'earliest']
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className="font-red-hat-display text-[10px] font-extrabold uppercase tracking-[0.06em] text-grey-2 mr-1">Sort</span>
            {keys.map((key) => {
                const isActive = key === active
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onChange(key)}
                        className="font-red-hat-display whitespace-nowrap transition-colors cursor-pointer"
                        style={{
                            padding: '6px 12px',
                            borderRadius: 999,
                            border: `1px solid ${isActive ? '#7011F6' : '#E0E0E0'}`,
                            background: isActive ? '#7011F6' : '#FFFFFF',
                            color: isActive ? '#FFFFFF' : '#363636',
                            fontWeight: 600,
                            fontSize: 12,
                            letterSpacing: '-0.02em'
                        }}>
                        {SORT_LABELS[key]}
                    </button>
                )
            })}
        </div>
    )
}

export default FlightExploreView
export type { ExploreFlight }
