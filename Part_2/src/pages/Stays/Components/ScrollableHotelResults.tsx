import React, { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import HotelCard from './HotelCard'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

interface ScrollableHotelResultsProps {
    hotels: any[]
    className?: string
    // Navigation props
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
    shortlistState?: Record<string, { accommodationId: string; isShortlisted: boolean }>
    shortlistLoadingIds?: Record<string, boolean>
    onToggleShortlist?: (zentrumHubId: string, accommodationId: string) => Promise<void> | void
}

const ScrollableHotelResults: React.FC<ScrollableHotelResultsProps> = ({
    hotels,
    className = '',
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
    shortlistState = {},
    shortlistLoadingIds = {},
    onToggleShortlist
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)
    const { trackEvent } = usePostHog()
    // Check scroll state
    const checkScrollState = () => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current
            const { scrollLeft, scrollWidth, clientWidth } = container
            const visibleStartIndex = Math.floor(scrollLeft / 320)
            const visibleEndIndex = Math.min(hotels.length - 1, Math.floor((scrollLeft + clientWidth) / 320))
            const visibleHotels = hotels.slice(visibleStartIndex, visibleEndIndex + 1).map((h) => h.accommodation_id || h.id || '')

            trackEvent('Scrollable Hotels Viewed', {
                city_id: cityId,
                city_name: cityName,
                check_in: checkIn,
                check_out: checkOut,
                travel_purpose: travelPurpose,
                group_type: groupType,
                preferences,
                visible_hotels: visibleHotels,
                total_hotels: hotels.length
            })
            setCanScrollLeft(scrollLeft > 0)
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth)
        }
    }

    // Handle horizontal scrolling right
    const handleScrollRight = () => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current
            const scrollAmount = 320 // Width of one card + gap
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
        }
    }

    // Handle horizontal scrolling left
    const handleScrollLeft = () => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current
            const scrollAmount = 320 // Width of one card + gap
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
        }
    }

    // Add scroll event listener
    useEffect(() => {
        const container = scrollContainerRef.current
        if (container) {
            container.addEventListener('scroll', checkScrollState)
            checkScrollState() // Initial check

            return () => {
                container.removeEventListener('scroll', checkScrollState)
            }
        }
    }, [hotels])

    if (!hotels || hotels.length === 0) {
        return null
    }

    return (
        <div className={`relative ${className}`}>
            <div
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {hotels.map((hotel: any, index: number) => {
                    const hubId = hotel.zentrum_hub_id || hotel.accommodation_id || ''
                    const accommodationId = hotel.accommodation_id || hotel.id || ''
                    const shortlistEntry = hubId ? shortlistState[hubId] : undefined
                    const isShortlisted = shortlistEntry?.isShortlisted ?? false
                    const isShortlisting = hubId ? Boolean(shortlistLoadingIds[hubId]) : false
                    return (
                        <HotelCard
                            key={hotel.accommodation_id || index}
                            hotel={hotel}
                            index={index}
                            zentrumHubId={hubId}
                            cityId={cityId}
                            cityName={cityName}
                            checkIn={checkIn}
                            checkOut={checkOut}
                            travelPurpose={travelPurpose}
                            groupType={groupType}
                            preferences={preferences}
                            adults={adults}
                            children={children}
                            infants={infants}
                            children_age={children_age}
                            isShortlisted={isShortlisted}
                            onToggleShortlist={
                                hubId && accommodationId && onToggleShortlist ? () => onToggleShortlist(hubId, accommodationId) : undefined
                            }
                            isShortlisting={isShortlisting}
                        />
                    )
                })}
            </div>

            {/* Scroll Left Button */}
            {canScrollLeft && (
                <button
                    onClick={handleScrollLeft}
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-grey_3 rounded-full flex items-center justify-center hover:bg-grey_5 transition-colors shadow-sm z-10">
                    <ChevronLeft className="w-4 h-4 text-grey_1" />
                </button>
            )}

            {/* Scroll Right Button */}
            {canScrollRight && (
                <button
                    onClick={handleScrollRight}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 w-8 h-8 bg-white border border-grey_3 rounded-full flex items-center justify-center hover:bg-grey_5 transition-colors shadow-sm z-10">
                    <ChevronRight className="w-4 h-4 text-grey_1" />
                </button>
            )}
        </div>
    )
}

export default ScrollableHotelResults
