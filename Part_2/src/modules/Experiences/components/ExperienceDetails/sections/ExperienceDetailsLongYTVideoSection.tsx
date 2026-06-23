import { useState } from 'react'
import { TriangleAlert, Wand, Play } from 'lucide-react'

import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import { Card } from '@/components/ui/card'
import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import SectionTitle from '@/components/shared/Sections/SectionTitle'
import SectionDescription from '@/components/SectionDescription'

const Pill = ({ title }: { title: string }) => {
    return (
        <div className="relative rounded-[20px] bg-tomato-200 whitespace-nowrap  flex items-center py-1 px-[5px]  gap-1.5 text-left text-xs text-tomato-100 font-manrope   bg-secondary-orange-80 ">
            <TriangleAlert className="w-4 h-4 text-secondary-orange" />
            <div className="relative tracking-[-0.01em] font-medium text-secondary-orange">{title}</div>
        </div>
    )
}

const SECTION_DESCRIPTION = 'Watch curated videos from fellow travellers for a glimpse of what to expect.'

const formatVideoInputForUI = (youtubeVideos: { id: string; url: string; description: string }[]) => {
    return youtubeVideos.map((video) => {
        const url = video.url.trim()
        let videoId = ''
        let startTime = ''

        // Match YouTube watch URLs
        const watchMatch = url.match(/[?&]v=([^&]+)/)
        if (watchMatch) {
            videoId = watchMatch[1]
        }

        // Match shortened youtu.be URLs
        const shortMatch = url.match(/youtu\.be\/([^?]+)/)
        if (shortMatch) {
            videoId = shortMatch[1]
        }

        // Extract time parameter
        const timeMatch = url.match(/[?&]t=(\d+)/)
        if (timeMatch) {
            startTime = `?start=${timeMatch[1]}`
        }

        // Generate thumbnail URL
        const thumbnailUrl = videoId
            ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            : 'https://via.placeholder.com/1280x720?text=Video+Thumbnail'

        // Fallback: if already an embed URL, try to extract video ID
        if (url.includes('/embed/')) {
            const embedMatch = url.match(/\/embed\/([^?&]+)/)
            if (embedMatch) {
                videoId = embedMatch[1]
            }
            // Build embed URL with autoplay
            const separator = url.includes('?') ? '&' : '?'
            return {
                id: video.id,
                title: video.description,
                videoId: videoId || '',
                embedUrl: url,
                embedUrlWithAutoplay: `${url}${separator}autoplay=1`,
                thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : thumbnailUrl,
                originalUrl: video.url
            }
        }

        // Build embed URL properly
        const embedBaseUrl = `https://www.youtube.com/embed/${videoId}`
        const embedUrl = startTime ? `${embedBaseUrl}${startTime}` : embedBaseUrl
        const embedUrlWithAutoplay = startTime ? `${embedBaseUrl}${startTime}&autoplay=1` : `${embedBaseUrl}?autoplay=1`

        return {
            id: video.id,
            title: video.description,
            videoId,
            originalUrl: video.url,
            embedUrl,
            embedUrlWithAutoplay,
            thumbnailUrl
        }
    })
}

export function ExperienceDetailsLongYTVideoSection({ youtubeVideos }: { youtubeVideos: { id: string; url: string; description: string }[] }) {
    // slice the youtube videos to 3
    const formattedVideoInputForUI = formatVideoInputForUI(youtubeVideos)
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)

    if (formattedVideoInputForUI.length === 0) {
        return null
    }

    const handleThumbnailClick = (videoId: string) => {
        setPlayingVideoId(videoId)
    }

    return (
        <GenericCard className="w-full max-w-7xl mx-auto p-4">
            <div className=" flex items-center justify-between pb-1">
                <SectionTitle title="In-depth experience" />
                <Pill title="May contain spoilers" />
            </div>

            {/* long description */}
            <div className="">
                <SectionDescription
                    className="text-left"
                    description={SECTION_DESCRIPTION}
                />
            </div>

            {/* Carousel content */}
            <div className="  rounded-b-2xl border-t-0 mt-6">
                <GenericCarousel
                    gap={24}
                    gradientStartColor="rgba(255, 255, 255, 1)"
                    gradientEndColor="rgba(255, 255, 255, 0)"
                    gradientLeftStartColor="rgba(255, 255, 255, 1)"
                    gradientLeftEndColor="rgba(255, 255, 255, 0)"
                    className="w-full">
                    {formattedVideoInputForUI.map((video) => {
                        const isPlaying = playingVideoId === video.id

                        return (
                        <div
                            key={video.id}
                            className="shrink-0 w-full md:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
                            style={{ minWidth: '280px' }}>
                            <Card className="overflow-hidden border-none w-full">
                                <div className="bg-primary-default-80 py-2 px-3">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">
                                            <Wand className="w-4 h-4 text-primary-default" />
                                        </div>
                                        <h3 className="text-primary-default text-[12px] tracking-[-0.01em] leading-[12px] font-medium font-manrope text-blue text-left inline-block">
                                            {video.title}
                                        </h3>
                                    </div>
                                </div>
                                    <div className="p-0">
                                        <div className="aspect-video relative overflow-hidden bg-grey_5">
                                            {isPlaying ? (
                                        <iframe
                                            width="100%"
                                            height="100%"
                                                    src={video.embedUrlWithAutoplay}
                                            title={video.title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="w-full h-full"
                                                    frameBorder="0"
                                        />
                                            ) : (
                                                <div
                                                    className="relative w-full h-full cursor-pointer group"
                                                    onClick={() => handleThumbnailClick(video.id)}>
                                                    <img
                                                        src={video.thumbnailUrl}
                                                        alt={video.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        onError={(e) => {
                                                            // Fallback to hqdefault if maxresdefault fails
                                                            const target = e.target as HTMLImageElement
                                                            if (video.videoId && !target.src.includes('hqdefault')) {
                                                                target.src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`
                                                            }
                                                        }}
                                                    />
                                                    {/* Play Button Overlay */}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                                                        <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Play
                                                                className="w-8 h-8 text-primary-default ml-1"
                                                                fill="currentColor"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </Card>
                        </div>
                        )
                    })}
                </GenericCarousel>
            </div>
        </GenericCard>
    )
}
