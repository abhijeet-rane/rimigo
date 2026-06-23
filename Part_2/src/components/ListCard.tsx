import { Heart, ChevronLeft, ChevronRight, Play, MapPin } from 'lucide-react'
import { ReactNode, useState, useEffect } from 'react'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import { NO_EXPERIENCE_IMAGE } from '@/constants/icons/svgFromCDN'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

export interface BadgeProps {
    label: string
    bgColor?: string
    textColor?: string
    shadowColor?: string
    icon?: ReactNode
}

interface ListCardProps {
    headingText?: string | null
    category?: string | null
    categoryIcon?: string | null // Icon URL for the category/preference
    // Image - now supports array for carousel
    image?: string // Deprecated: use images array instead
    images?: string[] // Array of image URLs for carousel
    imageAlt?: string
    shortDescription?: string | null
    showDescriptionAsHeading?: boolean
    fullHeight?: boolean
    className?: string

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
    price?: string

    // Shortlist button
    showShortlistButton?: boolean
    isShortlisted?: boolean
    isShortlisting?: boolean
    onShortlistClick?: (e: React.MouseEvent) => void

    // Sneak Peek button
    showSneakPeekButton?: boolean
    onSneakPeekClick?: (e: React.MouseEvent) => void
    sneakPeekUserImage?: string // User profile image for sneak peek button
    /** Label override for the sneak-peek button. Defaults to "Sneak Peek".
     *  The Tripboard Activities surfaces pass "Watch Reel" here. */
    sneakPeekButtonLabel?: string

    // Custom footer content
    customContent?: ReactNode

    // Additional children
    children?: ReactNode

    // Categories for tags (used in listing section)
    categories?: string[] | null // Array of category backend values to display as tags
    categoryIconsMap?: Record<string, string | undefined> // Map of category backend values to their icon URLs

    /** Optional node rendered to the right of the title (e.g. the "+ Add" /
     *  "Added" pill in the Tripboard Activities tab). Sits in the same row
     *  as the title — title takes remaining width, trailing stays anchored. */
    titleTrailing?: ReactNode
}

