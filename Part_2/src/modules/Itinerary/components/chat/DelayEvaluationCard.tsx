import React, { useState } from 'react'
import { Clock, ChevronDown, ChevronUp, Activity, DollarSign, Zap } from 'lucide-react'
import type { DelayEvaluationData, DelayStrategy } from './types'
import SlotImpactChip from './SlotImpactChip'
import QuickReplyChips from './primitives/QuickReplyChips'
import ChatCardShell from './primitives/ChatCardShell'
import ResponseText from './primitives/ResponseText'
import CardHeader from './molecules/CardHeader'
import SubjectLine from './primitives/SubjectLine'

interface DelayEvaluationCardProps {
    data: DelayEvaluationData
    onSendAgentMessage?: (message: string, metadata?: Record<string, any>) => void
    sourceInteractionId?: string
}

/** Format minutes into a human-readable label like "2h" or "30min" */
const formatDelay = (minutes: number): string => {
    if (minutes >= 60) {
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return m > 0 ? `${h}h ${m}min` : `${h}h`
    }
    return `${minutes}min`
}

/** Return a Tailwind color class based on score (0-100) */
const scoreColor = (score: number): string => {
    if (score >= 70) return 'bg-emerald-500'
    if (score >= 40) return 'bg-amber-400'
    return 'bg-red-400'
}

