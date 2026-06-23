import React, { useMemo } from 'react'
import { Train, Bus, Plane, Car, Ship, Footprints, Clock, Wallet, Star } from 'lucide-react'
import type { TransportLogisticsData, TransportSegment } from './types'
import ChatCardShell from './primitives/ChatCardShell'
import ResponseText from './primitives/ResponseText'

/** Strip markdown artifacts (**, *, #) that LLM may inject. */
const clean = (text?: string | null): string => (text || '').replace(/\*{1,2}/g, '').replace(/^#+\s*/gm, '').trim()

const MODE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    train: { icon: Train, label: 'Train', color: 'text-blue-600' },
    bus: { icon: Bus, label: 'Bus', color: 'text-green-600' },
    flight: { icon: Plane, label: 'Flight', color: 'text-indigo-600' },
    taxi: { icon: Car, label: 'Taxi', color: 'text-amber-600' },
    ferry: { icon: Ship, label: 'Ferry', color: 'text-cyan-600' },
    walk: { icon: Footprints, label: 'Walk', color: 'text-grey_2' },
}

const DEFAULT_MODE = { icon: Car, label: 'Transport', color: 'text-grey_1' }

/**
 * Extract a numeric cost value from a cost string like "$50", "~2,500 JPY", "INR 800".
 * Returns NaN if no number can be extracted.
 */
const parseCostNumber = (cost?: string): number => {
    if (!cost) return NaN
    const digits = cost.replace(/[^0-9.]/g, '')
    return digits ? parseFloat(digits) : NaN
}

/** Check if segments represent different transport modes (comparison scenario). */
const hasMultipleModes = (segments: TransportSegment[]): boolean => {
    if (segments.length <= 1) return false
    const modes = new Set(segments.map((s) => s.mode))
    return modes.size > 1
}

/** Find the index of the recommended segment (cheapest if costs differ, else first). */
const findRecommendedIndex = (segments: TransportSegment[]): number => {
    let cheapestIdx = 0
    let cheapestCost = Infinity

    for (let i = 0; i < segments.length; i++) {
        const cost = parseCostNumber(segments[i].estimated_cost)
        if (!isNaN(cost) && cost < cheapestCost) {
            cheapestCost = cost
            cheapestIdx = i
        }
    }

    return cheapestCost === Infinity ? 0 : cheapestIdx
}

