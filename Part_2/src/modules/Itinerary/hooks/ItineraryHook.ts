import { getAllCitiesByCountry } from '@/api/locationApi'
import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { useEffect, useState } from 'react'
import {
    getCountryItineraryStatus,
    addItineraryDay,
    updateItineraryDay,
    deleteItineraryDay,
    resetItineraryDay,
    switchItineraryDay,
    fetchRouteSummary,
    AddItineraryDayPayload,
    UpdateItineraryDayPayload,
    SwitchItineraryDayPayload
} from '@/api/itineraryApi'
import { useMutation } from '@tanstack/react-query'
import { callATAApi } from '@/api/ataAPI/ataApi'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import apiClient from '@/lib/api/apiClient'
import { ExperienceResult } from '@/modules/Acitvities/types/searchTypes'
import { globalSearch } from '@/modules/Acitvities/api/searchAPI'

export const useColumnCount = (columnWidth: number, assistantOpen: boolean): number => {
    const [cols, setCols] = React.useState<number>(5)

    React.useEffect(() => {
        function update() {
            const availableWidth = assistantOpen
                ? window.innerWidth - 400 // assistant takes 400px
                : window.innerWidth

            const count = Math.max(1, Math.floor((availableWidth - 100) / columnWidth))

            setCols(Math.min(count, 7))
        }

        update()
        window.addEventListener('resize', update)

        return () => window.removeEventListener('resize', update)
    }, [columnWidth, assistantOpen]) // 🔥 recalculates on assistant toggle

    return cols
}

export const useCitiesByCountry = (countryName: string) => {
    return useQuery({
        queryKey: ['citiesByCountry', countryName],
        queryFn: () => getAllCitiesByCountry(countryName),
        enabled: !!countryName, // only fetch if countryName is provided
        staleTime: HOURS_24 // cache for 24 hours
    })
}

export const useCountryItineraryStatus = (countryIds: string[] | undefined) => {
    return useQuery({
        queryKey: ['countryItineraryStatus', countryIds?.sort().join(',') || ''],
        queryFn: () => getCountryItineraryStatus(countryIds!),
        enabled: !!countryIds && countryIds.length > 0
    })
}

export type ItineraryAgentRequest = {
    input_data: Record<string, any>
    space: string
    trip_id: string | null
    thread_id: string | null
    entity_id: string | null
    entity_type: string | null
}

type SendItineraryParams = {
    agentId: string
    request: ItineraryAgentRequest
}

export const useSendItineraryRequest = () => {
    return useMutation({
        mutationFn: async ({ agentId, request }: SendItineraryParams) => {
            return callATAApi(agentId, {
                ...request
            })
        }
    })
}

const MOBILE_BREAKPOINT = 768 // Tailwind md

export const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false
        return window.innerWidth < MOBILE_BREAKPOINT
    })

    useEffect(() => {
        const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

        const handler = () => setIsMobile(mediaQuery.matches)

        handler()

        mediaQuery.addEventListener('change', handler)
        return () => mediaQuery.removeEventListener('change', handler)
    }, [])

    return isMobile
}

export const useItineraryCompletedData = (itineraryId: string) => {
    return useQuery<IItineraryCompletedResponse, Error>({
        queryKey: ['itineraryCompleted', itineraryId],
        queryFn: () => importCompletedItinerary(itineraryId),
        enabled: !!itineraryId, // only fetch if ID exists
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 24 * 60 * 60 * 1000, // 24h — itinerary data rarely changes
        gcTime: 30 * 60 * 1000, // 30 min — keep cache alive across tab switches
    })
}

/**
 * Query hook for the derived route-summary endpoint. The payload is a
 * flat timeline of city + transport entries suitable for the header
 * pill strip. Stale-time matches the completed-itinerary query so the
 * two stay in visual sync while the user scrolls.
 *
 * Cache bridge: subscribes to ``itineraryCompleted`` invalidations for
 * the same itinerary id and invalidates this query in response. That
 * way every existing call-site that invalidates the completed-itinerary
 * query (AI chat updates, day-drag reorders, stay edits, etc.) also
 * refreshes the route summary without touching those call-sites.
 */
