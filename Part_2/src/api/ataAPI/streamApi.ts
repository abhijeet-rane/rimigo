/**
 * Streaming client for the concierge SSE endpoint.
 *
 * Browser axios can't do true incremental streaming (``onDownloadProgress``
 * buffers the full accumulated body each tick), so the streaming call
 * uses ``fetch`` + ``ReadableStream`` directly. We still share
 * ``API_CONFIG.BASE_URL`` and ``TokenStorage`` with the axios
 * ``apiClient`` so auth and base-URL configuration stay in one place.
 *
 * Non-streaming companion calls (the abort endpoint) continue to use
 * axios — see :func:`abortConciergeStream`.
 */
import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { TokenStorage } from '@/lib/api/tokenStorage'
import type { ResponseAction } from '@/modules/AtaAgent/types/AIAssisstantWindowTypes'

// ── Event taxonomy ──────────────────────────────────────────────────────────
// Must stay in sync with ``trip.services.ata.AsyncSSEAgentService.EventType``
// on the backend. Vercel AI SDK–aligned literal names.

export const STREAM_EVENT_TYPES = {
    TURN_START: 'turn_start',
    STREAM_REQUEST_START: 'stream_request_start',
    TEXT_START: 'text-start',
    TEXT_DELTA: 'text-delta',
    TEXT_END: 'text-end',
    REASONING_START: 'reasoning-start',
    REASONING_DELTA: 'reasoning-delta',
    REASONING_END: 'reasoning-end',
    TOOL_INPUT_START: 'tool-input-start',
    TOOL_INPUT_DELTA: 'tool-input-delta',
    TOOL_INPUT_AVAILABLE: 'tool-input-available',
    TOOL_OUTPUT_AVAILABLE: 'tool-output-available',
    TOOL_OUTPUT_ERROR: 'tool-output-error',
    PRESENT_OPTIONS: 'present-options',
    PROGRESS: 'progress',
    FINISH: 'finish',
    ERROR: 'error',
    ABORT: 'abort'
} as const

export type StreamEventType = (typeof STREAM_EVENT_TYPES)[keyof typeof STREAM_EVENT_TYPES]

export interface StreamEvent {
    type: StreamEventType
    ts?: number
    interaction_id?: string
    turn?: number
    // delta-family fields
    delta?: string
    snapshot?: string
    // tool-family fields
    tool_call_id?: string
    tool_name?: string
    index?: number
    args?: string
    parsed_args?: unknown
    result?: unknown
    error?: string
    error_type?: string
    interrupted?: boolean
    // progress
    verb?: string
    /** Stable key for the tool's current phase (e.g. "read", "verify"). */
    phase?: string
    /** Traveler-facing intent grouping — used by the timeline UI to pick
     *  the right glyph: thinking / doing / looking / found / checking /
     *  saving / done. */
    intent?: string
    /** 0-based index of the phase within the tool's declared phase list. */
    phase_index?: number
    /** Total number of phases the tool can emit. */
    phase_total?: number
    /** Optional free-form context the tool attached to the current phase
     *  (e.g. ``{titles: [...], count: 3}`` while verifying venues). */
    details?: Record<string, unknown>
    // present-options (carousel payload)
    kind?: string
    title?: string
    items?: Array<Record<string, unknown>>
    allow_text_reply?: boolean
    /** Multi-select picker mode (prioritize-asks): toggle several cards,
     *  one confirm envelope with ``selected_items=[...]``. */
    multi_select?: boolean
    // present-options collection-window chrome (backend-owned; absent for a
    // plain pick-set). Mirrors the persisted child Interaction's output_data
    // so the live carousel renders the same "Showing N of M" + "See all".
    total_count?: number
    shown_count?: number
    view_all?: { action?: string; cta?: string }
    collection_label?: string
    // finish
    stop_reason?: string
    turns?: number
    final_message?: string
    interaction_ids?: string[]
    patch_applied?: boolean
    affected_days?: number[]
    /** Polymorphic CTA pills (e.g. "View changes" → navigation). Same
     *  shape the persisted ``output_data.actions`` already uses, so the
     *  existing ``<ResponseActions>`` renderer consumes them with no
     *  transformation. Present from FINISH onwards so the live card can
     *  surface CTAs immediately, without waiting for the persisted
     *  record. */
    actions?: ResponseAction[]
    /** Bundle of ``present-options`` carousels emitted during the turn.
     *  Same shape as the individual ``present-options`` events
     *  (``tool_call_id``, ``kind``, ``title``, ``items``,
     *  ``allow_text_reply``), just packed into FINISH so the live card
     *  has the full set on terminal — useful when the backend wants to
     *  defer carousel emission or when a resumed stream's replay missed
     *  one. The reducer dedupes by ``tool_call_id`` so re-emitting an
     *  already-streamed carousel is safe. */
    present_options?: Array<{
        tool_call_id?: string
        interaction_id?: string
        kind?: string
        title?: string
        items?: Array<Record<string, unknown>>
        allow_text_reply?: boolean
        multi_select?: boolean
        total_count?: number
        shown_count?: number
        view_all?: { action?: string; cta?: string }
        collection_label?: string
    }>
    ok?: boolean
    reason?: string
    // error
    recoverable?: boolean
    detail?: unknown
}

