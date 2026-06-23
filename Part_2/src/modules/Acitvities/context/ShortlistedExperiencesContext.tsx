import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { getShortlistedByTrip, bulkUpsertTripExperiences } from '@/modules/Experiences/api/experienceShortlistAPI'
import { addShortlistChangedListener } from '@/lib/events/shortlistEvents'
import { dispatchOpenTripCreationModal } from '@/lib/events/tripCreationModalEvents'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useLoginModal } from '@/modules/Onboarding/context/LoginModalContext'
import { toast } from 'sonner'

/**
 * Shortlist state entry
 */
export interface ShortlistEntry {
    experienceId: string
    isShortlisted: boolean
}

/**
 * Context type
 */
type ShortlistedExperiencesContextType = {
    shortlistState: Record<string, ShortlistEntry>
    isLoading: boolean
    isError: boolean
    shortlistedCount: number
    refreshShortlist: () => Promise<void>
    handleShortlistToggle: (experienceId: string) => Promise<void>
    shortlistLoadingIds: Record<string, boolean>
}

/**
 * Create the context
 */
const ShortlistedExperiencesContext = createContext<ShortlistedExperiencesContextType | undefined>(undefined)

/**
 * Provider component
 * Fetches all shortlisted experiences for the trip in scope.
 *
 * `tripId` lets the caller pin the provider to a specific trip (e.g. the
 * tripboard URL's tripId) instead of falling through to the global
 * `activeTrip.trip_id`. This matters when the user is viewing a tripboard
 * that isn't their server-side active trip — without an explicit override
 * the shortlist API call and the toggle handler would otherwise target
 * the wrong trip.
 */
