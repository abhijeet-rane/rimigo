import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { bulkUpsertTripExperiences, getShortlistedByTrip } from '@/modules/Experiences/api/experienceShortlistAPI'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { toast } from 'sonner'
import { dispatchOpenTripCreationModal } from '@/lib/events/tripCreationModalEvents'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useLoginModal } from '@/modules/Onboarding/context/LoginModalContext'

interface UseSneakPeekShortlistParams {
    experienceId: string
    isOpen: boolean
    /**
     * Caller-provided fallback trip id. Used when the global active trip
     * context isn't populated (e.g. the user opened the sneak peek from a
     * surface that knows its trip but hasn't selected it as the active
     * trip system-wide — Tripboard activities tab is one such case).
     */
    fallbackTripId?: string
}

export const useSneakPeekShortlist = ({ experienceId, isOpen, fallbackTripId }: UseSneakPeekShortlistParams) => {
    const [isShortlisting, setIsShortlisting] = useState(false)
    const queryClient = useQueryClient()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? fallbackTripId ?? null
    const { isAuthenticated } = useAuth()
    const { openLoginModal } = useLoginModal()

    // Fetch shortlist status (auth-gated — endpoint requires a JWT)
    const { data: shortlistData } = useQuery({
        queryKey: ['shortlistedByTrip', activeTripId, experienceId],
        queryFn: () =>
            getShortlistedByTrip({
                tripId: activeTripId!,
                baseCityIds: '',
                page: 1,
                limit: 100
            }),
        enabled: isOpen && !!activeTripId && !!experienceId && isAuthenticated
    })

    const isShortlisted =
        shortlistData?.results?.some(
            (result) => (result.experience?.id === experienceId || result.experience_id === experienceId) && result.is_traveler_shortlisted
        ) ?? false

    // Handle shortlist toggle
    const handleShortlistToggle = async () => {
        // Auth gate: unauthenticated viewers see the login modal instead
        // of the shortlist API attempt (which would 401 and trip the
        // global axios interceptor's redirect to /login).
        if (!isAuthenticated) {
            openLoginModal({ redirectAfterLogin: false })
            return
        }
        if (!activeTripId) {
            dispatchOpenTripCreationModal({ source: 'experiences-card' })
            return
        }

        setIsShortlisting(true)
        const nextState = !isShortlisted

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

            toast.success(nextState ? 'Added to wishlist' : 'Removed from wishlist')

            // Invalidate query to refetch shortlist status
            queryClient.invalidateQueries({ queryKey: ['shortlistedByTrip', activeTripId, experienceId] })
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to update shortlist', error)
            toast.error('Could not update shortlist. Please try again.')
        } finally {
            setIsShortlisting(false)
        }
    }

    return {
        isShortlisted,
        isShortlisting,
        handleShortlistToggle
    }
}
