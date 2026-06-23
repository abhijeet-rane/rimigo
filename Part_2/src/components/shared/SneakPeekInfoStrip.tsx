import React from 'react'
import { CalendarRange, Clock, Footprints, DollarSign, type LucideIcon } from 'lucide-react'
import type { SneakPeekFormattedData } from '@/modules/Acitvities/hooks/useSneakPeekData'

interface SneakPeekInfoStripProps {
    bestMonths: SneakPeekFormattedData['bestMonths']
    duration: SneakPeekFormattedData['duration']
    walkingRequired: SneakPeekFormattedData['walkingRequired']
    valueForMoney: SneakPeekFormattedData['valueForMoney']
    className?: string
    /**
     * 'strip' — always a single horizontal row (used inside the SneakPeek modal where the container is wide).
     * 'grid' — 2x2 when 4 cards, 2+1 when 3, single row for 1–2 (used inside the narrow HorizontalListCard).
     * Defaults to 'strip' to preserve the modal's original layout.
     */
    variant?: 'strip' | 'grid'
}

type BadgeColor = 'green' | 'orange' | 'yellow' | 'red' | 'gray'

const badgeColorClass: Record<BadgeColor, string> = {
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500'
}

const SneakPeekInfoStrip: React.FC<SneakPeekInfoStripProps> = ({
    bestMonths,
    duration,
    walkingRequired,
    valueForMoney,
    className = '',
    variant = 'strip'
}) => {
    const walkingBadgeColor: BadgeColor =
        walkingRequired?.value === 'LOW' ? 'green' : walkingRequired?.value === 'HIGH' ? 'orange' : 'gray'

    const valueForMoneyBadgeColor: BadgeColor =
        valueForMoney?.value === 'HIGH' ? 'green' : valueForMoney?.value === 'MEDIUM' ? 'yellow' : 'red'

    const cards: Array<{
        id: string
        icon: LucideIcon
        title: string
        data: { value: string; description: string } | null
        badge?: { value: string; color: BadgeColor }
    }> = [
        {
            id: 'bestMonths',
            icon: CalendarRange,
            title: 'Best months',
            data: bestMonths
        },
        {
            id: 'duration',
            icon: Clock,
            title: 'Duration',
            data: duration
        },
        {
            id: 'walkingRequired',
            icon: Footprints,
            title: 'Walking',
            data: walkingRequired,
            badge: walkingRequired ? { value: walkingRequired.value, color: walkingBadgeColor } : undefined
        },
        {
            id: 'valueForMoney',
            icon: DollarSign,
            title: 'Value',
            data: valueForMoney,
            badge: valueForMoney ? { value: valueForMoney.value, color: valueForMoneyBadgeColor } : undefined
        }
    ]

    const availableCards = cards.filter((card) => card.data !== null)

    if (availableCards.length === 0) return null

    // Cell sizing differs per variant: strip variant (modal) uses the original tighter sizes;
    // grid variant (narrow HorizontalListCard) uses slightly roomier sizes that wrap cleanly.
    const cellPadding = variant === 'grid' ? 'px-3 py-3' : 'px-2.5 py-2.5'
    const iconSize = variant === 'grid' ? 13 : 12
    const labelClass = variant === 'grid' ? 'text-[11px]' : 'text-[10px]'
    const titleMargin = variant === 'grid' ? 'mb-1.5' : 'mb-1'
    const valueBreak = variant === 'grid' ? 'break-words' : ''

    const renderCell = (card: (typeof availableCards)[number]) => (
        <div
            key={card.id}
            className={`flex-1 min-w-0 ${cellPadding}`}>
            <div className={`flex items-center gap-1.5 ${titleMargin}`}>
                <card.icon
                    size={iconSize}
                    className="text-grey-2 shrink-0"
                />
                <span className={`${labelClass} font-medium font-manrope text-grey-2 whitespace-nowrap`}>
                    {card.title}
                </span>
            </div>
            {card.badge ? (
                <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase ${badgeColorClass[card.badge.color]}`}>
                    {card.badge.value}
                </span>
            ) : (
                <p className={`text-[13px] font-semibold font-manrope text-grey-0 leading-tight ${valueBreak}`}>
                    {card.data?.value}
                </p>
            )}
        </div>
    )

    // Grid variant: 2x2 for 4 cards, 2+1 for 3 cards, single row for 1–2.
    if (variant === 'grid' && availableCards.length === 4) {
        const [c1, c2, c3, c4] = availableCards
        return (
            <div className={`border border-grey-4 rounded-[12px] overflow-hidden ${className}`}>
                <div className="flex flex-col divide-y divide-grey-4">
                    <div className="flex divide-x divide-grey-4">
                        {renderCell(c1)}
                        {renderCell(c2)}
                    </div>
                    <div className="flex divide-x divide-grey-4">
                        {renderCell(c3)}
                        {renderCell(c4)}
                    </div>
                </div>
            </div>
        )
    }

    if (variant === 'grid' && availableCards.length === 3) {
        const [c1, c2, c3] = availableCards
        return (
            <div className={`border border-grey-4 rounded-[12px] overflow-hidden ${className}`}>
                <div className="flex flex-col divide-y divide-grey-4">
                    <div className="flex divide-x divide-grey-4">
                        {renderCell(c1)}
                        {renderCell(c2)}
                    </div>
                    <div className="flex">
                        {renderCell(c3)}
                    </div>
                </div>
            </div>
        )
    }

    // Strip variant (modal default), and grid variant with 1–2 cards: single horizontal row.
    return (
        <div className={`border border-grey-4 rounded-[12px] overflow-visible ${className}`}>
            <div className="flex divide-x divide-grey-4">
                {availableCards.map((card) => renderCell(card))}
            </div>
        </div>
    )
}

export default SneakPeekInfoStrip
