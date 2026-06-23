import React, { useState, useEffect } from 'react'
import { TripQuestionBaseLayout } from '../components/TripQuestionBaseLayout'
import { StatusQuestionItem } from '../components/StatusQuestionItem'
import { useQuery } from '@tanstack/react-query'
import { getBasicTripData, GetBasicTripDataDataResponse, getDestionationStatus } from '../api/onboardingAPI'
import { useNavigate, useParams } from 'react-router-dom'
import { UpdateTripProfileData, updateTripProfilePartial } from '@/api/tripProfileAPI/tripProfileAPI'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { toast } from 'sonner'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { DEFAULT_LANDING_PAGE_ROUTE, DEFAULT_TRIP_CREATION_LOADER_ROUTE } from '@/routes/routes'
import { LeadGenStorage } from '../storage/leadGenStorage'
import CustomShimmer from '@/components/shared/Shimmer'
import { ErrorOnBoardingScreen } from '@/modules/ErrorScreen/pages/ErrorBoradingScreen'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { getLeadGenStepNumber } from '../utils/stepUtils'
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics'
import { GA_EVENTS, GA_EVENT_CATEGORIES } from '@/constants/googleAnalytics'
import { useUserInfo } from '@/hooks/useUserInfo'
import { LEADGEN_V2_BUTTON_PAGE } from '@/constants/posthogEvents'

interface TravelerIntentIntent {
    planning_start_preference: string | null
    booked_items: string[] | null
}

interface TravelerIntentQuestionPageProps {
    onStepNext: () => void
    /** When true, skip API calls (login happens later) */
    deferredLogin?: boolean
    /** Called with the intent data when deferredLogin is true */
    onDeferredSubmit?: (intent: TravelerIntentIntent) => void
    /** Pre-selected intent (used to restore state) */
    defaultIntent?: TravelerIntentIntent | null
    /** Custom back button handler */
    onBack?: () => void
}

interface QuestionItem {
    id: string
    questionUi: string
    questionServer: string
    subText?: string
    answers: { labelUi: string; backendValue: string }[]
    multiSelect: boolean
    optional?: boolean
}

/*
  const planningPreferenceOptions = [
    { value: "immediately", label: "Immediately" },
    { value: "soon", label: "Soon" },
    { value: "later", label: "Later" },
  ];
*/

