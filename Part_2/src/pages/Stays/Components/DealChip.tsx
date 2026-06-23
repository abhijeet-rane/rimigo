import { ExternalLink } from 'lucide-react'
import type { PlatformPrice } from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import { PROVIDER_LOGOS } from '@/constants/providerLogos'
import RimigoLogo from '@/components/shared/RimigoLogo'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics'
import { GA_EVENTS, GA_EVENT_CATEGORIES } from '@/constants/googleAnalytics'
import { useUserInfo } from '@/hooks/useUserInfo'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { createGuardedAffiliateWindowOpen } from '@/utils/guardedAffiliateWindowOpen'

interface DealChipProps {
    deal: PlatformPrice
    isCheapest: boolean
    buttonPage?: string // Page name for PostHog tracking (e.g., 'stay_wishlist_v1', 'stay_explore_v1')
}

export const DealChip = ({ deal, isCheapest, buttonPage = 'stay_wishlist_v1' }: DealChipProps) => {
    const { trackButtonClickCustom } = usePostHog()
    const { trackGoogleEvent } = useGoogleAnalytics()
    const { user } = useUserInfo()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip

    const providerLogos: Record<string, string> = {
        'Booking.com': PROVIDER_LOGOS.BOOKING,
        Agoda: PROVIDER_LOGOS.AGODA,
        'Expedia.com': PROVIDER_LOGOS.EXPEDIA,
        'Trip.com': PROVIDER_LOGOS.TRIP_COM
    }
    const trackAffiliateClick = (platformName: string, price: number, url?: string) => {
        const openLink = createGuardedAffiliateWindowOpen(url)

        trackButtonClickCustom?.({
            buttonPage,
            buttonName: 'affiliate_link',
            buttonAction: 'open_affiliate_platform',
            extra: {
                platform: platformName,
                price,
                url,
                trigger_location: 'price_comparison_card'
            }
        })

        trackGoogleEvent(GA_EVENTS.AFFILIATE_LINK_CLICK, {
            event_category: GA_EVENT_CATEGORIES.STAYS,
            event_label: platformName,
            platform: platformName,
            price: price || null,
            affiliate_url: url || null,
            trigger_location: 'price_comparison_card',
            button_page: buttonPage,
            is_cheapest: isCheapest,
            traveler_id: user?.id || null,
            trip_id: activeTrip?.trip_id || null,
            event_callback: openLink,
            event_timeout: 1000
        })
    }
    return (
        <a
            href={deal.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                trackAffiliateClick(deal.platform, deal.price, deal.url)
            }}
            className={` relative inline-flex flex-col min-w-[140px] shrink-0`}>
            {/* Back green container - same width as card, lower z-index, positioned behind */}

            {/* Main white card content - higher z-index */}
            <div
                className={`cursor-pointer relative px-2 py-1.5 pt-3.5 flex flex-col gap-0.5 bg-white rounded-xl hover:border-primary-default border-2 z-10 hover:shadow-md transition-all border-[1px] border-grey-4`}>
                {/* Top row: Logo, Provider name, External link icon */}
                {isCheapest && (
                    <div className="absolute bg-secondary-green text-white text-[8px] font-bold font-red-hat-display px-1.5 py-0.5 rounded-bl-xl rounded-tr-xl top-0 right-0">
                        CHEAPEST
                    </div>
                )}
                <div className="flex items-center gap-1">
                    {/* Logo from API or fallback to provider map */}
                    {deal.platform === 'Rimigo' ? (
                        <RimigoLogo />
                    ) : deal.logo_url || providerLogos[deal.platform] ? (
                        <img
                            src={deal.logo_url || providerLogos[deal.platform]}
                            alt={deal.platform}
                            className="w-4 h-4 object-contain shrink-0"
                        />
                    ) : (
                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 border-grey-3 bg-grey-5`} />
                    )}

                    {/* Provider name (room name in title for hover) — hidden for Rimigo since logo includes text */}
                    {deal.platform !== 'Rimigo' && (
                        <span
                            className="text-xs font-semibold text-header-black flex-1 min-w-0 truncate"
                            title={deal.roomName || undefined}>
                            {deal.platform}
                        </span>
                    )}

                    {/* External link icon - for open in new page */}
                </div>

                {/* Price - green for cheapest, black for others */}
                {deal.price > 0 && (
                    <div className="flex justify-between items-end">
                        <div className={`text-md font-semibold`}>
                            ₹
                            {deal.price.toLocaleString('en-IN', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            })}
                            <span className="text-sm text-grey-2">/night</span>
                        </div>
                        <ExternalLink
                            className="w-3.5 h-3.5 text-grey-grey_2 shrink-0 mb-1 text-primary-default"
                            strokeWidth={2}
                        />
                    </div>
                )}
            </div>
        </a>
    )
}
