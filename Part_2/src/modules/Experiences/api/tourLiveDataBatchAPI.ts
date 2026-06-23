/**
 * Batched tour live-data SSE client.
 *
 * Opens one POST request to `/api/tours-experience-mapping/tours-batch-stream/`
 * carrying a list of `(experienceId, checkIn?)` pairs and yields per-experience
 * + stream-level events as they arrive. Backed by `iterateSseFrames` from
 * `@/lib/sse/parseSSEFrames`.
 *
 * Wire contract (from krysto/trip/views/tour_live_data_batch_sse.py):
 *   - `tours_ready`           emitted per experience in request order, BEFORE
 *                             any subscription opens.
 *   - `experience_progress`   relayed from per-experience channel; either a
 *                             task-started beacon (no tour_id) or a per-tour
 *                             snapshot (tour_id + snapshot present).
 *   - `experience_completed`  per-experience terminal (does NOT close stream).
 *   - `experience_failed`     per-experience terminal (does NOT close stream).
 *   - `completed`             stream-level terminal — last event yielded.
 *   - `failed`                stream-level error (Redis unreachable, etc.).
 *
 * Server response shapes:
 *   - Empty `items` → JSON `{experiences: []}` with `Content-Type:
 *     application/json` and HTTP 202. Generator yields a single synthetic
 *     stream-level `completed` event and returns.
 *   - Non-empty → `Content-Type: text/event-stream` of SSE frames.
 */

import { API_CONFIG } from '@/lib/api/apiConfig'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { iterateSseFrames } from '@/lib/sse/parseSSEFrames'
import type { Tour, TourLiveDataItem } from '@/modules/Experiences/types/toursResponseTypes'

// ── Public types ────────────────────────────────────────────────────────────

export interface BatchItem {
    experienceId: string
    checkIn: string | null
}

export interface BatchRequestBody {
    items: BatchItem[]
    currency?: string
}

export interface BatchStreamOptions {
    signal?: AbortSignal
    /** Tripboard / collection context the batch is rendering in. Forwarded as
     * `?traveler_collection_id=…` query param so the backend's affiliate-link
     * minting captures the surface — distinguishes tripboard activities-tab
     * clicks from generic experience-details clicks (which carry no collection). */
    travelerCollectionId?: string | null
}

/** `tours_ready` — initial DB-backed tour list per experience. */
export interface ToursReadyEvent {
    event: 'tours_ready'
    data: {
        status: 'tours_ready'
        experience_id: string
        check_in: string | null
        cache_key: string
        live_data_status: string
        tours: Tour[]
    }
}

/**
 * `experience_progress` — task-started beacon (no `tour_id`) or per-tour
 * snapshot (has `tour_id` + `snapshot`).
 */
export interface ExperienceProgressEvent {
    event: 'experience_progress'
    data: {
        status: 'in_progress'
        experience_id: string
        cache_key: string
        tour_id?: string
        snapshot?: TourLiveDataItem
    }
}

/** `experience_completed` — per-experience terminal. */
export interface ExperienceCompletedEvent {
    event: 'experience_completed'
    data: {
        status: 'completed'
        experience_id: string
        cache_key: string
        data: Record<string, TourLiveDataItem>
    }
}

/** `experience_failed` — per-experience terminal. */
export interface ExperienceFailedEvent {
    event: 'experience_failed'
    data: {
        status: 'failed'
        experience_id: string
        cache_key: string
        message: string
    }
}

/** `completed` — stream-level terminal (last event). */
export interface StreamCompletedEvent {
    event: 'completed'
    data: {
        status: 'completed'
        total: number
        terminal: number
    }
}

/** `failed` — stream-level error. */
export interface StreamFailedEvent {
    event: 'failed'
    data: {
        status: 'failed'
        message: string
    }
}

export type BatchSSEEvent =
    | ToursReadyEvent
    | ExperienceProgressEvent
    | ExperienceCompletedEvent
    | ExperienceFailedEvent
    | StreamCompletedEvent
    | StreamFailedEvent

// ── Implementation ──────────────────────────────────────────────────────────

const ENDPOINT_PATH = '/api/tours-experience-mapping/tours-batch-stream/'

/** UTM keys carried through to backend attribution. Mirrors TRACKED_UTM_KEYS in
 *  krysto/trip/services/traveler_service.py + ATTRIBUTION_URL_KEYS in
 *  attribution_context_service.build_tour_attribution_input. */
const ATTRIBUTION_URL_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