export const ShortlistedExperiencesProvider = ({
    children,
    tripId
}: {
    children: React.ReactNode
    tripId?: string | null
}) => {
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = tripId ?? activeTrip?.trip_id ?? null
    const { isAuthenticated } = useAuth()
    const { openLoginModal } = useLoginModal()
    const queryClient = useQueryClient()

    const [shortlistState, setShortlistState] = useState<Record<string, ShortlistEntry>>({})
    const [isLoading, setIsLoading] = useState(false)
    const [isError, setIsError] = useState(false)
    const [shortlistLoadingIds, setShortlistLoadingIds] = useState<Record<string, boolean>>({})

    // Re-entrancy guards. ``fetchingRef`` blocks a second pagination loop from
    // running while one is already in flight; ``pendingRef`` records that a
    // refetch was requested mid-flight so we run exactly one more pass when the
    // current one finishes (no lost update, no stacked loops). This matters
    // because the shortlist-changed listener below can fire ``fetch`` in rapid
    // succession (every toggle, from any surface, across every mounted
    // provider instance) — without the guard those calls used to stack into
    // overlapping unbounded ``while`` loops that hammered the API and could
    // spike memory enough to crash the tab.
    const fetchingRef = useRef(false)
    const pendingRef = useRef(false)

    // Fetch all shortlisted experiences with pagination. Skipped entirely
    // for unauthenticated users — the endpoint requires auth and would
    // 401, which the global axios interceptor would turn into a redirect.
    // Unauthenticated viewers should be able to browse the rest of the
    // tripboard without that happening.
    const fetchShortlistedExperiences = useCallback(async () => {
        if (!activeTripId || !isAuthenticated) {
            setShortlistState({})
            setIsLoading(false)
            setIsError(false)
            return
        }

        // Already fetching — mark dirty and bail instead of opening a second
        // concurrent pagination loop. The in-flight pass re-runs once on exit.
        if (fetchingRef.current) {
            pendingRef.current = true
            return
        }
        fetchingRef.current = true

        setIsLoading(true)
        setIsError(false)

        const aggregated: Record<string, ShortlistEntry> = {}
        let page = 1
        const limit = 100
        // Hard safety cap (50 * 100 = 5000 shortlisted items). Bounds the loop
        // so a backend that returns ``has_more: true`` indefinitely — or an
        // empty page with the flag still set — can never spin forever.
        const MAX_PAGES = 50

        try {
            while (page <= MAX_PAGES) {
                const response = await getShortlistedByTrip({
                    tripId: activeTripId,
                    baseCityIds: undefined,
                    page,
                    limit
                })

                const results = response.results ?? []
                results.forEach((item) => {
                    const experienceId = item.experience?.id || item.experience_id
                    if (!experienceId) {
                        return
                    }

                    aggregated[experienceId] = {
                        experienceId,
                        isShortlisted: item.is_traveler_shortlisted ?? true
                    }
                })

                // Stop on the last page OR an empty page — the empty-page guard
                // protects against a ``has_more`` contract bug looping forever.
                if (!response.has_more || results.length === 0) {
                    break
                }

                page += 1
            }

            setShortlistState(aggregated)
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to fetch shortlisted experiences', error)
            setIsError(true)
            setShortlistState({})
        } finally {
            setIsLoading(false)
            fetchingRef.current = false
            // A refetch was requested while this one ran — service it once now.
            if (pendingRef.current) {
                pendingRef.current = false
                void fetchShortlistedExperiences()
            }
        }
    }, [activeTripId, isAuthenticated])

    // Fetch shortlisted experiences when active trip changes. The re-entrancy
    // guard now lives inside ``fetchShortlistedExperiences`` so every caller
    // (this effect and the shortlist-changed listener) is protected uniformly.
    useEffect(() => {
        void fetchShortlistedExperiences()
    }, [fetchShortlistedExperiences])

    // Refetch the count + invalidate the other surfaces' caches whenever any
    // surface toggles shortlist (event fired from bulkUpsertTripExperiences).
    useEffect(() => {
        return addShortlistChangedListener(() => {
            void fetchShortlistedExperiences()
            void queryClient.invalidateQueries({ queryKey: ['shortlistedByTrip'] })
            void queryClient.invalidateQueries({ queryKey: ['tripboard-activities-shortlisted'] })
        })
    }, [fetchShortlistedExperiences, queryClient])

    // Compute shortlisted count
    const shortlistedCount = useMemo(
        () =>
            Object.values(shortlistState).reduce((count, entry) => {
                return entry.isShortlisted ? count + 1 : count
            }, 0),
        [shortlistState]
    )

    // Handle shortlist toggle — optimistic: flip local state immediately,
    // then reconcile by refetching. Reverts on API failure.
    const handleShortlistToggle = useCallback(
        async (experienceId: string) => {
            if (!experienceId) {
                return
            }

            // Unauthenticated viewers: open the existing login modal
            // (same one used at the end of the tripboard creation flow)
            // instead of redirecting to /login. Lets them stay on the
            // tripboard so the modal closes cleanly back to where they
            // were once auth resolves.
            if (!isAuthenticated) {
                openLoginModal({
                    redirectAfterLogin: false,
                    buttonPage: 'tripboard_v1'
                })
                return
            }

            if (!activeTripId) {
                dispatchOpenTripCreationModal({ source: 'experiences-card' })
                return
            }

            const previousEntry = shortlistState[experienceId]
            const previousState = previousEntry?.isShortlisted ?? false
            const nextState = !previousState

            // Optimistic update
            setShortlistState((prev) => ({
                ...prev,
                [experienceId]: { experienceId, isShortlisted: nextState }
            }))
            setShortlistLoadingIds((prev) => ({ ...prev, [experienceId]: true }))

            try {
                await bulkUpsertTripExperiences(activeTripId, {
                    trip_id: activeTripId,
                    experiences: [
                        {
                            experience_id: experienceId,
                            is_traveler_shortlisted: nextState
                        }
                    ]
                })

                // Refetch is handled by the shortlist-changed listener above
                // (no explicit refetch here = no double fetch per toggle).
                toast.success(nextState ? 'Added to wishlist' : 'Removed from wishlist')
            } catch (error) {
                // Revert optimistic update
                setShortlistState((prev) => ({
                    ...prev,
                    [experienceId]: { experienceId, isShortlisted: previousState }
                }))
                // eslint-disable-next-line no-console
                console.error('Failed to update shortlist', error)
                toast.error('Could not update shortlist. Please try again.')
            } finally {
                setShortlistLoadingIds((prev) => {
                    const next = { ...prev }
                    delete next[experienceId]
                    return next
                })
            }
        },
        [activeTripId, shortlistState, isAuthenticated, openLoginModal]
    )

    const value: ShortlistedExperiencesContextType = useMemo(
        () => ({
            shortlistState,
            isLoading,
            isError,
            shortlistedCount,
            refreshShortlist: fetchShortlistedExperiences,
            handleShortlistToggle,
            shortlistLoadingIds
        }),
        [shortlistState, isLoading, isError, shortlistedCount, fetchShortlistedExperiences, handleShortlistToggle, shortlistLoadingIds]
    )

    return <ShortlistedExperiencesContext.Provider value={value}>{children}</ShortlistedExperiencesContext.Provider>
}

/**
 * Hook to use the shortlisted experiences context
 */
export const useShortlistedExperiences = (): ShortlistedExperiencesContextType => {
    const context = useContext(ShortlistedExperiencesContext)
    if (context === undefined) {
        throw new Error('useShortlistedExperiences must be used within a ShortlistedExperiencesProvider')
    }
    return context
}

/**
 * Optional hook that returns undefined if not within provider
 */
export const useOptionalShortlistedExperiences = (): ShortlistedExperiencesContextType | undefined => {
    return useContext(ShortlistedExperiencesContext)
}