/** Single strategy card within the grid */
const StrategyCard: React.FC<{
    strategy: DelayStrategy
    onSelect: (strategy: DelayStrategy) => void
    disabled: boolean
    isSelected: boolean
}> = ({ strategy, onSelect, disabled, isSelected }) => {
    const [showImpacts, setShowImpacts] = useState(false)
    const score = Math.round(strategy.score)

    return (
        <div
            className={`flex flex-col gap-2 p-3 rounded-[12px] border transition-all ${
                isSelected
                    ? 'border-primary-default bg-primary-default/5 ring-1 ring-primary-default'
                    : disabled
                      ? 'border-grey_4 bg-grey_5/50 opacity-50'
                      : 'border-grey_4 bg-white hover:border-primary-default/40 hover:shadow-sm cursor-pointer'
            }`}
            onClick={() => !disabled && onSelect(strategy)}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                    e.preventDefault()
                    onSelect(strategy)
                }
            }}
            aria-disabled={disabled}
            aria-label={`Select strategy: ${strategy.strategy_label}`}
        >
            {/* Header: label + score */}
            <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-grey_0 font-manrope leading-tight">
                    {strategy.strategy_label}
                </span>
                <span
                    className={`flex-shrink-0 text-xs font-bold font-manrope px-2 py-0.5 rounded-full ${
                        score >= 70
                            ? 'bg-emerald-50 text-emerald-700'
                            : score >= 40
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-600'
                    }`}
                >
                    {score}
                </span>
            </div>

            {/* Score bar */}
            <div className="w-full h-1.5 rounded-full bg-grey_5 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${scoreColor(score)}`}
                    style={{ width: `${Math.min(score, 100)}%` }}
                />
            </div>

            {/* Description */}
            <p className="text-xs text-grey_2 font-manrope leading-relaxed line-clamp-2">
                {strategy.strategy_description}
            </p>

            {/* User metrics as chips */}
            <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium font-manrope">
                    <Activity size={10} className="flex-shrink-0" />
                    {strategy.activities_kept}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium font-manrope">
                    <DollarSign size={10} className="flex-shrink-0" />
                    {strategy.cost_impact_text}
                </span>
                {strategy.has_booking_conflicts && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-medium font-manrope">
                        <Zap size={10} className="flex-shrink-0" />
                        Booking conflict
                    </span>
                )}
            </div>

            {/* Expandable slot impacts */}
            {strategy.slot_impacts && strategy.slot_impacts.length > 0 && (
                <div className="flex flex-col gap-1">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            setShowImpacts(!showImpacts)
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-grey_2 font-manrope hover:text-grey_1 transition-colors cursor-pointer"
                    >
                        {showImpacts ? (
                            <ChevronUp size={12} />
                        ) : (
                            <ChevronDown size={12} />
                        )}
                        {showImpacts ? 'Hide' : 'Show'} impacts ({strategy.slot_impacts.length})
                    </button>
                    {showImpacts && (
                        <div className="flex flex-wrap gap-1">
                            {strategy.slot_impacts.map((impact, idx) => (
                                <SlotImpactChip key={idx} impact={impact} compact />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

const MAX_VISIBLE_STRATEGIES = 3

const DelayEvaluationCard: React.FC<DelayEvaluationCardProps> = ({
    data,
    onSendAgentMessage,
    sourceInteractionId,
}) => {
    const consumed = (data as any)._consumed
    const [showAll, setShowAll] = useState(false)
    const [selectedName, setSelectedName] = useState<string | null>(
        consumed ? (consumed.strategy_name || 'consumed') : null
    )

    const strategies = data.strategies || []
    const visibleStrategies = showAll
        ? strategies
        : strategies.slice(0, MAX_VISIBLE_STRATEGIES)
    const hasMore = strategies.length > MAX_VISIBLE_STRATEGIES

    const handleSelectStrategy = (strategy: DelayStrategy) => {
        if (selectedName) return
        setSelectedName(strategy.option_id)
        // Concierge rebuild: structured intent envelope replaces legacy
        // `delay_strategy` task_data shape. The strategy's pre-built patch
        // plan (when present in `on_select.structured_data`) is forwarded
        // inline so the agent can apply it without a Mongo round-trip.
        const plan =
            (strategy as any)?.on_select?.structured_data ?? null
        onSendAgentMessage?.(
            `Use the ${strategy.strategy_label} strategy`,
            {
                action: 'apply_delay_strategy',
                strategy_name: strategy.option_id,
                strategy_label: strategy.strategy_label,
                plan,
                source_interaction_id: sourceInteractionId,
            }
        )
    }

    return (
        <ChatCardShell intent="warning">
            <CardHeader
                icon={<Clock size={16} />}
                title="Delay Impact Analysis"
                badge={{ text: `${formatDelay(data.delay_minutes)} delay`, variant: 'warning' }}
            />

            {data.response && <ResponseText text={data.response} size="body" />}

            {data.anchor && (
                <SubjectLine
                    prefix={`Affected starting from`}
                    subject={`${data.anchor.slot_title} (Day ${data.anchor.day_index + 1})`}
                />
            )}

            {/* Strategy grid */}
            {strategies.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {visibleStrategies.map((strategy) => (
                        <StrategyCard
                            key={strategy.option_id}
                            strategy={strategy}
                            onSelect={handleSelectStrategy}
                            disabled={!!selectedName}
                            isSelected={selectedName === strategy.option_id}
                        />
                    ))}
                </div>
            )}

            {/* Show more / less toggle */}
            {hasMore && !selectedName && (
                <button
                    type="button"
                    onClick={() => setShowAll(!showAll)}
                    className="self-center inline-flex items-center gap-1 text-xs font-medium text-primary-default font-manrope hover:text-primary-dark transition-colors cursor-pointer"
                >
                    {showAll ? (
                        <>
                            <ChevronUp size={14} />
                            Show fewer strategies
                        </>
                    ) : (
                        <>
                            <ChevronDown size={14} />
                            View all {strategies.length} strategies
                        </>
                    )}
                </button>
            )}

            {/* Hint */}
            {!selectedName && strategies.length > 0 && (
                <p className="text-[11px] text-grey_3 text-center font-manrope">
                    Tap a strategy to apply it to your schedule
                </p>
            )}

            {/* Suggested replies (fallback when no strategy selected) */}
            {!selectedName &&
                data.suggested_replies &&
                data.suggested_replies.length > 0 && (
                    <QuickReplyChips
                        chips={data.suggested_replies.map((r: any) =>
                            typeof r === 'string' ? r : r?.label || String(r)
                        )}
                        onChipTap={(text) => onSendAgentMessage?.(text)}
                    />
                )}
        </ChatCardShell>
    )
}

export default DelayEvaluationCard
