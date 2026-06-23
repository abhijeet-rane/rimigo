import React, { createContext, useContext, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTravelerTrips, TravelerTripsData, TripItineraryLite, getActiveTrip, setActiveTrip, type ActiveTripResponse } from '../api/travelerTrips'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { getBasicTripData, GetBasicTripDataDataResponse } from '@/modules/Onboarding/api/onboardingAPI'
import { updateTripProfilePartial, UpdateTripProfileData } from '@/api/tripProfileAPI/tripProfileAPI'
import { updateTripPreferences, UpdateTripPreferenceRequest, type GroupSetup } from '@/api/tripPreferencesAPI/tripPreferencesAPI'
import { updateTripPartial, UpdateTripData } from '@/api/trip/tripAPI'
import { getTripItinerariesByTrip, createTripItinerary, type TripItinerary } from '@/api/itineraryApi'
import LogoLoadingScreen from '@/components/shared/LogoLoadingScreen'
import { SideBarLayout } from '@/components/layouts/SideBarLayout'

/**
 * Context type
 */
type TravelerTripsContextType = {
    tripsData: TravelerTripsData | undefined
    isLoading: boolean
    isHydrating: boolean
    error: unknown
    activeTripId: string | null
    activeTrip:
        | (TravelerTripsData['trips'][number] & {
              tripProfile?: GetBasicTripDataDataResponse['data']
              tripItinerary?: TripItineraryLite
              itineraryRoute?: TripItineraryLite['route']
          })
        | undefined
    updateActiveTrip: (tripId: string, options?: { force?: boolean; replaceOnly?: boolean ;  navigateTo?: string}) => Promise<void>
    tripProfiles: Record<string, GetBasicTripDataDataResponse['data'] | null | undefined>
    tripItineraries: Record<string, TripItinerary | null | undefined>
    updateTripPurpose: (data: UpdateTripProfileData) => Promise<void>
    updateTripAccommodationAndExperiences: (data: UpdateTripPreferenceRequest) => Promise<void>
    updateTripDestinations: (data: UpdateTripData) => Promise<void>
    updateTripDates: (data: UpdateTripProfileData) => Promise<void>
    updateGroupSetup: (data: GroupSetup) => Promise<void>
    updateTripName: (name: string, tripId?: string) => Promise<void>
}

/**
 * Create the context
 */
const TravelerTripsContext = createContext<TravelerTripsContextType | undefined>(undefined)

/**
 * Provider component
 */
