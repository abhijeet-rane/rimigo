import { useEffect, useMemo, useState } from 'react'
import TripPreferenceStepLayout from './TripPreferenceStepLayout'
import { PreferanceHorizontalCard } from '@/modules/Onboarding/components/PreferanceHorizontalCard'
import { GROUP_TYPE_TO_PURPOSES } from './constants'
import { vacationPurposeOptions, type VacationPurposeOption } from '@/modules/Onboarding/pages/TravelPurposeQuestionPage'
import { toNoonUtcIso } from '@/utils/dateUtils'

export interface TripPreferencePurposeInitialData {
    travelPurpose?: string
    preferredTravelTime?: {
        startDate?: string | null
        endDate?: string | null
        months?: string[] | null
        year?: number | null
    }
}

export interface TripPreferencePurposeResult {
    travelPurpose: string
    preferredTravelTime: {
        startDate: string | null
        endDate: string | null
        months: string[] | null
        year: number | null
    }
    selectionDate: Date | null
}

interface TripPreferencePurposeStepProps {
    flowType: 'create' | 'edit'
    initialData?: TripPreferencePurposeInitialData
    /** Selected group type from previous step; purposes are filtered by GROUP_TYPE_TO_PURPOSES */
    groupType?: string
    onNextStep?: (result: TripPreferencePurposeResult) => void
    onSave?: (result: TripPreferencePurposeResult) => void
    currentStep?: number
    totalSteps?: number
    onClose?: () => void
    isSaving?: boolean
}

const buildInitialDate = (option: VacationPurposeOption | undefined, data?: TripPreferencePurposeInitialData) => {
    if (!option || !data?.preferredTravelTime) return null

    if (option.type === 'day') {
        const raw = data.preferredTravelTime.startDate
        if (raw) {
            const date = new Date(raw)
            return Number.isNaN(date.getTime()) ? null : date
        }

        const months = data.preferredTravelTime.months
        const year = data.preferredTravelTime.year
        if (months && months[0] && year) {
            const constructed = new Date(`${months[0]} 1, ${year}`)
            return Number.isNaN(constructed.getTime()) ? null : constructed
        }

        return null
    }

    const monthName = data.preferredTravelTime.months?.[0]
    const year = data.preferredTravelTime.year
    if (!monthName || !year) return null

    const constructed = new Date(`${monthName} 1, ${year}`)
    return Number.isNaN(constructed.getTime()) ? null : constructed
}

const buildPreferredTravelTime = (option: VacationPurposeOption | undefined, date: Date | null) => {
    if (!option || !date) {
        return {
            startDate: null,
            endDate: null,
            months: null,
            year: null
        }
    }

    if (option.type === 'day') {
        const iso = toNoonUtcIso(date)
        const monthName = date.toLocaleString('default', { month: 'long' })
        return {
            startDate: iso,
            endDate: iso,
            months: [monthName],
            year: date.getFullYear()
        }
    }

    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    const monthName = date.toLocaleString('default', { month: 'long' })

    return {
        startDate: toNoonUtcIso(start),
        endDate: toNoonUtcIso(end),
        months: [monthName],
        year: date.getFullYear()
    }
}

/** Purpose options filtered by group type; if groupType is missing or unknown, returns all options */
function getPurposeOptionsForGroupType(groupType: string | undefined): VacationPurposeOption[] {
    if (!groupType) return vacationPurposeOptions
    const allowedBackendValues = GROUP_TYPE_TO_PURPOSES[groupType]
    if (!allowedBackendValues?.length) return vacationPurposeOptions
    return vacationPurposeOptions.filter((opt) => allowedBackendValues.includes(opt.backendValue))
}

