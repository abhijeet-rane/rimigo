import React, { useState, useEffect, useRef } from 'react'
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI'
import { useOutsideClick } from '@/hooks/use-outside-click'
import { ExperiencesCityFilter } from './ExperiencesHeader/ExperiencesCityFilter'
import { CitiesApiResponse } from '../types/city'
import { ExperiencesCountryFilter } from './ExperiencesHeader/ExperiencesCountryFilter'
import { HOT_AIR_BALLOON_ICON } from '@/constants/thiingsIcons'

interface ExperienceNavbarSearchProps {
    cityName?: string
    searchExpanded?: boolean
    onSearchExpandToggle?: () => void
    setIsFilterOpen?: (isFilterOpen: boolean) => void
    iconSrc?: string
    iconAlt?: string
    countries?: LocationPersonalizationResponse[]
    isCountriesLoading?: boolean
    onCountrySearch?: (query: string) => void
    onCountrySelect?: (countryId: string, countryName: string) => void
    searchText?: string
    currentCountryName?: string
    citiesData?: CitiesApiResponse
    onCitySelect?: (cityIds: string[], cityNames: string[]) => void
    currentCityName?: string
    isCitiesLoading?: boolean
    selectedCities?: string[]

    // city dropdown props
    isCityDropdownOpen: boolean
    setIsCityDropdownOpen: (isCityDropdownOpen: boolean) => void
    cityDropdownRef: React.RefObject<HTMLDivElement | null>

    // trip-based country filter props
    trip_id?: string
    tripCountriesData?: { results: Array<{ id: string; name: string; experience_count?: number }> }
    onTripCountrySelect?: (countryIds: string[]) => void
    selectedCountries?: string[]
    isCountryDropdownOpen?: boolean
    setIsCountryDropdownOpen?: (isCountryDropdownOpen: boolean) => void
    countryDropdownRef?: React.RefObject<HTMLDivElement | null>
}

