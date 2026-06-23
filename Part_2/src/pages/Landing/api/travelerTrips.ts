import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import apiClient from '@/lib/api/apiClient'
import type { GetBasicTripDataDataResponse } from '@/modules/Onboarding/api/onboardingAPI'

/**
 * Types for Traveler Trips API response
 */
export type TripItineraryRoute = Record<
    string,
    {
        start_date: string
        end_date: string
    }
>

export type TripItinerarySummary = {
    total_cities: number
    cities: string[]
}

export type TripItineraryLite = {
    id: string
    status: string
    route: TripItineraryRoute
    route_summary: TripItinerarySummary
}

export type TravelerTrip = {
    trip_id: string
    name: string | null
    role?: 'owner' | 'co_traveler' | 'invited' // NEW: role field from API
    owner_id: string
    owner?: ActiveTripOwner
    final_destination_countries: {
        id: string
        name: string
    }[]
    final_destination_cities: {
        id: string
        name: string
    }[]
    preferred_travel_time: {
        startDate: string
        endDate: string
        year: number
        months: string[]
    }
    group_setup?: {
        adults: number
        children: number
        infants: number
        children_age?: number[]
        rooms?: Array<{ adults: number; children: number; child_ages: number[] }>
    }
    stay_budget_range?: {
        min: number
        max: number
        city_wise_preferences?: Record<string, { min: number; max: number }>
    }
    trip_preference?: TripPreference
    tripProfile?: GetBasicTripDataDataResponse['data']
    tripItinerary?: TripItineraryLite
    itineraryRoute?: TripItineraryRoute
}

export type TripPreference = {
    id: string
    trip: string
    group_setup: {
        adults: number
        children: number
        infants: number
        children_age?: number[]
    }
    travel_style_preferences: string[]
    diet_preferences: string[]
    food_requirements_text: string
    accommodation_preferences: Array<{
        primary_type: string
        sub_type: string
    }>
    experiences_preferences: string[]
    additional_trip_notes: string | null
    destination_specific_event: {
        event_type: string | null
        event_name: string | null
    }
    transfer_preferences: Record<string, unknown>
    unique_destination_transfers: Record<string, unknown>
    purpose_specific_experiences: {
        special_requirements: string | null
    }
    flight_departure_city_preference: string[]
    city_wise_preferences: Record<
        string,
        {
            stays?: string[]
            [key: string]: unknown
        }
    >
    created_at: string
    updated_at: string
}

export type TravelerTripsData = {
    traveler_id: string
    total_trips: number
    trips: TravelerTrip[]
}

export type TravelerTripsResponse = {
    message: string
    response_code: string
    data: TravelerTripsData
}

export type ActiveTripResponse = {
    message: string
    response_code: string
    data: {
        active_trip_id: string
        trip_sequence_id: string
        name: string
        status: string
        owner?: ActiveTripOwner
        message?: string
    }
}

export type ActiveTripOwner = {
    id: string
    name: string
    age: number | null
    gender: string | null
    type: string
}

export type SetActiveTripRequest = {
    trip_id: string
}

/**
 * Fetch trips for a specific traveler
 */
export const getTravelerTrips = async (travelerId: string): Promise<TravelerTripsData> => {
    try {
        // Fetch full response
        const response = await apiClient.get<TravelerTripsResponse>(`/v1/travelers/${travelerId}/trips/`)

        // Return only the `data` part
        return response.data.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

/**
 * Get the active trip for the current traveler
 */
export const getActiveTrip = async (): Promise<ActiveTripResponse> => {
    try {
        const response = await apiClient.get<ActiveTripResponse>('/api/travelers/trip/active/')
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

/**
 * Set a trip as active for the current traveler
 */
export const setActiveTrip = async (tripId: string): Promise<ActiveTripResponse> => {
    try {
        const response = await apiClient.put<ActiveTripResponse>('/api/travelers/trip/active/', {
            trip_id: tripId
        })
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}