export const useItineraryRouteSummary = (itineraryId: string) => {
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!itineraryId) return
        return queryClient.getQueryCache().subscribe((event) => {
            if (event.type !== 'updated') return
            // Bridge contract: any write to ['itineraryCompleted', id] must
            // refresh the derived route summary.
            //   • ``invalidate`` — covers explicit invalidateQueries call-sites
            //     (delete day, hotel mutations, date shift, chat assistant
            //     predicate invalidates, version revert, flight tab, etc.).
            //   • ``success``   — covers setQueryData writes from the slot /
            //     day mutation hooks (useUpdateSlot, useAddSlot, usePatchSlot,
            //     useAddItineraryDay, useUpdateItineraryDay, useResetItineraryDay,
            //     useSwitchItineraryDay) which write fresh server payload
            //     directly and never invalidate. Without this branch the kanban
            //     sleep-city labels go stale after every manual slot/day edit.
            if (event.action.type !== 'invalidate' && event.action.type !== 'success') return
            const key = event.query.queryKey
            if (!Array.isArray(key) || key[0] !== 'itineraryCompleted') return
            // Predicate-based invalidators (AIAssistantWindow,
            // ItineraryUpdateOutput) fire one event per matched query,
            // each with its own id in key[1] — match only our own.
            if (key[1] !== itineraryId) return
            queryClient.invalidateQueries({
                queryKey: ['itineraryRouteSummary', itineraryId]
            })
        })
    }, [queryClient, itineraryId])

    return useQuery({
        queryKey: ['itineraryRouteSummary', itineraryId],
        queryFn: () => fetchRouteSummary(itineraryId),
        enabled: !!itineraryId,
        staleTime: 30_000,
    })
}
export const useExperienceByQueryList = (query: string) => {
    return useQuery<ExperienceResult[], Error>({
        queryKey: ['globalSearch', 'experience', query],
        enabled: !!query && query.trim().length > 0,
        retry: 1,
        queryFn: async () => {
            const data = await globalSearch(query)
            return data.results.filter((item): item is ExperienceResult => item.type === 'experience')
        }
    })
}

export interface IItineraryCompletedResponse {
    id: string
    trip_id: string
    trip: {
        id: string
        name: string | null
        trip_sequence_id: string | null
        status?: string
        start_date?: string | null
        end_date?: string | null
    }
    title?: string
    created_at: string
    updated_at: string
    updated_by_traveler_at: string | null
    updated_by_internal_user_at: string | null
    updated_by_ai_at: string | null
    status: string
    role?: 'owner' | 'invited' | 'viewer' // Role of the current user for this itinerary
    route: Record<string, unknown> // Empty object, route data is in details.route
    details: {
        route?: Record<string, { days: number; nights: number }> // Route data with days/nights format
        [key: string]: unknown
    }
    summary?: Record<string, unknown>
    days?: Array<{
        date: string
        base_city?: { id: string; name: string; country: string } | null
        destination_city?: { id: string; name: string; country: string } | null
        notes?: string | null
        type: string
        is_checkout_day: boolean
        is_checkin_day: boolean
        overnight_transit: boolean
        accommodation?: any
        slots?: any[]
    }>
    stays?: Array<{
        stay_id: string
        accommodation_id: string | null
        zentrum_hub_id: string
        hotel_name: string
        hotel_image_url: string | null
        city_id: string | null
        sequence: number
        duration: number | null
        latitude: number | null
        longitude: number | null
        check_in_date: string | null
        check_out_date: string | null
        nights: number | null
        room_type: string | null
        check_in_time: string | null
        check_out_time: string | null
        total_cost: number | null
        currency: string | null
        notes: string | null
    }>
    /** Populated by backend when a tripboard.create task is pending/in_progress */
    tripboard_task_id?: string
    [key: string]: any
}

/**
 * Call the API to import a completed itinerary by ID
 * @param itineraryId - ID of the itinerary to import
 * @returns Promise with imported itinerary data
 */
