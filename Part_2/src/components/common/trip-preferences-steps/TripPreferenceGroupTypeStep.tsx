import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import TripPreferenceStepLayout from './TripPreferenceStepLayout'

export interface TripPreferenceGroupTypeResult {
    groupType: string
}

export interface TripPreferenceGroupTypeInitialData {
    groupType?: string
}

interface TripPreferenceGroupTypeStepProps {
    flowType: 'create' | 'edit'
    initialData?: TripPreferenceGroupTypeInitialData
    onNextStep?: (result: TripPreferenceGroupTypeResult) => void
    onSave?: (result: TripPreferenceGroupTypeResult) => void
    onClose?: () => void
    currentStep?: number
    totalSteps?: number
    isSaving?: boolean
}

const GROUP_TYPE_OPTIONS = [
    { key: 'solo_traveler', value: 'solo_traveler', label: 'Solo Traveler', image: '/illustrations/group types/solo.png' },
    { key: 'couple', value: 'couple', label: 'Couple', image: '/illustrations/group types/couple.png' },
    {
        key: 'couple_with_children',
        value: 'couple_with_children',
        label: 'Couple with Children',
        image: '/illustrations/group types/couple_w_children.png'
    },
    { key: 'immediate_family', value: 'immediate_family', label: 'Family', image: '/illustrations/group types/immediate_family.png' },
    { key: 'friends_group', value: 'friends_group', label: 'Friends Group', image: '/illustrations/group types/friends.png' }
]

const TripPreferenceGroupTypeStep = ({
    flowType,
    initialData,
    onNextStep,
    onSave,
    onClose,
    currentStep,
    totalSteps,
    isSaving = false
}: TripPreferenceGroupTypeStepProps) => {
    const [selectedGroupType, setSelectedGroupType] = useState<string>(initialData?.groupType || '')

    const isValid = useMemo(() => Boolean(selectedGroupType), [selectedGroupType])

    const handleContinue = () => {
        if (!isValid) return

        const result: TripPreferenceGroupTypeResult = {
            groupType: selectedGroupType
        }

        if (flowType === 'create' && onNextStep) {
            onNextStep(result)
        } else if (flowType === 'edit' && onSave) {
            onSave(result)
        }
    }

    const primaryLabel = isSaving ? 'Saving...' : flowType === 'create' ? 'Next' : 'Save'

    return (
        <TripPreferenceStepLayout
            title="Who’s travelling?"
            description="Tell us who you’re travelling with so we can fine-tune your results."
            flowType={flowType}
            onPrimary={handleContinue}
            primaryDisabled={!isValid || isSaving}
            primaryLoading={isSaving}
            primaryLabel={primaryLabel}
            secondaryLabel={flowType === 'edit' ? 'Cancel' : undefined}
            onSecondary={flowType === 'edit' ? onClose : undefined}
            onClose={onClose}
            currentStep={currentStep}
            totalSteps={totalSteps}>
            <div className="grid grid-cols-1 gap-3">
                {GROUP_TYPE_OPTIONS.map((option) => {
                    const isSelected = selectedGroupType === option.value
                    return (
                        <motion.button
                            key={option.key}
                            type="button"
                            onClick={() => setSelectedGroupType(option.value)}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className={`cursor-pointer flex items-center gap-4 rounded-2xl border p-4 transition-all ${
                                isSelected
                                    ? 'border-primary-default bg-primary-default-80 shadow-sm'
                                    : 'border-feature-card-border bg-white hover:border-primary-default/40'
                            }`}>
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-grey-5 flex items-center justify-center">
                                <img
                                    src={option.image}
                                    alt={option.label}
                                    className="h-8 w-8 object-contain"
                                />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-base font-semibold text-header-black">{option.label}</p>
                            </div>
                            {isSelected && (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-default text-white">
                                    <Check className="h-4 w-4" />
                                </div>
                            )}
                        </motion.button>
                    )
                })}
            </div>
        </TripPreferenceStepLayout>
    )
}

export default TripPreferenceGroupTypeStep
