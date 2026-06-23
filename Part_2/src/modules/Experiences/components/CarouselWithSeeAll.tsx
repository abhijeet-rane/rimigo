import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface CarouselWithSeeAllProps {
    customTitle?: React.ReactNode
    title?: string
    groupType?: string
    countryId?: string | null
    countryName?: string | null
    isLoading?: boolean
    containerClassName?: string
    titleClassName?: string
    carouselClassName?: string
    /** Classes for the carousel's SCROLL container (the overflow-x-auto
     *  element). Padding here lives INSIDE the scroll viewport — cards
     *  start inset but scroll under the edges instead of clipping at a
     *  padded outer container. Pair with a `pl-0` containerClassName. */
    scrollContainerClassName?: string
    gradientStartColor?: string
    gradientEndColor?: string
    children: React.ReactNode
    onSeeAllClick?: () => void
    /** Override the "SEE ALL" button label (default: "SEE ALL") */
    seeAllLabel?: string

    rightGradientStyle?: string
    leftGradientStyle?: string
    /** Pass-through to GenericCarousel scrollControls (e.g. to hide arrow buttons) */
    scrollControls?: {
        rightScrollArrow?: string
        rightScrollBtn?: string
        leftArrowBtn?: string
        leftScrollBtn?: string
    }
    /** Optional node rendered to the LEFT of the SEE ALL button in the
     *  section header. Used by callers to slot an extra action into
     *  the header without forking this shared component. */
    headerTrailing?: React.ReactNode
    /** Optional node rendered alongside the mobile-only bottom SEE ALL
     *  link. Use this for actions that need to live in the section
     *  footer on small screens (where the header row is too tight). */
    mobileFooterTrailing?: React.ReactNode
    /** Centre the mobile-only bottom SEE ALL link instead of right-aligning
     *  it. Used when there's no `mobileFooterTrailing` to balance the row. */
    centerMobileSeeAll?: boolean
}

const CarouselWithSeeAll: React.FC<CarouselWithSeeAllProps> = ({
    customTitle,
    title,
    groupType,
    countryId,
    countryName,
    isLoading = false,
    containerClassName,
    titleClassName,
    carouselClassName,
    scrollContainerClassName,
    gradientStartColor,
    gradientEndColor,
    children,
    onSeeAllClick,
    seeAllLabel,

    rightGradientStyle,
    leftGradientStyle,
    scrollControls,
    headerTrailing,
    mobileFooterTrailing,
    centerMobileSeeAll = false
}) => {
    const seeAllText = seeAllLabel || 'SEE ALL'
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { trackButtonClickCustom } = usePostHog()

    // Handle SEE ALL button click
    const handleSeeAllClick = () => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_SEE_ALL_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { groupType, countryId, sectionTitle: title }
        })
        if (onSeeAllClick) {
            onSeeAllClick()
            return
        }

        const params = new URLSearchParams(searchParams)

        // Set group type
        if (groupType) {
            params.set('groupType', groupType)
        }

        // Set country info if available
        if (countryId) {
            params.set('country_id', countryId)
        }

        if (countryName) {
            // Format country name for URL (replace spaces with hyphens, lowercase)
            const formattedCountryName = countryName.replace(/ /g, '-').toLowerCase()
            params.set('country_name', formattedCountryName)
        }

        // Navigate to experiences list page
        navigate(`/experiences/?${params.toString()}`)
    }

    // Show loading state
    if (isLoading) {
        return (
            <GenericCard className={cn('container  mx-auto  py-6 border-b border-grey-4 px-4', containerClassName)}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className={cn('text-2xl font-bold', titleClassName)}>{title}</h2>
                </div>
                <div className="flex gap-4 overflow-hidden">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="min-w-[280px] h-[350px] bg-gray-200 animate-pulse rounded-lg"
                        />
                    ))}
                </div>
            </GenericCard>
        )
    }

    return (
        <div className={cn('mx-auto sm:pl-6 lg:pl-4 pl-4 p-4', containerClassName)}>
            {/* Header with Title, optional trailing slot, and SEE ALL button */}
            <div className="flex items-center justify-between mb-4 max-md:pt-[16px] pr-4 gap-2">
                {customTitle ? (
                    customTitle
                ) : (
                    <p className={cn('text-[18px] leading-[100%] tracking-[-2%] font-[467] font-red-hat-display ', titleClassName)}>{title}</p>
                )}
                <div className="flex items-center gap-3 shrink-0">
                    {headerTrailing}
                    <button
                        onClick={handleSeeAllClick}
                        className="hidden md:flex items-center gap-[0.5px] text-primary-default hover:text-primary-dark transition-colors cursor-pointer hover:underline">
                        <p className="text-[14px] leading-[18px]  font-[700] font-red-hat-display text-primary-default ">{seeAllText}</p>
                        <ChevronRight className="w-4 h-4 text-primary-default" />
                    </button>
                </div>
            </div>

            {/* Carousel */}
            <GenericCarousel
                gap={16}
                containerClassName={cn('', scrollContainerClassName)}
                className={cn('w-full', carouselClassName)}
                gradientStartColor={gradientStartColor}
                gradientEndColor={gradientEndColor}
                gradientLeftStartColor={gradientStartColor}
                rightGradientStyle={rightGradientStyle}
                leftGradientStyle={leftGradientStyle}
                scrollControls={scrollControls}>
                {children}
            </GenericCarousel>
            <div className={cn('md:hidden flex mt-4 items-center gap-3 px-4', centerMobileSeeAll ? 'justify-center' : 'justify-between')}>
                {!centerMobileSeeAll && (mobileFooterTrailing ?? <span />)}
                <button
                    onClick={handleSeeAllClick}
                    className="flex items-center gap-[0.5px] text-primary-default hover:text-primary-dark transition-colors cursor-pointer hover:underline">
                    <p className="text-[14px] leading-[18px] font-[700] font-red-hat-display text-primary-default">{seeAllText}</p>
                    <ChevronRight className="w-4 h-4 text-primary-default" />
                </button>
            </div>
        </div>
    )
}

export default CarouselWithSeeAll
