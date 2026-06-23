import React from 'react'
import { Plane } from 'lucide-react'
import type { RouteSegment } from '../types'

interface RouteFlowDiagramProps {
    segments: RouteSegment[]
    highlightChanges?: boolean
    comparisonSegments?: RouteSegment[]
}

/**
 * Horizontal scrollable row of city pills connected by lines.
 * Each pill shows city name + nights count (e.g. "Tokyo 3N").
 * When comparisonSegments is provided, highlights cities whose position differs.
 */
const RouteFlowDiagram: React.FC<RouteFlowDiagramProps> = ({
    segments,
    highlightChanges = false,
    comparisonSegments,
}) => {
    const getNights = (s: RouteSegment) => s.nights || s.days || 0

    const isChanged = (segment: RouteSegment, index: number): boolean => {
        if (!highlightChanges || !comparisonSegments) return false
        const comparison = comparisonSegments[index]
        if (!comparison) return true
        return comparison.city_name !== segment.city_name || getNights(comparison) !== getNights(segment)
    }

    if (!segments || segments.length === 0) return null

    return (
        <div className="overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-0 min-w-max py-1">
                {segments.map((segment, idx) => {
                    const changed = isChanged(segment, idx)
                    const isFirst = idx === 0

                    return (
                        <React.Fragment key={idx}>
                            {/* Connector line (before pill, skip first) */}
                            {!isFirst && (
                                <div className="w-6 h-px bg-grey_4 shrink-0" />
                            )}

                            {/* City pill */}
                            <div
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 border text-sm font-medium font-manrope transition-colors ${
                                    changed
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-white text-grey_0 border-grey_4'
                                }`}
                            >
                                {/* Airport icon for arrival/departure */}
                                {(segment.is_arrival || segment.is_departure || segment.has_airport) && (
                                    <Plane size={12} className={changed ? 'text-emerald-500' : 'text-grey_3'} />
                                )}

                                <span>{segment.city_name}</span>

                                {getNights(segment) > 0 && (
                                    <span className={`text-xs ${changed ? 'text-emerald-500' : 'text-grey_2'}`}>
                                        {getNights(segment)}N
                                    </span>
                                )}
                            </div>

                            {/* Connector line (after last pill, skip) */}
                        </React.Fragment>
                    )
                })}
            </div>
        </div>
    )
}

export default RouteFlowDiagram
