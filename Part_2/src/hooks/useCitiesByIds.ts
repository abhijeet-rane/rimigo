import { useQuery } from '@tanstack/react-query'
import { getCitiesByIds, type CityWithLocation } from '@/api/curation/locationPersonalizationAPI'
import { LOCATION_PERSONALIZATION_QUERY_KEYS } from './queryKeys'

const STALE_TIME_MS = 5 * 60 * 1000
const GC_TIME_MS = 24 * 60 * 60 * 1000

/**
 * Fetch cities with lat/long by IDs from location-personalization API (bulk).
 * Shared hook for itinerary map, content collection map, etc. Uses a common query key for cache sharing.
 */
export function useCitiesByIds(cityIds: string[]): {
    data: CityWithLocation[]
    isLoading: boolean
    isError: boolean
    error: Error | null
} {
    const { data = [], isLoading, isError, error } = useQuery({
        queryKey: LOCATION_PERSONALIZATION_QUERY_KEYS.citiesByIds(cityIds),
        queryFn: () => getCitiesByIds(cityIds),
        enabled: cityIds.length > 0,
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS
    })

    return {
        data,
        isLoading,
        isError,
        error: error as Error | null
    }
}
