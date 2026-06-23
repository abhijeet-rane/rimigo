import apiClient from '@/lib/api/apiClient'
import type { ATAFeaturesResponse, ATAFeature, CategoryInfo } from './types/featuresTypes'
import { toast } from 'sonner'

export interface ATAFeaturesResult {
    features: ATAFeature[]
    categoryInfo: Record<string, CategoryInfo>
}

/**
 * Fetch all features from the ATA features endpoint
 * @param countryId - Optional country ID to filter features
 * @returns Promise with features array and category info
 */
export const getATAFeatures = async (countryId?: string): Promise<ATAFeaturesResult> => {
    try {
        const params: Record<string, string> = {}
        if (countryId) {
            params.country_id = countryId
        }

        const response = await apiClient.get<ATAFeaturesResponse>('/v1/ata/features/', {
            params
        })

        let features: ATAFeature[] = []
        let categoryInfo: Record<string, CategoryInfo> = {}

        // Handle nested data structure: response.data.data.data
        if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
            features = response.data.data.data
            categoryInfo = response.data.data.category_info || {}
        } else if (Array.isArray(response.data?.data)) {
        // Fallback: try direct data access
            features = response.data.data
            categoryInfo = {}
        } else {
        toast.error('Unexpected API response structure:')
            return { features: [], categoryInfo: {} }
        }

        return { features, categoryInfo }
    } catch (error: any) {
        toast.error('Get ATA Features Error:', error)
        // Return empty array on error to allow graceful fallback
        return { features: [], categoryInfo: {} }
    }
}

interface AgentThreadRequest {
    agent_id: string
    entity_id: string | null
}

interface AgentThreadResponse {
    id: string
    title: string
    user_id: string
    agent_id: string
    entity_id: string | null
    entity_type: string | null
}


interface AgentsThreadsResponse {
    message: string
    response_code: string
    data: Record<string, AgentThreadResponse | null>
}

/**
 * Fetch latest thread IDs for given agents
 * @param agents - Array of agents with agent_id and entity_id
 * @returns Promise with thread IDs mapped by agent_id
 */
export const getAgentsThreads = async (agents: AgentThreadRequest[]): Promise<AgentsThreadsResponse> => {
    const response = await apiClient.post<AgentsThreadsResponse>('/api/ata/agents-threads/', {
        agents
    })
    return response.data
}

