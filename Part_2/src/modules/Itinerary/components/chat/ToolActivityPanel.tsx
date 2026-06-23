/**
 * Live checklist of per-tool progress phases.
 *
 * Design goals:
 *   * **Collapsed by default.** A single-line pill showing the current
 *     phase verb, progress counter (``2 of 5``), and elapsed time since
 *     the tool started. Nothing screams "busy" more than unread
 *     surface area, so we keep the resting state lean.
 *   * **Expand for detail.** A click opens the full phase checklist:
 *     each declared phase rendered as its own row with a status glyph
 *     (pending / running / done / error), per-phase elapsed time once
 *     it moves past, and any contextual ``details`` the tool attached
 *     (venue names it's verifying, affected days, etc.).
 *   * **Tool-agnostic.** The panel consumes whatever phase list the
 *     backend streams — there is no tool-specific rendering here. Every
 *     tool gets the same shape; the backend decides how many phases and
 *     what each one's label + details look like.
 *
 * Rendering is deliberately driven by the SSE-derived
 * :class:`ToolPhase`. We do NOT keep a parallel copy of phase state
 * inside this component — the hook's reducer is the source of truth.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronRight, X } from 'lucide-react'

import type { ToolPhase, ToolPhaseStep } from '@/modules/Itinerary/hooks/useConciergeStream'

interface ToolActivityPanelProps {
    tool: ToolPhase
    /** Fix the collapsed header verb instead of tracking the live
     *  ``currentPhase.verb``. Used for virtual grouped panels (e.g. the
     *  multi-evaluate group) where a stable "Reviewing your days…"
     *  reads cleaner than flipping Day labels as sub-rows finish. */
    headerVerbOverride?: string
}

