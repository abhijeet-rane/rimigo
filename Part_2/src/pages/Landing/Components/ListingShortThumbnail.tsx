import { PlayIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useCallback } from 'react'

interface ListingShortThumbnailProps {
    videoId: string
    isPlaying: boolean
    onToggle: () => void
    onClick?: () => void
}

export const ListingShortThumbnail: React.FC<ListingShortThumbnailProps> = ({ videoId, isPlaying, onToggle, onClick }) => {
    const thumbnailOptions = useMemo(() => {
        const urls: string[] = []
        if (videoId) {
            urls.push(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)
            urls.push(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)
            urls.push(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`)
        }
        return urls.filter((url) => Boolean(url))
    }, [videoId])

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

    if (isPlaying) {
        return (
            <div
                className="relative aspect-9/16 rounded-lg overflow-hidden shadow-md group w-full"
                onClick={onClick}>
                <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`}
                    title="YouTube video player"
                    className="w-full h-full pointer-events-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggle()
                    }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80 transition-colors z-10">
                    ✕
                </button>
            </div>
        )
    }

    const handleThumbnailClick = () => {
        // If onClick is provided, open modal; otherwise fall back to toggle
        if (onClick) {
            onClick()
        } else {
            onToggle()
        }
    }

    return (
        <div
            className="relative aspect-9/16 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group w-full"
            onClick={handleThumbnailClick}>
            {currentThumbnail ? (
                <img
                    src={currentThumbnail}
                    alt="YouTube Short thumbnail"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={handleImageError}
                />
            ) : (
                <div className="w-full h-full bg-grey-5 flex items-center justify-center text-xs text-grey-grey_2">No preview</div>
            )}

            {/* Static Play Icon (always visible) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <PlayIcon className="w-10 h-10 text-white drop-shadow-lg " fill='white' />
            </div>

            {/* Hover background only */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
        </div>
    )
}