// Terminal event types — consumers stop after receiving one of these.
export const TERMINAL_EVENT_TYPES = new Set<StreamEventType>([
    STREAM_EVENT_TYPES.FINISH,
    STREAM_EVENT_TYPES.ABORT,
    STREAM_EVENT_TYPES.ERROR
])

// ── Request shape ───────────────────────────────────────────────────────────

export interface StreamConciergeInput {
    agentId: string
    tripId: string
    userId?: string
    threadId?: string
    /** Existing interaction_id (re-attempt) or undefined for a fresh turn. */
    interactionId?: string
    entityId?: string
    entityType?: string
    source?: string
    /** Concierge skills to force-activate for this turn (e.g.
     *  ``['schedule_shortlisted']`` from the one-tap bulk-schedule button).
     *  Action intent, independent of page ``source`` — the same button can
     *  live on any page. Sent as a top-level ``skills`` field, mirroring
     *  ``streamProfile``. BE honors only demandable profile skills. */
    skills?: string[]
    /** The user-typed message for this turn. */
    userText: string
    /** Tripboard AI Assistant — UUIDs of completed Attachment records.
     *  When present, the BE prepends extracted insights to the prompt. */
    attachmentIds?: string[]
    /** Experience ids the user is explicitly adding this turn (the "+ Add"
     *  fast path). A single add sends a one-element list; a bulk "schedule
     *  these picks" sends several. Lets the BE skip the search round-trip and
     *  act on the known experiences directly. Sent inside ``input_data`` as
     *  ``experience_ids``. */
    experienceIds?: string[]
    /** Opaque flight cache tokens (``rimigo_id``) the user is explicitly
     *  adding this turn from the Flights tab. The BE seeded these into its
     *  flight_cache at search time and returns one per result; round-tripping
     *  them lets the BE resolve the chosen flight without re-searching Kayak.
     *  Sent inside ``input_data`` as ``preresolved_flights``. */
    flightRimigoIds?: string[]
}

export interface StreamConciergeOptions {
    /** Invoked once per parsed SSE event. Throws are caught + re-raised as
     *  ``StreamClientError`` after the stream closes. */
    onEvent: (event: StreamEvent) => void | Promise<void>
    /** Abort the in-flight fetch. Standard DOM ``AbortController.signal``. */
    signal?: AbortSignal
}

export type StreamTerminationReason =
    | { kind: 'finish'; event: StreamEvent }
    | { kind: 'abort'; event: StreamEvent }
    | { kind: 'error'; event: StreamEvent }
    | { kind: 'disconnect'; cause?: unknown }

export class StreamClientError extends Error {
    readonly code: 'http_error' | 'parse_error' | 'no_body' | 'unauthorized'
    readonly status?: number
    readonly responseText?: string

