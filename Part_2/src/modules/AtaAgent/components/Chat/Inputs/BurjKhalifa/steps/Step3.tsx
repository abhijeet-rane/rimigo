import React, { useState } from 'react'
import { StepComponentProps } from '../SteppedInputLayout'
import AssisstantMessageTitle from '../../../components/AssisstantMessageTitle'
import PortraitPreferenceOptions from '../../../components/PortraitPreferenceOptions'
import OptionsModal from '../../../components/OptionsModal'
import ContinueButton from '../../../components/Generics/ContinueButton'

const Step3: React.FC<StepComponentProps> = ({ onNext, preferenceQuestion, preselectedOptionId }) => {
    const expertContext = preferenceQuestion?.expert_context ?? ''
    const options = preferenceQuestion?.options || []
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(preselectedOptionId || null)

    // Update selected option when preselectedOptionId changes
    React.useEffect(() => {
        if (preselectedOptionId) {
            setSelectedOptionId(preselectedOptionId)
        }
    }, [preselectedOptionId])

    const handleOptionSelect = (optionId: string) => {
        // Only update the selected option, don't advance to next step yet
        setSelectedOptionId(optionId)
    }

    const handleContinue = () => {
        // Use the selected option to proceed to next step
        if (selectedOptionId && preferenceQuestion?.id) {
            const data = { [preferenceQuestion.id]: selectedOptionId }
            onNext(data)
        } else if (preselectedOptionId && preferenceQuestion?.id) {
            // Fallback to preselected option if no selection was made
            const data = { [preferenceQuestion.id]: preselectedOptionId }
            onNext(data)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {/* question on chat */}
            <AssisstantMessageTitle title={expertContext} />

            {/* preferences options on chat window */}
            <div className="w-full rounded-[16px]">
                <PortraitPreferenceOptions
                    options={options}
                    preselectedOptionId={preselectedOptionId}
                    selectedOptionId={selectedOptionId}
                    onSelectionChange={setSelectedOptionId}
                    onOpenModal={() => setIsModalOpen(true)}
                />
            </div>

            {/* Continue Button - shown when an option is selected */}
            {selectedOptionId && (
                <div className="flex justify-end mt-4">
                    <ContinueButton
                        handleContinue={handleContinue}
                        disabled={!selectedOptionId}
                    />
                </div>
            )}

            {/* Options Modal */}
            {isModalOpen && (
                <OptionsModal
                    options={options}
                    preselectedOptionId={preselectedOptionId}
                    onClose={() => setIsModalOpen(false)}
                    onSelect={handleOptionSelect}
                    cardType="portrait"
                />
            )}
        </div>
    )
}

export default Step3
