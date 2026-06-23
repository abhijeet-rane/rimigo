import React from 'react'
import { Plus, Minus, ArrowLeftRight, Pencil } from 'lucide-react'

interface UpdatedSlotPath {
    day_index: number
    slot_index: number
    title?: string
    kind?: string
    change_type?: string
    city?: string
    day_number?: number
}

interface SwapDiffEntry {
    day_index: number
    day_number: number
    city?: string
    before_titles: string[]
    after_titles: string[]
}

interface UpdateDiffCardProps {
    changes: {
        type?: string
        updated_slot_paths?: UpdatedSlotPath[]
        summaries?: string[]
        days_updated?: number
        swap_diff?: SwapDiffEntry[]
    }
}

const CHANGE_TYPE_CONFIG: Record<string, {
    icon: React.FC<{ className?: string }>
    color: string
    bgColor: string
    label: string
}> = {
    add_slot: {
        icon: Plus,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        label: 'Activity added',
    },
    remove_slot: {
        icon: Minus,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        label: 'Slot removed',
    },
    replace_slot: {
        icon: ArrowLeftRight,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        label: 'Slot replaced',
    },
    modify_slot: {
        icon: Pencil,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        label: 'Slot modified',
    },
    shift_times: {
        icon: Pencil,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        label: 'Times shifted',
    },
    swapped: {
        icon: ArrowLeftRight,
        color: 'text-primary-default',
        bgColor: 'bg-primary-default/5',
        label: 'Swapped',
    },
}

const DEFAULT_CONFIG = {
    icon: Pencil,
    color: 'text-grey_2',
    bgColor: 'bg-grey_5',
    label: 'Updated',
}

/** Group slot paths by day_index, using day_number for display when available */
function groupByDay(paths: UpdatedSlotPath[]): Map<number, { dayLabel: string; slots: UpdatedSlotPath[] }> {
    const groups = new Map<number, { dayLabel: string; slots: UpdatedSlotPath[] }>()
    for (const slot of paths) {
        const key = slot.day_index
        if (!groups.has(key)) {
            const dayNum = slot.day_number ?? slot.day_index + 1
            groups.set(key, { dayLabel: `Day ${dayNum}`, slots: [] })
        }
        groups.get(key)!.slots.push(slot)
    }
    return groups
}

/** Swap diff: side-by-side before/after activity view */
const SwapDiffView: React.FC<{ diff: SwapDiffEntry[] }> = ({ diff }) => {
    return (
        <div className="flex flex-col gap-3">
            {diff.map((entry) => {
                const dayLabel = `Day ${entry.day_number}${entry.city ? ` \u00b7 ${entry.city}` : ''}`
                return (
                    <div key={entry.day_index} className="flex flex-col gap-1.5">
                        <p className="text-[10px] font-semibold text-grey_2 font-manrope uppercase tracking-wider">
                            {dayLabel}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {/* Before */}
                            <div className="flex flex-col gap-1 px-2.5 py-2 rounded-lg bg-red-50/60 border border-red-100">
                                <span className="text-[9px] font-semibold text-red-400 uppercase tracking-wider font-manrope">
                                    Before
                                </span>
                                {entry.before_titles.length > 0 ? (
                                    entry.before_titles.map((title, idx) => (
                                        <span
                                            key={idx}
                                            className="text-xs text-grey_2 font-manrope line-through truncate"
                                            title={title}
                                        >
                                            {title}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-grey_3 font-manrope italic">No activities</span>
                                )}
                            </div>
                            {/* After */}
                            <div className="flex flex-col gap-1 px-2.5 py-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                                <span className="text-[9px] font-semibold text-emerald-500 uppercase tracking-wider font-manrope">
                                    Now
                                </span>
                                {entry.after_titles.length > 0 ? (
                                    entry.after_titles.map((title, idx) => (
                                        <span
                                            key={idx}
                                            className="text-xs text-grey_0 font-medium font-manrope truncate"
                                            title={title}
                                        >
                                            {title}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-grey_3 font-manrope italic">No activities</span>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

const UpdateDiffCard: React.FC<UpdateDiffCardProps> = ({ changes }) => {
    // Swap diff: use dedicated before/after view
    if (changes.type === 'day_swap' && changes.swap_diff && changes.swap_diff.length > 0) {
        return (
            <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-primary-default" />
                    <p className="text-xs font-semibold text-grey_1 font-manrope uppercase tracking-wide">
                        What changed
                    </p>
                </div>
                <SwapDiffView diff={changes.swap_diff} />
            </div>
        )
    }

    // Default: slot-level diff
    const paths = changes.updated_slot_paths
    if (!paths || paths.length === 0) return null

    const grouped = groupByDay(paths)

    return (
        <div className="flex flex-col gap-2 pt-2">
            <p className="text-xs font-semibold text-grey_1 font-manrope uppercase tracking-wide">
                Diff
            </p>
            <div className="flex flex-col gap-3">
                {Array.from(grouped.entries()).map(([dayIndex, { dayLabel, slots }]) => (
                    <div key={dayIndex} className="flex flex-col gap-1.5">
                        <p className="text-[10px] font-semibold text-grey_2 font-manrope uppercase tracking-wider">
                            {dayLabel}
                        </p>
                        <div className="flex flex-col gap-1">
                            {slots.map((slot, idx) => {
                                const config = CHANGE_TYPE_CONFIG[slot.change_type || ''] || DEFAULT_CONFIG
                                const Icon = config.icon
                                const isRemove = slot.change_type === 'remove_slot'
                                const displayTitle = slot.title || config.label

                                return (
                                    <div
                                        key={`${dayIndex}-${slot.slot_index}-${idx}`}
                                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${config.bgColor}`}>
                                        <span className={`flex-shrink-0 ${config.color}`}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </span>
                                        <span
                                            className={`text-xs font-medium font-manrope truncate ${
                                                isRemove ? 'line-through text-grey_3' : 'text-grey_0'
                                            }`}>
                                            {displayTitle}
                                        </span>
                                        {slot.kind && (
                                            <span className="flex-shrink-0 text-[9px] font-medium text-grey_2 bg-white/60 rounded-full px-1.5 py-0.5 font-manrope">
                                                {slot.kind}
                                            </span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default UpdateDiffCard
