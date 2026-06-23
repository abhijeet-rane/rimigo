import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

export const searchCountries = async (query: string) => {
    const queryParams = new URLSearchParams()
    if (query) {
        queryParams.append('q', query)
    }
    const queryString = queryParams.toString()
    const url = queryString
        ? `${API_CONFIG.BASE_URL}/curation/location-personalization/search/?${queryString}`
        : `${API_CONFIG.BASE_URL}/curation/location-personalization/live-countries/`

    const response = await apiClient.get(url)
    return response.data
}
