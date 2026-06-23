/**
 * React hook wrapping the concierge SSE client.
 *
 * Owns:
 *   * An in-flight ``AbortController`` bound to component lifetime — the
 *     streaming fetch is cancelled automatically on unmount, which the
 *     backend treats as a ``disconnect`` abort (no explicit POST needed).
 *   * A state machine: ``idle | streaming | aborting | done | errored``.
 *   * Incremental text snapshot + per-turn tool phases + inline
 *     ``present-options`` carousels + terminal summary.
 *
 * Exposes:
 *   * ``sendTurn(userText)`` — starts a new turn; throws if another turn
 *     is already in flight (callers should gate with ``status``).
 *   * ``stop()`` — user-initiated abort. POSTs to ``/api/ata/abort/`` AND
 *     aborts the fetch, so the server's orphan-tool cleanup runs before
 *     the connection dies.
 *   * ``reset()`` — clear state between turns.
 *   * Full ``StreamState`` snapshot for rendering.
 *
 * Consumers should render ``state.textSnapshot`` live during streaming,
 * merge ``state.presentOptions`` carousels inline as they arrive, and
 * show a "Stop generating" control whenever ``state.status ===
 * 'streaming'``.
 */
import { useCallback, useEffect, useReducer, useRef } from 'react'

import {
    abortConciergeStream,
    resumeConciergeStream,
    STREAM_EVENT_TYPES,
    StreamClientError,
    StreamEvent,
    StreamEventType,
    streamConcierge,
    StreamTerminationReason
} from '@/api/ataAPI/streamApi'

// ── Types ───────────────────────────────────────────────────────────────────

export type StreamStatus = 'idle' | 'streaming' | 'aborting' | 'done' | 'errored'

export type PhaseIntent =
    | 'thinking'
    | 'doing'
    | 'looking'
    | 'found'
    | 'checking'
    | 'saving'
    | 'done'

export interface ToolPhaseStep {
    /** Stable phase key — matches the backend declaration
     *  (e.g. ``read``, ``verify``, ``found``). */
    key: string
    /** Human-readable traveler-language label; dynamic when the tool
     *  enriched it ("Looking for restaurants in Sentosa…"). */
    verb: string
    /** Traveler-facing intent grouping — drives the timeline glyph. */
    intent: PhaseIntent
    /** 0-based index within the tool's declared phase list. */
    index: number
    /** Total number of declared phases. Stable across emissions from the
     *  same tool, so the UI can render ``index+1 of total``. */
    total: number
    /** Optional context — rendered beneath the phase label. */
    details?: Record<string, unknown>
    /** Client-local timestamps for elapsed-time rendering. ``completedAt``
     *  is filled in when the next phase advances or the tool ends. */
    startedAt: number
    completedAt?: number
}

export interface ToolPhase {
    toolCallId: string
    toolName: string
    /** ``pending`` while still streaming arguments; ``running`` once args
     *  are complete and dispatch is in flight; ``done`` / ``error`` after
     *  the tool result lands. */
    state: 'pending' | 'running' | 'done' | 'error'
    verb?: string
    argsSnapshot?: string
    result?: unknown
    errorMessage?: string
    startedAt: number
    completedAt?: number
    /** Ordered history of progress phases emitted for this tool call. The
     *  last entry is the "current" phase while the tool runs. */
    phases: ToolPhaseStep[]
    /** Static total inherited from the latest phase emission — handy for
     *  the collapsed pill (``2 of 5``). */
    phaseTotal?: number
}

export interface PresentOptionsPayload {
    toolCallId: string
    interactionId: string
    kind?: string
    title?: string
    items: Array<Record<string, unknown>>
    allowTextReply: boolean
    multiSelect?: boolean
    receivedAt: number
    // Collection-window chrome (backend-owned) — present only when the
    // carousel is a window into a known collection. Mirrors the persisted
    // child Interaction's output_data so the LIVE stream renders the same
    // "Showing N of M" header + "See all" the reload path does.
    totalCount?: number
    shownCount?: number
    viewAll?: { action?: string; cta?: string }
    collectionLabel?: string
}

