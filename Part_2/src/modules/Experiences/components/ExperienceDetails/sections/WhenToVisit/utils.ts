import React from 'react'
import { SeasonalInformationType } from '../../../../types/experienceDetailTypes'
import { MonthRowData } from './TableRow'

/**
 * Utility functions for WhenToVisit component
 * Contains helper functions for data transformation and formatting
 */

// Month names in order
export const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
] as const

// Map month names to API keys (lowercase)
export const MONTH_KEY_MAP: Record<string, string> = {
    January: 'january',
    February: 'february',
    March: 'march',
    April: 'april',
    May: 'may',
    June: 'june',
    July: 'july',
    August: 'august',
    September: 'september',
    October: 'october',
    November: 'november',
    December: 'december'
}

// Crowd level badge colors
export const CROWD_LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
    high: {
        bg: 'var(--color-secondary-red, #E73434)',
        text: 'white'
    },
    medium: {
        bg: 'var(--color-secondary-yellow, #cdae00)',
        text: 'white'
    },
    low: {
        bg: 'var(--color-secondary-green, #26BC6D)',
        text: 'white'
    }
}

/**
 * Weather icon URL mappings
 * Maps weather conditions to their corresponding icon URLs
 */
const WEATHER_ICON_URLS: Record<string, string> = {
    // sunny weather icons
    sunny: 'https://media.rimigo.com/1763445157800_dd75d440c0875a5583ced626ddc2832f.png',
    sun: 'https://media.rimigo.com/1763445157800_dd75d440c0875a5583ced626ddc2832f.png',
    clear: 'https://media.rimigo.com/1763445157800_dd75d440c0875a5583ced626ddc2832f.png',
    warm: 'https://media.rimigo.com/1763445157800_dd75d440c0875a5583ced626ddc2832f.png',
    hot: 'https://media.rimigo.com/1763445157800_dd75d440c0875a5583ced626ddc2832f.png',

    // rainy weather icons
    rainy: 'https://media.rimigo.com/1763445743013_d6ee43b6c9d65af492cf2997134041c6.png',
    rain: 'https://media.rimigo.com/1763445743013_d6ee43b6c9d65af492cf2997134041c6.png',
    showers: 'https://media.rimigo.com/1763445743013_d6ee43b6c9d65af492cf2997134041c6.png',

    // cloudy weather icons
    cloudy: 'https://media.rimigo.com/1763445781561_cbb2580ea12b50f3933d09e9b2b1690e.png',
    cloud: 'https://media.rimigo.com/1763445781561_cbb2580ea12b50f3933d09e9b2b1690e.png',
    mild: 'https://media.rimigo.com/1763445781561_cbb2580ea12b50f3933d09e9b2b1690e.png',
    overcast: 'https://media.rimigo.com/1763445781561_cbb2580ea12b50f3933d09e9b2b1690e.png',
    spring: 'https://media.rimigo.com/1763445781561_cbb2580ea12b50f3933d09e9b2b1690e.png'
}

/**
 * Get weather icon based on weather description
 *
 * Analyzes the weather description text and returns either a URL string or a React icon component.
 * For sunny/clear conditions, returns a URL. For other conditions, returns Lucide icons.
 *
 * @param description - Weather description text from API
 * @returns URL string or React node with weather icon
 */
export const getWeatherIcon = (description: string | null): string | React.ReactNode => {
    if (!description) {
        return 'https://media.rimigo.com/1763445781561_cbb2580ea12b50f3933d09e9b2b1690e.png'
    }

    const desc = description.toLowerCase()

    // Check if weather condition has a URL mapping (e.g., sunny, sun, clear)
    for (const [condition, url] of Object.entries(WEATHER_ICON_URLS)) {
        if (desc.includes(condition)) {
            return url
        }
    }

    return 'https://media.rimigo.com/1763445781561_cbb2580ea12b50f3933d09e9b2b1690e.png'

    // // Use Lucide icons for other conditions
    // if (desc.includes('rain') || desc.includes('rainy')) {
    //     return React.createElement(CloudRain, {
    //         className: 'w-5 h-5',
    //         style: { color: 'var(--color-grey-0, #101010)' }
    //     })
    // }
    // if (desc.includes('cloud') || desc.includes('cloudy')) {
    //     return React.createElement(Cloud, {
    //         className: 'w-5 h-5',
    //         style: { color: 'var(--color-grey-0, #101010)' }
    //     })
    // }
    // // Default: sun with cloud for mixed conditions
    // return React.createElement(Sun, {
    //     className: 'w-5 h-5',
    //     style: { color: 'var(--color-secondary-yellow, #cdae00)' }
    // })
}

