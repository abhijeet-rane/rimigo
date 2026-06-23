import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { getCurrentMonthName } from '../utils/timeUtils'

/**
 * Hook to extract and append country_id from trip context to URL params if not present
 * Also returns the current month with priority: query params > trip > current month
 * Only appends country_id, not city_id
 */
export const useTripContext = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const countryIdFromParams = searchParams.get('country_id')
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

    useEffect(() => {
        if (!countryIdFromParams && activeTrip) {
            // Try to get country from final_destination_countries
            const tripCountries = activeTrip.final_destination_countries || activeTrip.tripProfile?.final_destination_countries || []

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
                    // Append country_id to URL params
                    const newSearchParams = new URLSearchParams(searchParams)
                    newSearchParams.set('country_id', countryId)
                    setSearchParams(newSearchParams, { replace: true })
                }
            }
        }
    }, [countryIdFromParams, activeTrip, searchParams, setSearchParams])

    return {
        monthName
    }
}
