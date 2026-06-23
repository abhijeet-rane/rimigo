import React, { Suspense, lazy } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loading } from '@/components/shared/Loading'
import { SideBarLayout } from '@/components/layouts/SideBarLayout'
// LandingPage removed - /home route replaced by /tripboard
import CollectionsPage from '@/pages/Collections/CollectionsPage'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { USER_TYPE_RIMIGO_INTERNAL } from '@/constants/userConfig'
import { useAuth } from '@/lib/auth/providers/AuthProviders'

// Lazy loaded components
const AboutPage = lazy(() => import('@/pages/About/About'))
const TermsAndConditions = lazy(() => import('@/pages/TermsAndConditions/TermsAndConditions'))
const RefundAndCancellation = lazy(() => import('@/pages/RefundAndCancellation/RefundAndCancellation'))
const ContactUs = lazy(() => import('@/pages/ContactUs/ContactUs'))
const CareersPage = lazy(() => import('@/pages/Careers'))
const BlogList = lazy(() => import('@/pages/Blog/BlogList'))
const BlogPost = lazy(() => import('@/pages/Blog/BlogPost'))
const Logout = lazy(() => import('@/modules/Auth/Logout'))
// Direct import for SSR - lazy loading doesn't work with server-side rendering
import ExperiencePublicPage from '@/modules/Experiences/pages/ExperiencePublicPage'
import HotelPublicPage from '@/modules/Hotels/pages/HotelPublicPage'

// Direct imports
import PrivacyPolicy from '@/pages/PrivacyPolicy/PrivacyPolicy'
import Testimonials from '@/pages/Testimonials/Testimonials'
import CreatorLandingPageNew from '@/modules/CreatorScreen/pages/CreatorLandingPageNew'
import LoginOnBoarding from '@/modules/Onboarding/pages/LoginOnBoarding'
import RimigoBenefitsLayout from '@/modules/Onboarding/pages/RimigoBenefitsScreen/RimigoBenefitsLayout'
import TripCreationLoaderLayout from '@/modules/Onboarding/pages/LoadingScreens/TripCreationLoaderLayout'
import UserProfileUpdateLayout from '@/modules/UserProfile/layout/UserProfileUpdateLayout'
import { ErrorOnBoardingScreen } from '@/modules/ErrorScreen/pages/ErrorBoradingScreen'
import Home from '@/pages/Home/Home'
import StaysExplore from '@/pages/Stays/StaysExplore'
import HotelDetailPage from '@/pages/Stays/HotelDetail/HotelDetailPage'
import ExperienceDetailsPage from '@/modules/Experiences/pages/ExperienceDetailsPage'
import WatchAlongExploreLandingPage from '@/modules/WatchAlong/pages/WatchAlongExploreLandingPage'
import { TravelerTripsProvider } from '@/pages/Landing/context/travelerTripsContext'
import { toast } from 'sonner'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import BaseLayoutWeb from '@/pages/Home/BaseLayoutWeb'
import DestinationRecommenderPage from '@/pages/Destinations/DestinationRecommenderPage'
import WhereToTravelPage from '@/pages/Destinations/WhereToTravelPage'

import ExperiencesWishlistPage from '@/modules/Experiences/pages/ExperiencesWishlistPage'
import FlightsPage from '@/pages/Flights/FlightsPage'
import InviteLandingPage from '@/pages/Invite/InviteLandingPage'
import ActivitiesExploreLandingPage from '@/modules/Acitvities/pages/ActivitiesExploreLandingPage'
import ActivitiesByCityPage from '@/modules/Acitvities/pages/ActivitiesByCityPage'
import CollectionDetailPage from '@/modules/Acitvities/pages/CollectionDetailPage'
import ActivitiesListByFilterDetailpage from '@/modules/Acitvities/pages/ActivitiesListByFilterDetailpage'
import { ShortlistedExperiencesProvider } from '@/modules/Acitvities/context/ShortlistedExperiencesContext'
import ContentPage from '@/modules/ContentCollection/pages/ContentPage'

// Route constants
export const LOGIN_ROUTE = '/login'

