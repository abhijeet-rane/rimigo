import TourCard from '../components/HowToBook/TourCard'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import { AdaptedTourResponseType } from '@/modules/Experiences/types/toursResponseTypes'
import { BookingWindow } from '@/modules/Experiences/types/experienceDetailTypes'
import { useEffect } from 'react'
import CustomShimmer from '@/components/shared/Shimmer'
import { getPlatformLogoURL } from '@/constants/icons/platformIcons'
import { ExternalLink } from 'lucide-react'
import { createGuardedAffiliateWindowOpen } from '@/utils/guardedAffiliateWindowOpen'

// TourCardShimmer matches the exact layout of TourCard (262x240)
export const TourCardShimmer = () => {
    return (
        <div className="w-[262px] h-[240px] shrink-0 relative rounded-2xl bg-white border-primary-default border-solid border box-border flex flex-col items-start gap-4 p-4">
            {/* Top section with platform logo/name and recommended badge */}
            <div className="self-stretch flex items-start justify-between gap-5">
                {/* Platform section */}
                <div className="flex items-center gap-2">
                    <CustomShimmer
                        height={20}
                        radius={9999}
                        className="w-5"
                    />
                    <CustomShimmer
                        height={14}
                        radius={4}
                        className="w-[60px]"
                    />
                </div>
                {/* Recommended badge */}
                <CustomShimmer
                    height={22}
                    radius={8}
                    className="w-[100px]"
                />
            </div>

            {/* Content section */}
            <div className="self-stretch flex-1 flex flex-col items-start justify-between gap-5">
                <div className="self-stretch flex flex-col items-start gap-3 w-full">
                    {/* Title - 2 lines */}
                    <div className="self-stretch flex flex-col gap-2">
                        <CustomShimmer
                            height={20}
                            radius={4}
                            className="w-full"
                        />
                        <CustomShimmer
                            height={20}
                            radius={4}
                            className="w-[80%]"
                        />
                    </div>
                    {/* Duration and rating pills */}
                    <div className="flex items-center gap-2.5">
                        <CustomShimmer
                            height={20}
                            radius={4}
                            className="w-[60px]"
                        />
                        <CustomShimmer
                            height={20}
                            radius={4}
                            className="w-[50px]"
                        />
                    </div>
                </div>

                {/* Bottom section with price and book button */}
                <div className="self-stretch flex items-end justify-between gap-5">
                    {/* Price section */}
                    <div className="flex flex-col items-start gap-0.5">
                        <CustomShimmer
                            height={12}
                            radius={4}
                            className="w-[30px]"
                        />
                        <CustomShimmer
                            height={32}
                            radius={4}
                            className="w-[80px]"
                        />
                        <CustomShimmer
                            height={12}
                            radius={4}
                            className="w-[50px]"
                        />
                    </div>
                    {/* Book button */}
                    <CustomShimmer
                        height={44}
                        radius={6}
                        className="w-[80px]"
                    />
                </div>
            </div>
        </div>
    )
}

