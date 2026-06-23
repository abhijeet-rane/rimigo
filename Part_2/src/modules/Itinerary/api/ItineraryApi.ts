import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { IItineraryCompletedResponse } from '../hooks/ItineraryHook'

// ---------- TYPES ----------
export interface AttachmentPayload {
    type: string
    name: string
    url: string
}

export interface SlotPayload {
    slot_index?: number
    start_time?: string // "YYYY-MM-DD HH:mm"
    end_time?: string
    kind?: string
    notes?: string | null
    title?: string
    entity_model?: string
    entity_id?: string
    duration_minutes?: number
    slot_data?: Record<string, any>
    /**
     * Canonical ``{_id, name}`` City reference for this slot. Defaults to
     * the day's city (and, for an experience, to the picked activity's own
     * city) but is user-editable in the composer. Persisted as
     * ``ItinerarySlot.city`` server-side.
     */
    city?: { _id: string; name: string }
    order?: number
    attachments?: AttachmentPayload[]
    suggestion_reasons: String[]
}

export interface SlotResponse {
    id: string
    day_index: number
    start_time: string
    end_time: string
    kind: string
    title?: string
    slot_data?: Record<string, any>
    entity_id?: string
    entity_model?: string
    order?: number
    attachments?: AttachmentPayload[]
}

// ---------- API FUNCTIONS ----------

/**
 * Add a slot
 */
export const addSlot = async (tripId: string, itineraryId: string, payload: SlotPayload): Promise<IItineraryCompletedResponse> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trips/${tripId}/trip-itineraries/${itineraryId}/slots/`
    const response = await apiClient.post<{ data: IItineraryCompletedResponse }>(endpoint, payload)
    return response.data.data
}

/**
 * Update a slot entirely (PUT)
 */
export const updateSlot = async (tripId: string, itineraryId: string, slotId: string, payload: SlotPayload): Promise<IItineraryCompletedResponse> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trips/${tripId}/trip-itineraries/${itineraryId}/slots/${slotId}/`
    const response = await apiClient.put<{ data: IItineraryCompletedResponse }>(endpoint, payload)
    return response.data.data
}

/**
 * Patch a slot partially (PATCH)
 */
export const patchSlot = async (
    tripId: string,
    itineraryId: string,
    slotId: string,
    payload: Partial<SlotPayload>
): Promise<IItineraryCompletedResponse> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trips/${tripId}/trip-itineraries/${itineraryId}/slots/${slotId}/`
    const response = await apiClient.patch<{ data: IItineraryCompletedResponse }>(endpoint, payload)
    return response.data.data
}

/**
 * Delete a slot
 */
export const deleteSlot = async (tripId: string, itineraryId: string, slotId: string): Promise<void> => {
    const endpoint = `${API_CONFIG.BASE_URL}/api/trips/${tripId}/trip-itineraries/${itineraryId}/slots/${slotId}/`
    await apiClient.delete(endpoint)
}
