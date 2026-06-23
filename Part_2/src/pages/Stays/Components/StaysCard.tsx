import type { PlatformPrice } from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import { useStayCardBadges } from '../config/stayCardVisibility'
import { VerifiedBadge } from './VerifiedBadge'
import { AirbnbBadge } from './AirbnbBadge'
import type { GuestsData } from '@/components/common/SearchBar'
import type { OccupanciesConfig } from '@/types/occupancy'
import { encodeOccupancies } from '@/types/occupancy'
import AddStayToItineraryModal from '@/modules/ContentCollection/components/AddStayToItineraryModal'
import { motion } from 'framer-motion'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useStayItineraryStatus } from '../hooks/useStayItineraryStatus'
import { ArrowRight, ChevronLeft, ChevronRight, Map, Zap } from 'lucide-react'
import { DealChip } from './DealChip'
import { StaysCardListView } from './StaysCardListView'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePlatformPricing } from '@/hooks/usePlatformPricing'
import { useState } from 'react'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import ShortlistButton from '@/components/common/ShortlistButton'
// import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
// import { POSTHOG_ACTIONS, POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'

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

type ViewType = 'grid' | 'list'

interface StaysCardProps {
    id: number
    title: string
    price: number
    image: string
    images?: string[]
    platformReviews?: PlatformReview[]
    locationTag?: string | React.ReactNode
    /**
     * Opt-in "distance" mode for the locationTag slot. When provided:
     *  - `true`  → render a shimmer placeholder (activity enrichment in flight)
     *  - `false` → render `locationTag` if truthy, otherwise render nothing
     *    (skip the "Near <city> City Centre" fallback used by other callers).
     * When `undefined`, the existing fallback behavior is preserved for
     * callers that don't care about distance badges.
     */
    locationTagLoading?: boolean
    curatedLabels?: CuratedLabel[]
    formattedCityName?: string
    fullHeight?: boolean
    overallRating?: number
    onHoverStart?: () => void
    onHoverEnd?: () => void
    // Hotel detail navigation props
    zentrumHubId?: string
    cityId?: string
    cityName?: string
    checkIn?: string
    checkOut?: string
    travelPurpose?: string
    groupType?: string
    preferences?: string[]
    guestsData?: GuestsData
    /** Per-room occupancy; when present is encoded into `occupancies` on detail-page links. */
    occupancies?: OccupanciesConfig
    reviewType?: string
    isShortlisted?: boolean
    onToggleShortlist?: () => Promise<void> | void
    isShortlisting?: boolean
    isPriceLoading?: boolean
    isPriceUnavailable?: boolean // True when price was checked but no rate found
    accommodation_id?: string
    onView3D?: () => void
    mapKey?: string
    deals?: PlatformPrice[] // Deals from affiliate/compare APIs
    isDealsLoading?: boolean
    buttonPage?: string // Page name for PostHog tracking (e.g., 'stay_wishlist_v1', 'stay_explore_v1')
    isPremium?: boolean
    viewType?: ViewType
    onAddToCollection?: (() => void) | false | null // Optional: callback to open add to collection modal, or false/null to explicitly hide button
    category?: string | null // Optional: for stays, the category
    kayakStarRating?: number // Optional: Kayak star rating for display (kayak_stay sections only)
    /** Star rating from the accommodation API response (shown as ★ icons in content area). */
    starRating?: number | string
    isVerified?: boolean
    isB2bDealAvailable?: boolean
    isAvailableOnAirbnb?: boolean
    /**
     * When true, suppresses the "Add to itinerary"/"+ Select" button in the
     * list view (used in collection detail pages where the card is already
     * inside the collection).
     */
    hideSelectItineraryButton?: boolean
    /**
     * When true, suppresses the "Add to collection" (+) button in the list
     * view. Used on collection detail pages where adding again is redundant.
     */
    hideAddToCollectionButton?: boolean
    /**
     * Read-only / external viewer — hides the Shortlist button and the
     * Add-to-itinerary affordances in the list view, regardless of whether
     * `onToggleShortlist` / `canAddStayToItinerary` are wired.
     */
    isReadOnly?: boolean
}

