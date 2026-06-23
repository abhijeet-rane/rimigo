/**
 * Dedicated visual for transport slots whose ``slot_data.flight_data`` is
 * populated (the concierge ``search_flights`` enricher hit the cache). Mirrors
 * the brand's flight-card design — airline lockup on the left, total duration
 * on the right, departure / arrival times stacked with airport codes and
 * city names, connected by a blue dashed rail with a centered plane icon
 * (intermediate stop rings appear when the flight has stops).
 *
 * When ``flight_data`` is missing or thin (no airline / origin / destination /
 * times), callers should fall back to the generic transport slot rendering —
 * this component is intentionally strict about the fields it needs and
 * returns ``null`` rather than rendering a half-formed card.
 */
import React, { useState } from 'react'
import { Plane } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { resolveAirlineLogo, type CompactFlightData } from './transportSlotRenderers'

interface FlightTransportCardProps {
    flight: CompactFlightData
    /** Falls through to the slot's resolved cabin class (e.g. "Economy")
     *  when present. Sourced from ``slot_data.flight_data.best_offer.cabin``
     *  by the caller — the compact shape itself doesn't carry it. */
    cabin?: string | null
    /** Optional human city names for the departure / arrival airports —
     *  rendered as the subtitle below each IATA code. The compact flight
     *  payload doesn't carry these directly, so callers pass the slot's
     *  ``from_city`` / ``to_city`` (which the agent stamps during
     *  enrichment). */
    fromCityName?: string | null
    toCityName?: string | null
}

const formatTime = (iso?: string): string => {
    if (!iso) return ''
    // The backend stores naive local-tz strings (e.g.
    // "2026-06-14T10:00:00"). new Date(iso) would interpret these in the
    // user's local timezone — which is wrong because the flight times are
    // local to the AIRPORT not the user. Parse the HH:MM directly to keep
    // the displayed time identical to what the agent persisted.
    const t = iso.split('T')[1]
    if (!t) return ''
    const [hh, mm] = t.split(':').map(Number)
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return ''
    const period = hh >= 12 ? 'pm' : 'am'
    const hour12 = hh % 12 || 12
    return `${hour12}:${mm.toString().padStart(2, '0')} ${period}`
}

const formatDuration = (minutes?: number): string => {
    if (!minutes || minutes <= 0) return ''
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h && m) return `${h}h ${m}m`
    if (h) return `${h}h`
    return `${m}m`
}

/** Compute the calendar-day offset of the arrival relative to the departure.
 *  Returns 0 when same-day, 1 when arrives the next day, etc. Negative or
 *  same-day yields no badge. */
