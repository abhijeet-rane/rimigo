import React, { useState, useEffect, useMemo } from 'react'
import { TripQuestionBaseLayout } from '../components/TripQuestionBaseLayout'
import { PreferanceHorizontalCard } from '../components/PreferanceHorizontalCard'
import { useParams } from 'react-router-dom'
import { UpdateTripProfileData, updateTripProfilePartial } from '@/api/tripProfileAPI/tripProfileAPI'
import { useQuery } from '@tanstack/react-query'
import { getBasicTripData, GetBasicTripDataDataResponse } from '../api/onboardingAPI'
import { toast } from 'sonner'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import CustomShimmer from '@/components/shared/Shimmer'
import { ErrorOnBoardingScreen } from '@/modules/ErrorScreen/pages/ErrorBoradingScreen'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { getLeadGenStepNumber } from '../utils/stepUtils'
import { GROUP_TYPE_TO_PURPOSES } from '@/components/common/trip-preferences-steps/constants'
import { LEADGEN_V2_BUTTON_PAGE } from '@/constants/posthogEvents'

export interface VacationPurposeOption {
    id: number
    labelUi: string
    backendValue: string
    description: string
    imageSrc: string
    pickerDescription: string
    type: 'day' | 'month'
}

interface PreferredTravelTime {
    is_fixed: boolean
    startDate: Date | null
    endDate: Date | null
    year: number | null
    months: string[] | null
}

interface TravelPurposeQuestionPageProps {
    onStepNext: () => void
    /** When true, skip API calls (login happens later) */
    deferredLogin?: boolean
    /** Called with purpose + travel time when deferredLogin is true */
    onDeferredSubmit?: (purpose: string, travelTime: PreferredTravelTime) => void
    /** Pre-selected group type backend value (used to filter purpose options) */
    defaultGroupType?: string | null
    /** Pre-selected purpose backend value (used to restore state) */
    defaultPurpose?: string | null
    /** Pre-selected travel time (used to restore state) */
    defaultTravelTime?: PreferredTravelTime | null
    /** Custom back button handler */
    onBack?: () => void
}

export const vacationPurposeOptions: VacationPurposeOption[] = [
    {
        id: 1,
        labelUi: 'Leisure',
        backendValue: 'leisure_relaxation',
        description: 'Embark on a refreshing escape filled with relaxation and cherished moments',
        imageSrc: 'https://media.rimigo.com/1772457148705_image-em0QUIsW2K1AYeCtbpxuUniDkcARay.png',
        type: 'month',
        pickerDescription: 'Choose your travel month'
    },
    {
        id: 2,
        labelUi: 'Birthday',
        backendValue: 'birthday_celebration',
        description: 'Celebrate the big day in style',
        imageSrc: 'https://media.rimigo.com/1772457149998_image-YimA3sxsT00vWqiUyzyLUshxsSZvll.png',
        pickerDescription: 'When is your birthday',

        type: 'day'
    },
    {
        id: 3,
        labelUi: 'Anniversary',
        backendValue: 'anniversary_trip',
        description: 'Mark the special bond with unforgettable memories',
        imageSrc: 'https://media.rimigo.com/1764775981496_f88df460c2745c95994f6f8c63e40133.png',
        pickerDescription: 'When is your anniversary',

        type: 'day'
    },
    {
        id: 4,
        labelUi: 'Honeymoon',
        backendValue: 'honeymoon',
        pickerDescription: 'Choose your travel month',

        description: 'Celebrate your love with an unforgettable romantic getaway experience',
        imageSrc: 'https://media.rimigo.com/1772457149494_image-vcJLC5bmytdiyJ9kYwdL1M430epiFc.png',
        type: 'month'
    },
    {
        id: 5,
        labelUi: 'Bachelorette/Bachelor Trip',
        backendValue: 'bachelor_bachelorette_trip',
        description: 'Celebrate your last fling before the ring with unforgettable adventures and moments',
        pickerDescription: 'Choose your travel month',
        imageSrc: 'https://media.rimigo.com/1772457147974_image-5bQgRDcM3zvQYlmbwDdNdiRLF0p2o3.png',
        type: 'month'
    }
]

