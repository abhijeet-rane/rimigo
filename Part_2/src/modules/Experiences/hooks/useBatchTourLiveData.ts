/**
 * React hook that drives a single batched tour live-data SSE stream and
 * exposes per-experience state to consumers.
 *
 * Returns a `Map<key, BatchExperienceState>` (key = `${experienceId}:${checkIn ?? ''}`)
 * and a `usingFallback` flag.
 *
 * Lifecycle:
 *   - `enabled=false` or empty items → idle, no stream opened.
 *   - Items signature change → previous stream aborted, fresh stream opened.
 *   - Transport failure (network error, 5xx, 429) → one retry after 2s,
 *     then `usingFallback=true` until items signature changes.
 *   - Unmount → AbortController fired.
 *
 * On every `tours_ready` event the hook writes the
 * `['tours', experienceId, checkIn]` React Query cache so navigating to the
 * single-experience surfaces (SneakPeak, ExperienceDetails, HorizontalListCard)
 * is warm-loaded.
 */

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useReducer } from 'react'

import {
    BatchItem,
    BatchSSEEvent,
    openTourLiveDataBatchStream,
} from '@/modules/Experiences/api/tourLiveDataBatchAPI'
import type { Tour, TourLiveDataItem, ToursResponseType } from '@/modules/Experiences/types/toursResponseTypes'

// ── Public types ────────────────────────────────────────────────────────────

export type BatchPerExperienceStatus = 'tours_ready' | 'in_progress' | 'completed' | 'failed'

export interface BatchExperienceState {
    tours: Tour[]
    liveData: Record<string, TourLiveDataItem>
    status: BatchPerExperienceStatus
    cacheKey: string
    /** Optional message — populated on `experience_failed`. */
    message?: string
}

export interface UseBatchTourLiveDataResult {
    stateMap: Map<string, BatchExperienceState>
    usingFallback: boolean
}

// ── Reducer ─────────────────────────────────────────────────────────────────

interface ReducerState {
    stateMap: Map<string, BatchExperienceState>
    usingFallback: boolean
}

type ReducerAction =
    | { type: 'reset' }
    | { type: 'fallback' }
    | { type: 'event'; event: BatchSSEEvent }

const INITIAL_STATE: ReducerState = { stateMap: new Map(), usingFallback: false }

function makeKey(experienceId: string, checkIn: string | null | undefined): string {
    return `${experienceId}:${checkIn ?? ''}`
}

function reducer(state: ReducerState, action: ReducerAction): ReducerState {
    switch (action.type) {
        case 'reset':
            return INITIAL_STATE

        case 'fallback':
            return { ...state, usingFallback: true }

        case 'event': {
            const { event } = action
            const next = new Map(state.stateMap)

            if (event.event === 'tours_ready') {
                const key = makeKey(event.data.experience_id, event.data.check_in)
                next.set(key, {
                    tours: event.data.tours,
                    liveData: {},
                    status: 'tours_ready',
                    cacheKey: event.data.cache_key,
                })
                return { ...state, stateMap: next }
            }

            if (event.event === 'experience_progress') {
                const target = findEntryByCacheKey(next, event.data.cache_key)
                if (!target) return state
                const [key, existing] = target
                if (event.data.tour_id && event.data.snapshot) {
                    next.set(key, {
                        ...existing,
                        liveData: { ...existing.liveData, [event.data.tour_id]: event.data.snapshot },
                        status: 'in_progress',
                    })
                } else {
                    next.set(key, { ...existing, status: 'in_progress' })
                }
                return { ...state, stateMap: next }
            }

            if (event.event === 'experience_completed') {
                const target = findEntryByCacheKey(next, event.data.cache_key)
                if (!target) return state
                const [key, existing] = target
                next.set(key, { ...existing, liveData: event.data.data, status: 'completed' })
                return { ...state, stateMap: next }
            }

            if (event.event === 'experience_failed') {
                const target = findEntryByCacheKey(next, event.data.cache_key)
                if (!target) return state
                const [key, existing] = target
                next.set(key, { ...existing, status: 'failed', message: event.data.message })
                return { ...state, stateMap: next }
            }

            // Stream-level `completed` / `failed` carry no per-experience
            // state — the AbortController + reducer reset on next mount
            // handle teardown.
            return state
        }

        default:
            return state
    }
}

/**
 * Per-experience events carry `cache_key` but not `check_in`. The cache_key
 * is unique per `(experience_id, check_in)` so it disambiguates between
 * same-experience-different-date entries.
 */
function findEntryByCacheKey(
    map: Map<string, BatchExperienceState>,
    cacheKey: string
): [string, BatchExperienceState] | null {
    for (const entry of map.entries()) {
        if (entry[1].cacheKey === cacheKey) return entry
    }
    return null
}

// ── Hook ────────────────────────────────────────────────────────────────────

const RETRY_DELAY_MS = 2000

export function useBatchTourLiveData(
    items: BatchItem[],
    enabled: boolean,
    options?: { travelerCollectionId?: string | null },
): UseBatchTourLiveDataResult {
    const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
    const queryClient = useQueryClient()

    // Stable signature — re-runs effect only when the actual content changes.
    const signature = JSON.stringify([...items.map((it) => `${it.experienceId}:${it.checkIn ?? ''}`)].sort())

    useEffect(() => {
        // Fresh batch → fresh state + fresh transport-failure budget.
        dispatch({ type: 'reset' })

        if (!enabled || items.length === 0) return

        const controller = new AbortController()
        let cancelled = false

        const run = async (): Promise<'success' | 'transport-error'> => {
            try {
                for await (const event of openTourLiveDataBatchStream(
                    { items },
                    {
                        signal: controller.signal,
                        travelerCollectionId: options?.travelerCollectionId ?? null,
                    }
                )) {
                    if (cancelled) return 'success'
                    dispatch({ type: 'event', event })

                    // Warm React Query's `['tours', expId, checkIn]` cache so
                    // single-experience consumers don't have to refetch.
                    if (event.event === 'tours_ready') {
                        const cachePayload: ToursResponseType = {
                            experience_id: event.data.experience_id,
                            tours: event.data.tours,
                            total: event.data.tours.length,
                            cache_key: event.data.cache_key,
                            live_data_status: event.data.live_data_status,
                        }
                        queryClient.setQueryData(
                            ['tours', event.data.experience_id, event.data.check_in],
                            cachePayload
                        )
                    }
                }
                return 'success'
            } catch (err) {
                if (cancelled || controller.signal.aborted) return 'success'
                console.warn('[useBatchTourLiveData] transport error', err)
                return 'transport-error'
            }
        }

        const driver = async () => {
            const first = await run()
            if (first === 'success' || cancelled) return
            await sleep(RETRY_DELAY_MS)
            if (cancelled) return
            const second = await run()
            if (second === 'transport-error' && !cancelled) {
                dispatch({ type: 'fallback' })
            }
        }

        void driver()

        return () => {
            cancelled = true
            controller.abort()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature, enabled])

    return { stateMap: state.stateMap, usingFallback: state.usingFallback }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
