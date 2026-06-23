import React from 'react'
import type { OverviewInfoCards } from '../adapter/overviewAdapter'
import { CALENDER_ICON, CLOUDY_ICON, HOURGLASS_ICON, WALLET_ICON } from '@/constants/thiingsIcons'

interface OverviewInfoCardsProps {
    infoCards?: OverviewInfoCards | null
}

/**
 * Get icon based on label text
 */
const getIconForLabel = (label: string): React.ComponentType<{ className?: string }> | string => {
    const lowerLabel = label.toLowerCase()
    if (lowerLabel.includes('month') || lowerLabel.includes('visit')) {
        return CALENDER_ICON
    } else if (lowerLabel.includes('duration') || lowerLabel.includes('days')) {
        return HOURGLASS_ICON
    } else if (lowerLabel.includes('weather') || lowerLabel.includes('temperature')) {
        return CLOUDY_ICON
    } else if (lowerLabel.includes('cost') || lowerLabel.includes('price')) {
        return WALLET_ICON
    }
    return CALENDER_ICON // Default icon
}

const OverviewInfoCards: React.FC<OverviewInfoCardsProps> = ({ infoCards }) => {
    if (!infoCards) {
        return null
    }

    // Use seasonalInfo array if available, otherwise fallback to individual fields
    let cards: Array<{
        icon: React.ComponentType<{ className?: string }> | string
        label: string
        value: string
        key: string
    }> = []

    if (infoCards.seasonalInfo && infoCards.seasonalInfo.length > 0) {
        // Use seasonalInfo array directly
        cards = infoCards.seasonalInfo.map((item, index) => ({
            icon: getIconForLabel(item.label),
            label: item.label,
            value: item.description,
            key: `seasonal-${index}`
        })).filter((card) => card.value) // Only show cards with values
    } else {
        // Fallback to individual fields
        cards = [
            {
                icon: CALENDER_ICON,
                label: 'Best months to visit',
                value: infoCards.bestMonths || '',
                key: 'bestMonths'
            },
            {
                icon: HOURGLASS_ICON,
                label: 'Ideal duration',
                value: infoCards.idealDuration || '',
                key: 'idealDuration'
            },
            {
                icon: CLOUDY_ICON,
                label: 'Estimated weather',
                value: infoCards.estimatedWeather || '',
                key: 'estimatedWeather'
            },
            {
                icon: WALLET_ICON,
                label: 'Approx. cost (per person)',
                value: infoCards.approxCost || '',
                key: 'approxCost'
            }
        ].filter((card) => card.value) // Only show cards with values
    }

    if (cards.length === 0) {
        return null
    }

    return (
        <div className="w-full px-5 md:px-0 relative flex items-center justify-between gap-5 text-left text-sm text-grey-2 font-red-hat-display flex-wrap">
            {cards.map((card, index) => {
                const isLast = index === cards.length - 1
                const isIconString = typeof card.icon === 'string'
                const IconComponent = isIconString ? null : (card.icon as React.ComponentType<{ className?: string }>)
                return (
                    <div key={card.key} className="flex items-center gap-2">
                        {/* Icon */}
                        <div className="w-10 h-10 relative flex items-center justify-center">
                            {isIconString ? (
                                <img
                                    src={card.icon as string}
                                    alt={card.label}
                                    className="w-10 h-10 relative max-h-full object-cover"
                                />
                            ) : IconComponent ? (
                                <IconComponent className="w-10 h-10 text-grey-0" />
                            ) : null}
                        </div>
                        {/* Content */}
                        <div className={`flex flex-col items-start gap-0.5 ${!isLast ? 'w-[300px] md:w-[173px]' : ''}`}>
                            <b className="self-stretch relative tracking-[-0.02em] font-red-hat-display font-bold text-[14px] leading-5">{card.label}</b>
                            <div className="self-stretch relative text-[16px] tracking-[-0.04em] font-medium font-manrope text-grey-0">
                                {card.value}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default OverviewInfoCards