export const statusQuestions: QuestionItem[] = [
    {
        id: 'q1',
        questionUi: 'When would you like to start planning?',
        questionServer: 'planning_start_preference',
        subText: 'Please select one',
        multiSelect: false,
        answers: [
            { labelUi: 'Immediately', backendValue: 'immediately' },
            { labelUi: 'Later, not urgent', backendValue: 'later' }
        ]
    },
    {
        id: 'q2',
        questionUi: 'Have you booked any of the following?',
        questionServer: 'booked_items',
        subText: 'Select all that apply',
        multiSelect: true,
        answers: [
            { labelUi: 'Flights', backendValue: 'flight' },
            { labelUi: 'Hotels', backendValue: 'hotel' },
            { labelUi: 'Activities', backendValue: 'experience' },
            { labelUi: 'Transportation', backendValue: 'transport' }
        ],
        optional: true
    }
]
const PAGE_HEADER = 'Finally, tell us your status'
const PAGE_DESCRIPTION = 'This will help us improve our recommendations for you.'
export const TravelerIntentQuestionPage: React.FC<TravelerIntentQuestionPageProps> = ({
    onStepNext,
    deferredLogin = false,
    onDeferredSubmit,
    defaultIntent,
    onBack
}) => {
    const currentStep = getLeadGenStepNumber('select-status') // This will return 3

    // Resolve initial selection from defaultIntent prop
    const initialAnswers: Record<string, string[]> = {}
    const initialUiAnswers: Record<string, string[]> = {}
    if (defaultIntent) {
        if (defaultIntent.planning_start_preference) {
            const q = statusQuestions.find((q) => q.questionServer === 'planning_start_preference')
            if (q) {
                const match = q.answers.find((a) => a.backendValue === defaultIntent.planning_start_preference)
                if (match) {
                    initialAnswers[q.id] = [match.backendValue]
                    initialUiAnswers[q.id] = [match.labelUi]
                }
            }
        }
        if (defaultIntent.booked_items?.length) {
            const q = statusQuestions.find((q) => q.questionServer === 'booked_items')
            if (q) {
                const uiLabels = defaultIntent.booked_items
                    .map((bv) => q.answers.find((a) => a.backendValue === bv)?.labelUi)
                    .filter(Boolean) as string[]
                if (uiLabels.length) {
                    initialAnswers[q.id] = defaultIntent.booked_items
                    initialUiAnswers[q.id] = uiLabels
                }
            }
        }
    }

    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>(initialAnswers)
    const [selectedUiAnswers, setSelectedUiAnswers] = useState<Record<string, string[]>>(initialUiAnswers)
    const [isNextButtonLoading, setIsNextButtonLoading] = useState(false)
    const navigate = useNavigate()
    const { trip_id } = useParams<{ trip_id: string }>()

    const {
        data: tripData,
        isLoading: isTripDataLoading,
        error: isTripDataError
    } = useQuery<GetBasicTripDataDataResponse>({
        queryKey: ['basicTripData', trip_id],
        queryFn: () => getBasicTripData(trip_id as string),
        enabled: !deferredLogin && !!trip_id,
        staleTime: HOURS_24,
        gcTime: HOURS_24,
        refetchOnMount: 'always'
    })

    if (!deferredLogin && isTripDataError) {
        toast.error((isTripDataError as Error).message || ERROR_MESSAGES.TRIP_DATA)
        return <ErrorOnBoardingScreen />
    }

    const {
        data: destinationStatusData,
        isLoading: isDestinationStatusLoading,
        error: isDestinationStatusError
    } = useQuery({
        queryKey: ['destinationStatus', trip_id],
        queryFn: () => getDestionationStatus(trip_id as string),
        enabled: !deferredLogin && !!trip_id,
        refetchOnWindowFocus: true
    })

    if (!isDestinationStatusLoading && !isDestinationStatusError) {
        // Destination status data is available
    }

    // Prepopulate selection if traveler_intent is present in the response
    useEffect(() => {
        if (deferredLogin) return
        if (tripData?.data.traveler_intent) {
            const travelerIntent = tripData.data.traveler_intent
            const prepopulatedUiAnswers: Record<string, string[]> = {}
            const prepopulatedBackendAnswers: Record<string, string[]> = {}

            // Prepopulate planning_start_preference (single select)
            if (travelerIntent.planning_start_preference) {
                const planningQuestion = statusQuestions.find((q) => q.questionServer === 'planning_start_preference')
                if (planningQuestion) {
                    const matchingAnswer = planningQuestion.answers.find((answer) => answer.backendValue === travelerIntent.planning_start_preference)
                    if (matchingAnswer) {
                        prepopulatedUiAnswers[planningQuestion.id] = [matchingAnswer.labelUi]
                        prepopulatedBackendAnswers[planningQuestion.id] = [matchingAnswer.backendValue]
                    }
                }
            }

            // Prepopulate booked_items (multi select)
            if (travelerIntent.booked_items && travelerIntent.booked_items.length > 0) {
                const bookedItemsQuestion = statusQuestions.find((q) => q.questionServer === 'booked_items')
                if (bookedItemsQuestion) {
                    const matchingUiAnswers = travelerIntent.booked_items
                        .map((backendValue) => {
                            const matchingAnswer = bookedItemsQuestion.answers.find((answer) => answer.backendValue === backendValue)
                            return matchingAnswer ? matchingAnswer.labelUi : null
                        })
                        .filter(Boolean) as string[]

                    if (matchingUiAnswers.length > 0) {
                        prepopulatedUiAnswers[bookedItemsQuestion.id] = matchingUiAnswers
                        prepopulatedBackendAnswers[bookedItemsQuestion.id] = travelerIntent.booked_items
                    }
                }
            }

            // Set the prepopulated answers if any were found
            if (Object.keys(prepopulatedUiAnswers).length > 0) {
                setSelectedUiAnswers(prepopulatedUiAnswers)
                setSelectedAnswers(prepopulatedBackendAnswers)
            }
        }
    }, [tripData, deferredLogin])

    const handleSelectionChange = (id: string, selectedUiValues: string[]) => {
        const question = statusQuestions.find((q) => q.id === id)
        if (!question) return

        const mappedServerValues = selectedUiValues.map((uiVal) => {
            const match = question.answers.find((a) => a.labelUi === uiVal)
            return match ? match.backendValue : uiVal
        })

        setSelectedUiAnswers((prev) => ({ ...prev, [id]: selectedUiValues }))
        setSelectedAnswers((prev) => ({ ...prev, [id]: mappedServerValues }))
    }


    const showLoading = !deferredLogin && isTripDataLoading
    const isNextButtonDisabled =
        showLoading || statusQuestions.some((q) => !q.optional && (!selectedAnswers[q.id] || selectedAnswers[q.id].length === 0))
    const { trackButtonClickCustom } = usePostHog()
    const { trackGoogleEvent } = useGoogleAnalytics()
    const { user } = useUserInfo()
    const handleNext = async () => {
        if (isNextButtonLoading) {
            return
        }
        setIsNextButtonLoading(true)
        const submittedAnswers = statusQuestions.reduce(
            (acc, q) => {
                acc[q.questionServer] = q.multiSelect ? selectedAnswers[q.id] || [] : selectedAnswers[q.id]?.[0] || null
                return acc
            },
            {} as Record<string, string | string[] | null>
        )

        // Track custom analytics event
        trackButtonClickCustom?.({
            buttonPage: deferredLogin ? LEADGEN_V2_BUTTON_PAGE : 'lead_gen_v1',
            buttonName: 'Finish',
            buttonAction: 'traveler_intent_question_page_submit',
            extra: {
                questions: submittedAnswers
            }
        })

        // Deferred login mode: store locally, skip API
        if (deferredLogin) {
            onDeferredSubmit?.({
                planning_start_preference: submittedAnswers.planning_start_preference as string | null,
                booked_items: (submittedAnswers.booked_items as string[] | null) ?? null
            })
            setIsNextButtonLoading(false)
            onStepNext()
            return
        }

        try {
            const trip_profile_id = tripData?.data.trip_profile_id
            if (!trip_profile_id) {
                throw new Error(ERROR_MESSAGES.TRIP_PROFILE_ID_REQUIRED)
            }

            const submittedAnswers = statusQuestions.reduce(
                (acc, q) => {
                    acc[q.questionServer] = q.multiSelect ? selectedAnswers[q.id] || [] : selectedAnswers[q.id]?.[0] || null
                    return acc
                },
                {} as Record<string, string | string[] | null>
            )

            const payload: UpdateTripProfileData = {
                trip_profile_id: trip_profile_id,
                traveler_preferences: {
                    planning_start_preference: submittedAnswers.planning_start_preference as string,
                    booked_items: submittedAnswers.booked_items as string[] | null | undefined
                }
            }

            await updateTripProfilePartial(trip_profile_id as string, payload)
            setIsNextButtonLoading(false)

            // Track in Google Analytics after successful submission
            const searchParams = new URLSearchParams(location.search)
            const utmSource = searchParams.get('utm_source') || ''

            trackGoogleEvent(GA_EVENTS.LEADGEN_COMPLETE, {
                event_category: GA_EVENT_CATEGORIES.ONBOARDING,
                event_label: submittedAnswers.planning_start_preference as string || null,
                traveler_id: user?.id || null,
                trip_id: trip_id || null,
                trip_profile_id: trip_profile_id || null,
                all_destinations_live: destinationStatusData?.data.all_live || false,
                ...(utmSource ? { utm_source: utmSource } : {})
            })

            // clear the storage
            LeadGenStorage.removeLeadGenData()
            trackButtonClickCustom?.({
                buttonPage: deferredLogin ? LEADGEN_V2_BUTTON_PAGE : 'lead_gen_v1',
                buttonName: 'end',
                buttonAction: 'lead_gen_flow_end',
                extra: {
                    source: utmSource
                }
            })
            if (destinationStatusData?.data.all_live == true) {
                navigate(DEFAULT_TRIP_CREATION_LOADER_ROUTE + `?redirectTo=${DEFAULT_LANDING_PAGE_ROUTE}`, { replace: true })
                return
            }

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
            onBack={onBack}
            buttonName="Load my trip "
            showButton={true}
            buttonDisbale={isNextButtonDisabled}
            buttonVariant="primary"
            onNext={handleNext}
            dynamicContent={
                showLoading ? (
                    <div className="flex flex-col space-y-6">
                        {statusQuestions.map((question) => (
                            <div
                                key={question.id}
                                className="flex flex-col space-y-2">
                                <CustomShimmer
                                    height={24}
                                    radius={8}
                                    className="w-[60%]"
                                />{' '}
                                {/* Question text */}
                                <CustomShimmer
                                    height={16}
                                    radius={6}
                                    className="w-[40%]"
                                />{' '}
                                {/* Subtext */}
                                <div className=" grid grid-cols-2 gap-2 mt-2">
                                    {question.answers.map((_, idx) => (
                                        <CustomShimmer
                                            key={idx}
                                            height={40}
                                            radius={12}
                                            className="w-[45%]"
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col space-y-8 mt-8 md:mt-10">
                        {statusQuestions.map((question) => (
                            <StatusQuestionItem
                                key={question.id}
                                question={question.questionUi}
                                subText={question.subText}
                                answers={question.answers.map((a) => a.labelUi)}
                                multiSelect={question.multiSelect}
                                initialSelected={selectedUiAnswers[question.id] || []}
                                onSelectionChange={(selected) => handleSelectionChange(question.id, selected)}
                            />
                        ))}
                    </div>
                )
            }
        />
    )
}
