import { motion } from 'framer-motion'
import ExperienceNavbarSearch from '../ExperienceNavbarSearch'
import { LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI'
import { CitiesApiResponse } from '../../types/city'

interface ExperiencesHeaderProps {
    headerTitle: string
    countries: LocationPersonalizationResponse[]
    isCitiesLoading: boolean
    onCountrySelect?: (countryId: string, countryName: string) => void
    currentCountryName?: string
    setIsFilterOpen?: (isFilterOpen: boolean) => void
    citiesData?: CitiesApiResponse
    onCitySelect?: (cityIds: string[], cityNames: string[]) => void
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

const ExperiencesHeader = ({
    headerTitle,
    countries,
    isCitiesLoading,
    onCountrySelect,
    currentCountryName,
    setIsFilterOpen,
    citiesData,
    onCitySelect,
    selectedCities,
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
}: ExperiencesHeaderProps) => {
    return (
        <motion.div
            layout
            className={`sticky top-0 z-50 border-b border-feature-card-border bg-natural-white w-full`}>
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between py-4">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 font-red-hat-display font-semibold text-xl">{headerTitle}</div>
                    </div>

                    {/* Search and City Filter */}
                    <ExperienceNavbarSearch
                        countries={countries}
                        isCountriesLoading={isCitiesLoading}
                        onCountrySelect={onCountrySelect}
                        currentCountryName={currentCountryName}
                        setIsFilterOpen={setIsFilterOpen}
                        onCitySelect={onCitySelect}
                        selectedCities={selectedCities || []}
                        citiesData={citiesData}
                        isCitiesLoading={isCitiesLoading || false}
                        isCityDropdownOpen={isCityDropdownOpen}
                        setIsCityDropdownOpen={setIsCityDropdownOpen}
                        cityDropdownRef={cityDropdownRef}
                        trip_id={trip_id}
                        tripCountriesData={tripCountriesData}
                        onTripCountrySelect={onTripCountrySelect}
                        selectedCountries={selectedCountries}
                        isCountryDropdownOpen={isCountryDropdownOpen}
                        setIsCountryDropdownOpen={setIsCountryDropdownOpen}
                        countryDropdownRef={countryDropdownRef}
                    />
                </div>
            </div>
        </motion.div>
    )
}

export default ExperiencesHeader
