import React, { useState, useEffect } from 'react'

import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getBasicTripData, GetBasicTripDataDataResponse } from '../api/onboardingAPI'
import { tripPreferenceActivityAPIAdapter } from '../adapters/tripPreferenceAPIAdapter'
import { updateTripPreferences } from '@/api/tripPreferencesAPI/tripPreferencesAPI'
import { TripQuestionBaseLayout } from '../components/TripQuestionBaseLayout'
import { PreferanceHorizontalCard } from '../components/PreferanceHorizontalCard'
import { getTripExperienceType } from '../api/experiencePreferenceAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import {
    getExperiencePreferencesWithFallback,
    ExperiencePreferenceUI,
    FALLBACK_EXPERIENCE_PREFERENCES
} from '../adapters/experiencePreferenceAdapters'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { toast } from 'sonner'
import CustomShimmer from '@/components/shared/Shimmer'
import { ErrorOnBoardingScreen } from '@/modules/ErrorScreen/pages/ErrorBoradingScreen'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

interface ExperiencePreferencePageProps {
    onStepNext: () => void
}
const PAGE_HEADER = 'What kind of activities interest you?'
const PAGE_DESCRIPTION = 'Pick what excites you. We’ll curate experiences that fit your interests and pace.'
export const ExperiencePreferencePage: React.FC<ExperiencePreferencePageProps> = ({ onStepNext }) => {
    const currentStep = 4

    const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([])
    const [expandedOptionId, setExpandedOptionId] = useState<number | null>(null)
    const [selectedServerValues, setSelectedServerValues] = useState<string[]>([])
    const { trip_id } = useParams<{ trip_id: string }>()
    const [isNextButtonLoading, setIsNextButtonLoading] = useState(false)

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

    // fetch experience preferences with fallback
    const { data: experiencePreferences, error: isExperiencePreferencesError } = useQuery<ExperiencePreferenceUI[]>({
        queryKey: ['experiencePreferences', trip_id],
        queryFn: () => {
            // Use fallback if multiple destination countries are selected
            if (tripData?.data.final_destination_countries && tripData.data.final_destination_countries.length > 1) {
                return Promise.resolve(FALLBACK_EXPERIENCE_PREFERENCES)
            }
            return getExperiencePreferencesWithFallback(() => getTripExperienceType(trip_id as string))
        },
        enabled: !!trip_id && !!tripData
    })

    // Prepopulate selection if experiences_preferences are present in the response
    useEffect(() => {
        if (tripData?.data.experiences_preferences && tripData.data.experiences_preferences.length > 0 && experiencePreferences) {
            const existingExperienceTypes = tripData.data.experiences_preferences.filter(Boolean) // Remove null/undefined values

            const matchingOptions = experiencePreferences.filter((option) => existingExperienceTypes.includes(option.backendValue))

            if (matchingOptions.length > 0) {
                const matchingIds = matchingOptions.map((option) => option.id)
                const matchingServerValues = matchingOptions.map((option) => option.backendValue)

                setSelectedOptionIds(matchingIds)
                setSelectedServerValues(matchingServerValues)
            }
        }
    }, [tripData, experiencePreferences])

    if (isExperiencePreferencesError || isTripDataError) {
        // TODO: Error Page will be shown here
        toast.error((isExperiencePreferencesError as Error).message || (tripDataError as Error).message || ERROR_MESSAGES.TRIP_DATA)
        return <ErrorOnBoardingScreen />
    }

    const handleCardSelect = (id: number) => {
        setExpandedOptionId((prev) => (prev === id ? null : id))
        setSelectedOptionIds((prev) => {
            const alreadySelected = prev.includes(id)
            const updatedIds = alreadySelected ? prev.filter((optionId) => optionId !== id) : [...prev, id]

            const updatedServerValues =
                experiencePreferences?.filter((option) => updatedIds.includes(option.id)).map((option) => option.backendValue) || []

            setSelectedServerValues(updatedServerValues)
            return updatedIds
        })
    }
    const { trackButtonClickCustom } = usePostHog()

    const isNextDisabled = selectedOptionIds.length === 0

    const handleNext = async () => {
        if (isNextButtonLoading) {
            return
        }
        setIsNextButtonLoading(true)
        trackButtonClickCustom?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'Next',
            buttonAction: 'activity_pref_page_submit',
            extra: {
                activity_prefs: selectedServerValues,
                count_of_prefs: selectedServerValues.length
            }
        })
        try {
            const trip_preferences_id = tripData?.data.trip_preferences_id
            if (!trip_preferences_id) {
                throw new Error(ERROR_MESSAGES.TRIP_DATA)
            }

            const payload = tripPreferenceActivityAPIAdapter(selectedServerValues)
            const data = await updateTripPreferences(trip_id as string, payload)

            if (data) {
                onStepNext()
            }
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
                <div className="flex flex-col gap-4 ">
                    {isTripDataLoading
                        ? Array.from({ length: 6 }).map((_, idx) => (
                              <CustomShimmer
                                  key={idx}
                                  height={85}
                                  radius={12}
                              />
                          ))
                        : experiencePreferences?.map((option) => (
                              <PreferanceHorizontalCard
                                  key={option.id}
                                  imageSrc={option.imageSrc}
                                  title={option.labelUi}
                                  description={option.description}
                                  type={option.type}
                                  selected={selectedOptionIds.includes(option.id)}
                                  expanded={expandedOptionId === option.id}
                                  onPress={() => handleCardSelect(option.id)}
                              />
                          ))}
                </div>
            }
            onNext={handleNext}
            showButton={!isNextButtonLoading}
            buttonName="Next"
            buttonDisbale={isNextDisabled && !isNextButtonLoading}
        />
    )
}
