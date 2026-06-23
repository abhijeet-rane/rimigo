import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { getCurrentMonthName } from '../utils/timeUtils'
import { getCountryById } from '@/api/curation/locationPersonalizationAPI'
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SearchParams } from '@/components/common/SearchBar'
import { createGlobalSearchDimensions } from '../components/globalSearchDimension'
import { searchCitiesForActivities } from '../api/activitiesSearchAPI'
import { ActivitiesSearchDropdown } from '../components/ActivitiesSearchDropdown'
import type { WhereSegmentConfig, WhenSegmentConfig, PreferencesSegmentConfig } from '@/components/common/SearchBar'
import type { SearchResultUnion } from '../types/searchTypes'
import type { WishlistConfig } from '@/components/common/SearchHeader'
import { dispatchOpenTripCreationModal } from '@/lib/events/tripCreationModalEvents'
import { ACTIVITIES_CONFIG } from '../config'
import { useShortlistedExperiences } from '../context/ShortlistedExperiencesContext'
import { DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE } from '@/routes/routes'

interface UseActivitiesSearchByCityPageReturn {
    whereConfig: WhereSegmentConfig
    whenConfig: WhenSegmentConfig
    preferencesConfig: PreferencesSegmentConfig
    onSearch: (params: SearchParams) => void
    monthName: string
    cityId: string | null
    countryId: string | null
    searchHeaderInitialValues: {
        initialMonth?: number
        initialYear?: number
        initialGroupType?: string
        initialTravelPurpose?: string
        initialWhereData?: Array<{ id: string; name: string }>
    }
    wishlistConfig: WishlistConfig
}

/**
 * Hook for ActivitiesByCityPage search functionality
 * Handles month determination, extracts city/country IDs from route and URL,
 * and provides search functionality specific to city page
 */