export interface StreamState {
    status: StreamStatus
    /** Current interaction_id (resolved from the first event that carries one). */
    interactionId: string | null
    /** Most recent turn number observed. */
    currentTurn: number
    /** Live-updating full assistant text for the latest turn. */
    textSnapshot: string
    /** Final assistant message once ``finish`` lands — the canonical text
     *  for downstream rendering. */
    finalMessage: string | null
    /** Per-tool status keyed by tool_call_id; ordered by start time. */
    tools: ToolPhase[]
    /** Carousels emitted by ``present_options`` tool, newest last. */
    presentOptions: PresentOptionsPayload[]
    /** Last progress verb — displayed as a subtle status strip. */
    progressVerb: string | null
    /** Terminal summary (finish / abort / error). */
    terminal: StreamTerminationReason | null
    /** Transport- or protocol-level failure. Null unless something broke. */
    error: {
        message: string
        recoverable: boolean
        code?: StreamClientError['code']
    } | null
    /** True while we're rebuilding state from a server-side resume replay.
     *  The resume endpoint emits the buffered event log from step 0 — text
     *  deltas, tool/phase rows, the lot — and only then follows live events.
     *  Consumers (specifically ``useStreamingQueue``) read this flag to skip
     *  the typing-cadence throttle during the burst so the user sees the
     *  current progress immediately instead of watching the animation
     *  replay from empty. Cleared by a debounce in the hook once the
     *  replay burst settles, or unconditionally on terminal / reset. */
    isResuming: boolean
    /** True while the FE is silently re-attaching to a buffered server
     *  stream after a transient transport error (sancus timeout, pod
     *  recycle, GOAWAY). The streaming card stays mounted with its
     *  partial text + tools intact; the replay rewires under the hood
     *  via TEXT_DELTA snapshot overwrites. Distinct from ``isResuming``
     *  because the user never asked for a resume — they don't need to
     *  see a "Resuming…" treatment, just uninterrupted output. */
    isAutoResuming: boolean
}

const INITIAL_STATE: StreamState = {
    status: 'idle',
    interactionId: null,
    currentTurn: 0,
    textSnapshot: '',
    finalMessage: null,
    tools: [],
    presentOptions: [],
    progressVerb: null,
    terminal: null,
    error: null,
    isResuming: false,
    isAutoResuming: false
}

// ── Silent auto-resume tuning ───────────────────────────────────────────────
// When the SSE reader drops mid-turn (sancus 60s timeout, pod recycle,
// HTTP/2 GOAWAY) we open a fresh resume subscription against the same
// interaction id. The BE keeps the concierge task running as a detached
// asyncio task and buffers every emitted event, so re-attaching is free.
// Three attempts with growing backoff covers the realistic transient
// window without looping forever on a genuinely-dead stream.
const AUTO_RESUME_MAX_ATTEMPTS = 3
const AUTO_RESUME_BACKOFFS_MS = [400, 1200, 2500]

// ── Reducer ─────────────────────────────────────────────────────────────────

type Action =
    | { type: 'start' }
    | { type: 'resume-start' }
    | { type: 'auto-resume-start' }
    | { type: 'resume-burst-done' }
    | { type: 'event'; event: StreamEvent }
    | { type: 'terminal'; reason: StreamTerminationReason }
    | {
          type: 'fail'
          error: { message: string; recoverable: boolean; code?: StreamClientError['code'] }
      }
    | { type: 'abort-requested' }
    | { type: 'reset' }

function reducer(state: StreamState, action: Action): StreamState {
    switch (action.type) {
        case 'start':
            return { ...INITIAL_STATE, status: 'streaming' }
        case 'resume-start':
            return { ...INITIAL_STATE, status: 'streaming', isResuming: true }
        case 'auto-resume-start':
            // Preserve textSnapshot / tools / presentOptions so the
            // streaming card stays mounted with its current content.
            // The replay's TEXT_DELTA snapshots will overwrite as
            // events arrive — no visible flicker. We only flip the
            // flag and clear any stale error.
            return { ...state, status: 'streaming', isAutoResuming: true, error: null }
        case 'resume-burst-done':
            return state.isResuming ? { ...state, isResuming: false } : state
        case 'reset':
            return INITIAL_STATE
        case 'abort-requested':
            return state.status === 'streaming' ? { ...state, status: 'aborting' } : state
        case 'fail':
            return {
                ...state,
                status: 'errored',
                error: action.error,
                isResuming: false,
                isAutoResuming: false
            }
        case 'terminal':
            return {
                ...state,
                status: terminalStatus(action.reason.kind),
                terminal: action.reason,
                finalMessage: finalMessageFromTerminal(action.reason, state),
                presentOptions: mergePresentOptionsFromTerminal(
                    state.presentOptions,
                    action.reason,
                ),
                // Clear the ambient progress verb on terminal so the next
                // user message doesn't briefly see the previous turn's
                // stale "Applying…" / "Searching…" before the new
                // turn's events repopulate it.
                progressVerb: null,
                isResuming: false,
                isAutoResuming: false
            }
        case 'event':
            return applyEvent(state, action.event)
    }
}

