import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ExperienceWithShort } from '../api/watchAlongApi'

interface ShortCardProps {
    experience: ExperienceWithShort
    onClick?: (experience: ExperienceWithShort) => void
}

// Extract video ID from YouTube Shorts URL
const extractVideoId = (url: string): string | null => {
    // Handle YouTube Shorts format: https://www.youtube.com/shorts/VIDEO_ID
    const shortsMatch = url.match(/youtube\.com\/shorts\/([^/?&]+)/)
    if (shortsMatch && shortsMatch[1]) {
        return shortsMatch[1]
    }

    // Handle regular YouTube URLs
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
}

const ShortCard: React.FC<ShortCardProps> = ({ experience, onClick }) => {
    const { youtube_short, display_props, name, city_name } = experience
    const videoUrl = youtube_short?.url ?? null
    const videoId = videoUrl ? extractVideoId(videoUrl) : null

    const thumbnailOptions = useMemo(() => {
        const urls: string[] = []

        if (videoId) {
            urls.push(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)
            urls.push(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)
            urls.push(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`)
        }

        if (display_props?.landscape_image) {
            urls.push(display_props.landscape_image)
        }

        // Remove duplicates and empty values
        return Array.from(new Set(urls.filter((url) => Boolean(url))))
    }, [videoId, display_props?.landscape_image])

    const [thumbnailIndex, setThumbnailIndex] = useState(0)

    useEffect(() => {
        setThumbnailIndex(0)
    }, [thumbnailOptions])

    const handleImageError = useCallback(() => {
        setThumbnailIndex((prev) => {
            if (prev < thumbnailOptions.length - 1) {
                return prev + 1
            }
            return prev
        })
    }, [thumbnailOptions.length])

    const currentThumbnail = thumbnailOptions[thumbnailIndex]

    const handleCardClick = () => {
        onClick?.(experience)
    }

    return (
        <motion.div
            layout
            className="rounded-2xl overflow-hidden border border-feature-card-border hover:shadow-lg transition-shadow bg-natural-white flex flex-col cursor-pointer h-full group shrink-0 w-[280px]"
            onClick={handleCardClick}>
            {/* Thumbnail Section - Shorts are typically 9:16 aspect ratio */}
            <div className="relative aspect-[9/16] overflow-hidden bg-grey_5">
                {currentThumbnail ? (
                    <img
                        src={currentThumbnail}
                        alt={name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={handleImageError}
                    />
                ) : (
                    <div className="w-full h-full bg-grey_5 flex items-center justify-center text-xs text-grey-grey_2">No preview available</div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg
                            className="w-8 h-8 text-primary-default ml-1"
                            fill="currentColor"
                            viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-4 flex-1 flex flex-col">
                {/* Title */}
                <h3 className="text-sm font-semibold text-header-black font-red-hat-display line-clamp-2 mb-1">{name}</h3>

                {/* City Name */}
                {city_name && <p className="text-xs text-grey-grey_2 font-red-hat-display">{city_name}</p>}
            </div>
        </motion.div>
    )
}

export default ShortCard
