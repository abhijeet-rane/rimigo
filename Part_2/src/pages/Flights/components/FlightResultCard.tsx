/**
 * Compact flight result card used on the /flights page search results.
 * Visually mirrors the FlightRow on Tripboard (Flights Tab + Budget Tab):
 * dense rows, tabular times, small-weight provider meta, primary CTA.
 * Adds search-context elements: rank badge, AI top pick, Deals/Select/+Trip.
 */
import React from 'react'
import { motion } from 'framer-motion'
import { Plane, BadgeCheck, Plus, ArrowUpRight } from 'lucide-react'
import { getAirlineLogo } from '../utils/airlineLogoUtils'

interface FlightSegment {
    airline: { code: string; name: string; flight_number: string }
    origin: { airport_code: string; airport_name: string; city_code: string; city_name: string; departure_time: string }
    destination: { airport_code: string; airport_name: string; city_code: string; city_name: string; arrival_time: string }
    duration: { minutes: number; formatted: string }
}

export interface FlightResultData {
    reference_id: string
    total_price: string | number
    stop_count: number
    is_refundable: boolean
    journey_type: number
    total_duration: number
    formatted_duration: string
    segments: FlightSegment[]
    departure_date: string
    return_date: string | null
    rimigo_price?: string
    recommendation_reasons?: string[]
    best_offer?: {
        provider: string
        price: number
        currency?: string
        affiliate_url?: string | null
        is_rimigo?: boolean
        provider_logo_url?: string | null
    }
    price_comparison?: Array<{
        provider: string
        price: number
        currency?: string
        affiliate_url?: string | null
        is_rimigo?: boolean
        provider_logo_url?: string | null
    }>
    scores?: { price_score: number; duration_score: number; final_score: number }
}

interface FlightResultCardProps {
    flight: FlightResultData
    rank?: number
    showRank?: boolean
    showHighlights?: boolean
    showActions?: boolean
    onSelect?: () => void
    onDeals?: () => void
    onAddToTrip?: () => void
    onClick?: () => void
}

const RIMIGO_LOGO_URL = '/icons/logo-transparent-indigo.png'

const formatAmount = (value?: string | number) => {
    if (value == null || value === '') return '--'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (!Number.isFinite(num)) return '--'
    return `₹${Math.round(num).toLocaleString('en-IN')}`
}

const formatTime = (value?: string) => {
    if (!value) return '--:--'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '--:--'
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
}

