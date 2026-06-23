import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ExperienceWithShort } from '../../api/watchAlongApi'
import { extractVideoId } from './utils'

interface ShortsCarouselProps {
    experiences: ExperienceWithShort[]
    initialIndex: number
    hasMore?: boolean
    onLoadMore?: () => void
    isLoadingMore?: boolean
    onIndexChange?: (index: number) => void
}

const ShortsCarousel: React.FC<ShortsCarouselProps> = ({
    experiences,
    initialIndex,
    hasMore = false,
    onLoadMore,
    isLoadingMore = false,
    onIndexChange
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Reset to initial index when it changes
    useEffect(() => {
        setCurrentIndex(initialIndex)
    }, [initialIndex])

    // Scroll to initial index when component mounts or experiences change
    useEffect(() => {
        if (containerRef.current && experiences.length > 0) {
            const container = containerRef.current
            const targetScrollLeft = currentIndex * container.clientWidth
            container.scrollTo({
                left: targetScrollLeft,
                behavior: 'auto'
            })
        }
    }, [currentIndex, experiences.length])

    // Check scrollability
    const checkScrollability = useCallback(() => {
        if (!containerRef.current) return

        const container = containerRef.current
        const { scrollLeft, scrollWidth, clientWidth } = container
        const threshold = 10

        setCanScrollLeft(scrollLeft > threshold)
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - threshold)
    }, [])

    // Handle scroll for snap scrolling
    useEffect(() => {
        if (!containerRef.current || experiences.length === 0) return

        const container = containerRef.current
        let scrollTimeout: NodeJS.Timeout

        const handleScroll = () => {
            clearTimeout(scrollTimeout)
            scrollTimeout = setTimeout(() => {
                const scrollLeft = container.scrollLeft
                const clientWidth = container.clientWidth
                const scrollWidth = container.scrollWidth

                // Calculate which short should be visible based on scroll position
                const newIndex = Math.round(scrollLeft / clientWidth)

                if (newIndex >= 0 && newIndex < experiences.length && newIndex !== currentIndex) {
                    setCurrentIndex(newIndex)
                    onIndexChange?.(newIndex)
                }

                // Check if near right edge and load more
                const distanceFromRight = scrollWidth - scrollLeft - clientWidth
                if (hasMore && onLoadMore && distanceFromRight < 200 && !isLoadingMore) {
                    onLoadMore()
                }

                checkScrollability()
            }, 150)
        }

        container.addEventListener('scroll', handleScroll, { passive: true })
        checkScrollability()

        return () => {
            clearTimeout(scrollTimeout)
            container.removeEventListener('scroll', handleScroll)
        }
    }, [experiences.length, currentIndex, checkScrollability, hasMore, onLoadMore, isLoadingMore, onIndexChange])

    // Snap to current index when it changes
    useEffect(() => {
        if (!containerRef.current || experiences.length === 0) return

        const container = containerRef.current
        const targetScrollLeft = currentIndex * container.clientWidth

        // Only snap if we're not already at the target position
        if (Math.abs(container.scrollLeft - targetScrollLeft) > 10) {
            container.scrollTo({
                left: targetScrollLeft,
                behavior: 'smooth'
            })
        }

        // Update scrollability after scroll
        setTimeout(checkScrollability, 300)
    }, [currentIndex, checkScrollability, experiences.length])

    // Scroll to next/previous short
    const scrollToNext = useCallback(() => {
        if (currentIndex < experiences.length - 1 && containerRef.current) {
            const container = containerRef.current
            const nextScrollLeft = (currentIndex + 1) * container.clientWidth
            container.scrollTo({ left: nextScrollLeft, behavior: 'smooth' })
        }
    }, [currentIndex, experiences.length])

    const scrollToPrevious = useCallback(() => {
        if (currentIndex > 0 && containerRef.current) {
            const container = containerRef.current
            const prevScrollLeft = (currentIndex - 1) * container.clientWidth
            container.scrollTo({ left: prevScrollLeft, behavior: 'smooth' })
        }
    }, [currentIndex])

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' && currentIndex < experiences.length - 1) {
                e.preventDefault()
                const nextIndex = currentIndex + 1
                setCurrentIndex(nextIndex)
                onIndexChange?.(nextIndex)
                if (containerRef.current) {
                    const nextScrollLeft = nextIndex * containerRef.current.clientWidth
                    containerRef.current.scrollTo({ left: nextScrollLeft, behavior: 'smooth' })
                }
            } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault()
                const prevIndex = currentIndex - 1
                setCurrentIndex(prevIndex)
                onIndexChange?.(prevIndex)
                if (containerRef.current) {
                    const prevScrollLeft = prevIndex * containerRef.current.clientWidth
                    containerRef.current.scrollTo({ left: prevScrollLeft, behavior: 'smooth' })
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [currentIndex, experiences.length, onIndexChange])

    if (experiences.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-black relative">
                <div className="flex flex-col items-center justify-center text-white text-center p-8 gap-3">
                    <p className="text-sm font-medium">No videos available</p>
                    <p className="text-xs text-white/70 max-w-xs">Please try another short.</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div
                ref={containerRef}
                className="flex-1 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex">
                {experiences.map((exp, index) => {
                    const expVideoUrl = exp.youtube_short?.url ?? null
                    const expVideoId = expVideoUrl ? extractVideoId(expVideoUrl) : null
                    const expEmbedUrl = expVideoId
                        ? `https://www.youtube.com/embed/${expVideoId}?autoplay=${index === currentIndex ? 1 : 0}&mute=0&controls=1&rel=0&playsinline=1`
                        : null

                    return (
                        <div
                            key={exp.id}
                            className="w-full h-full snap-start flex items-center justify-center bg-black shrink-0"
                            style={{ minWidth: '100%', width: '100%' }}>
                            {expEmbedUrl ? (
                                <iframe
                                    src={index === currentIndex ? expEmbedUrl : undefined}
                                    className="w-full h-full aspect-[9/16] max-w-md"
                                    allow="autoplay; encrypted-media; fullscreen"
                                    allowFullScreen
                                    title={exp.name}
                                    style={{ minHeight: '100%' }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-white text-center p-8 gap-3">
                                    <p className="text-sm font-medium">Unable to load video</p>
                                    <p className="text-xs text-white/70 max-w-xs">
                                        This short is missing its YouTube link. Please try another short.
                                    </p>
                                </div>
                            )}
                        </div>
                    )
                })}

                {/* Loading indicator at right */}
                {isLoadingMore && (
                    <div
                        className="w-full h-full flex items-center justify-center bg-black shrink-0"
                        style={{ minWidth: '100%', width: '100%' }}>
                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {/* Previous Button - Left Side */}
            {canScrollLeft && (
                <button
                    onClick={scrollToPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-grey-3 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110">
                    <ChevronLeft className="w-6 h-6 text-grey-0 hover:text-grey-0" />
                </button>
            )}

            {/* Next Button - Right Side */}
            {canScrollRight && (
                <button
                    onClick={scrollToNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-grey-3 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110">
                    <ChevronRight className="w-6 h-6 text-grey-0 hover:text-grey-0" />
                </button>
            )}

            {/* Short Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium z-20">
                {currentIndex + 1} / {experiences.length}
            </div>

            {/* Scroll Hint */}
            {experiences.length > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs font-medium z-20">
                    Scroll to explore
                </div>
            )}
        </>
    )
}

export default ShortsCarousel
