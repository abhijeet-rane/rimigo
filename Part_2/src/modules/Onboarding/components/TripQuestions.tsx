import React from 'react'
import { Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { GroupTypeQuestionPage } from '../../Onboarding/pages/GroupTypeQuestionPage'
// import { AccommodationQuestionPage } from '../../Onboarding/pages/AccommodationQuestionPage'
// import { ExperiencePreferencePage } from '../../Onboarding/pages/ExperiencePreferencePage'
import { TravelPurposeQuestionPage } from '../../Onboarding/pages/TravelPurposeQuestionPage'
// import { BudgetQuestionPage } from '../../Onboarding/pages/BudgetQuestionPage'
import { TravelerIntentQuestionPage } from '../../Onboarding/pages/TravelerIntentQuestionPage'
// import { ThankyouPage } from '../pages/ThankyouPage'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'
import ReactHelmet from '@/components/shared/React-Helmet/ReactHelmet'

// Map of steps
const steps = [
    // { id: 1, component: NameQuestion },
    { id: 2, component: GroupTypeQuestionPage, route: 'select-group-type' },
    // { id: 3, component: AccommodationQuestionPage, route: 'select-accommodation' },
    // { id: 4, component: ExperiencePreferencePage, route: 'select-activity' },
    { id: 5, component: TravelPurposeQuestionPage, route: 'select-purpose' },
    // { id: 6, component: BudgetQuestionPage, route: 'select-budget' },
    { id: 7, component: TravelerIntentQuestionPage, route: 'select-status' },
    // { id: 8, component: ThankyouPage, route: 'thank-you' }
]

// Step wrapper
const StepWrapper: React.FC<{ trip_id: string }> = ({ trip_id }) => {
    const { stepId } = useParams<{ stepId: string }>()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const currentIndex = steps.findIndex((s) => s.route === stepId)
    const StepComponent = steps[currentIndex]?.component

    const handleNext = () => {
        const nextIndex = currentIndex + 1
        if (nextIndex < steps.length) {
            navigate(`/trip/${trip_id}/create/${steps[nextIndex].route}/?${searchParams.toString()}`)
        } else {
            navigate(DEFAULT_LANDING_PAGE_ROUTE) // redirect to home or dashboard
        }
    }

    if (!StepComponent) return <div className="text-center mt-20">Step not found</div>

    return (
        <>
            <div className="flex flex-col items-center justify-center w-full min-h-screen ">
                <StepComponent onStepNext={handleNext} />
            </div>
        </>
    )
}

// ✅ Corrected TripQuestionsRouter (no <Router> here)
export const TripQuestionsRouter: React.FC = () => {
    const { trip_id } = useParams<{ trip_id: string }>()
    return (
        <>
            <ReactHelmet title={`Rimigo | Create Trip`} />
            <Routes>
                <Route
                    path="/:stepId"
                    element={<StepWrapper trip_id={trip_id ?? ''} />}
                />
                <Route
                    path="/"
                    element={<StepWrapper trip_id={trip_id ?? ''} />}
                />
            </Routes>
        </>
    )
}
