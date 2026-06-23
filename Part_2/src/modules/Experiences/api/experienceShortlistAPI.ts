import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { dispatchShortlistChanged } from '@/lib/events/shortlistEvents'

export interface ShortlistedByTripExperience {
    id: string
    name?: string
    base_city_info?: {
        id: string
        name: string
    }
    category?: string
}

export interface ShortlistedByTripExperienceResult {
    id: string
    experience?: {
        id: string
        name?: string
        categories?: string[]
        base_city?: {
            name: string
        }
        display_props?: {
            landscape_image?: string
        }
        price?: {
            currency: string
            lower_bound: number
            upper_bound: number
        }
        short_description?: string | null
    }
    experience_id?: string // Fallback if API uses this field directly
    is_traveler_shortlisted: boolean
    is_ai_suggested: boolean
    ai_reason_for_suggestion: string[]
    rimigo_reason_for_suggestion: string[]
    content?: string[]
    price?: {
        currency: string
        upper_bound: number
        lower_bound: number
    } | null
}

export interface ShortlistedByTripExperienceResponse {
    trip: {
        id: string
        name: string
    }
    total: number
    page: number
    limit: number
    has_more: boolean
    results: ShortlistedByTripExperienceResult[]
}

export interface BulkUpsertTripExperiencePayload {
    trip_id: string
    experiences: Array<{
        experience_id: string
        is_traveler_shortlisted: boolean
    }>
}

export interface BulkUpsertTripExperienceResponse {
    message?: string
    response_code?: string
    data?: unknown
}

export interface GetShortlistedExperiencesParams {
    tripId: string
    baseCityIds?: string
    country?: string
    page?: number
    limit?: number
}

export const getShortlistedByTrip = async ({
    tripId,
    baseCityIds,
    country,
    page = 1,
    limit = 50
}: GetShortlistedExperiencesParams): Promise<ShortlistedByTripExperienceResponse> => {
    const params = new URLSearchParams()
    params.set('trip_id', tripId)
    if (baseCityIds) {
        params.set('base_city_ids', baseCityIds)
    }
    if (country) {
        params.set('country', country)
    }
    params.set('page', page.toString())
    params.set('limit', limit.toString())

    const url = `${API_CONFIG.BASE_URL}/api/trip-experiences/shortlisted_by_trip/?${params.toString()}`
    const response = await apiClient.get<ShortlistedByTripExperienceResponse>(url)
    return response.data
}

export const bulkUpsertTripExperiences = async (
    tripId: string,
    payload: BulkUpsertTripExperiencePayload
): Promise<BulkUpsertTripExperienceResponse> => {
    const response = await apiClient.post(`${API_CONFIG.BASE_URL}/api/trip-experiences/bulk_upsert/?trip_id=${tripId}`, payload)
    // Notify every shortlist-derived surface so they reconcile (see shortlistEvents.ts).
    dispatchShortlistChanged({ tripId })
    return response.data
}

interface CheckExistsResponse {
    experience_id: string
    trip_id: string
    experience_name: string
    is_experience_exists: boolean
    is_trip_experience_exists: boolean
    trip_experience_id: string | null
    is_traveler_shortlisted: boolean | null
}

export const checkExists = async (experienceId: string, tripId: string): Promise<CheckExistsResponse> => {
    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/api/trip-experiences/check_exists/?experience_id=${experienceId}&trip_id=${tripId}`)
    const data = response.data
    return data
}

// City-wise shortlisted experiences interfaces
// The results object has city names as keys and arrays of experience objects as values
export interface CityWiseShortlistedExperiencesResponse {
    trip: {
        id: string
        name: string
    }
    total: number
    page: number
    limit: number
    has_more: boolean
    results: Record<string, ShortlistedByTripExperienceResult[]> // City name -> Array of Experience objects
}

// API response wrapper
export interface CityWiseShortlistedExperiencesAPIResponse {
    message: string
    response_code: string
    data: CityWiseShortlistedExperiencesResponse
}

export interface GetCityWiseShortlistedExperiencesParams {
    tripId: string
    country?: string
    page?: number
    limit?: number
}

export const getCityWiseShortlistedExperiences = async ({
    tripId,
    country,
    page = 1,
    limit = 10
}: GetCityWiseShortlistedExperiencesParams): Promise<CityWiseShortlistedExperiencesResponse> => {
    const params = new URLSearchParams()
    params.set('trip_id', tripId)
    if (country) {
        params.set('country', country)
    }
    params.set('page', page.toString())
    params.set('limit', limit.toString())

    const url = `${API_CONFIG.BASE_URL}/api/trip-experiences/shortlisted-experiences/?${params.toString()}`
    const response = await apiClient.get<CityWiseShortlistedExperiencesAPIResponse>(url)
    return response.data.data
}
