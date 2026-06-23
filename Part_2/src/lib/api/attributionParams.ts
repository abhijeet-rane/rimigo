/**
 * Attribution query-param helpers — shared across non-axios API modules
 * (raw fetch, SSE streams) that don't go through the apiClient interceptor.
 *
 * Backend mirror: `krysto/trip/services/attribution_context_service.py`
 *   build_attribution_input reads these same keys from `request.query_params`.
 */

export const ATTRIBUTION_URL_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content'
] as const

/** Mutates `params`. Appends `traveler_collection_id` / `trip_id` (when provided)
 *  plus any utm_* present on the current page URL. Safe under SSR. */
export function appendAttributionParams(
    params: URLSearchParams,
    travelerCollectionId?: string | null,
    tripId?: string | null
): void {
    if (travelerCollectionId) {
        params.set('traveler_collection_id', travelerCollectionId)
    }
    if (tripId) {
        params.set('trip_id', tripId)
    }
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    for (const key of ATTRIBUTION_URL_KEYS) {
        const value = urlParams.get(key)?.trim()
        if (value) params.set(key, value)
    }
}

/** Returns a plain object usable as axios `params` config. Same source as
 *  `appendAttributionParams`, just a different shape for axios callers. */
export function buildAttributionParamsObject(
    travelerCollectionId?: string | null,
    tripId?: string | null
): Record<string, string> {
    const out: Record<string, string> = {}
    if (travelerCollectionId) {
        out.traveler_collection_id = travelerCollectionId
    }
    if (tripId) {
        out.trip_id = tripId
    }
    if (typeof window === 'undefined') return out
    const urlParams = new URLSearchParams(window.location.search)
    for (const key of ATTRIBUTION_URL_KEYS) {
        const value = urlParams.get(key)?.trim()
        if (value) out[key] = value
    }
    return out
}
