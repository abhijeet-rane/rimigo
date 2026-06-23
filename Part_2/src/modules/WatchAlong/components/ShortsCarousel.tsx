import React, { useRef, useEffect, useState } from 'react'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import ShortCard from './ShortCard'
import { ExperienceWithShort } from '../api/watchAlongApi'
import { extractVideoIdFromUrl } from '@/pages/Landing/hooks/useWatchAlongShorts'
import { ListingShortThumbnail } from '@/pages/Landing/Components/ListingShortThumbnail'

interface ShortsCarouselProps {
    experiences: ExperienceWithShort[]
    onShortClick: (index: number) => void
    hasMore?: boolean
    onLoadMore?: () => void
    isLoadingMore?: boolean
    useShortThumbnail?: boolean
    gradientStartColor?: string
    gradientEndColor?: string
}

const ShortsCarousel: React.FC<ShortsCarouselProps> = ({
    experiences,
    onShortClick,
    hasMore = false,
    onLoadMore,
    isLoadingMore = false,
    useShortThumbnail = false,
    gradientStartColor,
    gradientEndColor
}) => {
    const lastItemRef = useRef<HTMLDivElement | null>(null)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null)

    useEffect(() => {
        if (!hasMore || !onLoadMore || isLoadingMore || experiences.length === 0) {
            // Clean up existing observer
            if (observerRef.current && lastItemRef.current) {
                observerRef.current.unobserve(lastItemRef.current)
                observerRef.current.disconnect()
                observerRef.current = null
            }
            return
        }

        const current = lastItemRef.current
        if (!current) return

        // Clean up existing observer before creating a new one
        if (observerRef.current) {
            observerRef.current.disconnect()
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries
                if (entry?.isIntersecting && hasMore && !isLoadingMore && onLoadMore) {
                    onLoadMore()
                }
            },
            {
                root: null,
                rootMargin: '200px',
                threshold: 0.1
            }
        )

        observerRef.current = observer
        observer.observe(current)

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect()
                observerRef.current = null
            }
        }
    }, [hasMore, onLoadMore, isLoadingMore, experiences.length, useShortThumbnail])

    return (
        <div>
            <GenericCarousel
                gradientStartColor={gradientStartColor}
                gradientEndColor={gradientEndColor}
                gradientLeftStartColor={gradientStartColor}
                gradientLeftEndColor={gradientEndColor}
                className="">
                {experiences
                    .map((experience, originalIndex) => {
                        const videoId = useShortThumbnail ? extractVideoIdFromUrl(experience.youtube_short?.url) : null
                        return { experience, originalIndex, videoId }
                    })
                    .filter(({ videoId }) => !useShortThumbnail || videoId !== null)
                    .map(({ experience, originalIndex, videoId }, filteredIndex, filteredArray) => {
                        const isLastItem = filteredIndex === filteredArray.length - 1

                        return (
                            <div
                                key={experience.id}
                                ref={isLastItem ? lastItemRef : null}
                                className={useShortThumbnail ? 'shrink-0 w-[180px]' : 'shrink-0 w-[280px] h-full'}>
                                {useShortThumbnail && videoId ? (
                                    <ListingShortThumbnail
                                        videoId={videoId}
                                        isPlaying={activeVideoId === videoId}
                                        onToggle={() => {
                                            setActiveVideoId((prev) => (prev === videoId ? null : videoId))
                                        }}
                                        onClick={() => onShortClick(originalIndex)}
                                    />
                                ) : (
                                    <ShortCard
                                        experience={experience}
                                        onClick={() => onShortClick(originalIndex)}
                                    />
                                )}
                            </div>
                        )
                    })}
                {/* Loading indicator */}
                {isLoadingMore && (
                    <div className={`shrink-0 ${useShortThumbnail ? 'w-[180px]' : 'w-[280px]'} h-full flex items-center justify-center`}>
                        <div className="w-8 h-8 border-4 border-grey_4 border-t-primary-default rounded-full animate-spin"></div>
                    </div>
                )}
            </GenericCarousel>
        </div>
    )
}

export default ShortsCarousel