const TourListRow = ({ tour, isCheapest }: { tour: AdaptedTourResponseType; isCheapest: boolean }) => {
    const platformName = tour.platform_name || ''
    const platformLogo = getPlatformLogoURL(platformName)
    const price = tour.price?.min_price ?? null
    const currency = tour.price?.currency || ''
    const link = tour.link || ''
    const tourName = (tour?.name || '').trim()
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!link) return
        const open = createGuardedAffiliateWindowOpen(link)
        open?.()
    }
    const viewDealClass = isCheapest
        ? 'bg-primary-default border border-primary-default text-white font-red-hat-display font-bold text-[13px] tracking-[-0.26px] leading-[18px] px-3 py-1.5 rounded flex items-center gap-1 justify-center shrink-0 whitespace-nowrap'
        : 'border border-primary-default text-primary-default bg-white font-red-hat-display font-bold text-[13px] tracking-[-0.26px] leading-[18px] px-3 py-1.5 rounded flex items-center gap-1 justify-center shrink-0 whitespace-nowrap'

    const logoNode = platformLogo ? (
        <img
            src={platformLogo}
            alt={platformName}
            className="h-7 w-auto object-contain shrink-0"
        />
    ) : (
        <span className="text-sm font-semibold font-manrope text-grey-0 truncate">
            {platformName}
        </span>
    )

    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="bg-white flex flex-col gap-2 px-3 py-3 rounded-[8px] w-full">
            {price != null ? (
                <>
                    {/* Row 1: logo + CHEAPEST on the left, price on the right. */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            {logoNode}
                            {isCheapest && (
                                <span className="shrink-0 bg-[#cceee4] text-[#006548] text-[11px] font-extrabold font-manrope tracking-[-0.22px] leading-4 px-1.5 py-0.5 rounded-2xl whitespace-nowrap">
                                    CHEAPEST
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                            <span className="text-[16px] font-semibold font-red-hat-display text-grey-0 tracking-[-0.32px] leading-5 whitespace-nowrap">
                                {currency ? `${currency} ` : '₹'}
                                {Number(price).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-[12px] font-semibold font-manrope text-grey-2 tracking-[-0.24px] leading-4">
                                /person
                            </span>
                        </div>
                    </div>

                    {/* Row 2: tour name (left, clamp 2 lines) + View deal (right). */}
                    <div className="flex items-center justify-between gap-3">
                        {tourName ? (
                            <p className="font-red-hat-display text-[14px] font-semibold text-grey-0 leading-[18px] line-clamp-2 min-w-0 flex-1">
                                {tourName}
                            </p>
                        ) : (
                            <span className="flex-1" />
                        )}
                        <span className={viewDealClass}>
                            View deal
                            <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                    </div>
                </>
            ) : (
                <>
                    {/* Row 1: logo only. */}
                    <div className="flex items-center min-w-0">{logoNode}</div>

                    {/* Row 2: tour name (left, clamp 2 lines) + View deal (right). */}
                    <div className="flex items-center justify-between gap-3">
                        {tourName ? (
                            <p className="font-red-hat-display text-[14px] font-semibold text-grey-0 leading-[18px] line-clamp-2 min-w-0 flex-1">
                                {tourName}
                            </p>
                        ) : (
                            <span className="flex-1" />
                        )}
                        <span className={viewDealClass}>
                            View deal
                            <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                    </div>
                </>
            )}
        </a>
    )
}

const ToursSection = ({
    tours,
    isLoading,
    isPolling = false,
    setIsVisible,
    isPublicView = false,
    triggerType='TourCard',
    experienceId,
    viewMode = 'carousel',
}: {
    tours: AdaptedTourResponseType[]
    isLoading: boolean
    isPolling?: boolean
    bookingWindow: BookingWindow | null
    setIsVisible: (isVisible: boolean) => void
    isPublicView?: boolean
    triggerType?:string
    experienceId?: string
    viewMode?: 'carousel' | 'list'
}) => {
    const hasTours = tours && tours.length > 0
    // When we have the tours response but live data is still arriving, keep shimmers visible
    const showShimmerCards = isLoading || (!hasTours && isPolling)

    // Update visibility based on tours data
    useEffect(() => {
        if (!isLoading) {
            // Always show for public view (dummy tours), hide if no tours for authenticated users
            if (isPublicView) {
                setIsVisible(true)
            } else if (!tours || tours.length === 0) {
                setIsVisible(false)
            } else {
                setIsVisible(true)
            }
        }
    }, [isLoading, tours, setIsVisible, isPublicView])

    // If there's nothing to render and we're not waiting on data, hide the section
    if (!showShimmerCards && !hasTours && !isPublicView) {
        return null
    }

    if (viewMode === 'list') {
        // Lowest min_price wins the CHEAPEST pill; tours with no price are
        // ineligible. Mirrors the stays-tab "cheapest deal" highlight.
        const cheapestId = (() => {
            let best: { id: string; price: number } | null = null
            for (const t of tours) {
                const p = t.price?.min_price
                if (typeof p !== 'number' || !Number.isFinite(p)) continue
                if (!best || p < best.price) best = { id: t.id, price: p }
            }
            return best?.id ?? null
        })()
        // Gray section bg + tight stack — copy of the stays-tab deals panel
        // (`bg-[#f5f4f7] rounded-[8px] p-2 flex flex-col gap-2`) so the
        // surrounding chrome looks identical.
        return (
            <div className="flex flex-col gap-2 bg-[#f5f4f7] rounded-[8px] p-2 w-full">
                {showShimmerCards ? (
                    <>
                        <CustomShimmer height={108} className="w-full rounded-[8px]" />
                        <CustomShimmer height={108} className="w-full rounded-[8px]" />
                        <CustomShimmer height={108} className="w-full rounded-[8px]" />
                    </>
                ) : (
                    tours.map((tour) => (
                        <TourListRow
                            key={tour.id}
                            tour={tour}
                            isCheapest={tour.id === cheapestId}
                        />
                    ))
                )}
            </div>
        )
    }

    return (
        <div className="w-full ">
            {/* <div className="mb-4 flex items-center justify-between gap-2">
                <SectionTitle title={SECTION_TITLE} />
                {bookingWindow && <Pill bookingWindow={bookingWindow} />}
            </div> */}

            <div className="relative -m-4 max-md:-mr-9">
                <GenericCarousel
                    className=""
                    gap={16}
                    scrollControls={{
                        rightScrollBtn:
                            '!bg-gradient-to-l !from-white !via-white/95 !to-white/40 !border-white/60 !shadow-[0_4px_18px_rgba(15,23,42,0.18)]',
                        leftScrollBtn:
                            '!bg-gradient-to-r !from-white !via-white/95 !to-white/40 !border-white/60 !shadow-[0_4px_18px_rgba(15,23,42,0.18)]',
                    }}>
                {/* The carousel arrow buttons inside the sneak-peek booking-links
                    rail get a white→transparent gradient bg so they blend into
                    the card edge instead of looking like a hard solid pill
                    floating over the cards. */}
                    {showShimmerCards ? (
                        // Show shimmer placeholders while loading
                        <>
                            <TourCardShimmer />
                            <TourCardShimmer />
                            <TourCardShimmer />
                        </>
                    ) : (
                        // Show actual tour cards
                        tours.map((tour) => (
                            <TourCard
                                triggerType={triggerType}
                                key={tour.id}
                                tour={tour}
                                isPolling={isPolling}
                                experienceId={experienceId}
                            />
                        ))
                    )}
                </GenericCarousel>

                {/* Overlay for public users */}
                {/* {isPublicView && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
                        <div className="text-center px-6 py-8 max-w-md">
                            <div className="mb-4">
                                <svg
                                    className="w-12 h-12 mx-auto text-indigo-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Sign in to view booking options</h3>
                            <p className="text-gray-600 mb-6">Create an account or log in to see available tours and book your experience</p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <a
                                    href="/login"
                                    className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                                    Sign In
                                </a>
                                <a
                                    href="/signup"
                                    className="inline-block px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium">
                                    Create Account
                                </a>
                            </div>
                        </div>
                    </div>
                )} */}
            </div>
        </div>
    )
}

export default ToursSection
