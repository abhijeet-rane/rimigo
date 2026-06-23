// src/lib/api/requestAccommodationDeal.ts

import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { LocationPersonalizationCityResponse } from '../../Types/locationPersonalizationCityResponse'

export interface RequestDealAccommodationPayload {
    check_in: string
    check_out: string
    adults: number
    children: number
    child_ages: number[]
    zentrum_hub_id: string
    hotel_name: string
    currency: string
    city: string
    trip_id: string
    occupancies?: Array<{ numOfAdults: number; childAges: number[] }>
}

export const getLocationPersonalizationCity = async (cityId: string): Promise<LocationPersonalizationCityResponse> => {
    if (!cityId) {
        throw new Error('cityId is required')
    }

    try {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/location-personalization-cities/by_city/?city_id=${cityId}`)
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}
export interface RequestDealAccommodationResponse {
    status: string
    message: string
    hotel_search_request_id: string
    flow_type: string
}

export const requestAccommodationDeal = async (payload: RequestDealAccommodationPayload): Promise<RequestDealAccommodationResponse> => {
    const response = await apiClient.post<RequestDealAccommodationResponse>(
        `${API_CONFIG.BASE_URL}/api/hotel-deal-requests/request_accommodation_deal_progressive/`,
        payload
    )

    return response.data
}
export interface GetAccommodationDealResultResponse {
    deal_request_status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'PARTIAL' | 'COMPLETED' | 'ERROR'
    request_deal_response?: {
        filters?: Record<string, any>
        room_types?: Record<string, any>
    }
}

export const getAccommodationDealResult = async (hotelSearchRequestId: string): Promise<GetAccommodationDealResultResponse> => {
    const response = await apiClient.get<GetAccommodationDealResultResponse>(
        `${API_CONFIG.BASE_URL}/api/hotel-search-requests/get_accommodation_deal_result/`,
        {
            params: { hotel_search_request_id: hotelSearchRequestId }
        }
    )

    return response.data
}
