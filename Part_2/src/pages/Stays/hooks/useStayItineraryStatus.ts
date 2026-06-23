import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useQuery } from '@tanstack/react-query'
import { importCompletedItinerary } from '@/modules/Itinerary/hooks/ItineraryHook'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

/**
 * Returns whether the given stay (by zentrum_hub_id) is already in the
 * active trip's itinerary. Only meaningful on /tripboard routes.
 *
 * Uses the completed-itinerary React Query cache (same key as
 * useItineraryCompletedData) so it is always in sync and never makes an
 * extra network call when the data is already warm.
 */
export function useStayItineraryStatus(zentrumHubId?: string): {
    isTripboardRoute: boolean
    isStayInItinerary: boolean
    canAddStayToItinerary: boolean
    activeItineraryId: string | null
} {
    const travelerTripsCtx = useOptionalTravelerTrips()
    const isTripboardRoute =
        typeof window !== 'undefined' && window.location.pathname.startsWith('/tripboard')

    const tripId = travelerTripsCtx?.activeTrip?.trip_id
    const itinFromCtx = tripId ? travelerTripsCtx?.tripItineraries?.[tripId] : null
    // activeTrip.tripItinerary is populated as soon as the context fetches the itinerary list.
    const activeItineraryId =
        travelerTripsCtx?.activeTrip?.tripItinerary?.id ?? itinFromCtx?.id ?? null

    // Read stays from the completed-itinerary cache (same key as useItineraryCompletedData).
    // When data is already cached this resolves instantly with no extra network call.
    const { data: completedData } = useQuery({
        queryKey: ['itineraryCompleted', activeItineraryId ?? ''],
        queryFn: () => importCompletedItinerary(activeItineraryId!),
        enabled: isTripboardRoute && Boolean(activeItineraryId),
        staleTime: HOURS_24,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
    })

    const stays = completedData?.stays

    const isStayInItinerary =
        isTripboardRoute &&
        Boolean(zentrumHubId) &&
        (stays?.some((s) => s.zentrum_hub_id === zentrumHubId) ?? false)

    const canAddStayToItinerary = Boolean(activeItineraryId && zentrumHubId)

    return { isTripboardRoute, isStayInItinerary, canAddStayToItinerary, activeItineraryId }
}
