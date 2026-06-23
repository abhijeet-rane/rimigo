import React, { useState, useEffect } from 'react'
import { PreferanceSquareCard } from '../components/PreferanceSquareCard'
import { TripQuestionBaseLayout } from '../components/TripQuestionBaseLayout'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getBasicTripData, GetBasicTripDataDataResponse } from '../api/onboardingAPI'
import { UpdateTripProfileData, updateTripProfilePartial } from '@/api/tripProfileAPI/tripProfileAPI'
import { toast } from 'sonner'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import CustomShimmer from '@/components/shared/Shimmer'
import { ErrorOnBoardingScreen } from '@/modules/ErrorScreen/pages/ErrorBoradingScreen'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { getLeadGenStepNumber } from '../utils/stepUtils'
import { LEADGEN_V2_BUTTON_PAGE } from '@/constants/posthogEvents'

interface GroupTypeQuestionPageProps {
    onStepNext: () => void
    /** When true, skip API calls (login happens later) */
    deferredLogin?: boolean
    /** Called with the selected group type backend value when deferredLogin is true */
    onDeferredSubmit?: (groupType: string) => void
    /** Pre-selected group type backend value (used to restore state) */
    defaultGroupType?: string | null
    /** Custom back button handler */
    onBack?: () => void
}

const PAGE_HEADER = 'Who are you traveling with?'
const PAGE_DESCRIPTION = 'This will help us find the right balance for you and your co-travelers.'

export const groupTypeOptions = [
    { id: 1, labelUi: 'Solo', backendValue: 'solo_traveler', image: 'https://media.rimigo.com/1762969143935_545c488b2df451d6871b373aa1ec848c.png' },
    { id: 2, labelUi: 'Couple', backendValue: 'couple', image: 'https://media.rimigo.com/1762969217109_2e68e0e5411a51cf9b04041e3901e117.png' },
    {
        id: 3,
        labelUi: 'Couple with children',
        backendValue: 'couple_with_children',
        image: 'https://media.rimigo.com/1762969257402_48756409664653a994914019c1cb9cb3.png'
    },
    {
        id: 4,
        labelUi: 'Family',
        backendValue: 'immediate_family',
        image: 'https://media.rimigo.com/1762969326783_a137cad155685bce96110e55f872b3af.png'
    },
    {
        id: 5,
        labelUi: 'Friends',
        backendValue: 'friends_group',
        image: 'https://media.rimigo.com/1762969349371_0e64712e5b525f2bbb8be1189d7e7220.png'
    },
    {
        id: 6,
        labelUi: 'Large group',
        backendValue: 'large_group',
        image: 'https://media.rimigo.com/1762969189746_488b2d6479045e4195e59670ca6f6dde.png'
    }
]

export const GroupTypeQuestionPage: React.FC<GroupTypeQuestionPageProps> = ({
    onStepNext,
    deferredLogin = false,
    onDeferredSubmit,
    defaultGroupType,
    onBack
}) => {
    const currentStep = getLeadGenStepNumber('select-group-type') // This will return 1

    // Resolve initial selection from defaultGroupType prop
    const initialOption = defaultGroupType ? groupTypeOptions.find((o) => o.backendValue === defaultGroupType) : null
    const [selectedOptionId, setSelectedOptionId] = useState<number | null>(initialOption?.id ?? null)
    const [selectedServerValue, setSelectedServerValue] = useState<string | null>(initialOption?.backendValue ?? null)
    const [isNextButtonLoading, setIsNextButtonLoading] = useState(false)
    const { trackButtonClickCustom } = usePostHog()
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

    // Prepopulate selection if group_type is present in the response
    useEffect(() => {
        if (deferredLogin) return
        if (tripData?.data.group_type) {
            const existingGroupType = groupTypeOptions.find((option) => option.backendValue === tripData.data.group_type)
            if (existingGroupType) {
                setSelectedOptionId(existingGroupType.id)
                setSelectedServerValue(existingGroupType.backendValue)
            }
        }
    }, [tripData, deferredLogin])

    if (!deferredLogin && isTripDataError) {
        toast.error((tripDataError as Error).message || ERROR_MESSAGES.TRIP_DATA)

        // TODO: Error Page willl be shown here
        return <ErrorOnBoardingScreen />
    }

    const handleCardSelect = (id: number) => {
        const selectedOption = groupTypeOptions.find((option) => option.id === id)
        if (selectedOption) {
            setSelectedOptionId(id)
            setSelectedServerValue(selectedOption.backendValue as string)
        }
    }

    const handleNext = async () => {
        if (isNextButtonLoading) {
            return
        }
        setIsNextButtonLoading(true)
        trackButtonClickCustom?.({
            buttonPage: deferredLogin ? LEADGEN_V2_BUTTON_PAGE : 'lead_gen_v1',
            buttonName: 'Next',
            buttonAction: 'group_type_page_submit',
            extra: {
                group_type: selectedServerValue
            }
        })

        // Deferred login mode: store locally, skip API
        if (deferredLogin) {
            if (selectedServerValue) {
                onDeferredSubmit?.(selectedServerValue)
            }
            setIsNextButtonLoading(false)
            onStepNext()
            return
        }

        try {
            const trip_profile_id = tripData?.data.trip_profile_id
            if (!trip_profile_id) {
                throw new Error(ERROR_MESSAGES.TRIP_PROFILE_ID_REQUIRED)
            }
            const payload = {
                group_type: selectedServerValue,
                trip_profile_id: trip_profile_id
            }

            await updateTripProfilePartial(trip_profile_id, payload as UpdateTripProfileData)

            setIsNextButtonLoading(false)

            onStepNext()
        } catch (err) {
            toast.error((err as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        } finally {
            setIsNextButtonLoading(false)
        }
    }

    const isNextDisabled = selectedOptionId === null
    const showLoading = !deferredLogin && isTripDataLoading

    return (
        <TripQuestionBaseLayout
            currentStep={currentStep}
            title={PAGE_HEADER}
            description={PAGE_DESCRIPTION}
            onBack={onBack}
            dynamicContent={
                <>
                    <div className=" grid grid-cols-2   mx-auto justify-center gap-4">
                        {showLoading
                            ? Array.from({ length: 6 }).map((_, idx) => (
                                  <CustomShimmer
                                      key={idx}
                                      height={120}
                                      radius={16}
                                  />
                              ))
                            : groupTypeOptions.map((option) => (
                                  <PreferanceSquareCard
                                      key={option.id}
                                      imageSource={option.image}
                                      text={option.labelUi}
                                      isSelected={selectedOptionId === option.id}
                                      onPress={() => handleCardSelect(option.id)}
                                  />
                              ))}
                    </div>
                </>
            }
            showButton={!showLoading}
            buttonName="NEXT"
            buttonDisbale={isNextDisabled && !isNextButtonLoading}
            onNext={handleNext}
        />
    )
}