export const DEFERRED_LEADGEN_ROUTE = '/get-started'
export const DEFAULT_LANDING_PAGE_ROUTE = '/tripboard'
export const DEFAULT_TRIP_ONBOARDING_ROUTE = DEFAULT_LANDING_PAGE_ROUTE



export const DEFAULT_BENEFITS_PAGE_ROUTE = '/benefits'

export const DEFAULT_TRIP_CREATION_LOADER_ROUTE = '/loading'

export const DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE = '/experiences'

export const RIMIGO_COLLECTION_ROUTE = '/rimigo-collection'

export const TRIPBOARDS_ROUTE = '/tripboards'

export const TRIP_COLLECTION_ROUTE = '/trip-collection'

export const CREATOR_COLLECTION_ROUTE = '/creator-collection'

export const DEFAULT_CONTENT_COLLECTION_ROUTE = '/collection'

export const DEFAULT_PREMIUM_LANDING_PAGE = '/premium'

export const BOOKINGS_ROUTE = '/bookings'

export const TRIPBOARD_CREATE_ROUTE = '/tripboard/create'

export const TRIPBOARD_ROUTE = DEFAULT_LANDING_PAGE_ROUTE

export const PURCHASES_ROUTE = '/purchases'

import { OnboardingGuideProvider } from '@/modules/UserGuideModal/context/OnboardingGuideProvider'
import PremiumLandingPage from '@/modules/Premium/pages/PremiumLandingPage'
import BookingConfirmationPage from '@/modules/Premium/pages/BookingConfirmationPage'
import BookingsListPage from '@/modules/Premium/pages/BookingsListPage'
import PurchasesPage from '@/pages/Purchases/PurchasesPage'

import ContentListPublicPage from '@/modules/ContentCollection/pages/ContentListPublicPage'
import ViewContentCollection from '@/modules/ContentCollection/pages/ViewContentCollection'
import CountryCollectionsPage from '@/modules/ContentCollection/pages/CountryCollectionsPage'
import EditContentCollection from '@/modules/ContentCollection/pages/Edit/EditContentCollection'
import TripContentListPublicPage from '@/modules/ContentCollection/pages/TripCollections/TripContentListPublicPage'
import CreatorContentListPublicPage from '@/modules/ContentCollection/pages/CreatorContentListPublicPage/CreatorContentListPublicPage'
import TravelerCollectionDetailsPage from '@/modules/ContentCollection/pages/TravelerCollections/TravelerCollectionDetailsPage'
import TripboardPage from '@/modules/Tripboard/pages/TripboardPage'
import VersionPreviewPage from '@/modules/Tripboard/components/Versions/VersionPreviewPage'
// TripboardCreatePage removed — creation flow now lives on /tripboard?create=true
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'

// Reads the persisted orchestration state without mounting the full hook —
// used by the /tripboard index redirect so we don't mis-send a user mid-create.
const ORCHESTRATION_SESSION_KEY = 'tripboard_orchestration_state'
type PersistedOrchestration = { phase?: string; tripId?: string | null }
const readOrchestrationFromSession = (): PersistedOrchestration | null => {
    if (typeof sessionStorage === 'undefined') return null
    try {
        const raw = sessionStorage.getItem(ORCHESTRATION_SESSION_KEY)
        return raw ? (JSON.parse(raw) as PersistedOrchestration) : null
    } catch {
        return null
    }
}

/**
 * Bare `/tripboard` resolver:
 *   - If an orchestration is mid-flight → go to its URL (new or existing tripId).
 *   - Else if a logged-in user has an active trip → go to `/tripboard/<id>`.
 *   - Else (loading, or no trips, or logged out) → let `TripboardPage` render its own state.
 *
 * Incoming query strings (e.g. `?tab=itinerary&stays_city=…&view_changes=1` dispatched from
 * Stays / AI-Assistant / ItineraryUpdateOutput) must survive the redirect — `<Navigate>` drops
 * them by default, so we thread `location.search` through explicitly.
 */
