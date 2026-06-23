import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, ExternalLink, Plane } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import { parseTransportTitle } from '../utils/transportTitle'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

/**
 * Compact flight payload the concierge ``search_flights`` tool surfaces
 * via the transport enricher. Persisted at ``slot.slot_data.flight_data``
 * (since krysto fix: persist flight cache hydration into slot_data).
 *
 * Mirrors ``trip/services/ata/concierge/tools/search_flights.py``
 * ``_compact_flight``. Every field is optional — the enricher degrades
 * gracefully when the cache misses and these blocks just don't render.
 */
export interface CompactFlightData {
    flight_number?: string
    airline?: string
    airline_code?: string
    airline_logo?: string
    origin?: string
    destination?: string
    departure_time?: string
    arrival_time?: string
    duration_minutes?: number
    stops?: number
    price?: number | string
    currency?: string
    booking_url?: string
    segments_summary?: string
}

/**
 * Resolve a transport slot's leg into a {from, to, mode} triple,
 * preferring the most specific source available.
 *
 * Inter-city slots persist ``slot_data.from_city`` / ``slot_data.to_city``
 * (canonical names + ids stamped from the city catalog).
 *
 * Intra-city slots (local cabs, transfers within a city) persist
 * ``slot_data.from_venue`` / ``slot_data.to_venue`` instead — the city
 * fields are intentionally absent because the agent's view of the row
 * was always the same city on both sides ("Bangkok → Bangkok") and
 * the venue strings are what actually convey pickup → dropoff.
 *
 * Legacy descriptive slots (no slot_data route fields at all) fall back
 * to parsing the title — same behavior the kanban card has had for a
 * while.
 *
 * Returns null when no leg can be derived (e.g. a free-form transport
 * title that doesn't match any pattern). Callers then suppress the
 * leg row entirely rather than rendering "undefined → undefined".
 */
export function resolveTransportLeg(slotData: any, title: string | null | undefined): { from: string; to: string; mode: string | null } | null {
    const sd = (slotData ?? {}) as Record<string, any>

    // Intra-city venues take precedence over city fields. The backend
    // resolver (``_resolve_transport_endpoints``) won't write both —
    // a slot is either inter-city (cities populated, venues cleared)
    // or intra-city (venues populated, cities cleared) — but a defensive
    // ``venue || city`` keeps the UI sane during the rolling-deploy
    // window where some persisted slots may carry both fields.
    const from = sd.from_venue || sd.fromVenue || sd.from_city || sd.fromCity || null
    const to = sd.to_venue || sd.toVenue || sd.to_city || sd.toCity || null
    const mode = sd.mode || null

    if (from && to) {
        return { from: String(from), to: String(to), mode: mode ? String(mode) : null }
    }

    // Title-parse fallback for descriptive transport slots that the
    // enricher couldn't structure (no colon-separated route in the
    // title, no slot_data route fields written).
    const parsed = parseTransportTitle(title || '')
    if (parsed) return { from: parsed.from, to: parsed.to, mode: parsed.mode }
    return null
}

// Brand-logo fallbacks for carriers whose ``airline_logo`` the Kayak
// payload doesn't include. Keyed on both IATA code (``6E``) and a
// normalized airline name (``indigo``) so either signal resolves. Extend
// this map as new carriers surface without logos.
const AIRLINE_LOGO_FALLBACKS: Record<string, string> = {
    '6E': 'https://media.rimigo.com/compressed/1779266846118_indigo-airlines.webp',
    indigo: 'https://media.rimigo.com/compressed/1779266846118_indigo-airlines.webp'
}

/**
 * Resolve the airline logo URL, preferring the payload-supplied one and
 * falling back to the brand-logo map when missing. Kayak's compact
 * payload often omits ``airline_logo`` for domestic carriers (IndiGo,
 * etc.) — the fallback keeps the flight lockup from collapsing to a
 * generic plane icon for those slots.
 */
