import { createContext, useCallback, useContext, useMemo, ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { travelerCollectionApi } from '@/modules/ContentCollection/api/travelerCollectionApi'
import { updateMappingVisibility } from '@/modules/Experiences/api/tourMappingApi'
import type { ApiResponse, ContentCollection } from '@/modules/ContentCollection/types/contentCollection'

export interface PersonalTourRecommendation {
    tour_id: string
    experience_id: string
    recommended_by?: string
    recommended_at?: string
    reason?: string | null
}

export interface PersonalTourPriceOverride {
    tour_id: string
    experience_id: string
    price: number
    currency?: string | null
    set_by?: string
    set_at?: string
}

interface ContextValue {
    /** Map keyed by `${experience_id}:${tour_id}` for O(1) lookup. */
    recommendationsByKey: Map<string, PersonalTourRecommendation>
    /** Per-tripboard tour price overrides keyed by `${experience_id}:${tour_id}`. */
    priceOverridesByKey: Map<string, PersonalTourPriceOverride>
    /** id-or-slug of the collection in scope (kept dual for the 30+ API-lookup consumers
     *  that pass it to backends accepting either). Null when no collection page mounted. */
    collectionIdentifier: string | null
    /** ObjectId of the collection in scope, when known. Use this for attribution
     *  (sent in the SSE query param so the BE doesn't have to identifier-resolve). */
    collectionId: string | null
    /** First name of the trip owner (the traveler this tripboard belongs to). Null when unavailable. */
    tripOwnerName: string | null
}

const TripCollectionRecommendationsContext = createContext<ContextValue | null>(null)

const buildKey = (experienceId: string, tourId: string) => `${experienceId}:${tourId}`

export const TripCollectionRecommendationsProvider = ({
    recommendations,
    priceOverrides,
    collectionIdentifier,
    collectionId,
    tripOwnerName,
    children
}: {
    recommendations: PersonalTourRecommendation[] | null | undefined
    priceOverrides?: PersonalTourPriceOverride[] | null | undefined
    collectionIdentifier: string | null | undefined
    collectionId?: string | null
    tripOwnerName?: string | null
    children: ReactNode
}) => {
    const value = useMemo<ContextValue>(() => {
        const map = new Map<string, PersonalTourRecommendation>()
        for (const rec of recommendations ?? []) {
            if (rec?.tour_id && rec?.experience_id) {
                map.set(buildKey(rec.experience_id, rec.tour_id), rec)
            }
        }
        const priceMap = new Map<string, PersonalTourPriceOverride>()
        for (const ov of priceOverrides ?? []) {
            if (ov?.tour_id && ov?.experience_id && ov?.price != null) {
                priceMap.set(buildKey(ov.experience_id, ov.tour_id), ov)
            }
        }
        return {
            recommendationsByKey: map,
            priceOverridesByKey: priceMap,
            collectionIdentifier: collectionIdentifier ?? null,
            collectionId: collectionId ?? null,
            tripOwnerName: tripOwnerName ?? null
        }
    }, [recommendations, priceOverrides, collectionIdentifier, collectionId, tripOwnerName])

    return (
        <TripCollectionRecommendationsContext.Provider value={value}>
            {children}
        </TripCollectionRecommendationsContext.Provider>
    )
}

/** Lookup: is this (experience, tour) personally recommended? Returns null if no context mounted or no rec. */
export const usePersonalRecommendation = (experienceId: string | undefined, tourId: string | undefined): PersonalTourRecommendation | null => {
    const ctx = useContext(TripCollectionRecommendationsContext)
    if (!ctx || !experienceId || !tourId) return null
    return ctx.recommendationsByKey.get(buildKey(experienceId, tourId)) ?? null
}

/** Bulk variant for hooks that need to enrich a tour list. Returns the raw map; null if no context. */
export const usePersonalRecommendationsMap = (): Map<string, PersonalTourRecommendation> | null => {
    const ctx = useContext(TripCollectionRecommendationsContext)
    return ctx?.recommendationsByKey ?? null
}

/** Lookup: does this (experience, tour) have a per-tripboard price override? Null if none / no context. */
export const useTourPriceOverride = (experienceId: string | undefined, tourId: string | undefined): PersonalTourPriceOverride | null => {
    const ctx = useContext(TripCollectionRecommendationsContext)
    if (!ctx || !experienceId || !tourId) return null
    return ctx.priceOverridesByKey.get(buildKey(experienceId, tourId)) ?? null
}

/** Bulk variant for hooks that need to enrich a tour list. Returns the raw map; null if no context. */
export const useTourPriceOverridesMap = (): Map<string, PersonalTourPriceOverride> | null => {
    const ctx = useContext(TripCollectionRecommendationsContext)
    return ctx?.priceOverridesByKey ?? null
}

/** The collection identifier in scope, or null when not on a collection page. */
export const useCollectionIdentifier = (): string | null => {
    const ctx = useContext(TripCollectionRecommendationsContext)
    return ctx?.collectionIdentifier ?? null
}

/** The collection ObjectId in scope, or null. Used for attribution query params. */
export const useCollectionId = (): string | null => {
    const ctx = useContext(TripCollectionRecommendationsContext)
    return ctx?.collectionId ?? null
}

/** First name of the trip owner (the traveler this tripboard belongs to). Null when unavailable. */
export const useTripOwnerName = (): string | null => {
    const ctx = useContext(TripCollectionRecommendationsContext)
    return ctx?.tripOwnerName ?? null
}

export const buildPersonalRecommendationKey = buildKey

type CachedCollection = ApiResponse<ContentCollection> | undefined
type CollectionWithMetadata = ContentCollection & {
    metadata?: {
        tour_recommendations?: PersonalTourRecommendation[]
        tour_price_overrides?: PersonalTourPriceOverride[]
    } & Record<string, unknown>
}

/** Apply an immutable update to metadata.tour_recommendations on the cached experience-collection response. */
const updateCachedRecommendations = (
    cached: CachedCollection,
    update: (recs: PersonalTourRecommendation[]) => PersonalTourRecommendation[]
): CachedCollection => {
    if (!cached?.data) return cached
    const data = cached.data as CollectionWithMetadata
    const currentRecs = data.metadata?.tour_recommendations ?? []
    const nextRecs = update(currentRecs)
    return {
        ...cached,
        data: {
            ...data,
            metadata: { ...(data.metadata ?? {}), tour_recommendations: nextRecs }
        }
    } as ApiResponse<ContentCollection>
}

/**
 * Toggle a personal tour recommendation for the (experienceId, tourId) tuple in the
 * collection currently mounted in context. No-op when no context.
 *
 * Optimistic update: mutates `metadata.tour_recommendations` in cache immediately,
 * rolls back on error and shows a toast. No full refetch on success.
 */
export const useTourRecommendationMutation = () => {
    const queryClient = useQueryClient()
    const collectionIdentifier = useCollectionIdentifier()

    const queryKey = collectionIdentifier
        ? (['traveler-collection', collectionIdentifier, 'experience'] as const)
        : null

    const recommend = useMutation<
        unknown,
        Error,
        {
            experienceId: string
            tourId: string
            reason?: string | null
            /** When the mapping is unpublished, the backend rejects the recommendation. Pass the
             *  mapping id + current published state so we can publish first via the existing PATCH
             *  endpoint, then add the recommendation. Mirrors the global "Recommend ⇒ Publish" invariant. */
            mappingId?: string | null
            isPublished?: boolean
        },
        { previous: CachedCollection }
    >({
        mutationFn: async (payload) => {
            if (!collectionIdentifier) throw new Error('No collection in scope')
            if (payload.mappingId && payload.isPublished === false) {
                await updateMappingVisibility(payload.mappingId, { is_published_on_rimigo: true })
            }
            return travelerCollectionApi.addTourRecommendation(collectionIdentifier, {
                tour_id: payload.tourId,
                experience_id: payload.experienceId,
                reason: payload.reason ?? null
            })
        },
        onMutate: async (payload) => {
            if (!queryKey) return { previous: undefined }
            await queryClient.cancelQueries({ queryKey })
            const previous = queryClient.getQueryData<CachedCollection>(queryKey)
            queryClient.setQueryData<CachedCollection>(queryKey, (cached) =>
                updateCachedRecommendations(cached, (recs) => {
                    const filtered = recs.filter(
                        (r) => !(r.tour_id === payload.tourId && r.experience_id === payload.experienceId)
                    )
                    return [
                        ...filtered,
                        {
                            tour_id: payload.tourId,
                            experience_id: payload.experienceId,
                            reason: payload.reason ?? null,
                            recommended_at: new Date().toISOString()
                        }
                    ]
                })
            )
            return { previous }
        },
        onError: (_err, _payload, ctx) => {
            if (queryKey && ctx?.previous !== undefined) {
                queryClient.setQueryData<CachedCollection>(queryKey, ctx.previous)
            }
            toast.error("Couldn't recommend tour. Please try again.")
        }
    })

    const unrecommend = useMutation<
        unknown,
        Error,
        { experienceId: string; tourId: string },
        { previous: CachedCollection }
    >({
        mutationFn: async (payload) => {
            if (!collectionIdentifier) throw new Error('No collection in scope')
            return travelerCollectionApi.removeTourRecommendation(
                collectionIdentifier,
                payload.tourId,
                payload.experienceId
            )
        },
        onMutate: async (payload) => {
            if (!queryKey) return { previous: undefined }
            await queryClient.cancelQueries({ queryKey })
            const previous = queryClient.getQueryData<CachedCollection>(queryKey)
            queryClient.setQueryData<CachedCollection>(queryKey, (cached) =>
                updateCachedRecommendations(cached, (recs) =>
                    recs.filter(
                        (r) => !(r.tour_id === payload.tourId && r.experience_id === payload.experienceId)
                    )
                )
            )
            return { previous }
        },
        onError: (err, _payload, ctx) => {
            // Idempotency: if the server says the recommendation is already gone, the user's
            // intent ("remove") matches reality. Keep the optimistic removal and stay quiet.
            const message = String((err as { message?: string; response?: { data?: { error?: string } } })?.response?.data?.error ?? err?.message ?? '')
            if (/no recommendation found/i.test(message)) return
            if (queryKey && ctx?.previous !== undefined) {
                queryClient.setQueryData<CachedCollection>(queryKey, ctx.previous)
            }
            toast.error("Couldn't remove recommendation. Please try again.")
        }
    })

    const toggle = useCallback(
        (args: {
            experienceId: string
            tourId: string
            isCurrentlyRecommended: boolean
            reason?: string | null
            mappingId?: string | null
            isPublished?: boolean
        }) => {
            if (args.isCurrentlyRecommended) {
                unrecommend.mutate({ experienceId: args.experienceId, tourId: args.tourId })
            } else {
                recommend.mutate({
                    experienceId: args.experienceId,
                    tourId: args.tourId,
                    reason: args.reason,
                    mappingId: args.mappingId,
                    isPublished: args.isPublished
                })
            }
        },
        [recommend, unrecommend]
    )

    return {
        toggle,
        isPending: recommend.isPending || unrecommend.isPending,
        canToggle: !!collectionIdentifier
    }
}

/** Apply an immutable update to metadata.tour_price_overrides on the cached experience-collection response. */
const updateCachedPriceOverrides = (
    cached: CachedCollection,
    update: (overrides: PersonalTourPriceOverride[]) => PersonalTourPriceOverride[]
): CachedCollection => {
    if (!cached?.data) return cached
    const data = cached.data as CollectionWithMetadata
    const current = data.metadata?.tour_price_overrides ?? []
    const next = update(current)
    return {
        ...cached,
        data: {
            ...data,
            metadata: { ...(data.metadata ?? {}), tour_price_overrides: next }
        }
    } as ApiResponse<ContentCollection>
}

/**
 * Set or clear a per-tripboard tour price override for the (experienceId, tourId) tuple in the
 * collection currently mounted in context. No-op when no context.
 *
 * Optimistic update: mutates `metadata.tour_price_overrides` in cache immediately (which re-derives
 * the context map and re-prices the tour card), rolls back on error with a toast. No refetch on success.
 */
export const useTourPriceOverrideMutation = () => {
    const queryClient = useQueryClient()
    const collectionIdentifier = useCollectionIdentifier()

    const queryKey = collectionIdentifier
        ? (['traveler-collection', collectionIdentifier, 'experience'] as const)
        : null

    const setPrice = useMutation<
        unknown,
        Error,
        { experienceId: string; tourId: string; price: number; currency?: string | null },
        { previous: CachedCollection }
    >({
        mutationFn: async (payload) => {
            if (!collectionIdentifier) throw new Error('No collection in scope')
            return travelerCollectionApi.setTourPriceOverride(collectionIdentifier, {
                tour_id: payload.tourId,
                experience_id: payload.experienceId,
                price: payload.price,
                currency: payload.currency ?? null
            })
        },
        onMutate: async (payload) => {
            if (!queryKey) return { previous: undefined }
            await queryClient.cancelQueries({ queryKey })
            const previous = queryClient.getQueryData<CachedCollection>(queryKey)
            queryClient.setQueryData<CachedCollection>(queryKey, (cached) =>
                updateCachedPriceOverrides(cached, (overrides) => {
                    const filtered = overrides.filter(
                        (o) => !(o.tour_id === payload.tourId && o.experience_id === payload.experienceId)
                    )
                    return [
                        ...filtered,
                        {
                            tour_id: payload.tourId,
                            experience_id: payload.experienceId,
                            price: payload.price,
                            currency: payload.currency ?? null,
                            set_at: new Date().toISOString()
                        }
                    ]
                })
            )
            return { previous }
        },
        onError: (_err, _payload, ctx) => {
            if (queryKey && ctx?.previous !== undefined) {
                queryClient.setQueryData<CachedCollection>(queryKey, ctx.previous)
            }
            toast.error("Couldn't set price. Please try again.")
        },
        onSuccess: () => {
            // The POST triggers a server-side budget recalc, but the budget tab only
            // refetches while it's polling (calculation_status === 'in_progress').
            // Invalidate it so it refetches and converges on the re-priced snapshot.
            // Partial key matches both 'private' and 'public' budget queries.
            if (collectionIdentifier) {
                queryClient.invalidateQueries({ queryKey: ['tripBudget', collectionIdentifier] })
            }
        }
    })

    const clearPrice = useMutation<
        unknown,
        Error,
        { experienceId: string; tourId: string },
        { previous: CachedCollection }
    >({
        mutationFn: async (payload) => {
            if (!collectionIdentifier) throw new Error('No collection in scope')
            return travelerCollectionApi.removeTourPriceOverride(collectionIdentifier, payload.tourId, payload.experienceId)
        },
        onMutate: async (payload) => {
            if (!queryKey) return { previous: undefined }
            await queryClient.cancelQueries({ queryKey })
            const previous = queryClient.getQueryData<CachedCollection>(queryKey)
            queryClient.setQueryData<CachedCollection>(queryKey, (cached) =>
                updateCachedPriceOverrides(cached, (overrides) =>
                    overrides.filter((o) => !(o.tour_id === payload.tourId && o.experience_id === payload.experienceId))
                )
            )
            return { previous }
        },
        onError: (err, _payload, ctx) => {
            // Idempotency: if the server says the override is already gone, the user's intent matches reality.
            const message = String((err as { message?: string; response?: { data?: { error?: string } } })?.response?.data?.error ?? err?.message ?? '')
            if (/no price override found/i.test(message)) return
            if (queryKey && ctx?.previous !== undefined) {
                queryClient.setQueryData<CachedCollection>(queryKey, ctx.previous)
            }
            toast.error("Couldn't clear price. Please try again.")
        },
        onSuccess: () => {
            // Mirror set: a cleared override re-triggers the budget recalc server-side;
            // invalidate so the budget tab refetches the reverted snapshot.
            if (collectionIdentifier) {
                queryClient.invalidateQueries({ queryKey: ['tripBudget', collectionIdentifier] })
            }
        }
    })

    return {
        setPrice: setPrice.mutate,
        clearPrice: clearPrice.mutate,
        isPending: setPrice.isPending || clearPrice.isPending,
        canEdit: !!collectionIdentifier
    }
}
