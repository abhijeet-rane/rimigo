import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import type { AccommodationsResponse, GetAccommodationsParams } from '../Types/accommodationTypes'

/**
 * Fetch accommodations for a city with filters
 * @param params - Search parameters including city ID, dates, preferences, etc.
 * @returns Promise with accommodations data
 */
export const getAccommodations = async (params: GetAccommodationsParams): Promise<AccommodationsResponse> => {
    const {
        cityId,
        travel_purpose,
        group_type,
        check_in_date,
        check_out_date,
        city_preferences,
        include_hot_picks = true,
        page = 1,
        limit = 12,
        budget_range,
        order_by = { relevance: -1 },
        min_match_score = 0
    } = params

    // Build query parameters
    const queryParams = new URLSearchParams()

    // Required params
    queryParams.append('travel_purpose', travel_purpose)
    queryParams.append('group_type', group_type)
    queryParams.append('check_in_date', check_in_date)
    queryParams.append('check_out_date', check_out_date)
    queryParams.append('include_hot_picks', include_hot_picks.toString())
    queryParams.append('city_preferences', JSON.stringify(city_preferences))
    queryParams.append('page', page.toString())
    queryParams.append('limit', limit.toString())
    queryParams.append('order_by', JSON.stringify(order_by))
    queryParams.append('min_match_score', min_match_score.toString())
    // Optional params
    if (budget_range) {
        queryParams.append('budget_range', JSON.stringify(budget_range))
    }
    // Sort array filters before serialization so the cache key is canonical
    // regardless of input order (sancus PATH_QUERY hashes the raw query string).
    if (params.property_types && params.property_types.length) {
        queryParams.append('property_types', JSON.stringify([...params.property_types].sort()))
    }
    if (params.amenities && params.amenities.length) {
        queryParams.append('amenities', JSON.stringify([...params.amenities].sort()))
    }
    if (params.star_ratings && params.star_ratings.length) {
        queryParams.append('star_ratings', JSON.stringify([...params.star_ratings].sort((a, b) => a - b)))
    }
    if (params.is_verified !== undefined && params.is_verified !== null) {
        queryParams.append('is_verified', String(params.is_verified))
    }
    if (params.is_b2b_deal_available !== undefined && params.is_b2b_deal_available !== null) {
        queryParams.append('is_b2b_deal_available', String(params.is_b2b_deal_available))
    }
    if (params.zentrum_hub_ids && params.zentrum_hub_ids.length) {
        queryParams.append('zentrum_hub_ids', JSON.stringify([...params.zentrum_hub_ids].sort()))
    }
    if (params.exclude_unpriced) {
        queryParams.append('exclude_unpriced', 'true')
    }
    if (params.viewport) {
        queryParams.append('north', String(params.viewport.north))
        queryParams.append('south', String(params.viewport.south))
        queryParams.append('east', String(params.viewport.east))
        queryParams.append('west', String(params.viewport.west))
    }

    const url = `${API_CONFIG.BASE_URL}/curation/v2/cities/${cityId}/accommodations/?${queryParams.toString()}`

    const response = await apiClient.get<AccommodationsResponse>(url)
    return response.data
}

/**
 * Fetch accommodations within map viewport bounds (lightweight endpoint).
 * Optional `budget_range` scopes the result to stays within the user's nightly
 * rate range. Unpriced stays are omitted by the backend.
 *
 * Optional guest params (`num_adults` / `num_infants` / `child_ages`) aren't
 * used to filter the viewport response — they're forwarded to the backend's
 * async rates warm-up task so the next pan on the same city gets prices.
 */
