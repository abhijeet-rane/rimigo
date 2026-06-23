import React from 'react'
import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import { TravelContent } from '../api/watchAlongApi'
import { formatDuration, formatViewCount } from '../api/watchAlongApi'

export interface VideoCardData {
    id: string
    title: string
    thumbnail: string
    duration: string
    viewCount: number
    channelTitle: string
    contentLink: string
}

interface VideoCardProps {
    video: TravelContent
    onClick?: (video: TravelContent) => void
    isTravelerVideo?: boolean // If true, shows "Your Video" tag, otherwise shows "Curated" if is_curated
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onClick, isTravelerVideo = false }) => {
    const { meta_data } = video

    const handleCardClick = () => {
        onClick?.(video)
    }

    const formattedDuration = formatDuration(meta_data.duration)
    const formattedViewCount = formatViewCount(meta_data.view_count)

    // Get channel thumbnail image
    const channelImageUrl =
        meta_data.channel_thumbnails?.high || meta_data.channel_thumbnails?.medium || meta_data.channel_thumbnails?.default || null

    return (
        <motion.div
            layout
            className="rounded-2xl overflow-hidden border border-feature-card-border hover:shadow-lg transition-shadow bg-natural-white flex flex-col cursor-pointer h-full group"
            onClick={handleCardClick}>
            {/* Thumbnail Section */}
            <div className="relative aspect-4/3 overflow-hidden bg-grey_5">
                <img
                    src={meta_data.thumbnail_url}
                    alt={meta_data.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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

                {/* Duration Badge */}
                <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-white text-xs font-semibold">
                    {formattedDuration}
                </div>

                {/* Video Type Tag */}
                <div className="absolute top-3 left-3 flex gap-2">
                    {isTravelerVideo ? (
                        <span
                            className="flex items-center gap-2 flex-shrink-0"
                            style={{
                                padding: '2px 8px',
                                borderRadius: 18,
                                border: '1px solid #E0E0E0',
                                background: '#F8F8F8'
                            }}>
                            <span style={{ fontFamily: 'Manrope', fontSize: 14, fontWeight: 600, color: '#1F1F1F' }}>Your Video</span>
                        </span>
                    ) : video.is_curated ? (
                        <span
                            className="flex items-center gap-2 flex-shrink-0"
                            style={{
                                padding: '2px 8px',
                                borderRadius: 18,
                                border: '1px solid #E0E0E0',
                                background: '#F8F8F8'
                            }}>
                            <span style={{ fontFamily: 'Manrope', fontSize: 14, fontWeight: 600, color: '#1F1F1F' }}>Curated</span>
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Content Section */}
            <div className="p-5 flex-1 flex flex-col">
                {/* Title */}
                {/* <div className="min-h-8 mb-3">
                    <h3 className="text-sm font-semibold text-header-black font-red-hat-display line-clamp-1">{meta_data.title}</h3>
                </div> */}

                {/* Channel and Views */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Creator Image */}
                        {channelImageUrl ? (
                            <img
                                src={channelImageUrl}
                                alt={meta_data.channel_title}
                                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                onError={(e) => {
                                    // Hide image if it fails to load
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                }}
                            />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--color-primary-light)] via-[var(--color-primary-default)] to-[var(--color-primary-dark)] flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-bold font-red-hat-display">
                                    {meta_data.channel_title?.charAt(0).toUpperCase() || '?'}
                                </span>
                            </div>
                        )}
                        {/* Channel Title */}
                        <p className="text-sm text-grey-grey_2 font-red-hat-display line-clamp-1 min-w-0">{meta_data.channel_title}</p>
                    </div>
                    <div className="text-sm text-grey-grey_2 font-red-hat-display flex-shrink-0">{formattedViewCount} views</div>
                </div>
            </div>
        </motion.div>
    )
}

export default VideoCard
