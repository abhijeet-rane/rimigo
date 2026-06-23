import React, { useEffect, useState } from 'react'
// import { AnimatePresence, motion } from 'framer-motion'
import { Walkthrough1, WALKTHROUGH_TEXTS } from '../constants/walkthrough'
import LogoRimigoIconText from './LogoRimigoIconText'

// const AUTO_CAROUSEL_DELAY = 3000

// ---------------------------------------------------------------------------
// Responsive hook
// ---------------------------------------------------------------------------
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768 || window.innerHeight < 600)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])
    return isMobile
}



const TOTAL_SLIDES = 3
export interface DesktopLeftPanelContentProps {
    /** Controlled index from parent. If undefined, component self-manages. */
    currentIndex?: number
    /** Called when the panel wants to change slide (dot click). */
    onIndexChange?: (index: number) => void
    /** Direction hint from parent (+1 next / -1 prev). */
    direction?: number
}

const DesktopLeftPanelContent: React.FC<DesktopLeftPanelContentProps> = ({
    // Carousel props unused - only one walkthrough now
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    currentIndex: _externalIndex,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onIndexChange: _onIndexChange,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    direction: _externalDirection,
}) => {
    const isMobile = useIsMobile()

    // Internal state — used only when parent doesn't control the carousel
    // const [internalIndex, setInternalIndex] = useState(0)
    // const [internalDirection, setInternalDirection] = useState(0)
    // const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    // const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // const isControlled = externalIndex !== undefined
    // const currentIndex = isControlled ? externalIndex : internalIndex
    // const direction = isControlled ? (externalDirection ?? 0) : internalDirection
    const currentIndex = 0 // Only one walkthrough now

    const walkthroughs = [
        <Walkthrough1 key={0} isMobile={isMobile} />,
        // <Walkthrough2 key={1} isMobile={isMobile} />,
        // <Walkthrough3 key={2} isMobile={isMobile} />,
    ]

    // ---- carousel logic (only used in uncontrolled mode) ----
    // const handleNext = () => {
    //     setInternalDirection(1)
    //     setInternalIndex((prev) => (prev === TOTAL_SLIDES - 1 ? 0 : prev + 1))
    //     pauseAutoCarousel()
    // }

    // const pauseAutoCarousel = () => {
    //     if (intervalRef.current) clearInterval(intervalRef.current)
    //     if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current)
    //     pauseTimeoutRef.current = setTimeout(startAutoCarousel, AUTO_CAROUSEL_DELAY)
    // }

    // const startAutoCarousel = () => {
    //     intervalRef.current = setInterval(handleNext, AUTO_CAROUSEL_DELAY)
    // }

    // Only run the internal auto-carousel when uncontrolled
    // useEffect(() => {
    //     if (isControlled) return
    //     startAutoCarousel()
    //     return () => {
    //         if (intervalRef.current) clearInterval(intervalRef.current)
    //         if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current)
    //     }
    // }, [isControlled])

    // const handleDotClick = (index: number) => {
    //     if (index === currentIndex) return
    //     const dir = index > currentIndex ? 1 : -1
    //     if (isControlled) {
    //         onIndexChange?.(index)
    //     } else {
    //         setInternalDirection(dir)
    //         setInternalIndex(index)
    //         pauseAutoCarousel()
    //     }
    // }

    // ---- animation ----
    // const variants = {
    //     enter: (dir: number) => ({ x: dir > 0 ? 150 : -150, opacity: 0 }),
    //     center: { x: 0, opacity: 1 },
    //     exit: (dir: number) => ({ x: dir < 0 ? 150 : -150, opacity: 0 }),
    // }

    const currentText = WALKTHROUGH_TEXTS[currentIndex]

    return (
        <div className="flex flex-col h-fit self-start lg:self-stretch lg:h-full w-full px-4 md:px-6">

            {/* ── Logo ── */}
            <LogoRimigoIconText text="Rimigo" />


            {/* ── Carousel area ── */}
            <div className="flex flex-col items-center justify-center md:gap-20 pt-9 md:pt-0 relative md:py-4 lg:flex-1 lg:h-full">

                {/* Slide container */}
                <div
                    className="relative w-full flex items-center justify-center overflow-hidden"
                    style={{ height: isMobile ? '' : '380px' }}
                >
                    {/* Carousel animation commented out - only one walkthrough now */}
                    {/* <AnimatePresence custom={direction}>
                        <motion.div
                            key={currentIndex}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: 'spring', stiffness: 200, damping: 30 },
                                opacity: { duration: 0.3 },
                            }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            {walkthroughs[currentIndex]}
                        </motion.div>
                    </AnimatePresence> */}
                    <div className="flex items-center justify-center">
                        {walkthroughs[currentIndex]}
                    </div>
                </div>

                {/* ── Headline ── */}
                <div className="hidden lg:flex flex-col gap-1 items-center px-4 mt-3 md:mt-0">
                    <p className="font-red-hat-display font-medium text-white text-center leading-snug text-2xl md:text-3xl">
                        {currentText.mainText}
                        <span className="italic" style={{ color: '#ffd800' }}>
                            {currentText.highlightedText}
                        </span>
                        {currentText.mainTextAfter && ` ${currentText.mainTextAfter}`}
                    </p>
                </div>

                {/* ── Dots ── */}
                {/* Carousel dots commented out - only one walkthrough now */}
                {/* <div className="flex flex-row gap-1.5 py-5 md:pb-8">
                    {walkthroughs.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => handleDotClick(i)}
                            className={`h-1 rounded-full transition-all cursor-pointer ${
                                i === currentIndex ? 'bg-[#ffd800] w-6' : 'bg-white/40 w-4'
                            }`}
                        />
                    ))}
                </div> */}
            </div>
        </div>
    )
}

export { TOTAL_SLIDES }
export default DesktopLeftPanelContent