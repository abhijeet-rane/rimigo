import { FunctionComponent, useState, useEffect } from 'react'
import UserPreferencesOptionsCard from './UserPreferencesOptionsCard'

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
        max_price: string
        currency: string
        type: string
    }
}

interface UserPreferenceOptionsProps {
    options?: Option[]
    onOptionSelect?: (optionId: string) => void
    onOpenModal?: () => void
    preselectedOptionId?: string | null
    selectedOptionId?: string | null
    onSelectionChange?: (optionId: string | null) => void
}

const UserPreferenceOptions: FunctionComponent<UserPreferenceOptionsProps> = ({
    options = [],
    onOpenModal,
    preselectedOptionId,
    selectedOptionId: externalSelectedOptionId,
    onSelectionChange
}) => {
    const [internalSelectedOptionId, setInternalSelectedOptionId] = useState<string | null>(preselectedOptionId || null)

    // Use external selectedOptionId if provided, otherwise use internal state
    const selectedOptionId = externalSelectedOptionId !== undefined ? externalSelectedOptionId : internalSelectedOptionId

    // Update selected option when preselectedOptionId changes
    useEffect(() => {
        if (preselectedOptionId) {
            if (onSelectionChange) {
                onSelectionChange(preselectedOptionId)
            } else {
                setInternalSelectedOptionId(preselectedOptionId)
            }
        }
    }, [preselectedOptionId, onSelectionChange])

    const handleOptionSelect = (optionId: string) => {
        if (onSelectionChange) {
            onSelectionChange(optionId)
        } else {
            setInternalSelectedOptionId(optionId)
        }
        // Don't call onOptionSelect immediately - just track selection
        // The Continue button will handle the actual next step
    }

    if (options.length === 0) {
        return null
    }

    return (
        <div className="w-full relative rounded-num-16 bg-white flex flex-col items-start  box-border gap-3 text-left  text-grey-0 font-red-hat-display">
            {/* <div className="relative tracking-[-0.03em] leading-[18px] font-semibold w-full">Here are the options you can choose from:</div> */}
            <div className="w-full flex flex-row flex-wrap items-start gap-4 text-[12px] text-blue-100 font-manrope">
                {options.map((option) => (
                    <UserPreferencesOptionsCard
                        key={option.id}
                        option={option}
                        isSelected={selectedOptionId === option.id}
                        onOpenModal={onOpenModal}
                        onSelect={handleOptionSelect}
                    />
                ))}
            </div>
        </div>
    )
}

export default UserPreferenceOptions
