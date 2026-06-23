import { useState, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import type { SearchParams } from '@/components/common/SearchBar'
import { createGlobalSearchDimensions } from '../components/globalSearchDimension'
import { searchCitiesForActivities } from '../api/activitiesSearchAPI'
import { ActivitiesSearchDropdown } from '../components/ActivitiesSearchDropdown'
import type { WhereSegmentConfig, WhenSegmentConfig, PreferencesSegmentConfig } from '@/components/common/SearchBar'
import { ACTIVITIES_CONFIG } from '../config'
import { DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE } from '@/routes/routes'

interface UseActivitiesSearchReturn {
    whereConfig: WhereSegmentConfig
    whenConfig: WhenSegmentConfig
    preferencesConfig: PreferencesSegmentConfig
    onSearch: (params: SearchParams) => void
}

/**
 * Hook to manage activities search functionality
 * Handles search for cities, countries, and experiences with navigation
 */
export const useActivitiesSearch = (): UseActivitiesSearchReturn => {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const location = useLocation()

    // Store selected location from global search (for cities/countries)
    const [selectedLocation, setSelectedLocation] = useState<{
        type: 'city' | 'country'
        id: string
        name: string
    } | null>(null)

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
                    navigate(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/${result.id}${queryString ? `?${queryString}` : ''}`)
                    // Clear location since we're navigating away
                    setSelectedLocation(null)
                },
                // Handle country selection - store it and allow month/preferences flow
                (result) => {
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
     * Navigates based on what was selected (experience, city, or country)
     * When only month/preferences change, just updates URL params without navigation
     */
    const handleSearch = useCallback(
        (params: SearchParams) => {
            // Start with existing query params to preserve all existing params
            const next = new URLSearchParams(searchParams)

            // Update month and year if available
            if (params.month) {
                next.set('month', params.month.toString())
            }
            if (params.year) {
                next.set('year', params.year.toString())
            }

            // Update preferences
            if (params.groupType) {
                next.set('groupType', params.groupType)
            }
            if (params.travelPurpose) {
                next.set('travelPurpose', params.travelPurpose)
            }
            // Note: Location preferences removed - only group type and travel purpose are used

            // Note: Experience selection now navigates immediately in onExperienceSelect callback
            // No need to check selectedExperience here since navigation happens on click

            // Get current route info
            const isCityRoute = location.pathname.startsWith(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/`)
            const currentCityIdFromRoute = isCityRoute
                ? location.pathname.split(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/`)[1]?.split('?')[0]
                : null
            const currentCountryIdFromUrl = searchParams.get('country_id')

            // Get new location from params or selectedLocation
            let newCityId = params.cityId || (params.cityIds && params.cityIds.length > 0 ? params.cityIds[0] : null)
            let newCountryId = params.countryId || (params.countryIds && params.countryIds.length > 0 ? params.countryIds[0] : null)

            // If country is not in params but is in selectedLocation, use it
            if (!newCountryId && selectedLocation && selectedLocation.type === 'country') {
                newCountryId = selectedLocation.id
            }

            // If city is not in params but is in selectedLocation, use it
            if (!newCityId && selectedLocation && selectedLocation.type === 'city') {
                newCityId = selectedLocation.id
            }

            // Edge case: If we're on a country route and cityId matches country_id, ignore it
            // This handles the case where SearchBar incorrectly passes country_id as cityId
            if (!isCityRoute && currentCountryIdFromUrl && newCityId === currentCountryIdFromUrl) {
                newCityId = null
            }

            // Check if location actually changed by comparing with current route/URL
            const cityChanged = newCityId && newCityId !== currentCityIdFromRoute
            const countryChanged = newCountryId && newCountryId !== currentCountryIdFromUrl
            const locationChanged = cityChanged || countryChanged

            // If location didn't change (only month/preferences changed), just update URL params
            // Similar to how StaysExplore handles it - just update params, don't navigate
            if (!locationChanged) {
                // If we're on a city route but params has countryId (and no cityId), we should stay on city route
                // If we're on country route and params has same countryId, we should stay on country route
                setSearchParams(next, { replace: true })
                return
            }

            // Handle city selection - navigate to city-specific page
            if (newCityId) {
                // Set city_name if provided in params
                if (params.cityName) {
                    next.set('city_name', params.cityName)
                } else if (params.cityNames && params.cityNames.length > 0) {
                    // Handle multiselect cityNames array
                    next.set('city_name', params.cityNames[0])
                } else if (selectedLocation && selectedLocation.type === 'city' && selectedLocation.id === newCityId) {
                    // Fallback to selectedLocation if it matches
                    next.set('city_name', selectedLocation.name)
                }

                // Set country_id if provided (from search response)
                if (newCountryId) {
                    next.set('country_id', newCountryId)

                    // Also attempt to set country_name if provided
                    if (params.countryName) {
                        const modifiedCountryName = params.countryName.replace(/ /g, '-').toLowerCase()
                        next.set('country_name', modifiedCountryName)
                    }
                }

                // If city_name is still not set, it will be missing but city_id will be set
                // The page can handle this case by fetching city name from API

                // Navigate to city page with query params
                navigate(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/${newCityId}${next.toString() ? `?${next.toString()}` : ''}`)
                return
            }

            // Handle country selection - navigate to activities page with country params
            if (newCountryId) {
                // Always set country_id when a country is selected
                next.set('country_id', newCountryId)

                // Set country_name if provided in params
                if (params.countryName) {
                    const modifiedCountryName = params.countryName.replace(/ /g, '-').toLowerCase()
                    next.set('country_name', modifiedCountryName)
                } else if (params.countryNames && params.countryNames.length > 0) {
                    // Handle multiselect countryNames array
                    const modifiedCountryName = params.countryNames[0].replace(/ /g, '-').toLowerCase()
                    next.set('country_name', modifiedCountryName)
                } else if (selectedLocation && selectedLocation.type === 'country' && selectedLocation.id === newCountryId) {
                    // Fallback to selectedLocation if it matches
                    const modifiedCountryName = selectedLocation.name.replace(/ /g, '-').toLowerCase()
                    next.set('country_name', modifiedCountryName)
                }
                // If country_name is still not set, it will be missing but country_id will be set
                // The page can handle this case
            } else if (selectedLocation && selectedLocation.type === 'country') {
                // Fallback: use selectedLocation if newCountryId is not in params
                const modifiedCountryName = selectedLocation.name.replace(/ /g, '-').toLowerCase()
                next.set('country_name', modifiedCountryName)
                next.set('country_id', selectedLocation.id)
            }

            // Navigate to activities page with country params
            navigate(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}${next.toString() ? `?${next.toString()}` : ''}`)
        },
        [navigate, selectedLocation, searchParams, setSearchParams, location]
    )

    return {
        whereConfig: {
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
            renderDropdown: ActivitiesSearchDropdown
        },
        whenConfig: {
            enabled: true,
            required: false,
            label: 'Month',
            placeholder: ACTIVITIES_CONFIG.WHEN.placeholder,
            type: 'month_year'
        },
        preferencesConfig: {
            enabled: true,
            required: false,
            label: 'Preferences',
            placeholder: ACTIVITIES_CONFIG.PREFERENCES.placeholder
        },
        onSearch: handleSearch
    }
}
