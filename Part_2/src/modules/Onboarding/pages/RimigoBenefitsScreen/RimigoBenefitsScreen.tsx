import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_TRIP_ONBOARDING_ROUTE } from '@/routes/routes'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { isDevMode } from '@/lib/config/config'
import PhoneLoginCard from '../../components/PhoneLoginCard'
import DesktopLeftPanelContent, { TOTAL_SLIDES } from '../../components/DesktopLeftPanelComponent'

const AUTO_CAROUSEL_DELAY = 3000
const MIN_SWIPE_DISTANCE = 50

const RimigoBenefitsScreen = () => {
    const navigate = useNavigate()

    // ── Carousel state (lifted here so swipe can drive it) ──────────────────
    const [currentIndex, setCurrentIndex] = useState(0)
    const [direction, setDirection] = useState(0)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // ── Swipe tracking ───────────────────────────────────────────────────────
    const touchStartX = useRef<number | null>(null)
    const touchStartY = useRef<number | null>(null)
    const touchEndX = useRef<number | null>(null)

    // ── Auth check ───────────────────────────────────────────────────────────
    useEffect(() => {
        const checkTokenAuth = async () => {
            try {
                const isLoggedIn = await TokenStorage.isLoggedIn()
                if (!isLoggedIn) {
                    TokenStorage.clear()
                    return
                }
                navigate(DEFAULT_TRIP_ONBOARDING_ROUTE, { replace: true })
            } catch (error) {
                if (isDevMode) {
                    // eslint-disable-next-line no-console
                    console.error('Error checking token storage auth:', error)
                }
                TokenStorage.clear()
            }
        }
        checkTokenAuth()
    }, [navigate])

    // ── Carousel helpers ─────────────────────────────────────────────────────
    const goTo = (index: number, dir: number) => {
        setDirection(dir)
        setCurrentIndex(index)
    }

    const goNext = () => {
        goTo(currentIndex === TOTAL_SLIDES - 1 ? 0 : currentIndex + 1, 1)
        pauseAutoCarousel()
    }

    const goPrev = () => {
        goTo(currentIndex === 0 ? TOTAL_SLIDES - 1 : currentIndex - 1, -1)
        pauseAutoCarousel()
    }

    const startAutoCarousel = () => {
        intervalRef.current = setInterval(goNext, AUTO_CAROUSEL_DELAY)
    }

    const pauseAutoCarousel = () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current)
        pauseTimeoutRef.current = setTimeout(startAutoCarousel, AUTO_CAROUSEL_DELAY)
    }

    useEffect(() => {
        startAutoCarousel()
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
            if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current)
        }
    }, [currentIndex]) // restart interval whenever index changes so goNext closure stays fresh

    // ── Touch / swipe handlers ───────────────────────────────────────────────
    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX
        touchStartY.current = e.targetTouches[0].clientY
        touchEndX.current = null
    }

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX
    }

    const onTouchEnd = () => {
        if (touchStartX.current === null || touchEndX.current === null) return

        const deltaX = touchStartX.current - touchEndX.current
        const isLeftSwipe = deltaX > MIN_SWIPE_DISTANCE // finger moved left → next slide
        const isRightSwipe = deltaX < -MIN_SWIPE_DISTANCE // finger moved right → prev slide

        if (isLeftSwipe) goNext()
        else if (isRightSwipe) goPrev()

        touchStartX.current = null
        touchStartY.current = null
        touchEndX.current = null
    }

    // Dot click handler — passed to the panel
    const handleIndexChange = (index: number) => {
        goTo(index, index > currentIndex ? 1 : -1)
        pauseAutoCarousel()
    }

    return (
        <div className="min-h-screen w-full bg-white flex flex-col">
            {/*
             * Purple gradient panel — this is also the swipe target.
             * The touch handlers live here so the whole panel is swipeable,
             * not just the image.
             */}
            <div
                className="flex justify-center items-start flex-none lg:flex-1 relative
                            onboarding-gradient
                            shadow-[0px_2px_8px_0px_#7011F63D]
                            select-none pb-8" // prevents text selection during swipe
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}>
                {/*
                 * Panel is now "controlled" — we pass currentIndex, direction,
                 * and onIndexChange so it stays in sync with our swipe state.
                 */}
                <DesktopLeftPanelContent
                    currentIndex={currentIndex}
                    direction={direction}
                    onIndexChange={handleIndexChange}
                />
            </div>

            {/* Login card — sits below the gradient panel; on mobile fills remaining space so terms can stick to bottom */}
            <div className="w-full flex-1 flex flex-col min-h-0 md:flex-initial">
                <div className="bg-natural-white rounded-t-[32px] w-full flex-1 flex flex-col min-h-0 md:flex-initial">
                    <PhoneLoginCard
                        variant="embedded"
                        className="!bg-natural-white"
                    />
                </div>
            </div>
        </div>
    )
}

export default RimigoBenefitsScreen
