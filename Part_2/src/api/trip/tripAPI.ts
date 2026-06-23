import { API_CONFIG } from '@/lib/api/apiConfig'
import apiClient from '@/lib/api/apiClient'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'

export type FinalDestinationCountriesCitiesResponse = {
    message: string
    response_code: string
    data: {
        id: string
        name: string
        final_destination_countries: {
            id: string
            name: string
            stamp_image_url: string
            tripboard_hero_image_url: string
        }[]
        final_destination_cities: {
            id: string
            name: string
            country: {
                id: string
                name: string
            }
        }[]
    }
}

export type UpdateTripDataResponse = {
    message: string
    response_code: string
    data: {
        trip_id: string
        updated_fields: {
            final_destination_countries?: string[]
            interested_destinations?: string[]
            group_type?: string
            travel_purpose?: string
            preferred_travel_time?: {
                is_fixed?: boolean
                start_date?: string
                end_date?: string
            }
            name?: string
        }
    }
}

export type UpdateTripData = {
    name?: string
    interested_destinations?: string[]
    final_destination_cities?: string[]
    group_type?: string
    travel_purpose?: string
    preferred_travel_time?: {
        is_fixed?: boolean
        start_date?: string
        end_date?: string
    }
    final_destination_countries?: string[]
    group_setup?: {
        adults: number
        children: number
        infants: number
        children_age?: number[]
        rooms?: Array<{ adults: number; children: number; child_ages: number[] }>
    }
    stay_budget_range?: {
        min: number
        max: number
        city_wise_preferences?: Record<string, { min: number; max: number }>
    } | null
}

export const updateTripPartial = async (tripId: string, data: UpdateTripData): Promise<UpdateTripDataResponse> => {
    // /api/trips/{trip_id}/patch/
    try {
        const response = await apiClient.patch(`${API_CONFIG.BASE_URL}/v2/trips/${tripId}/update/`, data)
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export const getFinalDestinationCountriesCities = async (tripId: string): Promise<FinalDestinationCountriesCitiesResponse> => {
    try {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/v2/trip/${tripId}/final-destinations/`)
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export type UpdateCityStayPreferencesResponse = {
    message: string
    response_code: string
    data?: unknown
}

export const updateCityStayPreferences = async (
    tripId: string,
    cityId: string,
    preferences: string[]
): Promise<UpdateCityStayPreferencesResponse> => {
    try {
        const response = await apiClient.patch(`${API_CONFIG.BASE_URL}/api/trips/${tripId}/cities/${cityId}/preferences/stays/`, { preferences })
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}
