import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Heart, Loader, Sparkles } from 'lucide-react'
import { getAirlineLogo } from '@/pages/Flights/utils/airlineLogoUtils'
import type { ExploreFlight } from './FlightExploreView'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// Resolve a provider logo for a flight offer: prefer Kayak's own logo, else
// fall back to a Google favicon derived from the offer's affiliate URL host.
const resolveOfferLogo = (offer?: { provider_logo_url?: string | null; affiliate_url?: string | null } | null): string | null => {
    if (!offer) return null
    if (offer.provider_logo_url) return offer.provider_logo_url
    if (!offer.affiliate_url) return null
    try {
        const host = new URL(offer.affiliate_url).hostname.replace(/^www\./, '')
        return host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : null
    } catch {
        return null
    }
}

interface TripboardFlightCardProps {
    flight: ExploreFlight
    /** True if this exact flight (entity_id) is already saved on the active leg. */
    alreadyShortlisted: boolean
    /** Pending shortlist mutation for this row. */
    isShortlisting: boolean
    onShortlist: () => void
    onOpenAffiliate: () => void
    /** True iff this flight already has a corresponding slot on the trip
     *  itinerary. Flips the CTA from "Add to Itinerary" → "In your Itinerary"
     *  badge that re-opens the modal in edit mode. */
    isInItinerary?: boolean
    /** When supplied, surfaces the "Add to Itinerary" CTA. Omitted in
     *  read-only views or pre-trip states. */
    onAddToItinerary?: () => void
    /** When the active leg already has a flight on the itinerary, the
     *  result cards reframe their CTA as a swap into the itinerary,
     *  matching the AnchorFlightCard context above. */
    hasItineraryFlightOnLeg?: boolean
}