const TripboardIndexRedirect: React.FC = () => {
    const travelerTripsContext = useOptionalTravelerTrips()
    const location = useLocation()
    const search = location.search || ''

    const appendSearch = (path: string) => {
        if (!search) return path
        return path.includes('?') ? `${path}&${search.slice(1)}` : `${path}${search}`
    }

    const orch = readOrchestrationFromSession()
    const orchInProgress = orch && ['creating_trip', 'generating_itinerary', 'creating_tripboard'].includes(orch.phase || '')
    if (orchInProgress) {
        if (orch!.tripId) {
            return <Navigate to={appendSearch(`/tripboard/${orch!.tripId}?create=true`)} replace />
        }
        return <Navigate to={appendSearch('/tripboard/new?create=true')} replace />
    }

    // While the AUTHENTICATED user's trips are still loading, render a neutral loader —
    // not TripboardPage. Rendering TripboardPage here would mount it under bare `/tripboard`
    // where `useParams().tripId` is undefined, so the page falls back to the context's
    // active trip and renders the OLD trip's content. Once loading finishes, the
    // activeTripId branch below redirects to `/tripboard/<activeTripId>`.
    //
    // IMPORTANT: for LOGGED-OUT viewers `travelerTripsContext` is `null` (the provider
    // only mounts for authenticated users). We must NOT show the loader in that case —
    // doing so strands affiliate / UTM links like `/tripboard?utm_source=xyz` on a
    // permanent spinner because no login is ever going to make the context appear.
    if (travelerTripsContext?.isLoading) {
        return <Loading />
    }

    if (travelerTripsContext?.activeTripId) {
        return <Navigate to={appendSearch(`/tripboard/${travelerTripsContext.activeTripId}`)} replace />
    }

    // Logged-in without trips, or logged-out (affiliate / UTM / shared-link viewer with
    // no trip id) — TripboardPage handles its own zero-state / read-only rendering.
    return <TripboardPage />
}


