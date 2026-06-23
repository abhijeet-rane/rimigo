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
import { cn } from '@/lib/utils'

interface DealChipListViewProps {
    deal: PlatformPrice
    isCheapest: boolean
    buttonPage?: string // Page name for PostHog tracking (e.g., 'stay_wishlist_v1', 'stay_explore_v1')
    onRimigoClick?: () => void // Navigate to stay details for Rimigo deals
}

export const DealChipListView = ({ deal, isCheapest, buttonPage = 'stay_wishlist_v1', onRimigoClick }: DealChipListViewProps) => {
    const { trackButtonClickCustom } = usePostHog()
    const { trackGoogleEvent } = useGoogleAnalytics()
    const { user } = useUserInfo()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip

    const providerLogos: Record<string, string> = {
        'Booking.com': PROVIDER_LOGOS.BOOKING,
        Agoda: PROVIDER_LOGOS.AGODA,
        'Expedia.com': PROVIDER_LOGOS.EXPEDIA,
        'Trip.com': PROVIDER_LOGOS.TRIP_COM,
        'Hotels.com': PROVIDER_LOGOS.HOTELS_COM
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
    return (<>
        <a
            href={deal.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()

                if (deal.platform === 'Rimigo') {
                    if (onRimigoClick) onRimigoClick()
                    return
                }
                trackAffiliateClick(deal.platform, deal.price, deal.url)
            }}
            className={` relative inline-flex flex-col min-w-[140px]  w-full shrink-0 hover:grey-4`}>
            {/* Back green container - same width as card, lower z-index, positioned behind */}

            {/* Main white card content - higher z-index */}
            <div
                className={`cursor-pointer relative pr-2 pt-2 flex flex-row justify-between gap-0.5 bg-white  hover:border-primary-default  z-10 transition-all`}>
                {/* Top row: Logo, Provider name, External link icon */}
                <div className="flex items-center gap-1">
                    {/* Logo from API or fallback to provider map; name only if no logo */}
                    {deal.platform === 'Rimigo' ? (
                        <RimigoLogo />
                    ) : deal.logo_url || providerLogos[deal.platform] ? (
                        <img
                            src={deal.logo_url || providerLogos[deal.platform]}
                            alt={deal.platform}
                            className={cn(`object-contain shrink-0 h-8`)}
                        />
                    ) : (
                        <span className="text-[12px] font-manrope font-semibold text-grey-0 tracking-[-0.2px]">{deal.platform}</span>
                    )}

                    {/* External link icon - for open in new page */}
                </div>

                {/* Price - green for cheapest, black for others */}
                {deal.price > 0 && (
                    <div className="flex items-center gap-1 justify-center">
                        <div className={`text-[14px] font-manrope font-semibold tracking-[-0.2px] text-grey-1`}>
                            ₹
                            {deal.price.toLocaleString('en-IN', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            })}
                            <span className="text-[12px] font-manrope text-grey-2 tracking-[-0.2px]">/night</span>
                        </div>
                        <ExternalLink
                            className="w-3.5 h-3.5 text-grey-grey_2 shrink-0 text-primary-default"
                            strokeWidth={2}
                        />
                    </div>
                )}
            </div>
        </a>
    </>
    )
}
