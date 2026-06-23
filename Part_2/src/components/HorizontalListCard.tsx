import { Heart, ChevronLeft, ChevronRight, Play, ChevronDown, MapPin, Plus } from 'lucide-react'
import AddToursDialog from '@/modules/Tripboard/components/AddToursDialog'
import { ReactNode, useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import { NO_EXPERIENCE_IMAGE } from '@/constants/icons/svgFromCDN'
import AddToCollectionButton from '@/components/common/AddToCollectionButton'
import type { BadgeProps } from './ListCard'
import { useToursForExperience } from '@/modules/Experiences/hooks/useToursForExperience'
import { useSortedToursByPriority, getCheapestTourId } from '@/modules/Experiences/hooks/useSortedToursByPriority'
import TourCard from '@/modules/Experiences/components/ExperienceDetails/components/HowToBook/TourCard'
import TourCuratePopover from '@/modules/Tripboard/components/TourCuratePopover'
import { useCollectionIdentifier } from '@/modules/Tripboard/context/TripCollectionRecommendationsContext'
import type { AdaptedTourResponseType } from '@/modules/Experiences/types/toursResponseTypes'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import { getPlatformLogoURL } from '@/constants/icons/platformIcons'
import Typography from '@/components/shared/Typography'
import SneakPeekInfoStrip from '@/components/shared/SneakPeekInfoStrip'
import { getExperienceSneakPeek } from '@/modules/Experiences/api/experienceApi'
import { useSneakPeekData } from '@/modules/Acitvities/hooks/useSneakPeekData'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface HorizontalListCardProps {
    // Image
    image?: string
    images?: string[]
    imageAlt?: string

    // Interaction props
    onClick?: () => void
    onMouseEnter?: () => void
    onMouseLeave?: () => void

    // Top Badge (e.g., rating badge)
    topBadge?: BadgeProps

    // Bottom Badges (e.g., review pills)
    bottomBadges?: BadgeProps

    // Main Content
    title: string
    city?: string
    description?: string | null
    category?: string | null
    categoryIcon?: string | null
    categories?: string[] | null
    categoryIconsMap?: Record<string, string | undefined>

    // Shortlist button
    showShortlistButton?: boolean
    isShortlisted?: boolean
    isShortlisting?: boolean
    onShortlistClick?: (e: React.MouseEvent) => void

    // Sneak Peek button
    showSneakPeekButton?: boolean
    onSneakPeekClick?: (e: React.MouseEvent) => void
    sneakPeekUserImage?: string

    // View Tours button
    showViewToursButton?: boolean
    onViewToursClick?: () => void

    // Add to Collection button
    showAddToCollectionButton?: boolean
    onAddToCollectionClick?: (e: React.MouseEvent) => void
    isRimigoInternal?: boolean
    isAddingToCollection?: boolean

    // Tour integration
    experienceId?: string // Experience ID to fetch tours
    isPublicView?: boolean // Whether this is a public view (affects tour fetching)
    shouldLoadTours?: boolean // Whether to fetch tours for this experience (for pagination)
    checkIn?: string | null // Check-in date for tours (YYYY-MM-DD format)

    // Sneak-peek fallback for empty-tours state. Opt-in — only collection view should enable this.
    enableSneakPeekFallback?: boolean

    // Reports to parent once the tours query has settled whether this experience has any tours.
    // Parent uses this to filter zero-tour experiences out of the rendered list.
    onTourAvailabilityReport?: (experienceId: string, hasTours: boolean) => void

    // Custom content
    customContent?: ReactNode
    children?: ReactNode

    // Styling
    className?: string
    fullHeight?: boolean

    handleViewDetailsClick?: () => void
    handleViewOnMapClick?: () => void
}

const HorizontalListCard = ({
    image,
    images,
    imageAlt = '',
    onClick,
    onMouseEnter,
    onMouseLeave,
    topBadge,
    bottomBadges,
    title,
    city,
    description: _description, // Prefixed with _ to indicate intentionally unused
    category: _category, // Prefixed with _ to indicate intentionally unused
    categoryIcon: _categoryIcon, // Prefixed with _ to indicate intentionally unused
    categories: _categories, // Prefixed with _ to indicate intentionally unused
    categoryIconsMap: _categoryIconsMap, // Prefixed with _ to indicate intentionally unused
    showShortlistButton = false,
    isShortlisted = false,
    isShortlisting = false,
    onShortlistClick,
    showSneakPeekButton = false,
    onSneakPeekClick,
    sneakPeekUserImage,
    showViewToursButton: _showViewToursButton, // Prefixed with _ to indicate intentionally unused
    onViewToursClick: _onViewToursClick, // Prefixed with _ to indicate intentionally unused
    showAddToCollectionButton = false,
    onAddToCollectionClick,
    isRimigoInternal = false,
    isAddingToCollection = false,
    experienceId,
    isPublicView = false,
    shouldLoadTours = true, // Default to true for backward compatibility
    checkIn,
    enableSneakPeekFallback = false,
    onTourAvailabilityReport,
    customContent: _customContent, // Prefixed with _ to indicate intentionally unused
    children: _children, // Prefixed with _ to indicate intentionally unused
    className = '',
    fullHeight: _fullHeight = false, // Prefixed with _ to indicate intentionally unused
    handleViewDetailsClick,
    handleViewOnMapClick
}: HorizontalListCardProps) => {
    // Suppress unused variable warnings
    void _customContent
    void _children
    void _fullHeight
    void _description
    void _category
    void _categoryIcon
    void _categories
    void _categoryIconsMap
    void _showViewToursButton
    void _onViewToursClick

    // Determine which images to use
    const imageList = images && images.length > 0 ? images : image ? [image] : [NO_EXPERIENCE_IMAGE]
    const hasMultipleImages = imageList.length > 1

    // Carousel state
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)
    const { trackButtonClickCustom } = usePostHog()

    useEffect(() => {
        if (!api) {
            return
        }

        setCurrent(api.selectedScrollSnap())

        api.on('select', () => {
            setCurrent(api.selectedScrollSnap())
        })
    }, [api])

    const handleShortlistClick = (e: React.MouseEvent) => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
            buttonName: isShortlisted ? POSTHOG_EVENTS.EXPERIENCE_SHORTLIST_REMOVE : POSTHOG_EVENTS.EXPERIENCE_SHORTLIST_ADD,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                experienceId
            }
        })

        e.stopPropagation()
        onShortlistClick?.(e)
    }

    const handleSneakPeekClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        onSneakPeekClick?.(e)
    }

    const handleAddToCollectionClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        onAddToCollectionClick?.(e)
    }

    const shouldShowAddToCollection = showAddToCollectionButton && isRimigoInternal && onAddToCollectionClick

    const [isToursExpanded, setIsToursExpanded] = useState(false)
    const [isAddToursOpen, setIsAddToursOpen] = useState(false)
    const canAddTours = isRimigoInternal && !!experienceId

    // Fetch tours for this experience (only if shouldLoadTours is true)
    const {
        tours,
        isLoading: isToursLoading,
        isPolling: isToursPolling
    } = useToursForExperience(experienceId, isPublicView, shouldLoadTours, checkIn)

    // Priority-tier sort: recommended first, then cheapest, then rest by price asc.
    const sortedTours = useSortedToursByPriority(tours)
    const cheapestTourId = useMemo(() => getCheapestTourId(tours), [tours])

    // Curate popover hosted once at the list level (not per TourCard) so it survives the
    // reorder that fires when a recommendation is toggled — otherwise the toggled card
    // jumps to the primary slot, remounts, and an inline popover (with its "Recommend for
    // everyone?" prompt) closes immediately.
    const curateCollectionIdentifier = useCollectionIdentifier()
    const canStaffCurate = isRimigoInternal && !!experienceId
    const [curatingTour, setCuratingTour] = useState<AdaptedTourResponseType | null>(null)

    const hasTours = sortedTours.length > 0
    // Show shimmer when: API is loading, or polling without tours, or when shouldLoadTours is true and we're waiting for data
    const showShimmerTours = (shouldLoadTours && isToursLoading) || (!hasTours && isToursPolling)

    // Once the tours query has settled, tell the parent list whether this experience has any tours.
    // Parent uses this to filter zero-tour experiences out of the rendered list.
    const toursSettled = shouldLoadTours && !isToursLoading && !isToursPolling
    useEffect(() => {
        if (!onTourAvailabilityReport || !experienceId || !toursSettled) return
        onTourAvailabilityReport(experienceId, hasTours)
    }, [toursSettled, hasTours, experienceId, onTourAvailabilityReport])
    // Show empty state when: tours should be loaded, loading is complete, and no tours are available
    const showEmptyTours = shouldLoadTours && !isToursLoading && !hasTours && !isToursPolling

    // Opt-in sneak-peek fallback — fires only when the empty-tours state is reached
    // and the caller (e.g. collection view) has enabled it.
    const shouldFetchSneakPeek = enableSneakPeekFallback && showEmptyTours && Boolean(experienceId)

    const { data: sneakPeekData, isLoading: isSneakPeekLoading, isFetching: isSneakPeekFetching } = useQuery({
        queryKey: ['experienceSneakPeek', experienceId],
        queryFn: () => getExperienceSneakPeek(experienceId as string),
        enabled: shouldFetchSneakPeek
    })

    // While fallback is enabled and sneak-peek is still resolving, treat it as a loading state
    // so the "No tours available" card doesn't flash before real data arrives.
    const isSneakPeekPending = enableSneakPeekFallback && shouldFetchSneakPeek && (isSneakPeekLoading || isSneakPeekFetching || !sneakPeekData)

    const { bestMonths, duration, walkingRequired, valueForMoney } = useSneakPeekData(sneakPeekData)
    const hasAnySneakPeekData = Boolean(bestMonths || duration || walkingRequired || valueForMoney)

    // Priority sort puts the recommended tour first; otherwise the cheapest.
    const primaryTour = useMemo(() => {
        if (!hasTours) return null
        return sortedTours[0] ?? null
    }, [hasTours, sortedTours])

    // Get remaining tours (excluding primary tour)
    const remainingTours = useMemo(() => {
        if (!hasTours || !primaryTour) return []
        return sortedTours.filter((tour) => tour.id !== primaryTour.id)
    }, [hasTours, primaryTour, sortedTours])

    // Get unique provider icons from remaining tours
    const remainingProviderIcons = useMemo(() => {
        if (remainingTours.length === 0) return []

        // Get unique platform names from remaining tours
        const uniquePlatforms = Array.from(
            new Set(remainingTours.map((tour) => tour.platform_name).filter((platform): platform is string => Boolean(platform)))
        )

        // Get logos for each platform and filter out nulls
        return uniquePlatforms
            .map((platform) => ({
                platform,
                logo: getPlatformLogoURL(platform)
            }))
            .filter((item): item is { platform: string; logo: string } => item.logo !== null)
            .slice(0, 3) // Limit to 3 icons to avoid clutter
    }, [remainingTours])

    // Determine tag type for primary tour
    const primaryTourTagType = useMemo(() => {
        if (!primaryTour || !hasTours) return undefined
        if (primaryTour.is_personally_recommended) {
            return 'recommended_for_you' as const
        }
        if (primaryTour.is_recommended) {
            return 'recommended' as const
        }
        if (primaryTour.id === cheapestTourId) {
            return 'cheapest' as const
        }
        return undefined
    }, [primaryTour, cheapestTourId, hasTours])

    const handleViewToursToggle = () => {
        setIsToursExpanded(!isToursExpanded)
    }

    return (
        <div className={`border border-[#dfdde0] hover:border-grey-0 rounded-xl w-full max-w-full overflow-hidden bg-white shadow-[0px_2px_8px_0px_#dfdde0] transition-colors ${className}`}>
            {/* Experience Name - Above the card */}

            <div className="flex flex-col gap-4 ">
                <div className="flex flex-col gap-1 md:gap-0 md:flex-row md:justify-between md:items-center ">
                    {/* left side */}
                    <div className="w-full md:w-[calc(49% - 8px)] pr-3 py-4 pl-4">
                        {title && (
                            <h3 className="w-full text-[18px] md:text-[16px] font-red-hat-display leading-[18px] tracking-[-2%] font-[550] text-grey-0 cursor-pointer mb-2  flex items-center justify-between gap-2">
                                <span className="flex-1 line-clamp-2">{title}</span>
                                {city && (
                                    <span className="text-[14px] md:text-[14px] font-manrope font-normal text-grey-2 shrink-0 whitespace-nowrap flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-grey-2 shrink-0 " /> {city}
                                    </span>
                                )}
                            </h3>
                        )}

                        {/* Image Section - Full width on mobile, 50% on desktop.
                            Image height is fixed at 240px — we intentionally
                            do NOT spread `className` here so an outer
                            `h-full` (for grid-cell stretching) doesn't
                            inflate the image. `className` is applied to
                            the outermost card wrapper only. */}
                        {imageList.length > 0 && (
                            <div
                                className="group relative shrink-0 w-full md:w-full h-[240px] rounded-2xl overflow-hidden transition-shadow bg-natural-white"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                                onClick={(e) => {
                                    // Don't trigger card click if clicking on carousel navigation buttons
                                    const target = e.target as HTMLElement
                                    if (target.closest('button[type="button"]') && target.closest('.absolute')) {
                                        return
                                    }
                                    trackButtonClickCustom?.({
                                        buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
                                        buttonName: POSTHOG_EVENTS.EXPERIENCE_CARD_IMAGE_CLICK,
                                        buttonAction: POSTHOG_ACTIONS.CLICK,
                                        extra: {
                                            experienceId
                                        }
                                    })

                                    onClick?.()
                                }}>
                                <div className="relative overflow-hidden cursor-pointer w-full h-full rounded-2xl">
                                    {hasMultipleImages ? (
                                        <Carousel
                                            setApi={setApi}
                                            className="w-full h-full cursor-pointer rounded-2xl overflow-hidden"
                                            opts={{
                                                align: 'start',
                                                loop: false,
                                                dragFree: false
                                            }}>
                                            <CarouselContent className="h-full cursor-pointer">
                                                {imageList.map((img, index) => (
                                                    <CarouselItem
                                                        key={index}
                                                        className="h-full cursor-pointer">
                                                        <img
                                                            src={img}
                                                            alt={`${imageAlt} ${index + 1}`}
                                                            className="w-full h-[240px] md:h-[300px] object-cover cursor-pointer rounded-2xl"
                                                            draggable={false}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </CarouselItem>
                                                ))}
                                            </CarouselContent>
                                        </Carousel>
                                    ) : (
                                        <img
                                            src={imageList[0]}
                                            alt={imageAlt}
                                            className="w-[350px] md:w-[400px] h-[300px] md:h-[350px] object-cover rounded-2xl cursor-pointer"
                                            draggable={false}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    )}

                                    {/* Navigation Arrows */}
                                    {hasMultipleImages && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    e.preventDefault()
                                                    if (api) {
                                                        api.scrollPrev()
                                                    }
                                                }}
                                                disabled={!api || current === 0}
                                                className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full bg-white/80 hover:bg-white border border-feature-card-border flex items-center justify-center transition-opacity opacity-100 md:opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-not-allowed pointer-events-auto cursor-pointer">
                                                <ChevronLeft className="h-4 w-4 text-grey-0" />
                                                <span className="sr-only">Previous image</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    e.preventDefault()
                                                    if (api) {
                                                        api.scrollNext()
                                                    }
                                                }}
                                                disabled={!api || current === imageList.length - 1}
                                                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full bg-white/80 hover:bg-white border border-feature-card-border flex items-center justify-center transition-opacity opacity-100 md:opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-not-allowed pointer-events-auto cursor-pointer">
                                                <ChevronRight className="h-4 w-4 text-grey-0" />
                                                <span className="sr-only">Next image</span>
                                            </button>

                                            {/* Pagination Dots */}
                                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                                                {imageList.map((_, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            e.preventDefault()
                                                            if (api) {
                                                                api.scrollTo(index)
                                                            }
                                                        }}
                                                        disabled={!api}
                                                        className={`h-1.5 rounded-full transition-all pointer-events-auto cursor-pointer ${
                                                            index === current ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/75'
                                                        }`}
                                                        aria-label={`Go to image ${index + 1}`}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {/* Sneak Peek Button */}
                                    {showSneakPeekButton && (
                                        <div className="absolute left-2 md:left-3 top-2 md:top-3 z-20 flex opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity pointer-events-auto">
                                            <button
                                                type="button"
                                                aria-label="Sneak Peek"
                                                onClick={handleSneakPeekClick}
                                                className="inline-flex items-center gap-1.5 pl-1 pr-2 md:pr-3 py-1.5 rounded-xl bg-white/80 hover:bg-white border border-feature-card-border hover:shadow-md transition-all shadow-[0px_2px_8px_#aeaeae] cursor-pointer">
                                                {sneakPeekUserImage ? (
                                                    <div
                                                        className="w-5 h-7 rounded-[4px] bg-white flex items-center justify-center"
                                                        style={{
                                                            backgroundImage: `url(${sneakPeekUserImage})`,
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'center'
                                                        }}>
                                                        <Play className="w-3 h-3 text-white ml-0.5" />
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-7 rounded-[4px] bg-white flex items-center justify-center">
                                                        <Play className="w-3 h-3 text-grey-0 ml-0.5" />
                                                    </div>
                                                )}
                                                <span className="text-xs md:text-[12px] font-semibold font-red-hat-display">Sneak Peek</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Top Badge */}
                                    {topBadge && (
                                        <div
                                            className={`absolute opacity-96 ${
                                                showSneakPeekButton ? 'left-2 md:left-3 top-12 md:top-14' : 'left-2 md:left-3 top-2 md:top-3'
                                            } z-20 inline-flex items-center gap-1 pl-2 pr-2 md:pr-3 py-1.5 rounded-full border border-[${topBadge.bgColor}] ${
                                                topBadge.textColor || ''
                                            } bg-grey_5`}>
                                            {topBadge.icon && (
                                                <img
                                                    src={topBadge.icon as string}
                                                    alt={topBadge.label}
                                                    className="w-4 h-4 md:w-5 md:h-5 object-contain"
                                                />
                                            )}
                                            <span className="text-[10px] md:text-xs font-semibold text-header-black">{topBadge.label}</span>
                                        </div>
                                    )}

                                    {/* Shortlist Button */}
                                    {showShortlistButton && (
                                        <div className="absolute right-2 md:right-4 top-2 md:top-3 z-20">
                                            <button
                                                type="button"
                                                aria-label="Save"
                                                aria-pressed={isShortlisted}
                                                disabled={isShortlisting}
                                                onClick={handleShortlistClick}
                                                className={`rounded-full border border-feature-card-border p-1.5 md:p-2 shadow-sm hover:shadow-md transition-shadow ${
                                                    isShortlisted ? 'bg-white' : 'bg-transparent'
                                                } ${isShortlisting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <Heart
                                                    className={`w-4 h-4 transition-colors ${
                                                        isShortlisted ? 'text-primary-default fill-primary-default' : 'text-white'
                                                    } ${isShortlisting ? 'animate-pulse' : ''}`}
                                                />
                                            </button>
                                        </div>
                                    )}

                                    {/* Add to Collection Button */}
                                    {shouldShowAddToCollection && (
                                        <div
                                            className={`absolute ${
                                                showShortlistButton ? 'right-2 md:right-3 top-12 md:top-14' : 'right-2 md:right-3 top-2 md:top-3'
                                            } z-20`}>
                                            <AddToCollectionButton
                                                ariaLabel="Add to collection"
                                                onAddToCollection={async () => {
                                                    const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent
                                                    handleAddToCollectionClick(syntheticEvent)
                                                }}
                                                isLoading={isAddingToCollection}
                                            />
                                        </div>
                                    )}

                                    {/* Bottom Badges */}
                                    {bottomBadges && (
                                        <div
                                            className={`absolute bottom-2 md:bottom-3 left-2 md:left-3 z-20 inline-flex items-center gap-1 pl-2 pr-2 md:pr-3 py-1.5 rounded-full ${
                                                bottomBadges.bgColor || ''
                                            } ${bottomBadges.textColor || ''}`}
                                            style={{
                                                boxShadow: bottomBadges.shadowColor ? `0px 2px 16px ${bottomBadges.shadowColor}` : undefined
                                            }}>
                                            {bottomBadges.icon && <span className="text-sm md:text-base leading-none">{bottomBadges.icon}</span>}
                                            <span className="text-[10px] md:text-xs font-semibold">{bottomBadges.label}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons Row - Below both image and tour card */}
                        {(hasTours || showShimmerTours || showEmptyTours) && (
                            <div className="hidden w-full md:flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3 justify-between md:mt-2">
                                {/* View Details and View on Map Buttons */}
                                <div className="flex items-center gap-2 w-full min-w-0 shrink">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleViewDetailsClick?.()
                                        }}
                                        className="flex-1 min-w-0 px-3 md:px-4 py-2 rounded-md bg-white border border-grey-4 text-grey-0 font-red-hat-display font-semibold text-sm hover:bg-grey-4 transition-colors cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis">
                                        View Details
                                    </button>
                                    {handleViewOnMapClick && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleViewOnMapClick()
                                            }}
                                            className="flex-1 min-w-0 px-3 md:px-4 py-2 rounded-md bg-white border border-grey-4 text-grey-0 font-red-hat-display font-semibold text-sm hover:bg-grey-4 transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 overflow-hidden">
                                            <MapPin className="w-4 h-4 shrink-0" />
                                            <span className="hidden sm:inline truncate">View on Map</span>
                                            <span className="sm:hidden">Map</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* right side */}
                    <div className="w-full md:w-[calc(51% + 8px)] flex flex-col gap-2 items-center justify-center border-l border-grey-4 px-4 md:px-0 md:pl-3 md:py-4 md:pr-4 pb-4 md:pb-4 ">
                        {/* dummy area for title and city */}
                        {title && (
                            <h3 className="hidden md:flex w-full text-[18px] md:text-[16px] font-red-hat-display leading-[18px] tracking-[-2%] font-[550] text-grey-0 cursor-pointer mb-2  items-center justify-between gap-2">
                                <span className="flex-1 line-clamp-2 h-[16px]"></span>
                                {city && (
                                    <span className="text-[14px] md:text-[14px] font-manrope font-normal text-grey-2 shrink-0 whitespace-nowrap flex items-center gap-1 h-[16px]">
                                        {/* <MapPin className="w-3 h-3 text-grey-2 shrink-0 " /> */}
                                    </span>
                                )}
                            </h3>
                        )}

                        {/* Tour Card Section - Responsive container for 280px card */}
                        {(hasTours || showShimmerTours || showEmptyTours) && (
                            <div className="w-full md:w-full flex items-center justify-center md:items-end  md:px-0">
                                {showShimmerTours ? (
                                    <div className="w-full max-w-[280px] h-[240px] bg-grey-5 rounded-2xl animate-pulse" />
                                ) : showEmptyTours ? (
                                    enableSneakPeekFallback && isSneakPeekPending ? (
                                        <div className="hidden md:flex w-full md:max-w-[280px] h-[240px] self-start">
                                            <div className="w-full h-full bg-grey-5 rounded-2xl animate-pulse" />
                                        </div>
                                    ) : enableSneakPeekFallback && hasAnySneakPeekData ? (
                                        <div className="hidden md:flex w-full md:max-w-[280px] h-[240px] self-start mb-7">
                                            <div className="relative w-full h-full rounded-2xl border border-grey-3 bg-white p-3 pt-6 flex flex-col gap-2">
                                                <div className="absolute top-0 right-0 h-[22px] rounded-tl-none rounded-tr-2xl rounded-br-none rounded-bl-2xl bg-grey-1 border border-grey-4 flex flex-col items-center justify-center py-1 px-3 box-border text-right text-[11px] text-white">
                                                    <div className="relative tracking-num--0_01 leading-[14px] font-bold text-[11px] text-white">
                                                        NO TOURS AVAILABLE
                                                    </div>
                                                </div>
                                                <span className="text-[14px] font-bold font-red-hat-display text-grey-1">
                                                    Key Info:
                                                </span>
                                                <SneakPeekInfoStrip
                                                    bestMonths={bestMonths}
                                                    duration={duration}
                                                    walkingRequired={walkingRequired}
                                                    valueForMoney={valueForMoney}
                                                    variant="grid"
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="hidden md:flex w-full md:max-w-[280px] h-[240px] flex-col items-center justify-center bg-grey-5 rounded-2xl p-5 text-center gap-3 border border-grey-4/70">
                                            <div className="w-10 h-10 rounded-full bg-white border border-grey-4 flex items-center justify-center">
                                                <MapPin className="w-5 h-5 text-grey-2" />
                                            </div>
                                            <Typography
                                                size="16"
                                                weight="medium"
                                                color="grey-0">
                                                No tours available
                                            </Typography>
                                            <p className="text-sm font-medium font-manrope text-grey-2 max-w-[220px] leading-5">
                                                You can still explore this activity.
                                            </p>
                                        </div>
                                    )
                                ) : primaryTour ? (
                                    <div className="flex flex-col w-full gap-2">
                                        {canAddTours && (
                                            <div className="flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setIsAddToursOpen(true)
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-grey-3 text-[11px] font-manrope font-medium text-grey-1 hover:border-primary-default hover:text-primary-default cursor-pointer transition-colors"
                                                    title="Add a new tour to this experience">
                                                    <Plus className="w-3 h-3" />
                                                    Add tour
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-center md:justify-center w-full">
                                            <TourCard
                                                triggerType="Collection"
                                                key={primaryTour.id}
                                                tour={primaryTour}
                                                isPolling={isToursPolling}
                                                tagType={primaryTourTagType}
                                                checkIn={checkIn}
                                                containerClassName="w-full md:w-full "
                                                experienceId={experienceId}
                                                onCurate={canStaffCurate ? setCuratingTour : undefined}
                                            />
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {(hasTours || showShimmerTours || showEmptyTours) && (
                            <div className="flex w-full md:hidden flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3 justify-between md:mt-2">
                                {/* View Details and View on Map Buttons */}
                                <div className="flex items-center gap-2 w-full min-w-0 shrink">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleViewDetailsClick?.()
                                        }}
                                        className="flex-1 min-w-0 px-3 md:px-4 py-2 rounded-md bg-white border border-grey-4 text-grey-0 font-red-hat-display font-semibold text-sm hover:bg-grey-4 transition-colors cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis">
                                        View Details
                                    </button>
                                    {handleViewOnMapClick && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleViewOnMapClick()
                                            }}
                                            className="flex-1 min-w-0 px-3 md:px-4 py-2 rounded-md bg-white border border-grey-4 text-grey-0 font-red-hat-display font-semibold text-sm hover:bg-grey-4 transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 overflow-hidden">
                                            <MapPin className="w-4 h-4 shrink-0" />
                                            <span className="hidden sm:inline truncate">View on Map</span>
                                            <span className="sm:hidden">Map</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Explore More Tours Button - Only show if there's more than 1 tour */}
                        {(hasTours || showShimmerTours || showEmptyTours) && (
                            <div className="w-full md:w-full flex items-center justify-center">
                                {sortedTours.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleViewToursToggle()
                                        }}
                                        className="rounded-md text-grey-0 text-sm font-semibold flex items-center gap-2 hover:bg-grey-4 transition-colors bg-grey-5 px-3 md:px-4 py-2 justify-between w-full md:w-full cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            {/* Remaining Provider Icons */}
                                            {remainingProviderIcons.length > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    {remainingProviderIcons.map((provider, index) => (
                                                        <img
                                                            key={`${provider.platform}-${index}`}
                                                            src={provider.logo}
                                                            alt={provider.platform}
                                                            className="w-4 h-4 object-contain rounded-sm"
                                                            title={provider.platform}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            <span className="text-sm font-medium font-manrope text-grey-1">Explore more tours</span>
                                        </div>
                                        <div className="flex flex-row items-center gap-1 px-1 md:px-2">
                                            <span className="text-sm font-manrope text-primary-default">{isToursExpanded ? 'Hide' : 'View'}</span>
                                            <ChevronDown
                                                className={`w-4 h-4 text-primary-default transition-transform ${isToursExpanded ? 'rotate-180' : ''}`}
                                            />
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded Tours Section */}
            {isToursExpanded && (
                <div className="w-full mt-0 md:mt-4 pt-0 px-4  md:p-4 md:px-4 border-none md:border border-grey-4 rounded-2xl bg-white">
                    {showShimmerTours ? (
                        <div className="flex flex-col items-start gap-3">
                            <div className="w-[280px] h-[240px] bg-grey-5 rounded-2xl animate-pulse" />
                        </div>
                    ) : remainingTours.length > 0 ? (
                        <>
                            <GenericCarousel
                                gradientStartColor="white"
                                gradientEndColor="transparent"
                                className=""
                                gap={16}>
                                {remainingTours.map((tour) => (
                                    <TourCard
                                        triggerType="Collection"
                                        key={tour.id}
                                        tour={tour}
                                        isPolling={isToursPolling}
                                        checkIn={checkIn}
                                        experienceId={experienceId}
                                        onCurate={canStaffCurate ? setCuratingTour : undefined}
                                    />
                                ))}
                            </GenericCarousel>
                        </>
                    ) : null}
                </div>
            )}
            {canAddTours && experienceId && (
                <AddToursDialog
                    open={isAddToursOpen}
                    onOpenChange={setIsAddToursOpen}
                    experienceId={experienceId}
                    experienceName={title ?? null}
                />
            )}
            {/* Single curate popover for this experience's tours. Hosted here (not inside
                each TourCard) so it survives the list reorder a recommendation toggle
                triggers — the toggled card remounts, but this popover does not. */}
            {canStaffCurate && curatingTour && experienceId && (
                <TourCuratePopover
                    open={!!curatingTour}
                    onOpenChange={(isOpen) => { if (!isOpen) setCuratingTour(null) }}
                    tour={curatingTour}
                    experienceId={experienceId}
                    collectionIdentifier={curateCollectionIdentifier}
                    checkIn={checkIn}
                />
            )}
        </div>
    )
}

export default HorizontalListCard
