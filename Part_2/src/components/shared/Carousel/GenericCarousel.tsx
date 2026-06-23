import React, { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface GenericCarouselProps {
    children: React.ReactNode
    className?: string
    containerClassName?: string
    gap?: number
    scrollAmount?: number // Amount to scroll per click (in pixels), defaults to calculating from first child
    gradientStartColor?: string
    gradientEndColor?: string
    gradientLeftStartColor?: string
    gradientLeftEndColor?: string

    // gradient styles
    rightGradientStyle?: string
    leftGradientStyle?: string
    scrollControls?: {
        rightScrollArrow?: string
        rightScrollBtn?: string
        leftArrowBtn?: string
        leftScrollBtn?: string
    }
}

const GenericCarousel: React.FC<GenericCarouselProps> = ({
    children,
    className,
    containerClassName,
    gap = 16,
    scrollAmount,

    // gradient colors
    // add here if required
    gradientStartColor,
    gradientEndColor,
    gradientLeftStartColor,
    gradientLeftEndColor,

    // gradient styles
    rightGradientStyle,
    leftGradientStyle,
    scrollControls 
}) => {
    const carouselRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const animationFrameRef = useRef<number | null>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)

    const { rightScrollArrow, rightScrollBtn, leftArrowBtn , leftScrollBtn } = scrollControls ?? {}

    const checkScrollability = useCallback(() => {
        if (carouselRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current
            const threshold = 1 // Small threshold to handle sub-pixel differences
            setCanScrollLeft(scrollLeft > threshold)
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - threshold)
        }
    }, [])

    // Smooth scroll function using Lenis easing
    const smoothScrollTo = useCallback((target: number) => {
        if (!carouselRef.current) return

        // Cancel any ongoing animation
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current)
            animationFrameRef.current = null
        }

        const element = carouselRef.current
        const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth)
        const clampedTarget = Math.max(0, Math.min(target, maxScrollLeft))
        const start = element.scrollLeft
        const distance = clampedTarget - start
        const duration = 1800 // 1.8 seconds
        const startTime = performance.now()

        // Lenis easing function
        const easing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = easing(progress)

            const next = start + distance * eased
            element.scrollLeft = Math.max(0, Math.min(next, maxScrollLeft))

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate)
            } else {
                element.scrollLeft = clampedTarget
                animationFrameRef.current = null
            }
        }

        animationFrameRef.current = requestAnimationFrame(animate)
    }, [])

    useEffect(() => {
        // Use requestAnimationFrame to ensure DOM is fully rendered
        const timeoutId = setTimeout(() => {
            checkScrollability()
        }, 0)

        // Recheck on window resize
        window.addEventListener('resize', checkScrollability)
        return () => {
            clearTimeout(timeoutId)
            window.removeEventListener('resize', checkScrollability)
        }
    }, [checkScrollability, children])

    const calculateScrollAmount = useCallback(() => {
        if (scrollAmount != null) return scrollAmount

        const carousel = carouselRef.current
        const flex = containerRef.current
        if (!carousel || !flex?.firstElementChild) {
            return carousel ? Math.round(carousel.clientWidth * 0.85) : 400
        }

        const firstChild = flex.firstElementChild as HTMLElement
        // getBoundingClientRect avoids some flex/subpixel differences vs offsetWidth across engines
        const childWidth = firstChild.getBoundingClientRect().width
        const byItems = (childWidth + gap) * 3
        
        const pageStep = Math.max(1, Math.round(carousel.clientWidth * 0.85))
        return Math.min(byItems, pageStep)
    }, [scrollAmount, gap])

    const scrollLeft = useCallback(() => {
        if (carouselRef.current) {
            const amount = calculateScrollAmount()
            const currentScroll = carouselRef.current.scrollLeft
            smoothScrollTo(currentScroll - amount)
        }
    }, [calculateScrollAmount, smoothScrollTo])

    const scrollRight = useCallback(() => {
        if (carouselRef.current) {
            const amount = calculateScrollAmount()
            const currentScroll = carouselRef.current.scrollLeft
            smoothScrollTo(currentScroll + amount)
        }
    }, [calculateScrollAmount, smoothScrollTo])

    // Recheck scrollability after scroll animations
    useEffect(() => {
        const carousel = carouselRef.current
        if (!carousel) return

        const handleScroll = () => {
            // Debounce the check slightly
            setTimeout(checkScrollability, 100)
        }

        carousel.addEventListener('scroll', handleScroll)
        return () => {
            carousel.removeEventListener('scroll', handleScroll)
            // Clean up any ongoing animation
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current)
                animationFrameRef.current = null
            }
        }
    }, [checkScrollability])

    return (
        <div className={cn('relative w-full', className)}>
            {/* Left gradient overlay and previous button */}
            {canScrollLeft && (
                <>
                    <div
                        className={cn('max-md:hidden absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none', leftGradientStyle ?? '')}
                        style={{
                            background: `linear-gradient(90deg, ${gradientLeftStartColor ?? 'white'} 0%, ${gradientLeftEndColor ?? 'rgba(255,255,255,0)'} 100%)`
                        }}
                    />
                    <button
                        type="button"
                        aria-label="Scroll previous"
                        className={`max-md:hidden absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full border bg-white shadow-md flex items-center justify-center transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${leftScrollBtn}`}
                        onClick={() => {
                            scrollLeft()
                            setTimeout(checkScrollability, 150)
                        }}
                        disabled={!canScrollLeft}>
                        <ChevronLeft className={`h-5 w-5 text-gray-700 ${leftArrowBtn}`} />
                    </button>
                </>
            )}

            {/* Scrollable container */}
            <div
                ref={carouselRef}
                className={cn(`overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`, containerClassName)}
                style={{
                    // paddingTop: '8px',
                    // paddingBottom: '8px',
                    scrollBehavior: 'auto' // Disable native smooth scroll, we handle it with JS
                }}
                onScroll={checkScrollability}>
                <div
                    ref={containerRef}
                    className="flex flex-row items-start "
                    style={{ gap: `${gap}px` }}>
                    {children}
                </div>
            </div>

            {/* Right gradient overlay and next button */}
            {canScrollRight && (
                <>
                    <div
                        className={cn('max-md:hidden absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none ', rightGradientStyle ?? '')}
                        style={{
                            background: `linear-gradient(270deg, ${gradientStartColor ?? 'white'} 0%, ${gradientEndColor ?? 'white'} 100%)`
                        }}
                    />
                    <button
                        type="button"
                        aria-label="Scroll next"
                        className={`max-md:hidden absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white border shadow-md flex items-center justify-center transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${rightScrollBtn}`}
                        onClick={() => {
                            scrollRight()
                            setTimeout(checkScrollability, 150)
                        }}
                        disabled={!canScrollRight}>
                        <ChevronRight className={`h-6 w-6 text-grey-0 ${rightScrollArrow}`} />
                    </button>
                </>
            )}
        </div>
    )
}

export default GenericCarousel
