import { SettingUpTripLoading } from '../SettingUpTripLoading'
import OnBoardingLayout from '../OnBoardingLayout'

const TripCreationLoaderLayout = () => {
    // capture redirectTo from url

    const redirectTo = new URLSearchParams(window.location.search).get('redirectTo')

    return (
        <OnBoardingLayout>
            <SettingUpTripLoading redirectTo={redirectTo} />
        </OnBoardingLayout>
    )
}

export default TripCreationLoaderLayout
