import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'

export type LocationResponse = {
    id: string
    country_id: string
    country_name: string
    best_months: string[]
    peak_season: string[]
    recommended_for_travel_purpose: string[]
    recommended_for_group_type: string[]
    recommended_for_occasions: string[]
    icon_url: string
    flag_icon_url?: string
    banner_img_url?: string
    suggestion_priority: number
    is_live: boolean
    region?: string
}

export const getPopularCountries = async (params?: {
    q?: string
    travel_purpose?: string
    group_type?: string
    occasion?: string
    isLive?: boolean
    all?: boolean
}): Promise<LocationResponse[]> => {
    try {
        const queryParams = new URLSearchParams()

        // Only add parameters that are defined
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value) {
                    // if value is a boolean, convert it to a string
                    if (typeof value === 'boolean') {
                        value = value ? 'true' : 'false'
                    }
                    queryParams.append(key, value)
                }
            })
        }

        const queryString = queryParams.toString()
        let url = ''

        if (queryString) {
            // is_live=true
            url = `${API_CONFIG.BASE_URL}/curation/location-personalization/search/${queryString ? `?${queryString}&is_live=${params?.isLive ? 'true' : 'false'}${params?.all ? '&all=true' : ''}` : `?is_live=${params?.isLive ? 'true' : 'false'}${params?.all ? '&all=true' : ''}`}`
        } else {
            url = `${API_CONFIG.BASE_URL}/curation/location-personalization/popular-countries/`
        }

        const response = await apiClient.get(url)
        const data = response.data
        return data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export const getPrioritizedCountries = async (): Promise<LocationResponse[]> => {
    try {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/location-personalization/prioritized_countries/`)

        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export type TravelerProfileStatus = {
    status: boolean
    traveler_phone: string
    traveler_id: string
    requested_id: string
    traveler_name: string | null
    traveler_gender: string | null
    traveler_email: string | null
}

export const getTravelerProfileStatus = async (travelerId: string): Promise<TravelerProfileStatus> => {
    try {
        // api/travelers/traveler_details_status/
        const response = await apiClient.post(`${API_CONFIG.BASE_URL}/api/travelers/traveler_details_status/`, {
            traveler_id: travelerId
        })
        return response.data?.data
    } catch (e) {
        throw new Error((e as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

/*
      response_data={
         'trip_id': trip.id,
         'trip_profile_id': trip_profile.id,
         'trip_source': final_source,
         'traveler_id': traveler.id,
      }


      return Response(
         {'message': 'Trip created successfully', 'data': response_data},
         status=status.HTTP_201_CREATED
      )

*/

export type CreateBasicTripResponse = {
    message: string
    data: CreateBasicTripDataResponse
}
export type CreateBasicTripDataResponse = {
    data: {
        trip_id: string
        trip_profile_id: string
        trip_source: string
        traveler_id: string
    }
}

export type CreateBasicTripPayload = {
    utm_medium?: string
    utm_campaign?: string
    trip_source?: string
    interested_destinations?: string[]
    final_destination_countries?: string[]
    destination_finalized?: boolean
    group_type?: string
    travel_purpose?: string
    preferred_travel_time?: {
        is_fixed: boolean
        startDate: Date | null
        endDate: Date | null
        year: number | null
        months: string[] | null
    }
    traveler_preferences?: {
        planning_start_preference: string | null
        booked_items: string[] | null
    }
    group_setup?: {
        adults: number
        children: number
        infants: number
        children_age?: number[]
    }
    stay_budget_range?: {
        min: number
        max: number
    }
    /**
     * Full create-flow input snapshot — dates, cities, departure/return
     * airport, group, budget tier, travel styles, preferences, etc.
     * Stored verbatim on ``trip.creation_inputs`` so downstream surfaces
     * (Flights leg derivation, segmentation, future personalization)
     * can read what the user originally specified without re-asking.
     */
    creation_inputs?: Record<string, unknown>
}

export const createBasicTrip = async (travelerId: string, payload: CreateBasicTripPayload): Promise<CreateBasicTripDataResponse> => {
    try {
        // Merge both arrays into a unique set, then convert back to array
        const final_countries_set = Array.from(new Set([...(payload.final_destination_countries ?? []), ...(payload.interested_destinations ?? [])]))
        const destination_finalized = payload.destination_finalized ?? false
        const response: CreateBasicTripResponse = await apiClient.post(`${API_CONFIG.BASE_URL}/v2/trips/create/`, {
            traveler_id: travelerId,
            final_countries_set: final_countries_set,
            destination_finalized: destination_finalized,
            ...payload
        })

        return response.data
    } catch (e) {
        throw new Error((e as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

// export const updateTrip

export type GetBasicTripDataResponse = {
    message: string
    response_code: string
    data: GetBasicTripDataDataResponse
}
export type GetBasicTripDataDataResponse = {
    data: {
        trip_id: string
        trip_sequence_id: string | null
        trip_profile_id: string
        trip_source: string
        trip_preferences_id: string | null
        trip_name: string | null
        trip_status: string
        destination_finalized: boolean
        final_destination_countries: string[] | null
        group_type: string | null
        travel_purpose: string | null
        preferred_travel_time: {
            is_fixed: boolean | null
            startDate: string | null
            endDate: string | null
            year: number | null
            months: string[] | null
        } | null
        budget_range: string | null
        interested_destinations: string[] | null
        accommodation_preferences:
            | {
                  primary_type: string | null
                  sub_type: string | null
              }[]
            | null
        experiences_preferences: string[] | null
        traveler_intent: {
            planning_start_preference: string | null
            booked_items: string[] | null
        } | null
        group_setup?: {
            adults: number
            children: number
            infants: number
            children_age?: number[]
        }
    }
}
export const getBasicTripData = async (tripId: string): Promise<GetBasicTripDataDataResponse> => {
    try {
        const response: GetBasicTripDataResponse = await apiClient.post(`${API_CONFIG.BASE_URL}/api/v2/trips/get-trip-basic-data/`, {
            trip_id: tripId
        })
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export type DestionationStatusResponse = {
    message: string
    response_code: string
    data: DestionationStatusDataResponse
}
export type DestionationStatusDataResponse = {
    data: {
        status: {
            country_id: string
            is_live: boolean
        }[]
        all_live: boolean
    }
}
export const getDestionationStatus = async (tripId: string): Promise<DestionationStatusDataResponse> => {
    try {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/api/v2/trips/${tripId}/destination/status/`)
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}