export const useActivitiesSearchByCityPage = (): UseActivitiesSearchByCityPageReturn => {
    const { cityId: routeCityId } = useParams<{ cityId: string }>()
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')

    // Get shortlisted experiences from context
    const { shortlistedCount } = useShortlistedExperiences()

    // Always use routeCityId from URL params, not from query params
    const cityId = routeCityId ?? null
    // Get country_id from URL search params
    const countryId = searchParams.get('country_id') || null

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
    const countryNameFromUrl = searchParams.get('country_name')
    const countryIdFromUrl = searchParams.get('country_id') || countryId

    // Fetch country name from API if country_id exists but country_name is missing
    const { data: countryData } = useQuery({
        queryKey: ['country', countryIdFromUrl],
        queryFn: () => getCountryById(countryIdFromUrl!),
        enabled: !!countryIdFromUrl && !countryNameFromUrl,
        staleTime: 1000 * 60 * 60 * 24 // 24 hours
    })

    // Get country name: from URL params > from API fetch > undefined
    // Note: getCountryById returns response.data.data (inner data object), so countryData is already { id, name, ... }
    // The function is incorrectly typed as CountryResponse, but actually returns the inner data
    const resolvedCountryName = countryNameFromUrl || (countryData as { name?: string } | undefined)?.name

    /**
     * Handle country selection - navigate immediately to country page
     */
    const handleCountrySelect = useCallback(
        (result: Extract<SearchResultUnion, { type: 'location_country' }>) => {
            // Start with existing query params to preserve all existing params
            const next = new URLSearchParams(searchParams)

            // Clear city-related params when navigating from city to country
            next.delete('city_id')
            next.delete('city_name')

            // Set country_id and country_name
            next.set('country_id', result.country_id)
            const modifiedCountryName = result.country_name.replace(/ /g, '-').toLowerCase()
            next.set('country_name', modifiedCountryName)

            // Navigate immediately to country page with all query params
            navigate(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}${next.toString() ? `?${next.toString()}` : ''}`)
        },
        [navigate, searchParams]
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
                    navigate(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/${result.id}${queryString ? `?${queryString}` : ''}`)
                    // Clear location since we're navigating away
                    setSelectedLocation(null)
                },
                // Handle country selection - navigate immediately
                handleCountrySelect
            ),
        [navigate, searchParams, handleCountrySelect]
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

            // Note: Experience selection now navigates immediately in onExperienceSelect callback
            // No need to check selectedExperience here since navigation happens on click

            // Get new location from params or selectedLocation
            let newCityId = params.cityId || (params.cityIds && params.cityIds.length > 0 ? params.cityIds[0] : null)
            let newCountryId = params.countryId || (params.countryIds && params.countryIds.length > 0 ? params.countryIds[0] : null)

            // Priority: selectedLocation (user's current selection) > params
            if (selectedLocation && selectedLocation.type === 'country') {
                newCountryId = selectedLocation.id
                // Clear cityId when country is explicitly selected
                newCityId = null
            }

            if (selectedLocation && selectedLocation.type === 'city') {
                newCityId = selectedLocation.id
                // Clear countryId when city is explicitly selected
                newCountryId = null
            }

            // Get current route info
            const currentCityIdFromRoute = cityId
            const currentCountryIdFromUrl = searchParams.get('country_id')

            // Check if location actually changed
            const cityChanged = newCityId && newCityId !== currentCityIdFromRoute
            const countryChanged = newCountryId && newCountryId !== currentCountryIdFromUrl

            // If country is selected and we're on a city route, navigate to country page
            const switchingFromCityToCountry = !!newCountryId && !newCityId

            const locationChanged = cityChanged || countryChanged || switchingFromCityToCountry

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
                    next.set('city_name', params.cityNames[0])
                } else if (selectedLocation && selectedLocation.type === 'city' && selectedLocation.id === newCityId) {
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
                // Clear city-related params when navigating from city to country
                next.delete('city_id')
                next.delete('city_name')

                // Always set country_id when a country is selected
                next.set('country_id', newCountryId)

                // Set country_name if provided in params
                if (params.countryName) {
                    const modifiedCountryName = params.countryName.replace(/ /g, '-').toLowerCase()
                    next.set('country_name', modifiedCountryName)
                } else if (params.countryNames && params.countryNames.length > 0) {
                    const modifiedCountryName = params.countryNames[0].replace(/ /g, '-').toLowerCase()
                    next.set('country_name', modifiedCountryName)
                } else if (selectedLocation && selectedLocation.type === 'country' && selectedLocation.id === newCountryId) {
                    const modifiedCountryName = selectedLocation.name.replace(/ /g, '-').toLowerCase()
                    next.set('country_name', modifiedCountryName)
                }

                // Navigate to activities page with country params
                navigate(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}${next.toString() ? `?${next.toString()}` : ''}`)
                return
            } else if (selectedLocation && selectedLocation.type === 'country') {
                // Fallback: use selectedLocation if newCountryId is not in params
                next.delete('city_id')
                next.delete('city_name')

                const modifiedCountryName = selectedLocation.name.replace(/ /g, '-').toLowerCase()
                next.set('country_name', modifiedCountryName)
                next.set('country_id', selectedLocation.id)

                // Navigate to activities page with country params
                navigate(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}${next.toString() ? `?${next.toString()}` : ''}`)
                return
            }
        },
        [navigate, selectedLocation, searchParams, setSearchParams, cityId]
    )

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

        // Parse city/country from URL and route params
        // Format country name: replace hyphens with spaces and capitalize words
        const formatCountryName = (name: string) => {
            return name
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
        }

        // Priority: city > country
        // Note: cityName would need to be fetched from cityBasicInfo, so we'll handle that in the component
        const initialWhereData = cityId
            ? undefined // Will be set in component after fetching cityBasicInfo
            : countryIdFromUrl && resolvedCountryName
              ? [
                    {
                        id: countryIdFromUrl,
                        name: formatCountryName(resolvedCountryName)
                    }
                ]
              : undefined

        return {
            initialMonth,
            initialYear,
            initialGroupType,
            initialTravelPurpose,
            initialWhereData
        }
    }, [searchParams, cityId, countryId, monthParam, yearParam, countryIdFromUrl, resolvedCountryName, activeTrip?.tripProfile])

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
        onSearch: handleSearch,
        monthName,
        cityId,
        countryId,
        searchHeaderInitialValues,
        wishlistConfig
    }
}