export const importCompletedItinerary = async (itineraryId: string): Promise<IItineraryCompletedResponse> => {
    try {
        if (!itineraryId) throw new Error('Invalid itinerary ID')

        const response = await apiClient.get(`/api/trip-itineraries/${itineraryId}/complete/`)

        if (!response.data) {
            throw new Error(ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        }

        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

/**
 * Params for triggering tripboard creation via /complete?generate_tripboard=true
 */
export interface TripboardGenerationParams {
    countryIds: string[]
    countryName: string
    adults?: number
    children?: number
    infants?: number
    stayBudgetMin?: number
    stayBudgetMax?: number
    dietaryRestrictions?: string[]
}

/**
 * Call /complete with generate_tripboard=true to trigger tripboard creation
 * and return itinerary data + tripboard_task_id in a single call.
 */
export const importCompletedItineraryWithTripboard = async (
    itineraryId: string,
    tripboardParams: TripboardGenerationParams
): Promise<IItineraryCompletedResponse & { tripboard_task_id?: string }> => {
    try {
        if (!itineraryId) throw new Error('Invalid itinerary ID')

        const params = new URLSearchParams()
        params.set('generate_tripboard', 'true')
        params.set('country_ids', tripboardParams.countryIds.join(','))
        params.set('country_name', tripboardParams.countryName)
        params.set('adults', String(tripboardParams.adults ?? 2))
        params.set('children', String(tripboardParams.children ?? 0))
        params.set('infants', String(tripboardParams.infants ?? 0))
        params.set('stay_budget_min', String(tripboardParams.stayBudgetMin ?? 0))
        params.set('stay_budget_max', String(tripboardParams.stayBudgetMax ?? 50000))
        if (tripboardParams.dietaryRestrictions?.length) {
            params.set('dietary_restrictions', tripboardParams.dietaryRestrictions.join(','))
        }

        const response = await apiClient.get(
            `/api/trip-itineraries/${itineraryId}/complete/?${params.toString()}`
        )

        if (!response.data) {
            throw new Error(ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        }

        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}
type CalendarResponse = {
    url: string
    filename: string
    content_type: string
}
export const useAddToCalendar = (tripId: string | null) => {
    return useQuery<CalendarResponse, Error>({
        queryKey: ['add-to-calendar', tripId],
        enabled: false,
        queryFn: async () => {
            if (!tripId) {
                throw new Error('Invalid itinerary ID')
            }

            const response = await apiClient.get(`/api/trip-itineraries/export_calendar/?trip_id=${tripId}&export_format=ics`)

            return response.data
        }
    })
}

// ---------- ITINERARY DAY HOOKS ----------

/**
 * Hook to add a day to an itinerary
 */
export const useAddItineraryDay = (itineraryId: string) => {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (payload: AddItineraryDayPayload) => addItineraryDay(itineraryId, payload),

        onMutate: async () => {
            // Cancel outgoing refetches
            await qc.cancelQueries({ queryKey: ['itineraryCompleted', itineraryId] })

            // Snapshot previous value
            const previousData = qc.getQueryData<IItineraryCompletedResponse>(['itineraryCompleted', itineraryId])

            return { previousData }
        },

        onSuccess: (data) => {
            // Update cache with new itinerary data
            // Convert TripItinerary to IItineraryCompletedResponse format
            const updatedData: IItineraryCompletedResponse = {
                ...data,
                trip_id: data.trip.id
            }
            qc.setQueryData(['itineraryCompleted', itineraryId], updatedData)
        },

        onError: (_, __, context) => {
            // Rollback on error
            if (context?.previousData) {
                qc.setQueryData(['itineraryCompleted', itineraryId], context.previousData)
            }
        }
    })
}

/**
 * Hook to update a day in an itinerary
 */
export const useUpdateItineraryDay = (itineraryId: string) => {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: ({ date, payload }: { date: string; payload: UpdateItineraryDayPayload }) => updateItineraryDay(itineraryId, date, payload),

        onMutate: async ({ date, payload }) => {
            await qc.cancelQueries({ queryKey: ['itineraryCompleted', itineraryId] })

            const previousData = qc.getQueryData<IItineraryCompletedResponse>(['itineraryCompleted', itineraryId])

            // Optimistically update the cache
            qc.setQueryData<IItineraryCompletedResponse>(['itineraryCompleted', itineraryId], (old) => {
                if (!old?.days) return old

                return {
                    ...old,
                    days: old.days.map((day) => {
                        const dayDate = new Date(day.date).toISOString().split('T')[0]
                        const targetDate = new Date(date).toISOString().split('T')[0]
                        return dayDate === targetDate ? { ...day, ...payload } : day
                    })
                }
            })

            return { previousData }
        },

        onSuccess: (data) => {
            // Update cache with new itinerary data
            const updatedData: IItineraryCompletedResponse = {
                ...data,
                trip_id: data.trip.id
            }
            qc.setQueryData(['itineraryCompleted', itineraryId], updatedData)
        },

        onError: (_, __, context) => {
            if (context?.previousData) {
                qc.setQueryData(['itineraryCompleted', itineraryId], context.previousData)
            }
        }
    })
}

/**
 * Hook to delete a day from an itinerary
 */
export const useDeleteItineraryDay = (itineraryId: string) => {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (date: string) => deleteItineraryDay(itineraryId, date),

        onMutate: async (date) => {
            await qc.cancelQueries({ queryKey: ['itineraryCompleted', itineraryId] })

            const previousData = qc.getQueryData<IItineraryCompletedResponse>(['itineraryCompleted', itineraryId])

            // Optimistically remove from cache
            qc.setQueryData<IItineraryCompletedResponse>(['itineraryCompleted', itineraryId], (old) => {
                if (!old?.days) return old

                const targetDate = new Date(date).toISOString().split('T')[0]
                return {
                    ...old,
                    days: old.days.filter((day) => {
                        const dayDate = new Date(day.date).toISOString().split('T')[0]
                        return dayDate !== targetDate
                    })
                }
            })

            return { previousData }
        },

        onSuccess: () => {
            // Invalidate to refetch fresh data
            qc.invalidateQueries({ queryKey: ['itineraryCompleted', itineraryId] })
        },

        onError: (_, __, context) => {
            if (context?.previousData) {
                qc.setQueryData(['itineraryCompleted', itineraryId], context.previousData)
            }
        }
    })
}

/**
 * Hook to reset a day in an itinerary
 */
export const useResetItineraryDay = (itineraryId: string) => {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (date: string) => resetItineraryDay(itineraryId, date),
        onSuccess: (data) => {
            const updatedData: IItineraryCompletedResponse = {
                ...data,
                trip_id: data.trip.id
            }
            qc.setQueryData(['itineraryCompleted', itineraryId], updatedData)
        }
    })
}

/**
 * Hook to switch two day positions in an itinerary
 */
export const useSwitchItineraryDay = (itineraryId: string) => {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (payload: SwitchItineraryDayPayload) => switchItineraryDay(itineraryId, payload),
        onSuccess: (data) => {
            const updatedData: IItineraryCompletedResponse = {
                ...data,
                trip_id: data.trip.id
            }
            qc.setQueryData(['itineraryCompleted', itineraryId], updatedData)
        }
    })
}
