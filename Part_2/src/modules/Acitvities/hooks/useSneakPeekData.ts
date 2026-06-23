import { useMemo } from 'react'
import type { SneakPeekResponse } from '@/modules/Experiences/types/sneakPeekTypes'
import type { SeasonalInformationType } from '@/modules/Experiences/types/experienceDetailTypes'

// Month names mapping for display
const MONTH_SHORT_NAMES: Record<string, string> = {
    january: 'Jan',
    february: 'Feb',
    march: 'Mar',
    april: 'Apr',
    may: 'May',
    june: 'Jun',
    july: 'Jul',
    august: 'Aug',
    september: 'Sep',
    october: 'Oct',
    november: 'Nov',
    december: 'Dec'
}

// Month order for sorting
const MONTH_ORDER: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11
}

// Format duration label from minutes (matching ExperienceSummarySection.tsx)
const formatDurationLabel = (minutes: number, options?: { showMinutes?: boolean }): string => {
    if (!Number.isFinite(minutes) || minutes <= 0) {
        return 'Less than 5 mins'
    }

    const roundedMinutes = Math.max(5, Math.round(minutes / 5) * 5)
    const hours = Math.floor(roundedMinutes / 60)
    const remainingMinutes = roundedMinutes % 60
    const includeMinutes = options?.showMinutes ?? true

    const parts: string[] = []
    if (hours > 0) {
        parts.push(`${hours} hr${hours > 1 ? 's' : ''}`)
    }
    if ((hours === 0 || includeMinutes) && remainingMinutes > 0) {
        parts.push(`${remainingMinutes} min`)
    }

    return parts.length > 0 ? parts.join(' ') : 'Less than 5 mins'
}

// Format best months from seasonal information for a specific month
const formatBestMonthsForMonth = (
    seasonalInformation: SeasonalInformationType | undefined | null,
    selectedMonthKey: string | null
): { value: string; description: string } | null => {
    if (!seasonalInformation || !selectedMonthKey) return null

    const monthData = seasonalInformation[selectedMonthKey]
    if (!monthData) return null

    const monthShortName = MONTH_SHORT_NAMES[selectedMonthKey]
    if (!monthShortName) return null

    // Build description from month data
    let description = ''
    if (monthData.weather) {
        const tempMin = monthData.weather.minimum_temperature
        const tempMax = monthData.weather.maximum_temperature
        const tempUnit = monthData.weather.temperature_unit === 'fahrenheit' ? '°F' : '°C'

        const parts: string[] = []
        if (tempMin !== null && tempMax !== null) {
            parts.push(`${Math.round(tempMin)}${tempUnit} – ${Math.round(tempMax)}${tempUnit}`)
        }
        if (monthData.weather.description) {
            parts.push(monthData.weather.description.split('.')[0].toLowerCase())
        }
        if (monthData.crowd_levels?.level) {
            parts.push(`${monthData.crowd_levels.level} crowds`)
        }
        if (monthData.is_peak_season) {
            parts.push('peak season')
        }
        description = parts.join(', ')
    }

    return {
        value: monthShortName,
        description: description || 'Ideal conditions for visiting'
    }
}

// Format best months from seasonal information (fallback - shows top 3 best months)
const formatBestMonths = (seasonalInformation: SeasonalInformationType | undefined | null): { value: string; description: string } | null => {
    if (!seasonalInformation) return null

    const bestMonths: Array<{ monthKey: string; monthShortName: string; order: number }> = []

    Object.entries(seasonalInformation).forEach(([monthKey, monthData]) => {
        if (monthData.is_recommended === true && monthData.is_peak_season === true) {
            const shortName = MONTH_SHORT_NAMES[monthKey]
            if (shortName) {
                bestMonths.push({
                    monthKey,
                    monthShortName: shortName,
                    order: MONTH_ORDER[monthKey] ?? 999
                })
            }
        }
    })

    if (bestMonths.length === 0) return null

    // Sort by month order and limit to 3
    bestMonths.sort((a, b) => a.order - b.order)
    const top3Months = bestMonths.slice(0, 3)
    const value = top3Months.map((m) => m.monthShortName).join(', ')

    // Build description from first best month's data (matching ExperienceSummarySection.tsx)
    let description = ''
    if (top3Months.length > 0 && seasonalInformation) {
        const firstMonthData = seasonalInformation[top3Months[0].monthKey]
        if (firstMonthData?.weather) {
            const tempMin = firstMonthData.weather.minimum_temperature
            const tempMax = firstMonthData.weather.maximum_temperature
            const tempUnit = firstMonthData.weather.temperature_unit === 'fahrenheit' ? '°F' : '°C'

            const parts: string[] = []
            if (tempMin !== null && tempMax !== null) {
                parts.push(`${Math.round(tempMin)}${tempUnit} – ${Math.round(tempMax)}${tempUnit}`)
            }
            if (firstMonthData.weather.description) {
                parts.push(firstMonthData.weather.description.split('.')[0].toLowerCase())
            }
            if (firstMonthData.crowd_levels?.level) {
                parts.push(`${firstMonthData.crowd_levels.level} crowds`)
            }
            if (firstMonthData.is_peak_season) {
                parts.push('peak season')
            }
            description = parts.join(', ')
        }
    }

    return {
        value,
        description: description || 'Ideal conditions for visiting'
    }
}

