import { useMemo, useState, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { getLiveCountries, type LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI'
import { FinalDestinationCountriesCitiesResponse, getFinalDestinationCountriesCities } from '@/api/trip/tripAPI'
import { createGlobalSearchDimensions } from '@/modules/Acitvities/components/globalSearchDimension'
import { searchCitiesForActivities } from '@/modules/Acitvities/api/activitiesSearchAPI'
import { ActivitiesSearchDropdown } from '@/modules/Acitvities/components/ActivitiesSearchDropdown'
import type { WhereSegmentConfig, WhenSegmentConfig, PreferencesSegmentConfig } from '@/components/common/SearchBar'
import type { SearchParams } from '@/components/common/SearchBar'
import { ACTIVITIES_CONFIG } from '@/modules/Acitvities/config'

interface UseExperiencesWishlistSearchReturn {
    whereConfig: WhereSegmentConfig
    whenConfig: WhenSegmentConfig
    preferencesConfig: PreferencesSegmentConfig
    onSearch: (params: SearchParams) => void
}

/**
 * Hook for ExperiencesWishlistPage search functionality
 * Only enables "Where" field (required), disables "When" and "Preferences"
 */
export const useExperiencesWishlistSearch = (): UseExperiencesWishlistSearchReturn => {
    const { tripId } = useParams<{ tripId: string }>()
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()

    // Store selected location from global search (for cities/countries)
    const [selectedLocation, setSelectedLocation] = useState<{
        type: 'city' | 'country'
        id: string
        name: string
    } | null>(null)

    // Fetch countries data
    const { data: locationPersonalizationData } = useQuery<LocationPersonalizationResponse[]>({
        queryKey: ['locationPersonalization'],
        queryFn: () => getLiveCountries(),
        enabled: true,
        staleTime: HOURS_24
    })

    // Fetch trip data if trip_id exists
    const { data: tripData } = useQuery<FinalDestinationCountriesCitiesResponse>({
        queryKey: ['tripData', tripId],
        queryFn: () => getFinalDestinationCountriesCities(tripId ?? ''),
        enabled: !!tripId
    })

    // Trip countries and cities
    const tripCountries = tripData?.data?.final_destination_countries || []
    const finalDestinationCities = tripData?.data?.final_destination_cities || []

    // Get current params
    const countryIdFromParams = searchParams.get('country_id') ?? ''
    const baseCityIdsFromParams = searchParams.get('base_city_ids') ?? ''

    // Helper function to modify country name for URL
    const modifyCountryName = useCallback((countryName: string) => {
        return countryName.replace(/ /g, '-').toLowerCase()
    }, [])

    // Get cities for selected country (from trip data)
    const getCityIdsForCountry = useCallback(
        (countryId: string): string[] => {
            if (!countryId || !finalDestinationCities.length) return []
            return finalDestinationCities.filter((city) => city.country.id === countryId).map((city) => city.id)
        },
        [finalDestinationCities]
    )

    /**
     * Create global search dimensions for experiences and countries
     * Cities are handled separately via customSearchCities in whereConfig
     */
    const additionalDimensions = useMemo(
        () =>
            createGlobalSearchDimensions(
                // Handle experience selection - navigate immediately to experience details
                (result) => {
                    // Navigate immediately to experience details page
                    const queryString = searchParams.toString()
                    navigate(`/experiences/${result.id}${queryString ? `?${queryString}` : ''}`)
                    // Clear location since we're navigating away
                    setSelectedLocation(null)
                },
                // Handle country selection - store in state to show in search header
                (result) => {
                    // Store in state - this will be used to show country in search header
                    setSelectedLocation({
                        type: 'country',
                        id: result.country_id,
                        name: result.country_name
                    })
                }
            ),
        [navigate, searchParams]
    )

    /**
     * Handle search button click
     * Updates query params based on selected location
     */
    const handleSearch = useCallback(
        (params: SearchParams) => {
            const next = new URLSearchParams(searchParams)

            // Priority: Check selectedLocation first (from recent click) to determine the intended selection
            let newCountryId: string | null = null
            let newCityId: string | null = null

            if (selectedLocation) {
                if (selectedLocation.type === 'country') {
                    newCountryId = selectedLocation.id
                    // Get cityId from params, but ignore it if it matches the country ID
                    const cityIdFromParams = params.cityId || (params.cityIds && params.cityIds.length > 0 ? params.cityIds[0] : null)
                    if (cityIdFromParams && cityIdFromParams !== selectedLocation.id) {
                        newCityId = cityIdFromParams
                    }
                } else if (selectedLocation.type === 'city') {
                    newCityId = selectedLocation.id
                    // Get countryId from params if provided
                    newCountryId = params.countryId || (params.countryIds && params.countryIds.length > 0 ? params.countryIds[0] : null)
                }
            } else {
                // No selectedLocation - get from params
                newCityId = params.cityId || (params.cityIds && params.cityIds.length > 0 ? params.cityIds[0] : null)
                newCountryId = params.countryId || (params.countryIds && params.countryIds.length > 0 ? params.countryIds[0] : null)
            }

            // Update country if provided
            if (newCountryId) {
                next.set('country_id', newCountryId)

                // Find country name from locationPersonalizationData or tripCountries
                const countryName =
                    locationPersonalizationData?.find((c) => c.country_id === newCountryId)?.country_name ||
                    tripCountries.find((c) => c.id === newCountryId)?.name

                if (countryName) {
                    next.set('country_name', modifyCountryName(countryName))
                } else {
                    next.delete('country_name')
                }

                // Update base_city_ids to filter by country cities
                const cityIds = getCityIdsForCountry(newCountryId)
                if (cityIds.length > 0 && !newCityId) {
                    // Only auto-set city IDs if no specific city was selected
                    next.set('base_city_ids', cityIds.join(','))
                } else if (newCityId) {
                    // Use the selected city ID
                    next.set('base_city_ids', newCityId)
                } else {
                    next.delete('base_city_ids')
                }
            } else {
                // Clear country filter
                next.delete('country_id')
                next.delete('country_name')
                // If base_city_ids was set from country, clear it too
                if (!baseCityIdsFromParams) {
                    next.delete('base_city_ids')
                }
            }

            // Update cities if provided (and no country was selected)
            if (newCityId && !newCountryId) {
                next.set('base_city_ids', newCityId)
            }

            // Clear selectedLocation after search
            setSelectedLocation(null)

            setSearchParams(next, { replace: true })
        },
        [
            searchParams,
            setSearchParams,
            locationPersonalizationData,
            tripCountries,
            modifyCountryName,
            getCityIdsForCountry,
            baseCityIdsFromParams,
            selectedLocation
        ]
    )

    // Build initial where data from URL params
    const initialWhereData = useMemo(() => {
        // Priority: selectedLocation (from recent click) > city > country
        if (selectedLocation) {
            if (selectedLocation.type === 'city') {
                return [
                    {
                        id: selectedLocation.id,
                        name: selectedLocation.name
                    }
                ]
            } else if (selectedLocation.type === 'country') {
                return [
                    {
                        id: selectedLocation.id,
                        name: selectedLocation.name
                    }
                ]
            }
        }

        // Check for city in base_city_ids
        if (baseCityIdsFromParams) {
            const cityIds = baseCityIdsFromParams.split(',').filter(Boolean)
            if (cityIds.length > 0) {
                // Try to find city name from finalDestinationCities
                const city = finalDestinationCities.find((c) => c.id === cityIds[0])
                if (city) {
                    return [
                        {
                            id: city.id,
                            name: city.name
                        }
                    ]
                }
            }
        }

        // Check for country
        if (countryIdFromParams) {
            const country =
                locationPersonalizationData?.find((c) => c.country_id === countryIdFromParams) ||
                tripCountries.find((c) => c.id === countryIdFromParams)
            if (country) {
                const countryName = 'country_name' in country ? country.country_name : country.name
                return [
                    {
                        id: countryIdFromParams,
                        name: countryName
                    }
                ]
            }
        }

        return undefined
    }, [selectedLocation, baseCityIdsFromParams, countryIdFromParams, locationPersonalizationData, tripCountries, finalDestinationCities])

    // Build configs
    const whereConfig: WhereSegmentConfig = useMemo(
        () => ({
            enabled: true,
            required: true,
            label: 'Where',
            placeholder: ACTIVITIES_CONFIG.WHERE.placeholder,
            multiselect: false,
            // Use custom search function to replace default searchCities with global search API
            customSearchCities: searchCitiesForActivities,
            // Additional dimensions for experiences and countries (shown as separate sections in dropdown)
            dimensions: additionalDimensions,
            // Use custom dropdown component for activities search
            renderDropdown: ActivitiesSearchDropdown,
            // Set initial data from URL
            initialData: initialWhereData
        }),
        [additionalDimensions, initialWhereData]
    )

    const whenConfig: WhenSegmentConfig = useMemo(
        () => ({
            enabled: false,
            required: false,
            label: 'Month',
            placeholder: ACTIVITIES_CONFIG.WHEN.placeholder,
            type: 'month_year'
        }),
        []
    )

    const preferencesConfig: PreferencesSegmentConfig = useMemo(
        () => ({
            enabled: false,
            required: false,
            label: 'Preferences',
            placeholder: ACTIVITIES_CONFIG.PREFERENCES.placeholder
        }),
        []
    )

    return {
        whereConfig,
        whenConfig,
        preferencesConfig,
        onSearch: handleSearch
    }
}