export const resolveAirlineLogo = (flight: CompactFlightData): string | undefined => {
    if (flight.airline_logo) return flight.airline_logo
    const codeKey = flight.airline_code?.trim().toUpperCase()
    if (codeKey && AIRLINE_LOGO_FALLBACKS[codeKey]) return AIRLINE_LOGO_FALLBACKS[codeKey]
    const nameKey = flight.airline?.trim().toLowerCase()
    if (nameKey && AIRLINE_LOGO_FALLBACKS[nameKey]) return AIRLINE_LOGO_FALLBACKS[nameKey]
    return undefined
}

/**
 * Pull the compact flight enrichment payload off a slot if present.
 * The persisted location is ``slot_data.flight_data`` (krysto: post
 * the persistence fix). Older slots that were enriched before that
 * fix landed may carry it at the top level — check both for a
 * graceful migration window.
 */
export function getFlightEnrichment(event: any): CompactFlightData | null {
    if (!event) return null
    const slotData = event.slot_data || event.slotData || {}
    return slotData.flight_data || slotData.flightData || event.flight_data || event.flightData || null
}

const formatPriceLabel = (price: CompactFlightData['price'], currency: CompactFlightData['currency']): string | null => {
    if (price === undefined || price === null) return null
    if (typeof price === 'number') return `${currency || 'INR'} ${price.toLocaleString()}`
    return String(price)
}

const formatStopsLabel = (stops: CompactFlightData['stops']): string | null => {
    if (stops === 0) return 'Direct'
    if (stops === 1) return '1 stop'
    if (typeof stops === 'number' && stops > 1) return `${stops} stops`
    return null
}

/**
 * Compact flight card embedded inside transport slot UI (kanban/calendar
 * card and the slot detail modal). Renders airline logo, flight number,
 * route, stops badge, price, and a Kayak booking CTA — everything the
 * traveler needs to act on the leg without leaving the slot view.
 *
 * Renders nothing when ``flight`` lacks any user-visible field; defensive
 * because the backend payload is partial when search_flights returned
 * a thin Kayak result.
 */
