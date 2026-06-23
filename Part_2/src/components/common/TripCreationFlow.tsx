import React, { useMemo, useState } from 'react'
import TripQuestionModal from '@/components/common/TripQuestionModal'
import TripCountryMismatchStep from './trip-preferences-steps/TripCountryMismatchStep'
import TripPreferenceDestinationStep, { TripPreferenceDestinationResult } from './trip-preferences-steps/TripPreferenceDestinationStep'
import TripPreferenceGroupTypeStep, { TripPreferenceGroupTypeResult } from './trip-preferences-steps/TripPreferenceGroupTypeStep'
import TripPreferencePurposeStep, {
    TripPreferencePurposeInitialData,
    TripPreferencePurposeResult
} from './trip-preferences-steps/TripPreferencePurposeStep'
import { createBasicTrip, CreateBasicTripPayload } from '@/modules/Onboarding/api/onboardingAPI'
import { updateTripProfilePartial, UpdateTripProfileData } from '@/api/tripProfileAPI/tripProfileAPI'
import { toast } from 'sonner'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { useQueryClient } from '@tanstack/react-query'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { setActiveTrip } from '@/pages/Landing/api/travelerTrips'

interface TripCreationFlowProps {
    isOpen: boolean
    onClose: () => void
    anchorRect?: DOMRect | null
    onSuccess?: () => void
    countryMismatchInfo?: { countryId: string; countryName: string } | null
    navigateOnSuccess?: string;
}

type StepType = 'countryMismatch' | 'destination' | 'groupType' | 'purpose'

