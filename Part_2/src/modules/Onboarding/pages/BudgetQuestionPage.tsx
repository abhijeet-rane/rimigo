'use client'

import React, { useState, useEffect } from 'react'

import { BudgetSlider } from '../components/BudgetSlider'
import { motion, AnimatePresence } from 'framer-motion'
import { TripQuestionBaseLayout } from '../components/TripQuestionBaseLayout'
import Typography from '@/components/shared/Typography'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getBasicTripData, GetBasicTripDataDataResponse } from '../api/onboardingAPI'
import { UpdateTripProfileData, updateTripProfilePartial } from '@/api/tripProfileAPI/tripProfileAPI'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { toast } from 'sonner'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import CustomShimmer from '@/components/shared/Shimmer'
import { ErrorOnBoardingScreen } from '@/modules/ErrorScreen/pages/ErrorBoradingScreen'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
interface BudgetQuestionPageProps {
    onStepNext: () => void
}

const budgetOptions = [
    {
        id: 0,
        labelUi: 'Pocket friendly',
        backendValue: 'low',
        description: 'Smart choices that keep costs low and value high.',
        image: 'https://media.rimigo.com/1764778090062_5ae4267a9465536cbf3877072bb65037.png'
    },
    {
        id: 1,
        labelUi: 'Balanced Spend',
        backendValue: 'balanced',
        description: 'A comfortable mix of affordability and a few extras.',
        image: 'https://media.rimigo.com/1764778087129_df9140663e8651689329d962c3b6b497.png'
    },
    {
        id: 2,
        labelUi: 'Premium Escape',
        backendValue: 'premium',
        description: 'Top-tier stays and experiences without compromise.',
        image: 'https://media.rimigo.com/1764778088763_3342e12de68b5574a3e4b07a9421d975.png'
    }
]
const PAGE_HEADER = 'What kind of budget are you looking at?'
const PAGE_DESCRIPTION = 'This will help us fine‑tune stays, activities, and routes. Providing great value at every step.'
export const BudgetQuestionPage: React.FC<BudgetQuestionPageProps> = ({ onStepNext }) => {
    const currentStep = 6
    const [sliderIndex, setSliderIndex] = useState(0)
    const [isNextButtonLoading, setIsNextButtonLoading] = useState(false)

    const { trip_id } = useParams<{ trip_id: string }>()

    const {
        data: tripData,
        isLoading: isTripDataLoading,
        error: isTripDataError
    } = useQuery<GetBasicTripDataDataResponse>({
        queryKey: ['basicTripData', trip_id],
        queryFn: () => getBasicTripData(trip_id as string),
        enabled: !!trip_id,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Prepopulate selection if budget_range is present in the response
    useEffect(() => {
        if (tripData?.data.budget_range) {
            const existingBudgetOption = budgetOptions.find((option) => option.backendValue === tripData.data.budget_range)
            if (existingBudgetOption) {
                setSliderIndex(existingBudgetOption.id)
            }
        }
    }, [tripData])

    if (isTripDataError) {
        toast.error((isTripDataError as Error).message || ERROR_MESSAGES.TRIP_DATA)
        return <ErrorOnBoardingScreen />
    }

    const selectedOption = budgetOptions[sliderIndex]
    const { trackButtonClickCustom } = usePostHog()
    const handleNext = async () => {
        if (isNextButtonLoading) {
            return
        }
        setIsNextButtonLoading(true)
        trackButtonClickCustom?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'Next',
            buttonAction: 'budget_page_submit',
            extra: {
                budget: selectedOption.backendValue
            }
        })
        try {
            if (!tripData?.data.trip_profile_id) {
                throw new Error(ERROR_MESSAGES.TRIP_PROFILE_ID_REQUIRED)
            }
            const trip_profile_id = tripData?.data.trip_profile_id
            if (!trip_profile_id) {
                throw new Error(ERROR_MESSAGES.TRIP_PROFILE_ID_REQUIRED)
            }

            const payload = {
                budget_range: selectedOption.backendValue
            }
            await updateTripProfilePartial(trip_profile_id as string, payload as UpdateTripProfileData)

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
            showButton={true}
            buttonDisbale={false}
            onNext={handleNext}
            dynamicContent={
                isTripDataLoading ? (
                    <div className="flex flex-col items-center w-full  space-y-6 py-20">
                        <CustomShimmer
                            height={200}
                            radius={16}
                        />
                        <CustomShimmer
                            height={20}
                            radius={8}
                        />
                    </div>
                ) : (
                    <div
                        className="flex flex-col items-center w-full space-y-[clamp(0px,2vh,24px)]
">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedOption.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4 }}
                                className="
  flex flex-col items-center gap-3 w-full
  py-[clamp(2px,1vh,40px)]
">
                                {' '}
                                <img
                                    src={selectedOption.image}
                                    alt={selectedOption.labelUi}
                                    className="h-24 w-24 object-contain"
                                />
                                <div className="flex flex-col items-center gap-1 px-2 text-center">
                                    <Typography
                                        family="redhat"
                                        weight="bold"
                                        size="20"
                                        lineHeight="28px"
                                        color="grey-0"
                                        textAlign="center">
                                        {selectedOption.labelUi}
                                    </Typography>
                                    <div className="flex items-center w-[80%]">
                                        <Typography
                                            family="manrope"
                                            lineHeight="20px"
                                            weight="medium"
                                            size="14"
                                            color="grey-2"
                                            textAlign="center">
                                            {selectedOption.description}
                                        </Typography>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        <div className="w-full">
                            <BudgetSlider
                                initialValue={sliderIndex}
                                onValueChange={(index: number) => setSliderIndex(index)}
                            />
                        </div>
                    </div>
                )
            }
        />
    )
}
