import { useMemo } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { getTripItinerariesByTrip } from '@/api/itineraryApi'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'

/**
 * Resolves all identifier inputs the Tripboard page renders from, in ONE
 * place. The page (and any downstream debugger) must NEVER read tripId or
 * itineraryId from a different source — that's how we previously rendered
 * the viewer's active trip on top of a pasted, non-owned tripboard URL.
 *
 * Sources of truth, in priority order:
 *   tripId:
 *     1. `/tripboard/:tripId` route param.
 *     2. `?trip_id=` legacy query param.
 *     3. Context's `activeTripId` (last-resort fallback, only used when the
 *        URL is bare `/tripboard`).
 *     - `/tripboard/new` short-circuits to `null` (pre-trip create flow).
 *
 *   itineraryId:
 *     - If URL trip == context active trip → read the id from context (no
 *       extra fetch).
 *     - Else → fetch the URL trip's itineraries via
 *       `getTripItinerariesByTrip` and pick the first hydrated one (prefer
 *       the one with a non-empty route, mirroring
 *       `travelerTripsContext.tripItineraries`).
 *
 * Exposes a debug snapshot so any "wrong itinerary is showing" investigation
 * can log a single object instead of bolting `console.log` into the page.
 */


export interface TripboardIds {
    /** Trip id this page is rendering (URL is authoritative). null on `/tripboard/new`. */
    tripId: string | null
    /** Trip name for `tripId`, resolved from context or the fetched itinerary. null until ready. */
    tripName: string | null
    /** Itinerary id resolved for `tripId` (NOT the viewer's active trip). '' until ready. */
    itineraryId: string
    /** True when the URL trip matches the viewer's active trip. Fast path: no extra fetch. */
    isViewingActiveTrip: boolean
    /** True on `/tripboard/new`. */
    isPreTripPath: boolean
    /** Itinerary lookup is in flight (only fires when not viewing active trip). */
    isItineraryIdLoading: boolean

}

export function useTripboardIds(): TripboardIds {
    const { tripId: tripIdFromParams } = useParams<{ tripId: string }>()
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const travelerTripsContext = useOptionalTravelerTrips()

    const isPreTripPath = location.pathname === '/tripboard/new' || location.pathname === '/tripboard/new/'
    const tripIdFromRoute = tripIdFromParams || undefined
    const tripIdFromSearchParam = searchParams.get('trip_id')
    const tripIdFromContext = travelerTripsContext?.activeTripId ?? null

    const tripId: string | null = isPreTripPath
        ? null
        : tripIdFromRoute ?? tripIdFromSearchParam ?? tripIdFromContext

    const activeTripItineraryId = travelerTripsContext?.activeTrip?.tripItinerary?.id ?? ''
    const activeTripName = travelerTripsContext?.activeTrip?.name ?? null
    const isViewingActiveTrip = !!tripId && travelerTripsContext?.activeTrip?.trip_id === tripId

    // Fetch itineraries for the URL trip only when we can't reuse the context's
    // active-trip itinerary id. Caching matches the rest of the page (no stale
    // reads — itinerary changes need to reflect immediately).
    const { data: urlTripItineraries, isLoading: isUrlItineraryLoading } = useQuery({
        queryKey: ['tripboard-itinerary-for-trip', tripId],
        queryFn: async () => (tripId ? await getTripItinerariesByTrip(tripId, 1, 10) : []),
        enabled: !!tripId && !isViewingActiveTrip,
        staleTime: 0,
        gcTime: 0,
    })

    const resolvedItinerary = useMemo(() => {
        const arr = urlTripItineraries
        if (!Array.isArray(arr) || arr.length === 0) return null
        const withRoute = arr.find((it) => it && it.route && Object.keys(it.route).length > 0)
        return withRoute ?? arr[0] ?? null
    }, [urlTripItineraries])

    const itineraryId = useMemo(() => {
        if (isViewingActiveTrip) return activeTripItineraryId
        return resolvedItinerary?.id ?? ''
    }, [isViewingActiveTrip, activeTripItineraryId, resolvedItinerary])

    const tripName = useMemo(() => {
        if (isViewingActiveTrip) return activeTripName
        return resolvedItinerary?.trip?.name ?? null
    }, [isViewingActiveTrip, activeTripName, resolvedItinerary])

    return {
        tripId,
        tripName,
        itineraryId,
        isViewingActiveTrip,
        isPreTripPath,
        isItineraryIdLoading: !isViewingActiveTrip && !!tripId && isUrlItineraryLoading,
    }
}
