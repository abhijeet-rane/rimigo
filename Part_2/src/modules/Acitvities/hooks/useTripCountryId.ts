import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { getCurrentMonthName } from '../utils/timeUtils'

/**
 * Hook to extract and append country_id from trip context to URL params if not present
 * Also returns the current month from trip if available, otherwise falls back to current month
 * Only appends country_id, not city_id
 */
export const useTripContext = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const countryIdFromParams = searchParams.get('country_id')

    // Get month from trip if available, otherwise use current month
    const monthName = useMemo(() => {
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

        // Fall back to current month
        return getCurrentMonthName()
    }, [activeTrip?.tripProfile])

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
