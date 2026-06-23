import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

// [
//     {
//         "country_id": "67a31d03aa84ea4b97d24faf",
//         "country_name": "Australia",
//         "icon_url": ""
//     },
//     {
//         "country_id": "6884b51cc7ff6617c194af55",
//         "country_name": "Bali",
//         "icon_url": "https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/destinations/city-icons/bali/bali-canggu.png"
//     }
// ]

export type Region = {
    id: string
    name: string
}

export type LocationPersonalizationResponse = {
    country_id: string
    country_name: string
    icon_url: string
    flag_icon_url: string
    banner_img_url?: string
    region: Region | null
}

/**
 * Backend `popular-countries` response — ranked top countries derived from
 * the `traveler_collections.context.country_id` interest signal. The endpoint
 * returns minimal data; full display fields (flag, region) live in
 * `live-countries` and are joined client-side.
 */
export type PopularCountryResponse = {
    country_id: string
    country_name: string
    icon_url: string
    flag_icon_url: string
    banner_img_url: string
}

export const getPopularCountriesRanked = async (): Promise<PopularCountryResponse[]> => {
    try {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/location-personalization/popular-countries/`)
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export type LocationHeroImageResponse = {
    country_id: string
    country_name: string
    tripboard_hero_image_url: string | null
}

export type CityResponse = {
    id: string
    city: string
    city_name: string
    city_thumbnail_url: string | null
    tripboard_hero_image_url: string | null
    stay_guides: unknown[]
    stay_prompt_guides: unknown[]
    accommodation_budget_categories: unknown[]
    preferences: unknown
    created_at: string
    updated_at: string
}

export type CitiesResponse = {
    count: number
    next: string | null
    previous: string | null
    results: CityResponse[]
}

export const getLiveCountries = async (): Promise<LocationPersonalizationResponse[]> => {
    try {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/location-personalization/live-countries/`)
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export const getLocationHeroImages = async (countryIds: string[]): Promise<LocationHeroImageResponse[]> => {
    if (!countryIds.length) {
        return []
    }

    try {
        const response = await apiClient.post(`${API_CONFIG.BASE_URL}/curation/location-personalization/hero-images/bulk/`, {
            country_ids: countryIds
        })
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export type SeasonalInformation = {
    min_temp: number
    max_temp: number
    temp_unit: string

    description: string
    type: string
    cost: {
        min_price: number
        max_price: number
        currency: string
        description: string
    }
    crowd: {
        level: string
        peak: boolean
        description: string
    }
}

export type CountryBasicInfoResponse = {
    country_name: string
    seasonal_information: {
        [key: string]: SeasonalInformation // key is month name like "january", "february", etc.
    }
    descriptions: string[]
}

export const getCountryBasicInfo = async (countryId: string): Promise<CountryBasicInfoResponse> => {
    try {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/location-personalization/countries/${countryId}/basic/`)
        // Extract data from response wrapper (response.data.data for wrapped responses, or response.data for direct responses)
        return response.data?.data || response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export type CountryResponse = {
    message: string
    response_code: string
    data: {
        id: string
        name: string
        created_at: string
        updated_at: string
        region: Region
    }
}

/**
 * Get country by ID from /curation/countries/{country_id}/
 */
export const getCountryById = async (countryId: string): Promise<CountryResponse> => {
    try {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/countries/${countryId}/`)
        return response.data.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export type CityInformation = {
    known_for: string[]
}

export type CityItem = {
    city_name: string
    city_id: string
    city_thumbnail_url: string | null
    suggestion_priority: number
    city_information: CityInformation
    location?: {
        latitude: number | null
        longitude: number | null
    } | null
}

export type CountryCitiesResponse = {
    message: string
    response_code: string
    data: {
        country_name: string
        country_id: string
        top_cities: CityItem[]
        other_cities: CityItem[]
    }
}

export const getCountryCities = async (countryId: string): Promise<CountryCitiesResponse> => {
    try {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/location-personalization-cities/countries/${countryId}/top-cities/`, {
            params: {
                has_experiences: true
            }
        })
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export type CityBasicInformation = {
    known_for: string[]
    summary: string
}

export type CityBasicInfoResponse = {
    message: string
    response_code: string
    data: {
        city_name: string
        seasonal_information: {
            [key: string]: SeasonalInformation // key is month name like "january", "february", etc.
        }
        city_information: CityBasicInformation
    }
}

export const getCityBasicInfo = async (cityId: string): Promise<CityBasicInfoResponse> => {
    try {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/location-personalization-cities/cities/${cityId}/basic/`)
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export const getCitiesByCountry = async (countryId: string): Promise<CitiesResponse> => {
    try {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/location-personalization-cities/`, {
            params: {
                country_id: countryId,
                all: true
            }
        })
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

/** City with lat/long and thumbnail from location-personalization-cities API */
export type CityWithLocation = {
    id: string
    city: string
    city_name: string
    latitude: number | null
    longitude: number | null
    city_thumbnail_url: string | null
}

/**
 * Get cities by IDs with lat/long (general purpose).
 * GET /curation/location-personalization-cities/?city_ids=id1,id2,id3&all=true
 * Response: { count, next, previous, results: [{ id, city, city_name, location: { latitude, longitude }, ... }] }
 */
export const getCitiesByIds = async (cityIds: string[]): Promise<CityWithLocation[]> => {
    if (!cityIds.length) return []
    try {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/location-personalization-cities/`, {
            params: {
                city_ids: cityIds.join(','),
                all: true
            }
        })
        const data = response.data as { results?: Array<Record<string, unknown>> }
        const results = data?.results ?? []
        return results.map((c) => {
            const loc = c.location as { latitude?: number; longitude?: number } | undefined
            const lat = typeof loc?.latitude === 'number' ? loc.latitude : null
            const lng = typeof loc?.longitude === 'number' ? loc.longitude : null
            const thumb = c.city_thumbnail_url
            return {
                id: String(c.id ?? ''),
                city: String(c.city ?? c.id ?? ''),
                city_name: String(c.city_name ?? ''),
                latitude: lat,
                longitude: lng,
                city_thumbnail_url: typeof thumb === 'string' && thumb ? thumb : null
            } as CityWithLocation
        })
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

/** City from map endpoint: city_id, city_name, city_thumbnail_url, location (for map display only) */
export type CityForMap = {
    city_id: string
    city_name: string
    city_thumbnail_url: string | null
    latitude: number | null
    longitude: number | null
}

/** Map endpoint response: { message, response_code, data: CityForMapItem[] } — city locations from API, not geocoding */
interface LocationPersonalizationMapResponse {
    message?: string
    response_code?: string
    data?: Array<{
        city_id?: string
        city_name?: string
        city_thumbnail_url?: string | null
        location?: { latitude?: number; longitude?: number }
    }>
}

/**
 * Get cities by IDs for map display (lat/long + city_thumbnail_url).
 * GET /curation/location-personalization-cities/map/?city_ids=id1,id2,id3
 * Response: { message, response_code, data: [{ city_id, city_name, city_thumbnail_url, location }] }
 * City locations come from this API only; do not use geocoding JSON for city coordinates.
 */
export const getCitiesByIdsForMap = async (cityIds: string[]): Promise<CityForMap[]> => {
    if (!cityIds.length) return []
    try {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/location-personalization-cities/map/`, {
            params: {
                city_ids: cityIds.join(',')
            }
        })
        const body = response.data as LocationPersonalizationMapResponse
        const results = Array.isArray(body?.data) ? body.data : []
        return results.map((c) => {
            const loc = c.location
            const lat = typeof loc?.latitude === 'number' ? loc.latitude : null
            const lng = typeof loc?.longitude === 'number' ? loc.longitude : null
            const thumb = c.city_thumbnail_url
            return {
                city_id: String(c.city_id ?? ''),
                city_name: String(c.city_name ?? ''),
                city_thumbnail_url: typeof thumb === 'string' && thumb ? thumb : null,
                latitude: lat,
                longitude: lng
            } as CityForMap
        })
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}
