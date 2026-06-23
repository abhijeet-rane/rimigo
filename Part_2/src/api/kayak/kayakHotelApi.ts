import apiClient from '@/lib/api/apiClient'
import type { KayakAutocompleteResponse } from '@/types/kayakTypes/kayakAutocompleteTypes'
import type { KayakHotelSingleResponse } from '@/types/kayakTypes/kayakHotelTypes'

/**
 * Kayak place/hotel autocomplete
 * GET /curation/kayak/autocomplete/?search_term=...
 */
export const getKayakAutocomplete = async (
    searchTerm: string
): Promise<KayakAutocompleteResponse> => {
    const response = await apiClient.get<KayakAutocompleteResponse>('/curation/kayak/autocomplete/', {
        params: { search_term: searchTerm.trim() }
    })
    return response.data
}

/** Params for Kayak hotel single search. Required: hotel, user_track_id. */
export interface KayakHotelSingleParams {
    /** Required: entity key e.g. khotel:6099847 */
    hotel: string
    /** Required: user track id */
    user_track_id?: string
    check_in?: string
    check_out?: string
    rooms?: number
    adults?: number
    child_ages?: number[]
    language_code?: string
    currency_code?: string
    only_if_complete?: boolean
    /** e.g. "images,features" to get images and features in response */
    response_options?: string
}

const DEFAULT_HOTEL_SINGLE: Pick<KayakHotelSingleParams, 'user_track_id' | 'language_code' | 'currency_code'> = {
    user_track_id: 'default',
    language_code: 'en',
    currency_code: 'USD'
}

/**
 * Kayak hotel single search (autosuggest)
 * GET /curation/kayak/hotel/single/?hotel=<entity_key>&user_track_id=...
 */
export const getKayakHotelSingle = async (
    params: KayakHotelSingleParams
): Promise<KayakHotelSingleResponse> => {
    const merged = { ...DEFAULT_HOTEL_SINGLE, ...params }
    const userTrackId = merged.user_track_id ?? DEFAULT_HOTEL_SINGLE.user_track_id ?? 'default'
    const query: Record<string, string | number | boolean> = {
        hotel: merged.hotel,
        user_track_id: userTrackId
    }
    if (merged.check_in != null) query.check_in = merged.check_in
    if (merged.check_out != null) query.check_out = merged.check_out
    if (merged.rooms != null) query.rooms = merged.rooms
    if (merged.adults != null) query.adults = merged.adults
    if (merged.child_ages?.length) query.child_ages = merged.child_ages.join(',')
    if (merged.language_code != null) query.language_code = merged.language_code
    if (merged.currency_code != null) query.currency_code = merged.currency_code
    if (merged.only_if_complete != null) query.only_if_complete = merged.only_if_complete
    if (merged.response_options != null) query.response_options = merged.response_options

    const response = await apiClient.get<KayakHotelSingleResponse>('/curation/kayak/hotel/single/', {
        params: query
    })
    return response.data
}
