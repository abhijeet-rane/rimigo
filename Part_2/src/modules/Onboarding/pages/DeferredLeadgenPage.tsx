import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DeferredLeadgenProvider, useDeferredLeadgen } from '../context/DeferredLeadgenContext'
import { ChooseDestinationScreen } from '../components/ChooseDestinationScreen'
import { GroupTypeQuestionPage } from './GroupTypeQuestionPage'
import { TravelPurposeQuestionPage } from './TravelPurposeQuestionPage'
import { TravelerIntentQuestionPage } from './TravelerIntentQuestionPage'
import LoginPage from './LoginPage'
import OnBoardingLayout from './OnBoardingLayout'
import { SettingUpTripLoading } from './SettingUpTripLoading'
import TripSelectionModal from '@/components/TripSelectionModal/TripSelectionModal'
import StripAnimation from '../components/StripAnimation'
import Typography from '@/components/shared/Typography'
import { MAX_WIDTH } from '../constants/width'
import { useUserInfo } from '@/hooks/useUserInfo'
import { useTravelerTripsAPI } from '@/hooks/trips/useTravelerTripsAPI'
import { createBasicTrip, getTravelerProfileStatus } from '../api/onboardingAPI'
import { UserProfileUpdate } from '@/modules/UserProfile/pages/UserProfileUpdatePage'
import { setActiveTrip } from '@/pages/Landing/api/travelerTrips'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { LEADGEN_V2_BUTTON_PAGE } from '@/constants/posthogEvents'

// ── Inner orchestrator (consumes context) ────────────────────────────────────

