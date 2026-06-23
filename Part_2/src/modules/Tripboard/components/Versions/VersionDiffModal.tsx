import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
    X, Loader2, AlertCircle, Plus, Minus, Pencil, ChevronDown,
} from 'lucide-react'
import {
    diffTripboardVersions,
    type TripboardVersion,
    type TripboardDiffSlot,
    type TripboardSlotChange,
} from '@/api/tripboardVersionsApi'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatVersionTime } from './versionUtils'

interface VersionDiffModalProps {
    isOpen: boolean
    tripId: string
    head: TripboardVersion | null   // newer
    base: TripboardVersion | null   // older
    onClose: () => void
}

/**
 * Slot-level diff between two versions. Three sections — Added, Removed,
 * Modified — each collapsible. Top strip shows summary deltas (day count,
 * stays, activities) for the high-level "what changed" answer.
 */
export default function VersionDiffModal({
    isOpen,
    tripId,
    head,
    base,
    onClose,
}: VersionDiffModalProps) {
    const isMobile = useIsMobile()

    const { data, isLoading, error } = useQuery({
        queryKey: ['tripboard-version-diff', tripId, head?.id, base?.id],
        queryFn: () =>
            head && base
                ? diffTripboardVersions(tripId, head.id, base.id)
                : Promise.resolve(null),
        enabled: isOpen && !!head?.id && !!base?.id,
        staleTime: 60_000,
    })

    useEffect(() => {
        if (isOpen) {
            const prev = document.body.style.overflow
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = prev
            }
        }
    }, [isOpen])

    if (!isOpen || !head || !base) return null

    const sheet = (
        <AnimatePresence>
            <motion.div
                key="diff-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 z-[210]"
            />
            <motion.div
                key="diff-sheet"
                initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 12 }}
                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 12 }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                drag={isMobile ? 'y' : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.4 }}
                onDragEnd={(_, info) => {
                    if (isMobile && (info.offset.y > 120 || info.velocity.y > 500)) onClose()
                }}
                className={
                    isMobile
                        ? 'fixed left-0 right-0 bottom-0 z-[211] max-h-[92vh] h-[88vh] bg-natural-white shadow-2xl flex flex-col rounded-t-2xl'
                        : 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[211] w-[calc(100vw-32px)] max-w-2xl max-h-[85vh] bg-natural-white rounded-2xl shadow-2xl flex flex-col'
                }
            >
                {isMobile && (
                    <div className="pt-2 pb-1 flex justify-center shrink-0">
                        <div className="w-10 h-1 rounded-full bg-grey-4" aria-hidden />
                    </div>
                )}

                {/* Header */}
                <div className="px-5 py-4 border-b border-feature-card-border flex items-start justify-between gap-3 shrink-0">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-[16px] font-semibold font-manrope text-grey-0">
                            Compare versions
                        </h2>
                        <p className="text-[12px] text-grey-1 mt-0.5 font-manrope truncate">
                            <span className="font-semibold text-grey-0">{base.name}</span>
                            <span className="text-grey-2"> ({formatVersionTime(base.created_at)})</span>
                            {' → '}
                            <span className="font-semibold text-grey-0">{head.name}</span>
                            <span className="text-grey-2"> ({formatVersionTime(head.created_at)})</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-grey-5 transition-colors shrink-0"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4 text-grey-1" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-5 h-5 animate-spin text-grey-1" />
                        </div>
                    ) : error || !data ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
                            <p className="text-[14px] text-grey-0 font-manrope">
                                Couldn't compute the diff
                            </p>
                        </div>
                    ) : (
                        <DiffBody data={data} />
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-feature-card-border flex items-center shrink-0">
                    <button
                        onClick={onClose}
                        className="ml-auto px-4 py-2 rounded-lg text-[14px] font-medium font-manrope text-grey-0 hover:bg-grey-5 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    )

    return createPortal(sheet, document.body)
}

