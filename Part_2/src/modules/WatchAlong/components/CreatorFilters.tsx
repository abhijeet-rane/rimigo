import React, { useMemo } from 'react'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import { TravelContent } from '../api/watchAlongApi'
import { cn } from '@/lib/utils'

export interface Creator {
    channelTitle: string
    channelId?: string
    imageUrl: string
}

interface CreatorFiltersProps {
    videos: TravelContent[]
    selectedCreator: string | null
    onCreatorSelect: (channelTitle: string | null) => void
}

const CreatorFilters: React.FC<CreatorFiltersProps> = ({ videos, selectedCreator, onCreatorSelect }) => {
    // Extract unique creators from videos
    const creators = useMemo(() => {
        const creatorMap = new Map<string, Creator>()

        videos.forEach((video) => {
            const channelTitle = video.meta_data.channel_title
            if (!channelTitle) return

            // Use channel_title as key, or channel_id if available
            const key = video.meta_data.channel_id || channelTitle

            // Only add if not already in map
            if (!creatorMap.has(key)) {
                const imageUrl =
                    video.meta_data.channel_thumbnails?.default ??
                    video.meta_data.channel_thumbnails?.high ??
                    video.meta_data.channel_thumbnails?.medium ??
                    ''

                creatorMap.set(key, {
                    channelTitle,
                    channelId: video.meta_data.channel_id,
                    imageUrl
                })
            }
        })

        return Array.from(creatorMap.values())
    }, [videos])

    if (creators.length === 0) {
        return null
    }

    return (
        <GenericCarousel
            gap={16}
            className="w-full h-full ">
            {/* "All" option */}
            <button
                type="button"
                onClick={() => onCreatorSelect(null)}
                className={cn(
                    'flex flex-col items-center gap-2 flex-shrink-1 py-1   cursor-pointer transition-transform hover:scale-105 pl-2',
                    !selectedCreator && 'scale-105'
                )}>
                <div
                    className={cn(
                        'w-16 h-16 rounded-full border-2 flex items-center justify-center',
                        'bg-gradient-to-br from-[var(--color-primary-light)] via-[var(--color-primary-default)] to-[var(--color-primary-dark)]',
                        !selectedCreator ? 'border-primary-default ring-2 ring-primary-default ring-offset-2' : 'border-transparent'
                    )}>
                    <span className="text-white text-xs font-bold font-red-hat-display">ALL</span>
                </div>
                <span
                    className={cn(
                        'text-[12px] font-red-hat-display whitespace-nowrap',
                        !selectedCreator ? 'text-primary-default font-semibold' : 'text-header-black'
                    )}>
                    All Creators
                </span>
            </button>

            {/* Creator items */}
            {creators.map((creator) => {
                const isSelected = selectedCreator === creator.channelTitle
                return (
                    <button
                        key={creator.channelId || creator.channelTitle}
                        type="button"
                        onClick={() => onCreatorSelect(creator.channelTitle)}
                        className="flex flex-col items-center gap-2 py-1 flex-shrink-0 cursor-pointer transition-transform hover:scale-105">
                        <div
                            className={cn(
                                'w-16 h-16 rounded-full overflow-hidden',
                                isSelected
                                    ? 'border-2 p-0.5 bg-gradient-to-br from-[var(--color-primary-light)] via-[var(--color-primary-default)] to-[var(--color-primary-dark)] ring-2 ring-primary-default ring-offset-2'
                                    : 'border-0'
                            )}>
                            {creator.imageUrl ? (
                                <img
                                    src={creator.imageUrl}
                                    alt={creator.channelTitle}
                                    className="w-full h-full rounded-full object-cover"
                                    onError={(e) => {
                                        // Fallback to gradient if image fails to load
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        if (target.parentElement) {
                                            target.parentElement.className = target.parentElement.className.replace('p-0.5', '')
                                        }
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-[var(--color-primary-light)] via-[var(--color-primary-default)] to-[var(--color-primary-dark)] flex items-center justify-center">
                                    <span className="text-white text-lg font-bold font-red-hat-display">
                                        {creator.channelTitle.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                        <span
                            className={cn(
                                'text-[12px] font-red-hat-display whitespace-nowrap max-w-[80px] truncate',
                                isSelected ? 'text-primary-default font-semibold' : 'text-header-black'
                            )}
                            title={creator.channelTitle}>
                            {creator.channelTitle}
                        </span>
                    </button>
                )
            })}
        </GenericCarousel>
    )
}

export default CreatorFilters
