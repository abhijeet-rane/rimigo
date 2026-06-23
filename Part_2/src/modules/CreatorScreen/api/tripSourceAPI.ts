import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { ITripSourceResponse } from '@/types/tripSourceTypes/tripsSourceTypes'

export const getTripSourceByName = async (name: string): Promise<ITripSourceResponse> => {
    try {
        const response = await apiClient.post(`${API_CONFIG.BASE_URL}/api/trip-sources/name/`, { name })
        if (!response.data) {
            throw new Error(ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        }
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}
