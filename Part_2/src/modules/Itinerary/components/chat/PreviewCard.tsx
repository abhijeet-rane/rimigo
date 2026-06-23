import React, { useState } from 'react'
import { CheckCircle, Eye, Plus, X, Pencil, ArrowRight, Info, AlertTriangle } from 'lucide-react'
import type { PreviewData, ChangeItem } from './types'

interface PreviewCardProps {
    data: PreviewData
    onSendAgentMessage?: (message: string, metadata?: Record<string, any>) => void
    onRefreshItinerary?: () => void
    sourceInteractionId?: string
}

const CHANGE_TYPE_CONFIG: Record<
    ChangeItem['type'],
    { icon: React.ReactNode; label: string; colorClass: string; bgClass: string }
> = {
    added: {
        icon: <Plus size={12} />,
        label: 'Added',
        colorClass: 'text-emerald-600',
        bgClass: 'bg-emerald-50',
    },
    removed: {
        icon: <X size={12} />,
        label: 'Removed',
        colorClass: 'text-red-500',
        bgClass: 'bg-red-50',
    },
    modified: {
        icon: <Pencil size={12} />,
        label: 'Modified',
        colorClass: 'text-amber-600',
        bgClass: 'bg-amber-50',
    },
    moved: {
        icon: <ArrowRight size={12} />,
        label: 'Moved',
        colorClass: 'text-blue-600',
        bgClass: 'bg-blue-50',
    },
}

/** Format the net effect summary into a human-readable string */
const formatNetEffect = (activitiesDelta: number, durationDeltaMinutes: number): string => {
    const parts: string[] = []

    if (activitiesDelta !== 0) {
        const abs = Math.abs(activitiesDelta)
        const word = abs === 1 ? 'activity' : 'activities'
        parts.push(
            activitiesDelta > 0
                ? `${abs} ${word} added`
                : `${abs} ${word} removed`
        )
    }

    if (durationDeltaMinutes !== 0) {
        const abs = Math.abs(durationDeltaMinutes)
        const hours = Math.floor(abs / 60)
        const mins = abs % 60
        const timeStr = hours > 0
            ? mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
            : `${mins}min`
        parts.push(
            durationDeltaMinutes > 0
                ? `${timeStr} longer`
                : `${timeStr} saved`
        )
    }

    return parts.length > 0 ? parts.join(', ') : 'No net change'
}

