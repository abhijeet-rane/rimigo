import { useQuery } from '@tanstack/react-query'
import { getCollectionExperiences } from '../api/collectionsAPI'
import { adaptCollectionExperiencesToCollections } from '../adapters/collectionsAdapter'
import { Collection } from '@/components/Collection/types'

interface UseCollectionExperiencesBySourceParams {
    sourceId: string | null
    enabled?: boolean
}

interface UseCollectionExperiencesBySourceReturn {
    collections: Collection[]
    isLoading: boolean
    isError: boolean
    error: Error | null
}

export const useCollectionExperiencesBySource = ({
    sourceId,
    enabled = true
}: UseCollectionExperiencesBySourceParams): UseCollectionExperiencesBySourceReturn => {
    const {
        data: apiData,
        isLoading,
        isError,
        error
    } = useQuery({
        queryKey: ['collectionExperiencesBySource', sourceId],
        queryFn: () => getCollectionExperiences({ sourceId: sourceId! }),
        enabled: enabled && !!sourceId
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
