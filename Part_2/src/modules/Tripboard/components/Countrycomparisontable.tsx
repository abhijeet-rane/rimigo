import { CROWD_ICON, MONEY_ICON } from '@/constants/thiingsIcons'
import React from 'react'

/**
 * Interface for country row data
 * Contains all the information needed to display a single country row
 */
export interface CountryRowData {
    name: string
    cost: string
    costNote: string
    weatherIcon: string
    temp: string
    weatherNote: string
    crowd: string
    crowdColor: string
    crowdNote: string
}

interface CountryComparisonTableProps {
    rows: CountryRowData[]
    monthDisplay: string
    isAnyLoading: boolean
    countryIds: string[]
}

/**
 * Shimmer Loader Component
 * Shows a loading skeleton while data is being fetched
 */
export const ShimmerRow: React.FC = () => (
    <div className="grid gap-4 px-5 py-4 border-b border-grey-4 bg-white animate-pulse"
        style={{ gridTemplateColumns: '1fr 1.2fr 1.2fr 1fr' }}>
        <div className="h-4 bg-grey-4 rounded w-24"></div>
        <div className="h-4 bg-grey-4 rounded w-32"></div>
        <div className="h-4 bg-grey-4 rounded w-28"></div>
        <div className="h-4 bg-grey-4 rounded w-20"></div>
    </div>
)

/**
 * Country Comparison Table Component
 *
 * Renders a responsive table displaying country information including:
 * - Country name
 * - Average daily cost
 * - Weather information for the selected month
 * - Crowd levels for the selected month
 *
 * Includes mobile horizontal scrolling support when content exceeds viewport width
 */
const CountryComparisonTable: React.FC<CountryComparisonTableProps> = ({
    rows,
    monthDisplay,
    isAnyLoading,
    countryIds
}) => {
    return (
        <div className="bg-grey-5 border border-grey-4 rounded-2xl overflow-x-auto md:overflow-hidden scrollbar-hide">
            {/* Wrapper for mobile horizontal scroll */}
            <div className="max-md:min-w-[1100px]" >
                {/* Header */}
                <div
                    className="grid gap-4 px-5 py-3 border-b border-grey-4 bg-grey-5"
                    style={{ gridTemplateColumns: '1fr 1.2fr 1.2fr 1fr' }}>
                    <span className="text-[13px] font-semibold text-grey-1 font-red-hat-display uppercase tracking-wide">
                        Country
                    </span>
                    <span className="text-[13px] font-semibold text-grey-1 font-red-hat-display uppercase tracking-wide flex items-center gap-1.5">
                        <img src={MONEY_ICON} alt="" className="w-3.5 h-3.5" />
                        Avg. Cost / day
                    </span>
                    <span className="text-[13px] font-semibold text-grey-1 font-red-hat-display uppercase tracking-wide">
                        Weather ({monthDisplay})
                    </span>
                    <span className="text-[13px] font-semibold text-grey-1 font-red-hat-display uppercase tracking-wide flex items-center gap-1.5">
                        <img src={CROWD_ICON} alt="" className="w-3.5 h-3.5" />
                        Crowds ({monthDisplay})
                    </span>
                </div>

                {/* Rows */}
                <div className="flex flex-col">
                    {isAnyLoading && rows.length === 0 ? (
                        <>
                            {countryIds.map((id) => <ShimmerRow key={id} />)}
                        </>
                    ) : (
                        rows.map((row, index) => (
                            <div
                                key={row.name}
                                className={`grid gap-4 px-5 py-4 bg-white ${
                                    index !== rows.length - 1 ? 'border-b border-grey-4' : ''
                                }`}
                                style={{ gridTemplateColumns: '1fr 1.2fr 1.2fr 1fr' }}>
                                {/* Country name */}
                                <div className="flex items-center">
                                    <span className="font-manrope font-semibold text-[14px] text-grey-0">
                                        {row.name}
                                    </span>
                                </div>

                                {/* Cost */}
                                <div className="flex flex-col gap-0.5 justify-center">
                                    <span className="font-manrope font-semibold text-[14px] text-grey-0">
                                        {row.cost}
                                    </span>
                                    <span className="text-[11px] font-manrope font-medium text-grey-2 line-clamp-1">
                                        {row.costNote}
                                    </span>
                                </div>

                                {/* Weather */}
                                <div className="flex items-center gap-2">
                                    <img src={row.weatherIcon} alt="" className="w-5 h-5 shrink-0" />
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-manrope font-semibold text-[14px] text-grey-0">
                                            {row.temp}
                                        </span>
                                        <span className="text-[11px] font-manrope font-medium text-grey-2 line-clamp-1">
                                            {row.weatherNote}
                                        </span>
                                    </div>
                                </div>

                                {/* Crowd */}
                                <div className="flex flex-col gap-1 justify-center">
                                    <span
                                        className={`${row.crowdColor} text-white text-[12px] font-red-hat-display font-medium px-2.5 py-0.5 rounded-full w-fit`}>
                                        {row.crowd}
                                    </span>
                                    <span className="text-[11px] font-manrope font-medium text-grey-2 line-clamp-1">
                                        {row.crowdNote}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

export default CountryComparisonTable