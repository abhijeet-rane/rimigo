import apiClient from '@/lib/api/apiClient'
import { GetATAByAgentIdResponse } from './types/getATAByAgentIdTypes'

interface SpaceAgentResponse {
    success: boolean
    data: {
        space: string
        agent_id: string
        success: boolean
    }
}

/**
 * Get agent ID for a given space
 * @param spaceId - Space identifier (e.g., 'experience_expert_chat', 'hotel_expert_chat', 'stays_list')
 * @returns Promise with agent ID
 */
export const getAgentBySpace = async (spaceId: string): Promise<string> => {
    try {
        const response = await apiClient.get<SpaceAgentResponse>(`/api/spaces/${spaceId}/agent/`)

        // Handle different response structures
        const responseData = response.data
        let agentId: string | undefined

        if (responseData.success && responseData.data?.agent_id) {
            agentId = responseData.data.agent_id
        } else if ((responseData as any).data?.agent_id) {
            // Handle case where response structure might be different
            agentId = (responseData as any).data.agent_id
        } else if ((responseData as any).agent_id) {
            // Handle direct agent_id in response
            agentId = (responseData as any).agent_id
        }

        if (agentId) {
            return agentId
        }

        throw new Error('Invalid response format: agent_id not found')
    } catch (error: any) {
        if (error.response?.data?.error?.message) {
            throw new Error(error.response.data.error.message)
        }
        if (error.message) {
            throw error
        }
        throw new Error('Failed to fetch agent ID')
    }
}

// Hotel-specific input data (for backwards compatibility)
interface ATAInputData {
    city_id: string
    check_in: string
    check_out: string
    group_type: string
    purpose_type: string
    user_text_input: string
    location_preference?: string
    /** UUIDs of completed Tripboard AI Assistant attachments. */
    attachment_ids?: string[]
}

// Generic input data that can accept any fields
type GenericATAInputData = Record<string, any>

interface ATARequest {
    input_data: ATAInputData | GenericATAInputData // Support both strict and flexible types
    space: string
    trip_id?: string | null
    thread_id?: string | null
    entity_type?: string | null
    entity_id?: string | null
    source?: string | null
}

interface ATAResponse {
    // Define response structure as needed
    status: string
    data?: any
    message?: string
}

interface Thread {
    id: string
    title: string
    summary: string | null
    agent_id: string
    trip_id: string | null
    user_id: string | null
    created_at: string
    updated_at: string
    metadata: Record<string, any>
}

interface Pagination {
    page: number
    total_pages: number
    count: number
    limit: number
    offset: number
}

interface ThreadsResponse {
    message: string
    response_code: string
    data: {
        data: Thread[]
        pagination: Pagination
    }
}

interface HotelResult {
    hotel_name: string
    city: string
    explanation: string
    tags: Array<{ label: string; value: boolean }>
    match_percentage: number
    remark: {
        remark_type: string
        remark_description: string
    }
    zentrum_hub_id: string
    total_rate: number
    overall_score: number
    platform_reviews: Array<{
        platform: string
        review_count: number
        rating: number
        url: string
        logo_url: string
    }>
    location_tags: string[]
    is_traveler_shortlisted: boolean
    accommodation_id: string
    images: string[]
}

interface Interaction {
    id: string
    agent_id: string
    thread_id: string
    trip_id: string | null
    user_id: string | null
    space: string
    input_data: {
        city_id: string
        check_in: string
        check_out: string
        group_type: string
        purpose_type: string
        user_text_input: string
        location_preference?: string
        budget_range?: any
    }
    output_data?: {
        assistant_id?: string
        thread_id?: string
        run_id?: string
        status?: string
        city_id?: string
        check_in?: string
        check_out?: string
        results?: HotelResult[]
        output_type: string
    }
    output_status: 'queued' | 'in_progress' | 'completed' | 'failed'
    metadata: Record<string, any>
    created_at: string
    updated_at: string
    type: string
    sub_type: string
}

interface InteractionsResponse {
    message: string
    response_code: string
    data: {
        data: Interaction[]
        pagination: Pagination
    }
}

/**
 * Call the ATA (AI Travel Assistant) API
 * @param ataId - The ATA ID in the URL path (e.g., "68fb4e6115945877470c1d0e")
 * @param requestData - The request payload
 * @returns Promise with the API response
 */
export const callATAApi = async (ataId: string, requestData: ATARequest): Promise<ATAResponse> => {
    try {
        const response = await apiClient.post(`/api/ata/${ataId}/`, requestData)
        return response.data
    } catch (error: any) {
        console.error('ATA API Error:', error)
        throw error
    }
}

/**
 * Fetch all threads for a given agent
 * @param agentId - The agent ID
 * @param limit - Number of threads to fetch (default: 10)
 * @param entityId - Optional entity ID to filter threads
 * @param entityType - Optional entity type to filter threads
 * @param tripId - Optional trip_id query filter
 * @returns Promise with threads response
 */
export const fetchThreads = async (
    agentId: string,
    limit: number = 10,
    entityId?: string,
    entityType?: string,
    tripId?: string
): Promise<ThreadsResponse> => {
    try {
        const params: any = {
            limit
        }

        // Add entity filters if provided
        if (entityId) {
            params['entity_id'] = entityId
        }
        if (entityType) {
            params['entity_type'] = entityType
        }
        if (tripId) {
            params['trip_id'] = tripId
        }

        const response = await apiClient.get(`/api/ata/${agentId}/threads/`, {
            params
        })
        return response.data
    } catch (error: any) {
        console.error('Fetch Threads Error:', error)
        throw error
    }
}

/**
 * Fetch interactions for a specific thread
 * @param agentId - The agent ID
 * @param threadId - The thread ID
 * @returns Promise with interactions response
 */
export const fetchInteractions = async (agentId: string, threadId: string): Promise<InteractionsResponse> => {
    try {
        const response = await apiClient.get(`/api/ata/${agentId}/threads/${threadId}/interactions/`)
        return response.data
    } catch (error: any) {
        console.error('Fetch Interactions Error:', error)
        throw error
    }
}

/**
 * Fetch a single interaction by id
 */
export const fetchInteraction = async (agentId: string, threadId: string, interactionId: string): Promise<Interaction> => {
    try {
        const response = await apiClient.get(`/api/ata/${agentId}/threads/${threadId}/interactions/${interactionId}/`)
        // Normalize wrapped responses; support { data: { interaction: {...} } }
        const payload = response.data
        const interaction = payload?.data?.interaction ?? payload?.interaction ?? payload?.data?.data ?? payload?.data ?? payload
        return interaction as Interaction
    } catch (error: any) {
        console.error('Fetch Interaction Error:', error)
        throw error
    }
}

/*
 * Get agent by id
 * @param agentId - The agent ID
 * @returns Promise with agent response
 */
export const getAgentById = async (agentId: string): Promise<GetATAByAgentIdResponse | null> => {
    try {
        // api/ata-agents/
        const response = await apiClient.get(`/api/ata-agents/${agentId}/`)
        return response.data as GetATAByAgentIdResponse
    } catch (error: any) {
        throw new Error('Failed to fetch agent by id: ' + error.message)
    }
}

export type { ATAInputData, ATARequest, ATAResponse, Thread, ThreadsResponse, Interaction, InteractionsResponse, HotelResult }
