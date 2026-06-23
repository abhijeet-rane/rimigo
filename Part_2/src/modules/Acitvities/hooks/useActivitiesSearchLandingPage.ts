import { useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { getCurrentMonthName } from '../utils/timeUtils'

/**
 * Hook for ActivitiesExploreLandingPage search functionality
 * Handles month determination and optionally appends country_id, groupType, travelPurpose, month, and year from trip if not present
 */
export const useActivitiesSearchLandingPage = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const countryIdFromParams = searchParams.get('country_id')
    const groupTypeFromParams = searchParams.get('groupType')
    const travelPurposeFromParams = searchParams.get('travelPurpose')
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')

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

    // Optionally append country_id, groupType, travelPurpose, month, and year from trip if not present in URL
    useEffect(() => {
        if (!activeTrip) return

        const tripProfile = activeTrip.tripProfile
        const newSearchParams = new URLSearchParams(searchParams)
        let hasUpdates = false

        // Append country_id from trip if not present
        if (!countryIdFromParams) {
            // Try to get country from final_destination_countries
            const tripCountries = activeTrip.final_destination_countries || tripProfile?.final_destination_countries || []

            if (tripCountries.length > 0) {
                // Get the first country - can be string or object with id/name
                const firstCountry = tripCountries[0]
                let countryId: string | undefined

                if (typeof firstCountry === 'string') {
                    countryId = firstCountry
                } else if (firstCountry && typeof firstCountry === 'object') {
                    countryId =
                        (firstCountry as { id?: string; country_id?: string }).id || (firstCountry as { id?: string; country_id?: string }).country_id
                }

                if (countryId) {
                    newSearchParams.set('country_id', countryId)
                    hasUpdates = true
                }
            }
        }

        // Append groupType from trip if not present
        if (!groupTypeFromParams && tripProfile?.group_type) {
            newSearchParams.set('groupType', tripProfile.group_type)
            hasUpdates = true
        }

        // Append travelPurpose from trip if not present
        if (!travelPurposeFromParams && tripProfile?.travel_purpose) {
            newSearchParams.set('travelPurpose', tripProfile.travel_purpose)
            hasUpdates = true
        }

        // Append month and year from trip if not present (following same priority as monthName)
        if (!monthParam || !yearParam) {
            const preferredTravelTime = tripProfile?.preferred_travel_time
            let monthToSet: number | undefined
            let yearToSet: number | undefined

            // Priority 1: Get from startDate if available
            if (preferredTravelTime?.startDate) {
                const startDate = new Date(preferredTravelTime.startDate)
                if (!isNaN(startDate.getTime())) {
                    monthToSet = startDate.getMonth() + 1 // Convert to 1-indexed (1-12)
                    yearToSet = startDate.getFullYear()
                }
            }

            // Priority 2: Get from months array and year if available
            if (!monthToSet && preferredTravelTime?.months?.[0]) {
                // Convert month name to month number
                const monthName = preferredTravelTime.months[0]
                const monthDate = new Date(`${monthName} 1, 2000`)
                if (!isNaN(monthDate.getTime())) {
                    monthToSet = monthDate.getMonth() + 1 // Convert to 1-indexed (1-12)
                    // Use year from preferredTravelTime if available, otherwise current year
                    yearToSet = preferredTravelTime.year || new Date().getFullYear()
                }
            }

            // Priority 3: Fall back to current month and year
            if (!monthToSet) {
                const currentDate = new Date()
                monthToSet = currentDate.getMonth() + 1 // Convert to 1-indexed (1-12)
                yearToSet = currentDate.getFullYear()
            }

            // Set month and year if they're missing
            if (!monthParam && monthToSet) {
                newSearchParams.set('month', monthToSet.toString())
                hasUpdates = true
            }
            if (!yearParam && yearToSet) {
                newSearchParams.set('year', yearToSet.toString())
                hasUpdates = true
            }
        }

        // Only update URL if there are changes
        if (hasUpdates) {
            setSearchParams(newSearchParams, { replace: true })
        }
    }, [countryIdFromParams, groupTypeFromParams, travelPurposeFromParams, monthParam, yearParam, activeTrip, searchParams, setSearchParams])

    return {
        monthName
    }
}
