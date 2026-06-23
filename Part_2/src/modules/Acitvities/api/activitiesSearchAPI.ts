import type { CityListItem } from '@/components/common/SearchBar'
import type { SearchResultUnion, SearchData } from '../types/searchTypes'
// Re-use the deduplicated globalSearch from searchAPI so all consumers (city
// search + country/experience dimension search inside SearchBar/WhereSection)
// share a single in-flight + short-TTL cache. Without this, two duplicate
// modules each kicked off their own network request for the same query.
import { globalSearch as _globalSearch } from './searchAPI'

/**
 * Search across experiences, cities, and countries using global search API.
 * Thin wrapper around the canonical globalSearch (which has dedupe) so existing
 * callers in this module keep working without an import shuffle.
 */
export const globalSearch = async (query: string): Promise<SearchData> => {
    if (!query || !query.trim()) {
        return { query: '', count: 0, results: [] }
    }
    try {
        return await _globalSearch(query)
    } catch {
        // Match the old swallow-errors behaviour for activities callers.
        return { query: query.trim(), count: 0, results: [] }
    }
}

/**
 * Search cities using global search API
 * Filters results to only return cities in CityListItem format
 * This replaces the default searchCities() function for activities
 *
 * @param cityQuery - Search query string
 * @returns Promise with list of cities
 */
export const searchCitiesForActivities = async (cityQuery: string): Promise<CityListItem[]> => {
    if (!cityQuery || !cityQuery.trim()) {
        return []
    }

    try {
        const searchData = await globalSearch(cityQuery.trim())

        // Filter to only city results with score > 75 and convert to CityListItem format
        // Include image_url, country_id, and country_name from API response
        const cityResults = searchData.results
            .filter((result): result is Extract<SearchResultUnion, { type: 'location_city' }> => result.type === 'location_city' && result.score > 75)
            .map((cityResult) => ({
                id: cityResult.city_id,
                name: cityResult.city_name,
                image_url: cityResult.image_url, // Include image_url for display
                country_id: cityResult.country_id, // Include country_id for navigation
                country_name: cityResult.country_name, // Include country_name for navigation
                is_live: cityResult.is_live
            }))

        return cityResults
    } catch {
        return []
    }
}

/**
 * Search countries using global search API
 * Filters results to only return countries
 *
 * @param countryQuery - Search query string
 * @returns Promise with list of countries
 */
export const searchCountriesForActivities = async (countryQuery: string): Promise<Array<{ id: string; name: string; icon_url?: string }>> => {
    if (!countryQuery || !countryQuery.trim()) {
        return []
    }

    try {
        const searchData = await globalSearch(countryQuery.trim())

        // Filter to only country results
        const countryResults = searchData.results
            .filter((result): result is Extract<SearchResultUnion, { type: 'location_country' }> => result.type === 'location_country')
            .map((countryResult) => ({
                id: countryResult.country_id,
                name: countryResult.country_name,
                icon_url: countryResult.image_url
            }))

        return countryResults
    } catch {
        return []
    }
}

/**
 * Get all result types from global search (experiences, cities, countries)
 * Useful for displaying mixed results in dropdown
 *
 * @param query - Search query string
 * @returns Promise with all search results
 */
export const searchAllForActivities = async (query: string): Promise<SearchData> => {
    return globalSearch(query)
}
