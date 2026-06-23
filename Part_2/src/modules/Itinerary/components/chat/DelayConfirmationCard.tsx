import React, { useState } from 'react'
import { CheckCircle, Clock } from 'lucide-react'
import type { DelayConfirmationData } from './types'
import SlotImpactChip from './SlotImpactChip'

interface DelayConfirmationCardProps {
    data: DelayConfirmationData
    onSendAgentMessage?: (message: string, metadata?: Record<string, any>) => void
    onRefreshItinerary?: () => void
    sourceInteractionId?: string
}

/** Format a time string for display — pass through as-is (backend sends "09:00" style) */
const formatTime = (time: string): string => time

const DelayConfirmationCard: React.FC<DelayConfirmationCardProps> = ({
    data,
    onSendAgentMessage,
    onRefreshItinerary,
    sourceInteractionId,
}) => {
    const consumed = (data as any)._consumed
    const [confirmed, setConfirmed] = useState(!!consumed)

    const handleApply = () => {
        if (confirmed) return
        setConfirmed(true)
        // Concierge rebuild: structured intent envelope replaces the legacy
        // `delay_confirm` task_data shape. Same pattern as confirm_route_change.
        onSendAgentMessage?.('Confirm and apply changes', {
            action: 'confirm_delay_strategy',
            strategy_name: data.strategy_name,
            source_interaction_id: sourceInteractionId,
        })
    }

    const handleTryDifferent = () => {
        if (confirmed) return
        // Concierge rebuild: structured intent envelope replaces the legacy
        // `delay_confirm` task_data shape.
        onSendAgentMessage?.('Show me different strategies', {
            action: 'reject_delay_strategy',
            strategy_name: data.strategy_name,
            source_interaction_id: sourceInteractionId,
        })
    }

    const beforeSlots = data.before_schedule || []
    const afterSlots = data.after_schedule || []

    return (
        <div className="w-full flex flex-col gap-3 px-4 py-4 rounded-[20px] bg-gradient-to-b from-primary-default/[0.03] to-transparent">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Clock size={16} className="text-primary-default flex-shrink-0" />
                <span className="text-xs font-semibold text-grey_1 font-manrope uppercase tracking-wide">
                    Schedule Preview
                </span>
                <span className="text-xs font-semibold font-manrope px-2.5 py-1 rounded-full bg-primary-default/10 text-primary-default">
                    {data.strategy_label}
                </span>
            </div>

            {/* Response text */}
            {data.response && (
                <p className="text-sm font-semibold text-grey_0 font-manrope leading-6">
                    {data.response}
                </p>
            )}

            {/* Side-by-side schedule comparison */}
            <div className="grid grid-cols-2 gap-2">
                {/* Before column */}
                <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-semibold text-red-400 uppercase tracking-wider font-manrope">
                        Before
                    </span>
                    <div className="flex flex-col gap-1 px-2.5 py-2 rounded-lg bg-red-50/60 border border-red-100">
                        {beforeSlots.length > 0 ? (
                            beforeSlots.map((slot, idx) => {
                                // Check if this slot was removed (not present in after, or matching after slot is changed)
                                const afterMatch = afterSlots.find(
                                    (a) => a.slot_title === slot.slot_title
                                )
                                const isRemoved = !afterMatch

                                return (
                                    <div
                                        key={idx}
                                        className={`flex flex-col gap-0.5 py-1 ${
                                            idx > 0 ? 'border-t border-red-100/50' : ''
                                        }`}
                                    >
                                        <span
                                            className={`text-xs font-medium font-manrope truncate ${
                                                isRemoved
                                                    ? 'line-through text-grey_3'
                                                    : 'text-grey_0'
                                            }`}
                                            title={slot.slot_title}
                                        >
                                            {slot.slot_title}
                                        </span>
                                        <span className="text-[10px] text-grey_2 font-manrope">
                                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                            <span className="text-grey_3 ml-1">
                                                ({slot.duration_minutes}min)
                                            </span>
                                        </span>
                                    </div>
                                )
                            })
                        ) : (
                            <span className="text-xs text-grey_3 font-manrope italic">
                                No activities
                            </span>
                        )}
                    </div>
                </div>

                {/* After column */}
                <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-semibold text-emerald-500 uppercase tracking-wider font-manrope">
                        After
                    </span>
                    <div className="flex flex-col gap-1 px-2.5 py-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                        {afterSlots.length > 0 ? (
                            afterSlots.map((slot, idx) => {
                                const isChanged = slot.changed

                                return (
                                    <div
                                        key={idx}
                                        className={`flex flex-col gap-0.5 py-1 ${
                                            idx > 0
                                                ? 'border-t border-emerald-100/50'
                                                : ''
                                        } ${
                                            isChanged
                                                ? 'bg-amber-50/60 -mx-1 px-1 rounded'
                                                : ''
                                        }`}
                                    >
                                        <span
                                            className={`text-xs font-manrope truncate ${
                                                isChanged
                                                    ? 'font-semibold text-grey_0'
                                                    : 'font-medium text-grey_0'
                                            }`}
                                            title={slot.slot_title}
                                        >
                                            {slot.slot_title}
                                        </span>
                                        <span className="text-[10px] text-grey_2 font-manrope">
                                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                            <span className="text-grey_3 ml-1">
                                                ({slot.duration_minutes}min)
                                            </span>
                                        </span>
                                    </div>
                                )
                            })
                        ) : (
                            <span className="text-xs text-grey_3 font-manrope italic">
                                No activities
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Slot impact chips */}
            {data.slot_impacts && data.slot_impacts.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-grey_2 uppercase tracking-wider font-manrope">
                        Impact Details
                    </span>
                    <div className="flex flex-col gap-1">
                        {data.slot_impacts.map((impact, idx) => (
                            <SlotImpactChip key={idx} impact={impact} />
                        ))}
                    </div>
                </div>
            )}

            {/* Action buttons or confirmed state */}
            {confirmed ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle
                            size={14}
                            className={
                                consumed?.action === 'reject'
                                    ? 'text-grey_3'
                                    : 'text-green-600'
                            }
                        />
                        <span
                            className={`text-xs font-medium font-manrope ${
                                consumed?.action === 'reject'
                                    ? 'text-grey_3'
                                    : 'text-green-600'
                            }`}
                        >
                            {consumed?.action === 'reject'
                                ? 'Strategy changed'
                                : 'Changes applied'}
                        </span>
                    </div>
                    {onRefreshItinerary && (
                        <button
                            onClick={onRefreshItinerary}
                            className="px-4 py-2 rounded-[8px] bg-primary-default text-white text-xs font-semibold font-manrope hover:bg-primary-dark transition-colors cursor-pointer min-h-[44px]"
                        >
                            Refresh Itinerary
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex items-center gap-3 pt-2 border-t border-grey_4">
                    <button
                        type="button"
                        onClick={handleApply}
                        className="group w-fit inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary-default to-primary-dark text-white text-sm font-semibold font-manrope shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer min-h-[44px]"
                    >
                        Apply Changes
                        <span className="inline-block transition-transform group-hover:translate-x-0.5">
                            {'\u2192'}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={handleTryDifferent}
                        className="w-fit inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-transparent text-primary-default border border-primary-default/30 text-sm font-medium font-manrope hover:bg-primary-default/5 transition-colors cursor-pointer min-h-[44px]"
                    >
                        Try Different Strategy
                    </button>
                </div>
            )}
        </div>
    )
}

export default DelayConfirmationCard
