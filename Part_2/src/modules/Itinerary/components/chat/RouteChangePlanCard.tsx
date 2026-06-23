import React, { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import type { RouteChangePlanData } from './types'
import RouteFlowDiagram from './primitives/RouteFlowDiagram'
import TransportDiffRow from './primitives/TransportDiffRow'
import WarningBanner from './primitives/WarningBanner'
import ImpactSummaryRow from './primitives/ImpactSummaryRow'
import QuickReplyChips from './primitives/QuickReplyChips'

interface RouteChangePlanCardProps {
    data: RouteChangePlanData
    onSendAgentMessage?: (message: string, metadata?: Record<string, any>) => void
    onRefreshItinerary?: () => void
    sourceInteractionId?: string
}

const FEASIBILITY_CONFIG: Record<
    string,
    { label: string; className: string }
> = {
    feasible: {
        label: 'Feasible',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    },
    feasible_with_caveats: {
        label: 'Feasible with caveats',
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
    },
    not_feasible: {
        label: 'Not feasible',
        className: 'bg-red-50 text-red-700 border border-red-200',
    },
}

const RouteChangePlanCard: React.FC<RouteChangePlanCardProps> = ({
    data,
    onSendAgentMessage,
    onRefreshItinerary,
    sourceInteractionId,
}) => {
    // Check if this card was already consumed (confirmed/cancelled in a previous session)
    const consumed = (data as any)._consumed
    const [confirmed, setConfirmed] = useState(!!consumed)

    // Backend sends feasibility_status, frontend type also has feasibility
    const feasibilityKey = data.feasibility_status || data.feasibility || 'feasible'
    const feasibility = FEASIBILITY_CONFIG[feasibilityKey] || FEASIBILITY_CONFIG.feasible

    // Backend sends route_before/route_after, normalize
    const currentRoute = (data as any).current_route || data.route_before || []
    const proposedRoute = (data as any).proposed_route || data.route_after || []

    // Sort warnings: blockers first, then warnings, then info
    const sortedWarnings = [...(data.warnings || [])].sort((a, b) => {
        const order = { blocker: 0, warning: 1, info: 2 }
        return (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
    })

    const handleChipTap = (text: string) => {
        if (confirmed) return

        const lower = text.toLowerCase()
        const isConfirm =
            lower.includes('confirm') ||
            lower.includes('apply') ||
            lower.includes('yes')
        const isCancel =
            lower.includes('cancel') ||
            lower.includes('discard') ||
            lower.includes('no')

        if (isConfirm) {
            setConfirmed(true)
            // Concierge rebuild: structured intent envelope (action =
            // confirm_route_change) replaces the legacy marker-string
            // task_data shape.
            onSendAgentMessage?.('Apply this route change', {
                action: 'confirm_route_change',
                source_interaction_id: sourceInteractionId,
            })
            return
        }

        if (isCancel) {
            setConfirmed(true)
            // Concierge rebuild: structured intent envelope (action =
            // cancel_route_change) replaces the legacy marker-string
            // task_data shape.
            onSendAgentMessage?.('Cancel that change', {
                action: 'cancel_route_change',
                source_interaction_id: sourceInteractionId,
            })
            return
        }

        // Other quick-reply chips: send free-form text with the source
        // interaction id so the agent can resolve which route_change card the
        // user is referring to.
        onSendAgentMessage?.(text, {
            source_interaction_id: sourceInteractionId,
        })
    }

    const handleAlternativeChip = (chipLabel: string) => {
        if (confirmed) return
        onSendAgentMessage?.(chipLabel)
    }

    return (
        <div className="w-full flex flex-col gap-3 px-4 py-4 rounded-[20px] bg-gradient-to-b from-primary-default/[0.03] to-transparent">
            {/* 1. Feasibility badge */}
            <div className="flex items-center gap-2">
                <span
                    className={`text-xs font-semibold font-manrope px-2.5 py-1 rounded-full ${feasibility.className}`}
                >
                    {feasibility.label}
                </span>
            </div>

            {/* 2. Response text */}
            {data.response && (
                <p className="text-sm font-semibold text-grey_0 font-manrope leading-6">
                    {data.response}
                </p>
            )}

            {/* 3. Route comparison: BEFORE / AFTER */}
            {currentRoute && currentRoute.length > 0 && (
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold text-grey_2 uppercase tracking-wider font-manrope">
                        Before
                    </span>
                    <RouteFlowDiagram segments={currentRoute} />
                </div>
            )}

            {proposedRoute && proposedRoute.length > 0 && (
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold text-grey_2 uppercase tracking-wider font-manrope">
                        After
                    </span>
                    <RouteFlowDiagram
                        segments={proposedRoute}
                        highlightChanges
                        comparisonSegments={currentRoute}
                    />
                </div>
            )}

            {/* 4. Transport changes */}
            {data.transport_changes && data.transport_changes.length > 0 && (
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold text-grey_2 uppercase tracking-wider font-manrope">
                        Transport Changes
                    </span>
                    <div className="flex flex-col gap-2">
                        {data.transport_changes.map((change, idx) => (
                            <TransportDiffRow key={idx} change={change} />
                        ))}
                    </div>
                </div>
            )}

            {/* 4b. Route structure changes (night counts, cities added/removed) */}
            {((data.night_changes && data.night_changes.length > 0) ||
              (data.cities_added && data.cities_added.length > 0) ||
              (data.cities_removed && data.cities_removed.length > 0) ||
              (data.activities_affected && data.activities_affected.length > 0)) && (
                <div className="flex flex-col gap-1.5 bg-white rounded-[12px] border border-grey_4 p-3">
                    <span className="text-[10px] font-semibold text-grey_2 uppercase tracking-wider font-manrope">
                        Route Changes
                    </span>
                    {data.cities_added && data.cities_added.length > 0 && (
                        <p className="text-xs text-emerald-700 font-manrope">
                            + Adding: {data.cities_added.join(', ')}
                        </p>
                    )}
                    {data.cities_removed && data.cities_removed.length > 0 && (
                        <p className="text-xs text-red-600 font-manrope">
                            - Removing: {data.cities_removed.join(', ')}
                        </p>
                    )}
                    {data.night_changes && data.night_changes.map((change, idx) => (
                        <p key={idx} className="text-xs text-amber-700 font-manrope">
                            {change}
                        </p>
                    ))}
                    {data.activities_affected && data.activities_affected.map((activity, idx) => (
                        <p key={idx} className="text-xs text-grey_1 font-manrope">
                            {activity}
                        </p>
                    ))}
                </div>
            )}

            {/* 5. Warnings (blockers first) */}
            {sortedWarnings.length > 0 && (
                <div className="flex flex-col gap-2">
                    {sortedWarnings.map((warning, idx) => (
                        <WarningBanner key={idx} warning={warning} />
                    ))}
                </div>
            )}

            {/* 6. Impact summary */}
            {(data.total_duration_delta_minutes != null || data.transport_changes?.length > 0) && (
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold text-grey_2 uppercase tracking-wider font-manrope">
                        Impact
                    </span>
                    <ImpactSummaryRow
                        durationDelta={data.total_duration_delta_minutes}
                        costDelta={data.total_cost_delta_per_person}
                        currency={data.cost_currency}
                        segmentsAffected={data.transport_changes?.length || 0}
                    />
                </div>
            )}

            {/* 7. Alternatives (only if not_feasible) */}
            {feasibilityKey === 'not_feasible' && data.alternatives && data.alternatives.length > 0 && (
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold text-grey_2 uppercase tracking-wider font-manrope">
                        Alternatives
                    </span>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {data.alternatives.map((alt, idx) => (
                            <button
                                key={idx}
                                type="button"
                                disabled={confirmed}
                                onClick={() => handleAlternativeChip(alt.message)}
                                className={`flex-shrink-0 min-h-[44px] rounded-full px-4 py-2.5 text-sm font-medium font-manrope transition-colors ${
                                    confirmed
                                        ? 'bg-grey_5 text-grey_3 cursor-default'
                                        : 'bg-primary-default/10 text-primary-default border border-primary-default/20 hover:bg-primary-default/20 cursor-pointer'
                                }`}
                                title={alt.reasoning}
                            >
                                {alt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 8. Confirmed/consumed state */}
            {confirmed ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle size={14} className={consumed?.action === 'cancelled' ? 'text-grey_3' : 'text-green-600'} />
                        <span className={`text-xs font-medium font-manrope ${consumed?.action === 'cancelled' ? 'text-grey_3' : 'text-green-600'}`}>
                            {consumed?.action === 'cancelled' ? 'Route change cancelled' : 'Route updated'}
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
                /* 9. Action chips from suggested_replies */
                data.suggested_replies && data.suggested_replies.length > 0 && (
                    <QuickReplyChips
                        chips={data.suggested_replies}
                        onChipTap={handleChipTap}
                        disabled={confirmed}
                    />
                )
            )}
        </div>
    )
}

export default RouteChangePlanCard
