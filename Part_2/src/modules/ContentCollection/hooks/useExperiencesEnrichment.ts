import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getExperiencesByIds, type EnrichedExperience } from '@/modules/Experiences/api/experienceBatchAPI'

interface UseExperiencesEnrichmentParams {
    /**
     * Flat list of experience ids to enrich. Callers should pass the UNION of
     * section-derived ids and itinerary-slot-derived ids so both the
     * Shortlisted and "In your itinerary" Activities views resolve to enriched
     * card data via the same map.
     */
    experienceIds: string[]
    /**
     * Tab-level gate. Parent should pass
     * `activeTab === 'experience' || activeTab === 'stays'` so experience
     * markers + cards show on the Activities tab AND on the Stays tab
     * (stays tab maps activities alongside hotels). Other tabs skip the
     * fetch.
     */
    enabled: boolean
}

interface UseExperiencesEnrichmentReturn {
    enrichedExperiencesMap: Map<string, EnrichedExperience>
    isEnrichmentLoading: boolean
}

/**
 * Batch-fetch card-shape experience data for every experience id passed in.
 * Mirrors the shape of `useStaysEnrichment` — a single React Query keyed on
 * the sorted list of ids. Sancus + repo cache both benefit from the sorted
 * key.
 *
 * The adapter (`resolveExperienceCardData`) reads from this map; section
 * metadata only supplies per-collection state (start_date / end_date / title).
 */
export function useExperiencesEnrichment({ experienceIds, enabled }: UseExperiencesEnrichmentParams): UseExperiencesEnrichmentReturn {
    const normalizedIds = useMemo(() => {
        const ids: string[] = []
        for (const id of experienceIds) {
            if (id && typeof id === 'string') ids.push(id)
        }
        // Sort + dedupe here so the query key is stable across render-order
        // churn; the API client sorts again defensively.
        return Array.from(new Set(ids)).sort()
    }, [experienceIds])

    const query = useQuery({
        queryKey: ['experiences-batch', normalizedIds.join(',')],
        queryFn: () => getExperiencesByIds(normalizedIds),
        enabled: enabled && normalizedIds.length > 0,
        staleTime: 5 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000
    })

    const enrichedExperiencesMap = useMemo(() => {
        const map = new Map<string, EnrichedExperience>()
        const items = query.data ?? []
        for (const exp of items) {
            if (exp.id) map.set(exp.id, exp)
        }
        return map
    }, [query.data])

    return {
        enrichedExperiencesMap,
        isEnrichmentLoading: query.isLoading
    }
}
