import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { ExperiencePreferenceAPIResponse } from '../adapters/experiencePreferenceAdapters'

export const getTripExperienceType = async (tripId: string): Promise<ExperiencePreferenceAPIResponse[]> => {
    const response = await apiClient.get(
        `${API_CONFIG.BASE_URL}/api/trip-preferences/get_experience_categories_for_trip_preferences/?trip_id=${tripId}`
    )
    return response.data
}
