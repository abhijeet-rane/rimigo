import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

/**
 * Card-shape payload returned by `/curation/experiences/batch/`.
 * Projects the subset of fields needed to render an experience card +
 * map marker — not the full Experience entity. Kept as a loose shape
 * (optional fields) so forward-compatible backend additions are safe.
 */
export interface EnrichedExperience {
    id: string
    name: string
    /** Slug / URL-friendly identifier — used by deep-links and external routes. */
    identifier?: string | null
    city_id?: string | null
    city_name?: string | null
    categories?: string[] | null
    suggestion_priority?: number | null
    short_description?: string | null
    display_props?: {
        landscape_image?: string | null
    } | null
    content?: {
        verified_photos?: Array<{ id?: string | null; url?: string | null }> | null
    } | null
    price?: {
        lower_bound?: number | null
        upper_bound?: number | null
        currency?: string | null
    } | null
    location?: {
        latitude?: number | null
        longitude?: number | null
        address?: string | null
    } | null
}

interface BatchResponse {
    data: EnrichedExperience[]
}

/**
 * Fetch card-shape data for the given experience ids in a single call.
 *
 * Ids are sorted before serialization so the query string is deterministic —
 * essential for React Query cache hits AND Sancus edge-cache hits (both key
 * by path + query). Duplicates are collapsed; empty / whitespace ids are
 * dropped. Returns an empty array for empty input.
 */
export const getExperiencesByIds = async (ids: string[]): Promise<EnrichedExperience[]> => {
    const normalized = Array.from(
        new Set(ids.map((id) => (typeof id === 'string' ? id.trim() : '')).filter(Boolean))
    ).sort()
    if (normalized.length === 0) return []
    const qp = new URLSearchParams()
    qp.append('ids', normalized.join(','))
    const url = `${API_CONFIG.BASE_URL}/curation/experiences/batch/?${qp.toString()}`
    const response = await apiClient.get<BatchResponse>(url)
    return response.data?.data ?? []
}
