import React, { useState } from 'react'
import { Play, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { extractVideoId } from '@/modules/Acitvities/components/SneakPeakModal/utils'

export interface YouTubeShort {
    id: string
    url: string
}

interface YouTubeShortsRowProps {
    shorts: YouTubeShort[]
    /** Used as the iframe title for accessibility. */
    title?: string
    /** Card width — accepts any CSS value. Defaults to a responsive 40vw capped at 180px. */
    cardWidth?: string | number
    /** Aspect ratio of each card. Defaults to '9 / 16' (vertical shorts). */
    aspectRatio?: string
    className?: string
    containerClassName?: string
    /**
     * When provided, tapping a thumbnail calls this with the clicked index
     * instead of swapping the card to an inline autoplay iframe. Used by
     * the mobile sneak peek to launch the reels-style viewer.
     */
    onPlayClick?: (index: number) => void
}

/** Horizontal, snap-scrolling row of YouTube shorts. Tap a thumbnail and the same
 *  card swaps to an autoplaying iframe in-place — no modal, no new tab. Only one
 *  card plays at a time. */
const YouTubeShortsRow: React.FC<YouTubeShortsRowProps> = ({
    shorts,
    title,
    cardWidth = '40vw',
    aspectRatio = '9 / 16',
    className,
    containerClassName,
    onPlayClick
}) => {
    const [playingId, setPlayingId] = useState<string | null>(null)

    if (!shorts?.length) return null

    return (
        <div className={cn('px-3 pb-1 pt-1', className)}>
            <div
                className={cn(
                    'flex gap-3 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
                    containerClassName
                )}>
                {shorts.map((short, index) => {
                    const videoId = short.url ? extractVideoId(short.url) : null
                    if (!videoId) return null
                    const isPlaying = !onPlayClick && playingId === short.id
                    const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`
                    return (
                        <div
                            key={short.id}
                            className="relative shrink-0 snap-start overflow-hidden rounded-2xl bg-grey-5"
                            style={{ width: cardWidth, maxWidth: typeof cardWidth === 'string' ? 180 : undefined, aspectRatio }}>
                            {isPlaying ? (
                                <>
                                    <iframe
                                        src={embedUrl}
                                        title={title || 'YouTube Short'}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="absolute inset-0 h-full w-full"
                                        frameBorder="0"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setPlayingId(null)}
                                        aria-label="Close video"
                                        className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
                                        <X
                                            size={14}
                                            className="text-white"
                                        />
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onPlayClick) {
                                            onPlayClick(index)
                                        } else {
                                            setPlayingId(short.id)
                                        }
                                    }}
                                    aria-label="Play video"
                                    className="absolute inset-0 h-full w-full">
                                    <img
                                        src={thumb}
                                        alt={title || 'Video thumbnail'}
                                        className="absolute inset-0 h-full w-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/30" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Play
                                            size={36}
                                            className="text-white fill-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] ml-0.5"
                                        />
                                    </div>
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default YouTubeShortsRow
