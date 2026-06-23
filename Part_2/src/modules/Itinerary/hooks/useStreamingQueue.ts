/**
 * Throttle the concierge streaming render at two fixed rates.
 *
 * The raw :func:`useConciergeStream` reducer surfaces every SSE event the
 * moment it lands on the wire. That cadence is bursty — three phases in
 * 50ms then nothing for 600ms; thirty text deltas in one second then
 * nothing for two — and painting at arrival rate makes the eye chase a
 * stuttering target. Worse, the FINISH event arriving while the visible
 * tail is still revealing causes the consumer to swap to the persisted
 * message mid-typing.
 *
 * ``useStreamingQueue`` decouples *what the user sees* from *when bytes
 * hit the wire* with two independent drain loops:
 *
 *   * **Phase queue** — every ``phaseIntervalMs`` (default 380ms) one
 *     pending item is released. Pending items are, in order of priority:
 *       (1) a tool entry the user hasn't seen yet,
 *       (2) the next phase row inside the oldest still-behind tool.
 *     The consumer always sees a calm "click, click, click" rhythm
 *     regardless of the network's microbursts.
 *
 *   * **Text cursor** — a rAF-driven prefix length that catches up to the
 *     live snapshot at ``textCharsPerSec`` (default 95 — close to what
 *     Claude.ai uses).
 *
 * Both loops accelerate by ``catchUpMultiplier`` (default 4×) the
 * moment the upstream stream reaches a terminal state, so the queue
 * drains quickly without abruptly skipping content. ``isCaughtUp`` flips
 * to ``true`` once everything visible matches the source — the consumer
 * (AIAssistantWindow) gates its swap-to-persisted-message on this flag,
 * which is the fix for "typing stops midway when terminal lands".
 *
 * Edge cases:
 *   * Snapshot shrinks to '' (new turn): the cursor jumps to 0, queue
 *     resets, isCaughtUp stays false until the next reveal completes.
 *   * No tools yet, no text yet: returns the empty state and reports
 *     caught-up so the cold-start path renders without delay.
 *   * Stream goes idle (status='idle' before any events): same — empty
 *     and caught-up, no rAF or interval scheduled.
 */
import { useEffect, useMemo, useRef, useState } from 'react'

import type {
    StreamState,
    ToolPhase
} from '@/modules/Itinerary/hooks/useConciergeStream'

export interface UseStreamingQueueOptions {
    /** Milliseconds between releasing one pending tool/phase. */
    phaseIntervalMs?: number
    /** Baseline text reveal rate. */
    textCharsPerSec?: number
    /** Multiplier applied to BOTH rates after the upstream reaches a
     *  terminal state (status !== streaming/aborting), so the visible
     *  queue drains promptly without abrupt jumps. */
    catchUpMultiplier?: number
}

export interface QueueState {
    /** Subset of source tools (length grows as the phase queue drains).
     *  Each tool's ``phases`` array is also a prefix of the source tool's
     *  ``phases`` — never longer than what the queue has revealed. */
    tools: ToolPhase[]
    /** Prefix of the source ``textSnapshot`` revealed so far. */
    textSnapshot: string
    /** Latest BE progress verb (e.g. "Applying", "Searching flights").
     *  Passed through unmodified — not paced by the typewriter cadence
     *  because it's an ambient status, not user-facing prose. Renders as
     *  a subtle status row between tool panels and the answer text, so
     *  the user sees the model is working through "step=applying" / etc.
     *  during the gap between a tool returning and the next chunk
     *  arriving (previously this gap was dead air). */
    progressVerb: string | null
    /** ``true`` when every visible field matches its source AND there's
     *  no pending event waiting to be released. */
    isCaughtUp: boolean
    /** ``true`` while drain rates are 4× because terminal landed.
     *  Consumers can use this to subtly tighten enter animations. */
    isAccelerating: boolean
}

