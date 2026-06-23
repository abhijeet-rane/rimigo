import { useMemo, useState, useCallback } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { getCurrentMonthName } from '../utils/timeUtils'
import { getCountryById, getCityBasicInfo } from '@/api/curation/locationPersonalizationAPI'
import { createGlobalSearchDimensions } from '../components/globalSearchDimension'
import { searchCitiesForActivities } from '../api/activitiesSearchAPI'
import { ActivitiesSearchDropdown } from '../components/ActivitiesSearchDropdown'
import type { WhereSegmentConfig, WhenSegmentConfig, PreferencesSegmentConfig } from '@/components/common/SearchBar'
import type { SearchParams } from '@/components/common/SearchBar'
import type { WishlistConfig } from '@/components/common/SearchHeader'
import { dispatchOpenTripCreationModal } from '@/lib/events/tripCreationModalEvents'
import { ACTIVITIES_CONFIG } from '../config'
import { useShortlistedExperiences } from '../context/ShortlistedExperiencesContext'
import { DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE } from '@/routes/routes'

interface UseActivitiesSearchExplorePageReturn {
    whereConfig: WhereSegmentConfig
    whenConfig: WhenSegmentConfig
    preferencesConfig: PreferencesSegmentConfig
    onSearch: (params: SearchParams) => void
    monthName: string
    wishlistConfig: WishlistConfig
}

/**
 * Hook for ActivitiesExplorePage search functionality
 * Single source of truth for all search header configs
 * Handles month determination, extracts country/city IDs from URL, and provides search configs
 */
