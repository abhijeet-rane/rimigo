import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

export type PromptType = 'stays' | 'experiences'

export interface CityPromptRequestBody {
    start_date: string
    end_date: string
    group_setup: {
        adults: number
        children: number
        infants: number
        child_ages: number[]
    }
    group_type?: string
    purpose_type?: string
    location_preferences?: string[]
}

export interface CityPromptResult {
    floating_prompt_questions?: string[]
}

export type CityPromptStatus = 'queued' | 'processing' | 'in_progress' | 'completed' | 'failed' | string

export interface CityPromptResponse {
    request_id: string
    status: CityPromptStatus
    result?: CityPromptResult
}

export interface CityPromptAPIResponse {
    message: string
    response_code: string
    data: CityPromptResponse
}

export const fetchCityPrompts = async (citySlug: string, promptType: PromptType, payload: CityPromptRequestBody): Promise<CityPromptResponse> => {
    const endpoint = `${API_CONFIG.BASE_URL}/v1/cities/${citySlug}/${promptType}/prompts/`
    const response = await apiClient.post<CityPromptAPIResponse>(endpoint, payload)
    return response.data.data
}
