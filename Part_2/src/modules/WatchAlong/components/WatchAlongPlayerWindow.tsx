import React, { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, TrendingUp, MessageSquare } from 'lucide-react'
import { TravelContent, ExperienceMapping, ActivityMapping } from '../api/watchAlongApi'
import ExperienceCard from '@/modules/Experiences/components/ExperienceCard'
import { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import { bulkUpsertTripExperiences, getShortlistedByTrip } from '@/modules/Experiences/api/experienceShortlistAPI'
import { dispatchOpenTripCreationModal } from '@/lib/events/tripCreationModalEvents'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'

interface WatchAlongPlayerWindowProps {
    isOpen: boolean
    onClose: () => void
    video: TravelContent | null
    experienceMappings: ExperienceMapping[]
    activityMappings?: ActivityMapping[] // For processed videos
    currentTimestamp?: number // Current video playback time in seconds
    isLoadingMappings?: boolean // Loading state for experience mappings
}

const WatchAlongPlayerWindow: React.FC<WatchAlongPlayerWindowProps> = ({
    isOpen,
    onClose,
    video,
    experienceMappings,
    activityMappings,
    currentTimestamp = 0,
    isLoadingMappings = false
}) => {
    const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null)
    const [shortlistState, setShortlistState] = useState<Record<string, { experienceId: string; isShortlisted: boolean }>>({})
    const [shortlistLoadingIds, setShortlistLoadingIds] = useState<Record<string, boolean>>({})
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [searchParams] = useSearchParams()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null

    // Get YouTube video ID from content_link
    const getYouTubeVideoId = (url: string): string | null => {
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
        return match ? match[1] : null
    }

    // Combine experience mappings from both sources
    const allMappings = React.useMemo(() => {
        const mappings: Array<{
            timestamp: number
            timestampFormatted: string
            matchConfidence?: 'high' | 'medium' | 'low'
            matchReason?: string
            snippetText?: string
            extractedActivity?: string
            experiences: Array<{
                id: string
                name: string
                image: string
                description: string
                price: { currency: string; lower_bound: number; upper_bound: number }
                city_name: string
            }>
        }> = []

        // Add experience mappings
        experienceMappings.forEach((mapping) => {
            // Skip if experience data is incomplete
            if (!mapping.experience || !mapping.experience.display_props) return

            const timestampSeconds = mapping.meta_data.timestamp_seconds
            const existing = mappings.find((m) => m.timestamp === timestampSeconds)
            const experience = {
                id: mapping.experience.id,
                name: mapping.experience.display_props.name,
                image: mapping.experience.display_props.landscape_image || mapping.experience.display_props.portrait_image,
                description: mapping.experience.display_props.description,
                price: mapping.experience.price,
                city_name: mapping.experience.city?.name || ''
            }

            if (existing) {
                existing.experiences.push(experience)
            } else {
                mappings.push({
                    timestamp: timestampSeconds,
                    timestampFormatted: mapping.timestamp,
                    matchConfidence: mapping.meta_data.match_confidence,
                    matchReason: mapping.meta_data.match_reason,
                    snippetText: mapping.meta_data.snippet_text,
                    extractedActivity: mapping.meta_data.extracted_activity,
                    experiences: [experience]
                })
            }
        })

        // Add activity mappings (from processed videos)
        if (activityMappings) {
            activityMappings.forEach((activity) => {
                const existing = mappings.find((m) => Math.abs(m.timestamp - activity.timestamp) < 1)

                // Filter out experiences without display_props
                const validExperiences = activity.matched_experiences.filter((exp) => exp && exp.display_props && exp.display_props.name)

                if (validExperiences.length === 0) return // Skip if no valid experiences

                if (existing) {
                    // Merge experiences
                    validExperiences.forEach((exp) => {
                        if (!existing.experiences.find((e) => e.id === exp.id)) {
                            existing.experiences.push({
                                id: exp.id,
                                name: exp.display_props.name,
                                image: exp.display_props.landscape_image || exp.display_props.portrait_image || '',
                                description: exp.display_props.description || '',
                                price: exp.price || { currency: '', lower_bound: 0, upper_bound: 0 },
                                city_name: '' // Not available in activity mappings
                            })
                        }
                    })
                } else {
                    mappings.push({
                        timestamp: activity.timestamp,
                        timestampFormatted: activity.timestamp_formatted,
                        matchConfidence: activity.match_confidence,
                        matchReason: activity.match_reason,
                        snippetText: activity.snippet_text,
                        extractedActivity: activity.extracted_activity,
                        experiences: validExperiences.map((exp) => ({
                            id: exp.id,
                            name: exp.display_props.name,
                            image: exp.display_props.landscape_image || exp.display_props.portrait_image || '',
                            description: exp.display_props.description || '',
                            price: exp.price || { currency: '', lower_bound: 0, upper_bound: 0 },
                            city_name: ''
                        }))
                    })
                }
            })
        }

        // Sort by timestamp
        return mappings.sort((a, b) => a.timestamp - b.timestamp)
    }, [experienceMappings, activityMappings])

    // Seek video to timestamp
    const seekToTimestamp = (seconds: number) => {
        if (iframeRef.current && video) {
            const videoId = getYouTubeVideoId(video.content_link)
            if (videoId) {
                // YouTube iframe API seek
                const iframe = iframeRef.current
                iframe.contentWindow?.postMessage(
                    JSON.stringify({
                        event: 'command',
                        func: 'seekTo',
                        args: [seconds, true]
                    }),
                    '*'
                )
            }
        }
        setSelectedTimestamp(seconds)
    }

    // Fetch shortlisted experiences when trip changes
    useEffect(() => {
        if (!activeTripId) {
            setShortlistState({})
            return
        }

        let isCancelled = false

        const fetchShortlisted = async () => {
            const aggregated: Record<string, { experienceId: string; isShortlisted: boolean }> = {}
            let page = 1
            const limit = 100

            try {
                while (true) {
                    // Get all unique experience IDs from current mappings
                    const allExperienceIds = new Set<string>()
                    allMappings.forEach((mapping) => {
                        mapping.experiences.forEach((exp) => {
                            allExperienceIds.add(exp.id)
                        })
                    })

                    if (allExperienceIds.size === 0) break

                    // For watch-along, we'll fetch shortlisted experiences for the trip
                    // Since we don't have city filters here, we'll use empty city_ids
                    const response = await getShortlistedByTrip({
                        tripId: activeTripId,
                        baseCityIds: '',
                        page,
                        limit
                    })

                    if (isCancelled) {
                        return
                    }

                    response.results?.forEach((item) => {
                        const experienceId = item.experience?.id || item.experience_id
                        if (!experienceId || !allExperienceIds.has(experienceId)) {
                            return
                        }

                        aggregated[experienceId] = {
                            experienceId,
                            isShortlisted: item.is_traveler_shortlisted ?? true
                        }
                    })

                    if (!response.has_more) {
                        break
                    }

                    page += 1
                }

                if (isCancelled) {
                    return
                }

                setShortlistState(aggregated)
            } catch (error) {
                if (!isCancelled) {
                    console.error('Failed to fetch shortlisted experiences', error)
                }
            }
        }

        void fetchShortlisted()

        return () => {
            isCancelled = true
        }
    }, [activeTripId, allMappings])

    // Handle experience click - open in new tab like ExperiencesListPage
    const handleExperienceClick = useCallback(
        (experienceId: string) => {
            const url = `/experiences/${experienceId}/?${searchParams.toString()}`
            window.open(url, '_blank')
        },
        [searchParams]
    )

    // Handle shortlist toggle
    const handleShortlistToggle = useCallback(
        async (experienceId: string) => {
            if (!experienceId) {
                return
            }

            if (!activeTripId) {
                dispatchOpenTripCreationModal({ source: 'experiences-card' })
                return
            }

            const existingEntry = shortlistState[experienceId]
            const nextState = !(existingEntry?.isShortlisted ?? false)

            setShortlistLoadingIds((prev) => ({ ...prev, [experienceId]: true }))

            try {
                await bulkUpsertTripExperiences(activeTripId, {
                    trip_id: activeTripId,
                    experiences: [
                        {
                            experience_id: experienceId,
                            is_traveler_shortlisted: nextState
                        }
                    ]
                })

                setShortlistState((prev) => ({
                    ...prev,
                    [experienceId]: {
                        experienceId,
                        isShortlisted: nextState
                    }
                }))

                toast.success(nextState ? 'Added to wishlist' : 'Removed from wishlist')
            } catch (error) {
                console.error('Failed to update shortlist', error)
                toast.error('Could not update shortlist. Please try again.')
            } finally {
                setShortlistLoadingIds((prev) => {
                    const next = { ...prev }
                    delete next[experienceId]
                    return next
                })
            }
        },
        [activeTripId, shortlistState]
    )

    // Convert experience data to ExperienceCardData format
    const convertToExperienceCardData = (exp: {
        id: string
        name: string
        image: string
        description: string
        price: { currency: string; lower_bound: number; upper_bound: number }
        city_name: string
        short_description?: string | null
    }): ExperienceCardData => ({
        id: exp.id,
        title: exp.name,
        city_name: exp.city_name,
        city_id: '', // Not available in mappings
        price: exp.price,
        image: exp.image,
        suggestion_priority: null,
        short_description: exp.short_description ?? null,
        category: null,
        categoryBackendValue: null
    })

    // Get current experiences based on timestamp
    const getCurrentExperiences = () => {
        if (allMappings.length === 0) return []

        if (selectedTimestamp !== null) {
            const mapping = allMappings.find((m) => Math.abs(m.timestamp - selectedTimestamp) < 2)
            return mapping?.experiences || []
        }

        // Find experiences at current playback timestamp
        const mapping = allMappings.find((m) => Math.abs(m.timestamp - currentTimestamp) < 2)
        if (mapping) {
            return mapping.experiences
        }

        // If no timestamp selected and not at a specific timestamp, show ALL unique experiences
        const allExperiencesMap = new Map<string, (typeof allMappings)[0]['experiences'][0]>()
        allMappings.forEach((m) => {
            m.experiences.forEach((exp) => {
                if (!allExperiencesMap.has(exp.id)) {
                    allExperiencesMap.set(exp.id, exp)
                }
            })
        })
        return Array.from(allExperiencesMap.values())
    }

    // Get all unique experiences for the "all experiences" view
    const getAllUniqueExperiences = () => {
        if (allMappings.length === 0) return []
        const allExperiencesMap = new Map<string, (typeof allMappings)[0]['experiences'][0]>()
        allMappings.forEach((m) => {
            m.experiences.forEach((exp) => {
                if (!allExperiencesMap.has(exp.id)) {
                    allExperiencesMap.set(exp.id, exp)
                }
            })
        })
        return Array.from(allExperiencesMap.values())
    }

    const currentExperiences = getCurrentExperiences()
    const allUniqueExperiences = getAllUniqueExperiences()
    const isShowingAllExperiences =
        selectedTimestamp === null && currentExperiences.length === allUniqueExperiences.length && currentExperiences.length > 0
    const videoId = video ? getYouTubeVideoId(video.content_link) : null

    // Shimmer components
    const ShimmerBox = ({ className }: { className: string }) => <div className={`animate-pulse bg-grey_4 rounded ${className}`} />

    if (!isOpen || !video || !videoId) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/60 z-40"
                        onClick={onClose}
                    />

                    {/* Main Overlay Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="fixed inset-4 z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-row"
                        onClick={(e) => e.stopPropagation()}>
                        {/* Left Side - Video Player */}
                        <div
                            className="flex flex-col border-r border-grey_4 bg-black"
                            style={{ width: allMappings.length > 0 ? '55%' : '100%' }}>
                            {/* Video Player */}
                            <div className="flex justify-end p-4">
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-grey_5 flex items-center justify-center hover:bg-grey_4 transition-colors flex-shrink-0">
                                    <X className="w-6 h-6 text-grey_1" />
                                </button>
                            </div>
                            <div className="flex-1 relative bg-black flex items-center justify-center">
                                <iframe
                                    ref={iframeRef}
                                    src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&controls=1`}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </div>

                        {/* Right Side - Timeline and Experiences */}

                        {/* show only if there are experiences */}
                        {allMappings.length > 0 && (
                            <div className="flex flex-col w-[45%] bg-grey_6 overflow-hidden">
                                {/* Header with Title and Close Button */}
                                <div className="relative pt-4 pb-4 flex items-center justify-between px-6 z-10 border-b border-grey_4 bg-white flex-shrink-0">
                                    <div className="flex-1 pr-4 min-w-0">
                                        <h2 className="text-lg font-bold text-header-black line-clamp-2 font-red-hat-display">
                                            {video.meta_data.title}
                                        </h2>
                                        <p className="text-sm text-grey-grey_2 mt-1 font-red-hat-display">{video.meta_data.channel_title}</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="w-10 h-10 rounded-full bg-grey_5 flex items-center justify-center hover:bg-grey_4 transition-colors flex-shrink-0">
                                        <X className="w-6 h-6 text-grey_1" />
                                    </button>
                                </div>

                                {/* Timeline Section */}
                                {(isLoadingMappings || allMappings.length > 0) && (
                                    <div className="border-b border-grey_4 px-6 py-4 bg-white flex-shrink-0">
                                        {isLoadingMappings ? (
                                            <>
                                                <ShimmerBox className="h-5 w-48 mb-3" />
                                                <div className="flex flex-wrap gap-2">
                                                    {Array.from({ length: 4 }).map((_, i) => (
                                                        <ShimmerBox
                                                            key={i}
                                                            className="h-8 w-16 rounded-full"
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="text-sm font-semibold text-header-black mb-3 font-red-hat-display">
                                                    Experiences in this video ({allMappings.length})
                                                </h3>
                                                <div className="flex flex-wrap gap-2 overflow-y-auto max-h-32">
                                                    {allMappings.map((mapping, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => seekToTimestamp(mapping.timestamp)}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 font-red-hat-display ${
                                                                selectedTimestamp !== null && Math.abs(mapping.timestamp - selectedTimestamp) < 1
                                                                    ? 'bg-primary-default text-white shadow-md'
                                                                    : 'bg-grey_5 text-grey_1 hover:bg-grey_4 border border-feature-card-border'
                                                            }`}>
                                                            <Clock className="w-3 h-3" />
                                                            {mapping.timestampFormatted}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Experiences List - Scrollable */}
                                <div className="flex-1 overflow-y-auto">
                                    {isLoadingMappings ? (
                                        <div className="px-6 py-4 space-y-4">
                                            {/* Header Shimmer */}
                                            <div className="bg-white rounded-lg p-4 border border-feature-card-border space-y-3">
                                                <ShimmerBox className="h-5 w-40" />
                                                <div className="space-y-2 pt-2 border-t border-grey_4">
                                                    <ShimmerBox className="h-4 w-full" />
                                                    <ShimmerBox className="h-4 w-3/4" />
                                                </div>
                                            </div>

                                            {/* Experience Cards Shimmer */}
                                            <div className="overflow-x-auto pb-4 -mx-6 px-6">
                                                <div className="flex gap-4">
                                                    {Array.from({ length: 3 }).map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex-shrink-0"
                                                            style={{ width: '300px' }}>
                                                            <div className="rounded-2xl overflow-hidden border border-feature-card-border bg-natural-white animate-pulse">
                                                                {/* Image Skeleton */}
                                                                <div className="relative aspect-4/3 bg-grey_4" />

                                                                {/* Content Skeleton */}
                                                                <div className="p-5 space-y-3">
                                                                    <ShimmerBox className="h-6 w-full" />
                                                                    <ShimmerBox className="h-6 w-3/4" />
                                                                    <div className="flex items-center justify-between mt-4">
                                                                        <ShimmerBox className="h-4 w-20" />
                                                                        <ShimmerBox className="h-4 w-24" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : currentExperiences.length > 0 ? (
                                        <div className="px-6 py-4 space-y-4">
                                            {/* Header based on view mode */}
                                            {isShowingAllExperiences ? (
                                                <div className="bg-white rounded-lg p-4 border border-feature-card-border">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h3 className="text-sm font-semibold text-header-black font-red-hat-display">
                                                            All Experiences ({allUniqueExperiences.length})
                                                        </h3>
                                                    </div>
                                                    <p className="text-xs text-grey-grey_2 font-red-hat-display">
                                                        Click a timestamp above to see experiences at that moment, or browse all experiences below
                                                    </p>
                                                </div>
                                            ) : (
                                                (() => {
                                                    const currentMapping =
                                                        selectedTimestamp !== null
                                                            ? allMappings.find((m) => Math.abs(m.timestamp - selectedTimestamp) < 1)
                                                            : allMappings.find((m) => Math.abs(m.timestamp - currentTimestamp) < 2)

                                                    return currentMapping ? (
                                                        <div className="bg-white rounded-lg p-4 border border-feature-card-border space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <h3 className="text-sm font-semibold text-header-black font-red-hat-display">
                                                                    Experiences at {currentMapping.timestampFormatted}
                                                                </h3>
                                                                {currentMapping.matchConfidence && (
                                                                    <span
                                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                            currentMapping.matchConfidence === 'high'
                                                                                ? 'bg-green-100 text-green-700'
                                                                                : currentMapping.matchConfidence === 'medium'
                                                                                  ? 'bg-yellow-100 text-yellow-700'
                                                                                  : 'bg-orange-100 text-orange-700'
                                                                        }`}>
                                                                        {currentMapping.matchConfidence.charAt(0).toUpperCase() +
                                                                            currentMapping.matchConfidence.slice(1)}{' '}
                                                                        Match
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Insights */}
                                                            {(currentMapping.extractedActivity || currentMapping.snippetText) && (
                                                                <div className="space-y-2 pt-2 border-t border-grey_4">
                                                                    {currentMapping.extractedActivity && (
                                                                        <div className="flex items-start gap-2">
                                                                            <TrendingUp className="w-4 h-4 text-primary-default mt-0.5 flex-shrink-0" />
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-xs text-grey-grey_2 font-red-hat-display">
                                                                                    Mentioned in video:
                                                                                </p>
                                                                                <p className="text-xs font-medium text-header-black font-red-hat-display">
                                                                                    {currentMapping.extractedActivity}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {currentMapping.snippetText && (
                                                                        <div className="flex items-start gap-2">
                                                                            <MessageSquare className="w-4 h-4 text-primary-default mt-0.5 flex-shrink-0" />
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-xs text-grey-grey_2 font-red-hat-display">
                                                                                    Context:
                                                                                </p>
                                                                                <p className="text-xs text-grey-grey_1 italic font-red-hat-display">
                                                                                    "{currentMapping.snippetText}"
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : null
                                                })()
                                            )}

                                            {/* Horizontal scrollable experience cards */}
                                            <GenericCarousel>
                                                <div
                                                    className="flex gap-4"
                                                    style={{ minWidth: 'max-content' }}>
                                                    {currentExperiences.map((experience) => {
                                                        const experienceId = experience.id
                                                        const shortlistEntry = shortlistState[experienceId]
                                                        const isShortlisted = shortlistEntry?.isShortlisted ?? false
                                                        const isShortlisting = Boolean(shortlistLoadingIds[experienceId])

                                                        return (
                                                            <div
                                                                key={experience.id}
                                                                className="flex-shrink-0"
                                                                style={{ width: '300px' }}>
                                                                <ExperienceCard
                                                                    experience={convertToExperienceCardData(experience)}
                                                                    onClick={handleExperienceClick}
                                                                    isShortlisted={isShortlisted}
                                                                    onToggleShortlist={() => handleShortlistToggle(experienceId)}
                                                                    isShortlisting={isShortlisting}
                                                                />
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </GenericCarousel>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default WatchAlongPlayerWindow