const PreviewCard: React.FC<PreviewCardProps> = ({
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
        // `__confirm_preview` marker.
        onSendAgentMessage?.('Apply these changes', {
            action: 'confirm_preview',
            source_interaction_id: sourceInteractionId,
        })
    }

    const handleCancel = () => {
        if (confirmed) return
        setConfirmed(true)
        // Concierge rebuild: structured intent envelope replaces the legacy
        // `__cancel_preview` marker.
        onSendAgentMessage?.('Cancel these changes', {
            action: 'cancel_preview',
            source_interaction_id: sourceInteractionId,
        })
    }

    const changes = data.diff?.changes || []
    const netEffect = data.diff?.net_effect

    return (
        <div className="w-full flex flex-col gap-3 px-4 py-4 rounded-[20px] bg-gradient-to-b from-primary-default/[0.03] to-transparent">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Eye size={16} className="text-primary-default flex-shrink-0" />
                <span className="text-xs font-semibold text-grey_1 font-manrope uppercase tracking-wide">
                    Preview Changes
                </span>
            </div>

            {/* Response text */}
            {data.response && (
                <p className="text-sm font-semibold text-grey_0 font-manrope leading-6">
                    {data.response}
                </p>
            )}

            {/* Diff summary */}
            {data.diff?.summary && (
                <p className="text-xs text-grey_2 font-manrope leading-5">
                    {data.diff.summary}
                </p>
            )}

            {/* Change list */}
            {changes.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-grey_2 uppercase tracking-wider font-manrope">
                        Changes ({changes.length})
                    </span>
                    <div className="flex flex-col gap-1 rounded-lg border border-grey_4 overflow-hidden">
                        {changes.map((change, idx) => {
                            const config = CHANGE_TYPE_CONFIG[change.type]
                            return (
                                <div
                                    key={idx}
                                    className={`flex items-start gap-2.5 px-3 py-2 ${
                                        idx > 0 ? 'border-t border-grey_4' : ''
                                    } ${config.bgClass}/40`}
                                >
                                    {/* Type icon */}
                                    <span className={`flex-shrink-0 mt-0.5 ${config.colorClass}`}>
                                        {config.icon}
                                    </span>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                        {/* Before/After display based on change type */}
                                        {change.type === 'removed' && change.before && (
                                            <span className="text-xs font-medium font-manrope text-grey_2 line-through truncate">
                                                Day {change.before.day} {change.before.time} &mdash; {change.before.title}
                                                {change.before.duration_minutes != null && (
                                                    <span className="text-grey_3 ml-1">
                                                        ({change.before.duration_minutes}min)
                                                    </span>
                                                )}
                                            </span>
                                        )}

                                        {change.type === 'added' && change.after && (
                                            <span className="text-xs font-medium font-manrope text-emerald-700 truncate">
                                                Day {change.after.day} {change.after.time} &mdash; {change.after.title}
                                                {change.after.duration_minutes != null && (
                                                    <span className="text-emerald-500 ml-1">
                                                        ({change.after.duration_minutes}min)
                                                    </span>
                                                )}
                                            </span>
                                        )}

                                        {change.type === 'modified' && (
                                            <>
                                                {change.before && (
                                                    <span className="text-xs font-manrope text-grey_2 truncate">
                                                        Day {change.before.day} {change.before.time} &mdash; {change.before.title}
                                                        {change.before.duration_minutes != null && (
                                                            <span className="text-grey_3 ml-1">
                                                                ({change.before.duration_minutes}min)
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                                {change.after && (
                                                    <span className="text-xs font-semibold font-manrope text-amber-700 truncate">
                                                        {'\u2192'} Day {change.after.day} {change.after.time} &mdash; {change.after.title}
                                                        {change.after.duration_minutes != null && (
                                                            <span className="text-amber-500 ml-1">
                                                                ({change.after.duration_minutes}min)
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </>
                                        )}

                                        {change.type === 'moved' && (
                                            <>
                                                {change.before && (
                                                    <span className="text-xs font-manrope text-grey_2 truncate">
                                                        Day {change.before.day} {change.before.time} &mdash; {change.before.title}
                                                    </span>
                                                )}
                                                {change.after && (
                                                    <span className="text-xs font-semibold font-manrope text-blue-700 truncate">
                                                        {'\u2192'} Day {change.after.day} {change.after.time}
                                                        {change.before?.day !== change.after.day && (
                                                            <span className="ml-1 text-blue-500 text-[10px]">
                                                                (moved to Day {change.after.day})
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </>
                                        )}

                                        {/* Reason */}
                                        {change.reason && (
                                            <span className="text-[10px] text-grey_3 font-manrope italic">
                                                {change.reason}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Noted preferences */}
            {data.noted_preferences && data.noted_preferences.length > 0 && (
                <div className="flex flex-col gap-1 px-3 py-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
                    <div className="flex items-center gap-1.5">
                        <Info size={12} className="text-blue-500 flex-shrink-0" />
                        <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider font-manrope">
                            Noted Preferences
                        </span>
                    </div>
                    <ul className="flex flex-col gap-0.5 pl-4">
                        {data.noted_preferences.map((pref, idx) => (
                            <li
                                key={idx}
                                className="text-xs text-blue-700 font-manrope list-disc"
                            >
                                {pref}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Deferred items */}
            {data.deferred_items && data.deferred_items.length > 0 && (
                <div className="flex flex-col gap-1 px-3 py-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
                    <div className="flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
                        <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider font-manrope">
                            Deferred Items
                        </span>
                    </div>
                    <ul className="flex flex-col gap-0.5 pl-4">
                        {data.deferred_items.map((item, idx) => (
                            <li
                                key={idx}
                                className="text-xs text-amber-700 font-manrope list-disc"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Net effect summary */}
            {netEffect && (
                <div className="px-3 py-2 rounded-lg bg-grey_5/60 border border-grey_4">
                    <span className="text-xs font-medium text-grey_1 font-manrope">
                        Net effect: {formatNetEffect(netEffect.activities_delta, netEffect.duration_delta_minutes)}
                    </span>
                </div>
            )}

            {/* Action buttons or confirmed state */}
            {confirmed ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle
                            size={14}
                            className={
                                consumed?.action === 'cancelled'
                                    ? 'text-grey_3'
                                    : 'text-green-600'
                            }
                        />
                        <span
                            className={`text-xs font-medium font-manrope ${
                                consumed?.action === 'cancelled'
                                    ? 'text-grey_3'
                                    : 'text-green-600'
                            }`}
                        >
                            {consumed?.action === 'cancelled'
                                ? 'Changes cancelled'
                                : 'Changes applied'}
                        </span>
                    </div>
                    {onRefreshItinerary && consumed?.action !== 'cancelled' && (
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
                        onClick={handleCancel}
                        className="w-fit inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-transparent text-primary-default border border-primary-default/30 text-sm font-medium font-manrope hover:bg-primary-default/5 transition-colors cursor-pointer min-h-[44px]"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    )
}

export default PreviewCard
