import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { extractVideoId } from './utils'
import EmptyState from './EmptyState'
import CustomShimmer from '@/components/shared/Shimmer'

interface Short {
    id: string
    url: string
    description?: string
}

interface YouTubeShortsCarouselProps {
    shorts: Short[]
    experienceName: string
    isLoading: boolean
}

const YouTubeShortsCarousel: React.FC<YouTubeShortsCarouselProps> = ({ shorts, experienceName, isLoading }) => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Reset to first short when shorts change
    useEffect(() => {
        setCurrentIndex(0)
    }, [shorts.length])

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
        if (!containerRef.current || shorts.length === 0) return

        const container = containerRef.current
        let scrollTimeout: NodeJS.Timeout

        const handleScroll = () => {
            clearTimeout(scrollTimeout)
            scrollTimeout = setTimeout(() => {
                const scrollLeft = container.scrollLeft
                const clientWidth = container.clientWidth

                // Calculate which short should be visible based on scroll position
                const newIndex = Math.round(scrollLeft / clientWidth)

                if (newIndex >= 0 && newIndex < shorts.length && newIndex !== currentIndex) {
                    setCurrentIndex(newIndex)
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
    }, [shorts.length, currentIndex, checkScrollability])

    // Snap to current index when it changes
    useEffect(() => {
        if (!containerRef.current || shorts.length === 0) return

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
    }, [currentIndex, checkScrollability, shorts.length])

    // Scroll to next/previous short
    const scrollToNext = useCallback(() => {
        if (currentIndex < shorts.length - 1 && containerRef.current) {
            const container = containerRef.current
            const nextScrollLeft = (currentIndex + 1) * container.clientWidth
            container.scrollTo({ left: nextScrollLeft, behavior: 'smooth' })
        }
    }, [currentIndex, shorts.length])

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
            if (e.key === 'ArrowRight' && currentIndex < shorts.length - 1) {
                e.preventDefault()
                setCurrentIndex((prev) => prev + 1)
                if (containerRef.current) {
                    const nextScrollLeft = (currentIndex + 1) * containerRef.current.clientWidth
                    containerRef.current.scrollTo({ left: nextScrollLeft, behavior: 'smooth' })
                }
            } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault()
                setCurrentIndex((prev) => prev - 1)
                if (containerRef.current) {
                    const prevScrollLeft = (currentIndex - 1) * containerRef.current.clientWidth
                    containerRef.current.scrollTo({ left: prevScrollLeft, behavior: 'smooth' })
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [currentIndex, shorts.length])

    if (isLoading) {
        // Calculate height based on 9:16 aspect ratio for typical max-w-md (384px)
        // height = (width * 16) / 9
        const videoHeight = Math.round((384 * 16) / 9) // ~682px

        return (
            <div className="flex-1 flex items-center justify-center bg-black relative">
                {/* Video Player Shimmer - Maintains aspect-9/16 ratio */}
                <div className="w-full max-w-md flex items-center justify-center">
                    <CustomShimmer
                        height={videoHeight}
                        radius={0}
                        className="w-full max-w-md"
                    />
                </div>
            </div>
        )
    }

    if (shorts.length === 0) {
        return (
            <EmptyState
                title="No video available"
                description="This experience doesn't have a short video yet. Check back later!"
                className="flex-1 text-white"
            />
        )
    }

    return (
        <>
            <div
                ref={containerRef}
                className="flex-1 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex">
                {shorts.map((short, index) => {
                    const videoId = short.url ? extractVideoId(short.url) : null
                    const embedUrl = videoId
                        ? `https://www.youtube.com/embed/${videoId}?autoplay=${index === currentIndex ? 1 : 0}&mute=0&controls=1&rel=0&playsinline=1`
                        : null

                    return (
                        <div
                            key={short.id}
                            className="w-full h-full snap-start flex items-center justify-center bg-black shrink-0"
                            style={{ minWidth: '100%', width: '100%' }}>
                            {embedUrl ? (
                                <iframe
                                    src={index === currentIndex ? embedUrl : undefined}
                                    className="w-full h-full aspect-9/16 max-w-md "
                                    allow="autoplay; encrypted-media; fullscreen"
                                    allowFullScreen
                                    title={experienceName || 'Experience Short'}
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
            </div>

            {/* Previous Button - Left Side */}
            {canScrollLeft && shorts.length > 1 && (
                <button
                    onClick={scrollToPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 md:z-[10001] pointer-events-auto w-12 h-12 rounded-full bg-white flex items-center justify-center">
                    <ChevronLeft className="w-6 h-6 text-grey-0" />
                </button>
            )}

            {/* Next Button - Right Side */}
            {canScrollRight && shorts.length > 1 && (
                <button
                    onClick={scrollToNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 md:z-[10001] pointer-events-auto w-12 h-12 rounded-full bg-white flex items-center justify-center">
                    <ChevronRight className="w-6 h-6 text-grey-0" />
                </button>
            )}

            {/* Short Counter */}
            {shorts.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium z-20">
                    {currentIndex + 1} / {shorts.length}
                </div>
            )}

            {/* Scroll Hint */}
            {shorts.length > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs font-medium z-20">
                    Scroll to explore
                </div>
            )}
        </>
    )
}

export default YouTubeShortsCarousel