    constructor(
        message: string,
        code: StreamClientError['code'],
        opts: { status?: number; responseText?: string; cause?: unknown } = {}
    ) {
        super(message)
        this.name = 'StreamClientError'
        this.code = code
        this.status = opts.status
        this.responseText = opts.responseText
        if (opts.cause !== undefined) {
            // Preserve the original error for debugging.
            ;(this as { cause?: unknown }).cause = opts.cause
        }
    }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Open a streaming concierge turn and invoke ``onEvent`` per parsed SSE
 * event until the stream terminates (``finish`` / ``abort`` / ``error``)
 * or the caller aborts via ``signal``.
 *
 * Resolves with the terminal reason so callers can branch on UX
 * (e.g. enable a "Retry" button on ``error``, persist the partial text
 * on ``abort``). Rejects only for transport-level failures —
 * protocol-level ``error`` events resolve normally with ``kind:
 * 'error'`` so they flow through the same render path as ``finish``.
 */
export async function streamConcierge(
    input: StreamConciergeInput,
    opts: StreamConciergeOptions
): Promise<StreamTerminationReason> {
    return postAndConsume(buildStreamUrl(input.agentId), buildRequestBody(input), opts)
}

// ── Profile streams (non-concierge) ─────────────────────────────────────────
// Same SSE endpoint + transport, but the caller supplies an arbitrary
// ``input_data`` payload (e.g. ``{profile: 'experience_fit', experience_id}``)
// instead of a chat turn. Reuses every internal (auth, URL, frame parsing,
// terminal handling) so there's one streaming code path to maintain.

export interface StreamProfileInput {
    agentId: string
    tripId: string
    /** Raw ``input_data`` object sent verbatim to the agent. */
    inputData: Record<string, unknown>
    entityId?: string
    entityType?: string
    source?: string
    /** Agent skills to enable for this turn (e.g. ['schedule_shortlisted']). */
    skills?: string[]
}

/**
 * Open a streaming agent turn driven by a raw ``input_data`` payload (a
 * "profile" call rather than a chat message). Resolves with the terminal
 * reason exactly like :func:`streamConcierge`.
 */
export async function streamProfile(
    input: StreamProfileInput,
    opts: StreamConciergeOptions
): Promise<StreamTerminationReason> {
    const body: Record<string, unknown> = {
        input_data: input.inputData,
        trip_id: input.tripId
    }
    if (input.entityId) body.entity_id = input.entityId
    if (input.entityType) body.entity_type = input.entityType
    if (input.source) body.source = input.source
    if (input.skills && input.skills.length > 0) body.skills = input.skills
    return postAndConsume(buildStreamUrl(input.agentId), body, opts)
}

/**
 * Shared POST → consume path for the streaming endpoint. Sends ``body`` as
 * JSON and streams the SSE response through :func:`consumeStream`. Transport
 * failures throw ``StreamClientError``; protocol ``error`` events resolve
 * normally with ``kind: 'error'``.
 */
async function postAndConsume(
    url: string,
    body: unknown,
    opts: StreamConciergeOptions
): Promise<StreamTerminationReason> {
    const headers = await buildHeaders()

    let response: Response
    try {
        // ``credentials: 'include'`` is intentionally omitted — the existing
        // axios ``apiClient`` doesn't send cookies either (auth is the
        // explicit ``Authorization`` header we attach in ``buildHeaders``).
        // Using ``include`` here triggers a CORS preflight that demands
        // a specific ``Access-Control-Allow-Origin`` + ``Allow-Credentials``
        // pair, which we don't need and the sancus gateway doesn't always
        // return.
        response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: opts.signal
        })
    } catch (err) {
        if (isAbortError(err)) {
            return { kind: 'disconnect', cause: err }
        }
        throw new StreamClientError('Network error opening stream', 'http_error', {
            cause: err
        })
    }

    if (response.status === 401) {
        throw new StreamClientError('Authentication failed', 'unauthorized', {
            status: 401
        })
    }

    if (!response.ok) {
        const text = await safeReadText(response)
        throw new StreamClientError(
            `Stream endpoint returned ${response.status}`,
            'http_error',
            { status: response.status, responseText: text }
        )
    }

    if (!response.body) {
        throw new StreamClientError('Response has no body', 'no_body', {
            status: response.status
        })
    }

    return await consumeStream(response.body, opts)
}

/**
 * Programmatically abort an in-flight stream by ``interaction_id``.
 *
 * Server-side: flips the ``abort_event`` on the registered service
 * instance; the generator emits orphan-tool cleanup + ``abort`` on its
 * next safe check point. Safe to call multiple times — repeat calls
 * just return ``{aborted: false}`` once the stream has finished.
 */
export async function abortConciergeStream(
    interactionId: string,
    reason: string = 'user_interrupt'
): Promise<{ aborted: boolean }> {
    try {
        const resp = await apiClient.post('/api/ata/abort/', {
            interaction_id: interactionId,
            reason
        })
        return { aborted: Boolean(resp.data?.data?.aborted) }
    } catch (err) {
        // Abort should never block the UI — log and report "not aborted".
        console.error('[stream] abort endpoint failed', err)
        return { aborted: false }
    }
}

