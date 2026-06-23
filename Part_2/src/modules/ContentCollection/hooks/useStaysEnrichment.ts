import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { getAccommodations } from '@/pages/Stays/Apis/accommodationsAPI'
import type { Accommodation } from '@/pages/Stays/Types/accommodationTypes'
import type { Section } from '../types/contentCollection'
import { groupStaysByCity } from '../utils/staysEnrichmentUtils'

interface UseStaysEnrichmentParams {
    sections: Section[]
    stayMetadataMap: Map<string, { zentrum_hub_id?: string; city_id?: string; kayak_hotel_id?: string }>
    checkIn: string
    checkOut: string
    travelPurpose: string
    groupType: string
    enabled: boolean
}

/**
 * Fetches enriched accommodation data (images, reviews, curated labels)
 * for saved stays grouped by city. Skips kayak-only stays.
 */
export function useStaysEnrichment({
    sections,
    stayMetadataMap,
    checkIn,
    checkOut,
    travelPurpose,
    groupType,
    enabled,
}: UseStaysEnrichmentParams) {
    const cityGroups = useMemo(
        () => (enabled ? groupStaysByCity(sections, stayMetadataMap) : new Map<string, string[]>()),
        [sections, stayMetadataMap, enabled]
    )
    const cityEntries = useMemo(() => Array.from(cityGroups.entries()), [cityGroups])
    const queries = useQueries({
        queries: cityEntries.map(([cityId, hubIds]) => ({
            queryKey: ['stays-enrichment', cityId, hubIds.sort().join(','), checkIn, checkOut],
            queryFn: async () => {
                const result = await getAccommodations({
                    cityId,
                    zentrum_hub_ids: hubIds,
                    travel_purpose: travelPurpose,
                    group_type: groupType,
                    check_in_date: checkIn,
                    check_out_date: checkOut,
                    // Backend's `_get_score_rankings` fallback crashes on empty
                    // `city_preferences` (`'str' object has no attribute 'value'`
                    // via `CurationUtils.get_default_preferences`). Send the
                    // standard default so the server stays on the happy path.
                    city_preferences: ['station_nearby', 'nightlife', 'city_center'],
                    include_hot_picks: true,
                    limit: hubIds.length,
                    page: 1,
                })
                return result.data?.data ?? []
            },
            enabled: enabled && hubIds.length > 0,
            staleTime: 24 * 60 * 60 * 1000,
            gcTime: 24 * 60 * 60 * 1000,
        })),
    })
    const enrichedStaysMap = useMemo(() => {
        const map = new Map<string, Accommodation>()
        for (const query of queries) {
            if (!query.data) continue
            for (const acc of query.data) {
                if (acc.zentrum_hub_id) {
                    map.set(acc.zentrum_hub_id, acc)
                }
            }
        }
        return map
    }, [queries])
    const isLoading = queries.some((q) => q.isLoading)
    return { enrichedStaysMap, isEnrichmentLoading: isLoading }
}