export function useStreamingQueue(
    state: StreamState,
    {
        phaseIntervalMs = 380,
        textCharsPerSec = 95,
        catchUpMultiplier = 4
    }: UseStreamingQueueOptions = {}
): QueueState {
    // Visible counts. Refs drive the drain loops without stale closures;
    // a tick counter forces a re-render AND re-evaluates the ``presentation``
    // useMemo when refs advance from the drain interval/rAF (without it,
    // refs would advance silently and ``isCaughtUp`` would stay stale —
    // the gate-on-drain swap would then never fire).
    const visibleToolCountRef = useRef(0)
    const visiblePhaseCountsRef = useRef<Map<string, number>>(new Map())
    const visibleTextLenRef = useRef(0)
    const [tick, setTick] = useState(0)
    const bump = () => setTick((t) => (t + 1) | 0)

    // Latest source state for the loops.
    const stateRef = useRef(state)
    stateRef.current = state

    const isTerminal = state.status === 'done' || state.status === 'errored'
    const isResuming = state.isResuming === true

    // Reset on snapshot shrink (new turn). Detect via a short-key signature.
    const sourceKey = useMemo(
        () => `${state.tools.length}:${state.tools.map((t) => t.toolCallId).join(',')}:${state.textSnapshot.length}`,
        [state.tools, state.textSnapshot.length]
    )
    const lastSeenInteractionRef = useRef<string | null>(null)
    useEffect(() => {
        if (state.interactionId !== lastSeenInteractionRef.current) {
            visibleToolCountRef.current = 0
            visiblePhaseCountsRef.current = new Map()
            visibleTextLenRef.current = 0
            lastSeenInteractionRef.current = state.interactionId
            bump()
        }
    }, [state.interactionId])

    // Resume-replay: while the hook is replaying buffered events from a
    // server-side resume, mirror source counts directly so the user sees
    // the current progress immediately. Once the burst settles (the hook
    // flips ``isResuming`` off via its 400ms debounce), normal typing
    // cadence resumes for any live events still to come. Without this,
    // a long-running stream resumed mid-flight would visibly type from 0
    // up to "step 3" at 95cps and 380ms/phase.
    useEffect(() => {
        if (!isResuming) return
        const src = stateRef.current
        visibleToolCountRef.current = src.tools.length
        visiblePhaseCountsRef.current = new Map(
            src.tools.map((t) => [t.toolCallId, t.phases.length])
        )
        visibleTextLenRef.current = src.textSnapshot.length
        bump()
    }, [isResuming, sourceKey])

    // ── Phase queue drain ───────────────────────────────────────────────
    useEffect(() => {
        const baseInterval = phaseIntervalMs
        const interval = isTerminal
            ? Math.max(60, Math.floor(baseInterval / catchUpMultiplier))
            : baseInterval

        const id = window.setInterval(() => {
            const src = stateRef.current
            // Reveal next pending tool entry first — gives the new row
            // a moment to settle before its phases start streaming.
            if (visibleToolCountRef.current < src.tools.length) {
                visibleToolCountRef.current += 1
                bump()
                return
            }
            // Otherwise advance phases on the oldest tool that's behind.
            for (let i = 0; i < src.tools.length; i++) {
                const tool = src.tools[i]
                const seen = visiblePhaseCountsRef.current.get(tool.toolCallId) ?? 0
                if (seen < tool.phases.length) {
                    visiblePhaseCountsRef.current.set(tool.toolCallId, seen + 1)
                    bump()
                    return
                }
            }
            // Nothing pending — interval continues to tick (cheap), the
            // next event arrival will be picked up automatically.
        }, interval)

        return () => window.clearInterval(id)
        // sourceKey forces a fresh interval when new content arrives so
        // the rate decision (terminal or not) is current.
    }, [sourceKey, isTerminal, phaseIntervalMs, catchUpMultiplier])

    // ── Text cursor drain (rAF) ─────────────────────────────────────────
    const rafRef = useRef<number | null>(null)
    const lastTickRef = useRef<number | null>(null)
    useEffect(() => {
        const tick = (now: number) => {
            const src = stateRef.current
            const live = src.textSnapshot.length
            const visible = visibleTextLenRef.current
            const last = lastTickRef.current ?? now
            const dtMs = Math.max(0, now - last)
            lastTickRef.current = now

            if (visible >= live) {
                // Caught up — idle. The next snapshot bump re-arms the
                // loop via the deps re-evaluation below.
                rafRef.current = null
                lastTickRef.current = null
                return
            }

            const isTerm = src.status === 'done' || src.status === 'errored'
            const rate = isTerm
                ? textCharsPerSec * catchUpMultiplier
                : textCharsPerSec
            const grow = Math.max(1, Math.round((rate * dtMs) / 1000))
            visibleTextLenRef.current = Math.min(visible + grow, live)
            bump()
            rafRef.current = requestAnimationFrame(tick)
        }

        if (state.textSnapshot.length > visibleTextLenRef.current) {
            if (rafRef.current === null) {
                rafRef.current = requestAnimationFrame(tick)
            }
        }

        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
                lastTickRef.current = null
            }
        }
    }, [state.textSnapshot, isTerminal, textCharsPerSec, catchUpMultiplier])

    // ── Project source state through the visible counts ─────────────────
    const presentation = useMemo<QueueState>(() => {
        const tools = state.tools.slice(0, visibleToolCountRef.current).map((t) => ({
            ...t,
            phases: t.phases.slice(0, visiblePhaseCountsRef.current.get(t.toolCallId) ?? 0)
        }))
        const textSnapshot = state.textSnapshot.slice(0, visibleTextLenRef.current)
        const isCaughtUp =
            visibleToolCountRef.current >= state.tools.length &&
            state.tools.every(
                (t) => (visiblePhaseCountsRef.current.get(t.toolCallId) ?? 0) >= t.phases.length
            ) &&
            visibleTextLenRef.current >= state.textSnapshot.length
        return {
            tools,
            textSnapshot,
            // Ambient status — passed through without pacing (see field doc).
            progressVerb: state.progressVerb,
            isCaughtUp,
            isAccelerating: isTerminal && !isCaughtUp
        }
    }, [state, sourceKey, isTerminal, tick])

    return presentation
}
