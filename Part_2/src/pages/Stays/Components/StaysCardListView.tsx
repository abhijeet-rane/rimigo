import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, ChevronRight, ExternalLink, Map, Plus, Zap } from 'lucide-react'
import { PriceLoadingRow } from './PriceLoadingRow'
import { SelectItineraryButton } from './SelectItineraryButton'
import RimigoLogo from '@/components/shared/RimigoLogo'
import { useUserInfo } from '@/hooks/useUserInfo'
import { useStayCardBadges } from '../config/stayCardVisibility'
import { VerifiedBadge } from './VerifiedBadge'
import type { PlatformPrice } from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import type { GuestsData } from '@/components/common/SearchBar'
import ShortlistButton from '@/components/common/ShortlistButton'
import AddToCollectionButton from '@/components/common/AddToCollectionButton'
import AddToCollectionModal from '@/modules/ContentCollection/components/AddToCollectionModal'
import { PROVIDER_LOGOS } from '@/constants/providerLogos'
import { cn } from '@/lib/utils'
import { NO_EXPERIENCE_IMAGE } from '@/constants/icons/svgFromCDN'
import ImageCarousel from './ImageCarousel'
import PhotoGallery from '@/pages/Stays/HotelDetail/components/PhotoGallery'
import type { HotelDetailData } from '@/types/hotelDetailTypes'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'
import RatingChip from './RatingChip'
import { AirbnbBadge } from './AirbnbBadge'

interface PlatformReview {
    platform: string
    review_count: number
    rating: number
    url: string
    logo_url: string | null
}

interface CuratedLabel {
    label: string
    value: string | null
}

interface StaysCardListViewProps {
    title: string
    image?: string
    images?: string[]
    locationTag?: string | React.ReactNode
    formattedCityName?: string
    platformReviews?: PlatformReview[]
    curatedLabels?: CuratedLabel[]
    kayakStarRating?: number
    /** Star rating from the accommodation API (shown as ★ icons in the content area). */
    starRating?: number | string
    zentrumHubId?: string
    cityId?: string
    cityName?: string
    checkIn?: string
    checkOut?: string
    travelPurpose?: string
    groupType?: string
    preferences?: string[]
    guestsData?: GuestsData
    reviewType?: string
    isShortlisted?: boolean
    onToggleShortlist?: () => Promise<void> | void
    isShortlisting?: boolean
    isPriceLoading?: boolean
    isPriceUnavailable?: boolean
    accommodation_id?: string
    sortedDeals: PlatformPrice[]
    isDealsLoading: boolean
    price: number
    onAddToCollection?: (() => void) | false | null
    category?: string | null
    buttonPage?: string
    onHoverStart?: () => void
    onHoverEnd?: () => void
    onCardClick: () => void
    onViewDealClick: () => void
    handleAddToCollection?: () => void
    /** Whether to show the "Add to itinerary" affordance — gated on an
     *  active trip with an itinerary at the parent. */
    canAddStayToItinerary?: boolean
    /** When true, the Select button shows "Selected" (green pill + checkmark). */
    isStayInItinerary?: boolean
    /** Click handler for the "Add to itinerary" button. The modal itself
     *  lives in the parent ``StaysCard`` so both grid and list views share it. */
    onAddStayToItinerary?: (e: React.MouseEvent) => void
    /** Native title/aria tooltip for the Add-to-itinerary button. Defaults
     *  to "Add to itinerary"; the parent overrides with "Already staying
     *  at [Hotel] here…" when a different hotel is already attached. */
    addToItineraryTooltip?: string
    /** When true, paints a small pulsing primary-purple dot on the Add
     *  button as a peripheral cue that this card's city already has a
     *  different hotel. Mirrors the grid view's affordance. */
    addToItineraryHasConflict?: boolean
    hideActions?: boolean
    /**
     * Read-only / external viewer. When true, hides the Shortlist heart
     * (mobile overlay + desktop overlay) and the Add-to-itinerary button
     * (mobile "+" overlay + desktop SelectItineraryButton). Independent of
     * `hideActions` (which is the broader switch that also kills the Add-to-
     * collection affordance). Both visual and functional — handlers are
     * unreachable from this component when set.
     */
    isReadOnly?: boolean
    isVerified?: boolean
    isB2bDealAvailable?: boolean
    isAvailableOnAirbnb?: boolean
    onView3D?: () => void
}

