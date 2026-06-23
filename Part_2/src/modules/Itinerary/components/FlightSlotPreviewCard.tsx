import React, { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Loader2, Plane } from 'lucide-react'
import { getAirlineLogo } from '@/pages/Flights/utils/airlineLogoUtils'
import { travelerCollectionApi } from '@/modules/ContentCollection/api/travelerCollectionApi'
import FlightPriceChangePill from '@/modules/ContentCollection/components/FlightPriceChangePill'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface FlightSegment {
    airline?: { code?: string; name?: string; flight_number?: string }
    origin?: { airport_code?: string; airport_name?: string; city_name?: string; departure_time?: string }
    destination?: { airport_code?: string; airport_name?: string; city_name?: string; arrival_time?: string }
    duration?: { minutes?: number; formatted?: string }
}

interface FlightMetadata {
    reference_id?: string
    segments?: FlightSegment[]
    total_price?: string | number
    formatted_duration?: string
    stop_count?: number
    is_refundable?: boolean
    journey_type?: number
    departure_date?: string | null
    return_date?: string | null
    best_offer?: {
        provider?: string
        price?: number
        currency?: string
        affiliate_url?: string | null
        provider_logo_url?: string | null
    }
    manual_offer?: {
        provider?: string
        url?: string
    }
}

/** Helper for view-modals: returns ``{ sectionId, leg }`` when the slot
 *  is a linked flight (``kind=flight`` + ``slot_data.reference_id``),
 *  ``null`` otherwise. */
export function getFlightPreviewProps(event: unknown): {
    sectionId: string
    leg: 'outbound' | 'internal' | 'return'
} | null {
    if (!event || typeof event !== 'object') return null
    const e = event as {
        kind?: string
        entity_id?: string
        slot_data?: { reference_id?: string; section_id?: string; leg?: string; mode?: string }
    }
    const sd = e.slot_data || {}
    const isFlight = e.kind === 'flight' || sd.mode === 'flight'
    if (!isFlight || !sd.reference_id) return null
    const sectionId = sd.section_id || e.entity_id || null
    if (!sectionId) return null
    const rawLeg = sd.leg
    const leg: 'outbound' | 'internal' | 'return' = rawLeg === 'return' || rawLeg === 'internal' ? rawLeg : 'outbound'
    return { sectionId, leg }
}

interface FlightSlotPreviewCardProps {
    /** Trip the slot belongs to. When omitted, falls back to the active
     *  trip from ``useOptionalTravelerTrips`` so call sites that already
     *  live inside the tripboard context don't need to thread it. */
    tripId?: string
    /** Section id (= ``slot.entity_id``). */
    sectionId: string
    /** Optional leg flag — when ``"return"`` we render the inbound segments
     *  rather than the outbound ones (round-trip flights have one Section
     *  but two slots). Defaults to outbound. */
    leg?: 'outbound' | 'internal' | 'return'
    /** Threaded from the slot-detail modal so the Book CTA can dismiss
     *  the modal before navigating to the FlightsTab live search — the
     *  modal is a portal that doesn't unmount on tab-switch, so without
     *  this it would linger over the live results. */
    onClose?: () => void
}

/**
 * Read-only flight preview shown at the top of the Itinerary Composer's
 * Transport panel when the slot is linked to a shortlisted flight Section.
 *
 * Resolves the rich payload by:
 *  1. Listing the trip's TravelerCollections (cached via React Query).
 *  2. Loading the first collection by identifier (already cached on
 *     tripboard surfaces; new request on the standalone itinerary page).
 *  3. Finding the flight section whose id matches the slot's ``entity_id``.
 *  4. Splitting segments at the largest arrival→departure gap (>18h) so
 *     a round-trip Section renders the correct half per leg.
 *
 * Falls back to a thin "linked flight" pill while loading and a quiet
 * fallback line when the section can't be resolved (e.g. Section deleted
 * after the slot was created).
 */
