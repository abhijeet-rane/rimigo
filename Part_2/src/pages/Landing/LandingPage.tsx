import React from 'react'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { useSearchParams } from 'react-router-dom'
import { HeaderWithSidebar, MainContent } from './Components'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import ReactHelmet from '@/components/shared/React-Helmet/ReactHelmet'
import { getCitiesByCountry } from '@/api/curation/locationPersonalizationAPI'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import LandingZeroState from './Components/LandingZeroStateMultiSelectDestination'
import { useOptionalTravelerTrips } from './context/travelerTripsContext'
import { toast } from 'sonner'

export const LandingPage: React.FC = () => {
    // const navigate = useNavigate()
    // const location = useLocation()
    const [searchParams] = useSearchParams()
    const { trackButtonClickCustom } = usePostHog()
    const { isAuthenticated } = useAuth()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const params = new URLSearchParams(searchParams)
    const countryId = params.get('country_id')
    const countryName = params.get('country_name')
    const handleTileClick = async (route: string) => {
        // Check authentication - redirect to login if not authenticated
        // if (!isAuthenticated) {
        //     const redirectUrl = `${location.pathname}${location.search}`
        //     navigate(`/login?redirectTo=${encodeURIComponent(redirectUrl)}`)
        //     return
        // }

        // Open window IMMEDIATELY (synchronously) in response to user click
        // Safari blocks window.open() if called after async operations
        const newWindow = window.open('about:blank', '_blank')

        if (!newWindow) {
            toast.error('Popup blocked in your browser. Please allow popups and try again.')
            // Fallback: continue with async operations and navigate in same window
            // We'll handle this after building the route
        }

        const params = new URLSearchParams()

        // For stays route, use city_id and city_name instead of country_id and country_name
        if (route === '/stays' && countryId) {
            try {
                const citiesResponse = await getCitiesByCountry(countryId)
                const cities = citiesResponse.results || []

                if (cities.length > 0) {
                    // Use the first city (you can sort alphabetically if needed)
                    const firstCity = cities[0]
                    params.set('city_id', firstCity.city)
                    params.set('city', firstCity.city_name)
                } else {
                    // Fallback to country if no cities found
                    params.set('country_id', countryId)
                    if (countryName) {
                        params.set('country_name', countryName)
                    }
                }
            } catch {
                // Fallback to country on error
                params.set('country_id', countryId)
                if (countryName) {
                    params.set('country_name', countryName)
                }
            }
        } else {
            // For other routes, use country_id and country_name
            if (countryId) {
                params.set('country_id', countryId)
            }
            if (countryName) {
                params.set('country_name', countryName)
            }
        }

        // Forward country_id_{index} params from the current URL
        for (const [key, value] of searchParams.entries()) {
            if (/^country_id_\d+$/.test(key) && !params.has(key)) {
                params.set(key, value)
            }
        }

        const destinationRoute = params.toString() ? `${route}?${params.toString()}` : route

        trackButtonClickCustom({
            buttonPage: 'home_v1',
            buttonName: 'tile_clicked',
            buttonAction: 'tile_clicked',
            extra: {
                route: destinationRoute
            }
        })

        // Update the window location after async operations complete
        if (newWindow) {
            try {
                newWindow.location.href = destinationRoute
            } catch (error) {
                // If updating location fails (cross-origin or other issues), fallback
                toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
                // Fallback: open in same window
                window.location.href = destinationRoute
            }
        } else {
            // Window was blocked, navigate in same window
            window.location.href = destinationRoute
        }
    }

    if (!isAuthenticated) {
        if (!countryId) {
            return <LandingZeroState />
        }
    }

    //if active trip does not exist or it exists but length of active_trip.final_destinations is 0 return LandingZeroState
    if (isAuthenticated) {
        if (!activeTrip && !countryId) {
            return <LandingZeroState />
        }
        if (activeTrip && activeTrip.final_destination_countries?.length === 0 && !countryId) {
            return <LandingZeroState />
        }
    }

    return (
        <>
            <ReactHelmet title="Rimigo | Tripboard" />
            <div className="relative">
                {/* Mobile header (same as Activities: menu + title, no search) */}
                <div className="relative flex flex-col">
                    <HeaderWithSidebar />
                    <MainContent onTileClick={handleTileClick} />
                </div>
            </div>
        </>
    )
}