const providerHorizontalLogos: Record<string, string> = {
    'Booking.com': PROVIDER_LOGOS.BOOKING,
    Agoda: PROVIDER_LOGOS.AGODA,
    'Expedia.com': PROVIDER_LOGOS.EXPEDIA,
    'Trip.com': PROVIDER_LOGOS.TRIP_COM
}

function formatReviewCount(count: number): string {
    if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
    return count.toString()
}

// ── Cheapest deal row (shared between desktop & mobile) ──
const CheapestDealRow = ({
    deal,
    onBookClick,
}: {
    deal: PlatformPrice
    onBookClick: (e: React.MouseEvent) => void
}) => {
    const logoSrc = deal.logo_url || providerHorizontalLogos[deal.platform]

    return (
        <div className="bg-white flex items-center justify-between pl-3 pr-2 sm:pr-1 py-1 rounded-[8px] w-full">
            {/* Left: provider logo + cheapest badge */}
            <div className="flex items-center gap-2">
                {deal.platform === 'Rimigo' ? (
                    <RimigoLogo size="sm" />
                ) : logoSrc ? (
                    <img
                        src={logoSrc}
                        alt={deal.platform}
                        className={cn('w-auto object-contain shrink-0', deal.platform === 'Agoda' ? 'h-[20px] max-w-[40px]' : 'h-[20px]')}
                    />
                ) : (
                    <span className="text-xs font-semibold text-grey-0 font-manrope">{deal.platform}</span>
                )}
                {deal.is_cheapest !== false && (
                    <span className="bg-[#cceee4] text-[#006548] text-[11px] font-extrabold font-manrope tracking-[-0.22px] leading-4 px-1 rounded-2xl whitespace-nowrap">
                        CHEAPEST
                    </span>
                )}
            </div>

            {/* Right: book button (shows price when available) */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onBookClick}
                    className="bg-white border border-primary-default px-3 py-1.5 rounded-[8px] flex items-center gap-1 justify-center hover:bg-primary-default/5 transition-colors cursor-pointer shrink-0 whitespace-nowrap">
                    {deal.price ? (
                        <span className="flex items-baseline gap-1">
                            <span className="text-[16px] font-semibold font-red-hat-display text-grey-0 tracking-[-0.32px] leading-5">
                                ₹{Math.round(deal.price).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[14px] font-semibold font-manrope text-grey-2 tracking-[-0.28px] leading-[18px]">
                                /night
                            </span>
                        </span>
                    ) : (
                        <span className="text-primary-default font-red-hat-display font-bold text-[14px] tracking-[-0.28px] leading-[18px]">
                            View deal
                        </span>
                    )}
                    <ExternalLink className="w-4 h-4 text-primary-default" />
                </button>
            </div>
        </div>
    )
}

export const StaysCardListView = ({
    title,
    image,
    images,
    locationTag,
    platformReviews = [],
    kayakStarRating,
    starRating,
    zentrumHubId,
    cityId,
    cityName,
    isShortlisted = false,
    onToggleShortlist,
    isShortlisting = false,
    isPriceUnavailable = false,
    accommodation_id,
    sortedDeals,
    isDealsLoading,
    onAddToCollection,
    category,
    buttonPage = 'stay_wishlist_v1',
    onHoverStart,
    onHoverEnd,
    onCardClick,
    onViewDealClick,
    handleAddToCollection,
    canAddStayToItinerary = false,
    isStayInItinerary = false,
    onAddStayToItinerary,
    addToItineraryTooltip = 'Add to itinerary',
    addToItineraryHasConflict = false,
    reviewType,
    checkIn,
    checkOut,
    hideActions = false,
    isReadOnly = false,
    isVerified = false,
    isB2bDealAvailable = false,
    isAvailableOnAirbnb = false,
    onView3D,
    price,
}: StaysCardListViewProps) => {
    const [isAddToCollectionModalOpen, setIsAddToCollectionModalOpen] = useState(false)
    const [isGalleryOpen, setIsGalleryOpen] = useState(false)
    const [isMoreDealsExpanded, setIsMoreDealsExpanded] = useState(false)
    const { showVerifiedBadge, showB2bBadge, showAirbnbBadge } = useStayCardBadges(isVerified, isB2bDealAvailable, isAvailableOnAirbnb)
    const { trackButtonClickCustom } = usePostHog()
    const { isRimigoInternal } = useUserInfo()

    const additionalDeals = useMemo(() => sortedDeals.slice(1), [sortedDeals])
    const hasNoRates = !isDealsLoading && sortedDeals.length === 0 && isPriceUnavailable

    const allImages = images && images.length > 0 ? images : image ? [image] : []


    const galleryHotelData: HotelDetailData | null =
        allImages.length > 0
            ? ({
                  hotel_name: title,
                  city: cityName || '',
                  review_type: reviewType || 'complete',
                  review_data: {
                      status: 'completed',
                      ratings: { overall_rating: { label: '', score: 0, tag: { label: '', color: '' } }, top_platforms: [], reviews: { positives: [], negatives: [] } },
                      hot_picks: [],
                      summary_request_id: '',
                      cautions: { title: '', descriptions: [], mitigation_steps: [] }
                  },
                  geoCode: { lat: '', long: '' },
                  images: [{ type: 'All', links: allImages }],
                  checkInInfo: { beginTime: '', endTime: '', instructions: [], specialInstructions: [], minAge: '' },
                  checkOutInfo: { time: '' },
                  starRating: '',
                  category: category || '',
                  location_tag: locationTag ? [locationTag] : [],
                  attributes: [],
                  curated_overall_score: 0,
                  nearest_airport: { name: '', latitude: 0, longitude: 0, distance_km: 0, metro_access: false, airport_shuttle: false, avg_time_to_airport_min: 0, transportation_options: [], map_url: '' },
                  nearby_list: [],
                  amenities: []
              } as HotelDetailData)
            : null

    const handleAddToCollectionClick = () => {
        if (handleAddToCollection) handleAddToCollection()
        else if (onAddToCollection) onAddToCollection()
        else setIsAddToCollectionModalOpen(true)
    }

    /**
     * Single source of truth for "View deal" clicks on any platform row.
     * - Always fires STAYS_VIEW_DEAL_CLICKED (previously Rimigo was silently skipping tracking).
     * - For Rimigo or any deal without a url, defers to onViewDealClick (opens Rimigo booking flow / hotel detail).
     * - For external providers, opens the deal url in a new tab.
     */
    const handleDealClick = (deal: PlatformPrice | undefined) => {
        trackButtonClickCustom?.({
            buttonPage,
            buttonName: POSTHOG_EVENTS.STAYS_VIEW_DEAL_CLICKED,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { title, platform_name: deal?.platform ?? 'none', url: deal?.url ?? '' }
        })
        if (!deal || deal.platform === 'Rimigo' || !deal.url) {
            onViewDealClick()
            return
        }
        window.open(deal.url, '_blank', 'noopener,noreferrer')
    }

    const handleBookClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        handleDealClick(sortedDeals[0])
    }

    return (
        <>
        <motion.div
            key="list-view"
            className={cn(
                "group relative rounded-xl border bg-white flex flex-col sm:flex-row cursor-pointer w-full p-3 gap-4 transition-colors",
                isStayInItinerary
                    ? "border-[#00A878] shadow-[0px_2px_8px_0px_#00A87830] hover:border-[#00A878]"
                    : "border-[#dfdde0] shadow-[0px_2px_8px_0px_#dfdde0] hover:border-grey-0"
            )}
            onMouseEnter={onHoverStart}
            onMouseLeave={onHoverEnd}
            onClick={onCardClick}>

            {/* ── Image Section ── */}
            {/* `onClick stopPropagation` at the section root so the parent
                card's navigate-to-detail handler doesn't fire alongside the
                gallery-open. Relying only on the inner ImageCarousel's
                stopPropagation leaked through on mobile (framer-motion
                pointer events vs React synthetic click ordering). */}
            <div
                className="relative w-full sm:w-[200px] sm:min-w-[200px] h-[200px] sm:h-[200px] rounded-xl overflow-hidden shrink-0"
                onClick={(e) => e.stopPropagation()}>
                {image || images ? (
                    <ImageCarousel
                        image={image}
                        images={images}
                        alt={title}
                        className="w-full h-full"
                        onImageClick={() => setIsGalleryOpen(true)}
                    />
                ) : (
                    <img src={NO_EXPERIENCE_IMAGE} alt={title} className="w-full h-full object-cover" />
                )}
                {/* Action Buttons */}
                {!hideActions && (
                    <>
                        {/* Mobile overlay: shortlist left, +/selected right, full-width justify-between */}
                        <div
                            className="sm:hidden absolute px-2 left-0 right-0 top-2 flex items-center justify-between z-10"
                            onClick={(e) => e.stopPropagation()}>
                            {/* Left: shortlist heart — suppressed in read-only mode */}
                            {!isReadOnly && onToggleShortlist ? (
                                <ShortlistButton
                                    ariaLabel="Save to shortlist"
                                    isShortlisted={isShortlisted}
                                    onShortlist={onToggleShortlist}
                                    isLoading={isShortlisting}
                                />
                            ) : <span />}
                            {/* Right: + (add to itinerary) or green check (already in itinerary).
                                Suppressed in read-only mode so external viewers can't open the modal. */}
                            {!isReadOnly && canAddStayToItinerary && onAddStayToItinerary && (
                                <button
                                    type="button"
                                    aria-label={addToItineraryTooltip}
                                    title={addToItineraryTooltip}
                                    onClick={onAddStayToItinerary}
                                    className="rounded-full cursor-pointer border border-white p-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors"
                                    style={{ background: isStayInItinerary ? '#00A878' : 'rgba(0,0,0,0.25)' }}>
                                    {isStayInItinerary ? (
                                        <Check className="h-5 w-5 text-white" strokeWidth={2.5} />
                                    ) : (
                                        <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Desktop overlay: kayak chip left, collection + shortlist right */}
                        <div
                            className={cn("hidden sm:flex absolute right-0 px-2 left-0 top-2 items-center gap-2 z-10 w-full", kayakStarRating !== undefined && kayakStarRating !== null ? 'justify-between' : 'justify-end')}
                            onClick={(e) => e.stopPropagation()}>
                            {kayakStarRating !== undefined && kayakStarRating !== null && (
                                <RatingChip rating={kayakStarRating} platform="Kayak" />
                            )}
                            {onAddToCollection !== false && onAddToCollection !== null && (onAddToCollection || accommodation_id) && (
                                <AddToCollectionButton
                                    ariaLabel="Add to collection"
                                    onAddToCollection={handleAddToCollectionClick}
                                />
                            )}
                            {!isReadOnly && onToggleShortlist && (
                                <ShortlistButton
                                    ariaLabel="Save to shortlist"
                                    isShortlisted={isShortlisted}
                                    onShortlist={onToggleShortlist}
                                    isLoading={isShortlisting}
                                />
                            )}
                        </div>
                    </>
                )}
                {/* B2B badge — internal only, image overlay */}
                {showB2bBadge && (
                    <div className="absolute left-2 bottom-2 z-10">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-600/90 backdrop-blur-sm shadow-md">
                            <Zap className="w-3 h-3 text-white" />
                            <span className="text-[10px] font-red-hat-display font-bold text-white">B2B Deals</span>
                        </div>
                    </div>
                )}
                {/* Airbnb badge — top-left of image, all users */}
                {showAirbnbBadge && (
                    <div className="absolute left-2 top-2 z-10">
                        <AirbnbBadge size="sm" />
                    </div>
                )}
            </div>

            {/* ── Content Section ── */}
            <div className="flex flex-1 flex-col gap-3 min-w-0">
                {/* Top: title, ratings, curated label */}
                <div className="flex flex-col gap-3">
                    {/* Title row */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                                <h3 className="text-[16px] font-semibold font-red-hat-display text-grey-0 tracking-[-0.32px] leading-5 line-clamp-1 hover:underline">
                                    {title}
                                </h3>
                                {showVerifiedBadge && <VerifiedBadge size="md" />}
                            </div>
                            {/* Right-side actions: Select (desktop only) + collection */}
                            <div className="hidden sm:flex items-center gap-2 shrink-0">
                                {!isReadOnly && canAddStayToItinerary && onAddStayToItinerary && (
                                    <SelectItineraryButton
                                        isSelected={isStayInItinerary}
                                        hasConflict={addToItineraryHasConflict}
                                        tooltip={addToItineraryTooltip}
                                        onClick={onAddStayToItinerary}
                                    />
                                )}
                                {!hideActions && onAddToCollection !== false && onAddToCollection !== null && (onAddToCollection || accommodation_id) && (
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <AddToCollectionButton
                                            ariaLabel="Add to collection"
                                            onAddToCollection={handleAddToCollectionClick}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Star rating + platform reviews + Map button */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Accommodation star rating (not kayak-specific) */}
                            {starRating !== undefined && starRating !== null && Number(starRating) > 0 && (
                                <div className="flex items-center gap-0.5 shrink-0">
                                    {Array.from({ length: Math.min(5, Math.floor(Number(starRating))) }).map((_, i) => (
                                        <svg key={i} className="w-[14px] h-[14px] text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>
                            )}
                            {/* Platform review pills — skip reviews with rating = 0 */}
                            {platformReviews.filter((r) => r.rating > 0).length > 0 && (
                                <div className="flex items-center gap-[7px] bg-[#f5f4f7] rounded-full pl-[2px] pr-1 py-0.5 shrink-0">
                                    {platformReviews.filter((r) => r.rating > 0).slice(0, 2).map((review, idx) => (
                                        <div key={review.platform} className="flex items-center gap-1">
                                            {idx > 0 && <span className="text-grey-2 text-xs font-semibold font-manrope">·</span>}
                                            <div className="w-5 h-5 rounded-full overflow-hidden shrink-0">
                                                {review.logo_url ? (
                                                    <img src={review.logo_url} alt={review.platform} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-grey-4 flex items-center justify-center">
                                                        <span className="text-[10px] font-bold text-grey-2">{review.platform.charAt(0)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-[2px] text-[12px] tracking-[-0.24px]">
                                                <span className="font-bold font-red-hat-display text-grey-0">{Number(review.rating).toFixed(1)}</span>
                                                <span className="font-normal font-manrope text-grey-1">({formatReviewCount(review.review_count)})</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {onView3D && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onView3D() }}
                                    className="cursor-pointer p-1.5 rounded-full bg-white border border-grey-3 text-grey-3 hover:bg-grey-5 transition-colors shrink-0">
                                    <Map className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        {/* Inline sub-text line (e.g. "1.2km from <activity>") */}
                        {locationTag && (
                            <div className='flex items-center gap-1' >
                                <p className="text-[12px] font-[500] font-manrope text-grey-6 tracking-[-0.02em] leading-[16px] line-clamp-2 items-center gap-2">
                                {locationTag}
                                </p>
                            </div>
                        )}
                    </div>

                </div>

                {/* Bottom: price section */}
                {/* Spacer — pushes price to bottom, never shrinks when accordion opens */}
                <div className="hidden sm:block sm:grow sm:shrink-0" />
                <div className="flex flex-col gap-2 bg-[#f5f4f7] rounded-[8px] p-2 w-full" onClick={(e) => e.stopPropagation()}>
                    {isDealsLoading ? (
                        <PriceLoadingRow />
                    ) : hasNoRates ? (
                        <div className="flex items-center justify-between bg-white rounded-[8px] px-3 py-3 gap-3">
                            <p className="text-xs text-grey-2 font-manrope font-medium min-w-0">Rates unavailable for selected dates</p>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onViewDealClick() }}
                                className="bg-primary-default text-white font-red-hat-display font-bold text-[14px] px-3 py-1.5 rounded flex items-center gap-1 hover:bg-primary-dark transition-colors cursor-pointer shrink-0 whitespace-nowrap">
                                View details
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    ) : sortedDeals.length === 0 && price > 0 ? (
                        // Compare API returned no platforms but the list endpoint's
                        // rate_per_night is available — that price is always sourced
                        // from Rimigo, so render with the Rimigo logo for parity with
                        // the regular CheapestDealRow. Internal users see a small
                        // purple dot next to the price as a "from list API" hint.
                        <div className="bg-white flex items-center justify-between pl-3 pr-2 sm:pr-1 py-1 rounded-[8px] w-full">
                            <div className="flex items-center gap-2">
                                <RimigoLogo size="sm" />
                                <span className="bg-[#cceee4] text-[#006548] text-[11px] font-extrabold font-manrope tracking-[-0.22px] leading-4 px-1 rounded-2xl whitespace-nowrap">
                                    CHEAPEST
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onViewDealClick() }}
                                    className="bg-white border border-primary-default px-3 py-1.5 rounded-[8px] flex items-center gap-1 justify-center hover:bg-primary-default/5 transition-colors cursor-pointer shrink-0 whitespace-nowrap">
                                    {isRimigoInternal && (
                                        <span
                                            className="inline-block w-1.5 h-1.5 rounded-full bg-primary-default shrink-0"
                                            title="Price from list API (rate_per_night), not compare API"
                                            aria-label="Source: list API"
                                        />
                                    )}
                                    <span className="flex items-baseline gap-1">
                                        <span className="text-[16px] font-semibold font-red-hat-display text-grey-0 tracking-[-0.32px] leading-5">
                                            ₹{Math.round(price).toLocaleString('en-IN')}
                                        </span>
                                        <span className="text-[14px] font-semibold font-manrope text-grey-2 tracking-[-0.28px] leading-[18px]">
                                            /night
                                        </span>
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-primary-default" />
                                </button>
                            </div>
                        </div>
                    ) : sortedDeals.length > 0 ? (
                        <>
                            <CheapestDealRow
                                deal={sortedDeals[0]}
                                onBookClick={handleBookClick}
                            />
                            {/* Expanded deal rows — smooth animation */}
                            <AnimatePresence initial={false}>
                            {isMoreDealsExpanded && additionalDeals.length > 0 && (
                                <motion.div
                                    key="expanded-deals"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                                    className="overflow-hidden flex flex-col gap-2">
                                {additionalDeals.slice(0, 4).map((deal, idx) => {
                                    const dealLogoSrc = deal.logo_url || providerHorizontalLogos[deal.platform]
                                    return (
                                        <div key={`${deal.platform}-${idx}`} className="bg-white flex items-center justify-between pl-3 pr-2 sm:pr-1 py-1 rounded-[8px] w-full" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-2">
                                                {deal.platform === 'Rimigo' ? (
                                                    <RimigoLogo size="sm" />
                                                ) : dealLogoSrc ? (
                                                    <img src={dealLogoSrc} alt={deal.platform} className={cn('w-auto object-contain shrink-0', deal.platform === 'Agoda' ? 'h-[20px] max-w-[40px]' : 'h-[20px]')} />
                                                ) : (
                                                    <span className="text-xs font-semibold text-grey-0 font-manrope">{deal.platform}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleDealClick(deal) }}
                                                    className="bg-white border border-primary-default px-3 py-1.5 rounded-[8px] flex items-center gap-1 justify-center hover:bg-primary-default/5 transition-colors cursor-pointer shrink-0 whitespace-nowrap">
                                                    {deal.price ? (
                                                        <span className="flex items-baseline gap-1">
                                                            <span className="text-[16px] font-semibold font-red-hat-display text-grey-0 tracking-[-0.32px] leading-5">
                                                                ₹{Math.round(deal.price).toLocaleString('en-IN')}
                                                            </span>
                                                            <span className="text-[14px] font-semibold font-manrope text-grey-2 tracking-[-0.28px] leading-[18px]">
                                                                /night
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-primary-default font-red-hat-display font-bold text-[14px] tracking-[-0.28px] leading-[18px]">
                                                            View deal
                                                        </span>
                                                    )}
                                                    <ExternalLink className="w-4 h-4 text-primary-default" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                                }
                                </motion.div>
                            )}
                            </AnimatePresence>

                            {additionalDeals.length > 0 && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsMoreDealsExpanded((v) => !v) }}
                                    className="flex items-center justify-center gap-1 cursor-pointer hover:bg-grey-6/60 transition-all self-center rounded-md px-3 py-1.5 w-full">
                                    <span className="text-[12px] font-semibold font-red-hat-display text-grey-1 tracking-[-0.24px] leading-4">
                                        {isMoreDealsExpanded ? 'Show less' : `Compare ${additionalDeals.length} more`}
                                    </span>
                                    <ChevronDown className={cn('w-4 h-4 text-grey-1 transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]', isMoreDealsExpanded && 'rotate-180')} />
                                </button>
                            )}
                        </>
                    ) : null}
                </div>
            </div>

            {/* Add to Collection Modal */}
            {!onAddToCollection && zentrumHubId && (
                <AddToCollectionModal
                    isOpen={isAddToCollectionModalOpen}
                    onClose={() => setIsAddToCollectionModalOpen(false)}
                    experienceId={zentrumHubId}
                    experienceName={title}
                    entityType="stays"
                    stayImageUrl={image}
                    locationTag={locationTag}
                    cityId={cityId}
                    cityName={cityName}
                    category={category}
                    accommodationId={accommodation_id}
                    checkIn={checkIn}
                    checkOut={checkOut}
                />
            )}

        </motion.div>

        {/* Photo Gallery Modal — rendered as a SIBLING of motion.div
            (not a child) so React synthetic events inside the gallery
            (e.g. the Back button click) don't bubble through the React
            portal tree and retrigger the card's `onCardClick` →
            stay-detail navigation. Portals propagate events by React
            parent, not DOM parent. */}
        {galleryHotelData &&
            typeof document !== 'undefined' &&
            createPortal(
                <PhotoGallery
                    hotelData={galleryHotelData}
                    isOpen={isGalleryOpen}
                    onClose={() => setIsGalleryOpen(false)}
                />,
                document.body
            )}
        </>
    )
}
