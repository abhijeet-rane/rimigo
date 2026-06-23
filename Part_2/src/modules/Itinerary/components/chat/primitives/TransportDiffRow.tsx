import React from 'react'
import { Train, Bus, Plane, Car, Ship, ArrowRight } from 'lucide-react'
import type { TransportChange } from '../types'

const MODE_ICONS: Record<string, React.ElementType> = {
    train: Train,
    bus: Bus,
    flight: Plane,
    taxi: Car,
    car: Car,
    ferry: Ship,
}

interface TransportDiffRowProps {
    change: TransportChange
}

const TransportDiffRow: React.FC<TransportDiffRowProps> = ({ change }) => {
    const AfterIcon = MODE_ICONS[(change.after_mode || '').toLowerCase()] || Car
    const delta = change.duration_delta_minutes || 0
    const isNew = change.is_new_segment || !change.before_mode

    // Delta badge color
    const deltaColor = isNew
        ? 'bg-blue-50 text-blue-700'
        : delta < 0
            ? 'bg-emerald-50 text-emerald-700'
            : delta > 0
                ? 'bg-amber-50 text-amber-700'
                : 'bg-grey_5 text-grey_2'

    const deltaLabel = isNew
        ? 'New'
        : delta < 0
            ? `${delta} min`
            : delta > 0
                ? `+${delta} min`
                : 'No change'

    return (
        <div className="bg-white rounded-[12px] border border-grey_4 p-3 flex flex-col gap-2">
            {/* Header: route + delta badge */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-grey_0 font-manrope">
                    <span>{change.from_city}</span>
                    <ArrowRight size={14} className="text-grey_3 shrink-0" />
                    <span>{change.to_city}</span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full font-manrope ${deltaColor}`}>
                    {deltaLabel}
                </span>
            </div>

            {/* Before line (strikethrough, grey) */}
            {change.before_mode && (
                <div className="flex items-center gap-2 text-xs text-grey_3 font-manrope line-through">
                    <span className="capitalize">{change.before_mode}</span>
                    {change.before_duration && <span>{change.before_duration}</span>}
                    {change.before_cost_per_person != null && <span>~{change.before_cost_per_person}</span>}
                </div>
            )}

            {/* After line (bold, with icon) */}
            <div className="flex items-center gap-2 text-sm text-grey_0 font-semibold font-manrope">
                <AfterIcon size={14} className="text-grey_1 shrink-0" />
                <span className="capitalize">{change.after_mode}</span>
                <span className="font-normal text-grey_1">{change.after_duration}</span>
                {change.after_cost_per_person != null && (
                    <span className="font-normal text-grey_1">~{change.after_cost_per_person}</span>
                )}
            </div>
        </div>
    )
}

export default TransportDiffRow
