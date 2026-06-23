import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface CreateTripboardParams {
    itinerary_id: string
    trip_id: string
    traveler_id: string
    trip_name: string
    country_ids: string[]
    country_name: string
    wizard_data: {
        start_date: string
        end_date: string
        group_setup: { adults: number; children: number; infants: number }
        stay_budget_range?: { min: number; max: number }
        dietary_restrictions?: string[]
    }
}

export interface TripboardStatusResponse {
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    created_at: string
    updated_at: string
    data?: {
        identifier: string
        traveler_collection_identifier: string
        highlights: {
            countries: number
            cities: number
            activities: number
            stays: number
            restaurants: number
        }
    }
    error?: string
}

export interface CloneTripboardParams {
    traveler_id: string
    collection_type: string
    start_date?: string
    end_date?: string
    travel_purpose?: string
    group_type?: string
    trip_id?: string
}

export interface CloneTripboardResponse {
    task_id: string
}

// ─── API Functions ──────────────────────────────────────────────────────────────

/**
 * Trigger async tripboard creation on the backend.
 * Returns a task_id that can be polled via `pollTripboardStatus`.
 */
export async function startTripboardCreation(
    params: CreateTripboardParams
): Promise<{ task_id: string }> {
    const url = `${API_CONFIG.BASE_URL}/api/tripboards/create/`
    const response = await apiClient.post(url, params)
    // Stupa envelope: { message, response_code, data: { task_id } }
    return response.data.data
}

/**
 * Poll the status of an async tripboard creation task.
 */
export async function pollTripboardStatus(
    taskId: string
): Promise<TripboardStatusResponse> {
    const url = `${API_CONFIG.BASE_URL}/api/tripboards/create/status/?task_id=${taskId}`
    const response = await apiClient.get(url)
    // Stupa envelope: { message, response_code, data: { status, ... } }
    return response.data.data
}

/**
 * Clone an existing tripboard by its identifier.
 */
export async function cloneTripboard(
    identifier: string,
    params: CloneTripboardParams
): Promise<CloneTripboardResponse> {
    const url = `${API_CONFIG.BASE_URL}/api/tripboards/${identifier}/clone/`
    const response = await apiClient.post(url, params)
    return response.data.data
}
