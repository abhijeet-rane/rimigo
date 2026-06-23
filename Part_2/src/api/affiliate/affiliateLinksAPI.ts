import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

export const getAffiliateLinks = async (payload: any): Promise<any> => {
    const response = await apiClient.post(`${API_CONFIG.BASE_URL}/curation/v2/affiliate/links/`, payload)
    return response.data
}
