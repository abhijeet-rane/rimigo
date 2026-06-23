import { searchCountries as searchCountriesAPI } from '../Apis/countriesAPI'

// Types
interface CountryDetails {
    id: string
    name: string
    icon_url?: string
}

interface CountryListItem {
    id: string
    name: string
    icon_url?: string
}

// API Response Types
interface CountryAPIResponse {
    id: string
    country_id: string
    country_name: string
    best_months: string[]
    peak_season: string[]
    recommended_for_travel_purpose: string[]
    recommended_for_group_type: string[]
    recommended_for_occasions: string[]
    icon_url: string
    suggestion_priority: number
}

// LocalStorage key
const COUNTRIES_STORAGE_KEY = 'rimigo_countries_cache'

// Helper functions for localStorage
const getCountriesFromStorage = (): Record<string, CountryDetails> => {
    try {
        const stored = localStorage.getItem(COUNTRIES_STORAGE_KEY)
        return stored ? JSON.parse(stored) : {}
    } catch (error) {
        console.error('Error reading countries from localStorage:', error)
        return {}
    }
}

const saveCountryToStorage = (countryName: string, countryDetails: CountryDetails): void => {
    try {
        const countries = getCountriesFromStorage()
        countries[countryName.toLowerCase()] = countryDetails
        localStorage.setItem(COUNTRIES_STORAGE_KEY, JSON.stringify(countries))
    } catch (error) {
        console.error('Error saving country to localStorage:', error)
    }
}

/**
 * Get country details for a given country query
 * First checks localStorage, then falls back to API
 * Returns the first matching country with id, name, and icon_url
 */
export const getCountryDetails = async (countryQuery: string): Promise<CountryDetails | null> => {
    if (!countryQuery) {
        return null
    }

    const normalizedQuery = countryQuery.toLowerCase()

    // Check localStorage first
    const cachedCountries = getCountriesFromStorage()
    if (cachedCountries[normalizedQuery]) {
        return cachedCountries[normalizedQuery]
    }

    // If not in cache, fetch from API
    try {
        const response: CountryAPIResponse[] = await searchCountriesAPI(countryQuery)

        if (response && Array.isArray(response) && response.length > 0) {
            const firstCountry = response[0]
            const countryDetails: CountryDetails = {
                id: firstCountry.country_id,
                name: firstCountry.country_name,
                icon_url: firstCountry.icon_url || undefined
            }

            // Save to localStorage for future use
            saveCountryToStorage(countryQuery, countryDetails)

            return countryDetails
        }

        return null
    } catch (error) {
        console.error('Error fetching country details:', error)
        return null
    }
}

/**
 * Search countries by query and return a list of countries with id, name, and icon_url
 */
export const searchCountries = async (countryQuery: string): Promise<CountryListItem[]> => {
    try {
        const response: CountryAPIResponse[] = await searchCountriesAPI(countryQuery)

        if (response && Array.isArray(response)) {
            return response.map((country) => ({
                id: country.country_id,
                name: country.country_name,
                icon_url: country.icon_url || undefined
            }))
        }

        return []
    } catch (error) {
        console.error('Error searching countries:', error)
        return []
    }
}

// Export types for use in components
export type { CountryDetails, CountryListItem }
