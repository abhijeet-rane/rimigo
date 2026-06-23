import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Loader, Loader2, Trash2 } from 'lucide-react'
import { getAirlineLogo } from '@/pages/Flights/utils/airlineLogoUtils'
import { FLIGHT_ICON } from '@/constants/thiingsIcons'
import { travelerCollectionApi } from '@/modules/ContentCollection/api/travelerCollectionApi'
import type { BudgetFlight, BudgetFlightBestOffer, RecalculationTrigger } from '../../api/budgetApi'
import { useBudgetTrack } from './budgetTrackContext'
import { POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'
import { PROVIDER_HORIZONRAL_LOGOS } from '@/constants/providerLogos'
import CustomShimmer from '@/components/shared/Shimmer'
import { CategorySection, SubSection, SubSectionHeader, ExploreMoreLink } from './CategorySection'
import { JourneyCard, ProviderCell, ProviderRow, ProviderIdentity, CheapestBadge, PriceButton, MoreCell } from './JourneyCardKit'

const SKYSCANNER_WORDMARK_URL = PROVIDER_HORIZONRAL_LOGOS.SKYSCANNER

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

interface FlightsBudgetSectionProps {
    flights: BudgetFlight[]
    identifier?: string
    isPublic?: boolean
    onProviderSelect?: (sectionId: string, provider: string | null) => void
    /** Remove every flight slot tied to this Section from the itinerary.
     *  Round-trip flights remove both legs in one call. Omitted in
     *  read-only / public-collection views, which can't mutate the
     *  underlying itinerary. */
    onRemoveFromItinerary?: (sectionId: string) => void | Promise<void>
    /** Navigate to the Flights tab so the user can shortlist + add. Exposed
     *  as the empty state's primary CTA and as the sub-section "Explore
     *  more" link. Omitted in read-only / public views. */
    onNavigateToFlights?: () => void
    recalculationTrigger?: RecalculationTrigger
}

interface LivePriceData {
    total_price: string
    best_offer?: BudgetFlightBestOffer
    price_comparison?: BudgetFlightBestOffer[]
}

const formatAmount = (value?: string | number | null) => {
    if (value == null || value === '') return '--'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '--'
    return `₹${Math.round(num).toLocaleString('en-IN')}`
}

const formatTime = (isoString?: string) => {
    if (!isoString) return '--'
    try {
        const d = new Date(isoString)
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
    } catch {
        return '--'
    }
}

const formatDate = (isoString?: string) => {
    if (!isoString) return '--'
    try {
        const d = new Date(isoString)
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    } catch {
        return '--'
    }
}

/* ─────────────────────────────────────────────
   Airline logo + custom flight info cell
   ───────────────────────────────────────────── */

// Airline logo with React-managed error state. Replaces the previous
// imperative ``style.display = 'none'`` onError handler — that mutation
// persisted on the DOM element across re-renders, so once a card had a
// load failure (e.g. an earlier render when airlineCode was empty) the
// img stayed hidden even after the prop updated to a valid code.
// Pair with ``key={airlineCode}`` at the call site for full safety.
const AirlineLogoImg: React.FC<{ code: string; alt: string }> = ({ code, alt }) => {
    const [errored, setErrored] = useState(false)
    if (!code || errored) {
        // Empty code → don't even attempt the request (would 404).
        // Errored → show fallback initials.
        return <span className="text-[10px] font-bold text-grey-2">{(alt || '').slice(0, 2).toUpperCase()}</span>
    }
    return (
        <img
            src={getAirlineLogo(code)}
            alt={alt}
            className="w-[22px] h-[22px] object-contain shrink-0"
            onError={() => setErrored(true)}
        />
    )
}

/** Dep / duration / arr row inside the flight info cell. Center column is a
 *  fixed 72px rail: duration on top, a 1px line with one dot per stop, and
 *  the layover label underneath. */
const LegRow: React.FC<{ stats: LegStats; className?: string }> = ({ stats, className = '' }) => (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
        <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-manrope text-[12px] font-semibold tracking-[-0.24px] leading-4 text-grey-1">{formatDate(stats.departureTime)}</span>
            <span className="font-red-hat-display text-[14px] font-bold tracking-[-0.28px] leading-[18px] text-grey-0 tabular-nums">
                {formatTime(stats.departureTime)}
            </span>
            <span className="font-manrope text-[12px] font-semibold tracking-[-0.24px] leading-4 text-grey-0">{stats.departureCode || '—'}</span>
        </div>
        <div className="w-[72px] shrink-0 flex flex-col items-center gap-1">
            <span className="font-red-hat-display text-[12px] font-semibold tracking-[-0.24px] leading-4 text-grey-0 tabular-nums">
                {formatLegDuration(stats.durationMinutes)}
            </span>
            {/* Slider-style rail: green track + one thumb per stop (Figma). */}
            <div className="relative w-full h-[10px] flex items-center">
                <div className="w-full h-[3px] rounded-full bg-secondary-green" />
                {Array.from({ length: stats.stopsCount }).map((_, i) => (
                    <span
                        key={i}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[10px] h-[10px] rounded-full bg-white border border-grey-4"
                        style={{ left: `${((i + 1) / (stats.stopsCount + 1)) * 100}%` }}
                    />
                ))}
            </div>
            <span className="font-red-hat-display text-[12px] font-semibold tracking-[-0.24px] leading-4 text-grey-2">
                {stats.stopsCount === 0 ? 'non-stop' : `${stats.stopsCount} layover${stats.stopsCount > 1 ? 's' : ''}`}
            </span>
        </div>
        <div className="flex flex-col gap-0.5 items-end text-right min-w-0">
            <span className="font-manrope text-[12px] font-semibold tracking-[-0.24px] leading-4 text-grey-1">{formatDate(stats.arrivalTime)}</span>
            <span className="font-red-hat-display text-[14px] font-bold tracking-[-0.28px] leading-[18px] text-grey-0 tabular-nums">
                {formatTime(stats.arrivalTime)}
            </span>
            <span className="font-manrope text-[12px] font-semibold tracking-[-0.24px] leading-4 text-grey-0">{stats.arrivalCode || '—'}</span>
        </div>
    </div>
)

/* ─────────────────────────────────────────────
   FlightJourneyCard — one sub-section per flight
   ───────────────────────────────────────────── */

interface FlightJourneyCardProps {
    flight: BudgetFlight
    livePrice: LivePriceData | undefined
    isLoadingPrices: boolean
    isCardRecalculating: boolean
    onProviderSelect?: (sectionId: string, provider: string | null) => void
    onRemoveFromItinerary?: (sectionId: string) => void | Promise<void>
    onNavigateToFlights?: () => void
}

const FlightJourneyCard: React.FC<FlightJourneyCardProps> = ({
    flight,
    livePrice,
    isLoadingPrices,
    isCardRecalculating,
    onProviderSelect,
    onRemoveFromItinerary,
    onNavigateToFlights
}) => {
    const [isRemoving, setIsRemoving] = useState(false)
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const track = useBudgetTrack()

    const handleRemoveClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!onRemoveFromItinerary || isRemoving) return
        track(POSTHOG_EVENTS.BUDGET_TAB_FLIGHT_REMOVE_CLICK, {
            section_id: flight.section_id,
            reference_id: flight.reference_id
        })
        setIsConfirmOpen(true)
    }
    const handleConfirmRemove = async () => {
        if (!onRemoveFromItinerary) return
        setIsRemoving(true)
        try {
            await onRemoveFromItinerary(flight.section_id)
            setIsConfirmOpen(false)
        } finally {
            setIsRemoving(false)
        }
    }
    const handleCancelRemove = () => {
        if (isRemoving) return
        track(POSTHOG_EVENTS.BUDGET_TAB_FLIGHT_REMOVE_CANCEL, {
            section_id: flight.section_id,
            reference_id: flight.reference_id
        })
        setIsConfirmOpen(false)
    }

    const firstSeg = flight.segments[0]
    const lastSeg = flight.segments[flight.segments.length - 1]
    const airlineCode = firstSeg?.airline?.code || ''
    const airlineName = firstSeg?.airline?.name || 'Airline'
    const flightNumber = firstSeg?.airline?.flight_number

    // Round-trip detection — split the segment list at the largest
    // arrival→next-departure gap (>18h is the destination stay, not a
    // layover). Mirrors TripboardFlightCard so the budget card reads the
    // same way the Flights tab card does for round-trip flights.
    const split = splitSegmentsByGap(flight.segments || [])
    const isRoundTrip = split.isRoundTrip || flight.journey_type === 2 || !!flight.return_date
    const outboundStats = computeLegStats(split.outbound)
    const inboundStats = computeLegStats(split.inbound)
    const headerFromCode = firstSeg?.origin?.airport_code
    const headerToCode = isRoundTrip ? outboundStats.arrivalCode : lastSeg?.destination?.airport_code
    const headerArrow = isRoundTrip ? '⇄' : '→'

    const hasManualOffer = !!flight.manual_offer?.url
    // Manual-offer cards route booking through the partner link (Skyscanner),
    // so we hide the Kayak provider comparison table on these cards — mirrors
    // the Flights Tab behavior.
    const priceComparison = hasManualOffer ? [] : livePrice?.price_comparison || []
    const bestOffer = livePrice?.best_offer || flight.best_offer

    const sortedDeals = [...priceComparison].sort((a, b) => (a.price || 0) - (b.price || 0))
    const cheapestPrice = sortedDeals.length > 0 ? sortedDeals[0].price : null

    const selectedProviderDeal =
        flight.selected_provider && sortedDeals.length > 0
            ? sortedDeals.find((d) => d.provider.toLowerCase() === flight.selected_provider!.toLowerCase())
            : null
    const displayOffer = selectedProviderDeal || bestOffer
    const displayPrice = displayOffer?.price || (livePrice?.total_price ? parseFloat(livePrice.total_price) : null) || flight.total_price
    const isDisplayCheapest = sortedDeals.length > 0 && displayOffer != null && displayOffer.price === cheapestPrice

    const handleBookClick = (provider: string) => (e: React.MouseEvent) => {
        e.stopPropagation()
        track(POSTHOG_EVENTS.BUDGET_TAB_FLIGHT_BOOK_CLICK, {
            section_id: flight.section_id,
            provider
        })
    }

    const handleProvidersToggle = () => {
        track(POSTHOG_EVENTS.BUDGET_TAB_FLIGHT_PROVIDERS_TOGGLE, {
            section_id: flight.section_id,
            open: !isExpanded
        })
        setIsExpanded((v) => !v)
    }

    return (
        <SubSection>
            <SubSectionHeader
                lead={`${headerFromCode || '—'} ${headerArrow} ${headerToCode || '—'}`}
                trailing={formatDate(outboundStats.departureTime)}
                right={onNavigateToFlights ? <ExploreMoreLink onClick={onNavigateToFlights} /> : undefined}
            />
            <JourneyCard className={isCardRecalculating ? 'bg-primary-pale-purple/40' : ''}>
                {/* Info cell — airline identity + per-leg time rows. justify-center +
                    motion `layout` so the content glides to the new vertical center
                    when the card grows on expand (matching the shared InfoCell). */}
                <div className="md:w-[300px] shrink-0 p-3 md:border-r max-md:border-b border-border-subtle flex flex-col justify-center gap-2">
                    <motion.div
                        layout
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                            {/* ``key={airlineCode}`` remounts the img when the code
                                changes so a previous load failure doesn't carry over. */}
                            <AirlineLogoImg
                                key={airlineCode}
                                code={airlineCode}
                                alt={airlineName}
                            />
                            <span className="font-red-hat-display text-[12px] font-bold tracking-[-0.12px] leading-5 text-grey-0 truncate">
                                {airlineName}
                                {airlineCode ? ` ${airlineCode}` : ''}
                                {flightNumber ? ` - ${flightNumber}` : ''}
                            </span>
                        </div>
                        <LegRow stats={outboundStats} />
                        {isRoundTrip && (
                            <LegRow
                                stats={inboundStats}
                                className="border-t border-border-subtle pt-2"
                            />
                        )}
                    </motion.div>
                </div>

                {/* Provider cell */}
                <ProviderCell>
                    {hasManualOffer ? (
                        <ProviderRow
                            key="manual"
                            body={
                                <ProviderIdentity
                                    logoUrl={SKYSCANNER_WORDMARK_URL}
                                    name="Skyscanner"
                                />
                            }
                            right={
                                <PriceButton
                                    price={formatAmount(displayPrice)}
                                    href={flight.manual_offer!.url}
                                    onClick={handleBookClick('skyscanner')}
                                />
                            }
                        />
                    ) : isExpanded && sortedDeals.length > 0 ? (
                        sortedDeals.map((deal, idx) => {
                            const isCheapest = idx === 0 && deal.price === cheapestPrice
                            const isSelectedDeal = flight.selected_provider
                                ? flight.selected_provider.toLowerCase() === deal.provider.toLowerCase()
                                : isCheapest
                            return (
                                <ProviderRow
                                    key={deal.provider}
                                    showRadio
                                    selected={isSelectedDeal}
                                    onSelect={
                                        onProviderSelect
                                            ? () => {
                                                  const newProvider = isSelectedDeal && flight.selected_provider ? null : deal.provider
                                                  onProviderSelect(flight.section_id, newProvider)
                                              }
                                            : undefined
                                    }
                                    body={
                                        <span className="flex items-center gap-2 min-w-0">
                                            <ProviderIdentity
                                                logoUrl={resolveOfferLogo(deal)}
                                                name={deal.provider}
                                            />
                                            {isCheapest && <CheapestBadge />}
                                        </span>
                                    }
                                    right={
                                        isSelectedDeal && isCardRecalculating ? (
                                            <div className="w-24">
                                                <CustomShimmer
                                                    height={36}
                                                    radius={10}
                                                />
                                            </div>
                                        ) : (
                                            <PriceButton
                                                price={formatAmount(deal.price)}
                                                href={deal.affiliate_url || null}
                                                onClick={handleBookClick(deal.provider)}
                                            />
                                        )
                                    }
                                />
                            )
                        })
                    ) : (
                        <>
                            {displayOffer || !isLoadingPrices ? (
                                <ProviderRow
                                    // Match the expanded selected row's key so framer morphs
                                    // (not remounts) that row across expand/collapse — smooth.
                                    key={displayOffer?.provider || 'primary'}
                                    body={
                                        <span className="flex items-center gap-2 min-w-0">
                                            <ProviderIdentity
                                                logoUrl={resolveOfferLogo(displayOffer)}
                                                name={displayOffer?.provider || 'Provider'}
                                            />
                                            {isDisplayCheapest && <CheapestBadge />}
                                        </span>
                                    }
                                    right={
                                        isCardRecalculating ? (
                                            <div className="w-24">
                                                <CustomShimmer
                                                    height={36}
                                                    radius={10}
                                                />
                                            </div>
                                        ) : (
                                            <PriceButton
                                                price={formatAmount(displayPrice)}
                                                href={displayOffer?.affiliate_url || null}
                                                onClick={displayOffer?.affiliate_url ? handleBookClick(displayOffer.provider) : undefined}
                                            />
                                        )
                                    }
                                />
                            ) : null}
                            {isLoadingPrices && sortedDeals.length === 0 && (
                                <div className="px-3 py-3">
                                    <CustomShimmer
                                        height={36}
                                        radius={10}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </ProviderCell>

                <MoreCell
                    count={sortedDeals.length - 1}
                    expanded={isExpanded}
                    onToggle={handleProvidersToggle}
                />
            </JourneyCard>

            {onRemoveFromItinerary && (
                <div className="-mt-2 flex justify-end">
                    <button
                        type="button"
                        onClick={handleRemoveClick}
                        disabled={isRemoving}
                        aria-label="Remove flight from itinerary"
                        className="flex items-center gap-1 rounded-full border border-border-subtle bg-white px-2.5 py-1 font-red-hat-display text-[12px] font-bold tracking-[-0.24px] text-grey-2 hover:text-secondary-red hover:border-secondary-red/40 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                        <Trash2 className="w-3.5 h-3.5" />
                        {isRemoving ? 'Removing…' : 'Remove'}
                    </button>
                </div>
            )}

            <RemoveFlightConfirmModal
                isOpen={isConfirmOpen}
                isPending={isRemoving}
                routeFrom={firstSeg?.origin?.airport_code}
                routeTo={lastSeg?.destination?.airport_code}
                airlineName={airlineName}
                onConfirm={handleConfirmRemove}
                onClose={handleCancelRemove}
            />
        </SubSection>
    )
}

/* ─────────────────────────────────────────────
   Remove confirmation modal
   ───────────────────────────────────────────── */

interface RemoveFlightConfirmModalProps {
    isOpen: boolean
    isPending: boolean
    routeFrom?: string
    routeTo?: string
    airlineName?: string
    onConfirm: () => void
    onClose: () => void
}

const RemoveFlightConfirmModal: React.FC<RemoveFlightConfirmModalProps> = ({
    isOpen,
    isPending,
    routeFrom,
    routeTo,
    airlineName,
    onConfirm,
    onClose
}) => {
    useEffect(() => {
        if (!isOpen) return
        const original = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isPending) onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => {
            document.body.style.overflow = original
            window.removeEventListener('keydown', onKey)
        }
    }, [isOpen, isPending, onClose])

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="remove-flight-confirm-title"
                className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
                <div className="flex items-start gap-3 px-5 py-4 border-b border-grey-4">
                    <div className="h-9 w-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="min-w-0">
                        <h2
                            id="remove-flight-confirm-title"
                            className="font-red-hat-display text-base font-bold text-grey-0 leading-tight">
                            Remove flight from itinerary?
                        </h2>
                        <p className="font-manrope text-xs text-grey-2 mt-0.5">
                            {airlineName ? `${airlineName} · ` : ''}
                            {routeFrom && routeTo ? `${routeFrom} → ${routeTo}` : 'Linked flight'}
                        </p>
                    </div>
                </div>
                <div className="px-5 py-4">
                    <p className="font-manrope text-[13px] text-grey-1 leading-[20px]">
                        This flight (and any return leg, if it's a round-trip) will be removed from your itinerary and the budget will recalculate.
                    </p>
                    <p className="font-manrope text-[12px] text-grey-2 mt-2">It will stay saved on the Flights tab — you can re-add it any time.</p>
                </div>
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-grey-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="font-red-hat-display text-[14px] font-bold tracking-[-0.24px] leading-[18px] px-5 py-2.5 rounded-xl bg-white border border-grey-4 text-grey-0 hover:border-grey-3 hover:bg-grey-5 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 font-red-hat-display text-[14px] font-bold tracking-[-0.24px] leading-[18px] px-5 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Remove flight
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

/* ─────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────── */

export const FlightsBudgetSection: React.FC<FlightsBudgetSectionProps> = ({
    flights,
    identifier,
    isPublic = false,
    onProviderSelect,
    onRemoveFromItinerary,
    onNavigateToFlights,
    recalculationTrigger
}) => {
    const { data: livePricesResponse, isLoading: isLoadingPrices } = useQuery({
        queryKey: ['traveler-collection-flight-prices', identifier],
        queryFn: () => travelerCollectionApi.getFlightPrices(identifier!),
        enabled: !!identifier && !isPublic && flights.length > 0,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000
    })

    const livePrices = useMemo(() => {
        return (livePricesResponse?.data as Record<string, LivePriceData>) || {}
    }, [livePricesResponse])

    const [isOpen, setIsOpen] = useState(false)
    const track = useBudgetTrack()

    const hasFlights = !!flights && flights.length > 0
    // Section-level indicator reserved for full_recalculate. Scoped flight
    // provider triggers light up only the specific card via `triggerSectionId`.
    const isSectionRecalculating = recalculationTrigger?.type === 'full_recalculate'
    const triggerSectionId = recalculationTrigger?.type === 'flight_provider' ? recalculationTrigger.section_id : null

    const totalPrice = hasFlights ? flights.reduce((sum, f) => sum + f.total_price, 0) : 0

    return (
        <CategorySection
            icon={FLIGHT_ICON}
            title="Flights"
            countLabel={hasFlights ? `${flights.length} booking${flights.length !== 1 ? 's' : ''}` : null}
            price={hasFlights ? formatAmount(totalPrice) : null}
            priceSub="per person"
            open={isOpen}
            onToggle={() => {
                track(POSTHOG_EVENTS.BUDGET_TAB_FLIGHTS_SECTION_TOGGLE, { open: !isOpen })
                setIsOpen((v) => !v)
            }}
            headerExtra={
                isSectionRecalculating ? (
                    <span className="flex items-center gap-1 font-manrope text-[11px] font-medium text-primary-default">
                        <Loader className="w-3 h-3 animate-spin" />
                        Updating prices…
                    </span>
                ) : undefined
            }>
            {hasFlights ? (
                flights.map((flight) => {
                    const livePrice = livePrices[flight.reference_id] || livePrices[flight.section_id]
                    return (
                        <FlightJourneyCard
                            key={flight.section_id || flight.reference_id}
                            flight={flight}
                            livePrice={livePrice}
                            isLoadingPrices={isLoadingPrices}
                            isCardRecalculating={triggerSectionId === flight.section_id}
                            onProviderSelect={onProviderSelect}
                            onRemoveFromItinerary={onRemoveFromItinerary}
                            onNavigateToFlights={onNavigateToFlights}
                        />
                    )
                })
            ) : (
                <div className="flex flex-col items-center text-center py-8 gap-1">
                    <p className="font-red-hat-display text-[16px] font-semibold text-grey-0">No flights added</p>
                    <p className="font-manrope text-[13px] text-grey-2 max-w-[360px]">
                        Add flights to your itinerary and we will fetch the best prices for you here.
                    </p>
                    {onNavigateToFlights && (
                        <button
                            type="button"
                            onClick={onNavigateToFlights}
                            className="mt-3 rounded-lg bg-grey-0 px-4 py-2 font-red-hat-display text-[14px] font-bold text-white hover:bg-grey-1 transition-colors cursor-pointer">
                            Explore Flights
                        </button>
                    )}
                </div>
            )}
        </CategorySection>
    )
}

/* ─────────────────────────────────────────────
   Round-trip segment split + per-leg stats.
   Mirrors TripboardFlightCard so the budget card
   reads identically for round-trip flights.
   ───────────────────────────────────────────── */

interface SegmentLike {
    airline?: { code?: string; name?: string; flight_number?: string }
    origin?: { airport_code?: string; departure_time?: string }
    destination?: { airport_code?: string; arrival_time?: string }
    duration?: { minutes?: number }
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

/** Find the largest arrival→next-departure gap; if it exceeds 18h,
 *  treat as the destination stay between outbound and return legs. */
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

function formatLegDuration(minutes: number): string {
    if (!Number.isFinite(minutes) || minutes <= 0) return '—'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}
