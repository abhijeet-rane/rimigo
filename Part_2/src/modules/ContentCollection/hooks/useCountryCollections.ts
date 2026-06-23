import { useQuery } from '@tanstack/react-query'
import { contentCollectionApi, type CollectionListItem } from '@/modules/ContentCollection/api/contentCollectionApi'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

interface UseCountryCollectionsResult {
    collections: CollectionListItem[]
    isLoading: boolean
    isError: boolean
}

/**
 * Curated creator-collection list scoped to a trip's countries.
 * Multi-country → one request (BE accepts comma-joined `country_ids`).
 * Disabled when no countries.
 */
export function useCountryCollections(countryIds: string[]): UseCountryCollectionsResult {
    // Sort so set-reorderings don't bust the cache.
    const stableKey = [...countryIds].sort().join(',')

    const { data, isLoading, isError } = useQuery({
        queryKey: ['country-collections', stableKey],
        queryFn: () =>
            contentCollectionApi.getCollectionList({
                country_ids: countryIds,
            }),
        enabled: countryIds.length > 0,
        staleTime: HOURS_24,
        gcTime: HOURS_24,
    })

    return {
        collections: data?.data ?? [],
        isLoading,
        isError,
    }
}