function terminalStatus(kind: StreamTerminationReason['kind']): StreamStatus {
    switch (kind) {
        case 'finish':
            return 'done'
        case 'abort':
            return 'done'
        case 'error':
            return 'errored'
        case 'disconnect':
            return 'done'
    }
}

function finalMessageFromTerminal(
    reason: StreamTerminationReason,
    state: StreamState
): string | null {
    if (reason.kind === 'finish') {
        return reason.event.final_message ?? state.textSnapshot ?? null
    }
    // Abort / error / disconnect: keep whatever text streamed so far.
    return state.textSnapshot || null
}

/**
 * Stable content-fingerprint for a ``PresentOptionsPayload``. Used to
 * dedupe across the two emission paths (standalone ``present-options``
 * event during the turn vs. ``present_options`` bundle inside FINISH)
 * because the backend's ``tool_call_id`` doesn't reliably match between
 * those paths — same carousel can arrive with different IDs (or the
 * bundle can omit them entirely).
 *
 * The fingerprint combines:
 *   - ``tool_call_id`` (when present) as a strong primary signal,
 *   - title + item count + first/last item key (id/title/name) as a
 *     content signature that holds even when IDs drift.
 *
 * Two carousels with the same content (same title, same items in the
 * same order) collapse to one render regardless of which path they
 * arrived through.
 */
function presentOptionsFingerprint(p: PresentOptionsPayload): string {
    // The concierge ``present_options`` tool emits items in the nested
    // ``{ display: { title, name, ... }, on_select: { ... } }`` shape.
    // Reading only top-level fields makes the fingerprint collapse to
    // empty for every item and the dedupe stops working — drill into
    // ``display`` (and ``on_select``) as well so equally-presented
    // carousels collide regardless of which path they arrived through.
    const itemKey = (item: Record<string, unknown> | undefined): string => {
        if (!item) return ''
        const display = (item.display ?? {}) as Record<string, unknown>
        const onSelect = (item.on_select ?? {}) as Record<string, unknown>
        const structured = (item.structured_data ?? {}) as Record<string, unknown>
        const id =
            item.id ??
            item.entity_id ??
            item.uuid ??
            display.id ??
            structured.id ??
            onSelect.id
        if (id !== undefined && id !== null) return String(id)
        const name =
            item.title ??
            item.name ??
            item.label ??
            display.title ??
            display.name ??
            display.label
        return name !== undefined && name !== null ? String(name) : ''
    }
    const first = itemKey(p.items[0] as Record<string, unknown> | undefined)
    const last = itemKey(p.items[p.items.length - 1] as Record<string, unknown> | undefined)
    const title = (p.title ?? '').trim().toLowerCase()
    // Content-only fingerprint — explicitly NO tool_call_id. The whole
    // point of this dedupe is that two emissions of the same carousel
    // (one as a standalone ``present-options`` event, one inside the
    // FINISH bundle) can disagree on ``tool_call_id`` — folding it into
    // the fingerprint would make identical content produce different
    // fingerprints and the dedupe would never fire. ``tool_call_id`` is
    // tracked as a separate dedupe key by the caller instead.
    return [`t:${title}`, `n:${p.items.length}`, `f:${first}`, `l:${last}`].join('|')
}

/**
 * Fold any ``present_options`` bundle carried inside FINISH into the
 * running list, deduped by content fingerprint. The backend may emit
 * carousels as standalone ``present-options`` events during the turn
 * AND/OR pack them into FINISH — the fingerprint-based dedupe keeps
 * both paths safe even when ``tool_call_id`` doesn't agree across them.
 * Also covers the resume case where the replay window dropped a
 * standalone event but the FINISH bundle still has it.
 */
function mergePresentOptionsFromTerminal(
    current: PresentOptionsPayload[],
    reason: StreamTerminationReason
): PresentOptionsPayload[] {
    if (reason.kind !== 'finish') return current
    const bundled = reason.event.present_options
    if (!Array.isArray(bundled) || bundled.length === 0) return current

    const seen = new Set<string>()
    // Seed with fingerprints of carousels already in state — and with
    // their tool_call_ids so an exact tool_call_id match still dedupes
    // even when the content fingerprint differs (e.g. item ordering
    // diverged between the two paths).
    for (const p of current) {
        seen.add(presentOptionsFingerprint(p))
        if (p.toolCallId) seen.add(`tc:${p.toolCallId}`)
    }
    const additions: PresentOptionsPayload[] = []
    for (const raw of bundled) {
        const payload = asPresentOptionsPayload({
            // Shim — ``asPresentOptionsPayload`` expects ``StreamEvent``
            // shape (snake_case), and the bundle entries already use
            // those keys. Falling through ``as`` keeps the helper as
            // the single source of truth for normalization.
            //
            // ``interaction_id`` fallback: the BE *should* include each
            // carousel's child Interaction id per bundle entry (same
            // id that ``buildChatMessages`` later picks up as
            // ``message.interactionId`` and feeds into the persisted
            // card's selection envelope). When it isn't present we
            // fall through to the FINISH event's top-level
            // ``interaction_id`` so clicks at least carry the parent
            // turn id — better than an empty correlation key. Long
            // term: ship per-entry ids from the agent.
            ...raw,
            interaction_id: raw.interaction_id ?? reason.event.interaction_id,
            type: STREAM_EVENT_TYPES.PRESENT_OPTIONS,
        } as StreamEvent)
        const fp = presentOptionsFingerprint(payload)
        const tcKey = payload.toolCallId ? `tc:${payload.toolCallId}` : ''
        if (seen.has(fp) || (tcKey && seen.has(tcKey))) continue
        seen.add(fp)
        if (tcKey) seen.add(tcKey)
        additions.push(payload)
    }
    return additions.length === 0 ? current : [...current, ...additions]
}

