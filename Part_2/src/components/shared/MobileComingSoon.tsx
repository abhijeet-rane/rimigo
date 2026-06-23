import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, Home, Route, X, FerrisWheel, BedDouble, CirclePlay } from 'lucide-react'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { getBasicTravelerData } from '@/api/travelerAPI/travelerAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { convertAllTextToUpperCase } from '@/utils/formatTextUtil'
import Typography from '@/components/shared/Typography'
import CustomShimmer from '@/components/shared/Shimmer'
import StripAnimation from '@/modules/Onboarding/components/StripAnimation'
import { MAX_WIDTH } from '@/modules/Onboarding/constants/width'
import { WEBSITE_CONFIG } from '@/constants/websiteConfig'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'
import clsx from 'clsx'

const MobileComingSoon = () => {
    const [travelerIdFromStore, setTravelerIdFromStore] = useState<string | null>(null)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    // Navigation items - all links
    const mobileNavigationItems = [
        {
            title: WEBSITE_CONFIG.TRIPBOOKING_TITLE,
            icon: Home,
            url: DEFAULT_LANDING_PAGE_ROUTE,
            pattern: new RegExp(`^${DEFAULT_LANDING_PAGE_ROUTE}(\\/.*)?$`)
        },
        {
            title: 'Activities',
            icon: FerrisWheel,
            url: '/experiences',
            pattern: /^\/experiences(\/.*)?$/
        },
        {
            title: 'Itinerary',
            icon: Route,
            url: '/itinerary',
            pattern: /^\/itinerary(\/.*)?$/
        },
        {
            title: 'Stays',
            icon: BedDouble,
            url: '/stays',
            pattern: /^\/stays(\/.*)?$/
        },
        {
            title: WEBSITE_CONFIG.WATCHALONG_TITLE,
            icon: CirclePlay,
            url: '/watch-along',
            pattern: /^\/watch-along(\/.*)?$/
        }
    ]

    // Navigation handler
    const handleNavigation = (url: string) => {
        navigate(url)
        setIsMobileOpen(false)
    }

    // Sidebar toggle functions
    const openSidebar = () => {
        setIsMobileOpen(true)
    }

    const closeSidebar = () => {
        setIsMobileOpen(false)
    }

    // Get traveler id from the token storage
    useEffect(() => {
        const fetchTravelerId = async () => {
            try {
                const userInfo = await TokenStorage.getUserInfo()
                setTravelerIdFromStore(userInfo.traveler_id)
            } catch {
                // Failed to get traveler id - silently fail
            }
        }
        fetchTravelerId()
    }, [])

    const { data: travelerBasicData, isLoading: isTravelerBasicDataLoading } = useQuery({
        queryKey: ['travelerBasicData', travelerIdFromStore],
        queryFn: () => getBasicTravelerData(travelerIdFromStore as string),
        enabled: !!travelerIdFromStore,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Get first name from traveler basic data
    const travelerFirstName = travelerBasicData?.data.name?.split(' ')[0]
    const travelerName = convertAllTextToUpperCase(travelerFirstName ?? '')

    return (
        <div
            className="relative flex w-full flex-col items-center justify-center bg-natural-white overflow-hidden h-screen"
            style={{ fontFamily: "'Red Hat Display', sans-serif", height: '100vh' }}>
            {/* Mobile Hamburger */}
            {!isMobileOpen && (
                <div className="fixed top-4 left-4 z-[1000] md:hidden">
                    <button
                        className="h-10 w-10 rounded-full flex justify-center items-center bg-white shadow-md"
                        onClick={openSidebar}>
                        <Menu className="w-6 h-6 text-header-black" />
                    </button>
                </div>
            )}

            {/* Mobile overlay - behind sidebar but above content */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-[40] md:hidden"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <div
                className={clsx(
                    'bg-natural-white z-[50] fixed left-0 top-0 h-full flex flex-col overflow-hidden transition-all duration-300',
                    isMobileOpen ? 'w-[280px] translate-x-0 border-r border-feature-card-border' : 'w-0 -translate-x-full border-0'
                )}>
                {/* Logo Section */}
                <div className="p-4 h-[87.5px] flex items-center">
                    <div className="flex items-center justify-between w-full">
                        <img
                            src="/icons/logo-transparent-indigo.png"
                            alt="Rimigo logo"
                            className="h-12 w-auto object-contain"
                        />
                        <button
                            onClick={closeSidebar}
                            className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-grey-3 shadow-sm">
                            <X className="h-6 w-6 text-header-black" />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 p-2">
                    <nav className="space-y-2">
                        {mobileNavigationItems.map((item) => {
                            const isActive = item.pattern.test(location.pathname)
                            return (
                                <button
                                    key={item.title}
                                    onClick={() => handleNavigation(item.url)}
                                    className={`cursor-pointer min-w-13 w-full flex items-center gap-3 h-13 px-3 py-2 rounded-md ${
                                        isActive ? 'bg-primary-default-80 text-primary-default' : 'text-header-black'
                                    }`}>
                                    <div className="w-7 h-7 flex items-center justify-center">
                                        <item.icon
                                            fill="transparent"
                                            className={`w-6 h-6 ${isActive ? 'text-primary-default' : 'text-header-black'}`}
                                        />
                                    </div>
                                    <span className={`text-md font-medium ${isActive ? 'text-primary-default' : 'text-header-black'}`}>
                                        {item.title}
                                    </span>
                                </button>
                            )
                        })}
                    </nav>
                </div>
            </div>

            {/* Strip Animation at Top */}
            <div className="w-full">
                <StripAnimation />
            </div>

            {/* Main Content */}
            <main className="flex w-full grow flex-col items-center  justify-start px-4">
                <div
                    className="flex w-full flex-col gap-4 px-4"
                    style={{ maxWidth: `${MAX_WIDTH}px`, width: '100%' }}>
                    {/* Greeting */}
                    {isTravelerBasicDataLoading ? (
                        <CustomShimmer
                            height={12}
                            radius={4}
                        />
                    ) : (
                        travelerName && (
                            <div className="flex flex-col gap-1">
                                <Typography
                                    textAlign="left"
                                    size="14"
                                    weight="extrabold"
                                    family="redhat"
                                    color="grey-2">
                                    OOPS {travelerName}!
                                </Typography>
                                <Typography
                                    textAlign="left"
                                    size="15"
                                    weight="extrabold"
                                    family="redhat"
                                    color="grey-2">
                                    We don’t have a mobile site yet.
                                </Typography>
                            </div>
                        )
                    )}

                    {/* Main Heading */}
                    <Typography
                        textAlign="left"
                        size="24"
                        lineHeight="32px"
                        weight="semibold"
                        family="redhat"
                        color="grey-0">
                        Here’s what to do:
                    </Typography>

                    {/* Steps */}
                    <div className="flex flex-col gap-6 mt-2">
                        {/* Step 1 */}
                        <div className="flex items-start gap-4">
                            <div className="shrink-0 w-8 h-8 rounded-full bg-grey-0 flex items-center justify-center">
                                <Typography
                                    size="16"
                                    weight="bold"
                                    family="redhat"
                                    color="natural-white">
                                    1
                                </Typography>
                            </div>
                            <div className="flex flex-col gap-1">
                                <Typography
                                    size="16"
                                    weight="semibold"
                                    family="redhat"
                                    color="grey-0">
                                    Open your laptop / desktop 🖥️
                                </Typography>
                                <Typography
                                    size="14"
                                    weight="normal"
                                    family="manrope"
                                    color="grey-1">
                                    For the best experience and full features.
                                </Typography>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex items-start gap-4">
                            <div className="shrink-0 w-8 h-8 rounded-full bg-grey-0 flex items-center justify-center">
                                <Typography
                                    size="16"
                                    weight="bold"
                                    family="redhat"
                                    color="natural-white">
                                    2
                                </Typography>
                            </div>
                            <div className="flex flex-col gap-1">
                                <Typography
                                    size="16"
                                    weight="semibold"
                                    family="redhat"
                                    color="grey-0">
                                    Visit www.rimigo.com
                                </Typography>
                                <Typography
                                    size="14"
                                    weight="normal"
                                    family="manrope"
                                    color="grey-1">
                                    Open any browser and enter the link above.
                                </Typography>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex items-start gap-4">
                            <div className="shrink-0 w-8 h-8 rounded-full bg-grey-0 flex items-center justify-center">
                                <Typography
                                    size="16"
                                    weight="bold"
                                    family="redhat"
                                    color="natural-white">
                                    3
                                </Typography>
                            </div>
                            <div className="flex flex-col gap-1">
                                <Typography
                                    size="16"
                                    weight="semibold"
                                    family="redhat"
                                    color="grey-0">
                                    Start planning 🧳
                                </Typography>
                                <Typography
                                    size="14"
                                    weight="normal"
                                    family="manrope"
                                    color="grey-1">
                                    Explore hidden gems, shortlist stays & more!
                                </Typography>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer with Gradient */}
            <div className="absolute bottom-[-20px] w-full">
                <img
                    src={'https://media.rimigo.com/1763736161565_15efcb5852f85042950671990770fd89.png'}
                    alt="Gradient Loading"
                    className="w-full h-full"
                />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-20">
                    <Typography
                        size="20"
                        weight="semibold"
                        lineHeight="24px"
                        gradientColors={['var(--color-primary-default)', 'var(--color-primary-dark)']}>
                        Rimigo
                    </Typography>
                </div>
            </div>
        </div>
    )
}

export default MobileComingSoon
