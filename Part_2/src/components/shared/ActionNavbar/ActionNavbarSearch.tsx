import { Search, SlidersHorizontal, X, MapPin, ArrowUpDown, ArrowDown01, ArrowDown10 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface CitySearchResult {
    id: string
    name: string
}

export interface SearchParams {
    cityId: string
    cityName: string
    checkIn?: Date
    checkOut?: Date
    groupType: string
    travelPurpose: string
    cityPreferences: string[]
}

interface ActionNavbarSearchProps {
    cityName?: string
    cityId?: string
    searchExpanded: boolean
    onSearchExpandToggle: () => void
    onFilterClick?: () => void
    iconSrc?: string
    iconAlt?: string
    cities?: CitySearchResult[]
    isLoadingCities?: boolean
    onCitySearch?: (query: string) => void
    onCitySelect?: (cityId: string, cityName: string) => void
    onSearch?: (params: SearchParams) => void
    // Prefill from URL/parent on first render
    initialCheckIn?: Date
    initialCheckOut?: Date
    initialGroupType?: string
    initialTravelPurpose?: string
    initialCityPreferences?: string[]
    // New: optionally open a specific segment when expanded
    initialActiveSegment?: 'where' | 'checkin' | 'checkout' | 'preferences' | null
    // New: configurable search text
    searchText?: string
}

const ActionNavbarSearch = ({
    cityName,
    searchExpanded,
    onSearchExpandToggle,
    onFilterClick,
    iconSrc = '/icons/bed.png',
    iconAlt = 'Hotels',
    cities = [],
    isLoadingCities = false,
    onCitySearch,
    onCitySelect,
    initialActiveSegment,
    searchText = 'Stays in'
}: ActionNavbarSearchProps) => {
    const [hoveredSegment, setHoveredSegment] = useState<string | null>(null)
    const [activeSegment, setActiveSegment] = useState<string | null>(null)
    const [pendingActiveSegment, setPendingActiveSegment] = useState<string | null>(null)
    const [whereText, setWhereText] = useState<string>(cityName || 'Search countries')
    const [selectedCityName, setSelectedCityName] = useState<string>(cityName || '')
    const [searchParams] = useSearchParams()
    // derive current sort from URL
    const currentOrderBy = (() => {
        const ob = searchParams.get('order_by')
        if (!ob) return { relevance: -1 } as Record<string, number>
        try {
            return JSON.parse(ob)
        } catch {
            return { relevance: -1 } as Record<string, number>
        }
    })()
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const onCitySearchRef = useRef(onCitySearch)

    // Keep ref updated with latest callback
    useEffect(() => {
        onCitySearchRef.current = onCitySearch
    }, [onCitySearch])

    // Reset active segment when search is collapsed
    useEffect(() => {
        if (!searchExpanded) {
            setActiveSegment(null)
            setHoveredSegment(null)
            setPendingActiveSegment(null)
        }
    }, [searchExpanded])

    // Open initial active segment when expanded if provided
    useEffect(() => {
        if (searchExpanded && initialActiveSegment) {
            setActiveSegment(initialActiveSegment)
        }
    }, [searchExpanded, initialActiveSegment])

    // Set active segment when expanding if there's a pending one
    useEffect(() => {
        if (searchExpanded && pendingActiveSegment) {
            setActiveSegment(pendingActiveSegment)
            setPendingActiveSegment(null)
        }
    }, [searchExpanded, pendingActiveSegment])

    // Sync whereText and selectedCityName with cityName prop
    useEffect(() => {
        setWhereText(cityName || 'Search countries')
        if (cityName) {
            setSelectedCityName(cityName)
        }
    }, [cityName])

    // Debounced city search
    useEffect(() => {
        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        // Only trigger search if:
        // 1. The "where" modal is open
        // 2. whereText is not empty and not the default text
        if (activeSegment === 'where' && whereText && whereText !== 'Search countries' && onCitySearchRef.current) {
            debounceTimerRef.current = setTimeout(() => {
                onCitySearchRef.current?.(whereText)
            }, 300) // 0.3s debounce
        }

        // Cleanup timer on unmount
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
        }
    }, [whereText, activeSegment])

    const handleLocationSelect = (cityId: string, cityName: string) => {
        setWhereText(cityName)
        setSelectedCityName(cityName)

        // Call onCitySelect to update the parent component with city details
        if (onCitySelect) {
            onCitySelect(cityId, cityName)
        }

        // Close the search
        setActiveSegment(null)
    }

    const handleClearLocation = (e: React.MouseEvent) => {
        e.stopPropagation()
        setWhereText('Search countries')
        setSelectedCityName('')
    }

    // Loading shimmer component
    const LocationLoadingShimmer = () => (
        <>
            {[1, 2, 3, 4, 5].map((index) => (
                <div
                    key={index}
                    className="w-full flex items-center gap-3 px-1 py-1">
                    <div className="p-4 flex items-center justify-center bg-grey-grey_4 rounded-md animate-pulse">
                        <div className="h-4 w-4 bg-grey-grey_3 rounded" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div
                            className="h-4 bg-grey-grey_4 rounded animate-pulse"
                            style={{ width: `${Math.random() * 30 + 60}%` }}
                        />
                    </div>
                </div>
            ))}
        </>
    )
    return (
        <div className="flex-1 mx-8 relative">
            <div className="flex items-center justify-center gap-3">
                {/* Search pill - compact or expanded */}
                <div
                    className={`w-full max-w-[530px] min-w-0 flex items-center ${activeSegment ? 'bg-grey-grey_4' : 'bg-natural-white'} border border-feature-card-border rounded-full shadow-sm transition-all duration-400 ease-out pr-2 py-1`}>
                    {/* Location */}
                    <button
                        className={`flex-1 px-2 ml-1 text-left cursor-pointer py-2 ${activeSegment === 'where' ? 'bg-natural-white rounded-full shadow-sm' : searchExpanded && hoveredSegment === 'where' ? 'bg-grey-grey_5 rounded-full' : 'rounded-l-full'} transition-all duration-200`}
                        onMouseEnter={() => searchExpanded && !activeSegment && setHoveredSegment('where')}
                        onMouseLeave={() => setHoveredSegment(null)}
                        onClick={() => {
                            if (searchExpanded) {
                                setActiveSegment(activeSegment === 'where' ? null : 'where')
                            } else {
                                onSearchExpandToggle()
                            }
                        }}>
                        <div className="flex items-center gap-2 w-full">
                            <img
                                src={iconSrc}
                                alt={iconAlt}
                                className="h-8 object-contain"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-grey-grey_2">Where</div>
                                {activeSegment === 'where' ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={whereText}
                                            onChange={(e) => setWhereText(e.target.value)}
                                            className="text-sm font-medium text-header-black bg-transparent border-none outline-none flex-1 min-w-0"
                                            placeholder="Search countries"
                                            autoFocus
                                        />
                                        {whereText !== 'Search countries' && (
                                            <button
                                                onClick={handleClearLocation}
                                                className="p-0.5 hover:bg-grey-grey_5 rounded-full transition-colors">
                                                <X className="h-3 w-3 text-grey-grey_2" />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-sm font-medium text-header-black truncate">
                                        {searchText} {selectedCityName || '...'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>

                    {/* Divider between Where and Search Button */}
                    <div
                        className={`h-6 w-px bg-feature-card-border transition-opacity duration-200 ${searchExpanded && activeSegment === 'where' ? 'opacity-0' : 'opacity-100'}`}
                    />

                    {/* Search Button */}
                    <motion.div
                        layout
                        onClick={onSearchExpandToggle}
                        className={`cursor-pointer ${searchExpanded ? 'h-10 w-10' : 'h-8 w-8'} shrink-0 flex items-center justify-center bg-primary-default text-natural-white rounded-full hover:bg-primary-light transition-all duration-400`}>
                        <Search
                            className={`${searchExpanded ? 'h-5 w-5' : 'h-4 w-4'}`}
                            strokeWidth={2}
                        />
                    </motion.div>
                </div>

                {/* Filters/Sort combined pill */}
                <div className="flex items-stretch border border-feature-card-border rounded-full overflow-hidden bg-natural-white">
                    {/* Filters */}
                    <button
                        onClick={onFilterClick}
                        className="cursor-pointer flex items-center gap-2 pl-4 pr-6 py-2 hover:bg-grey-grey_5 transition-colors">
                        <SlidersHorizontal className="h-5 w-5 text-header-black" />
                        <span className="text-sm font-medium text-header-black">Filters</span>
                    </button>
                    {/* Divider */}
                    <div className="w-px bg-feature-card-border my-2" />
                    {/* Sort */}
                    <button
                        onClick={() => {}}
                        className={`cursor-pointer flex items-center gap-2 pl-4 pr-6 py-2 hover:bg-grey-grey_5 transition-colors ${currentOrderBy.relevance ? '' : 'bg-primary-default_80'}`}>
                        {currentOrderBy.relevance ? (
                            <ArrowUpDown className="h-5 w-5 text-header-black" />
                        ) : currentOrderBy.rate === -1 ? (
                            <ArrowDown10 className="h-5 w-5 text-header-black" />
                        ) : (
                            <ArrowDown01 className="h-5 w-5 text-header-black" />
                        )}
                        <span className="text-sm font-medium text-header-black">Sort</span>
                    </button>
                </div>
            </div>

            {/* Where Modal */}
            {
                <div className="absolute top-full left-1/5 transform  mt-2 w-[280px] z-50">
                    <div className="bg-white border border-feature-card-border rounded-lg shadow-lg">
                        <div className="p-2">
                            {isLoadingCities ? (
                                <LocationLoadingShimmer />
                            ) : cities.length > 0 ? (
                                cities.map((city) => (
                                    <button
                                        key={city.id}
                                        onClick={() => handleLocationSelect(city.id, city.name)}
                                        className="cursor-pointer w-full flex items-center gap-3 px-1 py-1 text-left hover:bg-grey-grey_4  rounded-md transition-colors">
                                        <div className="p-4 flex items-center justify-center bg-grey-grey_4 rounded-md">
                                            <MapPin className="h-4 w-4 text-grey-grey_2 flex-shrink-0" />
                                        </div>
                                        <span className="text-sm font-medium text-header-black">{city.name}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-6 text-center text-sm text-grey-grey_2">No countries available</div>
                            )}
                        </div>
                    </div>
                </div>
            }
        </div>
    )
}

export default ActionNavbarSearch
