import { useState, useRef, useEffect } from 'react'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import HeroVideoModal from '@/pages/Home/sections/Hero/component/HeroVideomodal'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface VideoData {
    id: string
    url: string
    metadata?: Record<string, unknown>
}

interface CollectionVideosSectionProps {
  videos?: VideoData[]
  className?: string
  autoPlayOnHover?: boolean
  showPlayButton?: boolean
  autoPlayInView?: boolean
  mediaContainerClassname?: string
  cardClassName?: string
}

// Helper function to determine if URL is a video or image
const isVideo = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.ogg']
  const lowerUrl = url.toLowerCase()
  return videoExtensions.some(ext => lowerUrl.includes(ext))
}

const CollectionVideosSection = ({ 
  videos = [],
  className,
  autoPlayOnHover = true,
  showPlayButton = true,
  autoPlayInView = false,
  mediaContainerClassname,
  cardClassName
}: CollectionVideosSectionProps) => {
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null)
  const [hoveredMedia, setHoveredMedia] = useState<string | null>(null)
  const [loadedVideos, setLoadedVideos] = useState<Set<string>>(new Set())
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({})
  const { trackButtonClickCustom } = usePostHog()

  // Use provided videos or empty array
  const displayVideos: VideoData[] = videos

  // Handle video loaded state to prevent reloading
  useEffect(() => {
    const handleCanPlay = (id: string) => {
      setLoadedVideos(prev => new Set(prev).add(id))
    }

    Object.entries(videoRefs.current).forEach(([id, video]) => {
      if (video) {
        video.addEventListener('canplay', () => handleCanPlay(id))
      }
    })

    return () => {
      Object.entries(videoRefs.current).forEach(([id, video]) => {
        if (video) {
          video.removeEventListener('canplay', () => handleCanPlay(id))
        }
      })
    }
  }, [displayVideos])

  // Load first frame of videos on mount
  useEffect(() => {
    const loadFirstFrames = () => {
      Object.values(videoRefs.current).forEach(video => {
        if (video && video.readyState < 2) {
          video.load()
        }
      })
    }
    
    const timer = setTimeout(loadFirstFrames, 100)
    return () => clearTimeout(timer)
  }, [displayVideos])

  // Auto-play all videos on mount (muted) - only if autoPlayInView is true
  useEffect(() => {
    if (!autoPlayInView) return

    const playAllVideos = async () => {
      const playPromises = Object.entries(videoRefs.current).map(([id, video]) => {
        if (video && loadedVideos.has(id)) {
          return video.play().catch(() => {
            // Autoplay blocked, that's okay
          })
        }
        return Promise.resolve()
      })
      await Promise.all(playPromises)
    }
    
    const timer = setTimeout(playAllVideos, 100)
    return () => clearTimeout(timer)
  }, [displayVideos, autoPlayInView, loadedVideos])

  const handleMediaClick = (mediaUrl: string) => {
    // Only open modal for videos, not images
    if (isVideo(mediaUrl)) {
      setSelectedMedia(mediaUrl)
      trackButtonClickCustom?.({
        buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
        buttonName: POSTHOG_EVENTS.OVERVIEW_VIDEO_CLICK,
        buttonAction: POSTHOG_ACTIONS.CLICK,
        extra: {
          videoUrl: mediaUrl,
        },
      })
    }
  }

  const handleMouseEnter = (id: string, url: string) => {
    setHoveredMedia(id)
    
    // Only handle video hover autoplay if it's a video
    if (!autoPlayOnHover || !isVideo(url)) return
    
    const video = videoRefs.current[id]
    
    // Only play if video is loaded and paused
    if (video && loadedVideos.has(id) && video.paused) {
      // Reset to beginning for hover effect
      video.currentTime = 0
      video.play().catch(() => {})
    }
  }

  const handleMouseLeave = (id: string, url: string) => {
    setHoveredMedia(null)
    
    // Only handle video pause if it's a video
    if (!autoPlayOnHover || !isVideo(url)) return
    
    const video = videoRefs.current[id]
    if (video && !video.paused) {
      video.pause()
      video.currentTime = 0
    }
  }

  // Don't render if no videos
  if (displayVideos.length === 0) {
    return null
  }

  // Don't render if no videos
  if (displayVideos.length === 0) {
    return null
  }

  return (
    <>
      <div className={cn("w-full flex justify-center", className)}>
        <GenericCarousel
          className="w-full max-w-7xl"
          containerClassName="pb-2 pl-4"
          gap={8}
          scrollAmount={400}
          gradientStartColor="rgba(255, 255, 255, 1)"
          gradientEndColor="rgba(255, 255, 255, 0)"
          gradientLeftStartColor="rgba(255, 255, 255, 1)"
          gradientLeftEndColor="rgba(255, 255, 255, 0)"
        >
          {displayVideos.map((media) => {
            const isVideoMedia = isVideo(media.url)
            
            return (
              <div
                key={media.id}
                className={cn(
                  "relative flex-shrink-0 group",
                  "transition-all duration-300",
                  !cardClassName && "w-[280px] md:w-[320px]",
                  cardClassName,
                  isVideoMedia ? "cursor-pointer" : "" 
                )}
                onMouseEnter={() => handleMouseEnter(media.id, media.url)}
                onMouseLeave={() => handleMouseLeave(media.id, media.url)}
                onClick={() => handleMediaClick(media.url)}
              >
                {/* Media Container */}
                <div className={cn("relative w-full overflow-hidden rounded-md", !mediaContainerClassname && "h-[500px] md:h-[550px]", mediaContainerClassname)}>
                  {isVideoMedia ? (
                    // Video element
                    <video
                      ref={(el) => {videoRefs.current[media.id] = el}}
                      className="w-full h-full object-cover"
                      src={media.url}
                      loop
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    // Image element
                    <img
                      src={media.url}
                      alt={"media"}
                      className="w-full h-full object-cover"
                    />
                  )}
                  
                  {/* Gradient Overlay */}
                  {isVideoMedia &&
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent",
                    "transition-opacity duration-300",
                    hoveredMedia === media.id ? "opacity-100" : "opacity-30"
                  )} />}
                  
                  {/* Play Button Overlay - Only for videos */}
                  {isVideoMedia && showPlayButton && !autoPlayInView && (
                    <div className={cn(
                      "absolute inset-0 flex items-center justify-center",
                      "transition-opacity duration-300",
                      hoveredMedia === media.id ? "opacity-90" : "opacity-100"
                    )}>
                      <Play className="w-10 h-10 md:w-10 md:h-10 text-white fill-white ml-0.5 transform group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  )}
                </div>

                {/* Hover Scale Effect - Only on desktop and only for videos */}
                {isVideoMedia && (
                  <div
                    className={cn(
                      "absolute inset-0 pointer-events-none hidden md:block rounded-lg transition-opacity duration-300",
                      hoveredMedia === media.id && "bg-collection-video-gradient"
                    )}
                  />
                )}
              </div>
            )
          })}
        </GenericCarousel>
      </div>

      {/* Video Modal - Only opens for videos */}
      <HeroVideoModal
        isOpen={selectedMedia !== null}
        onClose={() => setSelectedMedia(null)}
        videoUrl={selectedMedia || ''}
        autoPlay={false}
        maxWidth="6xl"
      />
    </>
  )
}

export default CollectionVideosSection