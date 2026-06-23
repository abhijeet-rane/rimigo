import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAgentById, type Interaction } from '@/api/ataAPI/ataApi'

interface FeatureCarrier {
    feature?: {
        name?: string | null
    }
}

interface ResultFeatureCarrier extends FeatureCarrier {
    result?: FeatureCarrier
}

const extractFeatureName = (interaction?: Interaction | null): string | null => {
    if (!interaction) {
        return null
    }

    const inputFeature = (interaction.input_data as FeatureCarrier | undefined)?.feature?.name
    if (inputFeature) {
        return inputFeature
    }

    const outputData = interaction.output_data as ResultFeatureCarrier | undefined
    const directFeature = outputData?.feature?.name
    if (directFeature) {
        return directFeature
    }

    const resultFeature = outputData?.result?.feature?.name
    return resultFeature ?? null
}

interface UseAtaAgentDetailsParams {
    ataId?: string
    currentInteraction?: Interaction | null
}

export const useAtaAgentDetails = ({ ataId, currentInteraction }: UseAtaAgentDetailsParams) => {
    const {
        data: agent,
        isLoading,
        isFetching,
        error,
        refetch
    } = useQuery({
        queryKey: ['agentById', ataId],
        queryFn: () => getAgentById(ataId as string),
        enabled: Boolean(ataId)
    })

    const agentDisplayName = useMemo(() => {
        return agent?.display_name ?? null
    }, [agent?.display_name])

    // icon url
    const agentIconUrl = useMemo(() => {
        return agent?.icon_url ?? null
    }, [agent?.icon_url])

    // placeholder questions for experience agent

    const featureNameFromInteraction = useMemo(() => extractFeatureName(currentInteraction), [currentInteraction])

    const fallbackAgentFeatureName = useMemo(() => {
        return agent?.features?.find((featureItem) => typeof featureItem?.name === 'string')?.name ?? null
    }, [agent?.features])

    const activeFeatureName = featureNameFromInteraction ?? fallbackAgentFeatureName ?? null

    // features
    const features = useMemo(() => {
        return agent?.features ?? null
    }, [agent?.features])

    return {
        agent,
        isLoading,
        isFetching,
        error,
        refetch,
        agentDisplayName,
        activeFeatureName,
        featureNameFromInteraction,
        fallbackAgentFeatureName,
        agentIconUrl,
        features
    }
}
