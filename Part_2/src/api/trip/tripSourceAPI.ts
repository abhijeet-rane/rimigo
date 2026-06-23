import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

export interface TripSource {
    full_name: string | null
    name: string
    has_media_content: boolean
    is_source_valid: boolean
    media: {
        instagram_username: string | null
        instagram_profile_url: string | null
        thumbnail_url: string | null
    }
}

export const getTripSourceByName = async (name: string): Promise<TripSource> => {
    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/api/trip-sources/by_name/?name=${name}`)
    return response.data
}
