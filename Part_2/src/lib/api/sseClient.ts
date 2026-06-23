/**
 * Generic SSE (Server-Sent Events) client for streaming API responses.
 *
 * Works with the backend commons/sse module event envelope:
 *   { status, step, message, data, ...extra }
 *
 * Usage:
 *   const result = await sseClient<HistogramData>({ url, onEvent });
 *   // result.status === 'completed' → result.data is HistogramData
 */

import { API_CONFIG } from './apiConfig'
import { TokenStorage } from './tokenStorage'

// ── Types ────────────────────────────────────────────────────────────────────

/** Status values emitted by the backend SSE module. */
export type SSEStatus = 'queued' | 'in_progress' | 'completed' | 'failed'

/**
 * A single SSE event as received from the backend.
 *
 * `T` is the shape of `data` when status === 'completed'.
 * For non-terminal events `data` is `null`.
 */
export interface SSEEvent<T = unknown> {
    status: SSEStatus
    step: string | null
    message: string
    data: T | null
    /** Any extra fields the backend includes (e.g. city_id). */
    [key: string]: unknown
}

/** Options for {@link sseClient}. */
export interface SSEClientOptions<T> {
    /** Full URL (without base) — e.g. `/curation/v2/cities/.../rates_histogram/?...&stream=true` */
    url: string

    /**
     * Called for every SSE event (queued, in_progress, completed, failed).
     * Return `false` to abort the stream early.
     */
    onEvent?: (event: SSEEvent<T>) => void | false

    /** Abort signal to cancel from outside (e.g. component unmount). */
    signal?: AbortSignal

    /** Timeout in ms for inactivity (no events received). Default 30 000. */
    timeoutMs?: number
}

/** The resolved value of {@link sseClient}. */
export type SSEResult<T> =
    | { status: 'completed'; data: T }
    | { status: 'failed'; message: string }
    | { status: 'aborted' }
    | { status: 'timeout' }

// ── Implementation ───────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Generic SSE client that connects to a streaming endpoint and yields
 * typed events until a terminal status (completed / failed) is received.
 *
 * - Sends `Accept: text/event-stream` so the backend returns SSE.
 * - Falls back gracefully if the response is JSON (cache-hit path).
 * - Handles auth token injection, inactivity timeout, and abort signals.
 */
export async function sseClient<T>(
    options: SSEClientOptions<T>
): Promise<SSEResult<T>> {
    const { url, onEvent, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options

    const baseUrl = API_CONFIG.BASE_URL || ''
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`

    const token = await TokenStorage.getAccessToken()
    const headers: HeadersInit = {
        Accept: 'text/event-stream, application/json',
    }
    if (token) {
        headers['Authorization'] = token
    }

    const response = await fetch(fullUrl, {
        method: 'GET',
        headers,
        cache: 'no-store',
        signal,
    })

    const contentType = response.headers.get('content-type') || ''

    // ── JSON fast-path (cache hit — backend returns StupaResponse) ────────
    if (contentType.includes('application/json')) {
        const raw = await response.json()
        const payload = raw?.data?.data ?? raw?.data ?? raw
        const event: SSEEvent<T> = {
            status: 'completed',
            step: null,
            message: '',
            data: payload as T,
        }
        onEvent?.(event)
        return { status: 'completed', data: payload as T }
    }

    // ── SSE stream ────────────────────────────────────────────────────────
    if (!contentType.includes('text/event-stream')) {
        return {
            status: 'failed',
            message: `Unexpected Content-Type: ${contentType}`,
        }
    }

    const reader = response.body?.getReader()
    if (!reader) {
        return { status: 'failed', message: 'No response body' }
    }

    return readSSEStream<T>(reader, onEvent, timeoutMs, signal)
}

// ── Stream reader ────────────────────────────────────────────────────────────

async function readSSEStream<T>(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onEvent: SSEClientOptions<T>['onEvent'],
    timeoutMs: number,
    signal?: AbortSignal
): Promise<SSEResult<T>> {
    const decoder = new TextDecoder()
    let buffer = ''
    let lastEventTime = Date.now()

    // Current event being built from multi-line SSE block
    let currentEvent = ''
    let currentData = ''

    const checkTimeout = (): boolean => Date.now() - lastEventTime > timeoutMs

    try {
        while (true) {
            if (signal?.aborted) {
                reader.cancel()
                return { status: 'aborted' }
            }

            if (checkTimeout()) {
                reader.cancel()
                return { status: 'timeout' }
            }

            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                // SSE spec: blank line = end of event block
                if (line.trim() === '') {
                    if (currentData) {
                        const result = processEvent<T>(
                            currentEvent,
                            currentData,
                            onEvent
                        )
                        lastEventTime = Date.now()

                        if (result) return result
                    }
                    currentEvent = ''
                    currentData = ''
                    continue
                }

                // Comment line (heartbeat)
                if (line.startsWith(':')) {
                    lastEventTime = Date.now()
                    continue
                }

                if (line.startsWith('event:')) {
                    currentEvent = line.slice(6).trim()
                } else if (line.startsWith('data:')) {
                    // SSE allows multi-line data (append with newline)
                    currentData += (currentData ? '\n' : '') + line.slice(5).trim()
                }
                // retry: field is handled by browser EventSource natively;
                // we just acknowledge it for timeout reset
                if (line.startsWith('retry:')) {
                    lastEventTime = Date.now()
                }
            }
        }

        // Process any remaining buffered event
        if (currentData) {
            const result = processEvent<T>(currentEvent, currentData, onEvent)
            if (result) return result
        }

        return { status: 'failed', message: 'Stream ended without terminal event' }
    } catch (err) {
        if (signal?.aborted) return { status: 'aborted' }
        return {
            status: 'failed',
            message: err instanceof Error ? err.message : String(err),
        }
    }
}

// ── Event processor ──────────────────────────────────────────────────────────

function processEvent<T>(
    eventType: string,
    dataStr: string,
    onEvent: SSEClientOptions<T>['onEvent']
): SSEResult<T> | null {
    let parsed: Record<string, unknown>
    try {
        parsed = JSON.parse(dataStr)
    } catch {
        return null // skip malformed
    }

    const event: SSEEvent<T> = {
        status: (parsed.status as SSEStatus) ?? eventType ?? 'in_progress',
        step: (parsed.step as string) ?? null,
        message: (parsed.message as string) ?? '',
        data: (parsed.data as T) ?? null,
        ...parsed,
    }

    if (import.meta.env.DEV) {
        console.log(`[SSE ${new Date().toISOString()}] ${event.status}`, event.step ?? '')
    }

    // Notify subscriber
    const shouldContinue = onEvent?.(event)
    if (shouldContinue === false) {
        return { status: 'aborted' }
    }

    // Terminal states
    if (event.status === 'completed' && event.data != null) {
        return { status: 'completed', data: event.data }
    }

    if (event.status === 'failed') {
        return { status: 'failed', message: event.message || 'Task failed' }
    }

    return null // continue reading
}
