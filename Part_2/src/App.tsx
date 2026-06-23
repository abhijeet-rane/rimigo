/**
 * Standalone Itinerary-Skeleton app shell.
 *
 * The production rimigo_web App mounts the full route table behind auth.
 * This demo build renders ONLY the Itinerary view, fed by dummy data
 * (src/mocks/itineraryFixture.ts) through the mock API client. Any path
 * redirects to the fixture itinerary.
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { CreatorAttributionProvider } from '@/modules/amplitude/components/CreatorAttributionContext'
import { PostHogProvider } from '@/modules/amplitude/components/PostHogProvider'
import { LoginModalProvider } from '@/modules/Onboarding/context/LoginModalContext'
import Itinerary from '@/modules/Itinerary/pages/Itenerary'
import { FIXTURE_ITINERARY_ID } from '@/mocks/itineraryFixture'

const HOME = `/itinerary/${FIXTURE_ITINERARY_ID}`

function App() {
    return (
        <CreatorAttributionProvider>
            <PostHogProvider>
                <LoginModalProvider>
                    <Toaster />
                    <Routes>
                    <Route
                        path="/itinerary/:id"
                        element={<Itinerary />}
                    />
                    <Route
                        path="*"
                        element={
                            <Navigate
                                to={HOME}
                                replace
                            />
                        }
                    />
                    </Routes>
                </LoginModalProvider>
            </PostHogProvider>
        </CreatorAttributionProvider>
    )
}

export default App
