import { useQuery } from '@tanstack/react-query'
import { getCollectionExperiences } from '../api/collectionsAPI'
import { adaptCollectionExperiencesToCollections } from '../adapters/collectionsAdapter'
import { Collection } from '@/components/Collection/types'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

interface UseCollectionExperiencesParams {
    cityId: string | null
    sourceId?: string | null
    enabled?: boolean
}

interface UseCollectionExperiencesReturn {
    collections: Collection[]
    isLoading: boolean
    isError: boolean
    error: Error | null
}

export const useCollectionExperiences = ({ cityId, sourceId, enabled = true }: UseCollectionExperiencesParams): UseCollectionExperiencesReturn => {
    const {
        data: apiData,
        isLoading,
        isError,
        error
    } = useQuery({
        queryKey: ['collectionExperiences', cityId, sourceId],
        queryFn: () => getCollectionExperiences({ cityId: cityId!, sourceId: sourceId }),
        enabled: enabled && !!cityId,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Transform the API data to Collection format
    const collections = apiData ? adaptCollectionExperiencesToCollections(apiData) : []

    return {
        collections,
        isLoading,
        isError,
        error: error as Error | null
    }
}
