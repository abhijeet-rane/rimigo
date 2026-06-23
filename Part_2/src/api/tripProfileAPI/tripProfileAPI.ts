import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

export type UpdateTripProfileData = {
    group_type?: string
    trip_profile_id?: string
    budget_range?: 'low' | 'medium' | 'high'
    travel_purpose?: string
    preferred_travel_time?: {
        is_fixed: boolean
        startDate: string
        endDate: string
        year?: number | null
        months?: string[] | null
    }
    traveler_preferences?: {
        planning_start_preference?: string
        booked_items?: string[] | null | undefined
    }
}

export const updateTripProfilePartial = async (tripProfileId: string, data: UpdateTripProfileData) => {
    try {
        const response = await apiClient.patch(`${API_CONFIG.BASE_URL}/api/trip-profiles/${tripProfileId}/`, data)
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}