// Wrapper component for semi-protected routes
// Wrapper component for semi-protected routes
const SemiProtectedWrapper: React.FC<{ path?: string; component: React.ComponentType<any> }> = ({ path, component: Component }) => {
    const location = useLocation()
    // Resolve auth synchronously on the first render from cached tokens so we skip the
    // "Loading…" gate flash. On the server (no localStorage) these fall back to the
    // logged-out defaults — checkedAuth=false — so SSR output is unchanged. The async
    // effects below still run and re-confirm; identical values make React bail out of
    // the re-render, so there's no extra paint.
    const isBrowser = typeof window !== 'undefined'
    // `useAuth().isAuthenticated` flips synchronously after in-place login (LoginModal → signInWithPhone)
    // so the wrapper re-renders with the sidebar without needing a page refresh.
    const { isAuthenticated: authedFromContext } = useAuth()
    const [isPublic, setIsPublic] = React.useState(() => (isBrowser ? !TokenStorage.isLoggedInSync() : true))
    const [travelerId, setTravelerId] = React.useState(() => (isBrowser ? (TokenStorage.getUserInfoSync()?.traveler_id ?? '') : ''))
    const [isMobile, setIsMobile] = React.useState(false)
    const [checkedAuth, setCheckedAuth] = React.useState(() => isBrowser)
    // For rimigo-collection routes: null = still checking, true = internal user allow, false = non-internal redirect
    const [internalUserChecked, setInternalUserChecked] = React.useState<boolean | null>(null)

    // Check if device is mobile
    React.useEffect(() => {
        const checkMobile = () => {
            const isMobileDevice = window.innerWidth <= 768
            setIsMobile(isMobileDevice)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Check login state — re-runs whenever AuthContext flips (e.g. mid-flow login via LoginModal),
    // so the sidebar appears immediately after OTP verification without a page refresh.
    React.useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const isLoggedIn = await TokenStorage.isLoggedIn()
                setIsPublic(!isLoggedIn)
            } catch (error) {
                toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
                setIsPublic(true)
            } finally {
                setCheckedAuth(true)
            }
        }

        checkAuthStatus()
    }, [authedFromContext])

    // Fetch traveler ID if logged in
    React.useEffect(() => {
        if (isPublic) return
        const fetchTravelerId = async () => {
            try {
                const userInfo = await TokenStorage.getUserInfo()
                setTravelerId(userInfo?.traveler_id)
            } catch (error) {
                toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
            }
        }
        fetchTravelerId()
    }, [isPublic])

    // Rimigo-collection list and country-level only: internal users may access; detail (/:countryName/:identifier) stays public
    const pathname = location.pathname
    const isRimigoCollectionRoute = pathname.startsWith(RIMIGO_COLLECTION_ROUTE)
    const rimigoCollectionDetailMatch = pathname.match(new RegExp(`^${RIMIGO_COLLECTION_ROUTE}/[^/]+/[^/]+$`))
    const isRimigoCollectionDetailPage = !!rimigoCollectionDetailMatch
    const isInternalOnlyRimigoPath = isRimigoCollectionRoute && !isRimigoCollectionDetailPage

    React.useEffect(() => {
        if (!isInternalOnlyRimigoPath || isPublic || !checkedAuth) {
            setInternalUserChecked(null)
            return
        }
        const checkInternalUser = async () => {
            try {
                const userInfo = await TokenStorage.getUserInfo()
                const isInternal = userInfo?.type === USER_TYPE_RIMIGO_INTERNAL
                setInternalUserChecked(isInternal)
            } catch {
                setInternalUserChecked(false)
            }
        }
        checkInternalUser()
    }, [isInternalOnlyRimigoPath, isPublic, checkedAuth])

    const isExperienceRoute = path?.startsWith(DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE)
    const isStaysRoute = path?.startsWith('/stays')
    const isFlightsRoute = path?.startsWith('/flights')
    // Cover every tripboard variant: `/tripboard`, `/tripboard/new`, `/tripboard/create`,
    // `/tripboard/<tripId>` (URL-addressed trips), and the list `/tripboards`. Previously the
    // exact-match checks here only whitelisted bare `/tripboard`, so `/tripboard/<tripId>`
    // (and the create flow) dropped mobile users onto the "coming soon" screen.
    const isTripboardRoute = !!path?.startsWith('/tripboard')
    // Show mobile coming soon screen
    if (isMobile && !isExperienceRoute && !isStaysRoute && !isRimigoCollectionRoute && !isFlightsRoute && !isTripboardRoute && path !== '/itinerary' && path !== '/premium')  {
        const MobileComingSoon = React.lazy(() => import('@/components/shared/MobileComingSoon'))
        return (
            <React.Suspense fallback={<div>Loading...</div>}>
                <MobileComingSoon />
            </React.Suspense>
        )
    }

    // Wait for auth check
    if (!checkedAuth) {
        return <div>Loading...</div>
    }

    // Rimigo-collection list and country-level only: redirect non-internal/logged-out to /tripboards; detail page is public
    if (isInternalOnlyRimigoPath) {
        if (isPublic) {
            return <Navigate to={TRIPBOARDS_ROUTE} replace />
        }
        if (internalUserChecked === null) {
            return <div>Loading...</div>
        }
        if (!internalUserChecked) {
            return <Navigate to={TRIPBOARDS_ROUTE} replace />
        }
    }

    // 🔥 Redirect to login if not logged in (just like ProtectedWrapper)
    // if (isPublic) {
    //     return (
    //         <Navigate
    //             to={`/login?redirectTo=${encodeURIComponent(location.pathname + location.search)}`}
    //             replace
    //         />
    //     )
    // }

    const content = <Component public={isPublic} />

    // Logged-in users get sidebar layout
    if (isPublic) {
        return <OnboardingGuideProvider isLoggedIn={false}>{content}</OnboardingGuideProvider>
    }
    return (
        <TravelerTripsProvider travelerId={travelerId}>
            <OnboardingGuideProvider isLoggedIn={true}>
                <SideBarLayout>{content}</SideBarLayout>
            </OnboardingGuideProvider>
        </TravelerTripsProvider>
    )
}