export const FlightEnrichmentBlock: React.FC<{
    flight: CompactFlightData
    /** ``compact`` for the in-day slot card; ``detail`` for the modal. */
    variant?: 'compact' | 'detail'
    /** Threaded from the slot-detail modal so the detail-variant Book CTA
     *  can dismiss the modal before navigating to FlightsTab live search.
     *  Only fired when ``variant === 'detail'``; the compact in-day card
     *  doesn't render inside a portal so it doesn't need this. */
    onClose?: () => void
}> = ({ flight, variant = 'compact', onClose }) => {
    const [logoBroken, setLogoBroken] = useState(false)

    const stopsLabel = formatStopsLabel(flight.stops)
    const priceLabel = formatPriceLabel(flight.price, flight.currency)
    const resolvedLogo = resolveAirlineLogo(flight)
    const showLogo = !!resolvedLogo && !logoBroken
    const isDetail = variant === 'detail'
    const [searchParams, setSearchParams] = useSearchParams()
    const { trackButtonClickCustom } = usePostHog()

    // Detail-variant Book CTA routes the user to the FlightsTab live search
    // for this leg rather than opening the persisted (and quickly-stale)
    // affiliate URL on flight.booking_url. Compact variant keeps the legacy
    // anchor link untouched.
    const flsearchDate = (() => {
        if (!flight.departure_time) return null
        const d = new Date(flight.departure_time)
        if (Number.isNaN(d.getTime())) return null
        return d.toISOString().slice(0, 10)
    })()
    const canRouteToFlightsTab = isDetail && !!flight.origin && !!flight.destination && !!flsearchDate

    const handleDetailBook = () => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.FLIGHT_PAGE,
            buttonName: POSTHOG_EVENTS.FLIGHTS_TAB_FLIGHT_BOOK_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                source: 'itinerary_slot_compact',
                provider: flight.airline || null,
                price: flight.price ?? null
            }
        })
        // Detail variant lives inside the slot-detail modal (a portal at
        // a higher level that doesn't unmount on tab switch) — dismiss
        // it before navigating so the FlightsTab live search isn't
        // covered by a lingering modal. Order: track → close → navigate.
        if (isDetail) onClose?.()
        const next = new URLSearchParams(searchParams)
        next.set('tab', 'flights')
        next.set('flsearch_from', flight.origin!)
        next.set('flsearch_to', flight.destination!)
        next.set('flsearch_date', flsearchDate!)
        setSearchParams(next, { replace: false })
    }

    const logoSize = isDetail ? 'w-10 h-10' : 'w-6 h-6'
    const logoIconSize = isDetail ? 'w-5 h-5' : 'w-3 h-3'
    const airlineSize = isDetail ? '14' : '11'
    const flightNumberSize = isDetail ? '12' : '10'
    const priceSize = isDetail ? '15' : '12'
    const ctaPadding = isDetail ? 'py-2.5 text-[12px]' : 'py-1.5 text-[10px]'
    const containerPadding = isDetail ? 'p-3' : 'p-2 mt-1'

    return (
        <div className={`rounded-md bg-white border border-blue-200 ${containerPadding}`}>
            {/* Header: logo + airline + flight number + price */}
            <div className="flex items-center gap-2">
                {showLogo ? (
                    <img
                        src={resolvedLogo}
                        alt={flight.airline || 'airline'}
                        className={`${logoSize} rounded object-contain flex-shrink-0`}
                        onError={() => setLogoBroken(true)}
                    />
                ) : (
                    <div className={`${logoSize} rounded bg-blue-50 flex items-center justify-center flex-shrink-0`}>
                        <Plane className={`${logoIconSize} text-blue-600`} />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    {flight.airline && (
                        <Typography
                            size={airlineSize}
                            weight="semibold"
                            family="manrope"
                            color="grey-0"
                            className="truncate">
                            {flight.airline}
                        </Typography>
                    )}
                    {flight.flight_number && (
                        <Typography
                            size={flightNumberSize}
                            weight="medium"
                            family="manrope"
                            color="grey-1">
                            {flight.flight_number}
                        </Typography>
                    )}
                </div>
                {priceLabel && (
                    <Typography
                        size={priceSize}
                        weight="bold"
                        family="manrope"
                        color="grey-0"
                        className="tabular-nums whitespace-nowrap">
                        {priceLabel}
                    </Typography>
                )}
            </div>

            {/* Route + stops + segments summary */}
            {(stopsLabel || flight.segments_summary || flight.origin) && (
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    {flight.segments_summary ? (
                        <Typography
                            size={isDetail ? '12' : '10'}
                            weight="medium"
                            family="manrope"
                            color="grey-1">
                            {flight.segments_summary}
                        </Typography>
                    ) : flight.origin && flight.destination ? (
                        <Typography
                            size={isDetail ? '12' : '10'}
                            weight="medium"
                            family="manrope"
                            color="grey-1"
                            className="flex items-center gap-1">
                            <span>{flight.origin}</span>
                            <ArrowRight size={isDetail ? 12 : 10} />
                            <span>{flight.destination}</span>
                        </Typography>
                    ) : null}
                    {stopsLabel && (
                        <span
                            className={`px-1.5 py-[1px] rounded-full text-[9px] font-semibold font-manrope ${
                                flight.stops === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                            {stopsLabel}
                        </span>
                    )}
                </div>
            )}

            {/* Booking CTA — detail variant routes to FlightsTab live search
                (fresh affiliate URLs); compact variant keeps the legacy direct
                anchor link. Falls back to the anchor link when route fields
                (origin / destination / departure_time) are missing. */}
            {canRouteToFlightsTab ? (
                <button
                    type="button"
                    onClick={handleDetailBook}
                    className={`mt-2 flex items-center justify-center gap-1 w-full cursor-pointer rounded-md font-semibold font-manrope bg-primary-default text-white hover:opacity-90 transition-opacity ${ctaPadding}`}>
                    Book flight
                    <ExternalLink className={isDetail ? 'w-3 h-3' : 'w-2.5 h-2.5'} />
                </button>
            ) : flight.booking_url ? (
                <a
                    href={flight.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-2 flex items-center justify-center gap-1 w-full rounded-md font-semibold font-manrope bg-primary-default text-white hover:opacity-90 transition-opacity ${ctaPadding}`}>
                    Book flight
                    <ExternalLink className={isDetail ? 'w-3 h-3' : 'w-2.5 h-2.5'} />
                </a>
            ) : null}
        </div>
    )
}