export const FlightSlotPreviewCard: React.FC<FlightSlotPreviewCardProps> = ({ tripId: tripIdProp, sectionId, leg = 'outbound', onClose }) => {
    const travelerCtx = useOptionalTravelerTrips()
    const tripId = tripIdProp || travelerCtx?.activeTrip?.trip_id || null
    const collectionsQuery = useQuery({
        queryKey: ['traveler-collections-for-trip', tripId],
        queryFn: () => travelerCollectionApi.getTravelerCollectionsForList(undefined, tripId!),
        enabled: !!tripId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000
    })

    const collectionIdentifier = collectionsQuery.data?.data?.[0]?.identifier ?? null

    const collectionQuery = useQuery({
        queryKey: ['traveler-collection', collectionIdentifier, 'flights'],
        queryFn: () => travelerCollectionApi.getByIdentifier(collectionIdentifier!, 'flights'),
        enabled: !!collectionIdentifier,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000
    })

    const flight: FlightMetadata | null = useMemo(() => {
        const sections = (collectionQuery.data?.data?.sections ?? []) as Array<{
            id?: string
            section_type?: string
            metadata?: FlightMetadata
        }>
        const match = sections.find((s) => s.section_type === 'flights' && s.id === sectionId)
        return match?.metadata ?? null
    }, [collectionQuery.data, sectionId])

    if (collectionsQuery.isLoading || collectionQuery.isLoading) {
        return (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-grey-4 bg-grey-5/40 font-manrope text-[12px] text-grey-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading flight details…
            </div>
        )
    }

    if (!flight || !flight.segments || flight.segments.length === 0) {
        return (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-grey-4 bg-grey-5/40 font-manrope text-[12px] text-grey-2">
                <Plane className="h-3.5 w-3.5 text-grey-3" />
                Linked to a saved flight (details unavailable)
            </div>
        )
    }

    return (
        <ResolvedFlightPreview
            flight={flight}
            leg={leg}
            sectionId={sectionId}
            onClose={onClose}
        />
    )
}

// ─────────────────────────────────────────────────────────────────────
// Pure render — receives the rich metadata blob.
// ─────────────────────────────────────────────────────────────────────

interface ResolvedFlightPreviewProps {
    flight: FlightMetadata
    leg: 'outbound' | 'internal' | 'return'
    /** Threaded through from the parent so the price-change pill shares
     *  the same localStorage baseline key the FlightsTab uses, and stays
     *  consistent with the chip the user sees on the saved card. */
    sectionId: string
    /** See ``FlightSlotPreviewCardProps.onClose`` — fired between the
     *  PostHog event and the URL update so the slot-detail modal
     *  dismisses before the FlightsTab live search renders. */
    onClose?: () => void
}