const StaysCard = ({
    title,
    price,
    image,
    images,
    platformReviews = [],
    locationTag,
    locationTagLoading,
    curatedLabels = [],
    formattedCityName,
    fullHeight = true,
    onHoverStart,
    onHoverEnd,
    // Hotel detail navigation props
    zentrumHubId,
    cityId,
    cityName,
    checkIn,
    checkOut,
    travelPurpose,
    groupType,
    preferences,
    guestsData,
    occupancies,
    reviewType,
    isShortlisted = false,
    onToggleShortlist,
    isShortlisting = false,
    isPriceLoading = false,
    isPriceUnavailable = false,
    accommodation_id,
    onView3D,
    mapKey: _mapKey, // eslint-disable-line @typescript-eslint/no-unused-vars
    deals = [],
    isDealsLoading = false,
    buttonPage = 'stay_wishlist_v1',
    isPremium,
    viewType = 'grid',
    onAddToCollection,
    category,
    kayakStarRating,
    starRating,
    isVerified = false,
    isB2bDealAvailable = false,
    isAvailableOnAirbnb = false,
    hideSelectItineraryButton = false,
    hideAddToCollectionButton = false,
    isReadOnly = false
}: StaysCardProps) => {
    const [carouselIndex, setCarouselIndex] = useState(0)
    const carouselImages = images && images.length > 1 ? images.slice(0, 5) : null
    const [isAddStayModalOpen, setIsAddStayModalOpen] = useState(false)
    const formatPriceInr = (price: number) => `₹${price.toLocaleString('en-IN')}`
    const isMobile = useIsMobile()
    const { showVerifiedBadge, showB2bBadge, showAirbnbBadge } = useStayCardBadges(isVerified, isB2bDealAvailable, isAvailableOnAirbnb)
    const { trackButtonClickCustom } = usePostHog()

    // Show the "Add to itinerary" button only on /tripboard routes.
    const {
        isStayInItinerary,
        canAddStayToItinerary: canAddToItin,
        activeItineraryId,
    } = useStayItineraryStatus(zentrumHubId)
    // Gate on rates: the backend's add_stay price gate rejects when
    // there's no loaded rate for this hub/date pair, so we only surface
    // the button once prices have resolved and are actually available.
    const canAddStayToItinerary =
        canAddToItin && Boolean(cityId) && Boolean(activeItineraryId) && !isPriceLoading && !isPriceUnavailable

    // If the active itinerary already has a DIFFERENT hotel attached to the
    // same city this card belongs to, surface it as a subtle native tooltip.
    const travelerTripsCtx = useOptionalTravelerTrips()
    const existingDifferentHotelInCity = (() => {
        if (!canAddStayToItinerary || !cityId || !zentrumHubId) return null
        const tripId = travelerTripsCtx?.activeTrip?.trip_id
        const itin = tripId ? travelerTripsCtx?.tripItineraries?.[tripId] : null
        const stays = itin?.stays
        if (!stays || stays.length === 0) return null
        const match = stays
            .filter(
                (s) =>
                    s.city_id === cityId && s.zentrum_hub_id !== zentrumHubId
            )
            .sort((a, b) =>
                (a.check_in_date ?? '') < (b.check_in_date ?? '') ? -1 : 1
            )[0]
        return match ?? null
    })()
    const addToItineraryTooltip = existingDifferentHotelInCity
        ? `Already staying at ${existingDifferentHotelInCity.hotel_name} here — lock your route before piling up hotels`
        : 'Add to itinerary'

    const handleAddStayToItineraryClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsAddStayModalOpen(true)
    }

    const { items: filteredDeals } = usePlatformPricing(deals, {
        isPremium
    })

    // Sort deals by price (cheapest first) to ensure cheapest is always first
    const sortedDeals = [...filteredDeals].sort((a, b) => a.price - b.price)

    const handleCardClick = () => {
        // Always redirect to hotel details page
        if (zentrumHubId && cityId && cityName) {
            trackButtonClickCustom?.({
            buttonPage: buttonPage,
                buttonName: 'hotel_card',
                buttonAction: 'open_hotel_detail',
                extra: {
                    hotel_name: title,
                    zentrum_hub_id: zentrumHubId,
                    city_id: cityId,
                    city_name: cityName,
                    check_in: checkIn || '',
                    check_out: checkOut || '',
                    travel_purpose: travelPurpose || '',
                    group_type: groupType || '',
                    review_type: reviewType || 'complete',
                    is_mobile: isMobile
                }
            })

            // Create URL search params for the hotel detail page
            const searchParams = new URLSearchParams({
                hotel_name: title,
                zentrum_hub_id: zentrumHubId,
                city_id: cityId,
                check_in: checkIn || '',
                check_out: checkOut || '',
                city_name: cityName,
                travel_purpose: travelPurpose || '',
                group_type: groupType || '',
                city_prefs: preferences?.join(',') || '',
                review_type: reviewType || 'complete',
                accommodation_id: accommodation_id || ''
            })

            if (guestsData) {
                const { adults, children, infants, children_age } = guestsData
                if (typeof adults === 'number') {
                    searchParams.set('adults', String(adults))
                }
                if (typeof children === 'number') {
                    searchParams.set('children', String(children))
                }
                if (typeof infants === 'number') {
                    searchParams.set('infants', String(infants))
                }
                if (children_age && Array.isArray(children_age) && children_age.length > 0) {
                    searchParams.set('children_age', children_age.join(','))
                }
            }

            if (occupancies && occupancies.length > 0) {
                searchParams.set('rooms', String(occupancies.length))
                searchParams.set('occupancies', encodeOccupancies(occupancies))
            }

            // Open hotel detail page in new tab
            const detailUrl = `/stays/${zentrumHubId}?${searchParams.toString()}`
            if (isMobile) {
                window.location.href = detailUrl
            } else {
                window.open(detailUrl, '_blank')
            }
        }
    }
    const handleViewDealClick = () => {
        // Check if there's a cheapest deal and if it's from Rimigo
        const cheapestDeal = sortedDeals.length > 0 ? sortedDeals[0] : null
        const isRimigoDeal = !cheapestDeal || cheapestDeal.platform.toLowerCase() === 'rimigo'

        // If cheapest deal is from another provider (not Rimigo), open their affiliate link
        if (cheapestDeal && !isRimigoDeal && cheapestDeal.url) {
            if (isMobile) {
                window.location.href = cheapestDeal.url
            } else {
                window.open(cheapestDeal.url, '_blank')
            }
        }

        // If Rimigo (or no deals), open hotel details page
        if (zentrumHubId && cityId && cityName) {
            // Create URL search params for the hotel detail page
            const searchParams = new URLSearchParams({
                hotel_name: title,
                zentrum_hub_id: zentrumHubId,
                city_id: cityId,
                check_in: checkIn || '',
                check_out: checkOut || '',
                city_name: cityName,
                travel_purpose: travelPurpose || '',
                group_type: groupType || '',
                city_prefs: preferences?.join(',') || '',
                review_type: reviewType || 'complete',
                accommodation_id: accommodation_id || ''
            })

            if (guestsData) {
                const { adults, children, infants, children_age } = guestsData
                if (typeof adults === 'number') {
                    searchParams.set('adults', String(adults))
                }
                if (typeof children === 'number') {
                    searchParams.set('children', String(children))
                }
                if (typeof infants === 'number') {
                    searchParams.set('infants', String(infants))
                }
                if (children_age && Array.isArray(children_age) && children_age.length > 0) {
                    searchParams.set('children_age', children_age.join(','))
                }
            }

            if (occupancies && occupancies.length > 0) {
                searchParams.set('rooms', String(occupancies.length))
                searchParams.set('occupancies', encodeOccupancies(occupancies))
            }

            // Mark that we want the deals tab active on the hotel detail page
            searchParams.set('active_tab', 'deals')

            // Open hotel detail page in new tab
            const detailUrl = `/stays/${zentrumHubId}?${searchParams.toString()}`
            if (isMobile) {
                window.location.href = detailUrl
            } else {
                window.open(detailUrl, '_blank')
            }
        }
    }

    const hasCuratedLabels = curatedLabels.length > 0

    // List View Layout
    if (viewType === 'list') {
        return (
            <>
                <StaysCardListView
                    title={title}
                    image={image}
                    images={images}
                    locationTag={locationTag}
                    formattedCityName={formattedCityName}
                    platformReviews={platformReviews}
                    curatedLabels={curatedLabels}
                    kayakStarRating={kayakStarRating}
                    starRating={starRating}
                    zentrumHubId={zentrumHubId}
                    cityId={cityId}
                    cityName={cityName}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    travelPurpose={travelPurpose}
                    groupType={groupType}
                    preferences={preferences}
                    guestsData={guestsData}
                    reviewType={reviewType}
                    isShortlisted={isShortlisted}
                    onToggleShortlist={onToggleShortlist}
                    isShortlisting={isShortlisting}
                    isPriceLoading={isPriceLoading}
                    isPriceUnavailable={isPriceUnavailable}
                    accommodation_id={accommodation_id}
                    sortedDeals={sortedDeals}
                    isDealsLoading={isDealsLoading}
                    price={price}
                    onAddToCollection={hideAddToCollectionButton ? false : onAddToCollection}
                    category={category}
                    buttonPage={buttonPage}
                    onHoverStart={onHoverStart}
                    onHoverEnd={onHoverEnd}
                    onCardClick={handleCardClick}
                    onViewDealClick={handleViewDealClick}
                    canAddStayToItinerary={!hideSelectItineraryButton && canAddStayToItinerary}
                    isStayInItinerary={isStayInItinerary}
                    onAddStayToItinerary={handleAddStayToItineraryClick}
                    addToItineraryTooltip={addToItineraryTooltip}
                    addToItineraryHasConflict={Boolean(existingDifferentHotelInCity)}
                    isVerified={isVerified}
                    isB2bDealAvailable={isB2bDealAvailable}
                    isAvailableOnAirbnb={isAvailableOnAirbnb}
                    onView3D={onView3D}
                    isReadOnly={isReadOnly}
                />
                {canAddStayToItinerary && zentrumHubId && cityId && (
                    <AddStayToItineraryModal
                        isOpen={isAddStayModalOpen}
                        onClose={() => setIsAddStayModalOpen(false)}
                        hotelTitle={title}
                        hotelImage={image}
                        locationTag={locationTag}
                        zentrumHubId={zentrumHubId}
                        cityId={cityId}
                        cityName={cityName}
                        pricePerNight={price}
                        currency="INR"
                    />
                )}
            </>
        )
    }

    // Grid View Layout (Default)
    return (
        <motion.div
            key="grid-view"
            layout
            className={`group relative rounded-2xl md:rounded-2xl sm:rounded-lg overflow-hidden border border-feature-card-border hover:shadow-lg transition-shadow bg-natural-white flex flex-col w-full ${
                fullHeight ? 'h-full' : ''
            } ${zentrumHubId ? 'cursor-pointer' : ''} `}
            onMouseEnter={onHoverStart}
            onMouseLeave={onHoverEnd}
            onClick={handleCardClick}>
            <div className="relative aspect-4/3 overflow-hidden">
                {carouselImages ? (
                    <>
                        <div
                            className="flex h-full transition-transform duration-300 ease-out"
                            style={{ transform: `translateX(-${carouselIndex * 100}%)` }}>
                            {carouselImages.map((imgUrl, i) => (
                                <img
                                    key={i}
                                    src={imgUrl}
                                    alt={`${title} ${i + 1}`}
                                    className="w-full h-full object-cover flex-shrink-0"
                                    loading={i === 0 ? 'eager' : 'lazy'}
                                />
                            ))}
                        </div>
                        {/* Carousel arrows — visible on hover */}
                        {carouselIndex > 0 && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCarouselIndex((i) => Math.max(0, i - 1)) }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer hover:bg-white">
                                <ChevronLeft size={16} className="text-gray-700" />
                            </button>
                        )}
                        {carouselIndex < carouselImages.length - 1 && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCarouselIndex((i) => Math.min(carouselImages.length - 1, i + 1)) }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer hover:bg-white">
                                <ChevronRight size={16} className="text-gray-700" />
                            </button>
                        )}
                        {/* Dots */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            {carouselImages.map((_, i) => (
                                <span
                                    key={i}
                                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === carouselIndex ? 'bg-white' : 'bg-white/50'}`}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover"
                    />
                )}

                {/* Top-left: Airbnb badge + B2B (internal-only, stacked below) */}
                <div className="absolute left-3 top-3 md:left-2.5 md:top-2.5 sm:left-2 sm:top-2 flex flex-col items-start gap-1.5">
                    {showAirbnbBadge && <AirbnbBadge size="sm" />}
                    {showB2bBadge && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 md:px-2 md:py-0.5 rounded-lg bg-violet-600/90 backdrop-blur-sm shadow-md shadow-violet-600/20">
                            <Zap className="w-3.5 h-3.5 md:w-3 md:h-3 text-white" />
                            <span className="text-[0.6875rem] md:text-[0.625rem] font-red-hat-display font-bold text-white tracking-wide">B2B Deals</span>
                        </div>
                    )}
                </div>

                {/* Top-right: shortlist button */}
                <div className="absolute right-3 top-3 md:right-2.5 md:top-2.5 sm:right-2 sm:top-2 flex items-center gap-1.5">
                    {onAddToCollection && (
                        <ShortlistButton
                            ariaLabel="Add to collection"
                            isShortlisted={isShortlisted}
                            onShortlist={onAddToCollection}
                            isLoading={isShortlisting}
                        />
                    )}
                </div>

                {/* Review Pills (left) */}
                <div className="absolute bottom-3 left-3 md:bottom-2.5 md:left-2.5 sm:bottom-2 sm:left-2">
                    <div className="flex gap-2 md:gap-1.5 sm:gap-1">
                        {platformReviews.filter((r) => r.rating > 0).slice(0, 2).map((review) => {
                            return (
                                <div
                                    key={review.platform}
                                    className="bg-natural-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 md:px-2.5 md:py-1.25 sm:px-2 sm:py-1 flex items-center gap-1.5 md:gap-1 sm:gap-1 shadow-sm">
                                    <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-grey-5">
                                        {review.logo_url ? (
                                            <img
                                                src={review.logo_url}
                                                alt={review.platform}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-header-black text-xs font-bold">{review.platform.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <span className="text-xs font-medium text-header-black">
                                        {Number(review.rating).toFixed(1)} ({review.review_count})
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 3D View CTA (right, appears on hover) */}
                <div className="cursor-pointer absolute bottom-3 right-3 md:bottom-2.5 md:right-2.5 sm:bottom-2 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            trackButtonClickCustom?.({
                            buttonPage: buttonPage,
                            buttonName: 'map_3d_view',
                            buttonAction: 'click'
                        })
                            if (onView3D) onView3D()
                        }}
                        className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 md:px-2.5 md:py-1.25 sm:px-2 sm:py-1 rounded-full bg-natural-white/95 backdrop-blur-sm border border-primary-default text-primary-default shadow-sm hover:bg-primary-default hover:text-white transition-colors">
                        <Map className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        <span className="text-xs md:text-[0.6875rem] font-semibold tracking-[-0.2px]">Map</span>
                    </button>
                </div>
            </div>

            {/* Hotel Details */}
            <div className="py-3.5 lg:py-3.5 md:py-3.5 sm:py-3.5 flex-1 flex flex-col gap-0 md:gap-0 sm:gap-0">
                <div className="flex items-center gap-1.5 px-4">
                    <h3 className="text-[1rem] md:text-[0.9375rem] sm:text-[0.875rem] font-bold text-header-black truncate min-w-0">{title}</h3>
                    {showVerifiedBadge && <VerifiedBadge size="sm" />}
                </div>

                <div className="flex items-start justify-between gap-3 font-medium px-4">
                    <div className="flex-1 min-w-0">
                        {locationTagLoading === true ? (
                            <div className="h-4 w-32 rounded bg-grey-4 animate-pulse" />
                        ) : locationTag ? (
                            <p
                                className="flex items-center truncate font-manrope"
                                style={{
                                    fontSize: 12,
                                    lineHeight: '16px',
                                    letterSpacing: '-0.02em',
                                    fontWeight: 600,
                                    color: '#343335',
                                }}>
                                {locationTag}
                            </p>
                        ) : null}
                    </div>
                    <div className="text-right ml-4 md:ml-3 sm:ml-2">
                        {isPriceLoading ? (
                            <div className="h-6 md:h-5 w-20 md:w-16 bg-grey-4 rounded animate-pulse" />
                        ) : deals.length > 0 ? (
                            ''
                        ) : isPriceUnavailable || !(price > 0) ? (
                            <div className="text-[0.875rem] md:text-[0.75rem] text-grey-2 whitespace-nowrap">-</div>
                        ) : (
                            <div className="text-[0.875rem] md:text-[0.75rem] text-grey-2 whitespace-nowrap">{formatPriceInr(price)}/night</div>
                        )}
                    </div>
                </div>

                {/* Deals Section */}
                {(deals.length > 0 || isDealsLoading) && (
                    <div className="mt-2 pt-2 border-t border-feature-card-border">
                        {isDealsLoading ? (
                            <div className="relative">
                                <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2">
                                    {Array.from({ length: 2 }).map((_, idx) => (
                                        <div
                                            key={idx}
                                            className="h-20 w-36 bg-grey-4 rounded-xl animate-pulse shrink-0"
                                        />
                                    ))}
                                </div>
                                {/* Left gradient */}
                                <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-natural-white to-transparent pointer-events-none z-10" />
                                {/* Right gradient */}
                                <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-natural-white to-transparent pointer-events-none z-10" />
                            </div>
                        ) : deals.length > 0 ? (
                            (() => {
                                return (
                                    <div className="relative">
                                        <div className="cursor-pointer flex items-end gap-3 overflow-x-auto scrollbar-hide pb-2">
                                            {sortedDeals.map((deal, idx) => {
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`${idx == 0 ? 'ml-4' : ''}`}>
                                                        <DealChip
                                                            deal={deal}
                                                            isCheapest={deal.is_cheapest}
                                                            buttonPage={buttonPage}
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        {/* Left gradient */}
                                        <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-natural-white to-transparent pointer-events-none z-10" />
                                        {/* Right gradient */}
                                        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-natural-white to-transparent pointer-events-none z-10" />
                                    </div>
                                )
                            })()
                        ) : null}
                    </div>
                )}

                {hasCuratedLabels && (
                    <div
                        className={`bg-grey-5 mx-4 rounded-xl p-2 md:p-2 sm:p-1.5 gap-3 md:gap-2 sm:gap-1.5 min-h-[80px] md:min-h-[70px] ${deals.length > 0 ? '' : 'mt-2'}`}>
                        <div className="flex-1">
                            {curatedLabels.slice(0, 3).map((label, index) => (
                                <div
                                    key={index}
                                    className={`text-[12px] md:text-[0.6875rem] flex items-center gap-1 font-manrope font-medium ${index > 0 ? '-mt-1' : ''}`}>
                                    <img
                                        src="/icons/purple-star.png"
                                        className="h-6 w-6 md:h-5 md:w-5 object-contain"
                                        alt=""
                                        srcSet="/icons/purple-star.png"
                                    />

                                    <div className="leading-none">
                                        {label.label}
                                        {label.value ? ` (${label.value})` : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* View More Button - appears on hover */}
            <div className="cursor-pointer absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        handleCardClick()
                    }}
                    className="bg-primary-default cursor-pointer font-red-hat-display rounded-br-xl rounded-tl-xl text-natural-white px-4 py-2.5 md:px-3.5 md:py-2 sm:px-3 sm:py-1.5 text-sm md:text-xs sm:text-xs font-semibold shadow-lg hover:bg-primary-dark transition-colors flex items-center gap-1.5 md:gap-1 sm:gap-1">
                    View more
                    <ArrowRight className="w-4 h-4 md:w-3.5 md:h-3.5 sm:w-3 sm:h-3" />
                </button>
            </div>
        </motion.div>
    )
}

export default StaysCard
