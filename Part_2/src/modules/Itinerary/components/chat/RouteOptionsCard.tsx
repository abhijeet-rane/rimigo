import React, { useState } from 'react'
import { Star, ChevronDown, ChevronUp, MapPin, ArrowRight, AlertTriangle } from 'lucide-react'
import QuickReplyChips from './primitives/QuickReplyChips'

interface RouteOption {
    label: string
    description: string
    recommended?: boolean
    effort?: 'minimal' | 'moderate' | 'major'
    /** Stable identifier for the option (e.g. "option_a"). */
    id?: string
    option_id?: string
    /**
     * Present-options pattern: each option may carry its own pre-built patch
     * plan that the agent forwards to the apply step.
     */
    on_select?: {
        structured_data?: Record<string, unknown> | null
    }
}

interface RouteOptionsData {
    output_type: 'route_options'
    response: string
    options?: RouteOption[]
    recommendation?: string
    impact?: {
        current_route?: string[]
        new_route?: string[]
        entry_city_changed?: boolean
        exit_city_changed?: boolean
        new_segments?: string[][]
        removed_segments?: string[][]
        preserved_segments?: string[][]
        days_needing_regeneration?: string[]
        adding_city?: string
        removing_city?: string
        days_removed?: number
        activities_lost?: number
    }
    suggested_replies?: string[]
    warnings?: string[]
    expired?: boolean
}

interface RouteOptionsCardProps {
    data: RouteOptionsData
    onSendAgentMessage?: (message: string, metadata?: Record<string, any>) => void
    sourceInteractionId?: string
}

const EFFORT_CONFIG: Record<string, { label: string; className: string }> = {
    minimal: { label: 'Easy change', className: 'bg-emerald-50 text-emerald-700' },
    moderate: { label: 'Some adjustments', className: 'bg-amber-50 text-amber-700' },
    major: { label: 'Major restructure', className: 'bg-red-50 text-red-600' },
}

/** Render markdown bold (**text**) as <strong> */
function renderBold(text: string) {
    const parts = text.split(/\*\*(.*?)\*\*/g)
    return parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
    )
}

