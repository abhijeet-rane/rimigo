import type { RedirectionAction, APIAction, ATAFeature, FeatureAction } from '@/api/ataAPI/types/featuresTypes'
import { callATAApi } from '@/api/ataAPI/ataApi'
import { getAgentsThreads } from '@/api/ataAPI/featuresAPI'
import { toast } from 'sonner'

/**
 * Infer space from entity category
 */
const inferSpaceFromEntityCategory = (category?: string): string => {
    if (!category) return 'feature_prompt'

    const categoryLower = category.toLowerCase()
    if (categoryLower.includes('stay') || categoryLower === 'stays') {
        return 'stays_list'
    }
    if (categoryLower.includes('experience') || categoryLower === 'experiences') {
        return 'experience_expert_chat'
    }
    if (categoryLower.includes('hotel')) {
        return 'hotel_expert_chat'
    }
    if (categoryLower.includes('transport')) {
        return 'transport_expert_chat'
    }
    return 'feature_prompt'
}

/**
 * Build navigation path from redirection action
 * Handles path params and query params from the action
 */
export const buildNavigationPath = (redirection: RedirectionAction): string => {
    if (!redirection.path) {
        return '#'
    }

    let path = redirection.path

    // Handle path_params - append values directly to path (ignore keys)
    const pathParamValues = Object.values(redirection.path_params).filter(Boolean)
    if (pathParamValues.length > 0) {
        // Append path params to the path (e.g., /experiences -> /experiences/6815a300e8ab27cae1a48e81)
        path = `${path}/${pathParamValues.join('/')}`
    }

    // Build query params from query_params only
    const queryParams = new URLSearchParams()
    Object.entries(redirection.query_params).forEach(([key, value]) => {
        if (value) {
            queryParams.set(key, value)
        }
    })

    // Build final path with query string
    const queryString = queryParams.toString()
    return queryString ? `${path}?${queryString}` : path
}

/**
 * Build navigation path from action object (for use in components)
 * Legacy support for old structure
 */
export const buildPathFromAction = (action: {
    path: string | null
    path_params: Record<string, string>
    query_params: Record<string, string>
}): string => {
    return buildNavigationPath(action as RedirectionAction)
}

/**
 * Handle redirection action
 */
export const handleRedirection = (redirection: RedirectionAction): void => {
    const path = buildNavigationPath(redirection)
    // Open in new tab to match behavior of tile clicks
    window.open(path, '_blank')
}

interface AgentThreadData {
    id: string | null
    entity_type: string | null
}

/**
 * Handle API action (firePrompt)
 * Uses pre-fetched thread data instead of making API call
 * Supports both new structure (agent, prompt directly) and legacy structure (input_data)
 */
export const handleAPIAction = async (
    apiAction: APIAction | FeatureAction,
    feature: ATAFeature,
    tripId?: string | null,
    getThreadData?: (agentId: string, entityId: string | null) => AgentThreadData | null
): Promise<void> => {
    // Support new structure (agent and prompt directly)
    let agentId: string | undefined
    let prompt: string | undefined

    if ('agent' in apiAction && 'prompt' in apiAction) {
        // New structure
        agentId = apiAction.agent
        prompt = apiAction.prompt
    } else if ('input_data' in apiAction && apiAction.input_data) {
        // Legacy structure
        agentId = apiAction.input_data.agent_id
        prompt = apiAction.input_data.prompt
    }

    if (!agentId || !prompt) {
        toast.warning('Invalid firePrompt action: missing agent or prompt')
        return
    }

    const entityId = feature.entity?.id || null

    try {
        // Step 1: Get thread_id from pre-fetched data (or fallback to API call if not available)
        let threadId: string | null = null
        let entityType: string | null = null

        if (getThreadData) {
            // Use pre-fetched thread data
            const threadData = getThreadData(agentId, entityId)
            threadId = threadData?.id || null
            entityType = threadData?.entity_type || (feature.entity?.category ? `${feature.entity.category}_id` : null)
        } else {
            // Fallback: fetch from API (should not happen in normal flow)
            const threadsResponse = await getAgentsThreads([
                {
                    agent_id: agentId,
                    entity_id: entityId
                }
            ])
            const threadData = threadsResponse.data[agentId]
            threadId = threadData?.id || null
            entityType = threadData?.entity_type || (feature.entity?.category ? `${feature.entity.category}_id` : null)
        }

        // Step 2: Infer space from entity category
        const space = inferSpaceFromEntityCategory(feature.entity?.category)

        // Step 4: Prepare input_data for ATA API
        // Use 'question' for chat-based prompts, 'user_text_input' for search-based
        const inputData: Record<string, any> = {
            question: prompt
        }

        // Add entity_id to input_data if available
        // Use entity_type field name if available, otherwise infer from category
        if (entityId && entityType) {
            // Extract field name from entity_type (e.g., "experience_id" -> "experience_id")
            inputData[entityType] = entityId
        } else if (entityId && feature.entity?.category) {
            // Fallback: use category to construct field name
            inputData[`${feature.entity.category}_id`] = entityId
        }

        // Step 5: Prepare request data similar to AIAssistantWindow
        const requestData = {
            input_data: inputData,
            space,
            trip_id: tripId || null,
            thread_id: threadId,
            entity_type: entityType,
            entity_id: entityId,
            interaction_id: undefined
        }

        // Step 6: Call ATA API
        await callATAApi(agentId, requestData)

        toast.success('Request sent successfully!')
    } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to send request. Please try again.')
    }
}

/**
 * Handle feature actions array - processes all actions in order
 * Executes firePrompt actions first, then handles redirection
 */
export const handleFeatureActions = async (
    actions: FeatureAction[],
    feature: ATAFeature,
    tripId?: string | null,
    getThreadData?: (agentId: string, entityId: string | null) => AgentThreadData | null
): Promise<void> => {
    // Separate actions by type
    const firePromptActions = actions.filter((a) => a.type === 'firePrompt')
    const redirectionAction = actions.find((a) => a.type === 'redirection')

    // Execute all firePrompt actions first
    if (firePromptActions.length > 0) {
        const firePromptPromises = firePromptActions.map((action) => handleAPIAction(action, feature, tripId, getThreadData))
        // Execute all firePrompt actions in parallel, but don't block on them
        Promise.all(firePromptPromises).catch((error) => {
            toast.error(error?.response?.data?.message || 'Failed to send request. Please try again.')
        })
        // Give the API calls a moment to initiate before navigation
        await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Handle redirection if available
    if (redirectionAction && redirectionAction.path) {
        handleRedirection(redirectionAction as RedirectionAction)
    }
}

/**
 * Handle feature action - supports both new and legacy structures
 * @deprecated Use handleFeatureActions for new structure
 */
export const handleFeatureAction = async (action: any, feature?: ATAFeature, tripId?: string | null): Promise<void> => {
    if (action.type === 'redirection' || action.path) {
        handleRedirection(action as RedirectionAction)
    } else if (action.type === 'firePrompt' && feature) {
        await handleAPIAction(action as APIAction, feature, tripId)
    }
}
