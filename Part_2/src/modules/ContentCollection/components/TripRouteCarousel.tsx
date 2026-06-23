import React, { useRef, useState, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import type { TripRouteCity } from '../adapter/overviewAdapter'

interface TripRouteCarouselProps {
    cities: TripRouteCity[]
    className?: string
    title?: string
    onCityClick?: (city: TripRouteCity, index: number) => void
}

const TripRouteCarousel: React.FC<TripRouteCarouselProps> = ({
    cities,
    className = '',
    title = 'Cities we visited',
    onCityClick
}) => {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)

    const checkScrollability = () => {
        if (!scrollRef.current) return
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
        setCanScrollLeft(scrollLeft > 0)
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }

    // Check scrollability on mount and when cities change
    useEffect(() => {
        if (cities.length > 0) {
            setTimeout(() => {
                checkScrollability()
            }, 100)
        }
    }, [cities.length])

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return
        const scrollAmount = 300 // Approximate card width + gap
        const newScrollLeft =
            direction === 'left'
                ? scrollRef.current.scrollLeft - scrollAmount
                : scrollRef.current.scrollLeft + scrollAmount
        scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
    }

    if (!cities || cities.length === 0) {
        return null
    }

    const handleCityClick = (city: TripRouteCity, index: number) => {
        if (onCityClick) {
            onCityClick(city, index)
        }
    }

    return (
        <div className={`w-full relative ${className}`}>
            {/* Section Title */}
            <div className="mb-4">
                <h3 className="text-[15px] font-bold text-grey-0 font-red-hat-display tracking-[-0.04em]">
                    {title}
                </h3>
            </div>

            {/* Left gradient */}
            {canScrollLeft && (
            <div
                onClick={() => scroll("left")}
                className="absolute left-0 top-0 h-full w-20 z-10 
                        bg-gradient-to-r from-white to-transparent 
                        cursor-pointer"
            />
            )}

            {/* Right gradient */}
            {canScrollRight && (
            <div
                onClick={() => scroll("right")}
                className="absolute right-0 top-0 h-full w-20 z-10 
                        bg-gradient-to-l from-grey-5 to-transparent 
                        cursor-pointer"
            />
            )}

            {/* Carousel container */}
            <div
                ref={scrollRef}
                onScroll={checkScrollability}
                className="flex items-center justify-between gap-[14.1px] overflow-x-auto scroll-smooth no-scrollbar pb-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {/* Starting point icon */}
                <div className="shrink-0 flex items-center justify-center">
                    <div className="h-[34px] w-[34px] rounded-full bg-grey-5 border border-grey-4 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-grey-2" />
                    </div>
                </div>

                {/* Cities with connecting lines */}
                {cities.map((city, index) => (
                    <React.Fragment key={`${city.id}-${index}`}>
                        {/* Dashed connecting line */}
                        <div className="h-px w-[25px] md:w-[85px] shrink-0 border-t border-dashed border-grey-3" />

                        {/* City card */}
                        <div
                            onClick={() => handleCityClick(city, index)}
                            className={`rounded-2xl bg-white border border-grey-4 flex flex-col items-start py-3 px-5 gap-2 shrink-0 transition-shadow ${
                                onCityClick ? 'hover:border-primary-default' : ''
                            }`}>
                            <b className="relative tracking-[-0.04em] leading-5 text-[16px] font-bold text-grey-0 font-red-hat-display">
                                {city.name}
                            </b>
                            <div className="relative text-sm tracking-[-0.04em] leading-[18px] font-medium font-manrope text-grey-0">
                                {city.nights} {city.nights === 1 ? 'night' : 'nights'}
                            </div>
                        </div>
                    </React.Fragment>
                ))}

                {/* Ending dashed line */}
                <div className="h-px w-[85px] shrink-0 border-t border-dashed border-grey-3" />

                <div className="shrink-0 flex items-center justify-center">
                    <div className="h-[34px] w-[34px] rounded-full bg-grey-5 border border-grey-4 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-grey-2" />
                    </div>
                </div>

                {/* Ending arrow icon */}
                
            </div>
        </div>
    )
}

export default TripRouteCarousel
