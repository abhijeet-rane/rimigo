import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle } from 'lucide-react'
import { processYouTubeVideo, ProcessVideoResponse, TravelContent, ActivityMapping } from '../api/watchAlongApi'
import { toast } from 'sonner'
import { TokenStorage } from '@/lib/api/tokenStorage'

interface YouTubeURLProcessorProps {
    countryId?: string
    onProcessed: (data: { video: TravelContent; activityMappings: ActivityMapping[] }) => void
    onProcessingStarted?: (video: TravelContent) => void // Callback for async processing
}

const YouTubeURLProcessor: React.FC<YouTubeURLProcessorProps> = ({ countryId, onProcessed, onProcessingStarted }) => {
    const [youtubeUrl, setYoutubeUrl] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [travelerId, setTravelerId] = useState<string | null>(null)

    // Get traveler_id from storage
    useEffect(() => {
        const fetchTravelerId = async () => {
            try {
                const userInfo = await TokenStorage.getUserInfo()
                if (userInfo?.traveler_id) {
                    setTravelerId(userInfo.traveler_id)
                }
            } catch {
                // User might not be logged in
                // Silently fail - traveler_id is optional
            }
        }
        fetchTravelerId()
    }, [])

    // Validate YouTube URL (supports various formats)
    const isValidYouTubeUrl = (url: string): boolean => {
        const patterns = [
            /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
            /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
            /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
            /^https?:\/\/(www\.)?youtu\.be\/[\w-]+/,
            /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/
        ]
        return patterns.some((pattern) => pattern.test(url))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!youtubeUrl.trim()) {
            setError('Please enter a YouTube URL')
            return
        }

        if (!isValidYouTubeUrl(youtubeUrl)) {
            setError('Please enter a valid YouTube URL')
            return
        }

        setIsProcessing(true)
        setError(null)

        try {
            const response: ProcessVideoResponse = await processYouTubeVideo({
                youtube_url: youtubeUrl.trim(),
                country_id: countryId || undefined,
                traveler_id: travelerId || undefined
            })

            if (response.success) {
                // Extract video ID from URL
                const getVideoId = (url: string): string => {
                    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\n?#]+)/)
                    return match ? match[1] : ''
                }

                // Case 1: Video already processed (200 OK) - full data available
                if (response.data && response.data.from_cache && response.data.processing_status === 'completed') {
                    const videoData: {
                        video: TravelContent
                        activityMappings: ActivityMapping[]
                    } = {
                        video: {
                            id: response.data.database_save_result?.travel_content_id || `temp-${Date.now()}`,
                            content_type: 'youtube' as const,
                            content_link: response.data.youtube_url,
                            content_media_id: getVideoId(response.data.youtube_url),
                            content_category: 'generic',
                            is_information_extracted: true,
                            content_language: 'en',
                            country: {
                                id: response.data.country_id || '',
                                name: response.data.extracted_country || '',
                                code: ''
                            },
                            city: null,
                            is_translated: false,
                            is_curated: false,
                            meta_data: response.data.video_metadata,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        },
                        activityMappings: response.data.activity_mappings || []
                    }

                    onProcessed(videoData)
                    toast.success('Video already processed! Showing results...')
                    setYoutubeUrl('')
                }
                // Case 2: New video - async processing (202 Accepted)
                else if (response.processing_status === 'pending' || response.processing_status === 'in_progress') {
                    const travelContentId = response.travel_content_id
                    if (!travelContentId) {
                        throw new Error('No travel content ID received from server')
                    }

                    // Create a minimal TravelContent for processing state
                    const processingVideo: TravelContent = {
                        id: travelContentId,
                        content_type: 'youtube' as const,
                        content_link: youtubeUrl.trim(),
                        content_media_id: getVideoId(youtubeUrl.trim()),
                        content_category: 'generic',
                        is_information_extracted: false,
                        content_language: 'en',
                        processing_status: response.processing_status || 'pending',
                        country: {
                            id: countryId || '',
                            name: '',
                            code: ''
                        },
                        city: null,
                        is_translated: false,
                        is_curated: false,
                        meta_data: {
                            video_id: getVideoId(youtubeUrl.trim()),
                            title: 'Processing video...',
                            description: '',
                            channel_title: '',
                            view_count: 0,
                            like_count: 0,
                            duration: '',
                            thumbnail_url: `https://img.youtube.com/vi/${getVideoId(youtubeUrl.trim())}/hqdefault.jpg`
                        },
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }

                    // Notify parent that processing has started
                    if (onProcessingStarted) {
                        onProcessingStarted(processingVideo)
                    }

                    toast.success('Video processing started! It will be ready in 30-60 seconds.')
                    setYoutubeUrl('')
                }
                // Case 3: Should not happen, but handle data if present
                else if (response.data) {
                    // Similar to case 1 but without from_cache
                    const videoData: {
                        video: TravelContent
                        activityMappings: ActivityMapping[]
                    } = {
                        video: {
                            id: response.data.database_save_result?.travel_content_id || `temp-${Date.now()}`,
                            content_type: 'youtube' as const,
                            content_link: response.data.youtube_url,
                            content_media_id: getVideoId(response.data.youtube_url),
                            content_category: 'generic',
                            is_information_extracted: true,
                            content_language: 'en',
                            country: {
                                id: response.data.country_id || '',
                                name: response.data.extracted_country || '',
                                code: ''
                            },
                            city: null,
                            is_translated: false,
                            is_curated: false,
                            meta_data: response.data.video_metadata,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        },
                        activityMappings: response.data.activity_mappings || []
                    }

                    onProcessed(videoData)
                    toast.success('Video processed successfully!')
                    setYoutubeUrl('')
                }
            }
        } catch (error: unknown) {
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to process video. Please try again.'
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="mb-6">
            {/* Merged Header and Input */}
            <form onSubmit={handleSubmit}>
                <div className="relative max-w-2xl">
                    {/* Left side - YouTube Icon */}
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                        <svg
                            width="18"
                            height="18"
                            className="text-[#FF0000]"
                            viewBox="0 0 24 24"
                            fill="currentColor">
                            <path d="M21.8 7.001a2.746 2.746 0 0 0-1.94-1.947C18.1 4.5 12 4.5 12 4.5s-6.101 0-7.86.554A2.746 2.746 0 0 0 2.201 7C1.649 8.76 1.649 12 1.649 12s0 3.24.552 5c.266.893.99 1.6 1.865 1.86C5.901 19.5 12 19.5 12 19.5s6.101 0 7.86-.555a2.747 2.747 0 0 0 1.94-1.947c.552-1.76.552-5 .552-5s0-3.24-.552-5zM9.75 15.02v-6.04L15.5 12l-5.75 3.02z" />
                        </svg>
                    </div>

                    {/* Input field */}
                    <input
                        type="text"
                        value={youtubeUrl}
                        onChange={(e) => {
                            setYoutubeUrl(e.target.value)
                            setError(null)
                        }}
                        placeholder="Paste any youtube video link"
                        disabled={isProcessing}
                        className="w-full pl-11 pr-10 py-2.5 bg-white border border-primary-default/20 rounded-xl focus:outline-none focus:border-primary-default/40 font-red-hat-display text-sm text-header-black placeholder:text-grey-grey_2 disabled:bg-grey_5 disabled:cursor-not-allowed transition-all"
                    />

                    {/* Right side - "discover experiences" styled text (when empty) */}
                    {!youtubeUrl && !isProcessing && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <span className="text-xs font-red-hat-display">
                                and <span className="text-primary-default italic">discover experiences</span>
                            </span>
                        </div>
                    )}

                    {/* Loading spinner inside input */}
                    {isProcessing && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <Loader2 className="w-4 h-4 text-primary-default animate-spin" />
                        </div>
                    )}
                </div>

                {/* Error Message - Subtle */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span className="font-red-hat-display">{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Processing Message - Very subtle */}
                <AnimatePresence>
                    {isProcessing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="mt-2 text-xs text-grey-grey_2 font-red-hat-display">
                            Processing... This may take 30-60 seconds.
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>
        </div>
    )
}

export default YouTubeURLProcessor