// Get duration text from duration_spent (matching ExperienceSummarySection.tsx logic)
const getDurationText = (durationSpent: SneakPeekResponse['duration_spent'] | undefined): { value: string; description: string } | null => {
    if (!durationSpent) return null

    // Convert to minutes based on unit (matching ExperienceSummarySection.tsx conversion logic)
    const normalizedUnit = durationSpent.unit?.toLowerCase() || 'hours'

    const convertToMinutes = (value: number) => {
        switch (normalizedUnit) {
            case 'milliseconds':
                return value / (1000 * 60)
            case 'seconds':
                return value / 60
            case 'minutes':
                return value
            case 'hours':
                return value * 60
            default:
                // Default to hours if unit is unknown
                return value * 60
        }
    }

    const minMinutes = typeof durationSpent.min === 'number' && durationSpent.min > 0 ? convertToMinutes(durationSpent.min) : null
    const maxMinutes = typeof durationSpent.max === 'number' && durationSpent.max > 0 ? convertToMinutes(durationSpent.max) : null

    if (minMinutes === null && maxMinutes === null) return null
    if (!Number.isFinite(minMinutes) || !Number.isFinite(maxMinutes)) return null

    // Check if there's actual variation (>= 5 minutes difference, matching ExperienceSummarySection)
    const hasVariation = Math.abs((maxMinutes || 0) - (minMinutes || 0)) >= 5

    // Format labels - show minutes only when there's no variation or when showing range
    const minLabel = formatDurationLabel(minMinutes || maxMinutes || 0, { showMinutes: !hasVariation })
    const maxLabel = formatDurationLabel(maxMinutes || minMinutes || 0, { showMinutes: true })

    const value = hasVariation ? `${minLabel} - ${maxLabel}` : minLabel
    const description = hasVariation ? 'Travellers usually spend this long here' : 'Typical time travelers spend here'

    return { value, description }
}

// Get walking required level from constraints
const getWalkingRequired = (constraints: SneakPeekResponse['constraints'] | undefined): { value: string; description: string } | null => {
    if (!constraints?.mobility) return null

    const mobility = constraints.mobility
    const walkingRequired = mobility.walking_required

    // Determine level based on walking_required
    const level = walkingRequired ? 'HIGH' : 'LOW'
    const description = mobility.description || (walkingRequired ? 'Requires significant walking' : 'Perfect for elderly folks')

    return { value: level, description }
}

// Get value for money from traveler reviews
const getValueForMoney = (travelerReviews: SneakPeekResponse['traveler_reviews'] | undefined): { value: string; description: string } | null => {
    if (!travelerReviews?.group_reviews) return null

    const groupReviews = travelerReviews.group_reviews
    // Try to get value for money from any group review (prefer couple, then immediate_family, then solo_traveler)
    const groupKeys = ['couple', 'couple_with_children', 'immediate_family', 'solo_traveler', 'friends_group', 'large_group']
    let valueForMoney: { value: 'low' | 'medium' | 'high'; reason: string } | null = null

    for (const key of groupKeys) {
        const review = groupReviews[key]
        if (review?.is_value_for_money) {
            if (typeof review.is_value_for_money === 'boolean') {
                // If it's a boolean, convert to high/low
                valueForMoney = {
                    value: review.is_value_for_money ? 'high' : 'low',
                    reason: review.is_value_for_money ? 'Visitors said that it was absolutely worth it' : 'Some visitors found it expensive'
                }
            } else {
                valueForMoney = review.is_value_for_money
            }
            break
        }
    }

    if (!valueForMoney) return null

    const value = valueForMoney.value.charAt(0).toUpperCase() + valueForMoney.value.slice(1).toUpperCase()
    return {
        value,
        description: valueForMoney.reason || 'Based on traveler reviews'
    }
}

export interface SneakPeekFormattedData {
    bestMonths: { value: string; description: string } | null
    duration: { value: string; description: string } | null
    walkingRequired: { value: string; description: string } | null
    valueForMoney: { value: string; description: string } | null
    experienceName: string
}

/**
 * Pure, hook-free variant of the sneak-peek formatter. Used by callers
 * that need to compute stats for multiple experiences (e.g. the Top
 * Highlights mobile reels list) where wrapping each call in `useMemo`
 * isn't possible.
 */
export const extractSneakPeekData = (
    sneakPeekData: SneakPeekResponse | undefined,
    selectedMonthKey?: string | null
): SneakPeekFormattedData => {
    if (!sneakPeekData) {
        return {
            bestMonths: null,
            duration: null,
            walkingRequired: null,
            valueForMoney: null,
            experienceName: ''
        }
    }

    const bestMonthsData = selectedMonthKey
        ? formatBestMonthsForMonth(sneakPeekData.seasonal_information, selectedMonthKey)
        : formatBestMonths(sneakPeekData.seasonal_information)

    return {
        bestMonths: bestMonthsData,
        duration: getDurationText(sneakPeekData.duration_spent),
        walkingRequired: getWalkingRequired(sneakPeekData.constraints),
        valueForMoney: getValueForMoney(sneakPeekData.traveler_reviews),
        experienceName: sneakPeekData.experience_name
    }
}

/**
 * Hook to format and extract data from sneak peek API response
 * @param sneakPeekData - The sneak peek API response
 * @param selectedMonthKey - Optional month key (e.g., "january") to show specific month info instead of best months
 */
export const useSneakPeekData = (sneakPeekData: SneakPeekResponse | undefined, selectedMonthKey?: string | null): SneakPeekFormattedData => {
    return useMemo(() => extractSneakPeekData(sneakPeekData, selectedMonthKey), [sneakPeekData, selectedMonthKey])
}
