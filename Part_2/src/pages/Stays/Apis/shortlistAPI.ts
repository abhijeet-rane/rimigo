import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

export interface ShortlistCuratedLabel {
    label: string
    value: string | null
}

export interface ShortlistPlatformReview {
    platform: string
    review_count: number
    rating: number
    url: string
    logo_url: string | null
}

export interface ShortlistedStay {
    id: string | number
    hotel_name?: string
    name?: string
    nightly_price?: number
    rate_per_night?: number
    price?: number
    hero_image_url?: string
    image_url?: string
    cover_image_url?: string
    location_tag?: string
    curated_labels?: ShortlistCuratedLabel[]
    curatedLabels?: ShortlistCuratedLabel[]
    overall_rating?: number
    review_data?: {
        platform_reviews?: ShortlistPlatformReview[]
        overall_score?: number
        review_type?: string
    }
    platform_reviews?: ShortlistPlatformReview[]
    review_type?: string
    zentrum_hub_id?: string
    city_id?: string
    city_name?: string
    base_city_info?: {
        id: string
        name: string
    }
    check_in?: string
    check_out?: string
    travel_purpose?: string
    group_type?: string
    city_preferences?: string[]
}

export interface ShortlistPagination {
    page: number
    limit: number
    total_count: number
    total_pages: number
}

export interface ShortlistResponse {
    message: string
    response_code: string
    data: {
        data: ShortlistedStay[]
        pagination: ShortlistPagination
    }
}

export interface ShortlistedByTripAccommodation {
    id: string
    name?: string
    base_city_info?: {
        id: string
        name: string
    }
    category?: string
}

export interface ShortlistedReviewData {
    zentrum_hub_id?: string
    overall_score?: number
    platform_reviews?: ShortlistPlatformReview[]
    location_tags?: string[]
    review_status?: string
}

export interface ShortlistedByTripResult {
    zentrum_hub_id: string
    is_traveler_shortlisted: boolean
    accommodation?: ShortlistedByTripAccommodation
    accommodation_id?: string
    content?: string[]
    review_data?: ShortlistedReviewData
    rate_per_night?: number | null
}

export interface ShortlistedByTripResponse {
    trip: {
        id: string
        name: string
    }
    total: number
    page: number
    limit: number
    has_more: boolean
    results: ShortlistedByTripResult[]
}

export interface BulkUpsertTripAccommodationPayload {
    trip_id: string
    accommodations: Array<{
        accommodation_id: string
        zentrum_hub_id: string
        is_traveler_shortlisted: boolean
    }>
}

export interface BulkUpsertTripAccommodationResponse {
    message?: string
    response_code?: string
    data?: unknown
}

export interface GetShortlistedStaysParams {
    tripId: string
    baseCityIds?: string
    accommodationId?: string
    page?: number
    limit?: number
}

export const getShortlistedStays = async ({ tripId, baseCityIds, page = 1, limit = 10 }: GetShortlistedStaysParams): Promise<ShortlistResponse> => {
    const params = new URLSearchParams()
    params.set('trip_id', tripId)
    if (baseCityIds) {
        params.set('base_city_ids', baseCityIds)
    }
    params.set('page', page.toString())
    params.set('limit', limit.toString())

    const url = `${API_CONFIG.BASE_URL}/api/trip-accommodations/shortlisted_by_trip/?${params.toString()}`
    const response = await apiClient.get<ShortlistResponse>(url)
    return response.data
}

export const getShortlistedByTrip = async ({
    tripId,
    baseCityIds,
    accommodationId,
    page = 1,
    limit = 50
}: GetShortlistedStaysParams): Promise<ShortlistedByTripResponse> => {
    const params = new URLSearchParams()
    params.set('trip_id', tripId)
    if (baseCityIds) {
        params.set('base_city_ids', baseCityIds)
    }
    if (accommodationId) {
        params.set('accommodation_id', accommodationId)
    }
    params.set('page', page.toString())
    params.set('limit', limit.toString())

    const url = `${API_CONFIG.BASE_URL}/api/trip-accommodations/shortlisted_by_trip/?${params.toString()}`
    const response = await apiClient.get<ShortlistedByTripResponse>(url)
    return response.data
}

export const bulkUpsertTripAccommodations = async (payload: BulkUpsertTripAccommodationPayload): Promise<BulkUpsertTripAccommodationResponse> => {
    const url = `${API_CONFIG.BASE_URL}/api/trip-accommodations/bulk_upsert/`
    const response = await apiClient.post<BulkUpsertTripAccommodationResponse>(url, payload)
    return response.data
}
