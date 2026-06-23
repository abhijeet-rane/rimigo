import React from 'react'
import { Check, ThumbsUp, ThumbsDown } from 'lucide-react'
import DescriptionWithShowMore from '@/components/shared/DescriptionWithShowMore/DescriptionWithShowMore'

/**
 * Interface for month row data
 * Contains all the information needed to display a single month row
 */
export interface MonthRowData {
    monthName: string // Display name of the month (e.g., "March")
    crowdLevel: {
        level: string | null // Crowd level: "high", "medium", "low" or null
        displayText: string | null // Uppercase display text (e.g., "HIGH")
    }
    weather: {
        icon: React.ReactNode | string // Weather icon component or URL string
        temperature: string | null // Formatted temperature range (e.g., "6-16°C")
        description: string | null // Weather description text
    } | null
    availability: {
        isAvailable: boolean // Whether the experience is available
        status: string // Display status (e.g., "Open" or "Closed")
        restrictions: string | null // Optional restrictions text
    }
    recommendation: {
        isRecommended: boolean | null // Whether this month is recommended
        description: string | null // Recommendation description text
    }
    isLastRow?: boolean // Whether this is the last row (to conditionally show border)
}

interface TableRowProps {
    data: MonthRowData // Row data object
    crowdLevelColors: Record<string, { bg: string; text: string }> // Color mapping for crowd levels
}

/**
 * Table Row Component for Month Data
 *
 * Renders a single row in the "When to visit" table with month information.
 * Displays month name, crowd level badge, weather info, and availability status.
 *
 * @param data - Month row data containing all information to display
 * @param crowdLevelColors - Color mapping for crowd level badges
 */
const TableRow: React.FC<TableRowProps> = ({ data, crowdLevelColors }) => {
    const { monthName, crowdLevel, weather, availability, recommendation, isLastRow = false } = data

    // Get crowd level color or default to medium
    const crowdLevelKey = crowdLevel.level?.toLowerCase() || 'medium'
    const crowdLevelColor = crowdLevelColors[crowdLevelKey] || crowdLevelColors.medium

    return (
        <div
            className={`grid gap-4 py-2 px-4 ${!isLastRow ? 'border-b border-grey-4' : ''}`}
            style={{ gridTemplateColumns: '0.9fr 0.9fr 1.2fr 1.2fr 1.8fr' }}>
            {/* Month Column */}
            <div className="font-red-hat-display font-[467] text-[16px] leading-[18px] tracking-[-0.01em] text-grey-0 flex justify-start items-center">
                {monthName}
            </div>

            {/* Crowd Level Column */}
            <div className="flex items-center">
                {crowdLevel.level && crowdLevel.displayText ? (
                    <div
                        className="rounded-full px-3 py-1"
                        style={{
                            backgroundColor: crowdLevelColor.bg,
                            color: crowdLevelColor.text
                        }}>
                        <div
                            style={{
                                fontFamily: 'Red Hat Display',
                                fontSize: '12px',
                                fontWeight: 645,
                                fontStyle: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: '1%',
                                lineHeight: '12px'
                            }}>
                            {crowdLevel.displayText}
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Weather Column */}
            <div className="flex flex-col gap-1 justify-center items-start">
                {weather ? (
                    <>
                        <div className="flex items-start justify-center gap-2">
                            {typeof weather.icon === 'string' ? (
                                <img
                                    src={weather.icon}
                                    alt={weather.description || 'Weather icon'}
                                    className="w-6 h-6"
                                />
                            ) : (
                                weather.icon
                            )}
                            <div className="flex flex-col gap-1">
                                {weather.temperature && (
                                    <span
                                        style={{
                                            fontFamily: 'Manrope',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            color: 'var(--color-grey-0, #101010)'
                                        }}>
                                        {weather.temperature}
                                    </span>
                                )}
                                {weather.description && (
                                    <DescriptionWithShowMore
                                        description={weather.description}
                                        className="text-grey-2 font-manrope font-medium"
                                        textSize="12px"
                                        lineHeight="16px"
                                        maxLines={2}
                                    />
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <span
                        style={{
                            fontFamily: 'Manrope',
                            fontSize: '14px',
                            color: 'var(--color-grey-2, #747474)'
                        }}>
                        -
                    </span>
                )}
            </div>

            {/* Availability Column */}
            <div className="flex gap-2 justify-start items-start">
                <div className="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center">
                    {availability.isAvailable ? (
                        <div className="w-full h-full rounded-full bg-secondary-green flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-white" />
                        </div>
                    ) : null}
                </div>
                <div className="flex flex-col gap-1">
                    <span className="font-manrope  font-medium text-grey-0 text-[14px] leading-[18px] tracking-[-0.01em]">{availability.status}</span>
                    {availability.restrictions && (
                        <DescriptionWithShowMore
                            description={availability.restrictions}
                            className="text-grey-2 font-manrope font-medium"
                            textSize="12px"
                            lineHeight="16px"
                            maxLines={2}
                        />
                    )}
                </div>
            </div>

            {/* Recommendation Column */}
            <div className="flex flex-col gap-1 justify-center items-start">
                {recommendation.isRecommended !== null ? (
                    recommendation.isRecommended ? (
                        <>
                            <div className="flex items-center gap-2">
                                <ThumbsUp
                                    className="w-4 h-4 shrink-0"
                                    style={{ color: 'var(--color-secondary-green, #26BC6D)' }}
                                />
                                <span className="font-manrope font-semibold text-[14px] leading-[18px] tracking-[-0.01em] text-secondary-green">
                                    Recommended
                                </span>
                            </div>
                            {recommendation.description && (
                                <div style={{ paddingLeft: '28px' }}>
                                    <DescriptionWithShowMore
                                        description={recommendation.description}
                                        className="text-grey-2 font-manrope font-medium text-[12px] leading-[16px] tracking-[-0.01em]"
                                        textSize="12px"
                                        lineHeight="16px"
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="flex gap-2 justify-start items-center">
                                <ThumbsDown
                                    className="w-5 h-5 shrink-0 mt-0.5"
                                    style={{ color: 'var(--color-secondary-red, #E73434)' }}
                                />
                                <span
                                    style={{
                                        fontFamily: 'Manrope',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: 'var(--color-secondary-red, #E73434)'
                                    }}>
                                    Not recommended
                                </span>
                            </div>
                            {recommendation.description && (
                                <div style={{ paddingLeft: '28px' }}>
                                    <DescriptionWithShowMore
                                        description={recommendation.description}
                                        className="text-grey-2 font-manrope font-medium text-[12px] leading-[16px] tracking-[-0.01em]"
                                        textSize="12px"
                                        lineHeight="16px"
                                    />
                                </div>
                            )}
                        </>
                    )
                ) : (
                    <span
                        style={{
                            fontFamily: 'Manrope',
                            fontSize: '14px',
                            color: 'var(--color-grey-2, #747474)'
                        }}>
                        -
                    </span>
                )}
            </div>
        </div>
    )
}

export default TableRow
