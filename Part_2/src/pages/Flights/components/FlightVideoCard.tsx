import React, { useState } from 'react'
import { Play, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TravelContent } from '@/api/flights/flightInsightsAPI'

interface FlightVideoCardProps {
    video: TravelContent
}

// Extract YouTube video ID from URL
const getYouTubeVideoId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    return match ? match[1] : null
}

const FlightVideoCard: React.FC<FlightVideoCardProps> = ({ video }) => {
    const [isVideoOpen, setIsVideoOpen] = useState(false)
    const videoId = getYouTubeVideoId(video.content_link)
    const thumbnailUrl = video.meta_data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

    if (!videoId) return null

    return (
        <>
            <motion.div
                className="relative rounded-lg overflow-hidden border border-feature-card-border hover:shadow-md transition-shadow bg-natural-white cursor-pointer group"
                onClick={() => setIsVideoOpen(true)}>
                {/* Thumbnail */}
                <div className="relative aspect-video bg-grey_5 overflow-hidden">
                    <img
                        src={thumbnailUrl}
                        alt={video.meta_data.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-6 h-6 text-primary-default ml-1" fill="currentColor" />
                        </div>
                    </div>
                </div>
                {/* Title */}
                <div className="p-3">
                    <h4 className="text-xs font-semibold text-header-black font-red-hat-display line-clamp-2">
                        {video.meta_data.title}
                    </h4>
                    {video.meta_data.channel_title && (
                        <p className="text-[10px] text-grey-grey_2 font-red-hat-display mt-1">
                            {video.meta_data.channel_title}
                        </p>
                    )}
                </div>
            </motion.div>

            {/* Video Modal */}
            <AnimatePresence>
                {isVideoOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                            onClick={() => setIsVideoOpen(false)}>
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden"
                                onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => setIsVideoOpen(false)}
                                    className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-black/90 transition-colors">
                                    <X className="w-5 h-5 text-white" />
                                </button>
                                <iframe
                                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={video.meta_data.title}
                                />
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}

export default FlightVideoCard



