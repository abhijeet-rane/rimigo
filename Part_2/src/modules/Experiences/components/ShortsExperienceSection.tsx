import React from 'react'
import { ExperienceWithShort } from '@/modules/WatchAlong/api/watchAlongApi'
import ShortsCarousel from '@/modules/WatchAlong/components/ShortsCarousel'
import { cn } from '@/lib/utils'

interface ShortsExperienceSectionProps {
    experiences: ExperienceWithShort[]
    isLoading?: boolean
    hasMore?: boolean
    isLoadingMore?: boolean
    onLoadMore?: () => void
    onShortClick?: (index: number) => void
    containerClassName?: string
    titleClassName?: string
    headerContent?: React.ReactNode
}

const ShortsExperienceSection: React.FC<ShortsExperienceSectionProps> = ({
    experiences,
    isLoading = false,
    hasMore = false,
    isLoadingMore = false,
    onLoadMore,
    onShortClick,
    containerClassName,
    titleClassName,
    headerContent
}) => {
    if (isLoading && experiences.length === 0) {
        return (
            <div className={cn('container mx-auto mt-4 px-4 sm:px-6 lg:px-0 py-6', containerClassName)}>
                {headerContent ? (
                    headerContent
                ) : (
                    <h2 className={cn('text-2xl font-bold mb-4', titleClassName)}>Explore places, from real travelers</h2>
                )}
                <div className="flex gap-4 overflow-x-auto px-4">
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
        <div className={cn('container mx-auto mt-4 px-4 sm:px-6 lg:px-0 py-6', containerClassName)}>
            {headerContent ? (
                headerContent
            ) : (
                <div className="flex items-center justify-between">
                    <h2 className={cn('text-xl font-bold text-header-black font-red-hat-display mb-4', titleClassName)}>
                        Explore places, from real travelers
                    </h2>
                    <p>Explore more</p>
                </div>
            )}
            <div className="px-4">
                <ShortsCarousel
                    experiences={experiences}
                    // @ts-expect-error - onShortClick is optional
                    onShortClick={onShortClick}
                    hasMore={hasMore}
                    onLoadMore={onLoadMore}
                    isLoadingMore={isLoadingMore}
                />
            </div>
        </div>
    )
}

export default ShortsExperienceSection
