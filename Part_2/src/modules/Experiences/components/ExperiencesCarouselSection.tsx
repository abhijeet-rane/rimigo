import React, { useEffect, useRef } from 'react'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import ExperienceCard from './ExperienceCard'
import { ExperienceCardData } from '../types/experienceCardTypes'
import { cn } from '@/lib/utils'
import { Wand } from 'lucide-react'

interface ExperiencesCarouselSectionProps {
    title: string
    experiences: ExperienceCardData[]
    isLoading?: boolean
    hasNextPage?: boolean
    isFetchingNextPage?: boolean
    onFetchNextPage?: () => void
    onExperienceClick?: (id: string) => void
    onToggleShortlist?: (experienceId: string) => Promise<void> | void
    shortlistState?: Record<string, { experienceId: string; isShortlisted: boolean }>
    shortlistLoadingIds?: Record<string, boolean>
    containerClassName?: string
    titleClassName?: string
    carouselClassName?: string
    headerContent?: React.ReactNode
    gradientStartColor?: string
    gradientEndColor?: string
    renderExperienceCard?: (experience: ExperienceCardData) => React.ReactNode
}

const ExperiencesCarouselSection: React.FC<ExperiencesCarouselSectionProps> = ({
    title,
    experiences,
    isLoading = false,
    hasNextPage = false,
    isFetchingNextPage = false,
    onFetchNextPage,
    onExperienceClick,
    onToggleShortlist,
    shortlistState = {},
    shortlistLoadingIds = {},
    containerClassName,
    titleClassName,
    carouselClassName,
    headerContent,
    gradientStartColor,
    gradientEndColor,
    renderExperienceCard
}) => {
    const lastItemRef = useRef<HTMLDivElement>(null)

    // Use IntersectionObserver to detect when last item is visible for pagination
    useEffect(() => {
        if (!hasNextPage || isFetchingNextPage || !onFetchNextPage || experiences.length === 0) return

        const observer = new IntersectionObserver(
            (entries) => {
                const lastEntry = entries[0]
                if (lastEntry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    onFetchNextPage()
                }
            },
            {
                root: null,
                rootMargin: '200px', // Trigger 200px before the element is visible
                threshold: 0.1
            }
        )

        const currentLastItem = lastItemRef.current
        if (currentLastItem) {
            observer.observe(currentLastItem)
        }

        return () => {
            if (currentLastItem) {
                observer.unobserve(currentLastItem)
            }
        }
    }, [hasNextPage, isFetchingNextPage, onFetchNextPage, experiences.length])

    if (isLoading && experiences.length === 0) {
        return (
            <div className={cn('container mx-auto px-4 sm:px-6 lg:px-0 py-6 border-b border-grey-4', containerClassName)}>
                {headerContent ? headerContent : <h2 className={cn('text-2xl font-bold mb-4', titleClassName)}>{title}</h2>}
                <div className="flex gap-4 overflow-x-auto">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="min-w-[280px] h-[350px] bg-gray-200 animate-pulse rounded-lg"
                        />
                    ))}
                </div>
            </div>
        )
    }

    if (experiences.length === 0) {
        return null
    }

    return (
        <div className={cn('container mx-auto mt-4 px-4 sm:px-6 lg:px-0 py-6 ', containerClassName)}>
            {headerContent ? (
                headerContent
            ) : (
                <h2 className={cn('text-2xl font-bold italic flex items-center gap-2', titleClassName)}>
                    <Wand className="w-4 h-4 text-primary-default" /> {title}
                </h2>
            )}
            <GenericCarousel
                gap={16}
                className={cn('w-full px-4', carouselClassName)}
                gradientStartColor={gradientStartColor}
                gradientEndColor={gradientEndColor}>
                {experiences.map((experience, index) => {
                    const experienceId = experience.id
                    const shortlistEntry = shortlistState[experienceId]
                    const isShortlisted = shortlistEntry?.isShortlisted ?? false
                    const isShortlisting = Boolean(shortlistLoadingIds[experienceId])
                    const isLastItem = index === experiences.length - 1

                    return (
                        <div
                            key={experience.id}
                            ref={isLastItem ? lastItemRef : null}
                            className="shrink-0 w-[280px]">
                            {renderExperienceCard ? (
                                renderExperienceCard(experience)
                            ) : (
                                <ExperienceCard
                                    experience={experience}
                                    onClick={onExperienceClick}
                                    isShortlisted={isShortlisted}
                                    onToggleShortlist={onToggleShortlist ? () => onToggleShortlist(experienceId) : undefined}
                                    isShortlisting={isShortlisting}
                                />
                            )}
                        </div>
                    )
                })}
                {/* Loading indicator for pagination */}
                {isFetchingNextPage && (
                    <div className="shrink-0 w-[280px] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-default"></div>
                    </div>
                )}
            </GenericCarousel>
        </div>
    )
}

export default ExperiencesCarouselSection
