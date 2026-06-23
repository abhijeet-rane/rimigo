import { SearchParams } from '@/components/common/SearchBar'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import ActionNavbarSearch from './ActionNavbarSearch'
import ExperienceNavbarSearch from '@/modules/Experiences/components/ExperienceNavbarSearch'

interface CitySearchResult {
    id: string
    name: string
}

interface ActionNavbarProps {
    title: string
    showShortlistCount: boolean
    showSearchBar: boolean
    searchExpanded: boolean
    onSearchExpandToggle: () => void
    onFilterClick: () => void
    formattedCityName?: string
    cityId?: string
    cities?: CitySearchResult[]
    isLoadingCities?: boolean
    onCitySearch?: (query: string) => void
    onCitySelect?: (cityId: string, cityName: string) => void
    onSearch?: (params: SearchParams) => void
    initialCheckIn?: Date
    initialCheckOut?: Date
    initialGroupType?: string
    initialTravelPurpose?: string
    initialCityPreferences?: string[]
    initialActiveSegment?: 'where' | 'checkin' | 'checkout' | 'preferences' | null
    searchText?: string
    useExperienceSearch?: boolean
}

const ActionNavbar = ({
    title,
    showShortlistCount = true,
    showSearchBar = true,
    searchExpanded,
    onSearchExpandToggle,
    onFilterClick,
    formattedCityName,
    cityId,
    cities,
    isLoadingCities,
    onCitySearch,
    onCitySelect,
    onSearch,
    initialCheckIn,
    initialCheckOut,
    initialGroupType,
    initialTravelPurpose,
    initialCityPreferences,
    initialActiveSegment,
    searchText,
    useExperienceSearch = false
}: ActionNavbarProps) => {
    return (
        <motion.div
            layout
            className={`${searchExpanded ? 'fixed' : 'sticky'} top-0 z-50 border-b border-feature-card-border bg-natural-white w-full`}>
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between py-4">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 font-red-hat-display font-semibold text-xl">{title}</div>
                    </div>

                    {/* Search Bar */}
                    {showSearchBar &&
                        (useExperienceSearch ? (
                            <ExperienceNavbarSearch
                                cityName={formattedCityName}
                                searchExpanded={searchExpanded}
                                onSearchExpandToggle={onSearchExpandToggle}
                                onFilterClick={onFilterClick}
                                // @ts-expect-error: need to fix this
                                countries={cities}
                                isLoadingCountries={isLoadingCities}
                                onCountrySearch={onCitySearch}
                                onCountrySelect={onCitySelect}
                                searchText={searchText}
                            />
                        ) : (
                            <ActionNavbarSearch
                                cityName={formattedCityName}
                                cityId={cityId}
                                searchExpanded={searchExpanded}
                                onSearchExpandToggle={onSearchExpandToggle}
                                onFilterClick={onFilterClick}
                                cities={cities}
                                isLoadingCities={isLoadingCities}
                                onCitySearch={onCitySearch}
                                onCitySelect={onCitySelect}
                                onSearch={onSearch}
                                initialCheckIn={initialCheckIn}
                                initialCheckOut={initialCheckOut}
                                initialGroupType={initialGroupType}
                                initialTravelPurpose={initialTravelPurpose}
                                initialCityPreferences={initialCityPreferences}
                                initialActiveSegment={initialActiveSegment}
                                searchText={searchText}
                            />
                        ))}

                    {/* Right Actions */}
                    {!searchExpanded && showShortlistCount && (
                        <div className="flex items-center gap-3">
                            {/* Favorites Button */}
                            <button className="flex items-center gap-2 border border-feature-card-border rounded-full px-3 py-2 hover:shadow-md transition-shadow">
                                <Heart className="w-4 h-4" />
                                <span className="hidden md:block text-sm font-medium">1</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

export default ActionNavbar