const TripPreferencePurposeStep = ({
    flowType,
    initialData,
    groupType,
    onNextStep,
    onSave,
    currentStep,
    totalSteps,
    onClose,
    isSaving
}: TripPreferencePurposeStepProps) => {
    const purposeOptions = useMemo(() => getPurposeOptionsForGroupType(groupType), [groupType])

    const initialOptionId = useMemo(() => {
        if (!initialData?.travelPurpose) return null
        const option = purposeOptions.find((opt) => opt.backendValue === initialData.travelPurpose)
        return option?.id ?? null
    }, [initialData, purposeOptions])

    const initialOption = initialOptionId ? purposeOptions.find((option) => option.id === initialOptionId) : undefined

    const [selectedOptionId, setSelectedOptionId] = useState<number | null>(initialOptionId)
    const [expandedOptionId, setExpandedOptionId] = useState<number | null>(initialOptionId)
    const [selectedDates, setSelectedDates] = useState<Record<number, Date | null>>({})
    const [displayMonth, setDisplayMonth] = useState<Date | null>(() => {
        if (initialOptionId && initialOption) {
            const date = buildInitialDate(initialOption, initialData)
            return date ?? null
        }
        if (initialData?.preferredTravelTime?.startDate) {
            const normalized = new Date(initialData.preferredTravelTime.startDate)
            return Number.isNaN(normalized.getTime()) ? null : normalized
        }
        const monthName = initialData?.preferredTravelTime?.months?.[0]
        const year = initialData?.preferredTravelTime?.year
        if (monthName && year) {
            const fallback = new Date(`${monthName} 1, ${year}`)
            return Number.isNaN(fallback.getTime()) ? null : fallback
        }
        return null
    })

    useEffect(() => {
        setSelectedOptionId(initialOptionId)
        setExpandedOptionId(initialOptionId)

        if (initialOptionId && initialOption) {
            const dateForInitialOption = buildInitialDate(initialOption, initialData)
            setSelectedDates(dateForInitialOption ? { [initialOptionId]: dateForInitialOption } : {})
        } else if (initialData?.preferredTravelTime) {
            const preferredTravelTime = initialData.preferredTravelTime
            setSelectedDates((prev) => {
                const next: Record<number, Date | null> = { ...prev }
                purposeOptions.forEach((option) => {
                    const date = buildInitialDate(option, initialData)
                    if (date) {
                        next[option.id] = date
                    }
                })
                return next
            })
            setDisplayMonth((prevDisplayMonth) => {
                if (prevDisplayMonth) {
                    return prevDisplayMonth
                }

                const primaryMonth = preferredTravelTime.startDate
                if (primaryMonth) {
                    const normalized = new Date(primaryMonth)
                    if (!Number.isNaN(normalized.getTime())) {
                        return normalized
                    }
                } else {
                    const monthName = preferredTravelTime.months?.[0]
                    const year = preferredTravelTime.year
                    if (monthName && year) {
                        const fallback = new Date(`${monthName} 1, ${year}`)
                        if (!Number.isNaN(fallback.getTime())) {
                            return fallback
                        }
                    }
                }

                return prevDisplayMonth
            })
        } else {
            setSelectedDates({})
        }
    }, [initialOptionId, initialOption, initialData, purposeOptions])

    const selectedOption = selectedOptionId ? purposeOptions.find((option) => option.id === selectedOptionId) : undefined
    const selectedDate = selectedOptionId ? (selectedDates[selectedOptionId] ?? null) : null

    const handleCardSelect = (id: number) => {
        setSelectedOptionId(id)
        setExpandedOptionId((prev) => (prev === id ? null : id))

        const option = purposeOptions.find((item) => item.id === id)
        if (option && !selectedDates[id] && initialData?.preferredTravelTime) {
            const derivedDate = buildInitialDate(option, initialData)
            if (derivedDate) {
                setSelectedDates((prev) => ({ ...prev, [id]: derivedDate }))
                if (!displayMonth || option.type === 'day') {
                    setDisplayMonth(derivedDate)
                }
            }
        } else if (option && !displayMonth && selectedDates[id]) {
            setDisplayMonth(selectedDates[id])
        }
    }

    const handleDateChange = (id: number, date: Date) => {
        setSelectedDates((prev) => ({ ...prev, [id]: date }))
        setDisplayMonth(date)
        setExpandedOptionId(id)
    }

    const handleSubmit = () => {
        if (!selectedOption || !selectedDate) {
            return
        }

        const payload: TripPreferencePurposeResult = {
            travelPurpose: selectedOption.backendValue,
            preferredTravelTime: buildPreferredTravelTime(selectedOption, selectedDate),
            selectionDate: selectedDate
        }

        if (flowType === 'create') {
            onNextStep?.(payload)
        } else {
            onSave?.(payload)
        }
    }

    const isPrimaryDisabled = !selectedOption || !selectedDate

    return (
        <TripPreferenceStepLayout
            title="What's the purpose of your vacation?"
            description="This helps us find the right vibe for your trip."
            flowType={flowType}
            onPrimary={handleSubmit}
            primaryDisabled={isPrimaryDisabled}
            primaryLoading={isSaving}
            currentStep={currentStep}
            totalSteps={totalSteps}
            onClose={onClose}>
            <div className="flex flex-col gap-3">
                {purposeOptions.map((option) => (
                    <PreferanceHorizontalCard
                        key={option.id}
                        imageSrc={option.imageSrc}
                        title={option.labelUi}
                        description={option.description}
                        pickerDescription={option.pickerDescription}
                        isDuration={true}
                        type={option.type}
                        defaultMonth={displayMonth || undefined}
                        selectedDate={selectedDates[option.id] || null}
                        onDateChange={(date) => handleDateChange(option.id, date)}
                        onPress={() => handleCardSelect(option.id)}
                        selected={selectedOptionId === option.id}
                        expanded={expandedOptionId === option.id}
                        onClose={() => setExpandedOptionId(null)}
                    />
                ))}
            </div>
        </TripPreferenceStepLayout>
    )
}

export default TripPreferencePurposeStep
