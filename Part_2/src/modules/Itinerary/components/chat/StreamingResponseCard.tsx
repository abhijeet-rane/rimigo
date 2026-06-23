/**
 * In-flight render for a concierge turn that's still streaming.
 *
 * One :class:`ToolActivityPanel` per tool — collapsed pill with the
 * current verb / counter / elapsed, expandable to a per-phase
 * checklist. Cold-start "Thinking…" shows when neither tools nor text
 * exist yet.
 *
 * The card consumes the throttled presentation from
 * :func:`useStreamingQueue` (lifted into ``AIAssistantWindow``), not
 * the raw stream — that's how the appearances stay calm regardless of
 * network burstiness.
 */
import React, { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'

import type { ToolPhase, ToolPhaseStep } from '@/modules/Itinerary/hooks/useConciergeStream'

import ItineraryAssistantMessage from './ItineraryAssistantMessage'
import ToolActivityPanel from './ToolActivityPanel'

interface StreamingResponseCardProps {
    /** Throttled view — produced by ``useStreamingQueue``. */
    tools: ToolPhase[]
    textSnapshot: string
    /** Ambient BE progress verb ("Applying", "Searching flights", etc.).
     *  Rendered as a subtle status row between the tool panels and the
     *  answer text whenever the stream is live but no real content has
     *  arrived yet for the current turn — fills the dead-air gap
     *  between a tool returning and the next chunk landing so the user
     *  knows work is still happening. Auto-hidden once ``hasText``
     *  becomes true (attention shifts to the answer). */
    progressVerb?: string | null
    /** ``true`` when the upstream stream is active OR the queue still
     *  has work to drain. Drives the streaming caret on/off. */
    isStreaming: boolean
    /** Canonical assistant text from the FINISH event. When present and
     *  ``isStreaming`` is false, we prefer it over ``textSnapshot`` — the
     *  server may have polished or corrected the running text in its
     *  terminal payload. Falls back to ``textSnapshot`` otherwise so a
     *  pre-FINISH render is unaffected. */
    finalMessage?: string | null
}

const StreamingResponseCard: React.FC<StreamingResponseCardProps> = ({
    tools,
    textSnapshot,
    progressVerb,
    isStreaming,
    finalMessage,
}) => {
    const scrollAnchor = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        if (!textSnapshot && !finalMessage) return
        scrollAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, [textSnapshot, finalMessage])

    // Collapse consecutive ``evaluate`` tool calls into a single virtual
    // panel with each day-check as a sub-row. 8 separate "Reading through
    // Day N…" panels at the top level read as noise; one "Reviewing your
    // days" panel with 8 sub-rows reads as a single step with detail.
    const displayGroups = useMemo(() => groupToolsForDisplay(tools), [tools])

    // Prefer the server-canonical ``final_message`` once the stream has
    // settled; during the live phase we render the typed-out snapshot so
    // the user sees the typing animation as before.
    const displayedText = !isStreaming && finalMessage ? finalMessage : textSnapshot

    const hasText = displayedText.length > 0
    const hasTools = displayGroups.length > 0
    // Show the ambient status row only while we're streaming AND no real
    // answer content has arrived yet. Once text starts, attention shifts
    // and the verb becomes redundant noise. The verb itself can be stale
    // for a frame (last BE emit), so we don't show it post-stream either.
    const showProgressVerb = isStreaming && !hasText && !!progressVerb

    return (
        <div className="flex flex-col gap-2" role="status" aria-live="polite">
            {/* Tool activity timeline — only relevant while the turn is
                live. Once the stream settles, the final assistant text +
                CTAs become the focus, and the per-tool progress rows
                turn into visual noise. Animate-collapse the entire
                section on the streaming → finished edge so the layout
                shifts smoothly instead of snapping. The grouped panel
                content (one virtual panel per consecutive ``evaluate``
                run) sits inside the exit-animated wrapper. */}
            <AnimatePresence initial={false}>
                {hasTools && isStreaming && (
                    <motion.div
                        key="tools"
                        initial={{ opacity: 1, height: 'auto' }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="flex flex-col gap-1 overflow-hidden">
                        {displayGroups.map((group) => (
                            <ToolActivityPanel
                                key={group.key}
                                tool={group.virtual}
                                headerVerbOverride={group.headerVerbOverride}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ambient progress row — fills the dead-air gap between a
                tool returning and the next chunk arriving. Subtle so
                it doesn't compete with the tool panels or the answer. */}
            <AnimatePresence initial={false}>
                {showProgressVerb && (
                    <ProgressVerbRow key={progressVerb!} verb={progressVerb!} />
                )}
            </AnimatePresence>

            {hasText ? (
                <ItineraryAssistantMessage
                    text={displayedText}
                    isStreaming={isStreaming}
                    density="compact"
                />
            ) : (
                !hasTools && <ColdStartIndicator />
            )}

            <div ref={scrollAnchor} aria-hidden="true" />
        </div>
    )
}

export default StreamingResponseCard

// ── Grouping ────────────────────────────────────────────────────────────
//
// Consecutive ``evaluate(day=N)`` calls — which the agent fires in
// parallel after every apply_patch — are combined into ONE virtual
// ToolPhase so they render as a single panel with N sub-rows instead
// of N separate top-level panels. Non-evaluate tools pass through
// unchanged.
//
// The group's ``phases`` field is the flattened phases across every
// real evaluate tool call (one phase per call). Phase indexes are
// re-written to their position in the group so the panel's
// "N of total" counter reads honestly ("3 of 5 days reviewed").
// Header verb override stays fixed at "Reviewing your days…" so the
// collapsed pill doesn't flip between Day labels as the group drains.

interface DisplayGroup {
    key: string
    virtual: ToolPhase
    headerVerbOverride?: string
}

function groupToolsForDisplay(tools: ToolPhase[]): DisplayGroup[] {
    const groups: DisplayGroup[] = []
    let buffer: ToolPhase[] = []

    const flush = () => {
        if (buffer.length === 0) return
        if (buffer.length === 1) {
            groups.push({ key: buffer[0].toolCallId, virtual: buffer[0] })
            buffer = []
            return
        }
        const virtual = synthesizeEvaluateGroup(buffer)
        groups.push({
            key: virtual.toolCallId,
            virtual,
            headerVerbOverride: 'Reviewing your days…'
        })
        buffer = []
    }

    for (const tool of tools) {
        if (tool.toolName === 'evaluate') {
            buffer.push(tool)
        } else {
            flush()
            groups.push({ key: tool.toolCallId, virtual: tool })
        }
    }
    flush()
    return groups
}

function synthesizeEvaluateGroup(tools: ToolPhase[]): ToolPhase {
    const total = tools.length
    const startedAt = Math.min(...tools.map((t) => t.startedAt))
    const allDone = tools.every((t) => t.state === 'done')
    const hasError = tools.some((t) => t.state === 'error')
    const state: ToolPhase['state'] = hasError
        ? 'error'
        : allDone
        ? 'done'
        : 'running'
    const completedAt = allDone
        ? Math.max(...tools.map((t) => t.completedAt ?? t.startedAt))
        : undefined

    // Flatten the one phase each evaluate tool has, re-indexed so the
    // panel's counter + checklist order reflect position in the group.
    const phases: ToolPhaseStep[] = tools.flatMap((tool, i) =>
        tool.phases.map((p) => ({ ...p, index: i, total }))
    )

    return {
        toolCallId: `evaluate-group:${tools[0].toolCallId}`,
        toolName: 'evaluate',
        state,
        startedAt,
        completedAt,
        phases,
        phaseTotal: total
    }
}

// ── Cold-start indicator ─────────────────────────────────────────────────

const ColdStartIndicator: React.FC = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2.5 py-0.5"
    >
        <span
            className="shrink-0 mt-0.5 relative w-5 h-5 flex items-center justify-center"
            aria-hidden="true"
        >
            <motion.span
                className="block w-2 h-2 rounded-full bg-primary-default"
                animate={{ scale: [1, 1.35, 1], opacity: [0.45, 1, 0.45] }}
                transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
            />
        </span>
        <span className="text-[13px] font-semibold text-grey_0 font-manrope">
            Thinking…
        </span>
    </motion.div>
)

// ── Ambient progress verb row ────────────────────────────────────────────
//
// Subtle italic line shown between tool panels and the answer text when
// the stream is open but no real content has arrived yet for the current
// turn — covers the "tool returned, model thinking, nothing visible yet"
// gap. Pulses a small dot to signal aliveness without competing with the
// tool panels' check-mark rows or the answer's typing caret.

interface ProgressVerbRowProps {
    verb: string
}

const ProgressVerbRow: React.FC<ProgressVerbRowProps> = ({ verb }) => (
    <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center gap-2 overflow-hidden"
    >
        <motion.span
            className="block w-1.5 h-1.5 rounded-full bg-grey-3 shrink-0"
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
            aria-hidden="true"
        />
        <span className="italic text-[12px] text-grey-2 font-manrope">{verb}…</span>
    </motion.div>
)