/** Build the query string for the SSE URL. Includes traveler_collection_id (if
 *  provided) and forwards any utm_* params present on the current page URL so
 *  the backend's affiliate-link minting can stamp them onto the AttributionContext.
 *  Safe under SSR — guards on `typeof window`. */
function buildQuery(travelerCollectionId?: string | null): string {
    const parts: string[] = []
    if (travelerCollectionId) parts.push(`traveler_collection_id=${encodeURIComponent(travelerCollectionId)}`)
    if (typeof window !== 'undefined') {
        const search = new URLSearchParams(window.location.search)
        for (const key of ATTRIBUTION_URL_KEYS) {
            const value = search.get(key)?.trim()
            if (value) parts.push(`${key}=${encodeURIComponent(value)}`)
        }
    }
    return parts.length > 0 ? `?${parts.join('&')}` : ''
}

/**
 * Open the batch SSE stream and yield typed events as they arrive.
 *
 * Aborts cleanly when `opts.signal` fires — the underlying `fetch` is
 * aborted and the generator returns without yielding further events
 * (does not throw).
 */
export async function* openTourLiveDataBatchStream(
    body: BatchRequestBody,
    opts: BatchStreamOptions = {}
): AsyncGenerator<BatchSSEEvent, void, void> {
    const baseUrl = API_CONFIG.BASE_URL || ''
    const url = `${baseUrl}${ENDPOINT_PATH}${buildQuery(opts.travelerCollectionId)}`

    const token = await TokenStorage.getAccessToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = token

    // Map frontend camelCase items to backend snake_case wire shape.
    const wireBody = {
        items: body.items.map((it) => ({
            experience_id: it.experienceId,
            check_in: it.checkIn,
        })),
        ...(body.currency ? { currency: body.currency } : {}),
    }

    let response: Response
    try {
        response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(wireBody),
            signal: opts.signal,
        })
    } catch (err) {
        // AbortError surfaces as a DOMException; treat as clean exit.
        if (isAbortError(err)) return
        throw err
    }

    if (!response.ok) {
        const text = await safeReadText(response)
        throw new Error(`Batch SSE request failed: ${response.status} ${response.statusText} — ${text ?? ''}`)
    }

    // Empty-items short-circuit: backend returns JSON instead of SSE.
    const contentType = response.headers.get('Content-Type') ?? ''
    if (contentType.includes('application/json')) {
        // Drain body so the connection is released, then yield a synthetic
        // stream-level completed event so consumers have a uniform shape.
        await response.json().catch(() => undefined)
        yield {
            event: 'completed',
            data: { status: 'completed', total: 0, terminal: 0 },
        }
        return
    }

    if (!response.body) {
        throw new Error('Batch SSE response had no body')
    }

    const reader = response.body.getReader()
    try {
        for await (const frame of iterateSseFrames(reader)) {
            if (opts.signal?.aborted) return
            const typed = toBatchSSEEvent(frame.event, frame.data)
            if (typed) yield typed
        }
    } catch (err) {
        if (isAbortError(err)) return
        throw err
    }
}

/**
 * Cast a raw `{event, data}` frame to the typed `BatchSSEEvent` union.
 * Returns `null` for unrecognized event names — callers receive a cleaned
 * stream and don't have to filter out unexpected names themselves.
 */
function toBatchSSEEvent(eventName: string, data: unknown): BatchSSEEvent | null {
    if (!isPlainObject(data)) return null
    switch (eventName) {
        case 'tours_ready':
            return { event: 'tours_ready', data: data as ToursReadyEvent['data'] }
        case 'experience_progress':
        case 'in_progress':
            // Backend uses `event: in_progress` for the relayed beacon and
            // `event: experience_progress` for the re-tagged outer name. Map
            // both to our canonical `experience_progress`.
            return { event: 'experience_progress', data: data as ExperienceProgressEvent['data'] }
        case 'experience_completed':
            return { event: 'experience_completed', data: data as ExperienceCompletedEvent['data'] }
        case 'experience_failed':
            return { event: 'experience_failed', data: data as ExperienceFailedEvent['data'] }
        case 'completed':
        case 'complete':
            return { event: 'completed', data: data as StreamCompletedEvent['data'] }
        case 'failed':
        case 'error':
            return { event: 'failed', data: data as StreamFailedEvent['data'] }
        default:
            return null
    }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAbortError(err: unknown): boolean {
    return (
        err instanceof DOMException &&
        (err.name === 'AbortError' || err.name === 'TimeoutError')
    )
}

async function safeReadText(response: Response): Promise<string | undefined> {
    try {
        return await response.text()
    } catch {
        return undefined
    }
}
