import { useQuery } from '@tanstack/react-query'
import { contentCollectionApi } from '../api/contentCollectionApi'
import type { ContentCollection } from '../types/contentCollection'

interface UseCollectionsByTripIdReturn {
    collections: ContentCollection[]
    isLoading: boolean
    isError: boolean
    hasCollections: boolean
}

/**
 * Hook to fetch collections by trip ID
 * @param tripId - The trip ID to fetch collections for
 * @param enabled - Whether the query should be enabled (defaults to true if tripId exists)
 */
export const useCollectionsByTripId = (
    tripId: string | null | undefined,
    enabled?: boolean
): UseCollectionsByTripIdReturn => {
    const { data: collectionsData, isLoading, isError } = useQuery({
        queryKey: ['collections-by-trip-id', tripId],
        queryFn: () => {
            if (!tripId) {
                throw new Error('Trip ID is required')
            }
            return contentCollectionApi.getCollectionsByTripId(tripId)
        },
        enabled: enabled !== undefined ? enabled : !!tripId
    })

    const collections = collectionsData?.data || []
    const hasCollections = collections.length > 0

    return {
        collections,
        isLoading,
        isError,
        hasCollections
    }
}