const SegmentCard: React.FC<{ segment: TransportSegment; index: number }> = ({ segment, index }) => {
    const config = MODE_CONFIG[segment.mode] || DEFAULT_MODE
    const Icon = config.icon

    return (
        <div className="bg-white rounded-[14px] border border-grey_4 p-3.5 flex flex-col gap-2">
            {/* Header: mode icon + label + option number */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full bg-grey_5 flex items-center justify-center ${config.color}`}>
                        <Icon size={16} />
                    </div>
                    <span className="text-base font-semibold text-grey_0 font-manrope capitalize">
                        {config.label}
                    </span>
                </div>
                <span className="text-xs font-medium text-grey_3 font-manrope uppercase tracking-wider">
                    Option {index + 1}
                </span>
            </div>

            {/* Route: from → to */}
            {(segment.from_location || segment.to_location) && (
                <div className="flex items-center gap-1.5 text-sm text-grey_1 font-manrope">
                    {segment.from_location && (
                        <span className="truncate max-w-[140px]">{clean(segment.from_location)}</span>
                    )}
                    {segment.from_location && segment.to_location && (
                        <span className="text-grey_3 shrink-0">→</span>
                    )}
                    {segment.to_location && (
                        <span className="truncate max-w-[140px]">{clean(segment.to_location)}</span>
                    )}
                </div>
            )}

            {/* Duration + Cost row */}
            {(segment.duration_text || segment.estimated_cost) && (
                <div className="flex items-center gap-4">
                    {segment.duration_text && (
                        <div className="flex items-center gap-1 text-sm text-grey_1 font-manrope">
                            <Clock size={14} className="text-grey_3 shrink-0" />
                            <span>{clean(segment.duration_text)}</span>
                        </div>
                    )}
                    {segment.estimated_cost && (
                        <div className="flex items-center gap-1 text-sm text-grey_1 font-manrope">
                            <Wallet size={14} className="text-grey_3 shrink-0" />
                            <span>{clean(segment.estimated_cost)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Notes */}
            {segment.notes && (
                <p className="text-xs text-grey_2 font-manrope leading-[18px] border-t border-grey_5 pt-2 mt-0.5">
                    {clean(segment.notes)}
                </p>
            )}
        </div>
    )
}

/** Compact comparison card for a single transport mode option. */
const ComparisonCard: React.FC<{
    segment: TransportSegment
    isRecommended: boolean
}> = ({ segment, isRecommended }) => {
    const config = MODE_CONFIG[segment.mode] || DEFAULT_MODE
    const Icon = config.icon

    return (
        <div
            className={`flex-1 min-w-[160px] bg-white rounded-[14px] border p-3.5 flex flex-col gap-2 relative ${
                isRecommended ? 'border-primary-default ring-1 ring-primary-default/20' : 'border-grey_4'
            }`}
        >
            {/* Recommended badge */}
            {isRecommended && (
                <div className="absolute -top-2.5 left-3 flex items-center gap-1 bg-primary-default text-white text-[10px] font-semibold font-manrope px-2 py-0.5 rounded-full">
                    <Star size={10} fill="currentColor" />
                    Best value
                </div>
            )}

            {/* Mode icon + label */}
            <div className="flex items-center gap-2 mt-1">
                <div className={`w-8 h-8 rounded-full bg-grey_5 flex items-center justify-center ${config.color}`}>
                    <Icon size={16} />
                </div>
                <span className="text-base font-semibold text-grey_0 font-manrope capitalize">
                    {config.label}
                </span>
            </div>

            {/* Duration */}
            {segment.duration_text && (
                <div className="flex items-center gap-1 text-sm text-grey_1 font-manrope">
                    <Clock size={14} className="text-grey_3 shrink-0" />
                    <span>{clean(segment.duration_text)}</span>
                </div>
            )}

            {/* Cost */}
            {segment.estimated_cost && (
                <div className="flex items-center gap-1 text-sm text-grey_1 font-manrope">
                    <Wallet size={14} className="text-grey_3 shrink-0" />
                    <span className="font-medium">{clean(segment.estimated_cost)}</span>
                </div>
            )}

            {/* Notes */}
            {segment.notes && (
                <p className="text-xs text-grey_2 font-manrope leading-[18px] border-t border-grey_5 pt-2 mt-0.5">
                    {clean(segment.notes)}
                </p>
            )}
        </div>
    )
}

interface TransportLogisticsCardProps {
    data: TransportLogisticsData
}

const TransportLogisticsCard: React.FC<TransportLogisticsCardProps> = ({ data }) => {
    const showComparison = useMemo(
        () => data.segments && hasMultipleModes(data.segments),
        [data.segments]
    )

    const recommendedIdx = useMemo(
        () => (showComparison ? findRecommendedIndex(data.segments) : -1),
        [showComparison, data.segments]
    )

    return (
        <ChatCardShell intent="neutral">
            {data.response && <ResponseText text={clean(data.response)} size="title" />}

            {/* Comparison layout: side-by-side on desktop, stacked on mobile */}
            {showComparison && (
                <div className="flex flex-col sm:flex-row gap-2.5">
                    {data.segments.map((segment, idx) => (
                        <ComparisonCard
                            key={idx}
                            segment={segment}
                            isRecommended={idx === recommendedIdx}
                        />
                    ))}
                </div>
            )}

            {/* Standard stacked layout for single mode or single segment */}
            {!showComparison && data.segments && data.segments.length > 0 && (
                <div className="flex flex-col gap-2.5">
                    {data.segments.map((segment, idx) => (
                        <SegmentCard key={idx} segment={segment} index={idx} />
                    ))}
                </div>
            )}

            {(!data.segments || data.segments.length === 0) && !data.response && (
                <p className="text-base text-gray-500 py-4 text-center">No transport information available.</p>
            )}
        </ChatCardShell>
    )
}

export default TransportLogisticsCard
