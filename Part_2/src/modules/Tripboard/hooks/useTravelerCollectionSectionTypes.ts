import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { travelerCollectionApi } from '@/modules/ContentCollection/api/travelerCollectionApi'
import type { SectionType } from '@/modules/Tripboard/utils/tabArrangement'

/**
 * Fetches the section-types list for a traveler collection. Returns the array
 * in the order the API provides — downstream consumers (e.g. `buildBaseAllTabs`)
 * are responsible for any reordering or filtering.
 */
export function useTravelerCollectionSectionTypes(identifier: string | undefined) {
    const query = useQuery({
        queryKey: ['traveler-collection-section-types', identifier],
        queryFn: () => travelerCollectionApi.getSectionTypes(identifier!),
        enabled: !!identifier,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    const sectionTypes: SectionType[] = useMemo(
        () => query.data?.data ?? [],
        [query.data?.data]
    )

    return {
        sectionTypes,
        isLoading: query.isLoading,
        isError: query.isError,
        // `isLoading` is `isPending && isFetching`, which is briefly false in the tick
        // right after `identifier` resolves but before the fetch starts — long enough
        // for the tripboard's main render to leak through with an empty tab list.
        // `isFetched` only flips true once the query has actually settled, so callers
        // can hold their loading shell until tabs really exist.
        isFetched: query.isFetched
    }
}