const ResolvedFlightPreview: React.FC<ResolvedFlightPreviewProps> = ({ flight, leg, sectionId, onClose }) => {
    const segments = flight.segments || []
    const split = useMemo(() => splitSegmentsByGap(segments), [segments])
    const isRoundTrip = split.isRoundTrip || flight.journey_type === 2 || !!flight.return_date
    const [searchParams, setSearchParams] = useSearchParams()
    const { trackButtonClickCustom } = usePostHog()

    if (segments.length === 0) {
        return null
    }

    // Header reads from the first segment of the outbound leg — whether
    // round-trip or one-way, that's the airline + flight number that
    // anchors the booking.
    const headerSegments = isRoundTrip ? split.outbound : segments
    const headerFirstSeg = headerSegments[0]
    const airlineCode = headerFirstSeg.airline?.code || ''
    const airlineName = headerFirstSeg.airline?.name || 'Airline'
    const airlineFlightNumber = headerFirstSeg.airline?.flight_number

    const bestOffer = flight.best_offer
    const price = bestOffer?.price ?? (flight.total_price != null ? Number(flight.total_price) : null)
    const provider = bestOffer?.provider
    const providerLogoUrl = bestOffer?.provider_logo_url
    const affiliateUrl = bestOffer?.affiliate_url || flight.manual_offer?.url || null

    // Route the Book CTA through FlightsTab live search so affiliate URLs are
    // fresh. ``leg`` here is the current slot's leg flag ('outbound'|'return'),
    // so for round-trips we pick the matching half of the split segments.
    const bookLegSegments = isRoundTrip && leg === 'return' ? split.inbound : isRoundTrip ? split.outbound : segments
    const bookFirstSeg = bookLegSegments[0]
    const bookLastSeg = bookLegSegments[bookLegSegments.length - 1]
    const fromCode = bookFirstSeg?.origin?.airport_code
    const toCode = bookLastSeg?.destination?.airport_code
    const departureIso = bookFirstSeg?.origin?.departure_time
    const flsearchDate = (() => {
        // Round-trip "return" leg should use the inbound departure_time, not
        // the section-level departure_date (which is the outbound date).
        if (isRoundTrip && leg === 'return' && departureIso) {
            const d = new Date(departureIso)
            if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
        }
        if (flight.departure_date) return flight.departure_date
        if (!departureIso) return null
        const d = new Date(departureIso)
        if (Number.isNaN(d.getTime())) return null
        return d.toISOString().slice(0, 10)
    })()
    const canRouteToFlightsTab = !!fromCode && !!toCode && !!flsearchDate

    const handleBookClick = () => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.FLIGHT_PAGE,
            buttonName: POSTHOG_EVENTS.FLIGHTS_TAB_FLIGHT_BOOK_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                source: 'itinerary_slot_preview',
                section_id: sectionId,
                provider: provider || null,
                price: price ?? null
            }
        })
        // Close the slot-detail modal before navigating — it's rendered
        // as a portal at a higher level and won't auto-dismiss on the
        // tab switch the URL update triggers. Order: track → close →
        // navigate, so PostHog fires before this component unmounts.
        onClose?.()
        const next = new URLSearchParams(searchParams)
        next.set('tab', 'flights')
        next.set('flsearch_from', fromCode!)
        next.set('flsearch_to', toCode!)
        next.set('flsearch_date', flsearchDate!)
        next.set('flsearch_ref', sectionId)
        setSearchParams(next, { replace: false })
    }

    return (
        <div className="rounded-2xl border border-grey-4 bg-white overflow-hidden shadow-[0_2px_12px_-4px_rgba(112,17,246,0.10)]">
            {/* Header: airline + flight no + tag | price stack */}
            <div className="grid grid-cols-[1fr_auto] gap-4 px-5 pt-4 pb-3.5">
                <div className="flex items-center gap-3 min-w-0">
                    {airlineCode ? (
                        <div className="h-10 w-10 rounded-full border border-grey-4 bg-white flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                                src={getAirlineLogo(airlineCode)}
                                alt={airlineName}
                                className="h-7 w-7 object-contain"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                }}
                            />
                        </div>
                    ) : null}
                    <div className="min-w-0">
                        <p className="font-red-hat-display text-[15px] font-extrabold text-grey-0 leading-tight tracking-[-0.01em] truncate">
                            {airlineName}
                            {airlineFlightNumber ? (
                                <span className="text-grey-2 font-bold ml-2">
                                    {airlineCode || ''}
                                    {airlineFlightNumber}
                                </span>
                            ) : null}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 font-manrope text-[10px] font-bold uppercase tracking-[0.08em] text-primary-default">
                                <Plane className="h-2.5 w-2.5" />
                                {isRoundTrip ? 'Round trip' : 'Linked flight'}
                            </span>
                            {flight.is_refundable ? (
                                <span className="font-manrope text-[10px] text-grey-3 before:content-['·'] before:mr-2 before:text-grey-3">
                                    Refundable
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
                {price != null ? (
                    <div className="flex flex-col items-end shrink-0">
                        <p className="font-red-hat-display text-[20px] font-extrabold text-grey-0 leading-none tabular-nums tracking-[-0.02em]">
                            {formatINR(price)}
                        </p>
                        {provider ? (
                            <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                <span className="font-manrope text-[10px] text-grey-3">via</span>
                                {providerLogoUrl ? (
                                    <img
                                        src={providerLogoUrl}
                                        alt={provider}
                                        className="h-4 w-auto max-w-20 object-contain"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                        }}
                                    />
                                ) : (
                                    <span className="font-manrope text-[11px] font-semibold text-grey-1">{provider}</span>
                                )}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {/* Time rails — two stacked for round-trip (with the slot's
                own leg highlighted), one for one-way. */}
            {isRoundTrip ? (
                <div className="flex flex-col">
                    <PreviewTimeRail
                        label="Outbound"
                        segments={split.outbound}
                        flightFormattedDuration={null}
                        isCurrentLeg={leg !== 'return'}
                    />
                    <div className="border-t border-dashed border-grey-4 mx-5" />
                    <PreviewTimeRail
                        label="Return"
                        segments={split.inbound}
                        flightFormattedDuration={null}
                        isCurrentLeg={leg === 'return'}
                    />
                </div>
            ) : (
                <div className="border-t border-grey-4/60">
                    <PreviewTimeRail
                        segments={segments}
                        flightFormattedDuration={flight.formatted_duration ?? null}
                        isCurrentLeg
                    />
                </div>
            )}

            {/* Footer: surge chip on the left, Book CTA on the right.
                The surge chip lives here (not next to the price) so the
                card balances visually — top-right gets just price + provider,
                bottom edge gets the booking-decision pair where the
                "price is climbing" signal sits one tap away from the
                "Book now" action. Falls back to right-aligned Book only
                when there's no surge chip and no affiliate URL. */}
            {affiliateUrl || price != null || canRouteToFlightsTab ? (
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-grey-4 bg-grey-5/40">
                    <div className="min-w-0">
                        {price != null ? (
                            <FlightPriceChangePill
                                sectionId={sectionId}
                                currentPrice={price}
                            />
                        ) : null}
                    </div>
                    {canRouteToFlightsTab ? (
                        <button
                            type="button"
                            onClick={handleBookClick}
                            className="group inline-flex items-center gap-1.5 rounded-lg bg-primary-default text-white px-4 py-2 font-red-hat-display text-[13px] font-bold tracking-[-0.01em] hover:bg-primary-dark active:scale-[0.98] transition-all shadow-[0_2px_6px_-2px_rgba(112,17,246,0.4)] shrink-0 cursor-pointer">
                            Book{provider ? ` on ${provider}` : ''}
                            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </button>
                    ) : affiliateUrl ? (
                        <a
                            href={affiliateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-1.5 rounded-lg bg-primary-default text-white px-4 py-2 font-red-hat-display text-[13px] font-bold tracking-[-0.01em] hover:bg-primary-dark active:scale-[0.98] transition-all shadow-[0_2px_6px_-2px_rgba(112,17,246,0.4)] shrink-0">
                            Book{provider ? ` on ${provider}` : ''}
                            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </a>
                    ) : null}
                </div>
            ) : null}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────
// Helpers — kept private to this file (mirrors TripboardFlightCard's
// helpers but shouldn't be shared yet because both are still iterating).
// ─────────────────────────────────────────────────────────────────────

function splitSegmentsByGap(segments: FlightSegment[]): {
    outbound: FlightSegment[]
    inbound: FlightSegment[]
    isRoundTrip: boolean
} {
    if (!segments || segments.length < 2) {
        return { outbound: segments || [], inbound: [], isRoundTrip: false }
    }
    const eighteenHoursMs = 18 * 60 * 60 * 1000
    let bestGap = 0
    let bestIdx = -1
    for (let i = 0; i < segments.length - 1; i += 1) {
        const arr = new Date(segments[i].destination?.arrival_time || '').getTime()
        const dep = new Date(segments[i + 1].origin?.departure_time || '').getTime()
        if (Number.isFinite(arr) && Number.isFinite(dep)) {
            const gap = dep - arr
            if (gap > bestGap) {
                bestGap = gap
                bestIdx = i
            }
        }
    }
    if (bestIdx >= 0 && bestGap > eighteenHoursMs) {
        return {
            outbound: segments.slice(0, bestIdx + 1),
            inbound: segments.slice(bestIdx + 1),
            isRoundTrip: true
        }
    }
    return { outbound: segments, inbound: [], isRoundTrip: false }
}

function computeDurationMinutes(start?: string, end?: string): number {
    if (!start || !end) return 0
    const a = new Date(start).getTime()
    const b = new Date(end).getTime()
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0
    return Math.round((b - a) / 60000)
}

function formatDurationMinutes(minutes: number): string {
    if (!minutes) return '—'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatINR(value: number): string {
    if (!Number.isFinite(value)) return '—'
    return `₹${Math.round(value).toLocaleString('en-IN')}`
}

function formatTime(iso?: string): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
}

function formatDate(iso?: string): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

interface PreviewTimeRailProps {
    /** Optional leg header (``Outbound`` / ``Return``) — shown for
     *  round-trip flights, omitted for one-way. */
    label?: string
    segments: FlightSegment[]
    /** When provided (one-way only), use the API's pre-formatted duration
     *  string instead of computing one from segment timestamps. */
    flightFormattedDuration: string | null
    /** ``true`` when this leg corresponds to the slot the user is
     *  viewing — gets a subtle "This slot" pill so a return-leg slot
     *  doesn't pretend the outbound is its source of truth. */
    isCurrentLeg: boolean
}

const PreviewTimeRail: React.FC<PreviewTimeRailProps> = ({ label, segments, flightFormattedDuration, isCurrentLeg }) => {
    if (segments.length === 0) return null
    const firstSeg = segments[0]
    const lastSeg = segments[segments.length - 1]
    const departureCode = firstSeg.origin?.airport_code || '—'
    const arrivalCode = lastSeg.destination?.airport_code || '—'
    const departureCity = firstSeg.origin?.city_name || departureCode
    const arrivalCity = lastSeg.destination?.city_name || arrivalCode
    const departureTime = firstSeg.origin?.departure_time
    const arrivalTime = lastSeg.destination?.arrival_time

    const stops = Math.max(0, segments.length - 1)
    const stopCodes = segments
        .slice(0, -1)
        .map((s) => s.destination?.airport_code)
        .filter(Boolean) as string[]

    const durationMinutes = computeDurationMinutes(departureTime, arrivalTime)
    const durationLabel = flightFormattedDuration || formatDurationMinutes(durationMinutes)

    return (
        <div className="px-5 py-4">
            {label && (
                <div className="flex items-center gap-2 mb-3">
                    <span className="font-manrope text-[10px] font-bold uppercase tracking-[0.1em] text-grey-2">{label}</span>
                    {isCurrentLeg && (
                        <span className="inline-flex items-center rounded-[4px] bg-primary-default px-1.5 py-px font-manrope text-[9px] font-bold tracking-[0.05em] text-white uppercase">
                            Selected
                        </span>
                    )}
                </div>
            )}
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:gap-5">
                <div className="min-w-0">
                    <p className="font-red-hat-display text-[20px] sm:text-[22px] font-extrabold text-grey-0 leading-none tabular-nums tracking-[-0.02em]">
                        {formatTime(departureTime)}
                    </p>
                    <p className="font-manrope text-[11px] text-grey-2 mt-1.5 tabular-nums">{formatDate(departureTime)}</p>
                    <div className="mt-2 min-w-0">
                        <p className="font-red-hat-display text-[13px] font-bold text-grey-0 tracking-tight">{departureCode}</p>
                        <p className="font-manrope text-[11px] text-grey-3 mt-0.5 truncate">{departureCity}</p>
                    </div>
                </div>
                <div className="flex flex-col items-center min-w-[120px] sm:min-w-[180px] pt-2">
                    <span className="inline-flex items-center rounded-full bg-primary-default/10 px-2 py-0.5 font-manrope text-[10px] font-bold text-primary-default tabular-nums tracking-tight">
                        {durationLabel}
                    </span>
                    <div className="relative w-full mt-3 mb-2 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-default ring-2 ring-primary-default/20 shrink-0" />
                        <div className="flex-1 h-px bg-gradient-to-r from-primary-default/30 via-grey-3 to-primary-default/30 mx-1.5" />
                        <span
                            aria-hidden
                            className="absolute left-1/2 -translate-x-1/2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-white border border-primary-default/30 shadow-sm">
                            <Plane className="w-2.5 h-2.5 text-primary-default rotate-90" />
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-default ring-2 ring-primary-default/20 shrink-0" />
                    </div>
                    <p className="font-manrope text-[10px] font-semibold text-grey-2 mt-0.5 text-center">
                        {stops === 0 ? (
                            <span className="text-secondary-green">Direct</span>
                        ) : (
                            <>
                                {stops} stop{stops > 1 ? 's' : ''}
                                {stopCodes.length ? <span className="text-grey-3"> · {stopCodes.join(', ')}</span> : null}
                            </>
                        )}
                    </p>
                </div>
                <div className="min-w-0 text-right">
                    <p className="font-red-hat-display text-[20px] sm:text-[22px] font-extrabold text-grey-0 leading-none tabular-nums tracking-[-0.02em]">
                        {formatTime(arrivalTime)}
                    </p>
                    <p className="font-manrope text-[11px] text-grey-2 mt-1.5 tabular-nums">{formatDate(arrivalTime)}</p>
                    <div className="mt-2 min-w-0">
                        <p className="font-red-hat-display text-[13px] font-bold text-grey-0 tracking-tight">{arrivalCode}</p>
                        <p className="font-manrope text-[11px] text-grey-3 mt-0.5 truncate">{arrivalCity}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FlightSlotPreviewCard