const formatDate = (value?: string) => {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const formatDurationMinutes = (minutes?: number) => {
    const value = Number(minutes || 0)
    if (!Number.isFinite(value) || value <= 0) return '--'
    const hrs = Math.floor(value / 60)
    const mins = value % 60
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

const toIsoDay = (value?: string | null) => {
    if (!value) return null
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString().split('T')[0]
}

function getJourneyLegs(flight: FlightResultData) {
    const segments = flight.segments || []
    const first = segments[0]
    const last = segments[segments.length - 1]
    const startsAndEndsSameAirport =
        !!first?.origin?.airport_code &&
        !!last?.destination?.airport_code &&
        first.origin.airport_code === last.destination.airport_code
    const depDay = toIsoDay(first?.origin?.departure_time)
    const arrDay = toIsoDay(last?.destination?.arrival_time)
    const spansMultipleDays = !!depDay && !!arrDay && depDay !== arrDay

    const likelyRoundTrip =
        Number(flight.journey_type) === 2 ||
        !!flight.return_date ||
        (segments.length > 1 && startsAndEndsSameAirport && spansMultipleDays)

    if (!likelyRoundTrip || segments.length <= 1) {
        return { outbound: segments, inbound: [] as typeof segments, isRoundTrip: false }
    }

    const returnIso = toIsoDay(flight.return_date || undefined)
    if (returnIso) {
        const outboundByReturnDate = segments.filter((s) => {
            const d = toIsoDay(s.origin?.departure_time)
            return !!d && d < returnIso
        })
        const inboundByReturnDate = segments.filter((s) => {
            const d = toIsoDay(s.origin?.departure_time)
            return !!d && d >= returnIso
        })
        if (outboundByReturnDate.length > 0 && inboundByReturnDate.length > 0) {
            return { outbound: outboundByReturnDate, inbound: inboundByReturnDate, isRoundTrip: true }
        }
    }

    let splitIndex = -1
    let maxGapMinutes = -1
    for (let i = 0; i < segments.length - 1; i += 1) {
        const currentArrival = new Date(segments[i]?.destination?.arrival_time || '')
        const nextDeparture = new Date(segments[i + 1]?.origin?.departure_time || '')
        if (Number.isNaN(currentArrival.getTime()) || Number.isNaN(nextDeparture.getTime())) continue
        const gapMinutes = (nextDeparture.getTime() - currentArrival.getTime()) / (1000 * 60)
        if (gapMinutes > maxGapMinutes) {
            maxGapMinutes = gapMinutes
            splitIndex = i
        }
    }
    if (splitIndex >= 0 && splitIndex < segments.length - 1 && maxGapMinutes >= 180) {
        return {
            outbound: segments.slice(0, splitIndex + 1),
            inbound: segments.slice(splitIndex + 1),
            isRoundTrip: true
        }
    }

    return { outbound: segments, inbound: [] as typeof segments, isRoundTrip: false }
}

function getLegSummary(segments: FlightSegment[]) {
    if (!segments || segments.length === 0) {
        return { first: undefined, last: undefined, durationMinutes: 0, durationLabel: '--', stops: 0, stopsLabel: 'Direct' }
    }
    const first = segments[0]
    const last = segments[segments.length - 1]
    const durationMinutes = segments.reduce((sum, s) => sum + Number(s.duration?.minutes || 0), 0)
    const stops = Math.max(0, segments.length - 1)
    return {
        first,
        last,
        durationMinutes,
        durationLabel: formatDurationMinutes(durationMinutes),
        stops,
        stopsLabel: stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`
    }
}

function getProviderLogo(offer?: { provider?: string; provider_logo_url?: string | null; affiliate_url?: string | null; is_rimigo?: boolean } | null) {
    if (!offer) return null
    if (offer.is_rimigo || (offer.provider || '').toLowerCase() === 'rimigo') return RIMIGO_LOGO_URL
    if (offer.provider_logo_url) return offer.provider_logo_url
    if (!offer.affiliate_url) return null
    try {
        const host = new URL(offer.affiliate_url).hostname.replace(/^www\./, '')
        if (!host) return null
        return `https://www.google.com/s2/favicons?domain=${host}&sz=64`
    } catch {
        return null
    }
}

const LegTimeline: React.FC<{ segments: FlightSegment[]; durationLabel: string }> = ({ segments, durationLabel }) => {
    const stops = Math.max(0, (segments || []).length - 1)
    const layoverLabel = stops === 0 ? 'Direct' : stops === 1 ? '1 stop' : `${stops} stops`
    return (
        <div className="flex flex-col items-center w-full">
            <p className="font-manrope text-[11px] font-semibold text-grey-1 tabular-nums">{durationLabel}</p>
            <div className="relative w-full mt-1.5 mb-1">
                <div className="h-px bg-grey-3" />
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-default" />
                {stops > 0 && (
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-default" />
                )}
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-default" />
                <Plane className="absolute right-0 -top-[7px] w-3.5 h-3.5 text-grey-2" />
            </div>
            <p className={`font-manrope text-[11px] ${stops > 0 ? 'text-primary-default font-semibold' : 'text-grey-3'}`}>{layoverLabel}</p>
        </div>
    )
}

const FlightLegRow: React.FC<{
    segments: FlightSegment[]
    legLabel?: string
}> = ({ segments, legLabel }) => {
    const leg = getLegSummary(segments)
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] items-center gap-2 md:gap-4">
            <div className="min-w-0">
                {legLabel && (
                    <p className="font-manrope text-[10px] font-semibold uppercase tracking-wide text-grey-3">{legLabel}</p>
                )}
                <p className="font-red-hat-display text-[15px] md:text-lg font-bold text-grey-0 tabular-nums leading-tight">
                    {formatTime(leg.first?.origin?.departure_time)}
                </p>
                <p className="font-manrope text-[11px] text-grey-2 mt-0.5 truncate">
                    {formatDate(leg.first?.origin?.departure_time)} · {leg.first?.origin?.airport_code}
                </p>
            </div>
            <LegTimeline segments={segments} durationLabel={leg.durationLabel} />
            <div className="min-w-0 text-right">
                {legLabel && <p className="font-manrope text-[10px] font-semibold uppercase tracking-wide text-grey-3 invisible">-</p>}
                <p className="font-red-hat-display text-[15px] md:text-lg font-bold text-grey-0 tabular-nums leading-tight">
                    {formatTime(leg.last?.destination?.arrival_time)}
                </p>
                <p className="font-manrope text-[11px] text-grey-2 mt-0.5 truncate">
                    {formatDate(leg.last?.destination?.arrival_time)} · {leg.last?.destination?.airport_code}
                </p>
            </div>
        </div>
    )
}