export const getViewportAccommodations = async (params: {
    cityId: string
    north: number
    south: number
    east: number
    west: number
    check_in_date?: string
    check_out_date?: string
    limit?: number
    exclude_ids?: string[]
    budget_range?: { min: number; max: number }
    num_adults?: number
    num_infants?: number
    child_ages?: number[]
    property_types?: string[]
    amenities?: string[]
    star_ratings?: number[]
    is_verified?: boolean | null
    is_b2b_deal_available?: boolean | null
}): Promise<{ data: any[] }> => {
    const qp = new URLSearchParams()
    qp.append('north', String(params.north))
    qp.append('south', String(params.south))
    qp.append('east', String(params.east))
    qp.append('west', String(params.west))
    if (params.check_in_date) qp.append('check_in_date', params.check_in_date)
    if (params.check_out_date) qp.append('check_out_date', params.check_out_date)
    if (params.limit) qp.append('limit', String(params.limit))
    // Sort all array filters so identical filter sets produce identical query
    // strings — keeps the PATH_QUERY cache key canonical regardless of input order.
    if (params.exclude_ids && params.exclude_ids.length > 0) {
        qp.append('exclude_ids', [...params.exclude_ids].sort().join(','))
    }
    if (params.budget_range) {
        qp.append('budget_range', JSON.stringify(params.budget_range))
    }
    if (params.num_adults != null) qp.append('num_adults', String(params.num_adults))
    if (params.num_infants != null) qp.append('num_infants', String(params.num_infants))
    if (params.child_ages && params.child_ages.length > 0) {
        qp.append('child_ages', [...params.child_ages].sort((a, b) => a - b).join(','))
    }
    if (params.property_types && params.property_types.length) {
        qp.append('property_types', JSON.stringify([...params.property_types].sort()))
    }
    if (params.amenities && params.amenities.length) {
        qp.append('amenities', JSON.stringify([...params.amenities].sort()))
    }
    if (params.star_ratings && params.star_ratings.length) {
        qp.append('star_ratings', JSON.stringify([...params.star_ratings].sort((a, b) => a - b)))
    }
    if (params.is_verified != null) {
        qp.append('is_verified', String(params.is_verified))
    }
    if (params.is_b2b_deal_available != null) {
        qp.append('is_b2b_deal_available', String(params.is_b2b_deal_available))
    }
    const url = `${API_CONFIG.BASE_URL}/curation/v2/cities/${params.cityId}/accommodations/viewport/?${qp.toString()}`
    const response = await apiClient.get<{ message: string; response_code: string; data: { data: any[] } }>(url)
    return { data: response.data.data.data }
}

export interface CheckAvailabilityRequest {
    hotel_ids: string[]
    check_in: string
    check_out: string
    num_adults?: number
    child_ages?: number[]
    currency?: string
    nationality?: string
    country_of_residence?: string
    destination_country_code?: string
    travel_purpose?: string
    channel_id?: string
    trip_id?: string
    city_id?: string
}

export interface AvailabilityResponse {
    success: boolean
    rates: Record<string, number>
    currency: string
}

export const checkAvailability = async (params: CheckAvailabilityRequest): Promise<AvailabilityResponse> => {
    const normalized = (params.num_adults ?? 2) <= 2
        ? { num_adults: params.num_adults ?? 2, child_ages: params.child_ages ?? [] }
        : { num_adults: 2, child_ages: [] }
    const body = {
        hotel_ids: params.hotel_ids,
        check_in: params.check_in,
        check_out: params.check_out,
        num_adults: normalized.num_adults,
        child_ages: normalized.child_ages,
        currency: params.currency ?? 'INR',
        nationality: params.nationality ?? 'IN',
        country_of_residence: params.country_of_residence ?? 'IN',
        destination_country_code: params.destination_country_code ?? 'US',
        travel_purpose: params.travel_purpose ?? 'Leisure',
        ...(params.trip_id && { trip_id: params.trip_id }),
        ...(params.city_id && { city_id: params.city_id }),
    }
    const url = `${API_CONFIG.BASE_URL}/curation/accommodations/check_availability/`
    const response = await apiClient.post<{ message: string; response_code: string; data: AvailabilityResponse }>(url, body)
    return response.data.data
}

export interface AccommodationMetadataItem {
    id: string
    name: string
    geo_location: {
        lat: string
        long: string
    }
    rate_per_night: number | null
    banner_img: string
    zentrum_hub_id: string
    is_verified?: boolean
    is_b2b_deal_available?: boolean
    is_available_on_airbnb?: boolean
    content?: string[]
}

export interface AccommodationMetadataResponse {
    message: string
    response_code: string
    data: {
        data: AccommodationMetadataItem[]
    }
}

export interface GetAccommodationMetadataParams {
    cityId?: string
    check_in_date: string
    check_out_date: string
    amenities?: string[]
    property_types?: string[]
    budget_range?: {
        min: number
        max: number
    }
    stays?: string[] // Deprecated: Array of accommodation IDs (will be sent as multiple stay_id parameters)
    stay_ids?: string[] // Array of accommodation IDs (will be sent as multiple stay_id parameters)
}