const computeDayOffset = (departureIso?: string, arrivalIso?: string): number => {
    if (!departureIso || !arrivalIso) return 0
    const depDate = departureIso.split('T')[0]
    const arrDate = arrivalIso.split('T')[0]
    if (!depDate || !arrDate) return 0
    const dep = new Date(depDate)
    const arr = new Date(arrDate)
    if (Number.isNaN(dep.getTime()) || Number.isNaN(arr.getTime())) return 0
    const diff = Math.round((arr.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
}

const cleanCityName = (raw?: string | null): string => {
    if (!raw) return ''
    // ``from_city`` often comes in as "Bengaluru, India" — drop the country
    // suffix so the small city label stays compact under the IATA code.
    const trimmed = raw.split(',')[0]?.trim() ?? ''
    return trimmed
}

export const FlightTransportCard: React.FC<FlightTransportCardProps> = ({
    flight,
    cabin,
    fromCityName,
    toCityName,
}) => {
    const [logoBroken, setLogoBroken] = useState(false)
    // Mobile mutes the times + day-offset to the city colour; desktop keeps
    // the original dark times + purple offset.
    const isMobile = useIsMobile()
    const timeColor = isMobile ? 'text-grey-2' : 'text-grey-0'
    const offsetColor = isMobile ? 'text-grey-2' : 'text-primary-default'

    // Required fields — strict so a half-populated payload falls back to
    // the generic transport card instead of rendering a broken layout.
    const hasRequiredFields =
        !!flight.airline &&
        !!flight.flight_number &&
        !!flight.origin &&
        !!flight.destination &&
        !!flight.departure_time &&
        !!flight.arrival_time
    if (!hasRequiredFields) return null

    const resolvedLogo = resolveAirlineLogo(flight)
    const showLogo = !!resolvedLogo && !logoBroken
    const stops = typeof flight.stops === 'number' ? flight.stops : 0
    const isDirect = stops === 0
    const fromCity = cleanCityName(fromCityName)
    const toCity = cleanCityName(toCityName)
    const dayOffset = computeDayOffset(flight.departure_time, flight.arrival_time)

    const stopsLabel = isDirect
        ? 'Non-stop'
        : `+${stops} stop${stops > 1 ? 's' : ''}`

    return (
        <div className="rounded-xl border border-grey-4 bg-white overflow-hidden">
            {/* Header strip — light grey background so it reads as a
                separate band from the white body, with the airline lockup
                on the left and TOTAL duration stack on the right. */}
            <div className="flex items-center justify-between gap-2 p-1.5 bg-[#F5F5F5]">
                <div className="flex items-center gap-2 min-w-0">
                    {showLogo ? (
                        <div className="h-10 w-10 rounded-[8px] bg-white flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                                src={resolvedLogo}
                                alt={flight.airline || 'airline'}
                                className="h-[30px] w-[30px] object-contain"
                                onError={() => setLogoBroken(true)}
                            />
                        </div>
                    ) : (
                        // Generic plane fallback — never the IATA code. The
                        // airline name on the right of the logo already
                        // identifies the carrier.
                        <div className="h-10 w-10 rounded-[8px] bg-primary-default/10 flex items-center justify-center shrink-0">
                            <Plane className="h-4 w-4 text-primary-default" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="font-red-hat-display text-[14px] font-bold text-grey-0 leading-tight truncate">
                            {flight.airline}
                        </p>
                        <p className="font-manrope text-[12px] font-normal text-grey-2 leading-tight mt-0.5 truncate">
                            {flight.flight_number}
                            {cabin ? <span className="text-grey-3 font-normal"> · {cabin}</span> : null}
                        </p>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="font-manrope text-[9px] font-bold text-grey-2 uppercase tracking-[0.1em] leading-none">
                        Duration
                    </p>
                    <p className="font-red-hat-display text-[14px] font-bold text-grey-0 mt-1 tabular-nums leading-none">
                        {formatDuration(flight.duration_minutes) || '—'}
                    </p>
                </div>
            </div>

            {/* Body. Three stacked rows:
                  1. Times — space-between row across the card width.
                  2. Codes + connector — 3-col grid (code | rail | code).
                  3. Cities — space-between row mirroring (1). */}
            <div className="p-2">
                {/* (1) Times row */}
                <div className="flex items-baseline justify-between">
                    <span className={`${isMobile ? 'font-manrope text-[12px] font-normal' : 'font-red-hat-display text-[14px] font-bold'} ${timeColor} leading-none tabular-nums whitespace-nowrap`}>
                        {formatTime(flight.departure_time)}
                    </span>
                    <span className="inline-flex items-baseline gap-1">
                        <span className={`${isMobile ? 'font-manrope text-[12px] font-normal' : 'font-red-hat-display text-[14px] font-bold'} ${timeColor} leading-none tabular-nums whitespace-nowrap`}>
                            {formatTime(flight.arrival_time)}
                        </span>
                        {dayOffset > 0 && (
                            <span className={`font-manrope text-[11px] font-semibold ${offsetColor} tabular-nums`}>
                                +{dayOffset}
                            </span>
                        )}
                    </span>
                </div>

                {/* (2) Codes + connector. Grid columns are 1fr | 3fr | 1fr
                    so the connector occupies exactly 60% of the body width
                    and the codes get 20% each. */}
                <div className="grid grid-cols-[1fr_3fr_1fr] items-center gap-1.5 mt-0">
                    <span className={`${isMobile ? 'font-manrope' : 'font-red-hat-display'} text-[16px] font-bold text-grey-0 leading-none`}>
                        {flight.origin}
                    </span>
                    <FlightConnector stops={stops} stopsLabel={stopsLabel} />
                    <span className={`${isMobile ? 'font-manrope' : 'font-red-hat-display'} text-[16px] font-bold text-grey-0 leading-none text-right`}>
                        {flight.destination}
                    </span>
                </div>

                {/* (3) Cities row — sits flush under the codes (no top
                    margin), the codes' leading-none keeps just enough
                    visual breathing room. */}
                {(fromCity || toCity) && (
                    <div className="flex justify-between gap-2 mt-0">
                        <span className="font-manrope text-[11px] font-normal text-grey-2 truncate">
                            {fromCity}
                        </span>
                        <span className="font-manrope text-[11px] font-normal text-grey-2 truncate text-right">
                            {toCity}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

interface FlightConnectorProps {
    stops: number
    stopsLabel: string
}

const FlightConnector: React.FC<FlightConnectorProps> = ({ stops, stopsLabel }) => {
    // Single line between two endpoint rings, with a plane icon centered
    // on the line. Solid for direct, dashed for any number of stops — no
    // intermediate rings (the stops-count is conveyed by the label above).
    const isDirect = stops === 0
    const lineStyle = isDirect ? '' : 'border-dashed'
    // Mobile uses a muted grey treatment; desktop keeps the original brand purple.
    const isMobile = useIsMobile()
    const labelColor = isMobile ? 'text-grey-4' : 'text-primary-default'
    const ringColor = isMobile ? 'border-grey-4' : 'border-primary-default'
    const lineColor = isMobile ? 'border-grey-4' : 'border-primary-default/60'
    const planeColor = isMobile ? 'text-grey-4' : 'text-primary-default'

    return (
        <div className="flex flex-col items-center w-full">
            <span className={`font-manrope text-[11px] font-semibold ${labelColor} mb-0.5`}>
                {stopsLabel}
            </span>
            <div className="relative w-full flex items-center">
                {/* Endpoint: hollow ring */}
                <span className={`h-2.5 w-2.5 rounded-full border-[1.5px] ${ringColor} bg-white shrink-0 z-10`} />

                {/* Continuous line with the plane icon centered. The line
                    is absolutely positioned behind the icon so it doesn't
                    have to be split into two halves. */}
                <div className="relative flex-1 mx-1 flex items-center justify-center">
                    <span
                        aria-hidden
                        className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t ${lineColor} ${lineStyle}`}
                    />
                    <span
                        aria-hidden
                        className="relative inline-flex items-center justify-center bg-white px-1 z-10">
                        <Plane className={`h-3.5 w-3.5 ${planeColor} rotate-45`} />
                    </span>
                </div>

                {/* Endpoint: hollow ring */}
                <span className={`h-2.5 w-2.5 rounded-full border-[1.5px] ${ringColor} bg-white shrink-0 z-10`} />
            </div>
        </div>
    )
}

export default FlightTransportCard