const ListCard = ({
    headingText,
    category,
    categoryIcon,
    image,
    images,
    shortDescription,
    showDescriptionAsHeading,
    imageAlt = '',
    fullHeight = false,
    className = '',
    onClick,
    onMouseEnter,
    onMouseLeave,
    topBadge,
    bottomBadges,
    title,
    city,
    price: _price, // Prefixed with _ to indicate intentionally unused (may be used in future)
    showShortlistButton = true,
    isShortlisted = false,
    isShortlisting = false,
    onShortlistClick,
    showSneakPeekButton = false,
    onSneakPeekClick,
    sneakPeekUserImage,
    sneakPeekButtonLabel = 'Sneak Peek',
    customContent,
    children,
    categories,
    categoryIconsMap,
    titleTrailing
}: ListCardProps) => {
    // Suppress unused variable warning - price is kept for API compatibility but not currently displayed
    void _price

    // Determine which images to use - prioritize images array, fallback to single image
    const imageList = images && images.length > 0 ? images : image ? [image] : [NO_EXPERIENCE_IMAGE]
    const hasMultipleImages = imageList.length > 1

    // Carousel state
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)
    const isMobile = useIsMobile()

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
        e.stopPropagation()
        onShortlistClick?.(e)
    }

    const handleSneakPeekClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        onSneakPeekClick?.(e)
    }

    return (
        <>
            {showDescriptionAsHeading && shortDescription && (
                <div className=" flex  items-center gap-3">
                    {headingText && (
                        <p className="font-red-hat-display text-[40px] font-[550] leading-[48px] text-grey-3 mb-2 tracking[-0.2%]">{headingText}</p>
                    )}
                    {shortDescription && (
                        <div className="text-[14px] font-manrope font-[600] leading-[18px] text-grey-0 mb-2 line-clamp-2 tracking[-0.2%]">
                            {shortDescription}
                        </div>
                    )}
                </div>
            )}
            <div
                className={cn('group rounded-2xl w-78 border border-feature-card-border hover:shadow-sm transition-shadow bg-natural-white flex flex-col **:cursor-pointer',
                    fullHeight && 'h-full',
                    isMobile ? 'overflow-visible' : 'overflow-hidden',
                    className
                )}
                style={{ cursor: 'pointer' }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onClick={onClick}
            >
                {/* Image Section with Carousel */}
                {imageList.length > 0 && (
                    <div className="relative h-[240px] min-h-[240px] max-h-[240px] overflow-hidden cursor-pointer rounded-t-2xl">
                        {hasMultipleImages && !isMobile ? (
                            <Carousel
                                setApi={setApi}
                                className="w-full h-full cursor-pointer"
                                opts={{
                                    align: 'start',
                                    loop: false,
                                    dragFree: false
                                }}>
                                <CarouselContent className="h-full cursor-pointer">
                                    {imageList.map((img, index) => (
                                        <CarouselItem
                                            key={index}
                                            className="h-full min-h-[240px] max-h-[240px] cursor-pointer">
                                            <img
                                                src={img}
                                                alt={`${imageAlt} ${index + 1}`}
                                                className="w-full h-[240px] min-h-[240px] max-h-[240px] object-cover cursor-pointer"
                                                draggable={false}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>

                                {/* Navigation Arrows */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        api?.scrollPrev()
                                    }}
                                    disabled={current === 0}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 z-11 h-8 w-8 rounded-full bg-white/80 hover:bg-white border border-feature-card-border flex items-center justify-center transition-opacity   opacity-100
        md:opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-not-allowed">
                                    <ChevronLeft className="h-4 w-4 text-grey-0" />
                                    <span className="sr-only">Previous image</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        api?.scrollNext()
                                    }}
                                    disabled={current === imageList.length - 1}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 z-11 h-8 w-8 rounded-full bg-white/80 hover:bg-white border border-feature-card-border flex items-center justify-center transition-opacity   opacity-100
        md:opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-not-allowed">
                                    <ChevronRight className="h-4 w-4 text-grey-0" />
                                    <span className="sr-only">Next image</span>
                                </button>

                                {/* Pagination Dots */}
                                {imageList.length > 1 && (
                                    <div
                                        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-11 flex gap-1.5   opacity-100
        md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        {imageList.map((_, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    api?.scrollTo(index)
                                                }}
                                                className={`h-1.5 rounded-full transition-all ${index === current ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/75'
                                                    }`}
                                                aria-label={`Go to image ${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </Carousel>
                        ) : (
                            <img
                                src={imageList[0]}
                                alt={imageAlt}
                                className="w-full h-[240px] min-h-[240px] max-h-[240px] object-cover cursor-pointer"
                                draggable={false}
                                style={{ cursor: 'pointer' }}
                            />
                        )}

                        {/* Sneak Peek Button - Top Left */}
                        {showSneakPeekButton && (
                            <div className={cn(
                                'absolute left-3 top-3 z-11 pointer-events-auto',
                                isMobile
                                    ? 'flex opacity-100'
                                    : 'hidden md:flex md:opacity-0 md:group-hover:opacity-100 transition-opacity'
                            )}
                            >
                                <button
                                    type="button"
                                    aria-label="Sneak Peek"
                                    onClick={handleSneakPeekClick}
                                    className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1.5 rounded-[8px] bg-white/80 hover:bg-white border border-feature-card-border hover:shadow-md transition-all shadow-[0px_2px_8px_#aeaeae]">
                                    {sneakPeekUserImage ? (
                                        <>
                                            <div
                                                className="w-5 h-7 rounded-[4px] bg-white flex items-center justify-center"
                                                style={{
                                                    backgroundImage: `url(${sneakPeekUserImage})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center'
                                                }}>
                                                <Play className="w-3 h-3 text-white ml-0.5" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-5 h-7 rounded-[4px] bg-white flex items-center justify-center">
                                            <Play className="w-3 h-3 text-grey-0 ml-0.5" />
                                        </div>
                                    )}
                                    <span className="text-[12px] font-[600] font-red-hat-display">{sneakPeekButtonLabel}</span>
                                </button>
                            </div>
                        )}
                        {showSneakPeekButton && (
                            <div className="md:hidden absolute left-3 top-3 z-11 flex ">
                                <button
                                    type="button"
                                    aria-label="Sneak Peek"
                                    onClick={handleSneakPeekClick}
                                    className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1.5 rounded-[8px] bg-white/80 hover:bg-white border border-feature-card-border hover:shadow-md transition-all shadow-[0px_2px_8px_#aeaeae]">
                                    {sneakPeekUserImage ? (
                                        <>
                                            <div
                                                className="w-5 h-7 rounded-[4px] bg-white flex items-center justify-center"
                                                style={{
                                                    backgroundImage: `url(${sneakPeekUserImage})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center'
                                                }}>
                                                <Play className="w-3 h-3 text-white ml-0.5" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-5 h-7 rounded-[4px] bg-white flex items-center justify-center">
                                            <Play className="w-3 h-3 text-grey-0 ml-0.5" />
                                        </div>
                                    )}
                                    <span className="text-[12px] font-[600] font-red-hat-display">{sneakPeekButtonLabel}</span>
                                </button>
                            </div>
                        )}

                        {/* Top Badge */}
                        {topBadge && (
                            <div
                                className={`absolute opacity-96 ${showSneakPeekButton ? 'left-3 top-14' : 'left-3 top-3'} z-11 inline-flex items-center gap-1 pl-2 pr-3 py-1.5 rounded-full border border-[${topBadge.bgColor}] ${topBadge.textColor || ''}  bg-grey_5`}
                                style={
                                    {
                                        // boxShadow: `0px 2px 16px #f8f8f8`
                                    }
                                }>
                                {topBadge.icon && (
                                    <img
                                        src={topBadge.icon as string}
                                        alt={topBadge.label}
                                        className="w-5 h-5 object-contain"
                                    />
                                )}
                                <span className="text-xs font-semibold text-header-black">{topBadge.label}</span>
                            </div>
                        )}

                        {/* Shortlist Button */}
                        {showShortlistButton && (
                            <div className="absolute right-3 top-3 z-11">
                                <button
                                    type="button"
                                    aria-label="Save"
                                    aria-pressed={isShortlisted}
                                    disabled={isShortlisting}
                                    onClick={handleShortlistClick}
                                    className={`rounded-full border border-feature-card-border p-2 shadow-sm hover:shadow-md transition-shadow ${isShortlisted ? 'bg-white' : 'bg-transparent'
                                        } ${isShortlisting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <Heart
                                        className={`w-4 h-4 transition-colors ${isShortlisted ? 'text-primary-default fill-primary-default' : 'text-white'
                                            } ${isShortlisting ? 'animate-pulse' : ''}`}
                                    />
                                </button>
                            </div>
                        )}

                        {/* Bottom Badges */}
                        {bottomBadges && (
                            <div
                                className={`absolute bottom-3 left-3 z-11 inline-flex items-center gap-1 pl-2 pr-3 py-1.5 rounded-full ${bottomBadges.bgColor || ''} ${bottomBadges.textColor || ''}`}
                                style={{
                                    boxShadow: bottomBadges.shadowColor ? `0px 2px 16px ${bottomBadges.shadowColor}` : undefined
                                }}>
                                {bottomBadges.icon && <span className="text-base leading-none">{bottomBadges.icon}</span>}
                                <span className="text-xs font-semibold">{bottomBadges.label}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Content Section */}
                <div className="flex flex-col p-4 gap-2 md:gap-3 cursor-pointer">
                    {/* Title - Always clamped to 2 lines. When `titleTrailing` is
                        supplied the title shares a row with it (e.g. "+ Add" / "Added"
                        pill on Tripboard Activities cards). */}
                    {(title || titleTrailing) && (
                        <div className="flex items-start justify-between gap-2">
                            {title && (
                                <h3 className="flex-1 text-[18px] md:text-[16px] font-red-hat-display leading-[18px] tracking-[-2%] font-[550] text-grey-0 cursor-pointer min-h-[36px] line-clamp-2">
                                    {title}
                                </h3>
                            )}
                            {titleTrailing && <div className="shrink-0 mt-0.5">{titleTrailing}</div>}
                        </div>
                    )}

                    {/* City and Category */}
                    {(city || category || categories?.length) && (
                        <div className="flex flex-col gap-1 cursor-pointer">
                        {city &&
                            <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4 text-grey-2 shrink-0" />
                                <p className="text-[14px] font-red-hat-display font-semibold text-grey-2 cursor-pointer">{city}</p>
                            </div>
                        }
                        {category && (
                            <div className="hidden group-hover:flex items-center gap-1.5 transition-all">
                                {categoryIcon && (
                                    <div className="w-[18px] h-[18px] flex items-center justify-center shrink-0">
                                        <img
                                            src={categoryIcon}
                                            alt={category}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                )}
                                <span className="text-[14px] font-semibold leading-[18px] text-grey-0 tracking[-0.2%]">{category}</span>
                            </div>
                        )}
                        {/* Category Tags (for listing section) */}
                        {categories && categories.length > 0 && (
                            <div className="hidden group-hover:flex flex-wrap gap-2 mt-1 transition-all">
                                {categories.map((cat, index) => {
                                    const categoryIcon = categoryIconsMap?.[cat]
                                    return (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-grey-5 text-[12px] border border-grey-4">
                                            {categoryIcon && (
                                                <img
                                                    src={categoryIcon}
                                                    alt={cat}
                                                    className="w-4 h-4 object-contain"
                                                />
                                            )}
                                            <span className="text-[12px] leading-[12px] text-grey-0 font-manrope font-[500] ">
                                                {cat.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                                            </span>
                                        </span>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                    )}

                    {/* Custom Content */}
                    {customContent}

                    {/* Children */}
                    {children}
                </div>
            </div>
        </>
    )
}

export default ListCard
