import React from 'react'
import { Info } from 'lucide-react'
import { formatCompactDateRange } from './CityDateFilterCarousel'

interface ExploringDatesBannerProps {
    checkIn?: string
    checkOut?: string
    onReset: () => void
}

/**
 * Inline notice shown above the stays filters when the user is exploring
 * dates that don't match the itinerary window for the selected city.
 * "Reset" link clears the exploration overlay (stays_exp_*) and returns
 * downstream consumers to the itinerary dates.
 */
const ExploringDatesBanner: React.FC<ExploringDatesBannerProps> = ({ checkIn, checkOut, onReset }) => {
    return (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 min-w-0">
                <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="text-[12px] font-medium font-manrope text-amber-900 leading-4 truncate">
                    You are exploring dates which are not in the itinerary.
                    {checkIn && checkOut && (
                        <span className="ml-2 text-[12px] font-bold font-red-hat-display text-grey-0 tabular-nums tracking-[-0.18px]">
                            {formatCompactDateRange(checkIn, checkOut)}
                        </span>
                    )}
                </span>
            </div>
            <button
                type="button"
                aria-label="Reset to itinerary dates"
                className="group/reset text-[12px] font-bold font-red-hat-display tracking-[-0.24px] leading-4 text-amber-800 hover:text-amber-900 px-1.5 py-1 shrink-0 transition-colors"
                onClick={onReset}>
                <span className="bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-[length:0%_1px] bg-[position:0_100%] group-hover/reset:bg-[length:100%_1px] transition-[background-size] duration-300 ease-out">
                    Reset
                </span>
            </button>
        </div>
    )
}

export default ExploringDatesBanner