export const TravelerTripsProvider = ({ travelerId, children }: { travelerId: string; children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth()
    const queryClient = useQueryClient()
    const { data, isLoading, error } = useQuery<TravelerTripsData>({
        queryKey: ['travelerTrips', travelerId],
        queryFn: () => getTravelerTrips(travelerId),
        enabled: isAuthenticated && !!travelerId,
        gcTime: 0,
        staleTime: 0
    })

    const [activeTripId, setActiveTripId] = useState<string | null>(null)
    const [tripProfiles, setTripProfiles] = useState<Record<string, GetBasicTripDataDataResponse['data'] | null | undefined>>({})
    const [tripItineraries, setTripItineraries] = useState<Record<string, TripItinerary | null | undefined>>({})
    const [activeTripApiData, setActiveTripApiData] = useState<ActiveTripResponse['data'] | null>(null)
    const fetchingProfilesRef = useRef<Set<string>>(new Set())
    const fetchingItinerariesRef = useRef<Set<string>>(new Set())
    const [activeTripFetched, setActiveTripFetched] = useState(false)
    const isResolvingActiveTrip = isAuthenticated && data?.trips?.length && !activeTripFetched

    // Fetch active trip from backend after trips are loaded
    useEffect(() => {
        if (!data?.trips?.length || !isAuthenticated || activeTripFetched) return

        const fetchActiveTripId = async () => {
            try {
                const response = await getActiveTrip()
                const backendActiveTripId = response.data.active_trip_id
                setActiveTripApiData(response.data)
                const tripExists = data.trips.some((t) => t.trip_id === backendActiveTripId)
                if (tripExists) {
                    setActiveTripId(backendActiveTripId)
                } else if (!activeTripId) {
                    setActiveTripId(data.trips[0].trip_id)
                }
            } catch {
                setActiveTripApiData(null)
                if (!activeTripId) {
                    setActiveTripId(data.trips[0].trip_id)
                }
            } finally {
                setActiveTripFetched(true)
            }
        }
        fetchActiveTripId()
    }, [data, isAuthenticated, activeTripFetched])

    const activeTrip = useMemo(() => {
        if (!data?.trips?.length) return undefined
        if (!activeTripId) return undefined
        return data.trips.find((trip) => trip.trip_id === activeTripId)
    }, [data, activeTripId])
    const fetchedOnceRef = useRef(false)

    useEffect(() => {
        if (!activeTrip?.trip_id) {
            return
        }
        if (fetchedOnceRef.current) return
        const tripId = activeTrip.trip_id
        if (!tripId) return
        if (tripProfiles[tripId] || fetchingProfilesRef.current.has(tripId)) {
            return
        }

        fetchingProfilesRef.current.add(tripId)
        let isCancelled = false

        const fetchProfile = async () => {
            try {
                const response = await getBasicTripData(tripId)
                if (isCancelled) return
                setTripProfiles((prev) => ({ ...prev, [tripId]: response.data }))
            } catch (err) {
                console.error('Failed to fetch trip profile', err)
                setTripProfiles((prev) => ({ ...prev, [tripId]: null }))
            } finally {
                fetchingProfilesRef.current.delete(tripId)
            }
        }

        void fetchProfile()

        return () => {
            isCancelled = true
        }
    }, [activeTrip?.trip_id])

    useEffect(() => {
        if (!activeTrip?.trip_id) {
            return
        }

        const tripId = activeTrip.trip_id

        if (tripItineraries[tripId] !== undefined || fetchingItinerariesRef.current.has(tripId)) {
            return
        }

        fetchingItinerariesRef.current.add(tripId)
        let isCancelled = false

        const fetchItinerary = async () => {
            try {
                let itineraries = await getTripItinerariesByTrip(tripId, 1, 10)
                const hasExistingItinerary = Array.isArray(itineraries) && itineraries.some((item) => item && item.id)

                if (!isCancelled && !hasExistingItinerary) {
                    await createTripItinerary({ trip_id: tripId, status: 'draft' })
                    itineraries = await getTripItinerariesByTrip(tripId, 1, 10)
                }

                if (isCancelled) return

                let itinerary: TripItinerary | null = null
                if (Array.isArray(itineraries)) {
                    itinerary = itineraries.find((item) => item && item.route && Object.keys(item.route).length > 0) ?? itineraries[0] ?? null
                }

                setTripItineraries((prev) => ({ ...prev, [tripId]: itinerary ?? null }))
            } catch (err) {
                console.error('Failed to fetch trip itinerary', err)
                setTripItineraries((prev) => ({ ...prev, [tripId]: null }))
            } finally {
                fetchingItinerariesRef.current.delete(tripId)
            }
        }

        void fetchItinerary()

        return () => {
            isCancelled = true
        }
    }, [activeTrip?.trip_id, tripItineraries])

    const enrichedActiveTrip = useMemo(() => {
        if (!activeTrip) return undefined
        const tripId = activeTrip.trip_id
        const profile = tripId ? tripProfiles[tripId] : undefined
        const itinerary = tripId ? tripItineraries[tripId] : undefined

        const activeTripOwner =
            activeTripApiData?.active_trip_id === activeTrip.trip_id ? activeTripApiData.owner : undefined

        if (!profile && !itinerary && !activeTripOwner) return activeTrip

        return {
            ...activeTrip,
            ...(activeTripOwner ? { owner: activeTripOwner } : {}),
            ...(profile ? { tripProfile: profile } : {}),
            ...(itinerary
                ? {
                      tripItinerary: {
                          id: itinerary.id,
                          status: itinerary.status,
                          route: itinerary.route,
                          route_summary: itinerary.route_summary
                      } as TripItineraryLite,
                      itineraryRoute: itinerary.route
                  }
                : {})
        }
    }, [activeTrip, tripProfiles, tripItineraries, activeTripApiData])
    useEffect(() => {
        if (enrichedActiveTrip) {
            TripEvents.emitActiveTrip(enrichedActiveTrip)
        }
    }, [enrichedActiveTrip])
    const updateActiveTrip = useCallback(
        // navigateTo props allows redirecting to a specific route after setting active trip
        async (tripId: string, options?: { force?: boolean; replaceOnly?: boolean; navigateTo?: string }) => {
            const shouldValidate = !options?.force
            if (shouldValidate) {
                if (!data?.trips?.length) return
                if (!data.trips.some((trip) => trip.trip_id === tripId)) return
            }

            const triggerRefresh = (opts?: { replaceOnly?: boolean ; navigateTo?: string  }) => {
                if (typeof window !== 'undefined') {
                    const { pathname, search, hash, origin } = window.location
                    const cleanUrl = opts?.navigateTo || `${pathname}${search ?? ''}${hash ?? ''}`
                    if (opts?.replaceOnly) {
                        window.history.replaceState(null, '', cleanUrl)
                    } else {
                        window.location.replace(`${origin}${cleanUrl}`)
                    }
                }
            }

            try {
                // Call backend API to set active trip
                const response = await setActiveTrip(tripId)
                setActiveTripApiData(response.data)
                // Update local state
                setActiveTripId(tripId)
                triggerRefresh({ replaceOnly: options?.replaceOnly ,  navigateTo: options?.navigateTo })
            } catch (error) {
                console.error('Failed to set active trip', error)
                setActiveTripApiData(null)
                // Still update local state even if API call fails
                setActiveTripId(tripId)
                triggerRefresh({ replaceOnly: options?.replaceOnly ,  navigateTo: options?.navigateTo })
            }
        },
        [data?.trips]
    )

    const updateTripPurpose = useCallback(
        async (updateData: UpdateTripProfileData) => {
            if (!activeTrip?.trip_id) {
                throw new Error('No active trip selected')
            }

            const tripId = activeTrip.trip_id

            // If tripProfile is not loaded yet, fetch it first
            let tripProfileId = activeTrip.tripProfile?.trip_profile_id

            if (!tripProfileId) {
                // Fetch the trip profile to get the trip_profile_id
                const profileResponse = await getBasicTripData(tripId)
                tripProfileId = profileResponse.data.trip_profile_id

                // Update the local state with the fetched profile
                setTripProfiles((prev) => ({ ...prev, [tripId]: profileResponse.data }))

                if (!tripProfileId) {
                    throw new Error('No trip profile ID found')
                }
            }

            await updateTripProfilePartial(tripProfileId, updateData)

            // Refetch the trip profile to get updated data
            const response = await getBasicTripData(tripId)
            setTripProfiles((prev) => ({ ...prev, [tripId]: response.data }))
        },
        [activeTrip?.trip_id, activeTrip?.tripProfile?.trip_profile_id]
    )

    const updateTripAccommodationAndExperiences = useCallback(
        async (updateData: UpdateTripPreferenceRequest) => {
            if (!activeTrip?.trip_id) {
                throw new Error('No active trip selected')
            }

            const tripId = activeTrip.trip_id

            // The API expects trip_id, not trip_preferences_id
            await updateTripPreferences(tripId, updateData)

            // Invalidate trips list so trip_preference updates (e.g., experiences_preferences) reflect on activeTrip
            await queryClient.invalidateQueries({ queryKey: ['travelerTrips', travelerId] })

            // Refetch the trip profile to keep tripProfile in sync as well
            const response = await getBasicTripData(tripId)
            setTripProfiles((prev) => ({ ...prev, [tripId]: response.data }))
        },
        [activeTrip?.trip_id, queryClient, travelerId]
    )

    const updateTripDestinations = useCallback(
        async (updateData: UpdateTripData) => {
            if (!activeTrip?.trip_id) {
                throw new Error('No active trip selected')
            }

            const tripId = activeTrip.trip_id

            await updateTripPartial(tripId, updateData)

            // Invalidate and refetch the traveler trips query to get updated destinations
            await queryClient.invalidateQueries({ queryKey: ['travelerTrips', travelerId] })

            // Also refetch the trip profile
            const response = await getBasicTripData(tripId)
            setTripProfiles((prev) => ({ ...prev, [tripId]: response.data }))
        },
        [activeTrip?.trip_id, queryClient, travelerId]
    )

    const updateTripDates = useCallback(
        async (updateData: UpdateTripProfileData) => {
            if (!activeTrip?.trip_id) {
                throw new Error('No active trip selected')
            }

            const tripId = activeTrip.trip_id

            // If tripProfile is not loaded yet, fetch it first
            let tripProfileId = activeTrip.tripProfile?.trip_profile_id

            if (!tripProfileId) {
                // Fetch the trip profile to get the trip_profile_id
                const profileResponse = await getBasicTripData(tripId)
                tripProfileId = profileResponse.data.trip_profile_id

                // Update the local state with the fetched profile
                setTripProfiles((prev) => ({ ...prev, [tripId]: profileResponse.data }))

                if (!tripProfileId) {
                    throw new Error('No trip profile ID found')
                }
            }

            await updateTripProfilePartial(tripProfileId, updateData)

            // Refetch the trip profile to get updated data
            const response = await getBasicTripData(tripId)
            setTripProfiles((prev) => ({ ...prev, [tripId]: response.data }))
        },
        [activeTrip?.trip_id, activeTrip?.tripProfile?.trip_profile_id]
    )

    const updateTripName = useCallback(
        async (name: string, tripId?: string) => {
            const targetTripId = tripId ?? activeTrip?.trip_id
            if (!targetTripId) {
                throw new Error('No trip id provided and no active trip selected')
            }
            await updateTripPartial(targetTripId, { name })
            await queryClient.invalidateQueries({ queryKey: ['travelerTrips', travelerId] })
        },
        [activeTrip?.trip_id, queryClient, travelerId]
    )

    const updateGroupSetup = useCallback(
        async (groupSetupData: GroupSetup) => {
            if (!activeTrip?.trip_id) {
                throw new Error('No active trip selected')
            }

            const tripId = activeTrip.trip_id

            // Call API to update group setup
            await updateTripPreferences(tripId, {
                group_setup: groupSetupData
            })

            // Invalidate trips list so trip_preference.group_setup reflects on activeTrip
            await queryClient.invalidateQueries({ queryKey: ['travelerTrips', travelerId] })

            // Refetch the trip profile to keep tripProfile in sync as well
            const response = await getBasicTripData(tripId)
            setTripProfiles((prev) => ({ ...prev, [tripId]: response.data }))
        },
        [activeTrip?.trip_id, queryClient, travelerId]
    )

    const hasTrips = Boolean(data?.trips?.length)
    const activeTripIdValue = activeTrip?.trip_id
    const profileLoaded = !activeTripIdValue || Object.prototype.hasOwnProperty.call(tripProfiles, activeTripIdValue)
    const itineraryLoaded = !activeTripIdValue || Object.prototype.hasOwnProperty.call(tripItineraries, activeTripIdValue)
    const profileFetching = activeTripIdValue ? fetchingProfilesRef.current.has(activeTripIdValue) : false
    const itineraryFetching = activeTripIdValue ? fetchingItinerariesRef.current.has(activeTripIdValue) : false
    const isHydratingActiveTrip = hasTrips && (profileFetching || itineraryFetching || !profileLoaded || !itineraryLoaded)
    const shouldShowLoadingScreen = isAuthenticated && (!travelerId || isLoading ||  isResolvingActiveTrip || isHydratingActiveTrip) && !error

    const value = useMemo(
        () => ({
            tripsData: data,
            isLoading,
            isHydrating: shouldShowLoadingScreen,
            error,
            activeTripId,
            activeTrip: enrichedActiveTrip,
            updateActiveTrip,
            tripProfiles,
            tripItineraries,
            updateTripPurpose,
            updateTripAccommodationAndExperiences,
            updateTripDestinations,
            updateTripDates,
            updateGroupSetup,
            updateTripName
        }),
        [
            data,
            isLoading,
            shouldShowLoadingScreen,
            error,
            activeTripId,
            enrichedActiveTrip,
            updateActiveTrip,
            tripProfiles,
            tripItineraries,
            updateTripPurpose,
            updateTripAccommodationAndExperiences,
            updateTripDestinations,
            updateTripDates,
            updateGroupSetup,
            updateTripName
        ]
    )

    return (
        <TravelerTripsContext.Provider value={value}>
            {shouldShowLoadingScreen ? (
                <SideBarLayout>
                    {/* Viewport-centred fixed overlay (z-50 — below the rail z-1000) so the
                        compass sits at the true screen centre, matching the tripboard page-shell
                        compass exactly. Keeps it from drifting right of centre / shifting when
                        the tripboard header mounts. */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F9F7FF]">
                        <LogoLoadingScreen />
                    </div>
                </SideBarLayout>
            ) : (
                children
            )}
        </TravelerTripsContext.Provider>
    )
}

/**
 * Hook to use trips context
 */
// Standalone Itinerary-Skeleton build: no TravelerTripsProvider is mounted. The
// Itinerary view is driven by the URL itinerary id + the mocked /complete/
// endpoint, so consumers only need a benign empty trips context. Returning a
// stable default keeps components like SearchHeaderCalendar rendering.
const DEMO_TRAVELER_TRIPS_CONTEXT: TravelerTripsContextType = {
    tripsData: undefined,
    isLoading: false,
    isHydrating: false,
    error: null,
    activeTripId: null,
    activeTrip: undefined,
    updateActiveTrip: async () => {},
    tripProfiles: {},
    tripItineraries: {},
    updateTripPurpose: async () => {},
    updateTripAccommodationAndExperiences: async () => {},
    updateTripDestinations: async () => {},
    updateTripDates: async () => {},
    updateGroupSetup: async () => {},
    updateTripName: async () => {}
}

export const useTravelerTrips = () => {
    const context = useContext(TravelerTripsContext)
    return context ?? DEMO_TRAVELER_TRIPS_CONTEXT
}

export const useOptionalTravelerTrips = () => {
    return useContext(TravelerTripsContext)
}
type TripEventCallback = (trip: any) => void

const listeners = new Set<TripEventCallback>()

export const TripEvents = {
    subscribe(callback: TripEventCallback) {
        listeners.add(callback)
        return () => listeners.delete(callback)
    },

    emitActiveTrip(trip: any) {
        listeners.forEach((cb) => cb(trip))
    }
}
