import { useEffect, useMemo, useState } from 'react'
import TripPreferenceStepLayout from './TripPreferenceStepLayout'
import { PreferanceSquareCard } from '@/modules/Onboarding/components/PreferanceSquareCard'
import { ACCOMMODATION_OPTIONS } from './constants'

export interface TripPreferenceStayResult {
    accommodationTypes: string[]
}

interface TripPreferenceStayStepProps {
    flowType: 'create' | 'edit'
    initialTypes?: string[]
    onNextStep?: (result: TripPreferenceStayResult) => void
    onSave?: (result: TripPreferenceStayResult) => void
    currentStep?: number
    totalSteps?: number
    onClose?: () => void
    isSaving?: boolean
}

const TripPreferenceStayStep = ({
    flowType,
    initialTypes,
    onNextStep,
    onSave,
    currentStep,
    totalSteps,
    onClose,
    isSaving
}: TripPreferenceStayStepProps) => {
    const initialSelection = useMemo(() => {
        if (!initialTypes?.length) return []
        const available = ACCOMMODATION_OPTIONS.filter((option) => initialTypes.includes(option.valueServer))
        return available.map((option) => option.id)
    }, [initialTypes])

    const [selectedIds, setSelectedIds] = useState<number[]>(initialSelection)

    useEffect(() => {
        setSelectedIds(initialSelection)
    }, [initialSelection])

    const toggleSelection = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
    }

    const handleSubmit = () => {
        const values = ACCOMMODATION_OPTIONS.filter((option) => selectedIds.includes(option.id)).map((option) => option.valueServer)
        const payload: TripPreferenceStayResult = { accommodationTypes: values }
        if (flowType === 'create') {
            onNextStep?.(payload)
        } else {
            onSave?.(payload)
        }
    }

    return (
        <TripPreferenceStepLayout
            title="What kind of accommodation would you prefer?"
            description="Pick as many stay types as you'd like—we'll balance comfort and budget."
            flowType={flowType}
            onPrimary={handleSubmit}
            primaryDisabled={selectedIds.length === 0}
            primaryLoading={isSaving}
            currentStep={currentStep}
            totalSteps={totalSteps}
            onClose={onClose}>
            <div className="grid grid-cols-2 gap-4">
                {ACCOMMODATION_OPTIONS.map((option) => {
                    const isSelected = selectedIds.includes(option.id)
                    return (
                        <PreferanceSquareCard
                            key={option.id}
                            imageSource={option.image}
                            text={option.labelUi}
                            isSelected={isSelected}
                            onPress={() => toggleSelection(option.id)}
                        />
                    )
                })}
            </div>
        </TripPreferenceStepLayout>
    )
}

export default TripPreferenceStayStep
