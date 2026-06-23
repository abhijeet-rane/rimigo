import React from 'react'
import { Plus, Minus, ArrowLeftRight, Pencil, MoveVertical } from 'lucide-react'

export interface DiffItem {
    type: 'added' | 'removed' | 'modified' | 'moved' | 'swapped' | 'time_shift'
    primaryText: string
    secondaryText?: string
    badge?: string
    /** Day number for grouping */
    dayNumber?: number
    dayIndex?: number
}

const DIFF_TYPE_CONFIG: Record<string, {
    icon: typeof Plus
    color: string
    bgColor: string
}> = {
    added: { icon: Plus, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    removed: { icon: Minus, color: 'text-red-500', bgColor: 'bg-red-50' },
    modified: { icon: Pencil, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    moved: { icon: MoveVertical, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    swapped: { icon: ArrowLeftRight, color: 'text-primary-default', bgColor: 'bg-primary-default/5' },
    time_shift: { icon: Pencil, color: 'text-amber-600', bgColor: 'bg-amber-50' },
}

const DEFAULT_CONFIG = { icon: Pencil, color: 'text-grey_2', bgColor: 'bg-grey_5' }

interface DiffListProps {
    items: DiffItem[]
    /** Group items by day */
    groupByDay?: boolean
    className?: string
}

/** Group items by dayNumber */
function groupByDay(items: DiffItem[]): Map<number, { label: string; items: DiffItem[] }> {
    const groups = new Map<number, { label: string; items: DiffItem[] }>()
    for (const item of items) {
        const key = item.dayIndex ?? item.dayNumber ?? -1
        if (!groups.has(key)) {
            const dayNum = item.dayNumber ?? (item.dayIndex != null ? item.dayIndex + 1 : 0)
            groups.set(key, { label: dayNum > 0 ? `Day ${dayNum}` : 'Changes', items: [] })
        }
        groups.get(key)!.items.push(item)
    }
    return groups
}

const DiffItemRow: React.FC<{ item: DiffItem }> = ({ item }) => {
    const config = DIFF_TYPE_CONFIG[item.type] || DEFAULT_CONFIG
    const Icon = config.icon
    const isRemoved = item.type === 'removed'

    return (
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${config.bgColor}`}>
            <span className={`flex-shrink-0 ${config.color}`}>
                <Icon className="w-3.5 h-3.5" />
            </span>
            <span
                className={`text-xs font-medium font-manrope truncate ${
                    isRemoved ? 'line-through text-grey_3' : 'text-grey_0'
                }`}
            >
                {item.primaryText}
            </span>
            {item.badge && (
                <span className="flex-shrink-0 text-[9px] font-medium text-grey_2 bg-white/60 rounded-full px-1.5 py-0.5 font-manrope">
                    {item.badge}
                </span>
            )}
        </div>
    )
}

const DiffList: React.FC<DiffListProps> = ({ items, groupByDay: shouldGroup = true, className = '' }) => {
    if (!items || items.length === 0) return null

    if (!shouldGroup) {
        return (
            <div className={`flex flex-col gap-1 ${className}`}>
                {items.map((item, idx) => (
                    <DiffItemRow key={idx} item={item} />
                ))}
            </div>
        )
    }

    const grouped = groupByDay(items)

    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            {Array.from(grouped.entries()).map(([key, { label, items: groupItems }]) => (
                <div key={key} className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-semibold text-grey_2 font-manrope uppercase tracking-wider">
                        {label}
                    </p>
                    <div className="flex flex-col gap-1">
                        {groupItems.map((item, idx) => (
                            <DiffItemRow key={idx} item={item} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

export default DiffList