export const useActivitiesSearchExplorePage = (country_id: string | null, city_id: string | null): UseActivitiesSearchExplorePageReturn => {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const location = useLocation()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')

    // Get shortlisted experiences from context
    const { shortlistedCount } = useShortlistedExperiences()

    // Store selected location from global search (for cities/countries)
    const [selectedLocation, setSelectedLocation] = useState<{
        type: 'city' | 'country'
        id: string
        name: string
    } | null>(null)

    // Get month with priority: query params > trip > current month
    const monthName = useMemo(() => {
        // 1. First priority: Check query params for month and year
        if (monthParam && yearParam) {
            try {
                const month = parseInt(monthParam, 10) - 1 // Convert to 0-11 for Date constructor
                const year = parseInt(yearParam, 10)
                if (!isNaN(month) && !isNaN(year) && month >= 0 && month <= 11) {
                    const date = new Date(year, month, 1)
                    if (!isNaN(date.getTime())) {
                        return date.toLocaleString('default', { month: 'long' })
                    }
                }
            } catch {
                // Invalid date, continue to next priority
            }
        }

        // 2. Second priority: Get month from trip
        const tripProfile = activeTrip?.tripProfile
        const preferredTravelTime = tripProfile?.preferred_travel_time

        if (preferredTravelTime?.startDate) {
            // Try to get month from startDate
            const startDate = new Date(preferredTravelTime.startDate)
            if (!isNaN(startDate.getTime())) {
                return startDate.toLocaleString('default', { month: 'long' })
            }
        }

        // Fall back to months array if available
        if (preferredTravelTime?.months?.[0]) {
            return preferredTravelTime.months[0]
        }

        // 3. Third priority: Fall back to current month
        return getCurrentMonthName()
    }, [monthParam, yearParam, activeTrip?.tripProfile])

    // Parse country from URL
    const countryIdFromUrl = searchParams.get('country_id') || country_id
    const countryNameFromUrl = searchParams.get('country_name')

    // Parse city from URL
    const cityIdFromUrl = searchParams.get('city_id') || city_id
    const cityNameFromUrl = searchParams.get('city_name')

    // Fetch country name from API if country_id exists but country_name is missing
    const { data: countryData } = useQuery({
        queryKey: ['country', countryIdFromUrl],
        queryFn: () => getCountryById(countryIdFromUrl!),
        enabled: !!countryIdFromUrl && !countryNameFromUrl
        // staleTime: 1000 * 60 * 60 * 24 // 24 hours
    })

    // Fetch city name from API if city_id exists but city_name is missing
    const { data: cityData } = useQuery({
        queryKey: ['cityBasicInfo', cityIdFromUrl],
        queryFn: () => getCityBasicInfo(cityIdFromUrl!),
        enabled: !!cityIdFromUrl && !cityNameFromUrl
        // staleTime: 1000 * 60 * 60 * 24 // 24 hours
    })

    // Get country name: from URL params > from API fetch > undefined
    // Note: getCountryById returns response.data.data (inner data object), so countryData is already { id, name, ... }
    // The function is incorrectly typed as CountryResponse, but actually returns the inner data
    const resolvedCountryName = countryNameFromUrl || (countryData as { name?: string } | undefined)?.name

    // Get city name: from URL params > from API fetch > undefined
    const resolvedCityName = cityNameFromUrl || cityData?.data?.city_name

    // Parse URL params to prepopulate SearchHeader
    const searchHeaderInitialValues = useMemo(() => {
        // Parse month and year from URL
        const initialMonth = monthParam ? parseInt(monthParam, 10) : undefined
        const initialYear = yearParam ? parseInt(yearParam, 10) : undefined

        // Parse groupType and travelPurpose from URL params
        const groupTypeFromUrl = searchParams.get('groupType')
        const travelPurposeFromUrl = searchParams.get('travelPurpose')

        // Get groupType and travelPurpose from trip if not in URL
        const tripProfile = activeTrip?.tripProfile
        const groupTypeFromTrip = tripProfile?.group_type
        const travelPurposeFromTrip = tripProfile?.travel_purpose

        // Priority: URL params > trip > undefined
        const initialGroupType = groupTypeFromUrl || groupTypeFromTrip || undefined
        const initialTravelPurpose = travelPurposeFromUrl || travelPurposeFromTrip || undefined

        // Format country name: replace hyphens with spaces and capitalize words
        const formatCountryName = (name: string) => {
            return name
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
        }

        // Build initialWhereData with priority: selectedLocation (from click) > city > country
        let initialWhereData: Array<{ id: string; name: string }> | undefined = undefined

        // First priority: If a location was just selected (not yet in URL), show it
        if (selectedLocation) {
            if (selectedLocation.type === 'city') {
                initialWhereData = [
                    {
                        id: selectedLocation.id,
                        name: selectedLocation.name
                    }
                ]
            } else if (selectedLocation.type === 'country') {
                initialWhereData = [
                    {
                        id: selectedLocation.id,
                        name: formatCountryName(selectedLocation.name)
                    }
                ]
            }
        } else if (cityIdFromUrl && resolvedCityName) {
            // Second priority: If city is in URL, show city in search header
            initialWhereData = [
                {
                    id: cityIdFromUrl,
                    name: resolvedCityName
                }
            ]
        } else if (countryIdFromUrl && resolvedCountryName) {
            // Third priority: Otherwise, show country if available in URL
            initialWhereData = [
                {
                    id: countryIdFromUrl,
                    name: formatCountryName(resolvedCountryName)
                }
            ]
        }

        return {
            initialMonth,
            initialYear,
            initialGroupType,
            initialTravelPurpose,
            initialWhereData
        }
    }, [
        searchParams,
        country_id,
        city_id,
        monthParam,
        yearParam,
        countryIdFromUrl,
        resolvedCountryName,
        cityIdFromUrl,
        resolvedCityName,
        activeTrip?.tripProfile,
        selectedLocation
    ])

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
                // Handle country selection - store in state to show in search header, but don't navigate yet
                (result) => {
                    // Store in state - this will be used to show country in search header and for navigation on search click
                    setSelectedLocation({
                        type: 'country',
                        id: result.country_id,
                        name: result.country_name
                    })
                }
            ),
        [navigate, searchParams, setSearchParams]
    )

    /**
     * Handle search button click
     * Navigates based on what was selected (city or country)
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

            // Get current route info
            const isCityRoute = location.pathname.startsWith(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/`)
            const currentCityIdFromRoute = isCityRoute
                ? location.pathname.split(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/`)[1]?.split('?')[0]
                : null
            const currentCountryIdFromUrl = searchParams.get('country_id')

            // Priority: Check selectedLocation first (from recent click) to determine the intended selection
            // This ensures country selections aren't incorrectly treated as city selections
            let newCityId: string | null = null
            let newCountryId: string | null = null

            if (selectedLocation) {
                if (selectedLocation.type === 'country') {
                    // Country was selected - prioritize this and ignore any cityId that might match
                    newCountryId = selectedLocation.id
                    // Get cityId from params, but ignore it if it matches the country ID
                    const cityIdFromParams = params.cityId || (params.cityIds && params.cityIds.length > 0 ? params.cityIds[0] : null)
                    if (cityIdFromParams && cityIdFromParams !== selectedLocation.id) {
                        newCityId = cityIdFromParams
                    }
                } else if (selectedLocation.type === 'city') {
                    // City was selected
                    newCityId = selectedLocation.id
                    // Get countryId from params if provided
                    newCountryId = params.countryId || (params.countryIds && params.countryIds.length > 0 ? params.countryIds[0] : null)
                }
            } else {
                // No selectedLocation - get from params
                newCityId = params.cityId || (params.cityIds && params.cityIds.length > 0 ? params.cityIds[0] : null)
                newCountryId = params.countryId || (params.countryIds && params.countryIds.length > 0 ? params.countryIds[0] : null)

                // Edge case: If we're on a country route and cityId matches country_id, ignore it
                // This handles the case where SearchBar incorrectly passes country_id as cityId
                if (!isCityRoute && currentCountryIdFromUrl && newCityId === currentCountryIdFromUrl) {
                    newCityId = null
                }
            }

            // Check if location actually changed by comparing with current route/URL
            const cityChanged = newCityId && newCityId !== currentCityIdFromRoute
            const countryChanged = newCountryId && newCountryId !== currentCountryIdFromUrl
            const locationChanged = cityChanged || countryChanged

            // If location didn't change (only month/preferences changed), just update URL params
            if (!locationChanged) {
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

                // Set country_id and country_name if provided in params (from city search)
                if (newCountryId) {
                    next.set('country_id', newCountryId)
                    if (params.countryName) {
                        const modifiedCountryName = params.countryName.replace(/ /g, '-').toLowerCase()
                        next.set('country_name', modifiedCountryName)
                    } else if (params.countryNames && params.countryNames.length > 0) {
                        const modifiedCountryName = params.countryNames[0].replace(/ /g, '-').toLowerCase()
                        next.set('country_name', modifiedCountryName)
                    }
                }

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

    // Build configs with initial values
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
            initialData: searchHeaderInitialValues.initialWhereData
        }),
        [additionalDimensions, searchHeaderInitialValues.initialWhereData]
    )

    const whenConfig: WhenSegmentConfig = useMemo(
        () => ({
            enabled: true,
            required: false,
            label: 'Month',
            placeholder: ACTIVITIES_CONFIG.WHEN.placeholder,
            type: 'month_year',
            initialMonth: searchHeaderInitialValues.initialMonth,
            initialYear: searchHeaderInitialValues.initialYear,
            initialMonthYear: searchHeaderInitialValues.initialYear // For month_year type
        }),
        [searchHeaderInitialValues.initialMonth, searchHeaderInitialValues.initialYear]
    )

    const preferencesConfig: PreferencesSegmentConfig = useMemo(
        () => ({
            enabled: true,
            required: false,
            label: 'Preferences',
            placeholder: ACTIVITIES_CONFIG.PREFERENCES.placeholder,
            initialGroupType: searchHeaderInitialValues.initialGroupType,
            initialTravelPurpose: searchHeaderInitialValues.initialTravelPurpose
        }),
        [searchHeaderInitialValues.initialGroupType, searchHeaderInitialValues.initialTravelPurpose]
    )

    // Handle wishlist click
    const handleWishlistClick = useCallback(() => {
        if (!activeTrip?.trip_id) {
            dispatchOpenTripCreationModal({ source: 'activities-wishlist' })
            return
        }
        const queryString = searchParams.toString()
        navigate(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/${activeTrip.trip_id}/wishlist${queryString ? `?${queryString}` : ''}`)
    }, [activeTrip?.trip_id, navigate, searchParams])

    // Wishlist config
    const wishlistConfig: WishlistConfig = useMemo(
        () => ({
            enabled: true,
            onClick: handleWishlistClick,
            shortlistCount: shortlistedCount
        }),
        [handleWishlistClick, shortlistedCount]
    )

    return {
        whereConfig,
        whenConfig,
        preferencesConfig,
        onSearch: handleSearch,
        monthName,
        wishlistConfig
    }
}
