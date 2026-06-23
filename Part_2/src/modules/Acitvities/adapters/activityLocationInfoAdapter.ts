import { CountryHeroData, WeatherType } from '../components/ActivitiesCountryHero'
import { CountryBasicInfoResponse, CityBasicInfoResponse } from '@/api/curation/locationPersonalizationAPI'

/**
 * Formats temperature range for display
 */
const formatTemperature = (minTemp: number, maxTemp: number, unit: string): string => {
    const unitSymbol = unit === 'celsius' ? '°C' : '°F'
    return `${minTemp}${unitSymbol} - ${maxTemp}${unitSymbol}`
}

/**
 * Formats cost range for display
 */
const formatCost = (minPrice: number, maxPrice: number, currency: string): string => {
    const currencySymbol = currency === 'INR' ? '₹' : currency
    return `${currencySymbol}${minPrice.toLocaleString()} - ${currencySymbol}${maxPrice.toLocaleString()}`
}

/**
 * Capitalizes the first letter of a string
 */
const capitalizeFirst = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Validates and normalizes weather type
 */
const normalizeWeatherType = (type: string | undefined): WeatherType | undefined => {
    if (!type) return undefined
    const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
    const validTypes: WeatherType[] = ['Sunny', 'Cloudy', 'Rainy', 'Generic']
    return validTypes.includes(normalizedType as WeatherType) ? (normalizedType as WeatherType) : undefined
}

/**
 * Adapter to transform API response to CountryHeroData format
 */
export const adaptCountryBasicInfoToHeroData = (apiResponse: CountryBasicInfoResponse, currentMonth: string): CountryHeroData | null => {
    // Get the seasonal information for the current month
    const monthData = apiResponse.seasonal_information[currentMonth.toLowerCase()]

    if (!monthData) {
        return null
    }

    // Format the data according to CountryHeroData interface
    return {
        name: apiResponse.country_name,
        description: apiResponse.descriptions[0] || '',
        stats: {
            avgCost: {
                value: formatCost(monthData.cost.min_price, monthData.cost.max_price, monthData.cost.currency),
                note: monthData.cost.description
            },
            weather: {
                value: formatTemperature(monthData.min_temp, monthData.max_temp, monthData.temp_unit),
                note: monthData.description,
                type: normalizeWeatherType(monthData.type)
            },
            crowd: {
                level: capitalizeFirst(monthData.crowd.level),
                note: monthData.crowd.description
            }
        }
    }
}

/**
 * Adapter to transform City API response to CountryHeroData format
 * Reuses the same UI format as country data
 */
export const adaptCityBasicInfoToHeroData = (apiResponse: CityBasicInfoResponse, currentMonth: string): CountryHeroData | null => {
    const cityData = apiResponse.data

    // Get the seasonal information for the current month
    const monthData = cityData.seasonal_information[currentMonth.toLowerCase()]

    if (!monthData) {
        return null
    }

    // Format the data according to CountryHeroData interface
    // Use city_information.summary for description
    return {
        name: cityData.city_name,
        description: cityData.city_information.summary || '',
        stats: {
            avgCost: {
                value: formatCost(monthData.cost.min_price, monthData.cost.max_price, monthData.cost.currency),
                note: monthData.cost.description
            },
            weather: {
                value: formatTemperature(monthData.min_temp, monthData.max_temp, monthData.temp_unit),
                note: monthData.description,
                type: normalizeWeatherType(monthData.type)
            },
            crowd: {
                level: capitalizeFirst(monthData.crowd.level),
                note: monthData.crowd.description
            }
        }
    }
}
