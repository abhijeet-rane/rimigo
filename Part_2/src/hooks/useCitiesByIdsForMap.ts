import { useQuery } from '@tanstack/react-query'
import { getCitiesByIdsForMap, type CityForMap } from '@/api/curation/locationPersonalizationAPI'
import { LOCATION_PERSONALIZATION_QUERY_KEYS } from './queryKeys'

const STALE_TIME_MS = 5 * 60 * 1000
const GC_TIME_MS = 24 * 60 * 60 * 1000

/**
 * Fetch cities with lat/long and city_thumbnail_url by IDs from location-personalization map endpoint.
 * Use for map display only (itinerary map, content collection map, etc.).
 */
export function useCitiesByIdsForMap(cityIds: string[]): {
    data: CityForMap[]
    isLoading: boolean
    isError: boolean
    error: Error | null
} {
    const { data = [], isLoading, isError, error } = useQuery({
        queryKey: LOCATION_PERSONALIZATION_QUERY_KEYS.citiesByIdsForMap(cityIds),
        queryFn: () => getCitiesByIdsForMap(cityIds),
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
