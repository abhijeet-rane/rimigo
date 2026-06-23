import React, { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BEACH_TREE } from '@/constants/icons/svgFromCDN'
import { CountryData } from '@/hooks/useCountries'

interface CountrySwitcherProps {
    countries: CountryData[]
    selectedCountryId: string | null
    onCountrySelect: (countryId: string, countryName: string) => void
    isLoading?: boolean
}

export const CountrySwitcher: React.FC<CountrySwitcherProps> = ({
    countries,
    selectedCountryId,
    onCountrySelect,
    isLoading = false
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [showLeftArrow, setShowLeftArrow] = useState(false)
    const [showRightArrow, setShowRightArrow] = useState(false)

    // Check scroll position to show/hide arrows
    const checkScrollPosition = () => {
        if (!scrollContainerRef.current) return
        
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
        setShowLeftArrow(scrollLeft > 0)
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1)
    }

    useEffect(() => {
        checkScrollPosition()
        const container = scrollContainerRef.current
        if (container) {
            container.addEventListener('scroll', checkScrollPosition)
            window.addEventListener('resize', checkScrollPosition)
        }
        return () => {
            if (container) {
                container.removeEventListener('scroll', checkScrollPosition)
            }
            window.removeEventListener('resize', checkScrollPosition)
        }
    }, [countries])

    // Scroll to selected country on mount or when selection changes
    useEffect(() => {
        if (!scrollContainerRef.current || !selectedCountryId) return
        
        const selectedIndex = countries.findIndex(c => c.country_id === selectedCountryId)
        if (selectedIndex === -1) return
        
        const container = scrollContainerRef.current
        const selectedElement = container.children[selectedIndex] as HTMLElement
        if (selectedElement) {
            const containerRect = container.getBoundingClientRect()
            const elementRect = selectedElement.getBoundingClientRect()
            const scrollLeft = container.scrollLeft + (elementRect.left - containerRect.left) - (containerRect.width / 2) + (elementRect.width / 2)
            
            container.scrollTo({
                left: scrollLeft,
                behavior: 'smooth'
            })
        }
    }, [selectedCountryId, countries])

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollContainerRef.current) return
        
        const container = scrollContainerRef.current
        const scrollAmount = 200 // pixels to scroll
        const scrollTo = direction === 'left' 
            ? container.scrollLeft - scrollAmount
            : container.scrollLeft + scrollAmount
        
        container.scrollTo({
            left: scrollTo,
            behavior: 'smooth'
        })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-2 min-w-[200px]">
                <div className="h-8 w-32 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
        )
    }

    if (countries.length === 0) {
        return (
            <div className="flex items-center justify-center py-2 min-w-[200px]">
                <span className="text-sm text-grey-2">No countries available</span>
            </div>
        )
    }

    return (
        <div className="relative flex items-center justify-center">
            {/* Grey Container with Country Blocks - Always Centered */}
            <div 
                className="flex items-center mx-auto bg-grey-5 border border-grey-4 rounded-[40px] p-0.5 max-w-[200px] sm:max-w-[250px] md:max-w-[300px] lg:max-w-[340px] xl:max-w-[380px] w-auto h-auto visible"
            >
                {/* Scrollable Container */}
                <div
                    ref={scrollContainerRef}
                    className="flex items-center gap-3 overflow-x-auto scrollbar-hide"
                    style={{ width: '100%' }}
                >
                    {countries.map((country) => {
                        const isSelected = country.country_id === selectedCountryId
                        // Always show full country name
                        const displayText = country.country_name

                        return (
                            <button
                                key={country.country_id}
                                onClick={() => onCountrySelect(country.country_id, country.country_name)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
                                    transition-all duration-200 flex-shrink-0 cursor-pointer
                                `}
                                style={{
                                    border: isSelected ? '2px solid #7011F6' : '1px solid transparent',
                                    backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                                }}
                            >
                                {/* Flag Icon */}
                                {country.flag_icon_url ? (
                                    <img
                                        src={country.flag_icon_url || BEACH_TREE}
                                        alt={country.country_name}
                                        className="w-6 h-6 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center">
                                        <img
                                            src={BEACH_TREE}
                                            alt={country.country_name}
                                            className="w-6 h-6 rounded-full object-cover"
                                        />
                                    </div>
                                )}
                                
                                {/* Country Name/Code */}
                                <span
                                    className="font-manrope font-semibold text-sm text-grey-0"
                                    style={{
                                        fontWeight: 600
                                    }}
                                >
                                    {displayText}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Left Arrow - Absolutely positioned, doesn't affect layout */}
            {showLeftArrow && (
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 z-10 p-1 bg-white rounded-full shadow-md cursor-pointer hover:bg-grey-5 transition-colors"
                    style={{
                        transform: 'translateX(calc(-100% - 8px))'
                    }}
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="w-5 h-5 text-black" />
                </button>
            )}

            {/* Right Arrow - Absolutely positioned, doesn't affect layout */}
            {showRightArrow && (
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 z-10 p-1 bg-white cursor-pointer rounded-full shadow-md hover:bg-grey-5 transition-colors"
                    style={{
                        transform: 'translateX(calc(100% + 8px))'
                    }}
                    aria-label="Scroll right"
                >
                    <ChevronRight className="w-5 h-5 text-black" />
                </button>
            )}
        </div>
    )
}

