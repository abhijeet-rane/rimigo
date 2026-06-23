import React, { useCallback, useState } from 'react'
import { Loader } from 'lucide-react'
import { HOTEL_ICON } from '@/constants/thiingsIcons'
import type { PlatformPrice } from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import { PROVIDER_LOGOS } from '@/constants/providerLogos'
import CustomShimmer from '@/components/shared/Shimmer'
import type { BudgetStaySpan, RecalculationTrigger } from '../../api/budgetApi'
import { CategorySection, ExploreMoreLink, SubSection, SubSectionHeader } from './CategorySection'
import { CheapestBadge, InfoCell, JourneyCard, MoreCell, PriceButton, ProviderCell, ProviderIdentity, ProviderRow } from './JourneyCardKit'
import { useBudgetTrack } from './budgetTrackContext'
import { POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'

interface StayPriceData {
    displayPrice: number
    platforms: PlatformPrice[]
    isPriceLoading: boolean
    isPriceUnavailable: boolean
}

interface StaysBudgetGroupProps {
    stays: BudgetStaySpan[]
    onProviderSelect?: (cityId: string, provider: string | null) => void
    stayPricesMap?: Map<string, StayPriceData>
    tripStartDate?: string
    requiresConfirm?: boolean
    isPublic?: boolean
    days?: { day_number: number; city_name: string }[]
    recalculationTrigger?: RecalculationTrigger
    onNavigateToStays?: () => void
}

const formatCurrency = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`

const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function buildCityDayRanges(days?: { day_number: number; city_name: string }[]): Map<string, string> {
    if (!days) return new Map()
    const cityDays = new Map<string, { min: number; max: number }>()
    for (const day of days) {
        if (!day.city_name) continue
        const existing = cityDays.get(day.city_name)
        if (existing) {
            existing.min = Math.min(existing.min, day.day_number)
            existing.max = Math.max(existing.max, day.day_number)
        } else {
            cityDays.set(day.city_name, { min: day.day_number, max: day.day_number })
        }
    }
    const result = new Map<string, string>()
    for (const [city, range] of cityDays) {
        result.set(city, range.min === range.max ? `N${range.min}` : `N ${range.min}–${range.max}`)
    }
    return result
}

const STAY_PROVIDER_LOGOS: Record<string, string> = {
    'Booking.com': PROVIDER_LOGOS.BOOKING,
    Agoda: PROVIDER_LOGOS.AGODA,
    'Expedia.com': PROVIDER_LOGOS.EXPEDIA,
    'Trip.com': PROVIDER_LOGOS.TRIP_COM,
    'Hotels.com': PROVIDER_LOGOS.HOTELS_COM
}

// Show the logo icon + provider name for every provider, EXCEPT those whose
// logo is already a full wordmark (Agoda, Booking.com) — there the name beside
// it is redundant, and shrinking the wordmark to favicon size crops it ugly.
const WORDMARK_ONLY_PROVIDER = /agoda|booking/i
const StayProvider: React.FC<{ name: string; logo?: string | null }> = ({ name, logo }) =>
    WORDMARK_ONLY_PROVIDER.test(name) ? (
        <ProviderIdentity
            logoUrl={logo}
            name={name}
        />
    ) : (
        <ProviderIdentity
            faviconUrl={logo}
            name={name}
        />
    )

/* ─────────────────────────────────────────────
   StayCard — one sub-section per stay: city
   header + JourneyCard with provider rows
   ───────────────────────────────────────────── */

interface StayCardProps {
    stay: BudgetStaySpan
    priceData?: StayPriceData
    onProviderSelect?: (cityId: string, provider: string | null) => void
    requiresConfirm?: boolean
    isPublic?: boolean
    cityDayRanges: Map<string, string>
    recalculationTrigger?: RecalculationTrigger
    onNavigateToStays?: () => void
}

const StayCard: React.FC<StayCardProps> = ({
    stay,
    priceData,
    onProviderSelect,
    requiresConfirm,
    isPublic,
    cityDayRanges,
    recalculationTrigger,
    onNavigateToStays
}) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const track = useBudgetTrack()

    const platforms = priceData?.platforms || []
    const sortedPlatforms = [...platforms].filter((p) => p.price > 0).sort((a, b) => a.price - b.price)
    const isPriceLoading = priceData?.isPriceLoading ?? false
    const isPriceUnavailable = priceData?.isPriceUnavailable === true || (!isPriceLoading && sortedPlatforms.length === 0 && stay.rate_per_night <= 0)

    // Resolve per-night rate from live deals if available, otherwise backend rate
    const selectedPlatform = stay.selected_provider
        ? sortedPlatforms.find((p) => p.platform.toLowerCase() === stay.selected_provider!.toLowerCase())
        : null
    const currentPlatform = selectedPlatform ?? (sortedPlatforms.length > 0 ? sortedPlatforms[0] : null)
    const resolvedRate = currentPlatform?.price ?? stay.rate_per_night
    const total = stay.total > 0 ? stay.total : resolvedRate * stay.nights
    const isCurrentCheapest = sortedPlatforms.length > 0 && currentPlatform?.platform === sortedPlatforms[0].platform

    // Recalc highlight — scoped stay triggers light up only this card.
    const isStayTrigger = recalculationTrigger?.type === 'stay_provider' || recalculationTrigger?.type === 'stay_swap'
    const isThisGroupRecalculating = isStayTrigger && recalculationTrigger?.city_id === stay.city_id

    // Sub-header trailing: real dates, or the "N 2–4" day range on public
    // collections where dates aren't meaningful.
    const cityLabel = stay.city_name
    const trailing = isPublic ? cityDayRanges.get(cityLabel) || null : `${formatDate(stay.check_in)} - ${formatDate(stay.check_out)}`

    const selectedProvider = currentPlatform?.platform || stay.platform
    const selectedLogo = selectedProvider ? currentPlatform?.logo_url || STAY_PROVIDER_LOGOS[selectedProvider] : undefined

    const handleToggle = useCallback(() => {
        track(POSTHOG_EVENTS.BUDGET_TAB_STAY_ALT_PANEL_TOGGLE, { city_id: stay.city_id, open: !isExpanded })
        setIsExpanded((v) => !v)
    }, [isExpanded, stay.city_id, track])

    const handleInfoClick = useCallback(() => {
        if (!stay.booking_link) return
        track(POSTHOG_EVENTS.BUDGET_TAB_STAY_BOOK_LINK_CLICK, {
            city_id: stay.city_id,
            zentrum_hub_id: stay.zentrum_hub_id,
            platform: stay.platform
        })
        window.open(stay.booking_link, '_blank', 'noopener,noreferrer')
    }, [stay.booking_link, stay.city_id, stay.zentrum_hub_id, stay.platform, track])

    const handleProviderPick = useCallback(
        (platform: string) => {
            if (!onProviderSelect) return
            if (requiresConfirm) {
                const ok = window.confirm(
                    'This is a public tripboard. Your changes will affect the budget all regular travelers see.\n\nContinue with this change?'
                )
                if (!ok) return
            }
            const isCurrent = stay.selected_provider && stay.selected_provider.toLowerCase() === platform.toLowerCase()
            onProviderSelect(stay.city_id, isCurrent ? null : platform)
            setIsExpanded(false)
        },
        [onProviderSelect, requiresConfirm, stay.city_id, stay.selected_provider]
    )

    const trackProviderLinkClick = (platform: string) =>
        track(POSTHOG_EVENTS.BUDGET_TAB_STAY_PROVIDER_LINK_CLICK, {
            city_id: stay.city_id,
            zentrum_hub_id: stay.zentrum_hub_id,
            platform
        })

    return (
        <SubSection>
            <SubSectionHeader
                lead={cityLabel}
                trailing={trailing}
                right={
                    isThisGroupRecalculating ? (
                        <Loader className="w-4 h-4 animate-spin text-primary-default shrink-0" />
                    ) : onNavigateToStays ? (
                        <ExploreMoreLink onClick={onNavigateToStays} />
                    ) : undefined
                }
            />
            <JourneyCard className={isThisGroupRecalculating ? 'opacity-70 pointer-events-none' : ''}>
                <InfoCell
                    image={stay.image}
                    title={stay.hotel_name}
                    subtitle={stay.city_name}
                    onClick={stay.booking_link ? handleInfoClick : undefined}
                />
                <ProviderCell>
                    {isPriceLoading ? (
                        <div className="px-3 py-3">
                            <CustomShimmer
                                height={40}
                                radius={8}
                                backgroundColor="var(--color-grey-4)"
                            />
                        </div>
                    ) : isPriceUnavailable ? (
                        <div className="flex items-center px-3 py-3 h-full">
                            <p className="font-manrope text-[12px] text-grey-3">No prices available</p>
                        </div>
                    ) : !isExpanded ? (
                        <ProviderRow
                            key={selectedProvider || 'selected'}
                            body={
                                <span className="flex items-center gap-2 min-w-0">
                                    {selectedProvider && (
                                        <StayProvider
                                            name={selectedProvider}
                                            logo={selectedLogo}
                                        />
                                    )}
                                    {isCurrentCheapest && <CheapestBadge />}
                                </span>
                            }
                            right={
                                <PriceButton
                                    price={formatCurrency(total)}
                                    sub={`${formatCurrency(resolvedRate)}/night`}
                                    // Fall back to the stay's own booking link when live
                                    // compare hasn't returned a provider URL, so the chip
                                    // always shows the ↗ arrow and is clickable.
                                    href={currentPlatform?.url || stay.booking_link || undefined}
                                    minWidthPx={114}
                                    centered
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if ((currentPlatform?.url || stay.booking_link) && selectedProvider) trackProviderLinkClick(selectedProvider)
                                    }}
                                />
                            }
                        />
                    ) : (
                        <>
                            {sortedPlatforms.map((p, i) => {
                                const isSelected = stay.selected_provider
                                    ? p.platform.toLowerCase() === stay.selected_provider.toLowerCase()
                                    : p.platform === sortedPlatforms[0].platform
                                return (
                                    <ProviderRow
                                        key={p.platform}
                                        showRadio
                                        selected={isSelected}
                                        onSelect={() => handleProviderPick(p.platform)}
                                        body={
                                            <span className="flex items-center gap-2 min-w-0">
                                                <StayProvider
                                                    name={p.platform}
                                                    logo={p.logo_url || STAY_PROVIDER_LOGOS[p.platform]}
                                                />
                                                {i === 0 && <CheapestBadge />}
                                            </span>
                                        }
                                        right={
                                            <PriceButton
                                                price={formatCurrency(p.price * stay.nights)}
                                                sub={`${formatCurrency(p.price)}/night`}
                                                href={p.url || undefined}
                                                minWidthPx={114}
                                                centered
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (p.url) trackProviderLinkClick(p.platform)
                                                }}
                                            />
                                        }
                                    />
                                )
                            })}
                        </>
                    )}
                </ProviderCell>
                <MoreCell
                    count={sortedPlatforms.length - 1}
                    expanded={isExpanded}
                    onToggle={handleToggle}
                />
            </JourneyCard>
        </SubSection>
    )
}

/* ─────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────── */

export const StaysBudgetGroup: React.FC<StaysBudgetGroupProps> = ({
    stays,
    onProviderSelect,
    stayPricesMap,
    requiresConfirm,
    isPublic,
    days,
    recalculationTrigger,
    onNavigateToStays
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const track = useBudgetTrack()

    const cityDayRanges = buildCityDayRanges(days)
    const isEmpty = !stays || stays.length === 0
    const isSectionRecalculating = recalculationTrigger?.type === 'full_recalculate'

    const totalNights = isEmpty ? 0 : stays.reduce((sum, s) => sum + (s.nights || 0), 0)
    const sectionTotal = isEmpty
        ? 0
        : stays.reduce((sum, stay) => {
              const priceData = stayPricesMap?.get(stay.zentrum_hub_id)
              const platforms = priceData?.platforms || []
              const sorted = [...platforms].filter((p) => p.price > 0).sort((a, b) => a.price - b.price)
              if (sorted.length > 0) {
                  const selected = stay.selected_provider
                      ? sorted.find((p) => p.platform.toLowerCase() === stay.selected_provider!.toLowerCase())
                      : null
                  const rate = selected?.price ?? sorted[0].price
                  return sum + rate * stay.nights
              }
              return sum + (stay.total > 0 ? stay.total : stay.rate_per_night * stay.nights)
          }, 0)
    const avgPerNight = totalNights > 0 ? Math.round(sectionTotal / totalNights) : 0

    const countLabel = isEmpty
        ? null
        : `${stays.length} booking${stays.length !== 1 ? 's' : ''} · ${totalNights} night${totalNights !== 1 ? 's' : ''}`

    const handleToggle = () => {
        track(POSTHOG_EVENTS.BUDGET_TAB_STAYS_SECTION_TOGGLE, { open: !isOpen })
        setIsOpen((v) => !v)
    }

    return (
        <CategorySection
            icon={HOTEL_ICON}
            title="Stays"
            countLabel={countLabel}
            price={!isEmpty && sectionTotal > 0 ? formatCurrency(sectionTotal) : null}
            priceSub={!isEmpty && avgPerNight > 0 ? `${formatCurrency(avgPerNight)}/night` : null}
            open={isOpen}
            onToggle={handleToggle}
            headerExtra={
                isSectionRecalculating ? (
                    <span className="flex items-center gap-1.5 font-manrope text-[11px] font-medium text-primary-default">
                        <Loader className="w-3 h-3 animate-spin" />
                        Updating prices…
                    </span>
                ) : undefined
            }>
            {isEmpty ? (
                <div className="flex flex-col items-center text-center py-8 gap-1">
                    <p className="font-red-hat-display text-[16px] font-semibold text-grey-0">No stays added</p>
                    <p className="font-manrope text-[13px] text-grey-2 max-w-[360px]">
                        Add stays to your itinerary and we will fetch the best prices for you here.
                    </p>
                    {onNavigateToStays && (
                        <button
                            type="button"
                            onClick={onNavigateToStays}
                            className="mt-3 bg-grey-0 text-white rounded-lg px-4 py-2 font-red-hat-display text-[14px] font-bold cursor-pointer hover:bg-grey-1 transition-colors">
                            Explore Stays
                        </button>
                    )}
                </div>
            ) : (
                stays.map((stay) => (
                    <StayCard
                        key={`${stay.city_id}-${stay.zentrum_hub_id}-${stay.check_in}`}
                        stay={stay}
                        priceData={stayPricesMap?.get(stay.zentrum_hub_id)}
                        onProviderSelect={onProviderSelect}
                        requiresConfirm={requiresConfirm}
                        isPublic={isPublic}
                        cityDayRanges={cityDayRanges}
                        recalculationTrigger={recalculationTrigger}
                        onNavigateToStays={onNavigateToStays}
                    />
                ))
            )}
        </CategorySection>
    )
}
