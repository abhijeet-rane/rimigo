import React from 'react'
import { Check, Clock, X, ArrowRight, Maximize2 } from 'lucide-react'
import type { SlotImpact } from './types'

interface SlotImpactChipProps {
    impact: SlotImpact
    compact?: boolean
}

const IMPACT_CONFIG: Record<
    SlotImpact['impact_type'],
    {
        icon: React.FC<{ className?: string; size?: number }>
        color: string
        bgColor: string
        label: string
    }
> = {
    kept: {
        icon: Check,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        label: 'Kept',
    },
    trimmed: {
        icon: Clock,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        label: 'Shortened',
    },
    removed: {
        icon: X,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        label: 'Removed',
    },
    moved: {
        icon: ArrowRight,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        label: 'Moved',
    },
    extended: {
        icon: Maximize2,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        label: 'Extended',
    },
}

/** Format a duration delta string, e.g. "90min -> 60min" */
const formatDurationDelta = (
    original?: number,
    updated?: number
): string | null => {
    if (original == null || updated == null) return null
    if (original === updated) return null
    return `${original}min \u2192 ${updated}min`
}

const SlotImpactChip: React.FC<SlotImpactChipProps> = ({ impact, compact = false }) => {
    const config = IMPACT_CONFIG[impact.impact_type] || IMPACT_CONFIG.kept
    const Icon = config.icon
    const durationText = formatDurationDelta(
        impact.original_duration_minutes,
        impact.new_duration_minutes
    )

    if (compact) {
        return (
            <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-manrope ${config.bgColor} ${config.color} max-w-[200px]`}
                title={impact.note || `${impact.slot_title}: ${config.label}`}
            >
                <Icon size={10} className="flex-shrink-0" />
                <span className="truncate">{impact.slot_title || config.label}</span>
                {impact.impact_type !== 'kept' && (
                    <span className="opacity-70">· {config.label}</span>
                )}
            </span>
        )
    }

    return (
        <div
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${config.bgColor}`}
        >
            <span className={`flex-shrink-0 ${config.color}`}>
                <Icon className="w-3.5 h-3.5" />
            </span>
            <span
                className={`text-xs font-medium font-manrope truncate ${
                    impact.impact_type === 'removed'
                        ? 'line-through text-grey_3'
                        : 'text-grey_0'
                }`}
                title={impact.slot_title}
            >
                {impact.slot_title}
            </span>
            {durationText && (
                <span className="flex-shrink-0 text-[9px] font-medium text-grey_2 bg-white/60 rounded-full px-1.5 py-0.5 font-manrope">
                    {durationText}
                </span>
            )}
            {impact.note && !durationText && (
                <span className="flex-shrink-0 text-[9px] font-medium text-grey_2 bg-white/60 rounded-full px-1.5 py-0.5 font-manrope">
                    {impact.note}
                </span>
            )}
        </div>
    )
}

export default SlotImpactChip
