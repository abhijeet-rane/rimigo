import { useState, useCallback, useMemo, useEffect } from 'react'
import RimigoSpecialText from '@/components/shared/Sections/RimigoSpecialText'
import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import { PlayIcon } from 'lucide-react'

interface ExperienceYoutubeShortsSectionProps {
    youtubeShorts?: Array<{
        id: string
        url: string
        description: string
    }>
}

const SECTION_RIMIGO_SPECIAL_TEXT = 'Highlights we curated for you'
// const MAX_VIDEOS = 3
const SEE_FAMILIAR_VIDEOS_TEXT = 'See what similar travellers think of this activity'

// Extract video ID from YouTube URL (including Shorts format)
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

const ExperienceYoutubeShortsSection = ({ youtubeShorts }: ExperienceYoutubeShortsSectionProps) => {
    if (!youtubeShorts || youtubeShorts.length === 0) {
        return null
    }

    const [activeVideoId, setActiveVideoId] = useState<string | null>(null)

    const videos =
        youtubeShorts && youtubeShorts.length > 0
            ? youtubeShorts.map((video) => ({
                      id: video.id,
                      url: video.url,
                      videoId: extractVideoId(video.url),
                      description: video.description
                  }))
                  .filter((v) => v.videoId)
            : []

    const handleVideoSelect = (videoId: string) => {
        setActiveVideoId((prev) => (prev === videoId ? null : videoId))
    }

    return (
        <div className=" rounded-bl-none rounded-br-none lg:col-span-1 border-b-none border-0 ">
            <div className="pt-4">
                <RimigoSpecialText
                    text={SECTION_RIMIGO_SPECIAL_TEXT}
                    showMagicIcon
                    textStyle={{
                        fontSize: '14px',
                        fontWeight: 550
                    }}
                />
            </div>

            {/* tag */}

            <div className="relative mt-12 bg-primary-default-80 rounded-bl-[12px] rounded-br-[12px]">
                <div className="absolute top-[-34px] text-[14px] right-0 w-full text-left tracking-[-0.02em]  italic leading-[18px] font-[550] font-red-hat-display bg-primary-default-80 text-primary-default rounded-tl-[12px] rounded-tr-[12px] py-2 px-4">
                    {SEE_FAMILIAR_VIDEOS_TEXT}
                </div>
                <GenericCard className="bg-white rounded-b-0 relative rounded-bl-none rounded-br-none border-b-0 ">
                    {videos.length > 0 ? (
                        <div className="flex gap-[18px] overflow-x-auto scrollbar-hide pb-2">
                            {videos.map((video) => (
                                <div key={video.id} className="shrink-0 w-[250px] md:w-[180px]">
                                    <ShortThumbnail
                                        videoId={video.videoId!}
                                        isPlaying={activeVideoId === video.videoId}
                                        onToggle={() => handleVideoSelect(video.videoId!)}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 pb-4">
                            <p className="text-slate-500 text-sm">No videos available</p>
                        </div>
                    )}
                </GenericCard>
            </div>
        </div>
    )
}

interface ShortThumbnailProps {
    videoId: string
    isPlaying: boolean
    onToggle: () => void
}

const ShortThumbnail: React.FC<ShortThumbnailProps> = ({ videoId, isPlaying, onToggle }) => {
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
            <div className="relative aspect-9/16 rounded-lg overflow-hidden shadow-md group w-full">
                <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`}
                    title="YouTube video player"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80 transition-colors">
                    ✕
                </button>
            </div>
        )
    }

    return (
        <div
            className="relative aspect-9/16 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group w-full"
            onClick={onToggle}>
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

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <PlayIcon className="w-10 h-10 text-white drop-shadow-lg " fill='white' />
            </div>
        </div>
    )
}

export default ExperienceYoutubeShortsSection
