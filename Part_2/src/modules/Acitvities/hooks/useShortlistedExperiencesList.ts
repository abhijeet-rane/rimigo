import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    bulkUpsertTripExperiences,
    getCityWiseShortlistedExperiences,
    type ShortlistedByTripExperienceResult
} from '@/modules/Experiences/api/experienceShortlistAPI'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useLoginModal } from '@/modules/Onboarding/context/LoginModalContext'
import type { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'

export type ShortlistCardData = ExperienceCardData & { initialIsShortlisted: boolean }

export interface ShortlistCityGroup {
    cityKey: string
    cityName: string
    experiences: ShortlistCardData[]
}

const PAGE_SIZE = 10

export const toShortlistCardData = (item: ShortlistedByTripExperienceResult): ShortlistCardData => {
    const experience = item.experience
    const experienceId = experience?.id || item.experience_id || ''
    const price = experience?.price ||
        item.price || {
            currency: 'INR',
            lower_bound: 0,
            upper_bound: 0
        }
    const image = experience?.display_props?.landscape_image || item.content?.[0] || ''
    const cityName = experience?.base_city?.name || 'Unknown City'
    const categories = experience?.categories || []

    return {
        id: experienceId,
        title: experience?.name || 'Unnamed Experience',
        city_name: cityName,
        city_id: '',
        price: {
            lower_bound: price.lower_bound ?? null,
            upper_bound: price.upper_bound ?? null,
            currency: price.currency ?? null
        },
        image,
        suggestion_priority: null,
        short_description: experience?.short_description ?? null,
        category: null,
        categoryBackendValue: categories[0] ?? null,
        categories: categories.length > 0 ? categories : null,
        initialIsShortlisted: item.is_traveler_shortlisted ?? true
    }
}

/**
 * Shared data + toggle layer for the "shortlisted experiences" surfaces.
 *
 * Backs both the Activities tab grid (`ShortlistedActivitiesView`) and the
 * Itinerary wishlist row list. Owns the infinite query, the per-card
 * optimistic heart state (`localOverride` / `inFlight`), the
 * `bulkUpsertTripExperiences` toggle and the debounced list refetch so the
 * two surfaces never diverge. The query key matches the Activities tab so a
 * toggle on one surface reflects on the other.
 */
export const useShortlistedExperiencesList = (tripId: string) => {
    const queryClient = useQueryClient()
    const { isAuthenticated } = useAuth()
    const { openLoginModal } = useLoginModal()

    const sentinelRef = useRef<HTMLDivElement | null>(null)
    const [localOverride, setLocalOverride] = useState<Record<string, boolean>>({})
    const [inFlight, setInFlight] = useState<Record<string, boolean>>({})
    const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
        queryKey: ['tripboard-activities-shortlisted', tripId],
        queryFn: async ({ pageParam = 1 }) =>
            getCityWiseShortlistedExperiences({
                tripId,
                page: pageParam,
                limit: PAGE_SIZE
            }),
        getNextPageParam: (lastPage) => (lastPage?.has_more ? lastPage.page + 1 : undefined),
        initialPageParam: 1,
        enabled: !!tripId && isAuthenticated
    })

    // Prune local overrides after each refetch so stale flags don't persist
    // on ids that were dropped/re-added server-side.
    useEffect(() => {
        if (!data?.pages) return
        const liveIds = new Set<string>()
        for (const page of data.pages) {
            const results = page.results ?? {}
            for (const items of Object.values(results)) {
                for (const item of items) {
                    const id = item.experience?.id || item.experience_id
                    if (id) liveIds.add(id)
                }
            }
        }
        setLocalOverride((prev) => {
            const next: Record<string, boolean> = {}
            let changed = false
            for (const [id, val] of Object.entries(prev)) {
                if (liveIds.has(id)) {
                    next[id] = val
                } else {
                    changed = true
                }
            }
            return changed ? next : prev
        })
    }, [data])

    const cityGroups = useMemo<ShortlistCityGroup[]>(() => {
        const cityMap = new Map<string, ShortlistCityGroup>()
        if (!data?.pages) return []
        for (const page of data.pages) {
            const results = page.results ?? {}
            for (const [cityName, items] of Object.entries(results)) {
                const transformed = items.map(toShortlistCardData)
                const existing = cityMap.get(cityName)
                if (!existing) {
                    cityMap.set(cityName, { cityKey: cityName, cityName, experiences: transformed })
                    continue
                }
                const existingIds = new Set(existing.experiences.map((e) => e.id))
                const newOnes = transformed.filter((e) => !existingIds.has(e.id))
                cityMap.set(cityName, {
                    ...existing,
                    experiences: [...existing.experiences, ...newOnes]
                })
            }
        }
        return [...cityMap.values()]
    }, [data])

    const flatItems = useMemo<ShortlistCardData[]>(() => cityGroups.flatMap((c) => c.experiences), [cityGroups])

    const initialMap = useMemo<Record<string, boolean>>(() => {
        const map: Record<string, boolean> = {}
        for (const item of flatItems) map[item.id] = item.initialIsShortlisted
        return map
    }, [flatItems])

    const isShortlisted = useCallback(
        (experienceId: string): boolean => localOverride[experienceId] ?? initialMap[experienceId] ?? false,
        [localOverride, initialMap]
    )

    const isShortlisting = useCallback((experienceId: string): boolean => Boolean(inFlight[experienceId]), [inFlight])

    // Infinite scroll
    useEffect(() => {
        if (!hasNextPage || isFetchingNextPage || isLoading) return
        const sentinel = sentinelRef.current
        if (!sentinel) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    void fetchNextPage()
                }
            },
            { root: null, rootMargin: '200px', threshold: 0.1 }
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage])

    const toggle = useCallback(
        async (experienceId: string) => {
            // Auth-gated: unauthenticated viewers see the login modal instead
            // of an immediate API call that would 401.
            if (!isAuthenticated) {
                openLoginModal({
                    redirectAfterLogin: false,
                    buttonPage: 'tripboard_v1'
                })
                return
            }
            const currentVisual = isShortlisted(experienceId)
            const nextState = !currentVisual
            // Optimistic local flip — card stays in place; heart toggles
            // immediately so the user gets instant feedback.
            setLocalOverride((prev) => ({ ...prev, [experienceId]: nextState }))
            setInFlight((prev) => ({ ...prev, [experienceId]: true }))

            try {
                // Call bulkUpsert DIRECTLY with the prop-sourced tripId. The
                // shared context's handleShortlistToggle bails when activeTrip
                // isn't populated (tripboard deep-links), so calling the API
                // here means the flag updates regardless.
                await bulkUpsertTripExperiences(tripId, {
                    trip_id: tripId,
                    experiences: [
                        {
                            experience_id: experienceId,
                            is_traveler_shortlisted: nextState
                        }
                    ]
                })
                toast.success(nextState ? 'Added to wishlist' : 'Removed from wishlist')
            } catch (err) {
                // Revert on failure.
                setLocalOverride((prev) => ({ ...prev, [experienceId]: currentVisual }))
                // eslint-disable-next-line no-console
                console.error('Failed to update shortlist', err)
                toast.error('Could not update shortlist. Please try again.')
            } finally {
                setInFlight((prev) => {
                    const next = { ...prev }
                    delete next[experienceId]
                    return next
                })
            }

            // Debounced list refetch: un-shortlisted cards should drop out of
            // the list so stale entries don't linger. The delay gives the user
            // visual confirmation first and coalesces rapid re-toggles into a
            // single refetch.
            if (refetchTimerRef.current) {
                clearTimeout(refetchTimerRef.current)
            }
            refetchTimerRef.current = setTimeout(() => {
                queryClient.invalidateQueries({
                    queryKey: ['tripboard-activities-shortlisted', tripId]
                })
                refetchTimerRef.current = null
            }, 800)
        },
        [queryClient, tripId, isAuthenticated, openLoginModal, isShortlisted]
    )

    // Clear pending refetch on unmount so we don't invalidate after the user
    // has already navigated away.
    useEffect(() => {
        return () => {
            if (refetchTimerRef.current) {
                clearTimeout(refetchTimerRef.current)
                refetchTimerRef.current = null
            }
        }
    }, [])

    return {
        cityGroups,
        flatItems,
        isLoading,
        error,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
        sentinelRef,
        isShortlisted,
        isShortlisting,
        toggle
    }
}