function applyEvent(state: StreamState, event: StreamEvent): StreamState {
    let next = state
    if (event.interaction_id && !next.interactionId) {
        next = { ...next, interactionId: event.interaction_id }
    }
    if (typeof event.turn === 'number' && event.turn > next.currentTurn) {
        next = { ...next, currentTurn: event.turn }
    }
    return applyEventByType(next, event)
}

function applyEventByType(state: StreamState, event: StreamEvent): StreamState {
    switch (event.type) {
        case STREAM_EVENT_TYPES.TEXT_START:
            // A new assistant turn's text is beginning — clear any prior
            // turn's snapshot so the UI doesn't concatenate across turns.
            //
            // Exception: during a silent auto-resume we already have a
            // partial textSnapshot from before the transport blip. The
            // BE's replay starts at event 0 so TEXT_START arrives early
            // in the burst; if we reset, the streaming card briefly
            // flashes empty before TEXT_DELTAs refill it. Skip the
            // reset — the first TEXT_DELTA snapshot will overwrite
            // cleanly without the gap.
            if (state.isAutoResuming && state.textSnapshot) {
                return state
            }
            return { ...state, textSnapshot: '' }

        case STREAM_EVENT_TYPES.TEXT_DELTA:
            return {
                ...state,
                textSnapshot: event.snapshot ?? state.textSnapshot + (event.delta ?? '')
            }

        case STREAM_EVENT_TYPES.TEXT_END:
            if (event.snapshot !== undefined && event.snapshot !== null) {
                return { ...state, textSnapshot: event.snapshot }
            }
            return state

        case STREAM_EVENT_TYPES.TOOL_INPUT_START:
            return { ...state, tools: upsertTool(state.tools, event, 'pending') }

        case STREAM_EVENT_TYPES.TOOL_INPUT_DELTA:
            return {
                ...state,
                tools: mapTool(state.tools, event.tool_call_id, (t) => ({
                    ...t,
                    argsSnapshot: event.snapshot ?? t.argsSnapshot
                }))
            }

        case STREAM_EVENT_TYPES.TOOL_INPUT_AVAILABLE:
            return {
                ...state,
                tools: mapTool(state.tools, event.tool_call_id, (t) => ({
                    ...t,
                    state: 'running',
                    argsSnapshot: event.args ?? t.argsSnapshot
                }))
            }

        case STREAM_EVENT_TYPES.PROGRESS:
            return applyProgressEvent(state, event)

        case STREAM_EVENT_TYPES.TOOL_OUTPUT_AVAILABLE:
            return {
                ...state,
                tools: mapTool(state.tools, event.tool_call_id, (t) => ({
                    ...t,
                    state: 'done',
                    result: event.result,
                    completedAt: Date.now(),
                    phases: closeTrailingPhase(t.phases)
                }))
            }

        case STREAM_EVENT_TYPES.TOOL_OUTPUT_ERROR:
            return {
                ...state,
                tools: mapTool(state.tools, event.tool_call_id, (t) => ({
                    ...t,
                    state: 'error',
                    errorMessage: event.error,
                    completedAt: Date.now(),
                    phases: closeTrailingPhase(t.phases)
                }))
            }

        case STREAM_EVENT_TYPES.PRESENT_OPTIONS:
            return {
                ...state,
                presentOptions: [...state.presentOptions, asPresentOptionsPayload(event)]
            }

        default:
            return state
    }
}