const RouteOptionsCard: React.FC<RouteOptionsCardProps> = ({
    data,
    onSendAgentMessage,
    sourceInteractionId,
}) => {
    const [selected, setSelected] = useState<string | null>(null)
    const [impactOpen, setImpactOpen] = useState(false)
    const isExpired = data?.expired === true
    const hasImpact = data?.impact && Object.keys(data.impact).length > 0

    const handleChipTap = (text: string, option?: RouteOption) => {
        if (isExpired || selected) return
        setSelected(text)
        // Concierge rebuild: structured intent envelope replaces legacy
        // shape (which relied on the backend looking up the source
        // interaction's pending_plan from Mongo). The option's
        // `on_select.structured_data` is forwarded inline so the agent
        // can apply the patch plan without a Mongo round-trip.
        onSendAgentMessage?.(`Go with ${option?.label ?? text}`, {
            action: 'apply_route_option',
            option_id: option?.id ?? option?.option_id ?? null,
            plan: option?.on_select?.structured_data ?? null,
            source_interaction_id: sourceInteractionId,
        })
    }

    return (
        <div className={`w-full flex flex-col gap-3 px-4 py-4 rounded-[20px] transition-opacity ${
            isExpired ? 'opacity-50 pointer-events-none' : 'bg-gradient-to-b from-primary-default/[0.03] to-transparent'
        }`}>

            {/* Response text — concierge recommendation */}
            {data.response && (
                <p className="text-sm text-grey_0 font-manrope leading-6">
                    {renderBold(data.response)}
                </p>
            )}

            {/* Options */}
            {data.options && data.options.length > 0 && (
                <div className="flex flex-col gap-2">
                    {data.options.map((opt, idx) => {
                        const isRecommended = opt.recommended
                        const isChosen = selected && data.suggested_replies?.[idx] === selected
                        const effort = opt.effort ? EFFORT_CONFIG[opt.effort] : null

                        return (
                            <button
                                key={idx}
                                type="button"
                                disabled={isExpired || !!selected}
                                onClick={() => data.suggested_replies?.[idx] && handleChipTap(data.suggested_replies[idx], opt)}
                                className={`w-full text-left rounded-[16px] p-3.5 transition-all ${
                                    isChosen
                                        ? 'bg-primary-default/10 border-2 border-primary-default/40 ring-2 ring-primary-default/20'
                                        : isExpired || selected
                                            ? 'bg-grey_5/50 border border-grey_4/50'
                                            : isRecommended
                                                ? 'bg-white border-2 border-primary-default/20 hover:border-primary-default/40 hover:shadow-sm cursor-pointer'
                                                : 'bg-white border border-grey_4 hover:border-grey_3 hover:shadow-sm cursor-pointer'
                                }`}
                            >
                                <div className="flex items-start gap-2.5">
                                    {/* Option letter */}
                                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                                        isRecommended
                                            ? 'bg-primary-default text-white'
                                            : 'bg-grey_5 text-grey_2'
                                    }`}>
                                        {String.fromCharCode(65 + idx)}
                                    </span>

                                    <div className="flex-1 min-w-0">
                                        {/* Label + badges */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-semibold text-grey_0 font-manrope">
                                                {opt.label}
                                            </span>
                                            {isRecommended && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary-default bg-primary-default/10 px-2 py-0.5 rounded-full">
                                                    <Star size={10} fill="currentColor" />
                                                    Recommended
                                                </span>
                                            )}
                                            {effort && (
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${effort.className}`}>
                                                    {effort.label}
                                                </span>
                                            )}
                                        </div>

                                        {/* Description */}
                                        <p className="text-xs text-grey_1 font-manrope leading-[18px] mt-1">
                                            {renderBold(opt.description)}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Impact summary — collapsible */}
            {hasImpact && !isExpired && (
                <div className="rounded-[12px] border border-grey_4/60 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setImpactOpen(!impactOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-grey_5/30 hover:bg-grey_5/50 transition-colors cursor-pointer"
                    >
                        <span className="text-[10px] font-semibold text-grey_2 uppercase tracking-wider font-manrope">
                            Impact Details
                        </span>
                        {impactOpen
                            ? <ChevronUp size={14} className="text-grey_3" />
                            : <ChevronDown size={14} className="text-grey_3" />}
                    </button>

                    {impactOpen && (
                        <div className="px-3 py-2.5 flex flex-col gap-2 bg-white">
                            {/* Route change */}
                            {data.impact!.current_route && data.impact!.new_route && (
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] text-grey_3 font-manrope">Current:</span>
                                        {data.impact!.current_route.map((city, i) => (
                                            <React.Fragment key={i}>
                                                {i > 0 && <ArrowRight size={10} className="text-grey_4" />}
                                                <span className="text-xs text-grey_1 font-manrope">{city}</span>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] text-grey_3 font-manrope">Proposed:</span>
                                        {data.impact!.new_route.map((city, i) => (
                                            <React.Fragment key={i}>
                                                {i > 0 && <ArrowRight size={10} className="text-primary-default" />}
                                                <span className="text-xs font-medium text-primary-default font-manrope">{city}</span>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Entry/exit changes */}
                            {(data.impact!.entry_city_changed || data.impact!.exit_city_changed) && (
                                <div className="flex gap-3">
                                    {data.impact!.entry_city_changed && (
                                        <span className="text-[11px] text-amber-700 font-manrope flex items-center gap-1">
                                            <MapPin size={11} /> Entry city changes
                                        </span>
                                    )}
                                    {data.impact!.exit_city_changed && (
                                        <span className="text-[11px] text-amber-700 font-manrope flex items-center gap-1">
                                            <MapPin size={11} /> Exit city changes
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Segments */}
                            {data.impact!.new_segments && data.impact!.new_segments.length > 0 && (
                                <p className="text-[11px] text-grey_1 font-manrope">
                                    <span className="text-emerald-600 font-medium">New transport:</span>{' '}
                                    {data.impact!.new_segments.map(s => s.join(' → ')).join(', ')}
                                </p>
                            )}
                            {data.impact!.removed_segments && data.impact!.removed_segments.length > 0 && (
                                <p className="text-[11px] text-grey_1 font-manrope">
                                    <span className="text-red-500 font-medium">Removed:</span>{' '}
                                    {data.impact!.removed_segments.map(s => s.join(' → ')).join(', ')}
                                </p>
                            )}

                            {/* Days needing regen */}
                            {data.impact!.days_needing_regeneration && data.impact!.days_needing_regeneration.length > 0 && (
                                <p className="text-[11px] text-amber-700 font-manrope">
                                    Days to update: {data.impact!.days_needing_regeneration.join(', ')}
                                </p>
                            )}

                            {/* City add/remove */}
                            {data.impact!.adding_city && (
                                <p className="text-[11px] text-emerald-600 font-manrope">
                                    + Adding {data.impact!.adding_city}
                                </p>
                            )}
                            {data.impact!.removing_city && (
                                <p className="text-[11px] text-red-500 font-manrope">
                                    - Removing {data.impact!.removing_city}
                                    {data.impact!.activities_lost ? ` (${data.impact!.activities_lost} activities)` : ''}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Warnings */}
            {data.warnings && data.warnings.length > 0 && !isExpired && (
                <div className="flex flex-col gap-1.5">
                    {data.warnings.map((w, i) => (
                        <div key={i} className="rounded-[10px] px-2.5 py-2 flex items-start gap-2 bg-amber-50/50 border-l-2 border-amber-400">
                            <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                            <span className="text-[11px] text-grey_1 font-manrope leading-[16px]">{w}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Expired state */}
            {isExpired && (
                <div className="text-center py-1">
                    <span className="text-[11px] text-grey_3 font-manrope italic">
                        These options are no longer active
                    </span>
                </div>
            )}

            {/* Quick reply chips — or chosen confirmation */}
            {selected ? (
                <div className="flex items-center gap-2 py-1">
                    <span className="text-xs text-primary-default font-medium font-manrope">
                        Selected: {selected}
                    </span>
                </div>
            ) : (
                !isExpired && data.suggested_replies && data.suggested_replies.length > 0 && (
                    <QuickReplyChips
                        chips={data.suggested_replies}
                        onChipTap={handleChipTap}
                        disabled={isExpired}
                    />
                )
            )}
        </div>
    )
}

export default RouteOptionsCard
