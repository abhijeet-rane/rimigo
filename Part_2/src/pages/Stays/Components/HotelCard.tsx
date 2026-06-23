import React from 'react'
import ShortlistButton from '@/components/common/ShortlistButton'

interface HotelCardProps {
    hotel: any
    index: number
    className?: string
    // Navigation props
    zentrumHubId?: string
    cityId?: string
    cityName?: string
    checkIn?: string
    checkOut?: string
    travelPurpose?: string
    groupType?: string
    preferences?: string[]
    adults?: number
    children?: number
    infants?: number
    children_age?: number[]
    // Shortlist props
    isShortlisted?: boolean
    onToggleShortlist?: () => Promise<void> | void
    isShortlisting?: boolean
}

const HotelCard: React.FC<HotelCardProps> = ({
    hotel,
    index,
    className = '',
    zentrumHubId,
    cityId,
    cityName,
    checkIn,
    checkOut,
    travelPurpose,
    groupType,
    preferences,
    adults,
    children,
    infants,
    children_age,
    isShortlisted = false,
    onToggleShortlist,
    isShortlisting = false
}) => {
    const getMatchColor = (percentage: number) => {
        if (percentage >= 80) return '#26BC6D'
        if (percentage >= 60) return '#FFD700'
        return '#F44336'
    }

    const formatReviewCount = (count: number) => {
        if (count >= 1000000) return (count / 1000000).toFixed(1).replace('.0', '') + 'M'
        if (count >= 1000) return (count / 1000).toFixed(1).replace('.0', '') + 'K'
        return String(count)
    }
    const handleCardClick = () => {
        const hubId = zentrumHubId || hotel.zentrum_hub_id || hotel.accommodation_id
        const hotelName = hotel.hotel_name || hotel.name || 'Hotel'

        if (hubId && cityId && cityName) {
            const matchPercentage = hotel.match_percentage || 0

            const tags =
                hotel.tags
                    ?.map((tag: any) => {
                        const label = tag.label.toLowerCase().replace(/_/g, ' ')
                        const value = tag.value ? 'true' : 'false'
                        return `${label}:${value}`
                    })
                    .join(',') || ''

            const searchParams = new URLSearchParams({
                hotel_name: hotelName,
                zentrum_hub_id: hubId,
                city_id: cityId,
                check_in: checkIn || '',
                check_out: checkOut || '',
                city_name: cityName,
                travel_purpose: travelPurpose || '',
                group_type: groupType || '',
                city_prefs: preferences?.join(',') || '',
                review_type: 'complete',
                accommodation_id: hotel.accommodation_id || '',
                match_percentage: String(matchPercentage),
                tags: tags
            })

            // Add group setup details if available
            if (adults !== undefined && adults !== null) {
                searchParams.set('adults', String(adults))
            }
            if (children !== undefined && children !== null) {
                searchParams.set('children', String(children))
            }
            if (infants !== undefined && infants !== null) {
                searchParams.set('infants', String(infants))
            }
            if (children_age && children_age.length > 0) {
                searchParams.set('children_age', children_age.join(','))
            }

            const detailUrl = `/stays/${hubId}?${searchParams.toString()}`
            window.open(detailUrl, '_blank')
        }
    }

    return (
        <div
            key={hotel.accommodation_id || index}
            className={`flex-shrink-0 w-80 ${index === 0 ? 'ml-4' : ''} ${className}`}>
            {/* Match Score Banner */}
            <div
                className="h-11 flex items-start justify-center pt-1.5 rounded-t-2xl"
                style={{ backgroundColor: getMatchColor(hotel.match_percentage || 0) }}>
                <span className="text-sm font-bold text-white font-red-hat-display">{hotel.match_percentage || 0}% match</span>
            </div>

            {/* Main Hotel Card */}
            <div
                className="-mt-3.5 relative z-10 bg-white rounded-2xl shadow-md border border-grey_4 overflow-hidden cursor-pointer hover:border-primary-default transition-colors"
                onClick={handleCardClick}>
                {/* Hotel Image */}
                <div className="relative h-56">
                    {hotel.images && hotel.images[0] ? (
                        <img
                            src={hotel.images[0]}
                            alt={hotel.hotel_name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-grey_4" />
                    )}

                    {/* Shortlist Button - Top Right */}
                    <div className="absolute right-3 top-3 md:right-2.5 md:top-2.5 sm:right-2 sm:top-2">
                        <ShortlistButton
                            ariaLabel="Save to shortlist"
                            isShortlisted={isShortlisted}
                            onShortlist={onToggleShortlist}
                            isLoading={isShortlisting}
                        />
                    </div>

                    {/* Platform Reviews - Bottom Left */}
                    {hotel.platform_reviews && hotel.platform_reviews.length > 0 && (
                        <div className="absolute bottom-3 left-3 flex gap-2">
                            {hotel.platform_reviews
                                .sort((a: any, b: any) => b.review_count - a.review_count)
                                .slice(0, 2)
                                .map((review: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className="bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                                        {review.logo_url ? (
                                            <img
                                                src={review.logo_url}
                                                alt="platform"
                                                className="w-5 h-5 rounded-full"
                                            />
                                        ) : (
                                            <span className="text-white text-xs font-bold w-5 h-5 rounded-full bg-primary-default flex items-center justify-center">
                                                {review.platform?.charAt(0).toUpperCase() || 'B'}
                                            </span>
                                        )}
                                        <span className="text-xs font-bold text-grey_0 font-red-hat-display">{review.rating}</span>
                                        <span className="text-xs text-grey_1 font-manrope">({formatReviewCount(review.review_count)})</span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                {/* Hotel Details */}
                <div className="p-4 flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-3">
                        <h3 className="text-base font-semibold text-grey_0 mb-1 font-red-hat-display line-clamp-1">
                            {hotel.hotel_name || hotel.name || 'Hotel'}
                        </h3>
                        <p className="text-xs font-bold text-grey_2 font-manrope">{hotel.city || cityName || ''}</p>
                    </div>
                    {(hotel.total_rate > 0 || hotel.rate_per_night > 0) && (
                        <div className="text-right flex-shrink-0">
                            <p className="text-base font-extrabold text-grey_0 font-red-hat-display">
                                ₹{Math.round((hotel.total_rate || hotel.rate_per_night || 0) * 1.05).toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-grey_1 font-red-hat-display">price per night</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Criteria Card */}
            <div className="-mt-3 relative z-0 bg-grey_5 p-3 pt-7 rounded-b-xl border border-grey_4 shadow-sm">
                <div className="bg-secondary-purple_80 rounded-xl p-2">
                    {/* Header */}
                    <div className="flex items-center justify-between w-full px-1 mb-1">
                        <span className="text-xs font-semibold text-primary-default font-red-hat-display flex-1 text-left">
                            Based on your search, we've matched the criteria
                        </span>
                        <svg
                            className="w-4 h-4 text-primary-default flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </div>

                    {/* Criteria Content */}
                    <div className="flex gap-2 mt-1">
                        {/* Features - Left Column */}
                        <div className="flex-1 bg-white rounded-xl p-2 min-h-[70px] flex flex-col gap-1">
                            {hotel.tags
                                ?.filter((tag: any) => tag.value)
                                .slice(0, 3)
                                .map((tag: any, tagIdx: number) => (
                                    <div
                                        key={tagIdx}
                                        className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-secondary-green flex items-center justify-center flex-shrink-0">
                                            <svg
                                                className="w-2 h-2 text-white"
                                                fill="currentColor"
                                                viewBox="0 0 20 20">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                        <span className="text-xs text-grey_0 font-manrope capitalize">
                                            {tag.label.toLowerCase().replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                ))}
                        </div>

                        {/* Remark - Right Column */}
                        <div className="flex-1 bg-white rounded-xl p-2 min-h-[70px] flex items-start">
                            <div className="flex items-start gap-1.5 w-full">
                                {hotel.remark?.remark_type === 'GREEN' ? (
                                    <svg
                                        className="w-4 h-4 text-secondary-green flex-shrink-0 mt-0.5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20">
                                        <path d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" />
                                    </svg>
                                ) : (
                                    <svg
                                        className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                )}
                                <p className="text-xs text-grey_1 font-manrope leading-4 flex-1">{hotel.remark?.remark_description || ''}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HotelCard