const ToolActivityPanel: React.FC<ToolActivityPanelProps> = ({ tool, headerVerbOverride }) => {
    const active = tool.state === 'pending' || tool.state === 'running'
    const currentPhase = tool.phases[tool.phases.length - 1]
    const elapsed = useElapsedSeconds(tool.startedAt, tool.completedAt)

    // Total phases declared for this tool. Single-phase tools don't warrant
    // an expand affordance — the collapsed pill already carries the entire
    // progress story, and the only thing the expanded list would show is a
    // duplicate of the header.
    const declaredTotal = tool.phaseTotal ?? currentPhase?.total ?? 1
    const isMultiPhase = declaredTotal > 1

    // Default to expanded for multi-phase tools so users see the full
    // phase checklist without clicking. Single-phase tools stay
    // structurally flat (no chevron, no list) per the isMultiPhase guard
    // on the list render below.
    const [expanded, setExpanded] = useState(true)

    const counter = useMemo(() => {
        if (!currentPhase || !isMultiPhase) return null
        return `${currentPhase.index + 1} of ${declaredTotal}`
    }, [currentPhase, declaredTotal, isMultiPhase])

    const headerVerb = headerVerbOverride ?? currentPhase?.verb ?? humanizeToolName(tool.toolName)

    const HeaderContent = (
        <>
            <StatusGlyph state={tool.state} />
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-[13px] font-semibold text-grey_0 font-manrope truncate">
                        {headerVerb}
                    </span>
                    {counter && (
                        <span className="shrink-0 text-[10px] tabular-nums text-grey_2 font-manrope">
                            {counter}
                        </span>
                    )}
                    {elapsed >= 2 && (
                        <span
                            className="shrink-0 text-[10px] tabular-nums text-grey_2 font-manrope"
                            aria-label={`Elapsed ${formatElapsed(elapsed)}`}
                        >
                            {formatElapsed(elapsed)}
                        </span>
                    )}
                </div>
                {active && <ShimmerBar />}
            </div>
            {isMultiPhase && (
                <motion.span
                    animate={{ rotate: expanded ? 90 : 0 }}
                    transition={{ duration: 0.15 }}
                    className="shrink-0 mt-0.5 text-grey_2 group-hover:text-grey_1"
                    aria-hidden="true"
                >
                    <ChevronRight size={14} />
                </motion.span>
            )}
        </>
    )

    return (
        <div className="flex flex-col gap-1.5 py-0.5">
            {isMultiPhase ? (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    aria-label={expanded ? 'Collapse tool progress' : 'Expand tool progress'}
                    className="group flex items-start gap-2.5 text-left min-w-0 focus:outline-none focus:ring-2 focus:ring-primary-default/30 rounded-md px-1 py-1 -mx-1 -my-1 transition-colors"
                >
                    {HeaderContent}
                </button>
            ) : (
                <div className="flex items-start gap-2.5 min-w-0 px-1 py-1 -mx-1 -my-1">
                    {HeaderContent}
                </div>
            )}

            <AnimatePresence initial={false}>
                {expanded && isMultiPhase && tool.phases.length > 0 && (
                    <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="ml-[26px] flex flex-col gap-1.5 overflow-hidden border-l border-grey_6 pl-3"
                    >
                        {renderPhaseRows(tool)}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    )
}

export default ToolActivityPanel

// ── Checklist rows ───────────────────────────────────────────────────────

/**
 * Build the expanded checklist.
 *
 * We render each phase the tool has touched so far. We intentionally do
 * NOT render future phases (ones declared but not yet emitted) because
 * the UX value is low — users don't care that phase 4 exists until it
 * starts running. Keeps the checklist honest: every row reflects work
 * the tool actually did.
 */
function renderPhaseRows(tool: ToolPhase): React.ReactNode {
    return tool.phases.map((phase, i) => {
        const isLast = i === tool.phases.length - 1
        const status = resolvePhaseStatus(tool, phase, isLast)
        return (
            <li key={`${phase.key}-${phase.index}-${i}`} className="flex items-start gap-2 min-w-0">
                <PhaseGlyph status={status} />
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 min-w-0">
                        <span
                            className={`text-[12px] font-manrope truncate ${
                                status === 'running'
                                    ? 'text-grey_0 font-semibold'
                                    : status === 'error'
                                    ? 'text-red-500'
                                    : 'text-grey_1'
                            }`}
                        >
                            {phase.verb}
                        </span>
                        <PhaseDurationLabel phase={phase} status={status} />
                    </div>
                    {renderPhaseDetails(phase.details)}
                </div>
            </li>
        )
    })
}

type PhaseStatus = 'running' | 'done' | 'error' | 'pending'

function resolvePhaseStatus(
    tool: ToolPhase,
    phase: ToolPhaseStep,
    isLast: boolean
): PhaseStatus {
    if (tool.state === 'error' && isLast) return 'error'
    if (phase.completedAt !== undefined) return 'done'
    if (isLast && (tool.state === 'pending' || tool.state === 'running')) return 'running'
    if (isLast && tool.state === 'done') return 'done'
    return 'done'
}

const PhaseDurationLabel: React.FC<{ phase: ToolPhaseStep; status: PhaseStatus }> = ({
    phase,
    status
}) => {
    const endMs = phase.completedAt ?? Date.now()
    const [seconds, setSeconds] = useState(() =>
        Math.max(0, Math.floor((endMs - phase.startedAt) / 1000))
    )
    useEffect(() => {
        if (phase.completedAt !== undefined) return
        const update = () =>
            setSeconds(Math.max(0, Math.floor((Date.now() - phase.startedAt) / 1000)))
        update()
        const id = window.setInterval(update, 1000)
        return () => window.clearInterval(id)
    }, [phase.startedAt, phase.completedAt])

    if (status !== 'running' && seconds < 1) return null
    return (
        <span className="shrink-0 text-[10px] tabular-nums text-grey_2 font-manrope">
            {formatElapsed(seconds)}
        </span>
    )
}

const PhaseGlyph: React.FC<{ status: PhaseStatus }> = ({ status }) => {
    const base = 'shrink-0 mt-[3px] w-3 h-3 rounded-full flex items-center justify-center'
    if (status === 'running') {
        return (
            <span className={base} aria-hidden="true">
                <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-primary-default"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
                />
            </span>
        )
    }
    if (status === 'done') {
        return (
            <span
                className={`${base} bg-primary-default/10 text-primary-default`}
                aria-hidden="true"
            >
                <Check size={10} strokeWidth={3} />
            </span>
        )
    }
    if (status === 'error') {
        return (
            <span
                className={`${base} bg-red-500/10 text-red-500`}
                aria-hidden="true"
            >
                <X size={10} strokeWidth={3} />
            </span>
        )
    }
    return (
        <span className={`${base} border border-grey_4`} aria-hidden="true">
            <span className="w-1 h-1 rounded-full bg-grey_3" />
        </span>
    )
}

const StatusGlyph: React.FC<{ state: ToolPhase['state'] }> = ({ state }) => {
    if (state === 'done') {
        return (
            <span
                className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary-default/10 flex items-center justify-center text-primary-default"
                aria-hidden="true"
            >
                <Check size={12} strokeWidth={3} />
            </span>
        )
    }
    if (state === 'error') {
        return (
            <span
                className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-500"
                aria-hidden="true"
            >
                <X size={12} strokeWidth={3} />
            </span>
        )
    }
    // Running-state glyph: the center dot itself blinks (scale + opacity)
    // so the "thinking" state reads unambiguously as alive. Kept minimal
    // per feedback — no concentric rings, no halo. One visibly blinking
    // purple dot in the primary-tint, that's it.
    return (
        <span
            className="shrink-0 mt-0.5 relative w-5 h-5 flex items-center justify-center"
            aria-hidden="true"
        >
            <motion.span
                className="relative block w-2 h-2 rounded-full bg-primary-default"
                animate={{ scale: [1, 1.35, 1], opacity: [0.45, 1, 0.45] }}
                transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
            />
        </span>
    )
}

const ShimmerBar: React.FC = () => (
    <div className="relative h-[2px] w-full max-w-[240px] overflow-hidden rounded-full bg-primary-default/[0.08]">
        <motion.div
            className="absolute inset-y-0 w-1/3 rounded-full"
            style={{
                background: 'linear-gradient(90deg, transparent, rgba(112,17,246,0.55), transparent)'
            }}
            initial={{ x: '-120%' }}
            animate={{ x: '360%' }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        />
    </div>
)

// ── Details renderer ────────────────────────────────────────────────────

/**
 * Render the ``details`` payload below a phase label.
 *
 * We keep the rendering permissive: any structured field is fine. The
 * most common shapes are ``{titles: string[], count: number}`` (the
 * venues being verified) and ``{affected_days: number[]}`` (which days
 * a patch will touch). We special-case those two; everything else falls
 * through to a short JSON-ish summary.
 */
function renderPhaseDetails(details?: Record<string, unknown>): React.ReactNode {
    if (!details) return null
    // Priority: richest → leanest shape. day_lines carries actual venue
    // names; titles carries a currently-checking list; affected_days
    // carries only day numbers. Generic fallback handles the long tail.
    return (
        renderDayLinesDetails(details) ??
        renderTitlesDetails(details) ??
        renderAffectedDaysDetails(details) ??
        renderGenericDetails(details)
    )
}

/** Pre-formatted per-day lines from ``patch_to_progress``. Stacked,
 *  truncated after 4 days with a "+ N more days" tail. */
function renderDayLinesDetails(details: Record<string, unknown>): React.ReactNode | null {
    if (!Array.isArray(details.day_lines) || details.day_lines.length === 0) return null
    const lines = (details.day_lines as unknown[]).filter(
        (l): l is string => typeof l === 'string' && l.trim().length > 0
    )
    if (lines.length === 0) return null
    const overflow = lines.length - 4
    return (
        <div className="flex flex-col gap-0.5 min-w-0">
            {lines.slice(0, 4).map((line, idx) => (
                <span key={idx} className={DETAIL_LINE_CLASS}>
                    {line}
                </span>
            ))}
            {overflow > 0 && (
                <span className="text-[11px] text-grey_3 font-manrope">
                    + {overflow} more day{overflow === 1 ? '' : 's'}
                </span>
            )}
        </div>
    )
}

/** Currently-being-checked list (e.g. venues mid-verify). Shown as a
 *  single line, with "+ N more" when the backend's ``count`` exceeds
 *  the titles array the callback actually included. */
function renderTitlesDetails(details: Record<string, unknown>): React.ReactNode | null {
    if (!Array.isArray(details.titles) || details.titles.length === 0) return null
    const titles = (details.titles as unknown[]).filter((t): t is string => typeof t === 'string')
    if (titles.length === 0) return null
    const extra =
        typeof details.count === 'number' && details.count > titles.length
            ? ` + ${details.count - titles.length} more`
            : ''
    return (
        <span className={DETAIL_LINE_CLASS}>
            {titles.join(' · ')}
            {extra}
        </span>
    )
}

/** Day-number-only fallback when no richer detail exists. */
function renderAffectedDaysDetails(details: Record<string, unknown>): React.ReactNode | null {
    if (!Array.isArray(details.affected_days) || details.affected_days.length === 0) return null
    const days = (details.affected_days as unknown[]).filter((d): d is number => typeof d === 'number')
    if (days.length === 0) return null
    const label = days.length === 1 ? `Day ${days[0]}` : `Days ${days.join(', ')}`
    return <span className={DETAIL_LINE_CLASS}>{label}</span>
}

/** Compact "k: v · k: v" for arbitrary shallow details. Skips nested
 *  objects and long strings so the layout can't blow out. */
function renderGenericDetails(details: Record<string, unknown>): React.ReactNode | null {
    const summary = Object.entries(details)
        .map(([k, v]) => {
            if (v === null || v === undefined) return null
            if (typeof v === 'object') return null
            const s = String(v)
            if (s.length > 60) return null
            return `${k}: ${s}`
        })
        .filter((x): x is string => Boolean(x))
        .join(' · ')
    if (!summary) return null
    return <span className={DETAIL_LINE_CLASS}>{summary}</span>
}

const DETAIL_LINE_CLASS = 'text-[11px] text-grey_2 font-manrope truncate'

// ── Shared utilities ────────────────────────────────────────────────────

function humanizeToolName(name: string): string {
    const KNOWN: Record<string, string> = {
        get_context: 'Reading your itinerary',
        search: 'Searching',
        search_flights: 'Finding your flight options',
        evaluate: 'Reviewing your day',
        distance_check: 'Checking travel time',
        travel_intel: 'Checking local intel',
        present_options: 'Preparing options',
        follow_up_actions: 'Preparing options',
        apply_patch: 'Updating your itinerary',
        submit_itinerary: 'Updating your itinerary',
        update_day_metadata: 'Updating your itinerary',
        get_budget_details: 'Looking up your budget',
        list_vouchers: 'Checking your bookings',
        get_voucher_details: 'Checking your booking',
        save_attachment_as_voucher: 'Saving your booking',
        attach_voucher_to_slot: 'Attaching your booking',
        check_impact: 'Checking impact',
        geo_validate: 'Verifying location'
    }
    if (KNOWN[name]) return KNOWN[name]
    if (!name) return 'Working'
    // Last resort: humanize an unknown tool's snake_case id ("submit_itinerary"
    // → "Submit itinerary") so a raw internal identifier never reaches the user,
    // even for tools added later that aren't in KNOWN.
    return name.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

function formatElapsed(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s.toString().padStart(2, '0')}s`
}

/** Live-updating elapsed-second counter. Freezes once ``endedAt`` is set. */
function useElapsedSeconds(startedAt: number, endedAt?: number): number {
    const resolveEnd = () => endedAt ?? Date.now()
    const [seconds, setSeconds] = useState(() =>
        Math.max(0, Math.floor((resolveEnd() - startedAt) / 1000))
    )
    useEffect(() => {
        if (endedAt !== undefined) {
            setSeconds(Math.max(0, Math.floor((endedAt - startedAt) / 1000)))
            return
        }
        const update = () =>
            setSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
        update()
        const id = window.setInterval(update, 1000)
        return () => window.clearInterval(id)
    }, [startedAt, endedAt])
    return seconds
}