function DiffBody({ data }: { data: NonNullable<Awaited<ReturnType<typeof diffTripboardVersions>>> }) {
    const { summary_delta, added, removed, modified, total_changes } = data

    if (total_changes === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <p className="text-[15px] font-semibold text-grey-0 font-manrope">No changes</p>
                <p className="text-[13px] text-grey-1 mt-1 font-manrope">
                    These two versions have the same itinerary.
                </p>
            </div>
        )
    }

    return (
        <div className="px-5 py-4 space-y-4">
            {/* Summary deltas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['day_count', 'slot_count', 'stay_count', 'activity_count'] as const).map((key) => {
                    const d = summary_delta[key]
                    const sign = d.delta > 0 ? '+' : ''
                    const tone =
                        d.delta > 0 ? 'text-emerald-700 bg-emerald-50' : d.delta < 0 ? 'text-rose-700 bg-rose-50' : 'text-grey-1 bg-grey-6'
                    return (
                        <div key={key} className={`px-3 py-2 rounded-md ${tone}`}>
                            <p className="text-[11px] uppercase tracking-wider font-medium opacity-80 font-manrope">
                                {labelFor(key)}
                            </p>
                            <p className="text-[15px] font-semibold font-manrope tabular-nums">
                                {d.before} → {d.after}{' '}
                                {d.delta !== 0 && (
                                    <span className="text-[12px]">({sign}{d.delta})</span>
                                )}
                            </p>
                        </div>
                    )
                })}
            </div>

            {/* Sections */}
            <DiffSection
                tone="emerald"
                icon={<Plus className="w-4 h-4" />}
                label="Added"
                items={added}
            />
            <DiffSection
                tone="rose"
                icon={<Minus className="w-4 h-4" />}
                label="Removed"
                items={removed}
            />
            <DiffSection
                tone="amber"
                icon={<Pencil className="w-4 h-4" />}
                label="Modified"
                items={modified}
                showChanges
            />
        </div>
    )
}

function labelFor(key: string): string {
    switch (key) {
        case 'day_count': return 'Days'
        case 'slot_count': return 'Slots'
        case 'stay_count': return 'Stays'
        case 'activity_count': return 'Activities'
        default: return key
    }
}

function DiffSection({
    tone,
    icon,
    label,
    items,
    showChanges = false,
}: {
    tone: 'emerald' | 'rose' | 'amber'
    icon: React.ReactNode
    label: string
    items: TripboardDiffSlot[]
    showChanges?: boolean
}) {
    const [open, setOpen] = useState(items.length > 0 && items.length <= 5)
    if (items.length === 0) return null

    const toneClasses = {
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', count: 'bg-emerald-100' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-700', count: 'bg-rose-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-700', count: 'bg-amber-100' },
    }[tone]

    return (
        <section className="rounded-lg border border-feature-card-border overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`w-full px-3 py-2 flex items-center gap-2 ${toneClasses.bg} ${toneClasses.text} font-manrope`}
            >
                {icon}
                <span className="text-[13px] font-semibold">{label}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${toneClasses.count}`}>
                    {items.length}
                </span>
                <ChevronDown
                    className={`ml-auto w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && (
                <ul className="divide-y divide-feature-card-border/60">
                    {items.map((item) => (
                        <li key={`${item.slot_id}-${label}`} className="px-3 py-2">
                            <p className="text-[13px] font-manrope text-grey-0 line-clamp-2">
                                <span className="text-[10px] uppercase tracking-wider text-grey-2 mr-1.5">
                                    {item.kind}
                                </span>
                                {item.title || 'Untitled'}
                            </p>
                            {item.day_date && (
                                <p className="text-[11px] text-grey-2 mt-0.5 font-manrope">
                                    {formatDayCell(item.day_date)}
                                </p>
                            )}
                            {showChanges && item.changes && item.changes.length > 0 && (
                                <ul className="mt-1.5 space-y-0.5">
                                    {item.changes.map((c, i) => (
                                        <ChangeLine key={i} change={c} />
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

function ChangeLine({ change }: { change: TripboardSlotChange }) {
    return (
        <li className="text-[11px] text-grey-1 font-manrope flex items-baseline gap-1.5 flex-wrap">
            <span className="text-grey-2 uppercase tracking-wider font-semibold">
                {change.field}
            </span>
            <span className="text-rose-600 line-through">
                {formatChangeValue(change.before)}
            </span>
            <span className="text-grey-3">→</span>
            <span className="text-emerald-700 font-medium">
                {formatChangeValue(change.after)}
            </span>
        </li>
    )
}

function formatChangeValue(v: unknown): string {
    if (v == null || v === '') return '—'
    if (typeof v === 'string' && v.includes('T') && !isNaN(Date.parse(v))) {
        try {
            return new Date(v).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            })
        } catch {
            return v
        }
    }
    return String(v)
}

function formatDayCell(iso: string): string {
    try {
        const d = new Date(iso)
        if (isNaN(d.getTime())) return iso
        return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    } catch {
        return iso
    }
}
