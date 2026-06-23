import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, ImageOff, X } from 'lucide-react'
import { formatShortMonthDay } from '@/utils/dateUtils'
import { useIsMobile } from '@/hooks/use-mobile'
import type { ExperienceFitRecommendation } from '@/modules/Acitvities/hooks/useExperienceFitRecommendation'

export interface ItineraryDayLite {
    /** ISO date (YYYY-MM-DD) string, or a Date instance. */
    date: string | Date
    slots?: Array<{
        entity_id?: string | null
        entity_model?: string | null
        kind?: string | null
    }>
}

export interface ExperienceThumbnail {
    id: string
    image?: string | null
}

interface AddToItineraryDayModalProps {
    isOpen: boolean
    onClose: () => void
    /** Name of the experience being added. Shown in the sheet header. */
    experienceName: string
    /** Optional thumbnail of the experience itself — shown next to the name. */
    experienceImage?: string | null
    /** Day list (trip itinerary days, in order). */
    days: ItineraryDayLite[]
    /** Accepted for call-site compatibility; no longer rendered (the redesigned
     *  card shows the AI fit assessment, not the day's existing-activity strip). */
    experiencesById?: Map<string, ExperienceThumbnail> | Record<string, ExperienceThumbnail>
    /** Called with the picked day on confirm. */
    onAdd: (args: { dayDate: string; dayNumber: number }) => void
    /** AI day-fit recommendation for this experience (streamed). Drives the
     *  per-day verdict badges + assessments and the recommended/all split. */
    recommendation?: ExperienceFitRecommendation
}

interface DayRow {
    dayNumber: number
    isoDate: string
    label: string
}

// ── Verdict badges ───────────────────────────────────────────────────────────

type BadgeKind = 'best' | 'good' | 'average' | 'bad'

const BADGE: Record<BadgeKind, { label: string; bg: string; color: string }> = {
    best: { label: 'BEST FIT', bg: '#15803D', color: '#FFFFFF' },
    good: { label: 'GOOD FIT', bg: '#1AA85F', color: '#FFFFFF' },
    average: { label: 'AVERAGE', bg: '#FBEFD0', color: '#B7791F' },
    bad: { label: 'NOT RECOMMENDED', bg: '#FCE4E4', color: '#D9444F' }
}

/** Map an AI fit `verdict` to a badge kind. The best day (per `best_day_number`)
 *  always wins 'best'; otherwise it's keyword-based so unfamiliar verdict
 *  strings degrade gracefully ('average') instead of breaking. */
const dayBadgeKind = (verdict: string | undefined, isBest: boolean): BadgeKind | null => {
    if (isBest) return 'best'
    if (!verdict) return null
    const v = verdict.toLowerCase()
    if (/(not|doesn|avoid|poor|skip|bad)/.test(v)) return 'bad'
    if (/(recommend|great|good|fits|ideal|perfect|best)/.test(v)) return 'good'
    return 'average'
}

const Badge: React.FC<{ kind: BadgeKind }> = ({ kind }) => {
    const b = BADGE[kind]
    return (
        <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold font-red-hat-display uppercase tracking-[0.04em]"
            style={{ background: b.bg, color: b.color }}>
            {b.label}
        </span>
    )
}

interface DayItem extends DayRow {
    city?: string
    assessment?: string
    badge: BadgeKind | null
    isRecommended: boolean
}

/**
 * "Add to itinerary" day picker.
 *
 * While the AI fit recommendation is loading/streaming, the body shows a
 * compass loading state (no day rows). Once it finishes, the top section
 * shows the RECOMMENDED days (BEST FIT / GOOD FIT) with their assessment,
 * and "View all days" expands the rest (AVERAGE / NOT RECOMMENDED). The
 * user picks a day and confirms with "Add to Day N".
 *
 * Presentation is viewport-aware:
 *   - **Mobile** — a bottom sheet (slides up, drag-to-dismiss handle).
 *   - **Desktop** — a centered modal dialog (fade + scale).
 */
