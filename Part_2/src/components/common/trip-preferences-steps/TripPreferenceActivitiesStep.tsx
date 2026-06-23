import { useEffect, useMemo, useState } from 'react'
import TripPreferenceStepLayout from './TripPreferenceStepLayout'
import { FALLBACK_EXPERIENCE_PREFERENCES, ExperiencePreferenceUI } from '@/modules/Onboarding/adapters/experiencePreferenceAdapters'
import { PreferanceHorizontalCard } from '@/modules/Onboarding/components/PreferanceHorizontalCard'

export interface TripPreferenceActivitiesResult {
    experiences: string[]
}

interface TripPreferenceActivitiesStepProps {
    flowType: 'create' | 'edit'
    initialExperiences?: string[]
    options?: ExperiencePreferenceUI[]
    onNextStep?: (result: TripPreferenceActivitiesResult) => void
    onSave?: (result: TripPreferenceActivitiesResult) => void
    currentStep?: number
    totalSteps?: number
    onClose?: () => void
    isSaving?: boolean
}

const TripPreferenceActivitiesStep = ({
    flowType,
    initialExperiences,
    options,
    onNextStep,
    onSave,
    currentStep,
    totalSteps,
    onClose,
    isSaving
}: TripPreferenceActivitiesStepProps) => {
    const activityOptions = options && options.length > 0 ? options : FALLBACK_EXPERIENCE_PREFERENCES

    const initialSelection = useMemo(() => {
        if (!initialExperiences?.length) return []
        const available = activityOptions.filter((option) => initialExperiences.includes(option.backendValue))
        return available.map((option) => option.id)
    }, [initialExperiences, activityOptions])

    const [selectedIds, setSelectedIds] = useState<number[]>(initialSelection)

    useEffect(() => {
        setSelectedIds(initialSelection)
    }, [initialSelection])

    const toggleSelection = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
    }

    const handleSubmit = () => {
        const values = activityOptions.filter((option) => selectedIds.includes(option.id)).map((option) => option.backendValue)
        const payload: TripPreferenceActivitiesResult = { experiences: values }
        if (flowType === 'create') {
            onNextStep?.(payload)
        } else {
            onSave?.(payload)
        }
    }

    return (
        <TripPreferenceStepLayout
            title="What kind of activities interest you?"
            description="Pick what excites you. We'll curate experiences that match."
            flowType={flowType}
            onPrimary={handleSubmit}
            primaryDisabled={selectedIds.length === 0}
            primaryLoading={isSaving}
            currentStep={currentStep}
            totalSteps={totalSteps}
            onClose={onClose}>
            <div className="flex flex-col gap-3">
                {activityOptions.map((option) => {
                    const isSelected = selectedIds.includes(option.id)
                    return (
                        <PreferanceHorizontalCard
                            key={option.id}
                            imageSrc={option.imageSrc}
                            title={option.labelUi}
                            description={option.description}
                            selected={isSelected}
                            expanded={false}
                            onPress={() => toggleSelection(option.id)}
                        />
                    )
                })}
            </div>
        </TripPreferenceStepLayout>
    )
}

export default TripPreferenceActivitiesStep