/**
 * Fetch accommodations metadata for map markers
 * @param params - Search parameters including city ID, dates, filters, etc.
 * @returns Promise with accommodations metadata
 */
export const getAccommodationMetadata = async (params: GetAccommodationMetadataParams): Promise<AccommodationMetadataResponse> => {
    const { cityId, check_in_date, check_out_date, amenities, property_types, budget_range, stay_ids } = params

    // Support both stays (deprecated) and stay_ids for backward compatibility
    const stayIds = stay_ids

    // Validate that either cityId or stayIds is provided
    if (!cityId && (!stayIds || stayIds.length === 0)) {
        throw new Error('Either cityId or stay_ids must be provided')
    }

    const queryParams = new URLSearchParams()
    
    // Add city_id as query parameter if provided
    if (cityId) {
        queryParams.append('city_id', cityId)
    }
    
    // Add stay_ids as multiple stay_id parameters if provided
    if (stayIds && stayIds.length > 0) {
        stayIds.forEach((stayId) => {
            queryParams.append('zentrum_hub_id', stayId)
        })
    }
    
    queryParams.append('check_in_date', check_in_date)
    queryParams.append('check_out_date', check_out_date)

    if (amenities && amenities.length > 0) {
        queryParams.append('amenities', JSON.stringify(amenities))
    }
    if (property_types && property_types.length > 0) {
        queryParams.append('property_types', JSON.stringify(property_types))
    }
    if (budget_range) {
        queryParams.append('budget_range', JSON.stringify(budget_range))
    }

    const url = `${API_CONFIG.BASE_URL}/curation/v2/accommodations/metadata/list/?${queryParams.toString()}`

    const response = await apiClient.get<AccommodationMetadataResponse>(url)
    return response.data
}

export interface AccommodationDatabaseLocation {
    latitude: number
    longitude: number
    address: string
    distance_from_city_center: number
}

export interface AccommodationDatabaseMedia {
    image_url: string
    thumbnail_url?: string
}

export type AccommodationCategory = 'hotel' | 'homestay' | 'resort' | 'villa' | 'apartment' | 'guesthouse'

export interface AccommodationDatabaseRequest {
    zentrum_hub_id: string
    name: string
    base_city: string // City ID
    category: AccommodationCategory
    description?: string
    media?: AccommodationDatabaseMedia
    location?: AccommodationDatabaseLocation
    highlights?: string[]
    facilities?: string[]
    link?: string[]
    serp_search_name?: string
}

export interface AccommodationDatabaseResponse {
    id: string
    zentrum_hub_id: string
    name: string
    base_city_info: {
        id: string
        name: string
    }
    category: string
    created_at?: string
    updated_at?: string
}

/**
 * Add or update accommodation in the Rimigo database
 * @param params - Accommodation details to save to database
 * @returns Promise with the created/updated accommodation data
 */
export const addAccommodationToDatabase = async (params: AccommodationDatabaseRequest): Promise<AccommodationDatabaseResponse> => {
    const url = `${API_CONFIG.BASE_URL}/curation/accommodations/`

    const response = await apiClient.post<AccommodationDatabaseResponse>(url, params)
    return response.data
}

/**
 * Check if accommodation already exists in database
 * @param zentrumHubId - Hotel/accommodation zentrum ID
 * @returns Promise with existence status and accommodation ID
 */
export const updateAccommodationVerification = async (
    accommodationId: string,
    data: { is_verified?: boolean; is_b2b_deal_available?: boolean; is_available_on_airbnb?: boolean }
): Promise<{ id: string; zentrum_hub_id: string; is_verified: boolean; is_b2b_deal_available: boolean; is_available_on_airbnb: boolean }> => {
    const url = `${API_CONFIG.BASE_URL}/curation/accommodations/${accommodationId}/update_verification/`
    const response = await apiClient.patch(url, data)
    return response.data?.data ?? response.data
}

export const checkAccommodationExistence = async (zentrumHubId: string): Promise<{ is_accommodation_exists: boolean; accommodation_id?: string }> => {
    const url = `${API_CONFIG.BASE_URL}/curation/accommodations/check_accommodation_existence/?zentrum_hub_id=${zentrumHubId}`

    const response = await apiClient.get<{ is_accommodation_exists: boolean; accommodation_id?: string }>(url)
    return response.data
}