import { useState, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { bulkUpsertTripExperiences, getShortlistedByTrip } from '@/modules/Experiences/api/experienceShortlistAPI'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { toast } from 'sonner'
import { dispatchOpenTripCreationModal } from '@/lib/events/tripCreationModalEvents'
import { ExperienceWithShort } from '../../api/watchAlongApi'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useLoginModal } from '@/modules/Onboarding/context/LoginModalContext'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

interface UseShortsModalShortlistParams {
    experiences: ExperienceWithShort[]
    isOpen: boolean
}

export const useShortsModalShortlist = ({ experiences, isOpen }: UseShortsModalShortlistParams) => {
    const [shortlistLoadingIds, setShortlistLoadingIds] = useState<Record<string, boolean>>({})
    const queryClient = useQueryClient()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null
    const { isAuthenticated } = useAuth()
    const { openLoginModal } = useLoginModal()
    const { trackButtonClick } = usePostHog()

    // Create stable reference for experience IDs to prevent unnecessary re-fetches
    const experienceIds = useMemo(() => {
        return experiences.map((exp) => exp.id)
    }, [experiences])

    // Sort IDs for stable query key
    const sortedExperienceIds = useMemo(() => [...experienceIds].sort().join(','), [experienceIds])

    // Fetch shortlist status using React Query
    const { data: shortlistData } = useQuery({
        queryKey: ['shortlistedByTrip', activeTripId, 'shortsModal', sortedExperienceIds],
        queryFn: () =>
            getShortlistedByTrip({
                tripId: activeTripId!,
                baseCityIds: '',
                page: 1,
                limit: 100
            }),
        enabled: isOpen && !!activeTripId && experienceIds.length > 0
    })

    // Build shortlist state from query data
    const shortlistState = useMemo(() => {
        const state: Record<string, { experienceId: string; isShortlisted: boolean }> = {}
        if (shortlistData?.results) {
            const experienceIdsSet = new Set(experienceIds)
            shortlistData.results.forEach((result) => {
                const experienceId = result.experience?.id || result.experience_id
                if (experienceId && experienceIdsSet.has(experienceId)) {
                    state[experienceId] = {
                        experienceId,
                        isShortlisted: result.is_traveler_shortlisted ?? false
                    }
                }
            })
        }
        return state
    }, [shortlistData, experienceIds])

    // Open the login modal in place of a full-page redirect. The shorts
    // modal usually overlays a tripboard or experiences page that the
    // unauthenticated viewer should be able to keep watching; bouncing
    // them to /login throws away that context. After they sign in via
    // the modal they stay exactly where they were.
    const promptLogin = useCallback(() => {
        openLoginModal({ redirectAfterLogin: false })
    }, [openLoginModal])

    // Handle shortlist toggle
    const handleShortlistToggle = useCallback(
        async (experienceId: string) => {
            if (!experienceId) {
                return
            }
            
             // Find experience data for tracking
            const experience = experiences.find((exp) => exp.id === experienceId)
            const experienceName = experience?.name || 'Unknown'

            // Track for logged-out users (before redirect)
            if (!isAuthenticated) {
                trackButtonClick({
                    button_name: 'Shortlist Button',
                    location: 'Shorts Modal',
                    extra: {
                        experienceId,
                        experienceName,
                        isAuthenticated: false,
                        action: 'open_login_modal'
                    }
                })
                promptLogin()
                return
            }

            if (!activeTripId) {
                trackButtonClick({
                    button_name: 'Shortlist Button',
                    location: 'Shorts Modal',
                    extra: {
                        experienceId,
                        experienceName,
                        isAuthenticated: true,
                        action: 'open_trip_creation_modal'
                    }
                })
                dispatchOpenTripCreationModal({ source: 'experiences-card' })
                return
            }

            const existingEntry = shortlistState[experienceId]
            const nextState = !(existingEntry?.isShortlisted ?? false)

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

                // Invalidate query to refetch shortlist status
                queryClient.invalidateQueries({ queryKey: ['shortlistedByTrip', activeTripId] })

                trackButtonClick({
                    button_name: 'Shortlist Button',
                    location: 'Shorts Modal',
                    extra: {
                        experienceId,
                        experienceName,
                        isAuthenticated: true,
                        action: nextState ? 'added_to_wishlist' : 'removed_from_wishlist',
                        tripId: activeTripId
                    }
                })
                toast.success(nextState ? 'Added to wishlist' : 'Removed from wishlist')
            } catch {
                toast.error('Could not update shortlist. Please try again.')
            } finally {
                setShortlistLoadingIds((prev) => {
                    const next = { ...prev }
                    delete next[experienceId]
                    return next
                })
            }
        },
        [activeTripId, shortlistState, queryClient, isAuthenticated, promptLogin, experiences, trackButtonClick]
    )

    // Get shortlist status for a specific experience
    const getShortlistStatus = useCallback(
        (experienceId: string) => {
            const entry = shortlistState[experienceId]
            return {
                isShortlisted: entry?.isShortlisted ?? false,
                isShortlisting: Boolean(shortlistLoadingIds[experienceId])
            }
        },
        [shortlistState, shortlistLoadingIds]
    )

    return {
        handleShortlistToggle,
        getShortlistStatus
    }
}
