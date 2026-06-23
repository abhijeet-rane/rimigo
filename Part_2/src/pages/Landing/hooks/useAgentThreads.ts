import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAgentsThreads } from '@/api/ataAPI/featuresAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import type { ATAFeature } from '@/api/ataAPI/types/featuresTypes'

interface AgentThreadRequest {
    agent_id: string
    entity_id: string | null
}

interface AgentThreadData {
    id: string | null
    entity_type: string | null
}

/**
 * Extract unique (agent_id, entity_id) pairs from features that have firePrompt actions
 */
const extractAgentEntityPairs = (features: ATAFeature[]): AgentThreadRequest[] => {
    const pairs = new Map<string, AgentThreadRequest>()

    features.forEach((feature) => {
        // Check new actions array structure
        if (feature.card_props.actions) {
            feature.card_props.actions.forEach((action) => {
                if (action.type === 'firePrompt' && action.agent) {
                    const entityId = feature.entity?.id || null
                    const key = `${action.agent}:${entityId || 'null'}`
                    
                    if (!pairs.has(key)) {
                        pairs.set(key, {
                            agent_id: action.agent,
                            entity_id: entityId
                        })
                    }
                }
            })
        }

        // Check legacy api_actions structure
        if (feature.card_props.api_actions) {
            feature.card_props.api_actions.forEach((action) => {
                if (action.type === 'firePrompt' && action.input_data?.agent_id) {
                    const entityId = feature.entity?.id || null
                    const key = `${action.input_data.agent_id}:${entityId || 'null'}`
                    
                    if (!pairs.has(key)) {
                        pairs.set(key, {
                            agent_id: action.input_data.agent_id,
                            entity_id: entityId
                        })
                    }
                }
            })
        }
    })

    return Array.from(pairs.values())
}

interface UseAgentThreadsParams {
    features: ATAFeature[]
    enabled?: boolean
}

interface UseAgentThreadsReturn {
    getThreadData: (agentId: string, entityId: string | null) => AgentThreadData | null
    isLoading: boolean
    error: Error | null
}

/**
 * React Query hook to fetch agent thread IDs in batch
 * Extracts all unique (agent_id, entity_id) pairs from features and fetches thread IDs
 * Returns a lookup function to get thread data by agent_id and entity_id
 */
export const useAgentThreads = ({
    features,
    enabled = true
}: UseAgentThreadsParams): UseAgentThreadsReturn => {
    // Extract unique agent-entity pairs
    const agentEntityPairs = React.useMemo(() => {
        return extractAgentEntityPairs(features)
    }, [features])

    // Fetch thread IDs for all agents in a single batch call
    const { data: threadsResponse, isLoading, error } = useQuery({
        queryKey: ['agentThreads', agentEntityPairs.map(p => `${p.agent_id}:${p.entity_id || 'null'}`).sort().join(',')],
        queryFn: () => getAgentsThreads(agentEntityPairs),
        enabled: enabled && agentEntityPairs.length > 0,
        staleTime: HOURS_24,
        retry: 1
    })

    // Create a map from (agent_id, entity_id) to thread data
    const threadDataMap = React.useMemo(() => {
        const map = new Map<string, AgentThreadData>()
        
        if (!threadsResponse?.data || !agentEntityPairs.length) {
            return map
        }

        // For each request we made, map it to the response
        agentEntityPairs.forEach((request) => {
            const threadData = threadsResponse.data[request.agent_id]
            
            if (threadData) {
                // Store by the combination we requested
                // If entity_id is present, store as "agent_id:entity_id"
                // If entity_id is null, store as "agent_id"
                const key = request.entity_id 
                    ? `${request.agent_id}:${request.entity_id}`
                    : request.agent_id
                
                map.set(key, {
                    id: threadData.id || null,
                    entity_type: threadData.entity_type || null
                })
            }
        })

        return map
    }, [threadsResponse, agentEntityPairs])

    // Create lookup function
    const getThreadData = React.useCallback(
        (agentId: string, entityId: string | null): AgentThreadData | null => {
            // Create lookup key: use combination if entity_id exists, otherwise just agent_id
            const key = entityId ? `${agentId}:${entityId}` : agentId
            return threadDataMap.get(key) || null
        },
        [threadDataMap]
    )

    return {
        getThreadData,
        isLoading,
        error: error as Error | null
    }
}

