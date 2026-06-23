import { useState, createContext, useContext, useRef, useEffect } from 'react'
import { matchPath, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
    BedDouble,
    Menu,
    SquareLibrary,
    FerrisWheel,
    LucideIcon,
    ChevronLeft,
    ShoppingBag,
    Plane,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import OrchestrationInProgressBanner from '@/modules/Tripboard/components/OrchestrationInProgressBanner'
import { TokenStorage } from '@/lib/api/tokenStorage'
import TripCreationFlow from '@/components/common/TripCreationFlow'
import clsx from 'clsx'
import { TravelerProfileModal } from '@/modules/Onboarding/modals/TravelerProfilePage'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { SidebarNavigation } from './SidebarNavigation'
import { SidebarTripsNav } from './SidebarTripsNav'
import UserAvatar from '../shared/UserAvatar'
import {
    USER_TYPE_RIMIGO_INTERNAL,
    USER_TYPE_RIMIGO_PREMIUM,
    USER_TYPE_PRO,
} from '@/constants/userConfig'
import { toast } from 'sonner'
import { BOOKINGS_ROUTE, DEFAULT_LANDING_PAGE_ROUTE, DEFAULT_PREMIUM_LANDING_PAGE, PURCHASES_ROUTE } from '@/routes/routes'
import { useTripFlagsMap } from '@/hooks/useTripFlags'
import { useLocationPersonalization } from '@/hooks/useLocationPersonalization'
import { useIsMobile } from '@/hooks/use-mobile'
import { useHideOnScrollDown } from '@/hooks/useHideOnScrollDown'
import { ExploreNavButton } from '../ExploreNavButton'

// Sidebar Context
//
// Layout contract (collapsed rail):
//   Desktop default is a 69px collapsed rail that contains ONLY the hamburger
//   button at the top and the UserAvatar pinned at the bottom. The rest of the
//   nav (My Trips / Tripboards / Purchases / Stays / Activities / Flights /
//   Collections / Explore label) only renders when the drawer is expanded
//   (`!isCollapsed || isMobileOpen`). Pages that need page-specific icons in
//   the rail inject them via `setRailExtra` — see Itinerary for the canonical
//   example. Keeps the rail minimal and avoids forking SideBarLayout per page.
interface SidebarContextType {
    isSidebarOpen: boolean
    openSidebar: () => void
    closeSidebar: () => void
    toggleSidebar: () => void
    isTripCreationOpen: boolean
    hideHamburger: boolean
    setHideHamburger: (v: boolean) => void
    /** Fully hides the collapsed sidebar rail (69px) and its left-padding gutter
     *  so pages can render at full viewport width. Used by immersive flows like
     *  /tripboard/create. Distinct from `hideHamburger`, which only hides the
     *  mobile menu button. */
    hideSidebar: boolean
    setHideSidebar: (v: boolean) => void
    /** Page-provided content rendered below the hamburger in the collapsed rail. */
    railExtra: React.ReactNode
    setRailExtra: (node: React.ReactNode) => void
}
const SidebarContext = createContext<SidebarContextType | null>(null)

export const useSidebarContext = () => {
    const context = useContext(SidebarContext)
    return (
        context ?? {
            isSidebarOpen: false,
            hideHamburger: false,
            setHideHamburger: () => {},
            hideSidebar: false,
            setHideSidebar: () => {},
            isTripCreationOpen: false,
            openSidebar: () => {},
            closeSidebar: () => {},
            toggleSidebar: () => {},
            railExtra: null,
            setRailExtra: () => {}
        }
    )
}

interface ExploreNavItem {
    title: string
    collapsedTitle: string
    icon: LucideIcon
    url: string
    pathPrefix: string
    requiresInternal?: boolean
    hidden?: boolean
}
interface SideBarLayoutProps {
    children?: React.ReactNode
}


export function SideBarLayout({ children }: SideBarLayoutProps) {
    const location = useLocation()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { isAuthenticated } = useAuth()
    const [hideHamburger, setHideHamburger] = useState(false)
    const [hideSidebar, setHideSidebar] = useState(false)

    const [isCollapsed, setIsCollapsed] = useState(true)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [isTripCreationOpen, setIsTripCreationOpen] = useState(false)
    const [railExtra, setRailExtra] = useState<React.ReactNode>(null)
    const [countryMismatchInfo, setCountryMismatchInfo] = useState<{ countryId: string; countryName: string } | null>(null)
    const [userInfo, setUserInfo] = useState<{ name: string; phone?: string; type?: string; traveler_id?: string } | null>(null)
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const checkedCountryIdRef = useRef<string | null>(null)
    const checkCountryMismatch = searchParams.get('checkCountryMismatch')
    const { trackButtonClickCustom } = usePostHog()
    const isPremium = userInfo?.type === USER_TYPE_RIMIGO_PREMIUM
    const isPro = userInfo?.type === USER_TYPE_PRO
    const isRimigoInternal = userInfo?.type === USER_TYPE_RIMIGO_INTERNAL

    const navigationItems = [
        // "My Trips" is rendered inline via SidebarTripsNav (not a standard nav item)
        {
            title: 'Influencer Tripboards',
            icon: SquareLibrary,
            url: '/tripboards',
            pattern: /^\/tripboards(\/.*)?$/,
        },
        {
            title: 'Purchases',
            icon: ShoppingBag,
            url: PURCHASES_ROUTE,
            pattern: /^\/purchases(\/.*)?$/,
            requiresAuth: true,
        },
    ]

    const exploreNavItems: ExploreNavItem[] = [
        {
            title: 'Stays',
            collapsedTitle: 'Stays',
            icon: BedDouble,
            url: '/stays',
            pathPrefix: '/stays',
        },
        {
            title: 'Activities',
            collapsedTitle: 'Activities',
            icon: FerrisWheel,
            url: '/experiences',
            pathPrefix: '/experiences',
        },
        {
            title: 'Flights',
            collapsedTitle: 'Flights',
            icon: Plane,
            url: '/flights',
            pathPrefix: '/flights',
        },
        {
            title: 'Public Collections',
            collapsedTitle: 'Collections',
            icon: SquareLibrary,
            url: '/rimigo-collection',
            pathPrefix: '/rimigo-collection',
            requiresInternal: true,
        },
    ]

    const { countries } = useLocationPersonalization()
    const tripsList = travelerTripsContext?.tripsData?.trips || []
    const tripFlagsMap = useTripFlagsMap(tripsList, countries)

    const isPremiumPage = location.pathname === DEFAULT_PREMIUM_LANDING_PAGE

    // Load user info
    useEffect(() => {
        const loadUserInfo = async () => {
            try {
                const info = await TokenStorage.getUserInfo()
                setUserInfo({ name: info?.name, phone: info?.phone, type: info?.type, traveler_id: info?.traveler_id })
            } catch (error) {
                toast.error((error as Error).message || 'Failed to load user info')
            }
        }
        loadUserInfo()
    }, [])


    // Check if country from URL is not in active trip and open flow
    useEffect(() => {
        // Only check on landing route
        if (location.pathname !== DEFAULT_LANDING_PAGE_ROUTE) {
            checkedCountryIdRef.current = null
            return
        }

        const countryIdFromURL = searchParams.get('country_id')
        const countryNameFromURL = searchParams.get('country_name')

        // If no country in URL, reset and don't check
        if (!countryIdFromURL || !countryNameFromURL) {
            checkedCountryIdRef.current = null
            setIsTripCreationOpen(false)
            return
        }

        // Only check once per country
        if (checkedCountryIdRef.current === countryIdFromURL) {
            return
        }

        // Only proceed if user is authenticated
        if (!isAuthenticated) {
            checkedCountryIdRef.current = null
            setIsTripCreationOpen(false)
            return
        }

        // Wait for trip data to load before checking
        // If trips are still loading/hydrating, don't check yet
        if (travelerTripsContext?.isLoading || travelerTripsContext?.isHydrating) {
            return
        }

        // Check if country is in active trip
        if (activeTrip) {
            const tripCountryIds = activeTrip.final_destination_countries?.map((c) => c.id) || []
            if (tripCountryIds.includes(countryIdFromURL)) {
                // Country IS in trip - close modal and mark as checked
                setIsTripCreationOpen(false)
                checkedCountryIdRef.current = countryIdFromURL
            } else {
                // Country is NOT in trip - check if user has any trips
                const hasAnyTrips = (travelerTripsContext?.tripsData?.trips?.length ?? 0) > 0
                if (hasAnyTrips && checkCountryMismatch != 'false') {
                    // User has trips - show mismatch step to switch or add
                    setCountryMismatchInfo({ countryId: countryIdFromURL, countryName: countryNameFromURL })
                    setIsTripCreationOpen(true)
                } else {
                    // User has no trips
                    setIsTripCreationOpen(false)
                }
                checkedCountryIdRef.current = countryIdFromURL
            }
        } else {
            // No active trip - check if user has any trips
            const hasAnyTrips = (travelerTripsContext?.tripsData?.trips?.length ?? 0) > 0
            if (hasAnyTrips) {
                // User has trips but no active trip - show mismatch step to switch
                setCountryMismatchInfo({ countryId: countryIdFromURL, countryName: countryNameFromURL })
                setIsTripCreationOpen(true)
            } else {
                // User has no trips at all
                setIsTripCreationOpen(false)
            }
            checkedCountryIdRef.current = countryIdFromURL
        }
    }, [location.pathname, searchParams, isAuthenticated, activeTrip, travelerTripsContext?.isLoading, travelerTripsContext?.isHydrating])

    // Close sidebar when navigating to bookings (similar to other navigation items)
    useEffect(() => {
        if (location.pathname.startsWith(BOOKINGS_ROUTE) || location.pathname.startsWith(PURCHASES_ROUTE)) {
            setIsMobileOpen(false)
            setIsCollapsed(true)
        }
    }, [location.pathname])

    // Navigation handler
    const handleNavigation = (url: string, title?: string) => {
        // Track sidebar navigation event
        trackButtonClickCustom({
            buttonPage: 'sidebar_v1',
            buttonName: `side_bar_navigation:${title ?? 'unknown'}`,
            buttonAction: 'click'
        })

        // Check authentication - redirect to login if not authenticated (except for landing page)
        const publicRoutes = [DEFAULT_LANDING_PAGE_ROUTE]
        const isPublicRoute = publicRoutes.some((route) => url === route || url.startsWith(`${route}/`))

        if (!isAuthenticated && !isPublicRoute) {
            const redirectUrl = url
            navigate(`/login?redirectTo=${encodeURIComponent(redirectUrl)}`)
            setIsMobileOpen(false)
            setIsCollapsed(true)
            return
        }

        navigate(url)
        setIsMobileOpen(false)
        setIsCollapsed(true)
    }

    // Sidebar toggle functions
    const openSidebar = () => {
        setIsMobileOpen(true)
        setIsCollapsed(false)
        trackButtonClickCustom({
            buttonPage: 'sidebar_v1',
            buttonName: 'sidebar_open',
            buttonAction: 'open'
        })
    }

    const closeSidebar = () => {
        setIsMobileOpen(false)
        setIsCollapsed(true)
        trackButtonClickCustom({
            buttonPage: 'sidebar_v1',
            buttonName: 'sidebar_close',
            buttonAction: 'close'
        })
    }
    const toggleSidebar = () => {
        if (window.innerWidth < 768) {
            setIsMobileOpen((prev) => !prev)
            setIsCollapsed((prev) => !prev)
        } else {
            setIsCollapsed((prev) => !prev)
        }
    }
    const toggleCollapse = () => {
        if (isPremiumPage) {
            // for preimum page no collapsed
            setIsMobileOpen(false)
            setIsCollapsed(true)
            return
        }
        if (window.innerWidth < 768) {
            setIsMobileOpen(false)
            setIsCollapsed(true)
        } else {
            setIsCollapsed(!isCollapsed)
        }
    }
    const hideMenuRoutes = ['/logout', '/profile/update', '/trip/:tripId/destinations', '/trip/:trip_id/create/:stepId']

    const shouldHideMenu = hideMenuRoutes.some((path) => matchPath({ path, end: false }, location.pathname))

    // Fade the mobile hamburger out when the user scrolls down the page
    // (mobile only) so the top of the screen feels less cluttered while
    // browsing the list. Reveals on scroll-up, same smooth easing as the
    // tripboard header chrome.
    const isMobileViewport = useIsMobile()
    const hideOnScrollDown = useHideOnScrollDown()
    const hideMobileHamburger = isMobileViewport && hideOnScrollDown

    // const collapsedWidth = 'clamp(60px, 5vw, 88px)'
    // const expandedWidth = 'clamp(220px, 13vw, 270px)'
    // const sidebarWidth = isCollapsed ? collapsedWidth : expandedWidth
    // const contentWidth = `calc(100% - ${sidebarWidth})`

    return (
        <div className="flex w-full bg-natural-white overflow-hidden z-[1000] max-lg:h-[100dvh] lg:h-screen">
            {/* Mobile Hamburger */}
            {!isMobileOpen && !shouldHideMenu && !hideHamburger && !hideSidebar && (
                <div
                    style={{
                        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                        transitionDuration: hideMobileHamburger ? '450ms' : '350ms',
                        transitionProperty: 'opacity'
                    }}
                    className={clsx(
                        'fixed top-4 left-4 z-1000 md:hidden',
                        hideMobileHamburger
                            ? 'opacity-0 pointer-events-none'
                            : 'opacity-100'
                    )}>
                    <button
                        className="h-10 w-10 rounded-full flex justify-center items-center bg-white border border-grey-4"
                        onClick={openSidebar}>
                        <Menu className="w-5 h-5 text-grey-0" />
                    </button>
                </div>
            )}

            {/* Sidebar — fully hidden (rail and all) when hideSidebar is set. */}
            <div
                className={clsx(
                    'bg-natural-white z-1000 fixed md:fixed h-full flex flex-col transition-all duration-300 ease-in-out',
                    hideSidebar
                        ? 'w-0 overflow-hidden -translate-x-full pointer-events-none'
                        : isCollapsed && !isMobileOpen
                        ? isPremiumPage
                            ? 'w-0 overflow-hidden -translate-x-full'
                            : 'w-0 md:w-[69px] overflow-hidden md:overflow-visible border-r border-feature-card-border'
                        : 'w-70 md:w-[312px] overflow-hidden shadow-xl shadow-black/5',
                    !hideSidebar && (isMobileOpen ? 'translate-x-0' : isPremiumPage ? '-translate-x-full' : '-translate-x-full md:translate-x-0')
                )}>
                {/* Logo / header row */}
                <div
                    className={clsx(
                        'shrink-0 flex h-[72px] min-h-[72px]',
                        isCollapsed
                            ? 'w-full border-b border-feature-card-border p-0'
                            : 'items-center justify-between px-2.5 py-4'
                    )}>
                    {isCollapsed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={toggleCollapse}
                                    className="hidden md:flex h-[72px] w-full items-center justify-center bg-white text-grey-0 transition-colors hover:bg-grey-5 active:bg-grey-4/60 cursor-pointer"
                                    aria-label="Open sidebar">
                                    <Menu className="h-6 w-6" strokeWidth={2.25} aria-hidden />
                                </button>
                            </TooltipTrigger>
                        </Tooltip>
                    ) : (
                        <>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    className="shrink-0 w-12 h-12 flex items-center justify-center transition-colors duration-200">
                                    <img
                                        src="/icons/compass.png"
                                        alt="Rimigo"
                                        className="h-10 w-auto object-contain"
                                    />
                                </button>
                                <div className="flex items-center gap-1.5 animate-fade-in">
                                    <img
                                        src="/icons/logo-transparent-rimigo-text.png"
                                        alt="Rimigo"
                                        className="h-8 w-auto object-contain"
                                    />
                                    {isPremium && (
                                        <span className="bg-[rgba(112,17,246,0.16)] rounded-sm px-[7px] py-[2px] text-[9px] font-bold text-primary-default tracking-wider">
                                            PREMIUM
                                        </span>
                                    )}
                                    {isPro && (
                                        <span className="bg-[rgba(112,17,246,0.16)] rounded-sm px-[7px] py-[2px] text-[9px] font-bold text-primary-default tracking-wider">
                                            PRO
                                        </span>
                                    )}
                                    {isRimigoInternal && (
                                        <span className="bg-[rgba(112,17,246,0.16)] rounded-sm px-[7px] py-[2px] text-[9px] font-bold text-primary-default tracking-wider">
                                            INTERNAL
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={toggleCollapse}
                                className="w-10 h-10 rounded-[10px] bg-grey-5 hover:bg-grey-4 flex items-center justify-center transition-colors duration-200 cursor-pointer shrink-0">
                                <ChevronLeft className="h-5 w-5 text-grey-1" />
                            </button>
                        </>
                    )}
                </div>

                {/*
                    Short mobile (< 768px width, < 560px height): single scrollable list
                    Otherwise (desktop + tall mobile): nav scrolls independently, footer pinned
                */}
                <div className="flex-1 flex flex-col overflow-hidden [@media(max-width:767px)_and_(max-height:559px)]:overflow-y-auto [@media(max-width:767px)_and_(max-height:559px)]:scrollbar-hide">
                    {/*
                        Collapsed rail (desktop): render ONLY page-injected icons below the
                        hamburger. All app-level nav (Trips / Tripboards / Purchases / Explore
                        / Premium CTA) is reachable via the hamburger-triggered drawer.
                    */}
                    {isCollapsed && !isMobileOpen ? (
                        <div className="flex-1 flex flex-col items-center pt-2 overflow-y-auto scrollbar-hide">
                            {railExtra}
                        </div>
                    ) : (
                        <div className="flex-1 pt-2 overflow-y-auto scrollbar-hide px-2.5 [@media(max-width:767px)_and_(max-height:559px)]:flex-none [@media(max-width:767px)_and_(max-height:559px)]:overflow-visible">
                            <nav className="flex flex-col space-y-2">

                                {/* My Trips — inline nav item with dropdown */}
                                {isAuthenticated && (
                                    <SidebarTripsNav
                                        isCollapsed={isCollapsed}
                                        activeTripId={travelerTripsContext?.activeTripId}
                                        tripsList={tripsList}
                                        tripFlagsMap={tripFlagsMap}
                                        isRimigoInternal={isRimigoInternal}
                                        onSelectTrip={(tripId) => {
                                            trackButtonClickCustom?.({
                                                buttonPage: 'sidebar_trip_selector',
                                                buttonName: 'select_trip',
                                                buttonAction: 'click',
                                                extra: { selectedTripId: tripId }
                                            })
                                            travelerTripsContext?.updateActiveTrip?.(tripId)
                                            navigate(`/tripboard/${tripId}`)
                                        }}
                                        onCreateTrip={() => {
                                            trackButtonClickCustom?.({
                                                buttonPage: 'sidebar_trip_selector',
                                                buttonName: 'create_new_trip',
                                                buttonAction: 'click'
                                            })
                                            navigate('/tripboard/new?create=true')
                                            closeSidebar()
                                        }}
                                        onNavigateToTripboard={() => {
                                            navigate('/tripboard')
                                        }}
                                        onExpandSidebar={() => {
                                            setIsMobileOpen(false)
                                            setIsCollapsed(false)
                                        }}
                                    />
                                )}

                                {/* In-flight tripboard creation: let the user jump back when they've navigated away */}
                                {isAuthenticated && !isCollapsed && (
                                    <OrchestrationInProgressBanner className="mx-1" />
                                )}

                                {/* My Purchases, Wishlist */}
                                {isAuthenticated && (
                                    <SidebarNavigation
                                        navigationItems={navigationItems}
                                        isCollapsed={isCollapsed}
                                        onNavigate={handleNavigation}
                                    />
                                )}
                            </nav>
                        </div>
                    )}
                    {/* Trip Selector & Footer — pinned by default, flows naturally on short mobile */}
                    <div className="mt-auto shrink-0 [@media(max-width:767px)_and_(max-height:559px)]:mt-0 [@media(max-width:767px)_and_(max-height:559px)]:shrink">
                    {!isCollapsed && (
                        <p className="px-6 text-[12px] font-red-hat-display font-[759] text-grey-2 uppercase tracking-[4%]">
                        Explore
                        </p>
                    )}

                    {/*
                        Explore nav items are only shown in the expanded drawer. In the
                        collapsed rail, the hamburger + page-injected `railExtra` (and the
                        pinned UserAvatar below) are all that show.
                    */}
                    {(!isCollapsed || isMobileOpen) && (
                        <div className={clsx('flex flex-col mt-2 pb-2', isCollapsed ? 'items-center gap-1.5' : 'gap-2 px-2.5')}>
                            {exploreNavItems
                                .filter(item => !item.hidden && (!item.requiresInternal || isRimigoInternal))
                                .map(item => (
                                    <ExploreNavButton
                                        key={item.url}
                                        title={item.title}
                                        collapsedTitle={item.collapsedTitle}
                                        icon={item.icon}
                                        isCollapsed={isCollapsed}
                                        isActive={location.pathname.startsWith(item.pathPrefix)}
                                        onNavigate={() => handleNavigation(item.url, item.title)}
                                    />
                                ))
                            }
                        </div>
                    )}

                    {/* Premium CTA */}
                    {/* {isAuthenticated && !isPremium && !isRimigoInternal && (
                        <div className={clsx('flex items-center', isCollapsed ? 'px-2.5 py-1.5 justify-center' : 'px-3 py-2')}>
                            {!isCollapsed ? (
                                <button
                                    onClick={() => handleNavigation(DEFAULT_PREMIUM_LANDING_PAGE, 'Premium CTA')}
                                    className="min-w-full cursor-pointer rounded-xl bg-primary-pale-purple px-3 py-3 transition-colors duration-200 hover:bg-primary-pale-purple/80 animate-fade-in">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center">
                                                <span className="text-[13px] font-bold text-grey-0 whitespace-nowrap">Need help planning?</span>
                                                <img src="https://media.rimigo.com/1770899618293_Group 364.png" alt="Premium" className="w-7 h-7 shrink-0" />
                                            </div>
                                            <p className="text-[12px] font-[600] text-grey-2 mt-0.5 leading-snug text-left whitespace-nowrap font-manrope font-medium leading-[14px] ">
                                            Our travel experts handle your entire 
                                            </p>
                                            <p className="text-[12px] font-[600] text-grey-2 leading-snug text-left whitespace-nowrap font-manrope font-medium leading-[14px]" >
                                            trip from start to finish.
                                            </p>
                                        </div>
                                        <ArrowUpRight className="w-4 h-4 text-grey-2 shrink-0 mt-0.5 ml-2 text-primary-default" />
                                    </div>
                                </button>
                            ) : (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => handleNavigation(DEFAULT_PREMIUM_LANDING_PAGE, 'Premium CTA')}
                                            className="w-12 h-12 rounded-xl hover:bg-grey-5 flex items-center justify-center transition-colors duration-200 cursor-pointer animate-fade-in">
                                            <img src="https://media.rimigo.com/1770899618293_Group 364.png" alt="Premium" className="w-8 h-8" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="right"
                                        sideOffset={8}
                                        className="bg-grey-0 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg">
                                        Need help planning?
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    )} */}

                    {/* User Profile */}
                    {isAuthenticated && (
                        <>
                            <div
                                className={clsx(
                                    'cursor-pointer border-t border-feature-card-border transition-colors duration-200 bg-grey-5',
                                    isCollapsed ? 'px-2.5 py-3 pb-4' : 'px-3 py-3 pb-4'
                                )}
                                onClick={() => setIsProfileModalOpen(true)}>
                                <div className={clsx('flex items-center', isCollapsed ? 'justify-center' : 'gap-3')}>
                                    {isCollapsed ? (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div>
                                                    <UserAvatar
                                                        isPremium={isPremium}
                                                        isPro={isPro}
                                                        isRimigoInternal={isRimigoInternal}
                                                        name={userInfo?.name ?? ''}
                                                        size="sm"
                                                    />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent
                                                side="right"
                                                sideOffset={8}
                                                className="bg-grey-0 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg">
                                                {userInfo?.name || 'Profile'}
                                            </TooltipContent>
                                        </Tooltip>
                                    ) : (
                                        <>
                                            <UserAvatar
                                                isPremium={isPremium}
                                                isRimigoInternal={isRimigoInternal}
                                                name={userInfo?.name ?? ''}
                                            />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[14px] font-red-hat-display font-semibold text-grey-0 truncate">{userInfo?.name || 'Traveler'}</span>
                                                {userInfo?.phone && <span className="text-xs font-[500] text-grey-2 leading-[18px] font-manrope truncate">{userInfo.phone}</span>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Traveler Profile Modal */}
                            <TravelerProfileModal
                                isOpen={isProfileModalOpen}
                                onClose={() => setIsProfileModalOpen(false)}
                                isPremium={isPremium}
                                isPro={isPro}
                            />

                            {/* Mobile overlay when modal is open */}
                            {isProfileModalOpen && window.innerWidth < 768 && (
                                <div
                                    className="fixed inset-0 bg-black/30 z-200"
                                    onClick={() => setIsProfileModalOpen(false)}
                                />
                            )}
                        </>
                    )}
                    </div>
                </div>

                <TripCreationFlow
                    isOpen={isTripCreationOpen}
                    onClose={() => {
                        setIsTripCreationOpen(false)
                        setCountryMismatchInfo(null)
                    }}
                    onSuccess={() => {
                        setIsTripCreationOpen(false)
                        setCountryMismatchInfo(null)
                        if (isPremiumPage) {
                            navigate(DEFAULT_LANDING_PAGE_ROUTE)
                        }
                    }}
                    // Pass route dynamically
                    navigateOnSuccess={isPremiumPage ? DEFAULT_LANDING_PAGE_ROUTE : undefined}
                    countryMismatchInfo={countryMismatchInfo}
                />
            </div>

            {/* Overlay */}
            {(!isCollapsed || isMobileOpen) && (
                <div
                    className="fixed inset-0 z-900 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300"
                    onClick={closeSidebar}
                />
            )}

            {/* Main Content */}

            <div
                id={isPremiumPage ? 'premium-scroll-container' : undefined}
                className={clsx(
                    'flex-1 overflow-x-hidden overflow-y-auto relative transition-all duration-300',
                    hideSidebar
                        ? 'md:pl-0'
                        : isPremiumPage
                        ? 'md:pl-0' // padding left removed for premium page
                        : 'md:pl-[69px]'
                )}>
                <SidebarContext.Provider
                    value={{
                        isSidebarOpen: !isCollapsed || isMobileOpen,
                        openSidebar,
                        closeSidebar,
                        toggleSidebar,
                        isTripCreationOpen,
                        hideHamburger,
                        setHideHamburger,
                        hideSidebar,
                        setHideSidebar,
                        railExtra,
                        setRailExtra
                    }}>
                    {children}
                </SidebarContext.Provider>
            </div>
        </div>
    )
}
