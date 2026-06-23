import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import SectionTitle from '@/components/shared/Sections/SectionTitle'
import { Calendar, ChevronDown, ChevronUp, CircleCheckBig, Cloud, Sparkles, Users } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { SeasonalInformationType } from '../../../types/experienceDetailTypes'
import TableHeader, { TableColumnHeader } from './WhenToVisit/TableHeader'
import TableRow from './WhenToVisit/TableRow'
import { CROWD_LEVEL_COLORS, getAllMonths, getInitialMonths, prepareTableRowsData } from './WhenToVisit/utils'

interface WhenToVisitProps {
    seasonalInformation: SeasonalInformationType
    selectedMonth?: Date | null // Travel month from trip context
}

/**
 * WhenToVisit Component
 *
 * Displays seasonal information for an experience in a table format.
 * Shows travel month first, then next 3 months (or all months when expanded).
 *
 * Features:
 * - Table layout with 4 columns: Month, Crowd Level, Weather, Availability
 * - Accordion to show/hide all months
 * - Automatically highlights traveler's month
 * - Modular table header and row components
 */
const WhenToVisit: React.FC<WhenToVisitProps> = ({ seasonalInformation, selectedMonth }) => {
    // State for accordion (show all months)
    const [showAllMonths, setShowAllMonths] = useState(false)

    // Get travel month index from selectedMonth prop
    const travelMonthIndex = useMemo(() => {
        if (selectedMonth) {
            return selectedMonth.getMonth() // 0-11
        }
        return null
    }, [selectedMonth])

    // Determine which months to display
    const monthsToDisplay = useMemo(() => {
        if (showAllMonths) {
            return getAllMonths()
        }
        return getInitialMonths(travelMonthIndex)
    }, [showAllMonths, travelMonthIndex])

    // Prepare table rows data from seasonal information
    const tableRowsData = useMemo(() => {
        return prepareTableRowsData(monthsToDisplay, seasonalInformation)
    }, [monthsToDisplay, seasonalInformation])

    // Prepare table header columns configuration
    const tableColumns: TableColumnHeader[] = useMemo(
        () => [
            {
                id: 'month',
                icon: Calendar,
                label: 'Month'
            },
            {
                id: 'crowd-level',
                icon: Users,
                label: 'Crowd Level'
            },
            {
                id: 'weather',
                icon: Cloud,
                label: 'Weather'
            },
            {
                id: 'availability',
                icon: CircleCheckBig,
                label: 'Availability'
            },
            {
                id: 'recommendation',
                icon: Sparkles,
                label: 'Our recommendation'
            }
        ],
        []
    )

    // Check if there's any seasonal data available
    const hasSeasonalData = useMemo(() => {
        return Object.keys(seasonalInformation || {}).length > 0
    }, [seasonalInformation])

    if (!hasSeasonalData) {
        return null
    }

    return (
        <GenericCard className="bg-white border-none px-0 py-0 ">
            <div className="flex flex-col">
                {/* Header Section */}
                <div className="flex flex-col gap-2 max-md:px-[20px]">
                    <SectionTitle title="When to visit" />
                    <p
                        style={{
                            fontFamily: 'Manrope',
                            fontSize: '14px',
                            fontWeight: 400,
                            color: 'var(--color-grey-2, #747474)',
                            lineHeight: '20px'
                        }}>
                        We've analysed user reviews and geographical data, and identified the best and worst months to visit.
                    </p>
                </div>
                {/* Table Section */}
                <GenericCard className="mt-8 rounded-b-none p-0 max-md:overflow-x-auto">
                    <div
                        className="max-md:min-w-[1100px]" // 👈 MUST be wider than mobile
                        style={{ maxHeight: 'none', height: 'auto' }}>
                        <TableHeader columns={tableColumns} />

                        <div className="flex flex-col">
                            {tableRowsData.map((rowData, index) => (
                                <TableRow
                                    key={rowData.monthName}
                                    data={{
                                        ...rowData,
                                        isLastRow: index === tableRowsData.length - 1
                                    }}
                                    crowdLevelColors={CROWD_LEVEL_COLORS}
                                />
                            ))}
                        </div>
                    </div>
                </GenericCard>
                {/* Show All Months Button */}
                {!showAllMonths && (
                    <div className="px-6 py-3 bg-grey-5 flex justify-center items-center rounded-b-2xl border border-grey-4 border-t-0">
                        <button
                            type="button"
                            onClick={() => setShowAllMonths(true)}
                            className="flex items-center justify-center gap-2 cursor-pointer bg-transparent border-none p-0 text-primary-default font-red-hat-display font-bold text-[14px] leading-[14px] tracking-[-0.01em]">
                            <span>Show all months</span>
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>
                )}
                {/* Hide All Months Button (when expanded) */}
                {showAllMonths && (
                    <div className="px-6 py-3 rounded-b-2xl flex justify-center items-center bg-grey-5 border border-grey-4 border-t-0">
                        <button
                            type="button"
                            onClick={() => setShowAllMonths(false)}
                            className="flex items-center justify-center gap-2 cursor-pointer bg-transparent border-none p-0 text-primary-default font-red-hat-display font-bold text-[14px] leading-[14px] tracking-[-0.01em]">
                            <span>Show fewer months</span>
                            <ChevronUp className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </GenericCard>
    )
}

export default WhenToVisit
