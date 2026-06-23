import React from 'react'

interface ImpactSummaryRowProps {
    durationDelta?: number | null
    costDelta?: number | null
    currency?: string
    segmentsAffected: number
}

const ImpactSummaryRow: React.FC<ImpactSummaryRowProps> = ({
    durationDelta,
    costDelta,
    currency = 'INR',
    segmentsAffected,
}) => {
    const timeDelta = durationDelta || 0
    const timeImproved = timeDelta < 0

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Time delta badge */}
            {timeDelta !== 0 && (
                <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold font-manrope px-2.5 py-1 rounded-full ${
                        timeImproved
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                    }`}
                >
                    {timeImproved ? '' : '+'}{timeDelta} min transit
                </span>
            )}

            {/* Cost delta badge */}
            {costDelta != null && costDelta !== 0 && (
                <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold font-manrope px-2.5 py-1 rounded-full ${
                        costDelta < 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                    }`}
                >
                    {costDelta < 0 ? '' : '+'}{Math.abs(costDelta)} {currency}
                </span>
            )}

            {/* Segments affected */}
            {segmentsAffected > 0 && (
                <span className="inline-flex items-center text-xs font-medium font-manrope px-2.5 py-1 rounded-full bg-grey_5 text-grey_2">
                    {segmentsAffected} segment{segmentsAffected !== 1 ? 's' : ''} affected
                </span>
            )}
        </div>
    )
}

export default ImpactSummaryRow