/**
 * Subscribe to an in-flight concierge stream by ``interaction_id``.
 *
 * Used when the user reopens the assistant panel mid-turn and we
 * find an in-progress interaction on the server — instead of starting
 * a new turn, we open a GET subscription that replays the buffered
 * events and follows the live pub/sub channel until terminal.
 *
 * Resolves with the terminal reason just like :func:`streamConcierge`.
 * If the interaction is already committed (subscriber reaches finish /
 * abort / error in its replay phase), resolves immediately with that
 * terminal.
 */
export async function resumeConciergeStream(
    input: { agentId: string; interactionId: string },
    opts: StreamConciergeOptions
): Promise<StreamTerminationReason> {
    const url = buildResumeUrl(input.agentId, input.interactionId)
    const headers = await buildHeaders()

    let response: Response
    try {
        response = await fetch(url, {
            method: 'GET',
            headers,
            signal: opts.signal
        })
    } catch (err) {
        if (isAbortError(err)) {
            return { kind: 'disconnect', cause: err }
        }
        throw new StreamClientError('Network error opening resume stream', 'http_error', {
            cause: err
        })
    }

    if (response.status === 401) {
        throw new StreamClientError('Authentication failed', 'unauthorized', {
            status: 401
        })
    }

    if (!response.ok) {
        const text = await safeReadText(response)
        throw new StreamClientError(
            `Resume endpoint returned ${response.status}`,
            'http_error',
            { status: response.status, responseText: text }
        )
    }

    if (!response.body) {
        throw new StreamClientError('Response has no body', 'no_body', {
            status: response.status
        })
    }

    return await consumeStream(response.body, opts)
}

function buildResumeUrl(agentId: string, interactionId: string): string {
    const base = buildStreamUrl(agentId)
    const sep = base.includes('?') ? '&' : '?'
    return `${base}${sep}interaction_id=${encodeURIComponent(interactionId)}`
}

// ── Internals ───────────────────────────────────────────────────────────────

function buildStreamUrl(agentId: string): string {
    const base = API_CONFIG.BASE_URL?.replace(/\/$/, '') ?? ''
    return `${base}/api/ata/${encodeURIComponent(agentId)}/stream/`
}

async function buildHeaders(): Promise<Record<string, string>> {
    // Deliberately NOT sending ``Accept: text/event-stream``. DRF's
    // default renderer list is JSON-only, so a strict Accept header
    // triggers 406 Not Acceptable at content negotiation. Omitting
    // Accept lets the browser's default (``*/*``) through — the server
    // still responds with ``Content-Type: text/event-stream`` because
    // our view returns ``SSEResponse`` directly, which hard-sets it.
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    }
    const token = await TokenStorage.getAccessToken()
    if (token) {
        headers['Authorization'] = token
    }
    return headers
}

interface _StreamRequestBody {
    input_data: { user_text_input: string; attachment_ids?: string[]; experience_ids?: string[]; preresolved_flights?: string[] }
    thread_id?: string
    trip_id: string
    user_id?: string
    interaction_id?: string
    entity_id?: string
    entity_type?: string
    source?: string
    skills?: string[]
}

function buildRequestBody(input: StreamConciergeInput): _StreamRequestBody {
    const inputData: { user_text_input: string; attachment_ids?: string[]; experience_ids?: string[]; preresolved_flights?: string[] } = {
        user_text_input: input.userText
    }
    if (input.attachmentIds && input.attachmentIds.length > 0) {
        inputData.attachment_ids = input.attachmentIds
    }
    if (input.experienceIds && input.experienceIds.length > 0) {
        inputData.experience_ids = input.experienceIds
    }
    if (input.flightRimigoIds && input.flightRimigoIds.length > 0) {
        inputData.preresolved_flights = input.flightRimigoIds
    }
    const body: _StreamRequestBody = {
        input_data: inputData,
        trip_id: input.tripId
    }
    if (input.threadId) body.thread_id = input.threadId
    if (input.userId) body.user_id = input.userId
    if (input.interactionId) body.interaction_id = input.interactionId
    if (input.entityId) body.entity_id = input.entityId
    if (input.entityType) body.entity_type = input.entityType
    if (input.source) body.source = input.source
    if (input.skills && input.skills.length > 0) body.skills = input.skills
    return body
}

/**
 * Consume the SSE stream until a terminal event arrives or the peer
 * closes the connection. Invokes ``opts.onEvent`` synchronously per
 * parsed frame — consumers who need to do slow work (DB writes, UI
 * transitions) should queue in their callback rather than awaiting.
 */
