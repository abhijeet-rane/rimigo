import { CityItem, CountryCitiesResponse } from '@/api/curation/locationPersonalizationAPI'

export interface ActivitiesCityCardData {
    cityId: string
    cityName?: string // Will be fetched separately if needed
    knownFor: string
    image: string | null
    suggestionPriority: number
    location?: {
        latitude: number | null
        longitude: number | null
    } | null
}

export interface ActivitiesAllCityData {
    id: string
    name?: string // Will be fetched separately if needed
    image?: string
    location?: {
        latitude: number | null
        longitude: number | null
    } | null
}

/**
 * Formats known_for array to a comma-separated string
 */
const formatKnownFor = (knownFor: string[]): string => {
    if (!knownFor || knownFor.length === 0) return ''
    return knownFor.join(', ')
}

/**
 * Adapter to transform CityItem to ActivitiesCityCardData format
 */
export const adaptActivitiesCityItemToCardData = (cityItem: CityItem): ActivitiesCityCardData => {
    return {
        cityId: cityItem.city_id,
        cityName: cityItem.city_name,
        knownFor: formatKnownFor(cityItem.city_information?.known_for || []),
        image: cityItem.city_thumbnail_url,
        suggestionPriority: cityItem.suggestion_priority,
        location: cityItem.location ?? null
    }
}

/**
 * Adapter to transform CityItem to ActivitiesAllCityData format
 */
export const adaptActivitiesCityItemToAllCityData = (cityItem: CityItem): ActivitiesAllCityData => {
    return {
        id: cityItem.city_id,
        name: cityItem.city_name,
        image: cityItem.city_thumbnail_url || undefined,
        location: cityItem.location ?? null
    }
}

/**
 * Adapter to transform CountryCitiesResponse to UI format
 */
export const adaptActivitiesCitiesResponse = (response: CountryCitiesResponse) => {
    const topCities = response.data.top_cities.map(adaptActivitiesCityItemToCardData)

    const otherCities = response.data.other_cities.map(adaptActivitiesCityItemToAllCityData)

    // Full city list for the "All cities" grid — top_cities + other_cities,
    // deduped by id (top first). `other_cities` alone leaves the section
    // titled "All cities" showing only the non-carousel cities, which for
    // countries where most cities are "top" (e.g. Bali) collapses to one.
    const allCities: ActivitiesAllCityData[] = []
    const seen = new Set<string>()
    for (const item of [...response.data.top_cities, ...response.data.other_cities]) {
        if (item.city_id && !seen.has(item.city_id)) {
            seen.add(item.city_id)
            allCities.push(adaptActivitiesCityItemToAllCityData(item))
        }
    }

    return {
        topCities,
        otherCities,
        allCities
    }
}
