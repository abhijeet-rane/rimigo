import { useQuery } from '@tanstack/react-query'
import { getToursForExperience, getTourDataStatus } from '../api/toursAPI'
import { ToursResponseType } from '../types/toursResponseTypes'
import { adaptToursToUI } from '../adapters'
import { AdaptedTourResponseType } from '../types/toursResponseTypes'
import { useEffect, useMemo, useState } from 'react'
import { FIVE_MINUTES, HOURS_24 } from '@/constants/commons/tanstackConstants'
import {
    useCollectionId,
    usePersonalRecommendationsMap,
    buildPersonalRecommendationKey
} from '@/modules/Tripboard/context/TripCollectionRecommendationsContext'
import { useBatchTourLiveData } from './useBatchTourLiveData'
import { useScopedTourLiveData } from './TourLiveDataBatchScope'
import { extractPlatformRatings, mergeTourWithLiveData, type PlatformRating } from '../utils/tourLiveDataMerge'

export type { PlatformRating }

/**
 * Hook to fetch tours for an experience and extract platform ratings
 * For public users (isPublicView=true), returns dummy tours to entice login
 * Polls for live data (price, duration, rating) when cache_key is present
 */
const useToursForExperienceLegacy = (experienceId: string | undefined, isPublicView: boolean = false, enabled: boolean = true, checkIn?: string | null) => {
    // isPublicView is kept for API compatibility but currently not used (public view now uses real tours)
    void isPublicView
    const [mergedToursData, setMergedToursData] = useState<ToursResponseType | null>(null)

    const {
        data: toursData,
        isLoading,
        error,
        isError
    } = useQuery({
        queryKey: ['tours', experienceId, checkIn],
        queryFn: async () => await getToursForExperience(experienceId!, checkIn),
        enabled: !!experienceId && enabled,
        staleTime: FIVE_MINUTES, // Cache for 5 minutes - tours can change with dates
        gcTime: HOURS_24, // Keep in cache for 24 hours
        refetchOnMount: false, // Don't refetch when component mounts if data is cached
        refetchOnWindowFocus: false // Don't refetch when window regains focus
    })

    // Poll for live data when cache_key exists. Gate on `enabled` too —
    // otherwise when the Budget Tab's batch SSE warms the `['tours', ...]`
    // cache, this hook reads `toursData.cache_key` from cache (even with the
    // first query disabled) and starts polling, double-fetching the live
    // data the SSE stream is already pushing.
    const cacheKey = toursData?.cache_key
    const shouldPoll = !!cacheKey && enabled

    const {
        data: liveData,
        isLoading: isPolling
    } = useQuery({
        queryKey: ['tour-data-status', cacheKey],
        queryFn: async () => await getTourDataStatus(cacheKey!),
        enabled: shouldPoll,
        refetchInterval: (query) => {
            const data = query.state.data
            // Poll every 2 seconds until status is "completed" or "failed"
            if (data?.status === 'queued' || data?.status === 'in_progress') {
                return 2000
            }
            return false // Stop polling when completed or failed
        },
        refetchOnMount: false, // Don't refetch when component mounts if data is cached
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        staleTime: FIVE_MINUTES, // Cache for 5 minutes
        gcTime: HOURS_24 // Keep in cache for 24 hours
    })

    // Merge live data with tours when available
    useEffect(() => {
        if (!toursData) {
            setMergedToursData(null)
            return
        }
        if (liveData && liveData.data) {
            const mergedTours = toursData.tours.map((tour) => mergeTourWithLiveData(tour, liveData.data[tour.id]))
            setMergedToursData({ ...toursData, tours: mergedTours })
        } else {
            setMergedToursData(toursData)
        }
    }, [toursData, liveData])

    const finalToursData = mergedToursData || toursData

    // Extract platform ratings from tours
    const platformRatings: PlatformRating[] = finalToursData?.tours ? extractPlatformRatings(finalToursData.tours) : []

    // Adapt tours to UI format
    const baseAdaptedTours: AdaptedTourResponseType[] = finalToursData ? adaptToursToUI(finalToursData as ToursResponseType) : []

    // Overlay per-collection personal recommendations from context (no-op when not inside a collection page)
    const personalRecsMap = usePersonalRecommendationsMap()
    // mapping_id arrives on the wire from /tours (the endpoint only surfaces
    // tours that already have a published mapping), so no separate join.
    const adaptedTours = useMemo(() => {
        if (!personalRecsMap || !experienceId || baseAdaptedTours.length === 0) {
            return baseAdaptedTours
        }
        return baseAdaptedTours.map((tour) => {
            const rec = personalRecsMap.get(buildPersonalRecommendationKey(experienceId, tour.id))
            if (!rec) return tour
            return {
                ...tour,
                is_personally_recommended: true,
                personal_recommendation_reason: rec.reason ?? null
            }
        })
    }, [baseAdaptedTours, personalRecsMap, experienceId])

    // Determine if we're still polling (any status that isn't completed/failed)
    const liveStatus = liveData?.status
    // Treat anything other than completed/failed as still polling
    const isStillPolling = shouldPoll && (isPolling || liveStatus === undefined || (liveStatus !== 'completed' && liveStatus !== 'failed'))

    return {
        tours: adaptedTours,
        platformRatings,
        isLoading: isLoading, // Only show full loading for initial fetch
        isPolling: isStillPolling, // Separate flag for polling state
        error,
        isError,
        toursData: finalToursData
    }
}

