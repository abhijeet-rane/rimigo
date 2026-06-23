import LoginPage from './LoginPage'
import OnBoardingLayout from './OnBoardingLayout'
import RimigoBenefitsScreen from './RimigoBenefitsScreen/RimigoBenefitsScreen'

const LoginOnBoarding = () => {
    return (
        <div className="min-h-screen w-full">
            <div className="hidden lg:block h-full ">
                <OnBoardingLayout>
                    <div className="w-full  h-full">
                        <LoginPage className=' mb-30'/>
                    </div>
                </OnBoardingLayout>
            </div>

            <div className="block lg:hidden h-full">
                <RimigoBenefitsScreen />
            </div>
        </div>
    )
}

export default LoginOnBoarding
