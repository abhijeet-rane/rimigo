import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getKayakAutocomplete } from '@/api/kayak/kayakHotelApi'
import type {
    KayakAutocompleteResponse,
    KayakAutocompleteResultItem,
    KayakPrimaryPlaceType
} from '@/types/kayakTypes/kayakAutocompleteTypes'

export interface UseKayakHotelAPIOptions {
    searchTerm: string | null
    enabled?: boolean
    /** When set, filteredResults will only include items with these primaryPlaceTypes */
    filterByTypes?: KayakPrimaryPlaceType[]
}

export interface UseKayakHotelAPIResult {
    /** Full API response (message, response_code, data) */
    fullResponse: KayakAutocompleteResponse | undefined
    /** data.results - all results from API */
    results: KayakAutocompleteResultItem[]
    /** Filtered by filterByTypes if provided, otherwise same as results */
    filteredResults: KayakAutocompleteResultItem[]
    /** Get results for a single type (reusable helper) */
    getResultsByType: (type: KayakPrimaryPlaceType) => KayakAutocompleteResultItem[]
    isLoading: boolean
    isFetched: boolean
    refetch: () => void
}

export function useKayakHotelAPI({
    searchTerm,
    enabled = true,
    filterByTypes
}: UseKayakHotelAPIOptions): UseKayakHotelAPIResult {
    const { data: fullResponse, isLoading, isFetched, refetch } = useQuery({
        queryKey: ['kayak-autocomplete', searchTerm],
        queryFn: () => getKayakAutocomplete(searchTerm ?? ''),
        enabled: enabled && searchTerm !== null && searchTerm.trim() !== '',
        staleTime: 60 * 1000
    })

    const results = useMemo(
        () => fullResponse?.data?.results ?? [],
        [fullResponse]
    )

    const filteredResults = useMemo(() => {
        if (!filterByTypes || filterByTypes.length === 0) return results
        return results.filter((r) => filterByTypes.includes(r.primaryPlaceType))
    }, [results, filterByTypes])

    const getResultsByType = useMemo(
        () => (type: KayakPrimaryPlaceType) =>
            results.filter((r) => r.primaryPlaceType === type),
        [results]
    )

    return {
        fullResponse,
        results,
        filteredResults,
        getResultsByType,
        isLoading,
        isFetched,
        refetch
    }
}