async function consumeStream(
    body: ReadableStream<Uint8Array>,
    opts: StreamConciergeOptions
): Promise<StreamTerminationReason> {
    // Manual TextDecoder instead of ``pipeThrough(new TextDecoderStream())``
    // — the DOM stream-type lib has a long-running incompatibility between
    // TextDecoderStream.writable and the BYOB Uint8Array type that fails
    // strict TS builds. Manual decoding is two lines and sidesteps it.
    const reader = body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let terminal: StreamTerminationReason | null = null

    try {
        while (true) {
            let chunk: ReadableStreamReadResult<Uint8Array>
            try {
                chunk = await reader.read()
            } catch (err) {
                if (isAbortError(err)) return { kind: 'disconnect', cause: err }
                throw new StreamClientError('Stream read failed', 'http_error', {
                    cause: err
                })
            }
            if (chunk.done) {
                buffer += decoder.decode()
                if (buffer.trim()) {
                    const leftover = parseSseFrame(buffer)
                    if (leftover) await opts.onEvent(leftover)
                }
                break
            }

            buffer += decoder.decode(chunk.value, { stream: true })
            let boundary: number
            while ((boundary = buffer.indexOf('\n\n')) !== -1) {
                const rawFrame = buffer.slice(0, boundary)
                buffer = buffer.slice(boundary + 2)
                const event = parseSseFrame(rawFrame)
                if (event === null) continue

                try {
                    await opts.onEvent(event)
                } catch (err) {
                    console.error('[stream] onEvent handler threw', err)
                    // Fail-closed: if the consumer can't process an event,
                    // tearing the stream down is safer than silently dropping.
                    throw new StreamClientError('Event handler threw', 'parse_error', {
                        cause: err
                    })
                }

                if (TERMINAL_EVENT_TYPES.has(event.type)) {
                    terminal = terminalFromEvent(event)
                    return terminal
                }
            }
        }
    } finally {
        try {
            reader.releaseLock()
        } catch {
            // best-effort cleanup
        }
    }

    // Peer closed without a terminal — treat as disconnect so callers can
    // decide whether to reconnect, retry, or surface an error.
    return terminal ?? { kind: 'disconnect' }
}

function terminalFromEvent(event: StreamEvent): StreamTerminationReason {
    if (event.type === STREAM_EVENT_TYPES.FINISH) return { kind: 'finish', event }
    if (event.type === STREAM_EVENT_TYPES.ABORT) return { kind: 'abort', event }
    return { kind: 'error', event }
}

/**
 * Parse one SSE record (everything between two blank lines) into a
 * StreamEvent. Returns ``null`` for comment-only frames (``:\n``
 * heartbeats and flush-padding). Multi-line ``data:`` values are
 * joined per the SSE spec.
 */
function parseSseFrame(rawFrame: string): StreamEvent | null {
    if (!rawFrame.trim()) return null

    let eventField = ''
    const dataLines: string[] = []

    for (const rawLine of rawFrame.split('\n')) {
        const line = rawLine.replace(/\r$/, '')
        if (line === '' || line.startsWith(':')) continue

        if (line.startsWith('event:')) {
            eventField = line.slice(6).trim()
            continue
        }
        if (line.startsWith('data:')) {
            // Spec: strip exactly one leading space if present.
            let payload = line.slice(5)
            if (payload.startsWith(' ')) payload = payload.slice(1)
            dataLines.push(payload)
            continue
        }
        // Unknown field — ignore per SSE spec.
    }

    if (dataLines.length === 0) return null

    const payload = dataLines.join('\n')
    let parsed: unknown
    try {
        parsed = JSON.parse(payload)
    } catch (err) {
        console.warn('[stream] non-JSON data frame ignored', err, payload)
        return null
    }

    if (!isStreamEventShape(parsed)) {
        console.warn('[stream] unexpected event shape ignored', parsed)
        return null
    }

    // Trust the payload's ``type`` over the ``event:`` header if they
    // disagree — our backend sets both from the same source but payload
    // is authoritative.
    const resolvedType = (parsed as { type?: string }).type ?? eventField
    return { ...(parsed as StreamEvent), type: resolvedType as StreamEventType }
}

function isStreamEventShape(value: unknown): value is StreamEvent {
    return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string'
}

async function safeReadText(response: Response): Promise<string | undefined> {
    try {
        return await response.text()
    } catch {
        return undefined
    }
}

function isAbortError(err: unknown): boolean {
    return err instanceof DOMException && err.name === 'AbortError'
}