function upsertTool(tools: ToolPhase[], event: StreamEvent, phase: ToolPhase['state']): ToolPhase[] {
    const id = event.tool_call_id ?? ''
    if (!id) return tools
    if (tools.some((t) => t.toolCallId === id)) return tools
    return [
        ...tools,
        {
            toolCallId: id,
            toolName: event.tool_name ?? '',
            state: phase,
            verb: undefined,
            startedAt: Date.now(),
            phases: []
        }
    ]
}

/**
 * Apply a structured ``progress`` event.
 *
 * Structured payloads carry ``tool_name``, ``tool_call_id``, ``phase``,
 * ``phase_index``, ``phase_total``, and optional ``details``. We use them to
 * (a) reserve a :class:`ToolPhase` entry if the tool_input_start didn't
 * arrive first, and (b) append (or re-append) a :class:`ToolPhaseStep`
 * so the checklist UI renders live phase progression.
 *
 * Falls back gracefully to legacy single-verb updates — events without
 * ``tool_call_id`` still update the global ``progressVerb`` strip so the
 * pre-structured callers keep working.
 */
function applyProgressEvent(state: StreamState, event: StreamEvent): StreamState {
    const verb = event.verb ?? state.progressVerb
    const id = event.tool_call_id
    if (!id || !event.phase) {
        return { ...state, progressVerb: verb }
    }

    const now = Date.now()
    const step: ToolPhaseStep = {
        key: event.phase,
        verb: event.verb ?? event.phase,
        intent: ((event.intent ?? 'doing') as PhaseIntent),
        index: event.phase_index ?? 0,
        total: event.phase_total ?? 1,
        details: event.details,
        startedAt: now
    }

    const exists = state.tools.some((t) => t.toolCallId === id)
    const tools = exists
        ? state.tools.map((t) => (t.toolCallId === id ? appendPhaseStep(t, step) : t))
        : [
              ...state.tools,
              {
                  toolCallId: id,
                  toolName: event.tool_name ?? '',
                  state: 'running' as const,
                  startedAt: now,
                  phases: [step],
                  phaseTotal: step.total
              }
          ]

    return { ...state, progressVerb: verb, tools }
}

/** Stamp ``completedAt`` on the trailing open phase. Called when a tool
 *  finishes — no further phases will arrive, so the last one's duration
 *  should reflect the time up to the tool's output landing. */
function closeTrailingPhase(phases: ToolPhaseStep[]): ToolPhaseStep[] {
    if (phases.length === 0) return phases
    const last = phases[phases.length - 1]
    if (last.completedAt !== undefined) return phases
    return [...phases.slice(0, -1), { ...last, completedAt: Date.now() }]
}

function appendPhaseStep(tool: ToolPhase, step: ToolPhaseStep): ToolPhase {
    // Close the previous open phase so the checklist renders accurate
    // per-phase durations — the tool advanced past it.
    const priorPhases = tool.phases.map((p, i) =>
        i === tool.phases.length - 1 && p.completedAt === undefined
            ? { ...p, completedAt: step.startedAt }
            : p
    )
    // Re-emissions of the same phase key replace the last entry instead
    // of stacking duplicates — lets tools refine their verb/details
    // without visual drift.
    const shouldReplaceLast =
        priorPhases.length > 0 && priorPhases[priorPhases.length - 1].key === step.key
    const phases = shouldReplaceLast
        ? [...priorPhases.slice(0, -1), step]
        : [...priorPhases, step]

    return {
        ...tool,
        phases,
        phaseTotal: step.total
    }
}

function mapTool(
    tools: ToolPhase[],
    id: string | undefined,
    fn: (tool: ToolPhase) => ToolPhase
): ToolPhase[] {
    if (!id) return tools
    let mutated = false
    const next = tools.map((t) => {
        if (t.toolCallId !== id) return t
        mutated = true
        return fn(t)
    })
    return mutated ? next : tools
}

