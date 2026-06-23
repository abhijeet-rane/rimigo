import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Check, Loader2 } from 'lucide-react'
import { getAirlineLogo } from '@/pages/Flights/utils/airlineLogoUtils'
import type { FlightLeg } from '../../api/travelerCollectionApi'
import type { AnchorFlightSection, AnchorLivePriceData } from '../FlightsTab'

interface DealOffer {
    provider?: string
    price?: number
    currency?: string
    affiliate_url?: string | null
    provider_logo_url?: string | null
}

const formatPrice = (value?: number | string | null): string => {
    if (value == null || value === '') return '--'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (!Number.isFinite(num)) return '--'
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

const DealChip: React.FC<{
    deal: DealOffer
    isHighlighted: boolean
    onClick?: () => void
}> = ({ deal, isHighlighted, onClick }) => {
    const dealLogoUrl = resolveOfferLogo(deal)
    const [logoErrored, setLogoErrored] = useState(false)
    const showLogo = !!dealLogoUrl && !logoErrored
    return (
        <a
            href={deal.affiliate_url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
                e.stopPropagation()
                onClick?.()
            }}
            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors ${
                isHighlighted
                    ? 'border-secondary-green/30 bg-secondary-green/5 hover:bg-secondary-green/10'
                    : 'border-grey-4 hover:border-primary-default/30 hover:bg-grey-5/50'
            } ${deal.affiliate_url ? 'cursor-pointer' : 'cursor-default opacity-60'}`}>
            <div className="flex min-w-0 items-center gap-2">
                {showLogo ? (
                    <img
                        src={dealLogoUrl!}
                        alt={deal.provider || ''}
                        className="h-6 w-auto max-w-32 shrink-0 object-contain"
                        onError={() => setLogoErrored(true)}
                    />
                ) : (
                    <span className="truncate font-manrope text-sm font-medium text-grey-0">{deal.provider}</span>
                )}
                {isHighlighted && (
                    <span className="shrink-0 rounded-full bg-secondary-green/10 px-1.5 py-px font-manrope text-[8px] font-bold uppercase text-secondary-green">
                        Cheapest
                    </span>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
                <span className="font-red-hat-display text-sm font-bold text-grey-0">{formatPrice(deal.price)}</span>
                {deal.affiliate_url && <ArrowUpRight className="h-3.5 w-3.5 text-grey-2" />}
            </div>
        </a>
    )
}

interface AnchorFlightCardProps {
    section: AnchorFlightSection
    leg: FlightLeg
    /** Optional live-price data injected by the parent. Drives the
     *  "+ N more deals" affordance and live provider/price overrides. */
    livePriceData?: AnchorLivePriceData
    /** No-arg action — the parent decides where Book lands. The persisted
     *  affiliate_url on the section is stale within hours, so the click
     *  triggers a live Explore search and opens the freshest match. */
    onBook?: () => void
    /** Renders a small spinner in the Book button while the parent is
     *  waiting for live results to resolve the matching offer. The button
     *  becomes non-interactive while pending. */
    isBookPending?: boolean
    /** Fires before the local expand/collapse state flips. Receives the
     *  state the toggle is moving INTO (true = expanding, false = collapsing). */
    onToggleDeals?: (expanded: boolean) => void
    /** Fires when a provider row in the expanded deals grid is clicked.
     *  The chip continues to open its affiliate URL itself; this is for
     *  analytics only. */
    onDealClick?: (deal: { provider?: string; price?: number; affiliate_url?: string | null; isCheapest: boolean }) => void
}

const LEG_KIND_HUMAN: Record<FlightLeg['kind'], string> = {
    outbound: 'Outbound',
    inter_city: 'Inter-city',
    return: 'Return',
    round_trip: 'Outbound'
}

const formatAmount = (value?: string | number | null) => {
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

// "Thu 25 Jun" — weekday-short + day + month-short. The design hero card
// repeats this format for departure and arrival meta-lines.
const formatLongDate = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const wd = d.toLocaleDateString('en-IN', { weekday: 'short' })
    const day = d.getDate()
    const mon = d.toLocaleDateString('en-IN', { month: 'short' })
    return `${wd} ${day} ${mon}`
}

const formatDuration = (minutes: number, fallback?: string): string => {
    if (fallback && fallback.trim()) return fallback
    if (!Number.isFinite(minutes) || minutes <= 0) return '--'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// Filter out null / undefined / empty-string / 'N/A' (case-insensitive)
// so optional segment metadata (cabin, aircraft, baggage, terminal) only
// renders a chip when meaningfully populated.
const hasMeaningfulValue = (v: unknown): boolean => {
    if (v == null) return false
    if (typeof v !== 'string') return false
    const trimmed = v.trim()
    if (!trimmed) return false
    return trimmed.toLowerCase() !== 'n/a'
}

// True when the section carries at least one substantive flight signal
// (airline, departure/arrival time, duration, price). When false, the
// card would render as a row of dashes — better to hide it entirely and
// let "Explore other options" take the foreground. Reads both nested
// (`segments[]`) and flat (`metadata.airline_code`, …) shapes — same
// resolution chain as the body.
export const hasAnchorFlightSignal = (section: AnchorFlightSection): boolean => {
    const metadata = section.metadata
    const firstSeg = metadata.segments?.[0]
    const airlineName = firstSeg?.airline?.name || metadata.airline
    const airlineCode = firstSeg?.airline?.code || metadata.airline_code
    const departureTime = firstSeg?.origin?.departure_time || metadata.departure_time
    const arrivalTime = firstSeg?.destination?.arrival_time || metadata.arrival_time
    const durationMinutes = Number(metadata.total_duration ?? metadata.duration_minutes ?? 0)
    const hasPrice = metadata.best_offer?.price != null || metadata.total_price != null || metadata.price != null
    return Boolean(airlineName || airlineCode || departureTime || arrivalTime || durationMinutes > 0 || hasPrice)
}

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

const AnchorFlightCard: React.FC<AnchorFlightCardProps> = ({
    section,
    leg,
    livePriceData,
    onBook,
    isBookPending = false,
    onToggleDeals,
    onDealClick
}) => {
    // Empty / placeholder sections (no airline, no times, no duration, no
    // price) render as a row of dashes — suppress entirely so the explore
    // flow takes over. Mirror gate in FlightsTab skips the wrapper too.
    if (!hasAnchorFlightSignal(section)) return null
    const metadata = section.metadata
    const segments = metadata.segments || []
    const firstSeg = segments[0]
    const lastSeg = segments[segments.length - 1]

    // Two writer dialects in the wild. Sections written by Kayak-search flows
    // expose rich nested `segments[]` with airline/origin/destination. Slots
    // written by the AI agent expose the same data as TOP-LEVEL flat fields
    // (airline, airline_code, origin, departure_time, …). Resolve each field
    // by preferring the nested shape and falling back to the flat shape.
    const airlineCode = firstSeg?.airline?.code || metadata.airline_code || ''
    const airlineName = firstSeg?.airline?.name || metadata.airline || 'Airline'
    const flightNumberRaw = firstSeg?.airline?.flight_number || metadata.flight_number || ''
    // `flight_number` from the flat shape sometimes arrives already prefixed
    // ("TG 326") — split off the code so we don't render "TG TG 326".
    const flightNumber = flightNumberRaw.replace(new RegExp(`^${airlineCode}\\s*`, 'i'), '').trim()
    const flightCode = airlineCode && flightNumber ? `${airlineCode}-${flightNumber}` : airlineCode && flightNumberRaw ? flightNumberRaw : ''
    const flatAirlineLogo = metadata.airline_logo || ''

    const fromIata = firstSeg?.origin?.airport_code || metadata.origin || leg.from || '—'
    const toIata = lastSeg?.destination?.airport_code || metadata.destination || leg.to || '—'
    const fromCity = firstSeg?.origin?.city_name || ''
    const toCity = lastSeg?.destination?.city_name || ''
    const fromAirportName = firstSeg?.origin?.airport_name || ''
    const toAirportName = lastSeg?.destination?.airport_name || ''

    const departureTime = firstSeg?.origin?.departure_time || metadata.departure_time
    const arrivalTime = lastSeg?.destination?.arrival_time || metadata.arrival_time

    const stopCount = Number(metadata.stop_count ?? metadata.stops ?? 0)
    const stopCodes = segments
        .slice(0, -1)
        .map((s) => s.destination?.airport_code)
        .filter((c): c is string => !!c)
    // When segments[] is absent, derive stop codes from `segments_summary`
    // ("BLR → BKK → NRT") so the "1 stop · BKK" label still renders.
    const summaryStopCodes =
        stopCodes.length === 0 && metadata.segments_summary
            ? metadata.segments_summary
                  .split(/→|->/)
                  .map((s) => s.trim())
                  .slice(1, -1)
                  .filter(Boolean)
            : stopCodes
    const stopsLabel =
        stopCount === 0
            ? 'Direct'
            : `${stopCount} stop${stopCount > 1 ? 's' : ''}${summaryStopCodes.length ? ` · ${summaryStopCodes.join(', ')}` : ''}`

    const durationLabel = formatDuration(Number(metadata.total_duration ?? metadata.duration_minutes ?? 0), metadata.formatted_duration)

    const bestOffer = livePriceData?.best_offer || metadata.best_offer
    const displayPrice = bestOffer?.price ?? livePriceData?.total_price ?? metadata.total_price ?? metadata.price
    const providerName = bestOffer?.provider || ''
    const providerLogoUrl = resolveOfferLogo(bestOffer)

    const priceComparison = livePriceData?.price_comparison || metadata.price_comparison || []
    const moreDealsCount = Math.max(0, priceComparison.length - 1)
    const sortedDeals = useMemo<DealOffer[]>(
        () => [...priceComparison].filter((d) => Number.isFinite(Number(d.price))).sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0)),
        [priceComparison]
    )
    const [dealsExpanded, setDealsExpanded] = useState(false)

    const eyebrowDate = formatLongDate(metadata.departure_date || departureTime)

    // Origin / destination meta — terminal appended only when populated.
    const originTerminal = firstSeg?.origin?.terminal
    const destTerminal = lastSeg?.destination?.terminal
    const originAirportLine = [fromAirportName, hasMeaningfulValue(originTerminal) ? `T${originTerminal}` : null].filter(Boolean).join(' · ')
    const destAirportLine = [toAirportName, hasMeaningfulValue(destTerminal) ? `T${destTerminal}` : null].filter(Boolean).join(' · ')

    // Meta strip — only render chips whose data is meaningfully present.
    const cabinLabel = bestOffer?.cabin
    const aircraftLabel = firstSeg?.aircraft || firstSeg?.aircraft_type
    const checkedBaggage = firstSeg?.baggage?.checked_baggage
    const cabinBaggage = firstSeg?.baggage?.cabin_baggage
    const showRefundable = metadata.is_refundable === true
    const showCabin = hasMeaningfulValue(cabinLabel)
    const showAircraft = hasMeaningfulValue(aircraftLabel)
    const showCheckedBaggage = hasMeaningfulValue(checkedBaggage)
    const showCabinBaggage = hasMeaningfulValue(cabinBaggage)
    // hasAnyMeta only counts chips that ACTUALLY render inside the strip.
    // Cabin + aircraft are absorbed into the airline subline above, so they
    // should not gate the meta strip's dashed border + padding.
    const hasAnyMeta = showRefundable || showCheckedBaggage || showCabinBaggage

    const [airlineLogoErrored, setAirlineLogoErrored] = useState(false)
    const [providerLogoErrored, setProviderLogoErrored] = useState(false)

    const affiliateUrl = bestOffer?.affiliate_url || null

    return (
        <section className="w-full">
            <div className="mb-3 flex items-end justify-between gap-3 md:mb-3.5">
                <div>
                    <div className="font-red-hat-display text-[10px] font-extrabold uppercase tracking-[0.08em] text-grey-2 md:text-[11px]">
                        Your {LEG_KIND_HUMAN[leg.kind]} flight
                        <span className="mx-2 inline-block h-1 w-1 rounded-full bg-grey-3 align-middle" />
                        {fromIata} → {toIata}
                        {eyebrowDate ? (
                            <>
                                <span className="mx-2 inline-block h-1 w-1 rounded-full bg-grey-3 align-middle" />
                                {eyebrowDate}
                            </>
                        ) : null}
                    </div>
                    <h2 className="mt-1 font-red-hat-display text-[18px] font-extrabold leading-[1.2] tracking-[-0.02em] text-grey-0 md:mt-1.5 md:text-[22px]">
                        In your itinerary
                    </h2>
                </div>
            </div>

            <article className="relative overflow-hidden rounded-2xl border border-[#dfdde0] bg-white shadow-[0px_2px_8px_0px_#dfdde0]">
                <span
                    className="absolute inset-y-0 left-0 w-1 bg-secondary-green"
                    aria-hidden
                />
                <div className="flex items-center justify-between border-b border-secondary-green/20 bg-secondary-green/[0.08] px-4 py-2.5 md:px-6 md:py-3">
                    <span className="inline-flex items-center gap-2 font-red-hat-display text-[12px] font-bold text-secondary-green-dark md:text-[13px]">
                        <Check
                            className="h-3.5 w-3.5"
                            strokeWidth={2.5}
                        />
                        In your Itinerary
                    </span>
                </div>

                {/* Body: airline + route + times + meta. Single column at all
                    viewports — the price/CTA strip lives in its own footer
                    below so the primary action sits at the bottom of the card
                    (thumb-reach on mobile, visual rhythm on desktop). */}
                <div className="px-4 py-4 md:px-6 md:py-5">
                    <div className="flex items-start gap-3 md:gap-4">
                        {!airlineLogoErrored && (flatAirlineLogo || airlineCode) ? (
                            <img
                                src={flatAirlineLogo || getAirlineLogo(airlineCode)}
                                alt={airlineName}
                                className="h-10 w-10 shrink-0 rounded-[10px] border border-grey-4 bg-white object-contain p-1 md:h-11 md:w-11 md:rounded-xl"
                                onError={() => setAirlineLogoErrored(true)}
                            />
                        ) : (
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#1B186F] md:h-11 md:w-11 md:rounded-xl">
                                <span className="font-red-hat-display text-[12px] font-extrabold tracking-tight text-white md:text-[13px]">
                                    {airlineCode || '✈'}
                                </span>
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:gap-x-2.5">
                                <span className="font-red-hat-display text-[15px] font-bold leading-[1.1] tracking-[-0.01em] text-grey-0 md:text-[18px]">
                                    {fromIata}
                                </span>
                                <span
                                    className="font-red-hat-display text-[15px] font-bold leading-[1.1] tracking-[-0.01em] text-grey-3 md:text-[18px]"
                                    aria-hidden>
                                    →
                                </span>
                                <span className="font-red-hat-display text-[15px] font-bold leading-[1.1] tracking-[-0.01em] text-grey-0 md:text-[18px]">
                                    {toIata}
                                </span>
                            </div>
                            <p className="mt-1 font-manrope text-[11px] font-medium leading-[1.3] text-grey-2 md:text-[13px]">
                                {airlineName}
                                {flightCode ? ` · ${flightCode}` : ''}
                                {showCabin ? ` · ${cabinLabel}` : ''}
                                {showAircraft ? ` · ${aircraftLabel}` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:mt-4 md:gap-6">
                        <div className="min-w-0">
                            <p className="font-red-hat-display text-[20px] font-extrabold leading-none tracking-[-0.02em] text-grey-0 tabular-nums md:text-[26px]">
                                {formatTime(departureTime)}
                            </p>
                            <p className="mt-1.5 font-manrope text-[11px] font-medium leading-[1.3] text-grey-2 md:text-[12px] md:leading-[1.2]">
                                {eyebrowDate}
                                {fromCity ? ` · ${fromCity} (${fromIata})` : fromIata ? ` · ${fromIata}` : ''}
                            </p>
                            {originAirportLine ? (
                                <p className="font-manrope text-[11px] font-medium leading-[1.3] text-grey-2 md:text-[12px] md:leading-[1.2]">
                                    {originAirportLine}
                                </p>
                            ) : null}
                        </div>
                        <div className="flex flex-col items-center gap-1.5 text-grey-2">
                            <span className="font-manrope text-[11px] font-semibold tabular-nums md:text-[12px]">{durationLabel}</span>
                            <div className="flex w-full min-w-12 items-center gap-1 md:min-w-16">
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-default md:h-2 md:w-2" />
                                <div className="h-px flex-1 border-t border-dashed border-grey-4" />
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-default md:h-2 md:w-2" />
                            </div>
                            <span className="font-manrope text-[10px] font-medium text-grey-3 md:text-[11px]">{stopsLabel}</span>
                        </div>
                        <div className="min-w-0 text-right">
                            <p className="font-red-hat-display text-[20px] font-extrabold leading-none tracking-[-0.02em] text-grey-0 tabular-nums md:text-[26px]">
                                {formatTime(arrivalTime)}
                            </p>
                            <p className="mt-1.5 font-manrope text-[11px] font-medium leading-[1.3] text-grey-2 md:text-[12px] md:leading-[1.2]">
                                {formatLongDate(arrivalTime) || eyebrowDate}
                                {toCity ? ` · ${toCity} (${toIata})` : toIata ? ` · ${toIata}` : ''}
                            </p>
                            {destAirportLine ? (
                                <p className="font-manrope text-[11px] font-medium leading-[1.3] text-grey-2 md:text-[12px] md:leading-[1.2]">
                                    {destAirportLine}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {hasAnyMeta ? (
                        <div className="mt-3.5 flex flex-wrap gap-x-3.5 gap-y-1.5 border-t border-dashed border-grey-4 pt-3 font-manrope text-[11px] font-medium leading-[1.4] text-grey-2 md:mt-4 md:gap-x-6 md:gap-y-2 md:pt-4 md:text-[12px]">
                            {showRefundable ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <Check
                                        className="h-3.5 w-3.5 text-grey-3"
                                        strokeWidth={2.25}
                                    />
                                    Refundable fare
                                </span>
                            ) : null}
                            {showCheckedBaggage ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <strong className="font-bold text-grey-1">{checkedBaggage}</strong> check-in
                                </span>
                            ) : null}
                            {showCabinBaggage ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <strong className="font-bold text-grey-1">{cabinBaggage}</strong> cabin
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                {/* Footer: price + provider + deals on the left; heart + Book
                    on the right. Same layout at every viewport — the primary
                    action sits at the bottom of the card (thumb-reach on
                    mobile, visual emphasis on desktop). */}
                <div className="flex items-center justify-between gap-3 border-t border-grey-4 bg-grey-5 px-4 py-3 md:px-6 md:py-4">
                    <div className="min-w-0">
                        <p className="font-red-hat-display text-[20px] font-extrabold leading-none tracking-[-0.02em] text-grey-0 tabular-nums md:text-[24px]">
                            {formatAmount(displayPrice)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                            <span className="font-manrope text-[11px] font-medium text-grey-2 md:text-[12px]">via</span>
                            {providerLogoUrl && !providerLogoErrored ? (
                                <img
                                    src={providerLogoUrl}
                                    alt={providerName}
                                    className="h-4 w-auto max-w-24 object-contain md:h-5 md:max-w-28"
                                    onError={() => setProviderLogoErrored(true)}
                                />
                            ) : providerName ? (
                                <span className="font-red-hat-display text-[12px] font-bold text-grey-0 md:text-[13px]">{providerName}</span>
                            ) : null}
                            {moreDealsCount > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onToggleDeals?.(!dealsExpanded)
                                        setDealsExpanded((prev) => !prev)
                                    }}
                                    className="cursor-pointer font-manrope text-[11px] font-semibold text-primary-default transition-colors hover:text-primary-dark md:text-[12px]">
                                    {dealsExpanded ? '· Hide deals' : `· + ${moreDealsCount} more deal${moreDealsCount > 1 ? 's' : ''} →`}
                                </button>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {affiliateUrl && onBook ? (
                            <button
                                type="button"
                                onClick={isBookPending ? undefined : onBook}
                                disabled={isBookPending}
                                aria-busy={isBookPending}
                                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-primary-default px-3.5 font-red-hat-display text-[12px] font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-90 md:h-10 md:px-4 md:text-[13px]">
                                Book
                                {isBookPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                            </button>
                        ) : null}
                    </div>
                </div>
                {dealsExpanded && sortedDeals.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="grid grid-cols-1 gap-1.5 border-t border-grey-4/60 px-6 py-4 sm:grid-cols-2 lg:grid-cols-3">
                        {sortedDeals.map((deal, idx) => (
                            <DealChip
                                key={`${deal.provider}-${idx}`}
                                deal={deal}
                                isHighlighted={idx === 0}
                                onClick={() =>
                                    onDealClick?.({
                                        provider: deal.provider,
                                        price: deal.price,
                                        affiliate_url: deal.affiliate_url,
                                        isCheapest: idx === 0
                                    })
                                }
                            />
                        ))}
                    </motion.div>
                ) : null}
            </article>
        </section>
    )
}

export default AnchorFlightCard
