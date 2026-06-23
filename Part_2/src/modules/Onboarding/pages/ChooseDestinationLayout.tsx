
import { useEffect, useState } from 'react'
import OnBoardingLayout from './OnBoardingLayout'
import { ChooseDestinationScreen } from '../components/ChooseDestinationScreen'
import { TravelerPreviousTripsScreen } from '../components/TravelerPreviousTripsScreen'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'
import { useUserInfo } from '@/hooks/useUserInfo'
import { useTravelerTripsAPI } from '@/hooks/trips/useTravelerTripsAPI'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

const ChooseDestinationLayout = () => {
    const navigate = useNavigate()
    const [showDestinationScreen, setShowDestinationScreen] = useState(false)
    const { user } = useUserInfo()
    const { trackButtonClickCustom } = usePostHog()
    
    // Fetch trips data
    const { data: tripsData, isLoading: isTripsLoading } = useTravelerTripsAPI(user?.id ?? '', true, false)

    // Calculate trips with destinations
    const trips = tripsData?.trips ?? []
    const tripsWithDestinations = trips.filter((trip) => trip.final_destination_countries?.length > 0)
    const totalTrips = trips?.length ?? 0

    const handleCreateNewTrip = () => {
        trackButtonClickCustom?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'create_new_trip',
            buttonAction: 'click',
            extra: {
                userId: user?.id
            }
        })
        setShowDestinationScreen(true)
    }

    useEffect(() => {
        // Only set up back navigation when showing previous trips screen
        if (showDestinationScreen || tripsWithDestinations?.length === 0 || totalTrips === 0) {
            return
        }

        const handleBack = () => {
            navigate(DEFAULT_LANDING_PAGE_ROUTE, { replace: true })
        }

        window.addEventListener('popstate', handleBack)

        return () => {
            window.removeEventListener('popstate', handleBack)
        }
    }, [navigate, showDestinationScreen, tripsWithDestinations?.length, totalTrips])

    if (isTripsLoading || !user?.id) {
    return (
        <OnBoardingLayout>
            <TravelerPreviousTripsScreen
                tripsWithDestinations={[]}
                isLoading={true}
                onCreateNewTrip={handleCreateNewTrip}
            />
        </OnBoardingLayout>
    )
}

    if (showDestinationScreen || tripsWithDestinations?.length === 0 || totalTrips === 0) {
        return (
            <OnBoardingLayout>
                <ChooseDestinationScreen />
            </OnBoardingLayout>
        )
    }

    return (
        <OnBoardingLayout>
            <TravelerPreviousTripsScreen
                tripsWithDestinations={tripsWithDestinations}
                isLoading={isTripsLoading}
                onCreateNewTrip={handleCreateNewTrip}
            />
        </OnBoardingLayout>
    )
}

export default ChooseDestinationLayout
