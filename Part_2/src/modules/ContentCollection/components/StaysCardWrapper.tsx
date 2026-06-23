import { useState } from 'react'
import StaysCard from '@/pages/Stays/Components/StaysCard'
import type { AccommodationMetadataItem } from '@/pages/Stays/Apis/accommodationsAPI'
import { useIsMobile } from '@/hooks/use-mobile'
import type { GuestsData } from '@/components/common/SearchBar'
import type { PlatformPrice } from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import type { OccupanciesConfig } from '@/types/occupancy'
import RemoveSectionButton from './RemoveSectionButton'

interface PlatformReview {
    platform: string
    review_count: number
    rating: number
    url: string
    logo_url: string | null
}

interface StaysCardWrapperProps {
    stay: AccommodationMetadataItem
    index: number
    locationTag?: string | React.ReactNode
    /** Shimmer the locationTag slot + suppress "Near <city>" fallback. */
    locationTagLoading?: boolean
    imageUrl: string
    images?: string[]
    platformReviews?: PlatformReview[]
    kayakStarRating?: number
    zentrumHubId: string
    checkIn?: string // YYYY-MM-DD format
    checkOut?: string // YYYY-MM-DD format
    cityId?: string
    cityName?: string
    travelPurpose?: string
    groupType?: string
    preferences?: string[]
    guestsData?: GuestsData
    occupancies?: OccupanciesConfig
    isShortlisted?: boolean
    isShortlisting?: boolean
    onToggleShortlist?: () => void
    viewType?: 'grid' | 'list'
    curatedLabels?: Array<{ label: string; value: string | null }>
    onAddToCollection?: (() => void) | false | null
    category?: string | null
    buttonPage?: string
    priceData?: { displayPrice: number; platforms: PlatformPrice[]; isPriceLoading: boolean; isPriceUnavailable: boolean } // Price data from parent
    sectionId?: string // Section ID for deletion
    onDeleteSection?: (sectionId: string) => void // Callback to delete section
    showDeleteButton?: boolean // Whether to show delete button
    isDeleting?: boolean // Whether deletion is in progress
    isVerified?: boolean
    isB2bDealAvailable?: boolean
    isAvailableOnAirbnb?: boolean
    onView3D?: () => void
    /** Star rating from the accommodation API (separate from kayakStarRating). */
    starRating?: number | string
    /** Suppress "+ Select" button (used on collection detail pages). */
    hideSelectItineraryButton?: boolean
    /** Read-only / external viewer — hides Shortlist + Add-to-itinerary
     *  controls on the list view card. */
    isReadOnly?: boolean
}