const TripCreationFlow = ({ isOpen, onClose, anchorRect, onSuccess, countryMismatchInfo ,navigateOnSuccess }: TripCreationFlowProps) => {
    const queryClient = useQueryClient()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip

    // Determine initial step: if countryMismatchInfo is provided, start with countryMismatch step
    const initialStep: StepType = countryMismatchInfo ? 'countryMismatch' : 'destination'
    const [currentStep, setCurrentStep] = useState<StepType>(initialStep)
    const [isCreating, setIsCreating] = useState(false)
    // Track if flow started from countryMismatch - if so, hide close button throughout
    const [startedFromCountryMismatch, setStartedFromCountryMismatch] = useState(!!countryMismatchInfo)

    // Collected data from each step
    const [destinationData, setDestinationData] = useState<TripPreferenceDestinationResult | null>(null)
    const [groupTypeData, setGroupTypeData] = useState<TripPreferenceGroupTypeResult | null>(null)
    const [purposeData, setPurposeData] = useState<TripPreferencePurposeResult | null>(null)
    const { trackButtonClickCustom } = usePostHog()

    const handleDestinationNext = (result: TripPreferenceDestinationResult) => {
        trackEvent?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'start_planning',
            buttonAction: 'choose_destination_name_submit',
            extra: { destination_name: result.countries }
        })
        setDestinationData(result)
        setCurrentStep('groupType')
    }
    const trackEvent = (event: { buttonPage: string; buttonName: string; buttonAction: string; extra?: Record<string, unknown> }) => {
        trackButtonClickCustom?.({
            ...event,
            extra: {
                trigger_location: 'sidebar',
                ...(event.extra || {})
            }
        })
    }

    const handleGroupTypeNext = (result: TripPreferenceGroupTypeResult) => {
        trackEvent?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'Next',
            buttonAction: 'group_type_page_submit',
            extra: { group_type: result.groupType }
        })
        setGroupTypeData(result)
        setCurrentStep('purpose')
    }

    const handlePurposeComplete = async (result: TripPreferencePurposeResult) => {
        trackEvent?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'Finish',
            buttonAction: 'trip_purpose_page_submit',
            extra: { purpose: result.travelPurpose }
        })

        try {
            const userInfo = await TokenStorage.getUserInfo()
            if (!userInfo?.traveler_id) {
                toast.error('User not authenticated')
                return
            }

            if (!destinationData || !groupTypeData) {
                toast.error('Please complete all previous steps')
                return
            }

            setIsCreating(true)

            // Step 1: Create the basic trip with destinations
            const createTripPayload: CreateBasicTripPayload = {
                final_destination_countries: destinationData.countries,
                destination_finalized: true,
                trip_source: 'web_app'
            }

            const createResponse = await createBasicTrip(userInfo.traveler_id, createTripPayload)
            const tripId = createResponse.data.trip_id
            const tripProfileId = createResponse.data.trip_profile_id

            // Step 2: Update trip profile with group type and purpose
            const tripProfilePayload: UpdateTripProfileData = {
                group_type: groupTypeData.groupType,
                travel_purpose: result.travelPurpose,
                preferred_travel_time: result.preferredTravelTime ? {
                    is_fixed: false,
                    startDate: result.preferredTravelTime.startDate || '',
                    endDate: result.preferredTravelTime.endDate || '',
                    year: result.preferredTravelTime.year || null,
                    months: result.preferredTravelTime.months || null
                } : undefined
            }

            await updateTripProfilePartial(tripProfileId, tripProfilePayload)

            // Invalidate and refetch traveler trips so the new trip appears in context
            await queryClient.invalidateQueries({ queryKey: ['travelerTrips', userInfo.traveler_id] })
            await queryClient.refetchQueries({ queryKey: ['travelerTrips', userInfo.traveler_id] })

            // Clear country_id and country_name from URL params before setting active trip
            // This prevents country mismatch issues when the new trip has different countries
            // The page will refresh after updateActiveTrip, so we need to clear params now
            if (typeof window !== 'undefined') {
                const url = new URL(window.location.href)
                url.searchParams.delete('country_id')
                url.searchParams.delete('country_name')
                url.searchParams.delete('checkCountryMismatch')
                window.history.replaceState(null, '', url.toString())
            }

            // Mark the newly created trip as active
            if (travelerTripsContext?.updateActiveTrip) {
                // Use context method if available (when within TravelerTripsProvider)
                await travelerTripsContext.updateActiveTrip(tripId, { force: true, navigateTo: navigateOnSuccess })
            } else {
                // Fallback: directly call API and refresh page (when not within TravelerTripsProvider, e.g., LandingPage)
                try {
                    await setActiveTrip(tripId)
                    // Refresh the page to load the new active trip
                    const { pathname, hash, origin } = window.location
                    const cleanUrl = navigateOnSuccess || `${pathname}${hash ?? ''}`
                    window.location.replace(`${origin}${cleanUrl}`)
                } catch (error) {

                    toast.error(`Failed to set active trip. Please refresh the page. ${error instanceof Error ? error.message : 'Unknown error'}`)
                    // Still close the modal and call onSuccess
                    onClose()
                    onSuccess?.()
                    return
                }
            }
            trackEvent?.({
                buttonPage: 'lead_gen_v1',
                buttonName: 'end',
                buttonAction: 'lead_gen_flow_end'
            })

            toast.success('Trip created successfully!')
            onClose()
            onSuccess?.()
        } catch (error) {
            toast.error(`Failed to create trip: ${error instanceof Error ? error.message : 'Unknown error'}`)
        } finally {
            setIsCreating(false)
        }
    }

    // Reset step when countryMismatchInfo changes or modal opens
    React.useEffect(() => {
        if (!isOpen) return

        if (countryMismatchInfo) {
            setCurrentStep('countryMismatch')
            setStartedFromCountryMismatch(true)
        } else {
            setCurrentStep('destination')
            setStartedFromCountryMismatch(false)
        }
    }, [countryMismatchInfo, isOpen])

    // Handle switching to a trip that contains the country
    const handleSwitchTrip = async (tripId: string) => {
        if (!travelerTripsContext?.updateActiveTrip) return
        try {
            await travelerTripsContext.updateActiveTrip(tripId, { replaceOnly: true })
            onClose()
            onSuccess?.()
        } catch (error) {
            toast.error(`Failed to switch trip: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    // Handle adding country to current trip
    const handleAddToCurrentTrip = async () => {
        if (!activeTrip?.trip_id || !countryMismatchInfo || !travelerTripsContext?.updateTripDestinations) return

        const existingCountryIds = activeTrip.final_destination_countries?.map((c) => c.id) || []
        const updatedCountryIds = [...existingCountryIds, countryMismatchInfo.countryId]

        try {
            await travelerTripsContext.updateTripDestinations({
                final_destination_countries: updatedCountryIds
            })
            onClose()
            onSuccess?.()
        } catch (error) {
            toast.error(`Failed to add country to trip: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    // Handle creating new trip (proceed to destination step with country preselected)
    const handleCreateNewTrip = () => {
        trackButtonClickCustom?.({
            buttonPage: 'trip_creation_modal',
            buttonName: 'create_new_trip',
            buttonAction: 'click',
            extra: {
                mismatchedCountryId: countryMismatchInfo?.countryId ,
                mismatchedCountryName: countryMismatchInfo?.countryName,
                sourceScreen: 'trip_country_mismatch_step'
            }
        })
        if (!countryMismatchInfo) {
            setCurrentStep('destination')
            return
        }

        // Pre-select the country in destination data
        setDestinationData({
            countries: [countryMismatchInfo.countryId]
        })
        setCurrentStep('destination')
        // Keep startedFromCountryMismatch true since we started from mismatch step
    }

    const handleClose = () => {
        // Reset state when closing
        const resetStep: StepType = countryMismatchInfo ? 'countryMismatch' : 'destination'
        setCurrentStep(resetStep)
        setDestinationData(null)
        setGroupTypeData(null)
        setPurposeData(null)
        setStartedFromCountryMismatch(!!countryMismatchInfo)
        onClose()
    }

    const purposeInitialData = useMemo<TripPreferencePurposeInitialData | undefined>(() => {
        if (purposeData) {
            return {
                travelPurpose: purposeData.travelPurpose,
                preferredTravelTime: purposeData.preferredTravelTime
            }
        }

        return undefined
    }, [purposeData])

    if (!isOpen) return null

    const getStepNumber = (step: StepType): number => {
        // If we have countryMismatchInfo, include it in the step count
        if (countryMismatchInfo) {
            const steps: StepType[] = ['countryMismatch', 'destination', 'groupType', 'purpose']
            return steps.indexOf(step) + 1
        } else {
            const steps: StepType[] = ['destination', 'groupType', 'purpose']
            return steps.indexOf(step) + 1
        }
    }

    const getTotalSteps = (): number => {
        return countryMismatchInfo ? 4 : 3
    }

    const modalWidth = 390
    const isCentered = !anchorRect || currentStep === 'countryMismatch'

    return (
        <TripQuestionModal
            isOpen={true}
            onClose={handleClose}
            anchorRect={anchorRect}
            width={modalWidth}
            centered={isCentered}>
            {currentStep === 'countryMismatch' && countryMismatchInfo && (
                <TripCountryMismatchStep
                    countryId={countryMismatchInfo.countryId}
                    countryName={countryMismatchInfo.countryName}
                    onSwitchTrip={handleSwitchTrip}
                    onAddToCurrentTrip={handleAddToCurrentTrip}
                    onCreateNewTrip={handleCreateNewTrip}
                    currentStep={getStepNumber('countryMismatch')}
                    totalSteps={getTotalSteps()}
                />
            )}
            {currentStep === 'destination' && (
                <TripPreferenceDestinationStep
                    flowType="create"
                    onNextStep={handleDestinationNext}
                    onClose={startedFromCountryMismatch ? undefined : handleClose}
                    currentStep={getStepNumber('destination')}
                    totalSteps={getTotalSteps()}
                    initialCountries={countryMismatchInfo ? [{ id: countryMismatchInfo.countryId, name: countryMismatchInfo.countryName }] : undefined}
                />
            )}
            {currentStep === 'groupType' && (
                <TripPreferenceGroupTypeStep
                    flowType="create"
                    initialData={groupTypeData || undefined}
                    onNextStep={handleGroupTypeNext}
                    onClose={startedFromCountryMismatch ? undefined : handleClose}
                    currentStep={getStepNumber('groupType')}
                    totalSteps={getTotalSteps()}
                />
            )}
            {currentStep === 'purpose' && (
                <TripPreferencePurposeStep
                    flowType="create"
                    initialData={purposeInitialData}
                    groupType={groupTypeData?.groupType}
                    onNextStep={handlePurposeComplete}
                    onClose={startedFromCountryMismatch ? undefined : handleClose}
                    currentStep={getStepNumber('purpose')}
                    totalSteps={getTotalSteps()}
                    isSaving={isCreating}
                />
            )}
        </TripQuestionModal>
    )
}

export default TripCreationFlow
