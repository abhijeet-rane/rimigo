import React, { useState, useEffect } from 'react'
import { TripQuestionBaseLayout } from '../components/TripQuestionBaseLayout'
import { PreferanceSquareCard } from '../components/PreferanceSquareCard'
import { useQuery } from '@tanstack/react-query'
import { getBasicTripData, GetBasicTripDataDataResponse } from '../api/onboardingAPI'
import { useParams } from 'react-router-dom'
import { UpdateTripPreferenceRequest, updateTripPreferences } from '@/api/tripPreferencesAPI/tripPreferencesAPI'
import { tripPreferenceAccommodationAPIAdapter } from '../adapters/tripPreferenceAPIAdapter'
import { toast } from 'sonner'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import CustomShimmer from '@/components/shared/Shimmer'
import { ErrorOnBoardingScreen } from '@/modules/ErrorScreen/pages/ErrorBoradingScreen'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

// 'hostel',
// 'apartment', # new added
// 'hotel',
// 'five_star_hotel',
// 'budget_hotel',
// 'unique_stays',

const accommodationOptions = [
    { id: 1, labelUi: 'Hotels', valueServer: 'hotel', image: 'https://media.rimigo.com/1762969381503_979b383adae45bd59fd46549d77bc008.png' },
    { id: 2, labelUi: 'Apartments', valueServer: 'apartment', image: 'https://media.rimigo.com/1762969408875_510e3418ed645cb39ef86268f055ecf3.png' },
    { id: 3, labelUi: 'Hostels', valueServer: 'hostel', image: 'https://media.rimigo.com/1762969437181_776c5421023659febad0f8c947abc3a5.png' },
    {
        id: 4,
        labelUi: 'Premium Hotels',
        valueServer: 'five_star_hotel',
        image: 'https://media.rimigo.com/1762969457412_348843ce12b55fd983ca4b947c1bc3be.png'
    },
    {
        id: 5,
        labelUi: 'Budget Hotels',
        valueServer: 'budget_hotel',
        image: 'https://media.rimigo.com/1762969475097_db0d7a1b3ef35b0a90e69129041aaaa5.png'
    },
    {
        id: 6,
        labelUi: 'Unique Stays',
        valueServer: 'unique_stays',
        image: 'https://media.rimigo.com/1762969493399_edf6adf4c9f2548092ccc247119db364.png'
    }
]

const PAGE_HEADER = 'What kind of accommodation would you prefer?'
const PAGE_DESCRIPTION = 'Whatever you prefer, we’ll balance comfort, location, and price.'

interface AccommodationQuestionPageProps {
    onStepNext: () => void
}

export const AccommodationQuestionPage: React.FC<AccommodationQuestionPageProps> = ({ onStepNext }) => {
    const currentStep = 3

    const { trip_id } = useParams<{ trip_id: string }>()

    const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([])
    const [selectedServerValues, setSelectedServerValues] = useState<string[]>([])
    const [isNextButtonLoading, setIsNextButtonLoading] = useState(false)
    const { trackButtonClickCustom } = usePostHog()

    const {
        data: tripData,
        isLoading: isTripDataLoading,
        isError: isTripDataError,
        error: tripDataError
    } = useQuery<GetBasicTripDataDataResponse>({
        queryKey: ['basicTripData', trip_id],
        queryFn: () => getBasicTripData(trip_id as string),
        enabled: !!trip_id,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Prepopulate selection if accommodation_preferences are present in the response
    useEffect(() => {
        if (tripData?.data.accommodation_preferences && tripData.data.accommodation_preferences.length > 0) {
            const existingAccommodationTypes = tripData.data.accommodation_preferences.map((pref) => pref.primary_type).filter(Boolean) // Remove null/undefined values

            const matchingOptions = accommodationOptions.filter((option) => existingAccommodationTypes.includes(option.valueServer))

            if (matchingOptions.length > 0) {
                const matchingIds = matchingOptions.map((option) => option.id)
                const matchingServerValues = matchingOptions.map((option) => option.valueServer)

                setSelectedOptionIds(matchingIds)
                setSelectedServerValues(matchingServerValues)
            }
        }
    }, [tripData])

    if (isTripDataError) {
        toast.error((tripDataError as Error).message || ERROR_MESSAGES.TRIP_DATA)

        // TODO: Error Page will be shown here
        return <ErrorOnBoardingScreen />
    }

    const handleCardSelect = (id: number) => {
        setSelectedOptionIds((prev) => {
            const alreadySelected = prev.includes(id)
            const updatedIds = alreadySelected ? prev.filter((optionId) => optionId !== id) : [...prev, id]

            const updatedServerValues = accommodationOptions.filter((option) => updatedIds.includes(option.id)).map((option) => option.valueServer)

            setSelectedServerValues(updatedServerValues)
            return updatedIds
        })
    }

    const isNextDisabled = selectedOptionIds.length === 0

    const handleNext = async () => {
        if (isNextButtonLoading) {
            return
        }
        setIsNextButtonLoading(true)
        trackButtonClickCustom?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'Next',
            buttonAction: 'accommodation_pref_page_submit',
            extra: {
                accommodation_prefs: selectedServerValues,
                count_of_prefs: selectedServerValues.length
            }
        })
        try {
            const trip_preferences_id = tripData?.data.trip_preferences_id
            if (!trip_preferences_id) {
                throw new Error(ERROR_MESSAGES.TRIP_DATA)
            }
            const payload = tripPreferenceAccommodationAPIAdapter(selectedServerValues)
            await updateTripPreferences(trip_id as string, payload as UpdateTripPreferenceRequest)
            setIsNextButtonLoading(false)
            onStepNext()
        } catch (err) {
            toast.error((err as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        } finally {
            setIsNextButtonLoading(false)
        }
    }
    return (
        <TripQuestionBaseLayout
            currentStep={currentStep}
            title={PAGE_HEADER}
            description={PAGE_DESCRIPTION}
            dynamicContent={
                <div className=" grid grid-cols-2 justify-center gap-4">
                    {isTripDataLoading
                        ? Array.from({ length: 6 }).map((_, idx) => (
                              <CustomShimmer
                                  key={idx}
                                  height={120}
                                  radius={16}
                              />
                          ))
                        : accommodationOptions.map((option) => (
                              <PreferanceSquareCard
                                  key={option.id}
                                  imageSource={option.image}
                                  text={option.labelUi}
                                  isSelected={selectedOptionIds.includes(option.id)}
                                  onPress={() => handleCardSelect(option.id)}
                              />
                          ))}
                </div>
            }
            onNext={handleNext}
            showButton={!isNextButtonLoading}
            buttonName="Next"
            buttonDisbale={isNextDisabled}
        />
    )
}
