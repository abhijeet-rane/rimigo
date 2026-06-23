import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import React, { useMemo } from 'react'

interface YouTubeVideoSectionProps {
    videoUrl?: string
    videoId?: string
    title?: string
}

const YouTubeVideoSection: React.FC<YouTubeVideoSectionProps> = ({
    videoUrl,
    videoId: propVideoId,
    title
}) => {
    const { trackButtonClickCustom } = usePostHog()
    // Extract video ID from URL or use provided videoId
    const videoId = useMemo(() => {
        if (propVideoId) return propVideoId

        if (!videoUrl) return ''

        const url = videoUrl.trim()

        // Match YouTube watch URLs
        const watchMatch = url.match(/[?&]v=([^&]+)/)
        if (watchMatch) {
            return watchMatch[1]
        }

        // Match shortened youtu.be URLs
        const shortMatch = url.match(/youtu\.be\/([^?]+)/)
        if (shortMatch) {
            return shortMatch[1]
        }

        // Match embed URLs
        if (url.includes('/embed/')) {
            const embedMatch = url.match(/\/embed\/([^?&]+)/)
            if (embedMatch) {
                return embedMatch[1]
            }
        }

        return ''
    }, [videoUrl, propVideoId])

    // Build embed URL (paused by default - no autoplay)
    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?rel=0` : ''

    // Don't render if no video ID
    if (!videoId || !embedUrl) {
        return null
    }
    
    const onVideoClick = () => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
            buttonName: POSTHOG_EVENTS.OVERVIEW_YOUTUBE_VIDEO_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                videoLink: embedUrl,
            },
        })
    }

    return (
        <div className="w-full">
            {/* Section Header - Centered */}
            <div className="flex items-baseline justify-center gap-3 mb-4">
                <span
                    className="text-primary-default font-caveat text-3xl leading-none italic"
                    style={{
                        fontFamily: 'Caveat, cursive',
                        fontWeight: 400,
                        fontStyle: 'italic'
                    }}>
                    Exclusive
                </span>
                <span className="text-grey-0 font-red-hat-display text-2xl font-semibold">behind the scenes</span>
            </div>

            {/* Video Container - Reduced size */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-grey_5 max-w-3xl mx-auto">
               
                    <iframe
                        width="100%"
                        height="100%"
                        src={embedUrl}
                        title={title || 'YouTube video player'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                        frameBorder="0"
                        onClick={onVideoClick}
                    />
                
            </div>
        </div>
    )
}

export default YouTubeVideoSection