const ExperienceNavbarSearch: React.FC<ExperienceNavbarSearchProps> = ({
    cityName,
    countries,
    isCountriesLoading,
    onCountrySelect,
    currentCountryName,
    onSearchExpandToggle,
    setIsFilterOpen,
    iconSrc,
    iconAlt,
    searchText,
    citiesData,
    onCitySelect,
    selectedCities,
    isCitiesLoading,
    isCityDropdownOpen,
    setIsCityDropdownOpen,
    cityDropdownRef,
    trip_id,
    tripCountriesData,
    onTripCountrySelect,
    selectedCountries,
    isCountryDropdownOpen,
    setIsCountryDropdownOpen,
    countryDropdownRef
}) => {
    const [whereText, setWhereText] = useState<string>(currentCountryName || cityName || 'Search countries')
    const [selectedCityName, setSelectedCityName] = useState<string>(currentCountryName || cityName || '')
    const [isSearchActive, setIsSearchActive] = useState(false)
    const [searchExpanded, setSearchExpanded] = useState(false)

    // Ref for outside click detection
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Handle outside click to close dropdown
    useOutsideClick(dropdownRef as React.RefObject<HTMLDivElement>, () => {
        setSearchExpanded(false)
        setIsSearchActive(false)
    })

    // Sync whereText and selectedCityName with currentCountryName prop
    useEffect(() => {
        if (currentCountryName) {
            setWhereText(currentCountryName)
            setSelectedCityName(currentCountryName)
        } else if (cityName) {
            setWhereText(cityName)
            setSelectedCityName(cityName)
        } else {
            setWhereText('Search countries')
            setSelectedCityName('')
        }
    }, [currentCountryName, cityName])

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setWhereText(value)
        setIsSearchActive(true)
    }

    // Handle country selection
    const handleCountrySelect = (countryId: string, countryName: string) => {
        setWhereText(countryName)
        setSelectedCityName(countryName)
        setIsSearchActive(false)
        setSearchExpanded(false)

        // Call the parent's country selection handler
        if (onCountrySelect) {
            onCountrySelect(countryId, countryName)
        }
    }
    // Handle search bar click
    const handleSearchBarClick = () => {
        if (!searchExpanded) {
            if (onSearchExpandToggle) {
                onSearchExpandToggle()
            }
            setSearchExpanded(true)
        }
        setIsSearchActive(true)
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

    const handleFilterClick = () => {
        if (setIsFilterOpen) {
            setIsFilterOpen(true)
        }
    }

    return (
        <div
            ref={dropdownRef}
            className="flex-1 mx-8 relative"
            style={{ zIndex: 100 }}>
            <div className="flex items-center justify-center gap-3">
                {/* Search pill */}
                <div
                    className={`w-full max-w-[530px] min-w-0 flex items-center ${isSearchActive ? 'bg-grey-grey_4' : 'bg-natural-white'} border border-feature-card-border rounded-full shadow-sm transition-all duration-400 ease-out pr-2 py-1 relative`}>
                    {/* Location */}
                    <button
                        className="flex-1 ml-1 text-left cursor-pointer rounded-l-full transition-all duration-200"
                        onClick={handleSearchBarClick}>
                        <div className="flex items-center gap-2 w-full">
                            <img
                                src={iconSrc || HOT_AIR_BALLOON_ICON}
                                alt={iconAlt || 'Activities'}
                                className="h-9 object-contain"
                            />
                            <div className="flex-1 min-w-0 flex items-center gap-1">
                                <div className=" text-sm font-medium text-header-black truncate">Activities in</div>
                                {isSearchActive ? (
                                    <span className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={whereText}
                                            onChange={handleSearchChange}
                                            className="text-sm font-medium text-header-black bg-transparent border-none outline-none flex-1 min-w-0 truncate"
                                            placeholder="Search countries"
                                            autoFocus
                                        />
                                    </span>
                                ) : (
                                    <span className="text-sm font-medium text-header-black truncate">
                                        {searchText || ''} {selectedCityName || '...'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>

                    {/* Search Button */}
                    <motion.div
                        layout
                        onClick={() => onSearchExpandToggle && onSearchExpandToggle()}
                        className={`cursor-pointer ${searchExpanded ? 'h-10 w-10' : 'h-8 w-8'} shrink-0 flex items-center justify-center bg-primary-default text-natural-white rounded-full hover:bg-primary-light transition-all duration-400`}>
                        <Search
                            className={`${searchExpanded ? 'h-5 w-5' : 'h-4 w-4'}`}
                            strokeWidth={2}
                        />
                    </motion.div>

                    {/* Countries Dropdown */}
                    {searchExpanded && (
                        <div className="absolute top-full left-0 transform mt-2 w-[500px] z-200 max-h-[300px] overflow-y-auto border border-feature-card-border rounded-lg shadow-lg">
                            <div className="bg-white border border-feature-card-border rounded-lg shadow-lg">
                                <div className="p-2">
                                    {isCountriesLoading ? (
                                        <LocationLoadingShimmer />
                                    ) : countries && countries.length > 0 ? (
                                        countries.map((country) => (
                                            <button
                                                key={country.country_id}
                                                onClick={() => handleCountrySelect(country.country_id, country.country_name)}
                                                className="cursor-pointer w-full flex items-center gap-3 px-1 py-1 text-left hover:bg-grey-grey_4 rounded-md transition-colors">
                                                <div className="p-4 flex items-center justify-center bg-grey-grey_4 rounded-md">
                                                    <img
                                                        src={country.icon_url}
                                                        alt={country.country_name}
                                                        className="h-10 w-10 object-contain"
                                                    />
                                                </div>
                                                <span className="text-sm font-medium text-header-black">{country.country_name}</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-6 text-center text-sm text-grey-grey_2">No countries available</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Country filter if trip_id is present - always show when trip_id exists */}
                {trip_id && tripCountriesData && onTripCountrySelect && countryDropdownRef && (
                    <ExperiencesCountryFilter
                        onCountrySelect={onTripCountrySelect}
                        selectedCountry={selectedCountries || []}
                        countriesData={tripCountriesData}
                        isLoadingCountries={false}
                        isCountryDropdownOpen={isCountryDropdownOpen || false}
                        setIsCountryDropdownOpen={setIsCountryDropdownOpen || (() => {})}
                        countryDropdownRef={countryDropdownRef as React.RefObject<HTMLDivElement>}
                    />
                )}
                {/* City Filter */}
                {citiesData && onCitySelect && selectedCities && (
                    <ExperiencesCityFilter
                        onCitySelect={onCitySelect}
                        selectedCities={selectedCities || []}
                        citiesData={citiesData}
                        isLoadingCities={isCitiesLoading || false}
                        isCityDropdownOpen={isCityDropdownOpen}
                        setIsCityDropdownOpen={setIsCityDropdownOpen}
                        cityDropdownRef={cityDropdownRef as React.RefObject<HTMLDivElement>}
                    />
                )}

                <div className="flex items-stretch border border-feature-card-border rounded-full overflow-hidden bg-natural-white">
                    {/* Filters */}
                    <button
                        onClick={handleFilterClick}
                        className="cursor-pointer flex items-center gap-2 pl-4 pr-6 py-2 hover:bg-grey-grey_5 transition-colors">
                        <SlidersHorizontal className="h-5 w-5 text-header-black" />
                        <span className="text-sm font-medium text-header-black">Filters</span>
                    </button>
                    {/* Divider */}
                    <div className="w-px bg-feature-card-border my-2" />
                    {/* Sort */}
                    <button
                        onClick={() => {}}
                        className="cursor-pointer flex items-center gap-2 pl-4 pr-6 py-2 hover:bg-grey-grey_5 transition-colors">
                        <ArrowUpDown className="h-5 w-5 text-header-black" />
                        <span className="text-sm font-medium text-header-black">Sort</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ExperienceNavbarSearch
