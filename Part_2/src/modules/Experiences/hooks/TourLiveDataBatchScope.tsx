/**
 * Provider + consumer hook that fans one batch SSE stream out to many
 * experience cards in a shared scope (Budget Tab, an Activities-Tab day group,
 * or anywhere else multiple `useToursForExperience` consumers should share a
 * single stream instead of each opening their own).
 *
 * `useToursForExperience` consults this context first — when a provider is
 * mounted and the experience is in its items signature, the per-card 1-item
 * stream is suppressed and the card reads from the shared `stateMap`. When no
 * provider is mounted, or the provider is in transport-failure fallback,
 * `usingBatch=false` and the per-card hook opens its own stream.
 */

import React, { createContext, useContext, useMemo } from 'react'

import type { BatchItem } from '@/modules/Experiences/api/tourLiveDataBatchAPI'
import { adaptToursToUI } from '@/modules/Experiences/adapters'
import {
    BatchExperienceState,
    useBatchTourLiveData,
} from '@/modules/Experiences/hooks/useBatchTourLiveData'
import type { AdaptedTourResponseType, ToursResponseType } from '@/modules/Experiences/types/toursResponseTypes'
import {
    extractPlatformRatings,
    mergeTourWithLiveData,
    type PlatformRating,
} from '@/modules/Experiences/utils/tourLiveDataMerge'

export type { PlatformRating }

// ── Context ─────────────────────────────────────────────────────────────────

interface ContextValue {
    stateMap: Map<string, BatchExperienceState>
    usingFallback: boolean
    enabled: boolean
    /** Set of `${experienceId}:${checkIn ?? ''}` keys the provider expects to
     *  resolve. Lets `useScopedTourLiveData` distinguish "tours_ready not yet
     *  arrived" (return loading + usingBatch=true) from "this experience
     *  isn't in this scope" (return EMPTY_RESULT so the caller falls through
     *  to its own per-card stream). */
    expectedKeys: Set<string>
}

const TourLiveDataBatchCtx = createContext<ContextValue | null>(null)

export interface TourLiveDataBatchProviderProps {
    items: BatchItem[]
    enabled: boolean
    /** Tripboard / collection context. Forwarded to the SSE batch URL as
     * `?traveler_collection_id=…` so backend attribution distinguishes the
     * surface (tripboard activities tab vs experience-details page). */
    travelerCollectionId?: string | null
    children: React.ReactNode
}

export const TourLiveDataBatchProvider: React.FC<TourLiveDataBatchProviderProps> = ({ items, enabled, travelerCollectionId, children }) => {
    const { stateMap, usingFallback } = useBatchTourLiveData(items, enabled, { travelerCollectionId })
    const expectedKeys = useMemo(
        () => new Set(items.map((it) => `${it.experienceId}:${it.checkIn ?? ''}`)),
        [items]
    )
    const value = useMemo<ContextValue>(
        () => ({ stateMap, usingFallback, enabled, expectedKeys }),
        [stateMap, usingFallback, enabled, expectedKeys]
    )
    return <TourLiveDataBatchCtx.Provider value={value}>{children}</TourLiveDataBatchCtx.Provider>
}

// ── Consumer hook ───────────────────────────────────────────────────────────

export interface UseScopedTourLiveDataResult {
    tours: AdaptedTourResponseType[]
    platformRatings: PlatformRating[]
    isLoading: boolean
    isPolling: boolean
    hasTours: boolean
    /**
     * True when the scoped provider is the source of truth for this row.
     * False when no provider is mounted, the provider is disabled, the provider
     * is in transport-failure fallback, or the experience isn't in the
     * provider's items signature — in those cases the caller should open its
     * own per-card stream.
     */
    usingBatch: boolean
}

const EMPTY_RESULT: UseScopedTourLiveDataResult = {
    tours: [],
    platformRatings: [],
    isLoading: false,
    isPolling: false,
    hasTours: false,
    usingBatch: false,
}

export function useScopedTourLiveData(
    experienceId: string | undefined,
    checkIn: string | null | undefined
): UseScopedTourLiveDataResult {
    const ctx = useContext(TourLiveDataBatchCtx)

    if (!ctx || !ctx.enabled || ctx.usingFallback || !experienceId) {
        return EMPTY_RESULT
    }

    const key = `${experienceId}:${checkIn ?? ''}`

    // Provider mounted but this experience isn't in its items signature —
    // fall through so the caller opens its own per-card stream rather than
    // hanging forever waiting for a tours_ready that won't arrive.
    if (!ctx.expectedKeys.has(key)) return EMPTY_RESULT

    const entry = ctx.stateMap.get(key)

    // tours_ready hasn't arrived yet for this experience — show a loading state.
    if (!entry) {
        return {
            tours: [],
            platformRatings: [],
            isLoading: true,
            isPolling: false,
            hasTours: false,
            usingBatch: true,
        }
    }

    const mergedTours = entry.tours.map((t) => mergeTourWithLiveData(t, entry.liveData[t.id]))
    const responseShape: ToursResponseType = {
        experience_id: experienceId,
        tours: mergedTours,
        total: mergedTours.length,
        cache_key: entry.cacheKey,
        live_data_status: entry.status,
    }
    const adapted = adaptToursToUI(responseShape)
    const platformRatings = extractPlatformRatings(mergedTours)
    const isPolling = entry.status === 'tours_ready' || entry.status === 'in_progress'

    return {
        tours: adapted,
        platformRatings,
        isLoading: false,
        isPolling,
        hasTours: adapted.length > 0,
        usingBatch: true,
    }
}
