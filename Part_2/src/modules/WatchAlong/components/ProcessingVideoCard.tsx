import React from 'react'
import { motion } from 'framer-motion'
import { Clock, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { TravelContent } from '../api/watchAlongApi'
import { formatDuration } from '../api/watchAlongApi'

interface ProcessingVideoCardProps {
    video: TravelContent
    onRefresh?: () => void
    onOpen?: (video: TravelContent) => void
}

const ProcessingVideoCard: React.FC<ProcessingVideoCardProps> = ({ video, onRefresh, onOpen }) => {
    const getStatusDisplay = () => {
        const status = video.processing_status
        switch (status) {
            case 'pending':
                return {
                    icon: <Clock className="w-4 h-4" />,
                    text: 'Queued',
                    color: 'text-grey-grey_2',
                    bgColor: 'bg-grey_5',
                    message: 'Video queued for processing...'
                }
            case 'in_progress':
                return {
                    icon: <Loader2 className="w-4 h-4 animate-spin" />,
                    text: 'Processing',
                    color: 'text-primary-default',
                    bgColor: 'bg-primary-default/10',
                    message: 'Processing video... This may take 30-60 seconds'
                }
            case 'completed':
                return {
                    icon: <CheckCircle className="w-4 h-4" />,
                    text: 'Completed',
                    color: 'text-green-600',
                    bgColor: 'bg-green-100',
                    message: 'Processing complete! Click to view experiences'
                }
            case 'failed':
                return {
                    icon: <XCircle className="w-4 h-4" />,
                    text: 'Failed',
                    color: 'text-red-600',
                    bgColor: 'bg-red-100',
                    message: 'Processing failed. Click to retry'
                }
            default:
                return {
                    icon: <Clock className="w-4 h-4" />,
                    text: 'Unknown',
                    color: 'text-grey-grey_2',
                    bgColor: 'bg-grey_5',
                    message: 'Unknown status'
                }
        }
    }

    const statusDisplay = getStatusDisplay()
    const thumbnailUrl = video.meta_data?.thumbnail_url || `https://img.youtube.com/vi/${video.content_media_id}/hqdefault.jpg`
    const title = video.meta_data?.title || 'Processing video...'
    const channel = video.meta_data?.channel_title || ''

    const isCompleted = video.processing_status === 'completed' && video.is_information_extracted
    const isClickable = isCompleted || video.processing_status === 'failed'

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group cursor-pointer"
            onClick={() => {
                if (isClickable && onOpen) {
                    onOpen(video)
                } else if (onRefresh) {
                    onRefresh()
                }
            }}>
            <div className="rounded-2xl overflow-hidden border border-feature-card-border bg-natural-white hover:shadow-lg transition-shadow">
                {/* Thumbnail */}
                <div className="relative aspect-4/3 overflow-hidden bg-grey_5">
                    <img
                        src={thumbnailUrl}
                        alt={title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = `https://img.youtube.com/vi/${video.content_media_id}/hqdefault.jpg`
                        }}
                    />
                    {/* Overlay for processing state */}
                    {video.processing_status !== 'completed' && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            {video.processing_status === 'in_progress' && (
                                <Loader2 className="w-12 h-12 text-white animate-spin" />
                            )}
                        </div>
                    )}
                    {/* Status badge */}
                    <div className="absolute top-3 left-3">
                        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${statusDisplay.bgColor} ${statusDisplay.color} border border-feature-card-border`}>
                            {statusDisplay.icon}
                            <span className="text-xs font-semibold font-red-hat-display">{statusDisplay.text}</span>
                        </div>
                    </div>
                    {/* Refresh button (when not completed) */}
                    {video.processing_status !== 'completed' && onRefresh && (
                        <div className="absolute top-3 right-3">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRefresh()
                                }}
                                className="p-2 rounded-full bg-white/90 hover:bg-white border border-feature-card-border shadow-sm transition-colors">
                                <RefreshCw className="w-4 h-4 text-grey-grey_1" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-5">
                    <h3 className="text-base font-semibold text-header-black line-clamp-2 mb-1 font-red-hat-display">{title}</h3>
                    {channel && <p className="text-sm text-grey-grey_2 mb-3 font-red-hat-display">{channel}</p>}
                    {video.meta_data?.duration && (
                        <div className="flex items-center gap-2 text-xs text-grey-grey_2 mb-3 font-red-hat-display">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatDuration(video.meta_data.duration)}</span>
                        </div>
                    )}
                    {/* Status message */}
                    <div className="pt-3 border-t border-grey_4">
                        <p className={`text-xs ${statusDisplay.color} font-red-hat-display`}>{statusDisplay.message}</p>
                        {video.processing_status === 'pending' || video.processing_status === 'in_progress' ? (
                            <p className="text-xs text-grey-grey_2 mt-1 font-red-hat-display">
                                You can refresh or check back later
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

export default ProcessingVideoCard
