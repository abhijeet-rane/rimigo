import React from 'react'
import type { DateShiftData } from './types'

interface DateShiftCardProps {
    data: DateShiftData
    onRefreshItinerary?: () => void
}

const formatDate = (dateStr: string) => {
    // Append T00:00:00 to date-only strings (YYYY-MM-DD) to avoid UTC midnight timezone shift
    const parsed = dateStr.length === 10 ? new Date(dateStr + 'T00:00:00') : new Date(dateStr)
    return parsed.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    })
}

const DateShiftCard: React.FC<DateShiftCardProps> = ({ data, onRefreshItinerary }) => {
    const direction = data.days_shifted > 0 ? 'forward' : 'back'
    const absDays = Math.abs(data.days_shifted)

    return (
        <div className="w-full flex flex-col gap-3 px-4 py-4 rounded-[20px] bg-gradient-to-b from-primary-default/[0.03] to-transparent">
            {data.response && (
                <p className="text-sm font-semibold text-grey_0 font-manrope leading-6">{data.response}</p>
            )}

            {/* Header */}
            <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-grey_1 font-manrope uppercase tracking-wide">
                    Date Shift
                </p>
                <span className="text-[10px] font-medium text-primary-default bg-primary-default/10 rounded-full px-2 py-0.5 font-manrope">
                    Shifted {direction} by {absDays} day{absDays !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Before/After table */}
            {(data.shifted_days || []).length > 0 && (
                <div className="bg-white rounded-[12px] border border-grey_4 overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-3 px-3 py-2 border-b border-grey_4 bg-grey-5/50">
                        <span className="text-[10px] font-semibold text-grey_2 font-manrope uppercase tracking-wide">Day</span>
                        <span className="text-[10px] font-semibold text-grey_2 font-manrope uppercase tracking-wide">Before</span>
                        <span className="text-[10px] font-semibold text-grey_2 font-manrope uppercase tracking-wide">After</span>
                    </div>

                    {(data.shifted_days || []).map((day, idx) => (
                        <div
                            key={idx}
                            className="grid grid-cols-3 px-3 py-2 border-b border-grey_4 last:border-b-0">
                            <span className="text-sm text-grey_0 font-manrope">Day {day.day_index + 1}</span>
                            <span className="text-sm text-grey_2 font-manrope line-through">
                                {formatDate(day.old_date)}
                            </span>
                            <span className="text-sm font-medium text-grey_0 font-manrope">
                                {formatDate(day.new_date)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Status + Action */}
            <div className="flex items-center justify-between">
                {data.applied ? (
                    <div className="flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span className="text-xs text-green-600 font-medium font-manrope">Changes applied</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span className="text-xs text-grey_2 font-medium font-manrope">Pending confirmation</span>
                    </div>
                )}

                {data.applied && onRefreshItinerary && (
                    <button
                        onClick={onRefreshItinerary}
                        className="px-4 py-2 rounded-[8px] bg-primary-default text-white text-xs font-semibold font-manrope hover:bg-primary-dark transition-colors cursor-pointer">
                        Refresh Itinerary
                    </button>
                )}
            </div>
        </div>
    )
}

export default DateShiftCard