const formatAmount = (value?: string | number) => {
    if (value == null || value === '') return '--'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (!Number.isFinite(num)) return '--'
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

const formatTime = (iso?: string) => {
    if (!iso) return '--'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '--'
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
}

const formatDate = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const getStopsLabel = (count: number) => {
    if (count === 0) return 'Direct'
    if (count === 1) return '1 stop'
    return `${count} stops`
}

const formatLegDuration = (minutes: number): string => {
    if (!Number.isFinite(minutes) || minutes <= 0) return '--'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

interface SegmentLike {
    airline?: { code?: string; name?: string; flight_number?: string }
    origin?: { airport_code?: string; departure_time?: string }
    destination?: { airport_code?: string; arrival_time?: string }
    duration?: { minutes?: number }
}

/**
 * Find the largest arrival→next-departure gap and split there if it exceeds
 * 18 hours — that's the destination stay between an outbound and return leg.
 * Anything <18h is treated as a real layover and stays inside the same leg.
 */
function splitSegmentsByGap(segments: SegmentLike[]): {
    outbound: SegmentLike[]
    inbound: SegmentLike[]
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

interface LegStats {
    departureTime?: string
    arrivalTime?: string
    departureCode?: string
    arrivalCode?: string
    durationMinutes: number
    stopsCount: number
    stopCodes: string[]
}

function computeLegStats(segments: SegmentLike[]): LegStats {
    if (!segments || segments.length === 0) {
        return { durationMinutes: 0, stopsCount: 0, stopCodes: [] }
    }
    const first = segments[0]
    const last = segments[segments.length - 1]
    const dep = new Date(first.origin?.departure_time || '').getTime()
    const arr = new Date(last.destination?.arrival_time || '').getTime()
    const durationMinutes = Number.isFinite(dep) && Number.isFinite(arr) ? Math.max(0, Math.round((arr - dep) / 60000)) : 0
    const stopCodes = segments
        .slice(0, -1)
        .map((s) => s.destination?.airport_code)
        .filter((c): c is string => !!c)
    return {
        departureTime: first.origin?.departure_time,
        arrivalTime: last.destination?.arrival_time,
        departureCode: first.origin?.airport_code,
        arrivalCode: last.destination?.airport_code,
        durationMinutes,
        stopsCount: Math.max(0, segments.length - 1),
        stopCodes
    }
}

interface FlightTimeRailProps {
    stats: LegStats
    label?: string
    compactPaddingY?: string
}

const FlightTimeRail: React.FC<FlightTimeRailProps> = ({ stats, label, compactPaddingY = '' }) => {
    const stopsLabel = getStopsLabel(stats.stopsCount)
    const stopsSuffix = stats.stopsCount > 0 && stats.stopCodes.length > 0 ? ` · ${stats.stopCodes.join(' · ')}` : ''
    return (
        <div className={compactPaddingY}>
            {label && (
                <div className="flex items-center justify-between mb-1.5">
                    <span className="font-manrope text-[10px] font-bold uppercase tracking-wider text-grey-2">{label}</span>
                    <span className="font-manrope text-[11px] text-grey-2">{formatDate(stats.departureTime)}</span>
                </div>
            )}
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <div className="min-w-0">
                    <p className="font-red-hat-display text-lg font-extrabold text-grey-0 leading-tight">{formatTime(stats.departureTime)}</p>
                    <p className="font-manrope text-[11px] text-grey-2 mt-0.5">
                        {formatDate(stats.departureTime)}
                        {stats.departureCode ? ` · ${stats.departureCode}` : ''}
                    </p>
                </div>
                <div className="flex flex-col items-center w-full max-w-72 mx-auto">
                    <p className="font-manrope text-[11px] font-semibold text-grey-2">{formatLegDuration(stats.durationMinutes)}</p>
                    <div className="w-full flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 rounded-full bg-primary-default" />
                        <div className="h-px flex-1 bg-grey-3" />
                        <span className="w-2 h-2 rounded-full bg-primary-default" />
                    </div>
                    <p className="font-manrope text-[11px] text-grey-3 mt-1">
                        {stopsLabel}
                        {stopsSuffix}
                    </p>
                </div>
                <div className="min-w-0 text-right">
                    <p className="font-red-hat-display text-lg font-extrabold text-grey-0 leading-tight">{formatTime(stats.arrivalTime)}</p>
                    <p className="font-manrope text-[11px] text-grey-2 mt-0.5">
                        {formatDate(stats.arrivalTime)}
                        {stats.arrivalCode ? ` · ${stats.arrivalCode}` : ''}
                    </p>
                </div>
            </div>
        </div>
    )
}

const TripboardFlightCard: React.FC<TripboardFlightCardProps> = ({
    flight,
    alreadyShortlisted,
    isShortlisting,
    onShortlist,
    onOpenAffiliate,
    isInItinerary = false,
    onAddToItinerary,
    hasItineraryFlightOnLeg = false
}) => {
    const segments = flight.segments || []
    const firstSeg = segments[0]
    const lastSeg = segments[segments.length - 1]
    const airlineCode = firstSeg?.airline?.code || ''
    const airlineName = firstSeg?.airline?.name || 'Airline'
    const flightNumber = firstSeg?.airline?.flight_number || ''
    const flightCode = airlineCode && flightNumber ? `${airlineCode} ${flightNumber}` : ''

    const offers = (flight.price_comparison || []).filter((o) => Number.isFinite(Number(o.price)))
    const sortedOffers = [...offers].sort((a, b) => (a.price || 0) - (b.price || 0))
    const cheapestOffer = sortedOffers[0] || flight.best_offer || null
    const moreDealsCount = Math.max(0, sortedOffers.length - 1)

    const cheapestPrice =
        cheapestOffer && 'price' in cheapestOffer && cheapestOffer.price != null ? Number(cheapestOffer.price) : Number(flight.total_price)

    const providerName =
        cheapestOffer && 'provider' in cheapestOffer && cheapestOffer.provider ? cheapestOffer.provider : flight.best_offer?.provider || ''

    const providerLogoUrl = resolveOfferLogo(
        cheapestOffer && 'affiliate_url' in cheapestOffer
            ? (cheapestOffer as { provider?: string | null; provider_logo_url?: string | null; affiliate_url?: string | null })
            : flight.best_offer
    )

    const isRoundTripFlag = Number(flight.journey_type) === 2 || !!flight.return_date || !!flight.return_date
    const splitResult = splitSegmentsByGap(segments)
    const isRoundTrip = splitResult.isRoundTrip || (isRoundTripFlag && splitResult.outbound.length > 0 && splitResult.inbound.length > 0)
    const outboundSegs = splitResult.outbound
    const inboundSegs = splitResult.inbound
    const outboundStats = computeLegStats(outboundSegs)
    const inboundStats = computeLegStats(inboundSegs)

    // Header route: for round-trip, the "trip destination" is where outbound lands.
    const headerFromCode = firstSeg?.origin?.airport_code
    const headerToCode = isRoundTrip ? outboundStats.arrivalCode : lastSeg?.destination?.airport_code
    const headerArrow = isRoundTrip ? '⇄' : '→'

    const [airlineLogoErrored, setAirlineLogoErrored] = useState(false)
    const [providerLogoErrored, setProviderLogoErrored] = useState(false)
    const [dealsExpanded, setDealsExpanded] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-2xl border bg-white transition-colors overflow-hidden ${
                isInItinerary
                    ? 'border-secondary-green/40 shadow-[0px_2px_8px_0px_rgba(0,168,120,0.18)] hover:border-secondary-green/60'
                    : 'border-[#dfdde0] shadow-[0px_2px_8px_0px_#dfdde0] hover:border-grey-0'
            }`}>
            <div className="p-4">
                {/* Row 1: Airline + route on the left, "Add to Itinerary"
                    text + Heart icon on the right. Mirrors the stays card
                    pattern. */}
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {!airlineLogoErrored && airlineCode ? (
                            <img
                                src={getAirlineLogo(airlineCode)}
                                alt={airlineName}
                                className="w-9 h-9 rounded-lg object-contain border border-grey-4 bg-white p-0.5 shrink-0"
                                onError={() => setAirlineLogoErrored(true)}
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-lg border border-grey-4 bg-grey-5 grid place-items-center shrink-0">
                                <span className="font-red-hat-display text-[11px] font-extrabold text-grey-1 tracking-tight">
                                    {airlineCode || '✈'}
                                </span>
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="font-red-hat-display text-[15px] font-bold text-grey-0 truncate">
                                    {headerFromCode} {headerArrow} {headerToCode}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-manrope text-xs text-grey-2 truncate">{airlineName}</span>
                                {flightCode && <span className="font-manrope text-[11px] font-semibold text-grey-1">· {flightCode}</span>}
                                {flight.is_refundable && <span className="font-manrope text-[10px] text-grey-3">· Refundable</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {onAddToItinerary &&
                            // Static label when already on the itinerary — clicking again
                            // shouldn't reopen the picker. Removal goes through the Heart
                            // toggle or the Budget tab.
                            (isInItinerary ? (
                                <span
                                    className="font-red-hat-display text-[14px] font-bold tracking-[-0.24px] leading-4 whitespace-nowrap shrink-0"
                                    style={{ color: '#00A878' }}>
                                    In your Itinerary
                                </span>
                            ) : (
                                // "Refined classic" tooltip (Variant 01 from
                                // the design canvas): white bubble, hairline
                                // border, soft layered shadow, custom
                                // rotated-square arrow. The whole CTA cluster
                                // (button + via-AI caption) is one hover
                                // target with a 400ms delay so the tooltip
                                // doesn't fire on idle mouse traversal.
                                <Tooltip delayDuration={400}>
                                    <TooltipTrigger asChild>
                                        <div className="flex flex-col items-end gap-[2px] cursor-pointer">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onAddToItinerary()
                                                }}
                                                className="font-red-hat-display text-[14px] font-bold tracking-[-0.24px] leading-4 whitespace-nowrap shrink-0 cursor-pointer focus:outline-none transition-colors"
                                                style={{ color: '#7011F6' }}>
                                                {hasItineraryFlightOnLeg ? '+ Swap into itinerary' : 'Add to Itinerary'}
                                            </button>
                                            <span
                                                className="inline-flex items-center gap-1 font-manrope text-[10px] font-semibold whitespace-nowrap select-none pointer-events-none"
                                                style={{
                                                    color: 'rgba(112, 17, 246, 0.62)',
                                                    letterSpacing: '0.01em'
                                                }}
                                                aria-hidden>
                                                <Sparkles
                                                    className="w-[10px] h-[10px]"
                                                    strokeWidth={2.25}
                                                />
                                                via Rimigo AI
                                            </span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="top"
                                        align="center"
                                        sideOffset={10}
                                        collisionPadding={16}
                                        arrowClassName="hidden"
                                        className="relative w-[248px] !bg-white !text-grey-1 border border-[#dfdde0] !rounded-xl !px-3.5 !py-3 font-manrope !text-[13px] !leading-[19px] !font-medium tracking-[-0.005em] [text-wrap:pretty] !shadow-[0_6px_20px_rgba(16,16,16,0.08),0_1px_2px_rgba(16,16,16,0.04)] after:content-[''] after:absolute after:-bottom-[6px] after:left-1/2 after:-translate-x-1/2 after:w-2.5 after:h-2.5 after:rotate-45 after:bg-white after:border-r after:border-b after:border-[#dfdde0] after:rounded-br-[2px]">
                                        Goes via your assistant — keeps your itinerary{' '}
                                        <em className="not-italic font-semibold text-grey-0">uncluttered</em> and flight times in sync with the rest
                                        of your day.
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        <button
                            type="button"
                            disabled={isShortlisting}
                            onClick={(e) => {
                                e.stopPropagation()
                                onShortlist()
                            }}
                            aria-label={alreadyShortlisted ? 'Remove from shortlist' : 'Save to shortlist'}
                            aria-pressed={alreadyShortlisted}
                            title={alreadyShortlisted ? 'Remove from shortlist' : 'Save to shortlist'}
                            className={`group grid place-items-center h-7 w-7 rounded-full bg-white border shrink-0 transition-colors cursor-pointer ${
                                alreadyShortlisted
                                    ? 'border-grey-4 hover:border-red-300 hover:bg-red-50'
                                    : 'border-grey-4 hover:border-primary-default hover:bg-primary-default/5'
                            } disabled:cursor-not-allowed ${isShortlisting ? 'animate-pulse' : ''}`}>
                            {isShortlisting ? (
                                <Loader className="w-3.5 h-3.5 text-grey-2 animate-spin" />
                            ) : (
                                <Heart
                                    className={`w-3.5 h-3.5 transition-colors ${
                                        alreadyShortlisted
                                            ? 'text-primary-default fill-primary-default group-hover:text-red-500 group-hover:fill-red-500'
                                            : 'text-grey-2'
                                    }`}
                                />
                            )}
                        </button>
                    </div>
                </div>

                {/* Row 2: Timeline (two rails for round-trip, one for one-way) */}
                {isRoundTrip ? (
                    <div className="flex flex-col gap-2.5 py-2">
                        <FlightTimeRail
                            label="Outbound"
                            stats={outboundStats}
                        />
                        <div className="h-px bg-grey-4/60" />
                        <FlightTimeRail
                            label="Return"
                            stats={inboundStats}
                        />
                    </div>
                ) : (
                    <FlightTimeRail
                        stats={outboundStats}
                        compactPaddingY="py-3"
                    />
                )}

                {/* Row 3: divider + price/provider | deals link + Book */}
                <div className="flex items-start justify-between pt-3 border-t border-grey-4/60 gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <p className="font-red-hat-display text-xl font-extrabold text-grey-0 shrink-0">{formatAmount(cheapestPrice)}</p>
                            {providerLogoUrl && !providerLogoErrored ? (
                                <img
                                    src={providerLogoUrl}
                                    alt={providerName}
                                    className="h-7 w-auto max-w-36 object-contain shrink-0"
                                    onError={() => setProviderLogoErrored(true)}
                                />
                            ) : providerName ? (
                                <span className="font-manrope text-[11px] text-grey-2 shrink-0">via {providerName}</span>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {moreDealsCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setDealsExpanded((prev) => !prev)}
                                className="font-manrope text-[11px] font-semibold text-grey-2 hover:text-primary-default transition-colors cursor-pointer">
                                {dealsExpanded ? 'Hide deals' : `${moreDealsCount} more deal${moreDealsCount > 1 ? 's' : ''} →`}
                            </button>
                        )}
                        {cheapestOffer && 'affiliate_url' in cheapestOffer && cheapestOffer.affiliate_url ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onOpenAffiliate()
                                }}
                                className="flex items-center gap-1.5 rounded-xl bg-primary-pale-purple px-4 py-2 font-manrope text-[13px] font-bold text-primary-default hover:bg-primary-default hover:text-white transition-colors">
                                Book
                                <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                        ) : null}
                    </div>
                </div>

                {dealsExpanded && sortedOffers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                        {sortedOffers.map((deal, idx) => (
                            <ExploreDealChip
                                key={`${deal.provider}-${idx}`}
                                deal={deal}
                                isHighlighted={idx === 0}
                            />
                        ))}
                    </motion.div>
                )}
            </div>
        </motion.div>
    )
}

interface ExploreDealChipProps {
    deal: NonNullable<ExploreFlight['price_comparison']>[number]
    isHighlighted: boolean
}

/** Single-row deal in the expanded provider list on the Explore card.
 *  Shows the provider logo when one is resolvable (API value, or a Google
 *  favicon derived from the affiliate URL), otherwise falls back to the
 *  provider name as text — never both, so the chip stays compact. */
const ExploreDealChip: React.FC<ExploreDealChipProps> = ({ deal, isHighlighted }) => {
    const dealLogoUrl = resolveOfferLogo(deal)
    const [logoErrored, setLogoErrored] = useState(false)
    const showLogo = !!dealLogoUrl && !logoErrored
    return (
        <a
            href={deal.affiliate_url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center justify-between py-2 px-3 rounded-xl border transition-colors ${
                isHighlighted
                    ? 'border-secondary-green/30 bg-secondary-green/5 hover:bg-secondary-green/10'
                    : 'border-grey-4 hover:border-primary-default/30 hover:bg-grey-5/50'
            } ${deal.affiliate_url ? 'cursor-pointer' : 'cursor-default opacity-60'}`}>
            <div className="flex items-center gap-2 min-w-0">
                {showLogo ? (
                    <img
                        src={dealLogoUrl!}
                        alt={deal.provider}
                        className="h-6 w-auto max-w-32 object-contain shrink-0"
                        onError={() => setLogoErrored(true)}
                    />
                ) : (
                    <span className="font-manrope text-sm font-medium text-grey-0 truncate">{deal.provider}</span>
                )}
                {isHighlighted && (
                    <span className="rounded-full bg-secondary-green/10 px-1.5 py-px font-manrope text-[8px] font-bold text-secondary-green uppercase shrink-0">
                        Cheapest
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-red-hat-display text-sm font-bold text-grey-0">{formatAmount(deal.price)}</span>
                {deal.affiliate_url && <ArrowUpRight className="w-3.5 h-3.5 text-grey-2" />}
            </div>
        </a>
    )
}

export default TripboardFlightCard
