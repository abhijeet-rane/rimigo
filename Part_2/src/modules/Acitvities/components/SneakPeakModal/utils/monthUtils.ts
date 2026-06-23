import { useSearchParams } from 'react-router-dom'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useMemo } from 'react'

/**
 * Get selected month with priority (matching ExperienceDetailsPage logic):
 * 1. Query params (month, year) - same as ExperienceDetailsPage
 * 2. Trip preferred_travel_time (additional fallback)
 * 3. Current month (additional fallback)
 *
 * Returns Date | null to match ExperienceDetailsPage pattern
 */
export const useSelectedMonth = (): Date | null => {
    const [searchParams] = useSearchParams()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip

    return useMemo(() => {
        // Priority 1: Query params (matching ExperienceDetailsPage logic exactly)
        const monthParam = searchParams.get('month')
        const yearParam = searchParams.get('year')
        if (monthParam && yearParam) {
            try {
                const month = parseInt(monthParam, 10) - 1 // Convert to 0-11 for Date constructor
                const year = parseInt(yearParam, 10)
                if (!isNaN(month) && !isNaN(year) && month >= 0 && month <= 11) {
                    return new Date(year, month, 1) // First day of the month
                }
            } catch {
                // Invalid date, continue to next priority
            }
        }

        // Priority 2: Trip preferred_travel_time (additional fallback not in ExperienceDetailsPage)
        if (activeTrip?.tripProfile?.preferred_travel_time?.months && activeTrip.tripProfile.preferred_travel_time.months.length > 0) {
            const monthName = activeTrip.tripProfile.preferred_travel_time.months[0]
            const year = activeTrip.tripProfile.preferred_travel_time.year || new Date().getFullYear()
            const monthIndex = getMonthIndexFromName(monthName)
            if (monthIndex !== null) {
                return new Date(year, monthIndex, 1)
            }
        }

        // Also check trip.preferred_travel_time (fallback)
        if (activeTrip?.preferred_travel_time?.months && activeTrip.preferred_travel_time.months.length > 0) {
            const monthName = activeTrip.preferred_travel_time.months[0]
            const year = activeTrip.preferred_travel_time.year || new Date().getFullYear()
            const monthIndex = getMonthIndexFromName(monthName)
            if (monthIndex !== null) {
                return new Date(year, monthIndex, 1)
            }
        }

        // Priority 3: Current month (additional fallback not in ExperienceDetailsPage)
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth(), 1)
    }, [searchParams, activeTrip])
}

/**
 * Convert month name to index (0-11)
 */
const getMonthIndexFromName = (monthName: string): number | null => {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
    const normalizedName = monthName.toLowerCase()
    const index = monthNames.indexOf(normalizedName)
    return index !== -1 ? index : null
}

/**
 * Get month key for seasonal information (e.g., "january", "february")
 * Returns null if date is null (matching ExperienceDetailsPage pattern)
 */
export const getMonthKey = (date: Date | null): string | null => {
    if (!date) return null

    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
    return monthNames[date.getMonth()]
}
