import SectionParagraphText from '@/components/shared/Sections/SectionParagraphText'
import React from 'react'

// UI-adapted structure consumed by this card
export interface UITransportOptions {
    description: string
    recommended_option: Array<{ name: string; iconUrl?: string }>
    modes: Array<{ name: string; iconUrl?: string; icon?: React.ReactNode }>
    transport_option_description?: Array<{
        key: string
        description: string
    }>
}

const RECOMMENDED_MODE_TEXT = 'RECOMMENDED MODE:'
const OTHER_MODES_TEXT = 'OTHER MODES:'

export const TransportInformationCard = ({ transportOptions }: { transportOptions: UITransportOptions }) => {
    if (transportOptions.recommended_option.length === 0) {
        return null
    }

    return (
        <div
            className="w-full max-w-4xl bg-white mt-2"
            style={{ borderColor: 'var(--color-feature-card-border)' }}>
            <div className="mb-4 sm:mb-6 bg-grey-5 p-3 rounded-lg w-fit">
                <h3
                    className="lg:text-xs text-xs font-red-hat-display text-gray text-left sm:text-sm font-medium mb-2 sm:mb-3"
                    style={{ color: 'var(--color-grey-0)' }}>
                    {RECOMMENDED_MODE_TEXT}
                </h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {transportOptions.recommended_option.map((option) => (
                        <div
                            key={option.name}
                            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full transition-all bg-white border border-grey-4"
                            style={{
                                color: 'var(--color-grey-0)'
                            }}>
                            {option.iconUrl ? (
                                <img
                                    src={option.iconUrl}
                                    alt={option.name}
                                    className="w-4 h-4 object-contain"
                                />
                            ) : null}
                            <span className="font-medium text-xs sm:text-sm font-red-hat-display">{option.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mb-4 sm:mb-6">
                <h3
                    className="lg:text-xs text-xs font-red-hat-display text-gray text-left sm:text-sm font-medium mb-2 sm:mb-3"
                    style={{ color: 'var(--color-grey-0)' }}>
                    {OTHER_MODES_TEXT}
                </h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {transportOptions.modes.map((mode) => (
                        <div
                            key={mode.name}
                            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full transition-all hover:opacity-80 bg-white border border-grey-4">
                            {mode.iconUrl ? (
                                <img
                                    src={mode.iconUrl}
                                    alt={mode.name}
                                    className="w-[18px] h-[18px] object-contain"
                                    style={{ filter: 'grayscale(0%)' }}
                                />
                            ) : mode.icon ? (
                                <span className="w-4 h-4 flex items-center justify-center text-grey-0">{mode.icon}</span>
                            ) : null}
                            <span className="font-medium text-xs sm:text-sm font-red-hat-display">{mode.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {transportOptions.description && (
                <div className="rounded-lg p-3 sm:p-4 bg-grey-5 border border-grey-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                        <div className="shrink-0 w-4 h-4 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 bg-grey-0 text-white font-red-hat-display">
                            i
                        </div>
                        <div className="flex-1">
                            <SectionParagraphText
                                text={transportOptions.description}
                                textStyle={{ color: 'var(--color-grey-0)', fontSize: '14px' }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TransportInformationCard
