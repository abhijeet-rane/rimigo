import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

export type GroupSetupRoom = {
    adults: number
    children: number
    child_ages: number[]
}

export type GroupSetup = {
    adults: number
    children: number
    infants: number
    children_age?: number[]
    /** Room-wise breakdown — preserved when the user edits rooms in the guests modal. */
    rooms?: GroupSetupRoom[]
}

export type UpdateTripPreferenceRequest = {
    accommodation_preferences?: {
        primary_type: string
        sub_type: string
    }[]
    experiences_preferences?: string[]
    group_setup?: GroupSetup
}

export type TripPreferencesResponse = {
    id: string
    accommodation_preferences?: {
        primary_type: string
        sub_type: string
    }[]
    experiences_preferences?: string[]
    group_setup?: GroupSetup
}

export const updateTripPreferences = async (tripId: string, data: UpdateTripPreferenceRequest): Promise<TripPreferencesResponse> => {
    try {
        const response = await apiClient.patch(`${API_CONFIG.BASE_URL}/api/trip-preferences/${tripId}/`, data)
        const responseData = response.data
        return responseData
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}