function asPresentOptionsPayload(event: StreamEvent): PresentOptionsPayload {
    return {
        toolCallId: event.tool_call_id ?? '',
        interactionId: String(event.interaction_id ?? ''),
        kind: event.kind,
        title: event.title,
        items: Array.isArray(event.items) ? event.items : [],
        allowTextReply: event.allow_text_reply ?? true,
        multiSelect: event.multi_select === true,
        receivedAt: Date.now(),
        // Forward the collection-window chrome the backend stamped on the event
        // (absent for a plain pick-set) so the live carousel matches the reload.
        totalCount: typeof event.total_count === 'number' ? event.total_count : undefined,
        shownCount: typeof event.shown_count === 'number' ? event.shown_count : undefined,
        viewAll: event.view_all as { action?: string; cta?: string } | undefined,
        collectionLabel: typeof event.collection_label === 'string' ? event.collection_label : undefined
    }
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface UseConciergeStreamParams {
    agentId: string
    tripId: string
    userId?: string
    threadId?: string
    entityId?: string
    entityType?: string
    source?: string
    /** Optional callback fired per incoming event. Useful for telemetry
     *  or side-channel UI (e.g. confetti on ``patch_applied``). */
    onEvent?: (event: StreamEvent) => void
}

export interface SendTurnOverrides {
    /** Override the hook's default ``threadId`` for this turn — useful
     *  when the latest thread is resolved right before sending. */
    threadId?: string | null
    /** Re-attempt an existing interaction (rare; normally omitted). */
    interactionId?: string
    /** Tripboard AI Assistant — completed Attachment ids to fold into
     *  ``input_data.attachment_ids`` so the BE injects extracted
     *  insights into the agent's prompt. */
    attachmentIds?: string[]
    /** Concierge skills to force-activate for this turn (e.g.
     *  ``['schedule_shortlisted']`` from the one-tap bulk-schedule button).
     *  Action intent, independent of page ``source`` — forwarded verbatim to
     *  ``streamConcierge`` as a top-level field. BE honors only demandable
     *  profile skills. */
    skills?: string[]
    /** Experience ids the user is explicitly adding this turn (the "+ Add"
     *  fast path). Folded into ``input_data.experience_ids`` so the BE can
     *  act on the known experiences without re-running search. One id for a
     *  single add; several for a bulk "schedule these picks". */
    experienceIds?: string[]
    /** Opaque flight cache tokens (``rimigo_id``) for flights the user is
     *  explicitly adding this turn from the Flights tab. Folded into
     *  ``input_data.preresolved_flights`` so the BE resolves the chosen flight
     *  from its search-time cache instead of re-searching Kayak. */
    flightRimigoIds?: string[]
}

export interface UseConciergeStreamReturn {
    state: StreamState
    sendTurn: (userText: string, overrides?: SendTurnOverrides) => Promise<void>
    /** Resume watching an already-in-flight interaction — used when the
     *  user reopens the assistant mid-turn. Opens a GET subscription
     *  that replays buffered events then follows the live pub/sub
     *  channel until terminal. */
    resume: (interactionId: string) => Promise<void>
    stop: () => Promise<void>
    reset: () => void
}

export function useConciergeStream(
    params: UseConciergeStreamParams
): UseConciergeStreamReturn {
    const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

    const abortRef = useRef<AbortController | null>(null)
    const activeInteractionRef = useRef<string | null>(null)
    // Keep the latest onEvent without re-creating ``sendTurn`` callbacks.
    const onEventRef = useRef(params.onEvent)
    onEventRef.current = params.onEvent

    // Silent auto-resume bookkeeping. ``retryCountRef`` accumulates across
    // a single logical turn — reset to 0 on fresh sendTurn, on terminal,
    // and on stop/reset. ``autoResumeTimerRef`` holds the pending retry
    // timer so we can cancel it cleanly on unmount / stop.
    // ``resumeRef`` breaks the circular dep so the sendTurn catch block
    // can schedule a resume without referencing the ``resume`` const
    // (declared after).
    const retryCountRef = useRef(0)
    const autoResumeTimerRef = useRef<number | null>(null)
    const resumeRef = useRef<((interactionId: string, opts?: { soft?: boolean }) => Promise<void>) | null>(null)

    const clearAutoResumeTimer = useCallback(() => {
        if (autoResumeTimerRef.current !== null) {
            window.clearTimeout(autoResumeTimerRef.current)
            autoResumeTimerRef.current = null
        }
    }, [])

    /** Classify the error as a transient transport blip that the BE's
     *  event buffer can recover from. ``parse_error`` / ``unauthorized``
     *  / ``no_body`` are signs of something genuinely wrong and should
     *  surface to the user; only ``http_error`` (fetch read failed,
     *  504/502 from sancus, GOAWAY etc.) gets the silent retry. */
    const isTransientStreamError = useCallback((err: unknown): boolean => {
        return err instanceof StreamClientError && err.code === 'http_error'
    }, [])

    /** Schedule a silent resume against the current interactionId. Bumps
     *  the retry counter, picks a backoff slot, and fires after the wait
     *  unless the panel was closed in the meantime. Returns ``true`` if
     *  a retry was scheduled — caller should NOT dispatch 'fail'. */
    const scheduleSilentResume = useCallback(
        (interactionId: string): boolean => {
            if (retryCountRef.current >= AUTO_RESUME_MAX_ATTEMPTS) return false
            const attemptIdx = retryCountRef.current
            retryCountRef.current += 1
            const delay =
                AUTO_RESUME_BACKOFFS_MS[attemptIdx] ??
                AUTO_RESUME_BACKOFFS_MS[AUTO_RESUME_BACKOFFS_MS.length - 1]
            clearAutoResumeTimer()
            autoResumeTimerRef.current = window.setTimeout(() => {
                autoResumeTimerRef.current = null
                // Re-check we still want to resume — the user may have
                // closed the panel, or another turn may have started.
                if (
                    activeInteractionRef.current === interactionId &&
                    !abortRef.current
                ) {
                    void resumeRef.current?.(interactionId, { soft: true })
                }
            }, delay)
            return true
        },
        [clearAutoResumeTimer],
    )

    // Cleanup on unmount: close our LOCAL fetch reader, but deliberately
    // do NOT signal the server. The backend now runs the concierge as a
    // detached asyncio task (see ``spawn_concierge_stream``) which keeps
    // going regardless of HTTP connection state. The user can reopen
    // the assistant and resume via ``resume(interactionId)`` below. Stop
    // remains the ONLY path that aborts the server-side task.
    useEffect(() => {
        return () => {
            clearAutoResumeTimer()
            abortRef.current?.abort()
            abortRef.current = null
        }
    }, [clearAutoResumeTimer])

    // Resume-burst debounce. The server's resume endpoint replays the
    // entire buffered event log before catching up to live — text deltas
    // and phase rows arrive in rapid bursts. While ``isResuming`` is true
    // the streaming queue mirrors source state directly (no throttle), so
    // the user instantly sees the current step instead of watching the
    // typing animation replay from empty. We flip ``isResuming`` off once
    // the source has been idle for a short window — by then the replay
    // is done and only true live events remain, which deserve the normal
    // typing cadence. The deps track every signal that grows when an
    // event lands.
    useEffect(() => {
        if (!state.isResuming) return
        const timeoutId = window.setTimeout(() => {
            dispatch({ type: 'resume-burst-done' })
        }, 400)
        return () => window.clearTimeout(timeoutId)
    }, [
        state.isResuming,
        state.textSnapshot,
        state.tools.length,
        state.tools.map((t) => t.phases.length).join(','),
        state.progressVerb
    ])

    const sendTurn = useCallback(
        async (userText: string, overrides?: SendTurnOverrides) => {
            if (!userText.trim()) return
            if (abortRef.current) {
                throw new Error('useConciergeStream: another turn is already in flight')
            }

            const controller = new AbortController()
            abortRef.current = controller
            activeInteractionRef.current = null
            // Fresh logical turn — reset the silent-retry budget.
            retryCountRef.current = 0
            clearAutoResumeTimer()
            dispatch({ type: 'start' })

            // Per-call overrides take precedence over the hook's configured
            // defaults — lets the caller thread the latest resolved thread_id
            // without re-instantiating the hook.
            const threadIdForTurn = overrides?.threadId ?? params.threadId ?? undefined
            const interactionIdForTurn = overrides?.interactionId
            const attachmentIdsForTurn = overrides?.attachmentIds
            const skillsForTurn = overrides?.skills
            const experienceIdsForTurn = overrides?.experienceIds
            const flightRimigoIdsForTurn = overrides?.flightRimigoIds

            try {
                const terminal = await streamConcierge(
                    {
                        agentId: params.agentId,
                        tripId: params.tripId,
                        userId: params.userId,
                        threadId: threadIdForTurn ?? undefined,
                        interactionId: interactionIdForTurn,
                        entityId: params.entityId,
                        entityType: params.entityType,
                        source: params.source,
                        userText,
                        attachmentIds: attachmentIdsForTurn,
                        skills: skillsForTurn,
                        experienceIds: experienceIdsForTurn,
                        flightRimigoIds: flightRimigoIdsForTurn
                    },
                    {
                        signal: controller.signal,
                        onEvent: (event) => {
                            if (event.interaction_id) {
                                activeInteractionRef.current = event.interaction_id
                            }
                            dispatch({ type: 'event', event })
                            onEventRef.current?.(event)
                        }
                    }
                )
                dispatch({ type: 'terminal', reason: terminal })
                // Turn closed cleanly — drop the retry budget so a new
                // turn starts fresh even if this one absorbed a couple
                // of silent retries.
                retryCountRef.current = 0
                clearAutoResumeTimer()
            } catch (err) {
                // Always release the abort handle for THIS turn before we
                // potentially schedule a resume — the resume path opens
                // its own AbortController and refuses to run if one is
                // still attached.
                if (abortRef.current === controller) {
                    abortRef.current = null
                }
                const interactionId = activeInteractionRef.current
                if (
                    isTransientStreamError(err) &&
                    interactionId &&
                    scheduleSilentResume(interactionId)
                ) {
                    // Don't dispatch 'fail' — leave the streaming card
                    // mounted with its current textSnapshot/tools while
                    // the retry timer ticks. Early return so the finally
                    // doesn't double-clear the abort handle.
                    return
                }
                const clientError = err as StreamClientError
                dispatch({
                    type: 'fail',
                    error: {
                        message:
                            clientError instanceof StreamClientError
                                ? clientError.message
                                : String((err as Error)?.message ?? err),
                        recoverable: clientError?.code === 'http_error',
                        code: clientError?.code
                    }
                })
                return
            } finally {
                if (abortRef.current === controller) {
                    abortRef.current = null
                }
            }
        },
        [
            params.agentId,
            params.tripId,
            params.userId,
            params.threadId,
            params.entityId,
            params.entityType,
            params.source,
            clearAutoResumeTimer,
            isTransientStreamError,
            scheduleSilentResume
        ]
    )

    const resume = useCallback(
        async (interactionId: string, opts: { soft?: boolean } = {}) => {
            if (!interactionId) return
            if (abortRef.current) {
                throw new Error('useConciergeStream: another turn is already in flight')
            }

            const controller = new AbortController()
            abortRef.current = controller
            activeInteractionRef.current = interactionId
            // Soft resume preserves the current streaming card content
            // (silent recovery); the regular path wipes state and shows
            // the "Resuming…" treatment via ``isResuming``.
            dispatch({ type: opts.soft ? 'auto-resume-start' : 'resume-start' })

            try {
                const terminal = await resumeConciergeStream(
                    {
                        agentId: params.agentId,
                        interactionId
                    },
                    {
                        signal: controller.signal,
                        onEvent: (event) => {
                            if (event.interaction_id) {
                                activeInteractionRef.current = event.interaction_id
                            }
                            dispatch({ type: 'event', event })
                            onEventRef.current?.(event)
                        }
                    }
                )
                dispatch({ type: 'terminal', reason: terminal })
                retryCountRef.current = 0
                clearAutoResumeTimer()
            } catch (err) {
                if (abortRef.current === controller) {
                    abortRef.current = null
                }
                if (
                    isTransientStreamError(err) &&
                    scheduleSilentResume(interactionId)
                ) {
                    return
                }
                const clientError = err as StreamClientError
                dispatch({
                    type: 'fail',
                    error: {
                        message:
                            clientError instanceof StreamClientError
                                ? clientError.message
                                : String((err as Error)?.message ?? err),
                        recoverable: clientError?.code === 'http_error',
                        code: clientError?.code
                    }
                })
                return
            } finally {
                if (abortRef.current === controller) {
                    abortRef.current = null
                }
            }
        },
        [
            params.agentId,
            clearAutoResumeTimer,
            isTransientStreamError,
            scheduleSilentResume
        ]
    )

    // Publish ``resume`` through the ref so the silent-retry scheduler
    // (which is declared before ``resume`` to break a circular dep) can
    // invoke the latest closure.
    resumeRef.current = resume

    const stop = useCallback(async () => {
        // Drop any pending silent retry — user-initiated stop takes
        // precedence over the auto-resume budget.
        clearAutoResumeTimer()
        retryCountRef.current = 0
        if (!abortRef.current) return
        dispatch({ type: 'abort-requested' })
        const interactionId = activeInteractionRef.current
        if (interactionId) {
            // Fire the server-side abort first so orphan-tool cleanup runs
            // before we close the socket. We don't await — local abort
            // needs to happen even if the endpoint is unreachable.
            void abortConciergeStream(interactionId, 'user_interrupt')
        }
        abortRef.current?.abort()
    }, [clearAutoResumeTimer])

    const reset = useCallback(() => {
        clearAutoResumeTimer()
        retryCountRef.current = 0
        abortRef.current?.abort()
        abortRef.current = null
        activeInteractionRef.current = null
        dispatch({ type: 'reset' })
    }, [clearAutoResumeTimer])

    return { state, sendTurn, resume, stop, reset }
}

// ── Derived selectors for consumers ─────────────────────────────────────────

/** Convenience: the tool currently marked ``running``, if any. */
export function activeTool(state: StreamState): ToolPhase | undefined {
    return state.tools.find((t) => t.state === 'running' || t.state === 'pending')
}

/** Convenience: ``true`` when the assistant is producing text right now. */
export function isStreamingText(state: StreamState): boolean {
    return state.status === 'streaming' && state.textSnapshot.length > 0
}

/** All terminal event types — exported so consumers can check without
 *  importing from the raw client module. */
export { STREAM_EVENT_TYPES, TERMINAL_EVENT_TYPES } from '@/api/ataAPI/streamApi'
export type { StreamEventType }