const DeferredLeadgenPageInner: React.FC = () => {
    const { data, currentStep, setDestinations, setGroupType, setTravelPurpose, setTravelerIntent, goToStep, goBack } =
        useDeferredLeadgen()

    const [loginComplete, setLoginComplete] = useState(false)
    const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null)
    const [postLoginDecided, setPostLoginDecided] = useState(false)
    const [isCreatingTrip, setIsCreatingTrip] = useState(false)
    const isMobile = useIsMobile()
    const { trackButtonClickCustom } = usePostHog()

    // useUserInfo only reads on mount — works for already-logged-in users
    const { user } = useUserInfo()
    // After fresh login, loggedInUserId is set manually from TokenStorage
    const effectiveUserId = loggedInUserId || user?.id || null
    const shouldFetchTrips = loginComplete && !!effectiveUserId

    // Fetch traveler trips only after login
    const { data: tripsData, isLoading: isTripsLoading } = useTravelerTripsAPI(
        shouldFetchTrips ? (effectiveUserId as string) : '',
        true,
        false
    )

    // If user is already logged in when reaching login step, skip login UI
    // Check profile status to decide: profile-update or trip-selection
    useEffect(() => {
        if (currentStep === 'login' && !!user?.id && !loginComplete) {
            setLoggedInUserId(user.id as string)
            setLoginComplete(true)
            getTravelerProfileStatus(user.id as string)
                .then((status) => {
                    const isComplete = status?.status === true && !!status?.traveler_name
                    goToStep(isComplete ? 'trip-selection' : 'profile-update')
                })
                .catch(() => goToStep('trip-selection'))
        }
    }, [currentStep, user?.id, loginComplete])

    // After login + trips loaded → auto-create if no existing trips with destinations
    // Only runs when user has reached the trip-selection step (not during profile-update)
    useEffect(() => {
        if (!shouldFetchTrips || isTripsLoading || postLoginDecided) return
        if (currentStep !== 'trip-selection') return

        setPostLoginDecided(true)

        const trips = tripsData?.trips ?? []
        const tripsWithDestinations = trips.filter((trip) => trip.final_destination_countries?.length > 0)

        if (tripsWithDestinations.length === 0) {
            handleCreateNewTrip()
        }
    }, [shouldFetchTrips, isTripsLoading, tripsData, postLoginDecided, currentStep])

    const handleLoginSuccess = useCallback(async () => {
        // Read user info directly from TokenStorage since useUserInfo won't re-run
        const userInfo = await TokenStorage.getUserInfo()
        if (userInfo?.traveler_id) {
            setLoggedInUserId(userInfo.traveler_id)
        }
        setLoginComplete(true)
        goToStep('trip-selection')
    }, [])

    // Called by LoginPage when profile is incomplete — show profile-update step instead of modal
    const handleProfileIncomplete = useCallback(async () => {
        const userInfo = await TokenStorage.getUserInfo()
        if (userInfo?.traveler_id) {
            setLoggedInUserId(userInfo.traveler_id)
        }
        setLoginComplete(true)
        goToStep('profile-update')
    }, [])

    const handleCreateNewTrip = useCallback(async () => {
        if (!effectiveUserId || isCreatingTrip) return
        setIsCreatingTrip(true)

        trackButtonClickCustom({
            buttonPage: LEADGEN_V2_BUTTON_PAGE,
            buttonName: 'create_new_trip',
            buttonAction: 'click',
            extra: { userId: effectiveUserId }
        })

        try {
            const payload = {
                trip_source: data.utmSource || 'rimigo',
                utm_medium: data.utmMedium || undefined,
                interested_destinations: data.destinations.map((d) => d.id),
                final_destination_countries: data.destinations.map((d) => d.id),
                destination_finalized: data.destinationFinalized,
                group_type: data.groupType || undefined,
                travel_purpose: data.travelPurpose || undefined,
                preferred_travel_time: data.preferredTravelTime || undefined,
                traveler_preferences: data.travelerIntent
                    ? {
                          planning_start_preference: data.travelerIntent.planning_start_preference,
                          booked_items: data.travelerIntent.booked_items
                      }
                    : undefined
            }

            const result = await createBasicTrip(effectiveUserId, payload)
            const tripId = result.data.trip_id

            // Set as active trip — redirect happens after loading animation completes
            await setActiveTrip(tripId)
            window.location.replace(DEFAULT_LANDING_PAGE_ROUTE)
        } catch (err) {
            toast.error((err as Error).message || 'Something went wrong creating your trip')
            setIsCreatingTrip(false)
        }
    }, [effectiveUserId, data, isCreatingTrip])

    const handleSelectExistingTrip = useCallback(async (tripId: string) => {
        trackButtonClickCustom({
            buttonPage: LEADGEN_V2_BUTTON_PAGE,
            buttonName: 'open_saved_trip',
            buttonAction: 'click',
            extra: { tripId }
        })
        try {
            await setActiveTrip(tripId)
            window.location.replace(DEFAULT_LANDING_PAGE_ROUTE)
        } catch (err) {
            toast.error((err as Error).message || 'Something went wrong')
        }
    }, [])

    const handleLoadingComplete = useCallback(() => {
        goToStep('login')
    }, [])

    

    // ── Render per step ──────────────────────────────────────────────────────

    switch (currentStep) {
        case 'destination':
            return (
                <OnBoardingLayout>
                    <ChooseDestinationScreen
                        deferredLogin
                        defaultDestinations={data.destinations}
                        onDeferredSubmit={(destinations) => {
                            setDestinations(destinations, true)
                            goToStep('group-type')
                        }}
                        onDeferredSkip={() => {
                            setDestinations([], false)
                            goToStep('group-type')
                        }}
                    />
                </OnBoardingLayout>
            )

        case 'group-type':
            return (
                <OnBoardingLayout>
                    <GroupTypeQuestionPage
                        deferredLogin
                        defaultGroupType={data.groupType}
                        onStepNext={() => goToStep('purpose')}
                        onDeferredSubmit={(groupType) => setGroupType(groupType)}
                        onBack={goBack}
                    />
                </OnBoardingLayout>
            )

        case 'purpose':
            return (
                <OnBoardingLayout>
                    <TravelPurposeQuestionPage
                        deferredLogin
                        defaultGroupType={data.groupType}
                        defaultPurpose={data.travelPurpose}
                        defaultTravelTime={data.preferredTravelTime}
                        onStepNext={() => goToStep('intent')}
                        onDeferredSubmit={(purpose, travelTime) => setTravelPurpose(purpose, travelTime)}
                        onBack={goBack}
                    />
                </OnBoardingLayout>
            )

        case 'intent':
            return (
                <OnBoardingLayout>
                    <TravelerIntentQuestionPage
                        deferredLogin
                        defaultIntent={data.travelerIntent}
                        onStepNext={() => goToStep('loading')}
                        onDeferredSubmit={(intent) => setTravelerIntent(intent)}
                        onBack={goBack}
                    />
                </OnBoardingLayout>
            )
        
        case 'profile-update': {
            return (
                <OnBoardingLayout>
                    <div className="flex flex-col w-full h-full bg-natural-white ">
                        {/* StripAnimation header */}
                        <div className="relative z-10 w-full">
                            <StripAnimation />
                        </div>

                        <div
                            className={`flex flex-col w-full  mx-auto mb-4 ${isMobile ? 'px-4':'px-0'}  `}
                                style={{ maxWidth: `${MAX_WIDTH}px`, width: '100%' }}>
                                <Typography
                                    textAlign="left"
                                    size="12"
                                    weight="extrabold"
                                    family="redhat"
                                    color="grey-2">
                                    ALMOST THERE
                                </Typography>
                                <Typography
                                    textAlign="left"
                                    size="24"
                                    lineHeight="32px"
                                    weight="semibold"
                                    family="redhat"
                                    color="grey-0">
                                    What's your name
                                </Typography>
                            </div>

                        <UserProfileUpdate
                            isInModal
                            showHeading={false}
                            showLogo={false}
                            onSuccess={() => goToStep('trip-selection')}
                            showFixedButton={false}
                            className={isMobile ? 'px-4' : ''}
                        />
                    </div>
                </OnBoardingLayout>
            )
        }

        case 'loading': {
                return (
                    <OnBoardingLayout>
                        <SettingUpTripLoading quickMode destinationSkipped={data.destinations.length === 0} onComplete={handleLoadingComplete} />
                    </OnBoardingLayout>
                )
        }

        case 'trip-selection': {
            const trips = tripsData?.trips ?? []

            return (
                <OnBoardingLayout>
                    <div className="flex flex-col w-full h-full bg-natural-white overflow-y-auto">
                        {/* StripAnimation header */}
                        <div className="relative z-10 w-full">
                            <StripAnimation />
                        </div>

                        <div
                            className="flex flex-col w-full px-4 mx-auto"
                            style={{ maxWidth: `${MAX_WIDTH}px`, width: '100%' }}>
                            <TripSelectionModal
                                inline
                                isOpen
                                onClose={() => {}}
                                trips={trips}
                                isTripsLoading={isTripsLoading}
                                pendingWizardData={{
                                    destinations: data.destinations,
                                    groupType: data.groupType || '',
                                    purpose: data.travelPurpose || ''
                                }}
                                onSelectExistingTrip={handleSelectExistingTrip}
                                onNewTripCreated={() => {}}
                                onCreateNewTrip={async () => {
                                    handleCreateNewTrip()
                                   
                                }}
                            />
                        </div>
                    </div>
                </OnBoardingLayout>
            )
        }

        case 'login': {
            // Show embedded LoginPage; keeps rendering even after loginComplete
            // to avoid a blank flash before the step transitions to profile-update or trip-selection
            return (
                <OnBoardingLayout>
                    <div className="flex flex-col w-full h-full bg-natural-white">
                        {/* StripAnimation header */}
                        <div className="relative z-10 w-full">
                            <StripAnimation />
                        </div>

                        <div
                            className="flex flex-col w-full px-4 mx-auto"
                            style={{ maxWidth: `${MAX_WIDTH}px`, width: '100%' }}>
                            {data.destinations.length > 0 && (
                                <Typography
                                    textAlign="left"
                                    size="12"
                                    weight="extrabold"
                                    family="redhat"
                                    color="grey-2">
                                    ALMOST THERE
                                </Typography>
                            )}
                            <Typography
                                textAlign="left"
                                size="20"
                                lineHeight="32px"
                                weight="semibold"
                                family="redhat"
                                color="grey-0">
                                {data.destinations.length === 0
                                    ? "We’ve curated destinations you’ll love."
                                    : 'Your personalized trip is ready'}
                            </Typography>
                        </div>

                        {/* Embedded LoginPage */}
                        <LoginPage
                            redirectAfterLogin={false}
                            onLoginSuccess={handleLoginSuccess}
                            onProfileIncomplete={handleProfileIncomplete}
                            className="min-h-0 flex-1 pb-6 lg:items-stretch lg:justify-start"
                            showLoginHeading={false}
                            subheading={data.destinations.length === 0
                                ? 'Please share your phone number to sign in'
                                : 'Enter your phone number to access your TripBoard'}
                            childContainerClassName="lg:justify-start lg:items-stretch px-0"
                        />
                    </div>
                </OnBoardingLayout>
            )
        }

        default:
            return null
    }
}

// ── Outer wrapper (captures UTM params, provides context) ────────────────────

const DeferredLeadgenPage: React.FC = () => {
    const [searchParams] = useSearchParams()

    const utmSource = searchParams.get('utm_source') || ''
    const utmMedium = searchParams.get('utm_medium') || ''

    const handleExit = useCallback(() => {
        // No explicit navigation needed — browser back + React Router's
        // popstate listener already handle returning to the previous page
    }, [])

    return (
        <DeferredLeadgenProvider
            utmSource={utmSource}
            utmMedium={utmMedium}
            onExit={handleExit}>
            <DeferredLeadgenPageInner />
        </DeferredLeadgenProvider>
    )
}

export default DeferredLeadgenPage
