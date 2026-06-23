import React, { useState, useEffect } from 'react'
import { StepComponentProps } from '../SteppedInputLayout'
import AssisstantMessageTitle from '../../../components/AssisstantMessageTitle'
import UserPreferenceOptions from '../../../components/UserPreferenceOptions'
import OptionsModal from '../../../components/OptionsModal'
import ContinueButton from '../../../components/Generics/ContinueButton'
import TypingContentLoader, { TypingContentLoaderConfig } from '@/components/shared/TypingContentLoader'

// Configurable shimmer delay in milliseconds
const SHIMMER_DELAY_MS = 500

const Step2: React.FC<StepComponentProps> = ({ onNext, preferenceQuestion, preselectedOptionId }) => {
    const expertContext = preferenceQuestion?.expert_context ?? ''
    const options = preferenceQuestion?.options || []
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(preselectedOptionId || null)
    const [isShimmerComplete, setIsShimmerComplete] = useState(false)

    // Show shimmer for configured duration
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsShimmerComplete(true)
        }, SHIMMER_DELAY_MS)

        return () => clearTimeout(timer)
    }, [])

    // Configuration for AssisstantMessageTitle shimmer
    const titleShimmerConfig: TypingContentLoaderConfig = {
        shimmerElements: [
            {
                height: 28,
                width: '70%',
                radius: 0,
                marginBottom: 0
            }
        ],
        containerClassName: '',
        animationDuration: 0.3,
        animationEasing: 'ease-in',
        fadeInDelay: 0
    }

    // Configuration for UserPreferenceOptions shimmer
    // Matches: flex-wrap container with option cards (456px wide each)
    const optionsShimmerConfig: TypingContentLoaderConfig = {
        shimmerElements: [
            {
                isContainer: true,
                containerClassName: 'w-full flex flex-row flex-wrap items-start gap-4'
            },
            {
                // First option card shimmer
                height: 200,
                width: 456,
                radius: 12
            },
            {
                // Second option card shimmer (if multiple options)
                height: 200,
                width: 456,
                radius: 12
            }
        ],
        containerClassName: 'w-full relative rounded-num-16 bg-white flex flex-col items-start box-border gap-3',
        animationDuration: 0.3,
        animationEasing: 'ease-in',
        fadeInDelay: 50
    }

    // Configuration for ContinueButton shimmer
    const continueButtonShimmerConfig: TypingContentLoaderConfig = {
        shimmerElements: [
            {
                height: 48,
                width: 120,
                radius: 16
            }
        ],
        containerClassName: '',
        animationDuration: 0.3,
        animationEasing: 'ease-in',
        fadeInDelay: 100
    }

    // Update selected option when preselectedOptionId changes
    React.useEffect(() => {
        if (preselectedOptionId) {
            setSelectedOptionId(preselectedOptionId)
        }
    }, [preselectedOptionId])

    const handleOptionSelect = (optionId: string) => {
        setSelectedOptionId(optionId)
        const data = { [preferenceQuestion?.id || '']: optionId }
        onNext(data)
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
            <TypingContentLoader
                isTypingComplete={isShimmerComplete}
                config={titleShimmerConfig}>
                <AssisstantMessageTitle title={expertContext} />
            </TypingContentLoader>

            <TypingContentLoader
                isTypingComplete={isShimmerComplete}
                config={optionsShimmerConfig}>
                <UserPreferenceOptions
                    options={options}
                    preselectedOptionId={preselectedOptionId}
                    selectedOptionId={selectedOptionId}
                    onSelectionChange={setSelectedOptionId}
                    onOpenModal={() => setIsModalOpen(true)}
                />
            </TypingContentLoader>

            {/* View Details Button */}
            {/* <ViewDetailsAndPrices onOpenModal={() => setIsModalOpen(true)} /> */}

            {/* Continue Button - shown when an option is selected */}
            {selectedOptionId && (
                <div className="flex justify-end mt-4">
                    <TypingContentLoader
                        isTypingComplete={isShimmerComplete}
                        config={continueButtonShimmerConfig}>
                        <ContinueButton
                            handleContinue={handleContinue}
                            disabled={!selectedOptionId}
                        />
                    </TypingContentLoader>
                </div>
            )}

            {/* Options Modal */}
            {isModalOpen && (
                <OptionsModal
                    options={options}
                    preselectedOptionId={preselectedOptionId}
                    onClose={() => setIsModalOpen(false)}
                    onSelect={handleOptionSelect}
                />
            )}
        </div>
    )
}

export default Step2