// Wrapper component for protected routes
const ProtectedWrapper: React.FC<{ component: React.ComponentType<any> }> = ({ component: Component }) => {
    // Resolve auth synchronously from cached tokens on first render (see SemiProtectedWrapper).
    // Server has no localStorage → isAuthenticated stays null → renders the loader, unchanged SSR.
    const isBrowser = typeof window !== 'undefined'
    const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(() => (isBrowser ? TokenStorage.isLoggedInSync() : null))
    const [travelerId, setTravelerId] = React.useState(() => (isBrowser ? (TokenStorage.getUserInfoSync()?.traveler_id ?? '') : ''))
    // get current location
    const location = useLocation()

    React.useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const isLoggedIn = await TokenStorage.isLoggedIn()
                setIsAuthenticated(isLoggedIn)
            } catch (error) {
                toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
                setIsAuthenticated(false)
            }
        }

        checkAuthStatus()
    }, [])

    React.useEffect(() => {
        if (isAuthenticated) {
            const fetchTravelerId = async () => {
                try {
                    const userInfo = await TokenStorage.getUserInfo()
                    setTravelerId(userInfo?.traveler_id)
                } catch (error) {
                    toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
                }
            }
            fetchTravelerId()
        }
    }, [isAuthenticated])

    if (isAuthenticated === null) {
        return <div>Loading...</div>
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to={`/login?redirectTo=${encodeURIComponent(location.pathname + location.search)}`}
                replace
            />
        )
    }

    return (
        <TravelerTripsProvider travelerId={travelerId}>
            <OnboardingGuideProvider isLoggedIn={true}>
                <SideBarLayout>
                    <Component />
                </SideBarLayout>
            </OnboardingGuideProvider>
        </TravelerTripsProvider>
    )
}

// Wrapper component for public routes
const PublicWrapper: React.FC<{ component: React.ComponentType<any> }> = ({ component: Component }) => {
    return <Component />
}