function getPurposeOptionsForGroupType(
    groupType: string | null | undefined,
    options: VacationPurposeOption[]
): VacationPurposeOption[] {
    if (!groupType) return options
    const allowed = GROUP_TYPE_TO_PURPOSES[groupType]
    if (!allowed?.length) return options
    return options.filter((opt) => allowed.includes(opt.backendValue))
}

const PAGE_HEADER = 'What’s the purpose of your vacation?'
const PAGE_DESCRIPTION = 'This will help us find the right vibe for your trip.'
export const TravelPurposeQuestionPage: React.FC<TravelPurposeQuestionPageProps> = ({
    onStepNext,
    deferredLogin = false,
    onDeferredSubmit,
    defaultGroupType,
    defaultPurpose,
    defaultTravelTime,
    onBack
}) => {
    const currentStep = getLeadGenStepNumber('select-purpose') // This will return 2

    // Resolve initial selection from defaultPurpose prop
    const initialOption = defaultPurpose ? vacationPurposeOptions.find((o) => o.backendValue === defaultPurpose) : null
    const initialDates: Record<number, Date | null> = {}
    if (initialOption && defaultTravelTime?.startDate) {
        initialDates[initialOption.id] = new Date(defaultTravelTime.startDate)
    }

    const [selectedOptionId, setSelectedOptionId] = useState<number | null>(initialOption?.id ?? null)
    const [expandedOptionId, setExpandedOptionId] = useState<number | null>(null)
    const [selectedDates, setSelectedDates] = useState<Record<number, Date | null>>(initialDates)
    const [selectedServerValue, setSelectedServerValue] = useState<string | null>(initialOption?.backendValue ?? null)
    const [isNextButtonLoading, setIsNextButtonLoading] = useState(false)
    const { trip_id } = useParams<{ trip_id: string }>()

    const {
        data: tripData,
        isLoading: isTripDataLoading,
        isError: isTripDataError,
        error: tripDataError
    } = useQuery<GetBasicTripDataDataResponse>({
        queryKey: ['basicTripData', trip_id],
        queryFn: () => getBasicTripData(trip_id as string),
        enabled: !deferredLogin && !!trip_id
    })

    // In deferred mode, use defaultGroupType for filtering; otherwise use trip data
    const groupTypeForFilter = deferredLogin ? (defaultGroupType ?? undefined) : (tripData?.data?.group_type ?? undefined)
    const purposeOptions = useMemo(
        () => getPurposeOptionsForGroupType(groupTypeForFilter, vacationPurposeOptions),
        [groupTypeForFilter]
    )

    const handleCardSelect = (id: number) => {
        setSelectedOptionId(id)
        setExpandedOptionId((prev) => (prev === id ? null : id))
        const selectedOption = purposeOptions.find((opt) => opt.id === id)
        if (selectedOption) setSelectedServerValue(selectedOption.backendValue)
    }

    // Prepopulate selection if travel_purpose is present in the response (do not expand calendar by default)
    useEffect(() => {
        if (deferredLogin) return
        if (tripData?.data.travel_purpose && purposeOptions.length) {
            const existingTravelPurpose = purposeOptions.find((option) => option.backendValue === tripData.data.travel_purpose)
            if (existingTravelPurpose) {
                setSelectedOptionId(existingTravelPurpose.id)
                setSelectedServerValue(existingTravelPurpose.backendValue)

                // Also prepopulate the date if available
                if (tripData.data.preferred_travel_time?.startDate) {
                    const startDate = new Date(tripData.data.preferred_travel_time.startDate)
                    setSelectedDates((prev) => ({
                        ...prev,
                        [existingTravelPurpose.id]: startDate
                    }))
                }
            }
        }
    }, [tripData, purposeOptions, deferredLogin])

    if (!deferredLogin && isTripDataError) {
        toast.error((tripDataError as Error).message || ERROR_MESSAGES.TRIP_DATA)

        // TODO: Error Page will be shown here
        return <ErrorOnBoardingScreen />
    }

    const handleDateChange = (id: number, date: Date) => {
        setSelectedDates((prev) => ({ ...prev, [id]: date }))
    }
    const { trackButtonClickCustom } = usePostHog()
    const isNextDisabled = selectedOptionId === null || !selectedDates[selectedOptionId] || selectedDates[selectedOptionId] === null

    const handlePickerClose = () => {
        setExpandedOptionId(null)
    }

    const handleNext = async () => {
        if (!selectedOptionId || !selectedServerValue) return

        if (isNextButtonLoading) {
            return
        }

        setIsNextButtonLoading(true)
        trackButtonClickCustom?.({
            buttonPage: deferredLogin ? LEADGEN_V2_BUTTON_PAGE : 'lead_gen_v1',
            buttonName: 'Next',
            buttonAction: 'trip_purpose_page_submit',
            extra: {
                purpose: selectedServerValue
            }
        })

        // Deferred login mode: store locally, skip API
        if (deferredLogin) {
            if (selectedServerValue && selectedOptionId) {
                const travelTime: PreferredTravelTime = {
                    is_fixed: true,
                    startDate: selectedDates[selectedOptionId] ?? null,
                    endDate: selectedDates[selectedOptionId] ?? null,
                    year: selectedDates[selectedOptionId] ? selectedDates[selectedOptionId]!.getFullYear() : null,
                    months: selectedDates[selectedOptionId]
                        ? [selectedDates[selectedOptionId]!.toLocaleString('default', { month: 'long' })]
                        : null
                }
                onDeferredSubmit?.(selectedServerValue, travelTime)
            }
            setIsNextButtonLoading(false)
            onStepNext()
            return
        }

        try {
            if (!tripData?.data.trip_profile_id) {
                throw new Error(ERROR_MESSAGES.TRIP_PROFILE_ID_REQUIRED)
            }

            const payload = {
                travel_purpose: selectedServerValue,
                preferred_travel_time: {
                    is_fixed: true,
                    startDate: selectedDates[selectedOptionId] ? selectedDates[selectedOptionId] : null,
                    endDate: selectedDates[selectedOptionId] ? selectedDates[selectedOptionId] : null,
                    year: selectedDates[selectedOptionId] ? selectedDates[selectedOptionId]!.getFullYear() : null,
                    months: selectedDates[selectedOptionId] ? [selectedDates[selectedOptionId]!.toLocaleString('default', { month: 'long' })] : null
                }
            }

            const trip_profile_id = tripData?.data.trip_profile_id
            if (!trip_profile_id) {
                throw new Error(ERROR_MESSAGES.TRIP_PROFILE_ID_REQUIRED)
            }

            await updateTripProfilePartial(trip_profile_id as string, payload as unknown as UpdateTripProfileData)
            setIsNextButtonLoading(false)
            onStepNext()
        } catch (err) {
            toast.error((err as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        } finally {
            setIsNextButtonLoading(false)
        }
    }

    const showLoading = !deferredLogin && isTripDataLoading

    return (
        <TripQuestionBaseLayout
            currentStep={currentStep}
            title={PAGE_HEADER}
            description={PAGE_DESCRIPTION}
            onBack={onBack}
            dynamicContent={
                <div className="flex flex-col gap-3 mt-6">
                    {showLoading
                        ? Array.from({ length: 6 }).map((_, idx) => (
                              <CustomShimmer
                                  key={idx}
                                  height={85}
                                  radius={16}
                              />
                          ))
                        : purposeOptions.map((option) => (
                              <PreferanceHorizontalCard
                                  key={option.id}
                                  imageSrc={option.imageSrc}
                                  title={option.labelUi}
                                  description={option.description}
                                  pickerDescription={option.pickerDescription}
                                  isDuration={true}
                                  type={option.type}
                                  selectedDate={selectedDates[option.id] || null}
                                  onDateChange={(date) => handleDateChange(option.id, date)}
                                  onPress={() => handleCardSelect(option.id)}
                                  selected={selectedOptionId === option.id}
                                  expanded={expandedOptionId === option.id}
                                  monthListAnchor="today"
                                  onClose={handlePickerClose}
                              />
                          ))}
                </div>
            }
            onNext={handleNext}
            showButton={true}
            buttonName="NEXT"
            buttonDisbale={isNextDisabled || isNextButtonLoading}
        />
    )
}