const StaysCardWrapper: React.FC<StaysCardWrapperProps> = ({
    stay,
    index,
    locationTag,
    locationTagLoading,
    imageUrl,
    images,
    platformReviews,
    kayakStarRating,
    zentrumHubId,
    checkIn,
    checkOut,
    cityId,
    cityName,
    travelPurpose,
    groupType,
    preferences,
    guestsData,
    occupancies,
    isShortlisted = false,
    isShortlisting = false,
    onToggleShortlist,
    viewType = 'grid',
    curatedLabels = [],
    onAddToCollection,
    category,
    buttonPage,
    priceData,
    sectionId,
    onDeleteSection,
    showDeleteButton = false,
    isDeleting = false,
    isVerified = false,
    isB2bDealAvailable = false,
    isAvailableOnAirbnb = false,
    onView3D,
    starRating,
    hideSelectItineraryButton = false,
    isReadOnly = false
}) => {
    const isMobile = useIsMobile()
    const [isHovered, setIsHovered] = useState(false)
    /** List view always uses single in-flow card (no hover/absolute overlay) so expanded deals grow the card height */
    const useSingleFlowCard = viewType === 'list'

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (sectionId && onDeleteSection) {
            onDeleteSection(sectionId)
        }
    }

    // Use price data from parent (fetched via compare API in ViewContentCollection)
    // Fallback to stay.rate_per_night if priceData is not available
    const displayPrice = priceData?.displayPrice ?? (stay.rate_per_night || 0)
    const isPriceLoading = priceData?.isPriceLoading ?? false
    const isPriceUnavailable = priceData?.isPriceUnavailable ?? (!priceData && !stay.rate_per_night)
    const deals = priceData?.platforms ?? []
    const isDealsLoading = priceData?.isPriceLoading ?? false

    return (
        <div
            className="relative w-full"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}>
            {/* Remove button */}
            {showDeleteButton && sectionId && onDeleteSection && (
                <RemoveSectionButton onClick={handleDeleteClick} disabled={isDeleting} />
            )}
            {useSingleFlowCard ? (
                <StaysCard
                    id={index}
                    title={stay.name}
                    price={displayPrice}
                    image={imageUrl}
                    images={images}
                    fullHeight={true}
                    zentrumHubId={zentrumHubId}
                    accommodation_id={stay.id}
                    locationTag={locationTag}
                    locationTagLoading={locationTagLoading}
                    cityId={cityId}
                    cityName={cityName}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    travelPurpose={travelPurpose}
                    groupType={groupType}
                    preferences={preferences}
                    guestsData={guestsData}
                    occupancies={occupancies}
                    isShortlisted={isShortlisted}
                    isShortlisting={isShortlisting}
                    onToggleShortlist={onToggleShortlist}
                    isPriceLoading={isPriceLoading}
                    isPriceUnavailable={isPriceUnavailable}
                    deals={deals.length > 0 ? deals : undefined}
                    isDealsLoading={isDealsLoading}
                    viewType={viewType}
                    curatedLabels={curatedLabels}
                    onAddToCollection={onAddToCollection}
                    category={category}
                    reviewType="complete"
                    platformReviews={platformReviews}
                    isReadOnly={isReadOnly}
                    buttonPage={buttonPage}
                    kayakStarRating={kayakStarRating}
                    starRating={starRating}
                    isVerified={isVerified}
                    isB2bDealAvailable={isB2bDealAvailable}
                    isAvailableOnAirbnb={isAvailableOnAirbnb}
                    onView3D={onView3D}
                    hideSelectItineraryButton={hideSelectItineraryButton}
                />
            ) : (
                <>
                    {/* Invisible placeholder to maintain grid cell size */}
                    <div className={isHovered || isMobile ? 'invisible' : 'visible'}>
                        <StaysCard
                            id={index}
                            title={stay.name}
                            price={displayPrice}
                            image={imageUrl}
                            images={images}
                            fullHeight={true}
                            zentrumHubId={zentrumHubId}
                            accommodation_id={stay.id}
                            locationTag={locationTag}
                            locationTagLoading={locationTagLoading}
                            cityId={cityId}
                            cityName={cityName}
                            checkIn={checkIn}
                            checkOut={checkOut}
                            travelPurpose={travelPurpose}
                            groupType={groupType}
                            preferences={preferences}
                            guestsData={guestsData}
                            occupancies={occupancies}
                            isShortlisted={isShortlisted}
                            isShortlisting={isShortlisting}
                            onToggleShortlist={onToggleShortlist}
                            isPriceLoading={isPriceLoading}
                            isPriceUnavailable={isPriceUnavailable}
                            deals={deals.length > 0 ? deals : undefined}
                            isDealsLoading={isDealsLoading}
                            viewType={viewType}
                            curatedLabels={curatedLabels}
                            onAddToCollection={onAddToCollection}
                            category={category}
                            reviewType="complete"
                            platformReviews={platformReviews}
                            buttonPage={buttonPage}
                            kayakStarRating={kayakStarRating}
                            isVerified={isVerified}
                            isB2bDealAvailable={isB2bDealAvailable}
                            isAvailableOnAirbnb={isAvailableOnAirbnb}
                            onView3D={onView3D}
                        />
                    </div>
                    {/* Absolutely positioned card on hover */}
                    {(isHovered || isMobile) && (
                        <div className="absolute left-0 top-0 w-full z-20">
                            <StaysCard
                                id={index}
                                title={stay.name}
                                price={displayPrice}
                                image={imageUrl}
                                images={images}
                                fullHeight={true}
                                zentrumHubId={zentrumHubId}
                                accommodation_id={stay.id}
                                locationTag={locationTag}
                                locationTagLoading={locationTagLoading}
                                cityId={cityId}
                                cityName={cityName}
                                checkIn={checkIn}
                                checkOut={checkOut}
                                travelPurpose={travelPurpose}
                                groupType={groupType}
                                preferences={preferences}
                                guestsData={guestsData}
                                occupancies={occupancies}
                                isShortlisted={isShortlisted}
                                isShortlisting={isShortlisting}
                                onToggleShortlist={onToggleShortlist}
                                isPriceLoading={isPriceLoading}
                                isPriceUnavailable={isPriceUnavailable}
                                deals={deals.length > 0 ? deals : undefined}
                                isDealsLoading={isDealsLoading}
                                viewType={viewType}
                                reviewType="complete"
                                platformReviews={platformReviews}
                                curatedLabels={curatedLabels}
                                onAddToCollection={onAddToCollection}
                                category={category}
                                buttonPage={buttonPage}
                                kayakStarRating={kayakStarRating}
                                isVerified={isVerified}
                                isB2bDealAvailable={isB2bDealAvailable}
                                onView3D={onView3D}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default StaysCardWrapper
