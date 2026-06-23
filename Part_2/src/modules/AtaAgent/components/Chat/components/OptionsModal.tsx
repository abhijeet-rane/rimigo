import { useEffect, useState } from 'react'
import OptionsModalCard from './OptionsModalCard'
import PotraitModalCard from './PotraitModalCard'
import { X } from 'lucide-react'
import ContinueButton from './Generics/ContinueButton'

interface Option {
    id: string
    name: string
    recommendation_reason?: string
    budget_type?: string
    content?: Array<{ type: string; url: string; redirection_url?: string }>
    details?: string[]
    education_tips?: string[]
    pricing?: {
        min_price: string
        max_price?: string
        currency: string
        type: string
    }
}

interface OptionsModalProps {
    options?: Option[]
    onClose: () => void
    onSelect?: (optionId: string) => void
    cardType?: 'landscape' | 'portrait' // New prop to determine card type
    preselectedOptionId?: string | null
}

const OptionsModal = ({ options = [], onClose, onSelect, cardType = 'landscape', preselectedOptionId }: OptionsModalProps) => {
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(preselectedOptionId || null)

    useEffect(() => {
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    useEffect(() => {
        // Update selected option when preselectedOptionId changes
        if (preselectedOptionId) {
            setSelectedOptionId(preselectedOptionId)
        }
    }, [preselectedOptionId])

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    const handleCardClick = (optionId: string) => {
        setSelectedOptionId(optionId)
    }

    const handleContinue = () => {
        if (selectedOptionId) {
            // Track selection and move to next step
            onSelect?.(selectedOptionId)
            onClose()
        }
    }

    // Calculate card width based on number of options
    const getCardWidth = (totalCards: number): string => {
        if (totalCards === 1) return '100%'
        if (totalCards === 2) return '48%'
        if (totalCards === 3) return '32%'
        // For 4 or more cards, distribute evenly
        return `${100 / totalCards}%`
    }

    const cardWidth = getCardWidth(options.length)

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-grey-0-80 p-4"
            onClick={handleOverlayClick}>
            <div className="relative bg-white rounded-xl max-w-[1024px] max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gainsboro px-6 py-4 flex items-center justify-between z-10 min-w-[600px] rounded-t-xl">
                    <h2 className="text-2xl font-semibold text-gray font-red-hat-display">Select your preferred option</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="h-6 w-6 text-gray" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
                    {options.length === 0 ? (
                        <div className="text-center py-8 text-gray">No options available</div>
                    ) : (
                        <div
                            className={`grid grid-auto-rows-1fr gap-6 ${cardType === 'portrait' ? 'h-full' : ''} ${options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} `}>
                            {options.map((option) =>
                                cardType === 'portrait' ? (
                                    <PotraitModalCard
                                        key={option.id}
                                        option={option}
                                        isSelected={selectedOptionId === option.id}
                                        onSelect={() => handleCardClick(option.id)}
                                        width={cardWidth}
                                    />
                                ) : (
                                    <OptionsModalCard
                                        key={option.id}
                                        option={option}
                                        isSelected={selectedOptionId === option.id}
                                        onSelect={() => handleCardClick(option.id)}
                                        width={cardWidth}
                                    />
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* Footer with Continue Button */}
                {selectedOptionId && (
                    <div className="sticky bottom-0 bg-grey-5 border-t border-grey-4 px-6 py-4 flex items-center justify-end z-10 rounded-b-xl">
                        <ContinueButton
                            disabled={!selectedOptionId}
                            handleContinue={handleContinue}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

export default OptionsModal