/**
 * Single-experience tour fetch.
 *
 * Resolution priority:
 *   1. Scoped provider — when wrapped in a `TourLiveDataBatchProvider` (Budget
 *      Tab, Activities-Tab day group, etc.), reads the shared stream's
 *      `stateMap`. No per-card SSE opened.
 *   2. Local 1-item batch SSE — fallback when no provider is mounted (e.g.
 *      SneakPeek modal, ExperienceDetails page, standalone explore pages).
 *   3. Legacy GET + poll — fallback when the batch SSE transport fails twice.
 *
 * React Query caches `['tours', experienceId, checkIn]` are warmed by
 * `useBatchTourLiveData` on every `tours_ready` event, so downstream code that
 * reads directly from the cache continues to work regardless of which path
 * actually opened the stream.
 */
export const useToursForExperience = (
    experienceId: string | undefined,
    isPublicView: boolean = false,
    enabled: boolean = true,
    checkIn?: string | null
) => {
    void isPublicView

    const scoped = useScopedTourLiveData(experienceId, checkIn)

    // Per-collection personal recommendations (no-op outside a collection page).
    // The legacy GET path overlays these itself; the batch paths below must do the
    // same, otherwise `is_personally_recommended` (and the "FOR {name}" badge) is
    // only ever set when the SSE fails over to legacy.
    const personalRecsMap = usePersonalRecommendationsMap()
    const withPersonalRecs = (tours: AdaptedTourResponseType[]): AdaptedTourResponseType[] => {
        if (!personalRecsMap || !experienceId || tours.length === 0) return tours
        return tours.map((tour) => {
            const rec = personalRecsMap.get(buildPersonalRecommendationKey(experienceId, tour.id))
            if (!rec) return tour
            return { ...tour, is_personally_recommended: true, personal_recommendation_reason: rec.reason ?? null }
        })
    }

    // Suppress the local stream when a parent scope provides this experience.
    // Hook is still called unconditionally (rules of hooks) but with empty
    // items so it stays idle.
    const items = useMemo(
        () => (!scoped.usingBatch && experienceId ? [{ experienceId, checkIn: checkIn ?? null }] : []),
        [scoped.usingBatch, experienceId, checkIn]
    )

    // Fallback path (no parent batch scope mounted — e.g. SneakPeek modal opened
    // outside the day-group provider). Forward `collectionId` so the SSE URL
    // carries `?traveler_collection_id=…` and the BE captures the surface in
    // the minted AttributionContext. Without this the fallback SSE mints a
    // code with no collection ref → revenue attribution loses the publisher.
    const collectionId = useCollectionId()
    const { stateMap, usingFallback } = useBatchTourLiveData(
        items,
        enabled && !!experienceId && !scoped.usingBatch,
        { travelerCollectionId: collectionId },
    )

    // Legacy path — always hook-called (rules of hooks) but `enabled` gates
    // the fetch. Fires only when the local batch reports fallback.
    const legacy = useToursForExperienceLegacy(experienceId, isPublicView, usingFallback && enabled && !scoped.usingBatch, checkIn)

    if (scoped.usingBatch) {
        return {
            tours: withPersonalRecs(scoped.tours),
            platformRatings: scoped.platformRatings,
            isLoading: scoped.isLoading,
            isPolling: scoped.isPolling,
            error: null,
            isError: false,
            toursData: null as ToursResponseType | null,
        }
    }

    if (usingFallback) return legacy

    const key = experienceId ? `${experienceId}:${checkIn ?? ''}` : ''
    const entry = experienceId ? stateMap.get(key) : undefined

    if (!entry) {
        return {
            tours: [] as AdaptedTourResponseType[],
            platformRatings: [] as PlatformRating[],
            isLoading: enabled && !!experienceId,
            isPolling: false,
            error: null,
            isError: false,
            toursData: null as ToursResponseType | null,
        }
    }

    const mergedTours = entry.tours.map((t) => mergeTourWithLiveData(t, entry.liveData[t.id]))
    const toursData: ToursResponseType = {
        experience_id: experienceId!,
        tours: mergedTours,
        total: mergedTours.length,
        cache_key: entry.cacheKey,
        live_data_status: entry.status,
    }
    const adaptedTours = withPersonalRecs(adaptToursToUI(toursData))
    const platformRatings = extractPlatformRatings(mergedTours)
    const isPolling = entry.status === 'tours_ready' || entry.status === 'in_progress'

    return {
        tours: adaptedTours,
        platformRatings,
        isLoading: false,
        isPolling,
        error: null,
        isError: false,
        toursData,
    }
}