const AddToItineraryDayModal: React.FC<AddToItineraryDayModalProps> = ({
    isOpen,
    onClose,
    experienceName,
    experienceImage,
    days,
    onAdd,
    recommendation
}) => {
    const isMobile = useIsMobile()

    const rows: DayRow[] = useMemo(() => {
        return days.map((d, idx) => {
            const iso =
                typeof d.date === 'string'
                    ? d.date.split('T')[0]
                    : new Date(d.date).toISOString().split('T')[0]
            return { dayNumber: idx + 1, isoDate: iso, label: formatShortMonthDay(iso) }
        })
    }, [days])

    // Default to day 1; reset on each open so the previous experience's choice
    // doesn't leak into the next one. The AI's best day (if any) is applied
    // once it streams in (below).
    const [selectedIdx, setSelectedIdx] = useState<number>(0)
    const [showAll, setShowAll] = useState(false)
    useEffect(() => {
        if (isOpen) {
            setSelectedIdx(0)
            setShowAll(false)
        }
    }, [isOpen])

    // When the AI streams a recommended day, jump to it — once per open, so a
    // late verdict doesn't override a manual pick the user already made.
    const bestDayNumber = recommendation?.verdict?.bestDayNumber ?? null
    const appliedBestRef = useRef(false)
    useEffect(() => {
        if (!isOpen) appliedBestRef.current = false
    }, [isOpen])
    useEffect(() => {
        if (!isOpen || bestDayNumber == null || appliedBestRef.current) return
        const idx = rows.findIndex((r) => r.dayNumber === bestDayNumber)
        if (idx >= 0) {
            setSelectedIdx(idx)
            appliedBestRef.current = true
        }
    }, [isOpen, bestDayNumber, rows])

    // ── Day items: merge itinerary rows with streamed per-day fit data ─────────
    const dayItems: DayItem[] = useMemo(() => {
        return rows.map((row) => {
            const fit = recommendation?.days.get(row.dayNumber)
            const badge = dayBadgeKind(fit?.verdict, bestDayNumber === row.dayNumber)
            return {
                ...row,
                city: fit?.city,
                assessment: fit?.assessment,
                badge,
                isRecommended: badge === 'best' || badge === 'good'
            }
        })
    }, [rows, recommendation, bestDayNumber])

    const status = recommendation?.status
    const isBusy = status === 'loading' || status === 'streaming'
    const isDone = status === 'done'

    // Recommended (best first) vs the rest, only once the stream has finished —
    // mid-stream the body shows the compass loading state instead of day rows.
    const recommended = useMemo(
        () =>
            isDone
                ? dayItems
                      .filter((d) => d.isRecommended)
                      .sort((a, b) => (a.badge === 'best' ? -1 : b.badge === 'best' ? 1 : a.dayNumber - b.dayNumber))
                : [],
        [isDone, dayItems]
    )
    const others = useMemo(
        () => (isDone ? dayItems.filter((d) => !d.isRecommended).sort((a, b) => a.dayNumber - b.dayNumber) : []),
        [isDone, dayItems]
    )
    const hasGrouping = isDone && recommended.length > 0

    // Esc closes, body scroll locks while open.
    useEffect(() => {
        if (!isOpen) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', handleKey)
            document.body.style.overflow = prev
        }
    }, [isOpen, onClose])

    // Enter animation each time the sheet/modal opens.
    const [sheetIn, setSheetIn] = useState(false)
    useEffect(() => {
        if (!isOpen) {
            setSheetIn(false)
            return
        }
        const id = window.requestAnimationFrame(() => setSheetIn(true))
        return () => window.cancelAnimationFrame(id)
    }, [isOpen])

    // Drag-to-dismiss on the grab handle (mobile bottom sheet only).
    const [dragY, setDragY] = useState(0)
    const dragStateRef = useRef<{ startY: number; active: boolean }>({
        startY: 0,
        active: false
    })
    const handleDragStart = useCallback((clientY: number) => {
        dragStateRef.current = { startY: clientY, active: true }
        setDragY(0)
    }, [])
    const handleDragMove = useCallback((clientY: number) => {
        if (!dragStateRef.current.active) return
        const delta = clientY - dragStateRef.current.startY
        setDragY(delta > 0 ? delta : delta * 0.15)
    }, [])
    const handleDragEnd = useCallback(() => {
        if (!dragStateRef.current.active) return
        dragStateRef.current.active = false
        if (dragY > 110) {
            setDragY(0)
            onClose()
        } else {
            setDragY(0)
        }
    }, [dragY, onClose])

    const bodyRef = useRef<HTMLDivElement | null>(null)
    const selected = rows[selectedIdx]
    const selectedDayNumber = selected?.dayNumber

    const handleAdd = useCallback(() => {
        if (!selected) return
        onAdd({ dayDate: selected.isoDate, dayNumber: selected.dayNumber })
    }, [selected, onAdd])

    /** A single day card. */
    const renderCard = (item: DayItem) => {
        const isSelected = selectedDayNumber === item.dayNumber
        return (
            <button
                key={item.isoDate + item.dayNumber}
                type="button"
                onClick={() => setSelectedIdx(item.dayNumber - 1)}
                aria-pressed={isSelected}
                style={
                    isSelected
                        ? {
                              borderColor: 'var(--primary-default, #7011F6)',
                              // INSET ring so it reads as a ~2px purple border
                              // without a layout shift AND without overflowing the
                              // card bounds (an outer ring gets clipped by the
                              // scroll container on the top-most card).
                              boxShadow: 'inset 0 0 0 1px var(--primary-default, #7011F6)'
                          }
                        : undefined
                }
                className="w-full text-left rounded-xl border border-grey-4 bg-white p-3 transition-all hover:border-grey-3">
                <div className="flex items-start justify-between gap-2">
                    <span className="text-[14px] font-bold font-red-hat-display text-grey-0">
                        Day {item.dayNumber} <span className="font-medium text-grey-1">· {item.label}</span>
                    </span>
                    {item.badge && <Badge kind={item.badge} />}
                </div>
                {item.city && (
                    <span className="mt-0.5 block text-[13px] font-medium font-red-hat-display text-grey-1">
                        {item.city}
                    </span>
                )}
                {item.assessment && (
                    <p className="mt-1 text-[12px] italic font-medium font-red-hat-display text-grey-1 leading-[16px]">
                        {item.assessment}
                    </p>
                )}
            </button>
        )
    }

    if (!isOpen) return null

    // Mobile: bottom-sheet slide. Desktop: centered fade + scale.
    const sheetStyle: React.CSSProperties = isMobile
        ? {
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              // Disable the transition while actively dragging so the sheet
              // tracks the finger 1:1; restore the spring on release.
              transitionDuration: dragStateRef.current.active ? '0ms' : '380ms',
              transitionProperty: 'transform, opacity',
              transform: sheetIn ? `translateY(${dragY}px)` : 'translateY(100%)',
              // Tall sheet (matches the mock) — fills most of the screen.
              minHeight: '72vh'
          }
        : {
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              transitionDuration: '240ms',
              transitionProperty: 'transform, opacity',
              transform: sheetIn ? 'scale(1)' : 'scale(0.97)'
          }

    return createPortal(
        <div
            className={`fixed inset-0 z-[9999] flex justify-center ${isMobile ? 'items-end' : 'items-center px-4'}`}
            onClick={onClose}>
            {/* Scrim — lighter than full-black so the board behind stays
                partially visible (matches the mock). */}
            <div
                className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ${
                    sheetIn ? 'opacity-100' : 'opacity-0'
                }`}
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label={`Add ${experienceName} to itinerary`}
                onClick={(e) => e.stopPropagation()}
                style={sheetStyle}
                className={`relative bg-white w-full md:max-w-[440px] flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.18)] will-change-transform ${
                    isMobile ? 'rounded-t-2xl max-h-[92vh]' : 'rounded-2xl max-h-[80vh]'
                } ${sheetIn ? 'opacity-100' : 'opacity-0'}`}>
                {/* Grab handle — drag down to dismiss. Bottom-sheet (mobile) only. */}
                {isMobile && (
                    <div
                        className="pt-2 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none"
                        onPointerDown={(e) => {
                            e.currentTarget.setPointerCapture(e.pointerId)
                            handleDragStart(e.clientY)
                        }}
                        onPointerMove={(e) => handleDragMove(e.clientY)}
                        onPointerUp={(e) => {
                            e.currentTarget.releasePointerCapture(e.pointerId)
                            handleDragEnd()
                        }}
                        onPointerCancel={handleDragEnd}>
                        <span className="h-1 w-10 rounded-full bg-grey-4" aria-hidden />
                    </div>
                )}

                {/* Header */}
                <div className={`px-5 pb-3 flex items-start justify-between gap-3 shrink-0 ${isMobile ? 'pt-1' : 'pt-4'}`}>
                    <div className="flex items-start gap-2.5 min-w-0">
                        {experienceImage ? (
                            <img
                                src={experienceImage}
                                alt=""
                                className="shrink-0 h-9 w-12 rounded-[4px] object-cover border border-white shadow-[0_1px_3px_rgba(0,0,0,0.18)]"
                            />
                        ) : (
                            <div className="shrink-0 h-9 w-12 rounded-[4px] bg-grey-5 border border-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] flex items-center justify-center">
                                <ImageOff className="w-4 h-4 text-grey-2" />
                            </div>
                        )}
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[14px] font-semibold font-red-hat-display text-grey-0 truncate">
                                {experienceName}
                            </span>
                            <span className="text-[16px] font-bold font-red-hat-display text-grey-0">
                                Choose day to add to
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                        className="shrink-0 h-8 w-8 rounded-full bg-grey-5 hover:bg-grey-4 flex items-center justify-center transition-colors">
                        <X className="w-4 h-4 text-grey-0" />
                    </button>
                </div>

                {/* Body — day picker. */}
                <div
                    ref={bodyRef}
                    className="flex-1 overflow-y-auto px-5 pb-4 pt-0.5 [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: 'none' }}>
                    {isBusy ? (
                        <FitLoadingState />
                    ) : hasGrouping ? (
                        <>
                            <RecommendedDivider />
                            <div className="flex flex-col gap-2.5">{recommended.map((d) => renderCard(d))}</div>
                            {others.length > 0 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShowAll((v) => !v)}
                                        aria-expanded={showAll}
                                        className="mt-3 w-full flex items-center justify-between border-t border-grey-4 pt-3 text-left">
                                        <span className="text-[14px] font-semibold font-red-hat-display text-grey-0">
                                            View all days
                                        </span>
                                        <ChevronRight
                                            className="w-4 h-4 text-grey-1 transition-transform duration-300"
                                            style={{ transform: showAll ? 'rotate(90deg)' : 'none' }}
                                        />
                                    </button>
                                    <AnimatePresence initial={false}>
                                        {showAll && (
                                            <motion.div
                                                key="other-days"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                                                style={{ overflow: 'hidden' }}>
                                                <div className="flex flex-col gap-2.5 pt-2.5">
                                                    {others.map((d) => renderCard(d))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col gap-2.5">{dayItems.map((d) => renderCard(d))}</div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-grey-4 px-5 py-3 flex items-center justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-2 text-[14px] font-semibold font-red-hat-display text-grey-0 hover:text-primary-default transition-colors cursor-pointer">
                        Cancel
                    </button>
                    {/* Disabled while the fit is loading — the day rows are
                        hidden behind the compass loader, so committing to a
                        day the user can't see would be misleading. */}
                    <button
                        type="button"
                        disabled={!selected || isBusy}
                        onClick={handleAdd}
                        className="rounded-xl bg-grey-0 hover:bg-black px-4 py-2.5 text-[14px] font-bold font-red-hat-display text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                        {isBusy ? 'Add to Day' : `Add to Day ${selected?.dayNumber ?? ''}`}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

/** Full-body loading state shown while the AI day-fit recommendation is
 *  generated — a rotating compass with heading + subcopy, replacing the day
 *  list entirely (per spec: no shimmer cards / premature day rows). Reuses
 *  the onboarding loader's compass asset + `compass-rotate` keyframes
 *  (src/index.css) so the spin is GPU-composited and consistent app-wide. */
const FitLoadingState: React.FC = () => (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 px-8 py-14 text-center">
        <img
            src="/icons/compass.png"
            alt=""
            className="w-20 h-20 object-cover"
            style={{ animation: 'compass-rotate 2s linear infinite', willChange: 'transform' }}
        />
        <div className="flex flex-col gap-1.5">
            <span className="text-[18px] font-bold font-red-hat-display text-grey-0">
                Finding the best day
            </span>
            <span className="text-[14px] font-medium font-manrope text-grey-2 leading-5">
                Analysing your itinerary to see where this fits best
            </span>
        </div>
    </div>
)

/** Centered "★ RECOMMENDED" section divider above the recommended day cards.
 *  The star matches the AI expert chat's "Recommended" pill glyph. */
const RecommendedDivider: React.FC = () => (
    <div className="flex items-center gap-2.5 my-3">
        <span className="h-px flex-1 bg-grey-4" />
        <span
            className="inline-flex items-center gap-1 text-[11px] font-bold font-red-hat-display uppercase tracking-[0.08em]"
            style={{ color: 'var(--primary-default, #7011F6)' }}>
            <svg
                viewBox="0 0 10 10"
                className="w-4 h-4"
                aria-hidden="true"
                fill="currentColor"
                style={{ transform: 'translateY(-1.5px)' }}>
                <path d="M5 0.5 L6.3 3.7 L9.5 4 L7 6.1 L7.8 9.3 L5 7.5 L2.2 9.3 L3 6.1 L0.5 4 L3.7 3.7 Z" />
            </svg>
            Recommended
        </span>
        <span className="h-px flex-1 bg-grey-4" />
    </div>
)

export default AddToItineraryDayModal