export const routes = {
    protected: [
        {
            path: '/error',
            component: ErrorOnBoardingScreen
        },
        {
            path: '/logout',
            component: () => (
                <Suspense fallback={<Loading />}>
                    <Logout />
                </Suspense>
            )
        },
        {
            path: '/trip/new/destinations',
            component: () => <Navigate to="/tripboard/new?create=true" replace />
        },
        {
            path: '/trip/:tripId/destinations',
            component: () => <Navigate to="/tripboard/new?create=true" replace />
        },
        {
            path: '/profile/update',
            component: UserProfileUpdateLayout
        },
        {
            path: '/trip/:trip_id/create/:stepId',
            component: () => <Navigate to="/tripboard/new?create=true" replace />
        },
        {
            path: '/itinerary',
            component: () => <Navigate to="/tripboard" replace />
        },
        {
            path: '/itinerary/:id',
            component: () => <Navigate to="/tripboard" replace />
        }
        ,
        {
            path: `${TRIP_COLLECTION_ROUTE}`,
            component: () => (
                <ShortlistedExperiencesProvider>
                    {' '}
                    <TripContentListPublicPage />
                </ShortlistedExperiencesProvider>
            )
        },
        {
            path: `${TRIP_COLLECTION_ROUTE}/:identifier`,
            component: () => (
                <ShortlistedExperiencesProvider>
                    {' '}
                    <TravelerCollectionDetailsPage />
                </ShortlistedExperiencesProvider>
            )
        },
        {
            path: BOOKINGS_ROUTE,
            component: BookingsListPage
        },
        {
            path: PURCHASES_ROUTE,
            component: PurchasesPage
        },
        {
            path: `${BOOKINGS_ROUTE}/:bookingId`,
            component: BookingConfirmationPage
        },
    ],
    public: [
        {
            path: '/',
            component: () => (
                <BaseLayoutWeb disableNavbarScrollEffect={false}>
                    <Home />
                </BaseLayoutWeb>
            )
        },
        {
            path: '/trip-source/:trip_source',
            component: CreatorLandingPageNew
        },

        {
            path: '/login',
            component: LoginOnBoarding
        },
        {
            path: '/get-started',
            component: () => <Navigate to={DEFAULT_TRIP_ONBOARDING_ROUTE} replace />
        },
        {
            path: '/loading',
            component: TripCreationLoaderLayout
        },
        {
            path: '/about',
            component: () => (
                <Suspense fallback={<Loading />}>
                    <BaseLayoutWeb>
                        <AboutPage />
                    </BaseLayoutWeb>
                </Suspense>
            )
        },
        {
            path: '/when-to-travel/:country',
            component: DestinationRecommenderPage
        },
        {
            path: '/when-to-travel',
            component: DestinationRecommenderPage
        },
        {
            path: '/where-to-travel/:month',
            component: WhereToTravelPage
        },
        {
            path: '/where-to-travel',
            component: WhereToTravelPage
        },
        {
            path: '/terms-and-conditions',
            component: () => (
                <Suspense fallback={<Loading />}>
                    <BaseLayoutWeb>
                        <TermsAndConditions />
                    </BaseLayoutWeb>
                </Suspense>
            )
        },
        {
            path: '/refund-and-cancellation',
            component: () => (
                <Suspense fallback={<Loading />}>
                    <BaseLayoutWeb>
                        <RefundAndCancellation />
                    </BaseLayoutWeb>
                </Suspense>
            )
        },
        {
            path: '/contact-us',
            component: () => (
                <Suspense fallback={<Loading />}>
                    <BaseLayoutWeb>
                        {' '}
                        <ContactUs />
                    </BaseLayoutWeb>
                </Suspense>
            )
        },
        {
            path: '/careers',
            component: () => (
                <Suspense fallback={<Loading />}>
                    <BaseLayoutWeb>
                        {' '}
                        <CareersPage />
                    </BaseLayoutWeb>
                </Suspense>
            )
        },
        {
            path: '/privacy-policy',
            component: () => (
                <BaseLayoutWeb>
                    <PrivacyPolicy />
                </BaseLayoutWeb>
            )
        },
        {
            path: '/benefits',
            component: () => (
                <Suspense fallback={<Loading />}>
                    <RimigoBenefitsLayout />
                </Suspense>
            )
        },
        {
            path: '/testimonials',
            component: () => (
                <BaseLayoutWeb>
                    <Testimonials />
                </BaseLayoutWeb>
            )
        },
        {
            path: '/blogs',
            component: () => (
                <Suspense fallback={<Loading />}>
                    <BaseLayoutWeb>
                        {' '}
                        <BlogList />
                    </BaseLayoutWeb>
                </Suspense>
            )
        },
        {
            path: '/blogs/:slug',
            component: () => (
                <Suspense fallback={<Loading />}>
                    <BaseLayoutWeb>
                        {' '}
                        <BlogPost />
                    </BaseLayoutWeb>
                </Suspense>
            )
        },
        {
            path: '/invite/:inviteToken',
            component: InviteLandingPage
        },
        {
            path: '/experience/:slug',
            // No Suspense needed - direct import for SSR compatibility
            component: () => <ExperiencePublicPage />
        },
        {
            // Public, SEO-indexed hotel detail page. Mirrors /experience/:slug —
            // crawlable, in sitemap, server-rendered via `entry-server.tsx`.
            path: '/hotel/:slug',
            component: () => <HotelPublicPage />
        },

        {
            path: '/content/:identifier',
            component: () => (
                <BaseLayoutWeb>
                    <ContentPage />
                </BaseLayoutWeb>
            )
        }
    ],
    semiProtected: [
        // Declare static segments before the parametric :tripId so `/tripboard/create`
        // and `/tripboard/new` win the match even though React Router v6 already ranks
        // literals higher than params — keep the ordering defensive.
        {
            path: TRIPBOARD_CREATE_ROUTE,
            component: () => <Navigate to="/tripboard/new?create=true" replace />
        },
        {
            path: '/tripboard/new',
            component: TripboardPage
        },
        // Declared BEFORE `/tripboard/:tripId` so the more-specific path wins
        // even though React Router v6 already ranks literals higher.
        {
            path: `${DEFAULT_LANDING_PAGE_ROUTE}/:tripId/versions/:versionId/preview`,
            component: VersionPreviewPage
        },
        {
            path: `${DEFAULT_LANDING_PAGE_ROUTE}/:tripId`,
            component: TripboardPage
        },
        {
            path: DEFAULT_LANDING_PAGE_ROUTE,
            component: TripboardIndexRedirect
        },
        {
            path: '/home',
            component: () => <Navigate to={DEFAULT_LANDING_PAGE_ROUTE} replace />
        },
        {
            path: TRIPBOARDS_ROUTE,
            component: CollectionsPage
        },
        {
            path: '/stays/:hotelId/*',
            component: HotelDetailPage
        },
        {
            path: '/stays',
            component: StaysExplore
        },
        {
            path: '/premium',
            component: PremiumLandingPage
        },
        {
            path: DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE,
            component: () => (
                <ShortlistedExperiencesProvider>
                    <ActivitiesExploreLandingPage />
                </ShortlistedExperiencesProvider>
            )
        },
        {
            path: `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/:cityId`,
            component: () => (
                <ShortlistedExperiencesProvider>
                    <ActivitiesByCityPage />
                </ShortlistedExperiencesProvider>
            )
        },
        {
            path: `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/country/:countryId/city/:cityId/collection/:collectionId`,
            component: () => (
                <ShortlistedExperiencesProvider>
                    <CollectionDetailPage />
                </ShortlistedExperiencesProvider>
            )
        },
        {
            path: `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/country/:countryId/city/:cityId/filter/:filterId`,
            component: () => (
                <ShortlistedExperiencesProvider>
                    <ActivitiesListByFilterDetailpage />
                </ShortlistedExperiencesProvider>
            )
        },
        {
            path: `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/:experienceId`,
            component: ExperienceDetailsPage
        },
        {
            path: `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/:tripId/wishlist`,
            component: ExperiencesWishlistPage
        },
        {
            path: '/flights',
            component: FlightsPage
        },
        {
            path: '/watch-along',
            component: WatchAlongExploreLandingPage
        },
        {
            // moved for sidebarlyout and tripcontext
            path: DEFAULT_PREMIUM_LANDING_PAGE,
            component: PremiumLandingPage
        },
        {
            path: `${RIMIGO_COLLECTION_ROUTE}`,
            component: () => (
                <ShortlistedExperiencesProvider>
                    <ContentListPublicPage />
                </ShortlistedExperiencesProvider>
            )
        },
        {
            path: `${RIMIGO_COLLECTION_ROUTE}/:countryName`,
            component: () => (
                <ShortlistedExperiencesProvider>
                    {' '}
                    <CountryCollectionsPage />
                </ShortlistedExperiencesProvider>
            )
        },
        {
            path: `${RIMIGO_COLLECTION_ROUTE}/:countryName/:identifier`,
            component: () => (
                <ShortlistedExperiencesProvider>
                    {' '}
                    <ViewContentCollection />
                </ShortlistedExperiencesProvider>
            )
        },
        {
            path: `${RIMIGO_COLLECTION_ROUTE}/details/:identifier`,
            component: () => (
                <ShortlistedExperiencesProvider>
                    {' '}
                    <ViewContentCollection />
                </ShortlistedExperiencesProvider>
            )
        },
        {
            path: `${RIMIGO_COLLECTION_ROUTE}/:countryName/:identifier/edit`,
            component: () => (
                <ShortlistedExperiencesProvider>
                    {' '}
                    <EditContentCollection />
                </ShortlistedExperiencesProvider>
            )
        },
        {
            path: `${TRIP_COLLECTION_ROUTE}`,
            component: () => (
                <ShortlistedExperiencesProvider>
                    {' '}
                    <TripContentListPublicPage />
                </ShortlistedExperiencesProvider>
            )
        },
        {
            path: `${CREATOR_COLLECTION_ROUTE}`,
            component: () => (
                <ShortlistedExperiencesProvider>
                    {' '}
                    <CreatorContentListPublicPage />
                </ShortlistedExperiencesProvider>
            )
        }
    ]
}

export { ProtectedWrapper, SemiProtectedWrapper, PublicWrapper }
