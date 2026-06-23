import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { OnboardingGuideResponse, OnboardingGuideUpdatePayload } from '../types/OnboardingType'

const BASE = `${API_CONFIG.BASE_URL}/api/onboarding`

// GET onboarding guide
export const getOnboardingGuide = async (): Promise<OnboardingGuideResponse> => {
    const response = await apiClient.get(`${BASE}/guide/`)
    return response.data
}

// UPDATE onboarding guide
export const updateOnboardingGuide = async (payload: OnboardingGuideUpdatePayload): Promise<OnboardingGuideResponse> => {
    const response = await apiClient.post(`${BASE}/guide/`, payload)
    return response.data
}
