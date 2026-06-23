import React, { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface GenericCarouselTopButtonProps {
    title: string
    children: React.ReactNode
    className?: string
    gap?: number
    scrollAmount?: number
    titleIcon?: React.ReactNode | string
    titleClassName?: string
    fontFamily?: 'redhat' | 'caveat'
    titleSize?: '24px' | '28px' | '32px' | '36px' | '40px' | '44px' | '48px'
    caraouselContainerClassName?: string
    showSeeAllButton?: boolean
    onSeeAllClick?: () => void
    /** Desktop nav style. When true, the desktop controls render the compact
     *  variant — a thin scroll-progress line plus small chevron buttons —
     *  instead of the default 40px outlined circles. */
    compactDesktopNav?: boolean
}

const GenericCarouselTopButton: React.FC<GenericCarouselTopButtonProps> = ({
    title,
    children,
    className,
    gap = 16,
    scrollAmount,
    titleIcon,
    titleClassName,
    fontFamily = 'redhat',
    titleSize = '24px',
    caraouselContainerClassName,
    showSeeAllButton = false,
    onSeeAllClick,
    compactDesktopNav = false
}) => {
    const carouselRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const animationFrameRef = useRef<number | null>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)
    const [scrollProgress, setScrollProgress] = useState(0)
    const hasInteractedRef = useRef(false)

    const checkScrollability = useCallback(() => {
        const el = carouselRef.current
        if (!el) return

        const { scrollLeft, scrollWidth, clientWidth } = el
        const threshold = 1

        setCanScrollLeft(scrollLeft > threshold)
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - threshold)

        const maxScroll = scrollWidth - clientWidth

        let progress = 0
        if (maxScroll > 0) {
            if (!hasInteractedRef.current) {
                // Initial prefill only once
                progress = (clientWidth / scrollWidth) * 100
            } else {
                progress = (scrollLeft / maxScroll) * 100
            }
        }

        // Optional: enforce a minimum visible fill (nice UX)
        setScrollProgress(Math.max(progress, 6))
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
        const start = element.scrollLeft
        const distance = target - start
        const duration = 1800 // 1.8 seconds
        const startTime = performance.now()

        // Lenis easing function
        const easing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = easing(progress)

            element.scrollLeft = start + distance * eased

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate)
            } else {
                animationFrameRef.current = null
            }
        }

        animationFrameRef.current = requestAnimationFrame(animate)
    }, [])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            checkScrollability()
        }, 0)

        window.addEventListener('resize', checkScrollability)
        return () => {
            clearTimeout(timeoutId)
            window.removeEventListener('resize', checkScrollability)
        }
    }, [checkScrollability, children])

    const calculateScrollAmount = useCallback(() => {
        if (scrollAmount) return scrollAmount

        if (containerRef.current && containerRef.current.firstElementChild) {
            const firstChild = containerRef.current.firstElementChild as HTMLElement
            const childWidth = firstChild.offsetWidth
            // Scroll by 3 items at once for more content per scroll
            return (childWidth + gap) * 3
        }
        return 900 // Fallback default (3x the previous 300)
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

    useEffect(() => {
        const carousel = carouselRef.current
        if (!carousel) return

        const handleScroll = () => {
            hasInteractedRef.current = true
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
        <div className={cn('w-full', className)}>
            {/* Header with Title and Navigation Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {titleIcon && typeof titleIcon === 'string' ? (
                        <img
                            src={titleIcon}
                            alt={title}
                            className="w-8 h-8"
                        />
                    ) : (
                        titleIcon
                    )}
                    <h2
                        style={{ fontFamily: fontFamily === 'redhat' ? 'Red Hat Display' : 'Caveat' }}
                        className={cn(` font-medium text-[${titleSize}] leading-[${titleSize}] text-grey-0 tracking-[-0.4px]`, titleClassName)}>
                        {title}
                    </h2>
                </div>

                {/* Navigation Buttons - Mobile */}
                <div className="md:hidden pr-5">
                    <div className="w-[80px] h-[4px] bg-grey-4 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-grey-0 rounded-full transition-[width] duration-150"
                            style={{ width: `${scrollProgress}%` }}
                        />
                    </div>
                </div>
                <div className="max-md:hidden flex items-center gap-3 pr-4">
                    {showSeeAllButton && onSeeAllClick && (
                        <button
                            onClick={onSeeAllClick}
                            className="flex items-center gap-[0.5px] text-primary-default hover:text-primary-dark transition-colors cursor-pointer hover:underline">
                            <p className="text-[14px] leading-[18px] font-bold font-red-hat-display text-primary-default">SEE ALL</p>
                            <ChevronRight className="w-4 h-4 text-primary-default" />
                        </button>
                    )}
                    {/* Compact variant: thin scroll-progress line before the
                        small chevrons (matches the curated-collections spec). */}
                    {compactDesktopNav && (
                        <div className="w-[64px] h-[3px] bg-grey-4 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-grey-0 rounded-full transition-[width] duration-150"
                                style={{ width: `${scrollProgress}%` }}
                            />
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            aria-label="Previous"
                            className={cn(
                                'rounded-full bg-white flex items-center justify-center transition-all disabled:cursor-not-allowed',
                                compactDesktopNav
                                    ? 'h-7 w-7 border border-grey-4 hover:bg-grey-5 disabled:opacity-40'
                                    : 'h-10 w-10 border border-grey-0 hover:bg-color-grey-5 disabled:opacity-30',
                                !canScrollLeft && (compactDesktopNav ? 'opacity-40' : 'opacity-30 border-grey-0')
                            )}
                            onClick={() => {
                                scrollLeft()
                                setTimeout(checkScrollability, 150)
                            }}
                            disabled={!canScrollLeft}>
                            <ChevronLeft className={cn(compactDesktopNav ? 'h-4 w-4 text-grey-2' : 'h-5 w-5 text-grey-1')} />
                        </button>
                        <button
                            type="button"
                            aria-label="Next"
                            className={cn(
                                'rounded-full bg-white flex items-center justify-center transition-all disabled:cursor-not-allowed',
                                compactDesktopNav
                                    ? 'h-7 w-7 border border-grey-4 hover:bg-grey-5 disabled:opacity-40'
                                    : 'h-10 w-10 border border-grey-0 hover:bg-grey-5 disabled:opacity-30',
                                !canScrollRight && 'opacity-40'
                            )}
                            onClick={() => {
                                scrollRight()
                                setTimeout(checkScrollability, 150)
                            }}
                            disabled={!canScrollRight}>
                            <ChevronRight className={cn(compactDesktopNav ? 'h-4 w-4 text-grey-2' : 'h-5 w-5 text-grey-1')} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable Container */}
            <div
                ref={carouselRef}
                className={cn(
                    'mt-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
                    caraouselContainerClassName
                )}
                onScroll={checkScrollability}>
                <div
                    ref={containerRef}
                    className="flex items-stretch w-max md:w-full"
                    style={{ gap: `${gap}px` }}>
                    {children}

                    {/* RIGHT-END SPACER (mobile only) */}
                    <div className="w-5 shrink-0 md:hidden" />
                </div>
            </div>

            {/* See All Button - Mobile (below carousel) */}
            {showSeeAllButton && onSeeAllClick && (
                <button
                    onClick={onSeeAllClick}
                    className="md:hidden flex mt-2 mx-auto items-center gap-[0.5px] text-primary-default hover:text-primary-dark transition-colors cursor-pointer hover:underline">
                    <p className="text-[14px] leading-[18px] font-bold font-red-hat-display text-primary-default">SEE ALL</p>
                    <ChevronRight className="w-4 h-4 text-primary-default" />
                </button>
            )}
        </div>
    )
}

export default GenericCarouselTopButton