const FlightResultCard: React.FC<FlightResultCardProps> = ({
    flight,
    rank,
    showRank = false,
    showHighlights = false,
    showActions = false,
    onSelect,
    onDeals,
    onAddToTrip,
    onClick
}) => {
    const { outbound, inbound, isRoundTrip } = getJourneyLegs(flight)
    const outboundLeg = getLegSummary(outbound)
    const bestOffer = flight.best_offer
    const comparison = (flight.price_comparison || []).filter((o) => Number.isFinite(Number(o.price)))
    const dealCount = comparison.filter((o) => !o.is_rimigo && !!o.affiliate_url).length
    const rowOffer =
        comparison.find((o) => !o.is_rimigo && !!o.affiliate_url) ||
        comparison.find((o) => !o.is_rimigo) ||
        comparison[0] ||
        bestOffer
    const displayPrice = rowOffer?.price ?? flight.rimigo_price ?? flight.total_price
    const routeLabel = `${outboundLeg.first?.origin?.airport_code || '--'} → ${outboundLeg.last?.destination?.airport_code || '--'}`
    const airlineCode = outboundLeg.first?.airline?.code || ''
    const airlineName = outboundLeg.first?.airline?.name || airlineCode || 'Airline'
    const providerLogo = getProviderLogo(rowOffer)
    const reasonBullets = (flight.recommendation_reasons || [])
        .map((r) => r.replace(/\s+/g, ' ').replace(/^[-•]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 2)

    const isTopPick = showRank && rank === 1

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={onClick}
            className="group rounded-2xl border border-grey-4 bg-white hover:border-primary-default/30 hover:shadow-[0_4px_16px_rgba(17,24,39,0.05)] transition-all cursor-pointer overflow-hidden">
            {/* Row 1 — Header: carrier + route on left, price on right (mobile + desktop) */}
            <div className="grid grid-cols-[1fr_auto] gap-3 items-start px-3 md:px-5 pt-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-grey-4 bg-white flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                            src={getAirlineLogo(airlineCode)}
                            alt={airlineName}
                            className="w-7 h-7 md:w-8 md:h-8 object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none'
                            }}
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <p className="font-red-hat-display text-[14px] md:text-base font-bold text-grey-0 truncate">{routeLabel}</p>
                            <span className="font-manrope text-[11px] text-grey-2 shrink-0">· {outboundLeg.stopsLabel}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                            <span className="font-manrope text-[12px] text-grey-1 truncate">{airlineName}</span>
                            {showRank && rank !== undefined && (
                                isTopPick ? (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-default/10 pl-1 pr-1.5 py-0 whitespace-nowrap shrink-0">
                                        <BadgeCheck className="w-2.5 h-2.5 text-primary-default" />
                                        <span className="font-red-hat-display text-[10px] font-semibold text-primary-default">Top pick</span>
                                    </span>
                                ) : (
                                    <span className="font-red-hat-display text-[11px] font-bold text-grey-2 tabular-nums shrink-0">· #{rank}</span>
                                )
                            )}
                            {flight.is_refundable && (
                                <span className="hidden md:inline font-manrope text-[11px] text-grey-3 shrink-0">· Refundable</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                    {dealCount > 0 && (
                        <span className="inline-flex h-4 items-center rounded-full bg-secondary-green/10 px-1.5 font-manrope text-[9px] font-bold text-secondary-green uppercase tracking-wide">
                            Best price
                        </span>
                    )}
                    <p className="mt-0.5 font-red-hat-display text-[18px] md:text-2xl font-extrabold text-grey-0 tabular-nums leading-none whitespace-nowrap">
                        {formatAmount(displayPrice)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                        {providerLogo ? (
                            <img
                                src={providerLogo}
                                alt={rowOffer?.provider || 'Provider'}
                                className="h-3 w-auto max-w-14 object-contain"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                }}
                            />
                        ) : (
                            <span className="font-manrope text-[11px] text-grey-2 whitespace-nowrap">
                                via {rowOffer?.provider || 'provider'}
                            </span>
                        )}
                    </div>
                    {dealCount > 1 && (
                        <span className="hidden md:inline font-manrope text-[10px] text-grey-3 mt-0.5 whitespace-nowrap">
                            +{dealCount - 1} more deal{dealCount - 1 > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </div>

            {/* Row 2 — Timeline */}
            <div className="px-3 md:px-5 py-2.5">
                {isRoundTrip ? (
                    <div className="space-y-2.5">
                        <FlightLegRow segments={outbound} legLabel="Outbound" />
                        <FlightLegRow segments={inbound} legLabel="Return" />
                    </div>
                ) : (
                    <FlightLegRow segments={outbound} />
                )}
            </div>

            {/* Row 3 — Actions only. Provider info lives in the price column. */}
            {showActions && (
                <div className="px-3 md:px-5 pb-3 pt-2 border-t border-grey-4/60">
                    <div className="grid grid-cols-[1fr_1.3fr_auto] md:flex md:items-center md:justify-end gap-2">
                        {onDeals && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDeals()
                                }}
                                className="h-9 px-3 md:px-4 rounded-md border border-grey-4 bg-white text-grey-1 hover:border-primary-default/30 hover:text-primary-default font-red-hat-display text-[13px] font-semibold transition-colors">
                                Deals
                            </button>
                        )}
                        {onSelect && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onSelect()
                                }}
                                className="inline-flex items-center justify-center gap-1 h-9 px-3 md:px-5 rounded-md bg-primary-default text-white hover:bg-primary-dark font-red-hat-display text-[13px] font-semibold transition-colors">
                                Select
                                <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {onAddToTrip && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onAddToTrip()
                                }}
                                aria-label="Shortlist"
                                title="Shortlist"
                                className="inline-flex items-center justify-center gap-1 h-9 px-3 md:px-3.5 rounded-md border border-grey-4 bg-white text-primary-default hover:bg-primary-default/5 font-red-hat-display text-[13px] font-semibold transition-colors">
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Trip</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Highlights — first-rank curation blurb */}
            {showHighlights && reasonBullets.length > 0 && (
                <div className="bg-primary-default/5 border-t border-primary-default/15 px-3 md:px-5 py-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <img src="/illustrations/wand.png" alt="" className="w-3.5 h-3.5" />
                        <span className="font-red-hat-display text-xs font-semibold text-primary-default">
                            Highlights we curated for you
                        </span>
                    </div>
                    <p className="font-manrope text-[12px] text-grey-1 leading-relaxed line-clamp-2">
                        {reasonBullets.join(' · ')}
                    </p>
                </div>
            )}
        </motion.div>
    )
}

export default FlightResultCard
