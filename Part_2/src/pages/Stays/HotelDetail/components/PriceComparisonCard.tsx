import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, X, Sparkles, Info, BedDouble } from 'lucide-react'
import { PlatformPrice } from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import RimigoLogo from '@/components/shared/RimigoLogo'
import { PROVIDER_LOGOS, ProviderName } from '@/constants/providerLogos'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { useUserInfo } from '@/hooks/useUserInfo'
import { usePlatformPricing } from '@/hooks/usePlatformPricing'
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics'
import { GA_EVENTS, GA_EVENT_CATEGORIES } from '@/constants/googleAnalytics'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { createGuardedAffiliateWindowOpen } from '@/utils/guardedAffiliateWindowOpen'

interface PriceComparisonCardProps {
    platforms: PlatformPrice[]
    isLoading: boolean
    onClose?: () => void
    expanded?: boolean
    onToggleExpand?: () => void
    usedFallbackSetup?: boolean
    initialModalOpen?: boolean
}

const PriceComparisonCard: React.FC<PriceComparisonCardProps> = ({ platforms, isLoading, onClose, expanded = false, onToggleExpand, usedFallbackSetup = false, initialModalOpen = false }) => {
    const [isModalOpen, setIsModalOpen] = useState(initialModalOpen)
    const { user } = useUserInfo()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip

    // Rotating logo state for loading animation
    const [currentLogoIndex, setCurrentLogoIndex] = useState(0)
    const providerLogos = [
        { name: 'Booking.com', logo: PROVIDER_LOGOS.BOOKING },
        { name: 'Agoda', logo: PROVIDER_LOGOS.AGODA },
        { name: 'Expedia', logo: PROVIDER_LOGOS.EXPEDIA },
        { name: 'Trip.com', logo: PROVIDER_LOGOS.TRIP_COM }
    ]
    const { trackButtonClickCustom } = usePostHog()
    const { trackGoogleEvent } = useGoogleAnalytics()

    const trackAffiliateClick = (platformName: string, price: number, url?: string) => {
        const openLink = createGuardedAffiliateWindowOpen(url)

        trackButtonClickCustom?.({
            buttonPage: 'stay_detail_v1',
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
            button_page: 'stay_detail_v1',
            traveler_id: user?.id || null,
            trip_id: activeTrip?.trip_id || null,
            event_callback: openLink,
            event_timeout: 1000
        })
    }
    // Rotate through logos while loading
    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setCurrentLogoIndex((prev) => (prev + 1) % providerLogos.length)
            }, 1500) // Change logo every 1.5 seconds

            return () => clearInterval(interval)
        }
    }, [isLoading, providerLogos.length])

    // Platform logo mapping using PROVIDER_LOGOS
    const getPlatformLogo = (platform: string): string => {
        // Normalize platform name to match PROVIDER_LOGOS keys
        const normalizedPlatform = platform
            .toUpperCase()
            .replace(/\.COM$/, '') // Remove .com suffix
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/\./g, '_') // Replace dots with underscores
            .trim()

        // Map common variations
        const platformMap: Record<string, ProviderName> = {
            EXPEDIA: 'EXPEDIA',
            EXPEDIA_COM: 'EXPEDIA',
            AGODA: 'AGODA',
            BOOKING: 'BOOKING',
            BOOKING_COM: 'BOOKING',
            TRIP: 'TRIP_COM',
            TRIP_COM: 'TRIP_COM',
            TRIPADVISOR: 'TRIP_COM',
            RIMIGO: 'RIMIGO',
            MAKEMYTRIP: 'MAKE_MY_TRIP',
            MAKE_MY_TRIP: 'MAKE_MY_TRIP'
        }

        const providerKey = platformMap[normalizedPlatform] as ProviderName

        return providerKey ? PROVIDER_LOGOS[providerKey] : '/icons/logo-transparent-indigo.png'
    }

    const { items: displayPlatforms } = usePlatformPricing(platforms, {
        limit: expanded ? undefined : 4
    })
    const { items: allPlatforms } = usePlatformPricing(platforms, { limit: undefined })
    if (isLoading) {
        const currentProvider = providerLogos[currentLogoIndex]

        return (
            <div
                className="rounded-2xl border border-feature-card-border bg-white shadow-sm p-8"
                style={{ boxShadow: '0 2px 8px 0 var(--grey-5, #F8F8F8)' }}>
                <div className="flex flex-col items-center justify-center gap-6">
                    {/* Animated rotating circle with cycling platform icons */}
                    <div className="relative">
                        {/* Outer rotating ring */}
                        <div className="absolute inset-0 rounded-full border-4 border-gray-200 animate-spin">
                            <div
                                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #7011F6 0%, #4D1D91 100%)'
                                }}
                            />
                        </div>

                        {/* Inner circle with rotating platform icon */}
                        <div className="relative w-32 h-32 rounded-full bg-white flex items-center justify-center shadow-lg border-4 border-gray-100">
                            <div className="relative w-20 h-20 flex items-center justify-center">
                                {/* Fade transition between logos */}
                                <img
                                    key={currentLogoIndex}
                                    src={currentProvider.logo}
                                    alt={currentProvider.name}
                                    className="w-full h-full object-contain animate-fade-in"
                                    style={{
                                        animation: 'fadeIn 0.5s ease-in-out'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Sparkle decorations */}
                        <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-primary-default animate-pulse" />
                        <Sparkles className="absolute -bottom-2 -left-2 w-5 h-5 text-primary-dark animate-pulse delay-100" />
                    </div>

                    {/* Loading text */}
                    <div className="text-center">
                        <h3
                            className="text-xl font-bold mb-2"
                            style={{
                                fontFamily: 'Red Hat Display',
                                color: '#101010'
                            }}>
                            Fetching the best prices
                        </h3>
                        <p
                            className="text-base"
                            style={{
                                fontFamily: 'Manrope',
                                color: '#363636'
                            }}>
                            Checking {currentProvider.name}...
                        </p>
                    </div>

                    {/* Progress dots indicator */}
                    <div className="flex gap-2">
                        {providerLogos.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentLogoIndex ? 'bg-primary-default w-6' : 'bg-gray-300'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Add CSS for fade animation */}
                <style>{`
                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                            transform: scale(0.9);
                        }
                        to {
                            opacity: 1;
                            transform: scale(1);
                        }
                    }
                `}</style>
            </div>
        )
    }

    const modalPortal = isModalOpen ? createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
            onClick={() => {
                trackButtonClickCustom?.({
                    buttonPage: 'stay_detail_v1',
                    buttonName: 'close_price_modal',
                    buttonAction: 'dismiss'
                })
                setIsModalOpen(false)
            }}>
            <div
                className="relative max-w-lg w-full max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-2xl m-4"
                onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white z-10 p-5 border-b border-gray-200 flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-[16px] md:text-lg font-bold" style={{ fontFamily: 'Red Hat Display', color: '#101010' }}>
                            Best prices for you
                        </h3>
                        <div className="relative group">
                            <div className="flex items-center gap-1 cursor-help">
                                <span className="text-[14px] md:text-xs font-medium" style={{ fontFamily: 'Manrope', color: '#747474' }}>
                                    {usedFallbackSetup ? 'Prices displayed are per room · per night' : 'Prices displayed are per night'}
                                </span>
                                <Info className="w-4 h-4 text-grey-2" />
                            </div>
                            <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                Prices are charged per room, per night. For group stays, verify total cost on the provider&apos;s site.
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-3 sm:p-5 flex flex-col">
                    <div className="flex flex-col gap-3 flex-1">
                        {allPlatforms.map((platform, index) => {
                            const hasElaborateLogo = Boolean(platform.logo_url)
                            return (
                                <div
                                    key={platform.platform + index}
                                    className={`relative rounded-xl border box-border p-2 sm:p-3 transition-all ${platform.is_cheapest ? 'bg-secondary-green/10 border-secondary-green' : 'bg-white border-grey-4 hover:border-primary-default/30'}`}>
                                    {platform.is_cheapest && (
                                        <div className="absolute -top-2 left-4 bg-secondary-green text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wide">
                                            CHEAPEST
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={platform.logo_url || getPlatformLogo(platform.platform)}
                                                    alt={platform.platform}
                                                    className={`object-contain shrink-0 ${platform.platform === 'Rimigo' ? 'h-4 w-12' : hasElaborateLogo ? 'h-6 w-14' : 'w-6 h-6'}`}
                                                />
                                                {!hasElaborateLogo && (
                                                    <span className="tracking-[-0.02em] leading-[18px] font-semibold truncate" style={{ fontFamily: 'Red Hat Display', fontSize: '14px', color: '#101010' }}>
                                                        {platform.platform}
                                                    </span>
                                                )}
                                            </div>
                                            {platform.roomName && (
                                                <div className="flex items-start gap-1.5" title={platform.roomName}>
                                                    <BedDouble className="w-3 h-3 text-grey-2 shrink-0 mt-0.5" />
                                                    <span className="text-[11px] font-semibold text-grey-2 leading-tight" style={{ fontFamily: 'Manrope' }}>
                                                        {platform.roomName}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                            <div className="flex flex-col items-end">
                                                <div className="tracking-[-0.02em] leading-4 font-semibold whitespace-nowrap hidden sm:block" style={{ fontFamily: 'Manrope', fontSize: '11px', color: '#747474' }}>
                                                    starts from
                                                </div>
                                                <div className="tracking-[-0.04em] font-semibold whitespace-nowrap text-[15px] sm:text-[18px]" style={{ fontFamily: 'Red Hat Display', color: '#101010' }}>
                                                    ₹{platform.price.toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); trackAffiliateClick(platform.platform, platform.price, platform.url) }}
                                                className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full border border-primary-default flex items-center justify-center cursor-pointer hover:bg-primary-default/10 transition touch-manipulation"
                                                aria-label={`View deal on ${platform.platform}`}>
                                                <ArrowUpRight size={14} className="text-primary-default" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-grey-4">
                        <p className="text-sm text-center" style={{ fontFamily: 'Manrope', color: '#747474', lineHeight: '20px' }}>
                            Prices per night from popular platforms. All prices are inclusive of fees &amp; taxes.
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    ) : null

    return (
        <>
            <div
                className="rounded-2xl border border-feature-card-border bg-white shadow-sm p-3 sm:p-5 relative"
                style={{ boxShadow: '0 2px 8px 0 var(--grey-5, #F8F8F8)' }}>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Close">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                )}

                {/* Header */}
                <div className="mb-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h3
                                className="text-lg font-bold"
                                style={{
                                    fontFamily: 'Red Hat Display',
                                    color: '#101010'
                                }}>
                                Best prices for you
                            </h3>
                            <div className="relative group">
                                <div className="flex items-center gap-1 cursor-help">
                                    <span
                                        className="text-xs font-medium"
                                        style={{
                                            fontFamily: 'Manrope',
                                            color: '#747474'
                                        }}>
                                        {usedFallbackSetup ? 'Prices displayed are per room · per night' : 'Prices displayed are per night'}{' '}
                                    </span>
                                    <Info className="w-4 h-4 text-grey-2" />
                                </div>
                                {/* Tooltip */}
                                <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                    <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                    Prices are charged per room, per night. For group stays, verify total cost on the provider’s site.{' '}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Platform list */}
                <div className="flex flex-col gap-3">
                    {displayPlatforms.map((platform, index) => {
                        const hasElaborateLogo = Boolean(platform.logo_url)
                        return (
                            <div
                                key={platform.platform + index}
                                className={`relative rounded-xl border box-border p-2 sm:p-3 transition-all ${platform.is_cheapest
                                    ? 'bg-secondary-green/10 border-secondary-green'
                                    : 'bg-white border-grey-4 hover:border-primary-default/30'
                                    }`}>
                                {/* Cheapest badge */}
                                {platform.is_cheapest && (
                                    <div className="absolute -top-2 left-4 bg-secondary-green text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wide">
                                        CHEAPEST
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    {/* Left: logo + room name stacked */}
                                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            {platform.platform === 'Rimigo' ? (
                                                <RimigoLogo />
                                            ) : (
                                                <img
                                                    src={platform.logo_url || getPlatformLogo(platform.platform)}
                                                    alt={platform.platform}
                                                    className={`object-contain shrink-0 ${hasElaborateLogo ? 'h-6 w-16' : 'w-8 h-6'}`}
                                                />
                                            )}
                                            {!hasElaborateLogo && platform.platform !== 'Rimigo' && (
                                                <span
                                                    className="tracking-[-0.02em] leading-[18px] font-semibold truncate"
                                                    style={{ fontFamily: 'Red Hat Display', fontSize: '16px', color: '#101010' }}>
                                                    {platform.platform}
                                                </span>
                                            )}
                                        </div>
                                        {platform.roomName && (
                                            <div className="flex items-start gap-1.5" title={platform.roomName}>
                                                <BedDouble className="w-3 h-3 text-grey-2 shrink-0 mt-0.5" />
                                                <span
                                                    className="text-[10px] font-medium text-grey-2 leading-tight"
                                                    style={{ fontFamily: 'Manrope' }}>
                                                    {platform.roomName}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {/* Right: price + CTA centered */}
                                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                        <div className="flex flex-col items-end">
                                            <div
                                                className="tracking-[-0.02em] leading-4 font-semibold whitespace-nowrap hidden sm:block"
                                                style={{ fontFamily: 'Manrope', fontSize: '11px', color: '#747474' }}>
                                                starts from
                                            </div>
                                            <div
                                                className="tracking-[-0.04em] font-semibold whitespace-nowrap text-[15px] sm:text-[18px]"
                                                style={{ fontFamily: 'Red Hat Display', color: '#101010' }}>
                                                ₹{platform.price.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); trackAffiliateClick(platform.platform, platform.price, platform.url) }}
                                            className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full border border-primary-default flex items-center justify-center cursor-pointer hover:bg-primary-default/10 transition touch-manipulation"
                                            aria-label={`View deal on ${platform.platform}`}>
                                            <ArrowUpRight size={14} className="text-primary-default" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* View all button */}
                {!expanded && platforms.length > 4 && (
                    <button
                        onClick={() => {
                            trackButtonClickCustom?.({
                                buttonPage: 'stay_detail_v1',
                                buttonName: 'view_all_prices',
                                buttonAction: 'expand_price_list',
                                extra: { total_platforms: platforms.length }
                            })

                            if (onToggleExpand) {
                                onToggleExpand()
                            } else {
                                setIsModalOpen(true)
                            }
                        }}
                        className="mt-4 w-full py-3 text-center font-bold text-primary-default hover:text-primary-dark transition-colors"
                        style={{
                            fontFamily: 'Manrope',
                            fontSize: '14px'
                        }}>
                        VIEW ALL ({platforms.length})
                    </button>
                )}

                {/* Footer text */}
                <div className="mt-4 pt-4 border-t border-grey-4">
                    <p
                        className="text-sm text-center"
                        style={{
                            fontFamily: 'Manrope',
                            color: '#747474',
                            lineHeight: '20px'
                        }}>
                        Prices/night from cheapest platform inclusive of fees & taxes.
                    </p>
                </div>
            </div>

            {modalPortal}
        </>
    )
}

export default PriceComparisonCard