/**
 * Format temperature range for display
 *
 * Takes min/max temperatures and unit, returns formatted string like "6-16°C"
 *
 * @param min - Minimum temperature
 * @param max - Maximum temperature
 * @param unit - Temperature unit ("celsius" or "fahrenheit")
 * @returns Formatted temperature string
 */
export const formatTemperature = (min: number | null, max: number | null, unit: string | null): string | null => {
    if (min === null || max === null) return null
    const tempUnit = unit === 'fahrenheit' ? '°F' : '°C'
    return `${Math.round(min)}-${Math.round(max)}${tempUnit}`
}

/**
 * Get months to display initially (travel month + next 3 months)
 *
 * Calculates which months to show in collapsed view.
 * Shows traveler's month first, then next 3 consecutive months.
 *
 * @param travelMonthIndex - Index of travel month (0-11) or null
 * @returns Array of month names to display
 */
export const getInitialMonths = (travelMonthIndex: number | null): string[] => {
    // If no travel month, start from current month
    const startIndex = travelMonthIndex !== null ? travelMonthIndex : new Date().getMonth()
    const months: string[] = []

    // Add travel month (or current month) as first
    months.push(MONTH_NAMES[startIndex])

    // Add next 3 months
    for (let i = 1; i <= 3; i++) {
        const nextIndex = (startIndex + i) % 12
        months.push(MONTH_NAMES[nextIndex])
    }

    return months
}

/**
 * Get all months starting from January
 *
 * Returns all 12 months in order for expanded view.
 *
 * @returns Array of all month names
 */
export const getAllMonths = (): string[] => {
    return [...MONTH_NAMES]
}

/**
 * Transform seasonal data into table row data format
 *
 * Converts API seasonal information into a format suitable for TableRow component.
 * Handles data extraction, formatting, and icon generation.
 *
 * @param monthName - Display name of the month
 * @param seasonalInfo - Seasonal information object from API
 * @returns MonthRowData object ready for TableRow component
 */
export const transformMonthDataToRowData = (monthName: string, seasonalInfo: SeasonalInformationType[string]): MonthRowData | null => {
    // Return null if no data available
    if (!seasonalInfo) return null

    const { crowd_levels, weather, availability, is_recommended, description } = seasonalInfo

    // Transform crowd level data
    const crowdLevel = crowd_levels?.level || null
    const crowdLevelDisplay = crowdLevel ? crowdLevel.toUpperCase() : null

    // Transform weather data
    const rawWeatherDescription = weather?.description?.trim() || ''
    const weatherDescription = rawWeatherDescription.length > 0 ? rawWeatherDescription : null
    const weatherIcon = getWeatherIcon(weatherDescription)
    const temperature = formatTemperature(
        weather?.minimum_temperature ?? null,
        weather?.maximum_temperature ?? null,
        weather?.temperature_unit ?? null
    )

    // Transform availability data
    const isAvailable = availability?.is_available ?? false
    const availabilityStatus = isAvailable ? 'Open' : 'Closed'
    // Only set restrictions if it's a non-empty string that's not "None"
    const restrictionsValue = availability?.restrictions
    const availabilityRestrictions =
        restrictionsValue && restrictionsValue.trim() && restrictionsValue.trim().toLowerCase() !== 'none' ? restrictionsValue.trim() : null

    // Transform recommendation data
    const recommendationDescription = description || null

    return {
        monthName,
        crowdLevel: {
            level: crowdLevel,
            displayText: crowdLevelDisplay
        },
        weather: weatherDescription
            ? {
                  icon: weatherIcon,
                  temperature,
                  description: weatherDescription
              }
            : null,
        availability: {
            isAvailable,
            status: availabilityStatus,
            restrictions: availabilityRestrictions
        },
        recommendation: {
            isRecommended: is_recommended ?? null,
            description: recommendationDescription
        }
    }
}

/**
 * Prepare table rows data from seasonal information
 *
 * Processes seasonal information for multiple months and returns array of row data.
 * Filters out months with no data.
 *
 * @param monthNames - Array of month names to process
 * @param seasonalInformation - Complete seasonal information object from API
 * @returns Array of MonthRowData objects, filtered to remove nulls
 */
export const prepareTableRowsData = (monthNames: string[], seasonalInformation: SeasonalInformationType): MonthRowData[] => {
    return monthNames
        .map((monthName) => {
            const monthKey = MONTH_KEY_MAP[monthName]
            const monthData = seasonalInformation[monthKey]
            return transformMonthDataToRowData(monthName, monthData)
        })
        .filter((row): row is MonthRowData => row !== null)
}
