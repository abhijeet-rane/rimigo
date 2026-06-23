import { getLiveCountries, type LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI'
import type { CountryListItem } from '@/components/common/SearchHeader'
import SearchHeader from '@/components/common/SearchHeader'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import Divider from '@/components/shared/Divider/Divider'
import ReactHelmet from '@/components/shared/React-Helmet/ReactHelmet'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { WEBSITE_CONFIG } from '@/constants/websiteConfig'
import { TokenStorage } from '@/lib/api/tokenStorage'
import ExperienceDetailsSheet from '@/pages/Experiences/components/ExperienceDetailsSheet'
import { useExperienceDetails } from '@/pages/Experiences/services/experienceDetailsService'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { formatGroupType } from '@/utils/format-group-type'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Wand } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
    ActivityMapping,
    ExperienceWithShort,
    getCuratedVideosByCountry,
    getExperienceMappingsByContent,
    getExperiencesWithShorts,
    getTravelContentById,
    getTravelerVideosByCountry,
    TravelContent
} from '../api/watchAlongApi'
import { CategoryType } from '../components/CategoryFilters'
import CreatorFilters from '../components/CreatorFilters'
import ProcessingVideoCard from '../components/ProcessingVideoCard'
import ShortsCarousel from '../components/ShortsCarousel'
import ShortsModal from '../components/ShortsModal'
import VideoCard from '../components/VideoCard'
import WatchAlongLandingOverlay from '../components/WatchAlongLandingOverlay'
import WatchAlongPlayerWindow from '../components/WatchAlongPlayerWindow'
import { useCountryLiveStatus } from '@/hooks/useCountryLiveStatus'
import MobileCompleteHeaderWithSearch from '@/components/MobileCompleteHeaderWithSearch'
import { useAuth } from '@/lib/auth/providers/AuthProviders'

const WatchAlongPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const { isAuthenticated } = useAuth()
    const countryId = searchParams.get('country_id') || ''
    const countryName = searchParams.get('country_name') || ''

    const [selectedVideo, setSelectedVideo] = useState<TravelContent | null>(null)
    const [processedVideoData, setProcessedVideoData] = useState<{
        video: TravelContent
        activityMappings: ActivityMapping[]
    } | null>(null)
    const [isPlayerOpen, setIsPlayerOpen] = useState(false)
    const [travelerId, setTravelerId] = useState<string | null>(null)
    const [selectedCategories] = useState<CategoryType[]>([])
    const [selectedCreator, setSelectedCreator] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'your-videos' | 'curated' | 'processing'>('curated')
    const [processingVideos, setProcessingVideos] = useState<Map<string, TravelContent>>(new Map())
    const queryClient = useQueryClient()
    const { selectedExperience, isLoading: isExperienceDetailsLoading, isSheetOpen, closeExperienceDetails } = useExperienceDetails()
    const [shortsExperiences, setShortsExperiences] = useState<ExperienceWithShort[]>([])
    const [isShortsModalOpen, setIsShortsModalOpen] = useState(false)
    const [selectedShortIndex, setSelectedShortIndex] = useState(0)
    const [shortsPage, setShortsPage] = useState(1)
    const [hasMoreShorts, setHasMoreShorts] = useState(false)
    const [isLoadingMoreShorts, setIsLoadingMoreShorts] = useState(false)

    // get traveler from context
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const group_type = activeTrip?.tripProfile?.group_type
    const tripCountries = activeTrip?.tripProfile?.final_destination_countries || [] // Can be string[] or Array<{id: string, name: string}>

    const isTripPlanned = Boolean(activeTrip?.final_destination_countries && activeTrip.final_destination_countries.length > 0)
    const shouldUsePrioritized = isAuthenticated && isTripPlanned

    const { isCountryLive } = useCountryLiveStatus({
        countryId: countryId,
        shouldUsePrioritized
    })

    // format group type
    const formattedGroupType = useMemo(() => {
        if (!group_type) return 'you'
        return formatGroupType(group_type)
    }, [group_type])

    // Get traveler_id from storage
    useEffect(() => {
        const fetchTravelerId = async () => {
            try {
                const userInfo = await TokenStorage.getUserInfo()
                if (userInfo?.traveler_id) {
                    setTravelerId(userInfo.traveler_id)
                }
            } catch (error) {
                toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
            }
        }
        fetchTravelerId()
    }, [])

    // Fetch countries data
    const { data: locationPersonalizationData } = useQuery<LocationPersonalizationResponse[]>({
        queryKey: ['locationPersonalization'],
        queryFn: () => getLiveCountries(),
        enabled: true,
        staleTime: HOURS_24
    })

    // Convert final destination countries to CountryListItem format for metadata
    // If no active trip, allow all countries; otherwise restrict to trip's final destination countries
    const metadataCountries: CountryListItem[] = useMemo(() => {
        // If no active trip, show all countries from locationPersonalizationData
        if (locationPersonalizationData) {
            return locationPersonalizationData.map((c) => ({
                id: c.country_id,
                name: c.country_name,
                icon_url: c.icon_url
            }))
        }
        return []
    }, [locationPersonalizationData])

    const DEFAULT_ICON_SRC = 'https://media.rimigo.com/1762497096280_46606bb73a77516095a1ad54a9c6d66a.png'

    // Helper function to modify country name for URL
    const modifyCountryName = useCallback((countryName: string) => {
        return countryName.replace(/ /g, '-').toLowerCase()
    }, [])

    // Prefill country from trip's first final destination country if missing
    useEffect(() => {
        if (!activeTrip) return
        if (!tripCountries || tripCountries.length === 0) return
        // Only prefill if country_id missing
        if (countryId) return

        // Get first country - handle both string[] and Array<{id, name}>
        const firstCountry = tripCountries[0]
        const firstCountryId = typeof firstCountry === 'string' ? firstCountry : (firstCountry as any)?.id
        if (!firstCountryId) return

        const next = new URLSearchParams(searchParams)
        // Always set id
        next.set('country_id', firstCountryId)
        // Set name if we can resolve it
        // Try from locationPersonalizationData first, then from tripCountries if it's an object
        const fromAll = locationPersonalizationData?.find((c) => c.country_id === firstCountryId)
        const countryNameFromTrip = typeof firstCountry === 'object' && firstCountry !== null ? (firstCountry as any)?.name : undefined
        const countryName = fromAll?.country_name || countryNameFromTrip
        if (countryName) {
            next.set('country_name', modifyCountryName(countryName))
        }
        // Preserve existing params
        setSearchParams(next, { replace: true })
    }, [activeTrip, tripCountries, countryId, locationPersonalizationData, searchParams, setSearchParams, modifyCountryName])

    // Get initial country data for SearchHeader
    const initialCountryData = useMemo(() => {
        if (countryId && isCountryLive === false) {
            return undefined
        }
        if (!countryId) return undefined

        // If locationPersonalizationData is still loading, return undefined to prevent clearing URL params
        // The SearchBar will keep the existing selection until data loads
        if (!locationPersonalizationData && metadataCountries.length === 0) {
            return undefined
        }

        // const countryFromMetadata = metadataCountries.find((c) => c.id === countryId)
        const countryFromAPI = locationPersonalizationData?.find((c) => c.country_id === countryId)

        // If we have countryId in URL but can't find it in data, still return it to preserve URL params
        // This prevents clearing during initialization
        if (!countryFromAPI) {
            // Return a minimal country object to preserve URL params until data loads
            // Convert countryName from URL format (with dashes) back to readable format
            const readableCountryName = countryName ? countryName.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : countryId
            return [
                {
                    id: countryId,
                    name: readableCountryName,
                    icon_url: undefined
                }
            ]
        }

        const resolvedCountryName = countryFromAPI?.country_name || countryName || ''
        const iconUrl = countryFromAPI?.icon_url

        return [
            {
                id: countryId,
                name: resolvedCountryName,
                icon_url: iconUrl
            }
        ]
    }, [countryId, metadataCountries, locationPersonalizationData, countryName])

    const selectedCountryIconSrc = useMemo(() => {
        if (!countryId) return DEFAULT_ICON_SRC

        const fromLocationPersonalization = locationPersonalizationData?.find((c) => c.country_id === countryId)?.icon_url
        if (fromLocationPersonalization) return fromLocationPersonalization

        const fromMetadata = metadataCountries.find((c) => c.id === countryId)?.icon_url
        if (fromMetadata) return fromMetadata

        const fromInitial = initialCountryData?.[0]?.icon_url
        if (fromInitial) return fromInitial

        return DEFAULT_ICON_SRC
    }, [countryId, locationPersonalizationData, metadataCountries, initialCountryData])

    // Handle country selection changes
    const handleCountryChange = useCallback(
        (countries: CountryListItem[]) => {
            const selectedCountry = countries[0]
            if (selectedCountry) {
                const next = new URLSearchParams(searchParams)
                next.set('country_id', selectedCountry.id)

                const countryNameFromAPI =
                    locationPersonalizationData?.find((c) => c.country_id === selectedCountry.id)?.country_name || selectedCountry.name
                next.set('country_name', modifyCountryName(countryNameFromAPI))

                setSearchParams(next, { replace: true })
            } else {
                // Only clear country if we have a countryId in URL (user explicitly deselected)
                // Don't clear during initialization when locationPersonalizationData is still loading
                if (countryId && locationPersonalizationData) {
                    const next = new URLSearchParams(searchParams)
                    next.delete('country_id')
                    next.delete('country_name')
                    setSearchParams(next, { replace: true })
                }
            }
        },
        [searchParams, setSearchParams, locationPersonalizationData, modifyCountryName, countryId]
    )

    // Get preview country ID for landing page (prefer UAE, otherwise first available country)
    const previewCountryId = useMemo(() => {
        if (!locationPersonalizationData || locationPersonalizationData.length === 0) return null
        // Try to find UAE first (common destination with videos)
        const uae = locationPersonalizationData.find(
            (c) => c.country_name.toLowerCase().includes('uae') || c.country_name.toLowerCase().includes('united arab emirates')
        )
        return uae?.country_id || locationPersonalizationData[0]?.country_id || null
    }, [locationPersonalizationData])

    // Fetch preview videos for landing page
    const { data: previewVideosData } = useQuery({
        queryKey: ['previewVideos', previewCountryId],
        queryFn: () => getCuratedVideosByCountry(previewCountryId!),
        enabled: (!countryId || isCountryLive === false) && !!previewCountryId, // Only fetch when no country is selected and we have a preview country
        staleTime: 5 * 60 * 1000 // 5 minutes
    })

    // Fetch curated videos (Rimigo curated)
    const {
        data: curatedVideosData,
        isLoading: isCuratedVideosLoading,
        error: curatedVideosError
    } = useQuery({
        queryKey: ['curatedVideos', countryId, selectedCategories],
        queryFn: () => getCuratedVideosByCountry(countryId, selectedCategories.length > 0 ? selectedCategories : undefined),
        enabled: !!countryId,
        staleTime: 5 * 60 * 1000 // 5 minutes
    })

    // Fetch traveler videos
    const {
        data: travelerVideosData,
        isLoading: isTravelerVideosLoading,
        error: travelerVideosError
    } = useQuery({
        queryKey: ['travelerVideos', countryId, travelerId, countryName, selectedCategories],
        queryFn: () =>
            getTravelerVideosByCountry(travelerId!, countryName || undefined, selectedCategories.length > 0 ? selectedCategories : undefined),
        enabled: !!countryId && !!travelerId,
        staleTime: 5 * 60 * 1000 // 5 minutes
    })

    // Reset shorts state when country changes
    useEffect(() => {
        setShortsPage(1)
        setShortsExperiences([])
        setHasMoreShorts(false)
        setIsLoadingMoreShorts(false)
        // Invalidate and refetch shorts when country changes
        if (countryId) {
            queryClient.invalidateQueries({ queryKey: ['experiencesWithShorts', countryId] })
        }
    }, [countryId, queryClient])

    // Fetch experiences with shorts
    const {
        data: shortsData,
        isFetching: isFetchingShorts,
        isError: isShortsError
    } = useQuery({
        queryKey: ['experiencesWithShorts', countryId, shortsPage],
        queryFn: () => getExperiencesWithShorts(countryId, shortsPage, 20, false),
        enabled: !!countryId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: true // Always refetch when component mounts or query key changes
    })

    // Update shorts experiences when data is fetched
    useEffect(() => {
        if (shortsData?.data) {
            if (shortsPage === 1) {
                // First page - show first 6 in carousel, keep all for modal
                setShortsExperiences(shortsData.data)
            } else {
                // Append new experiences for pagination
                setShortsExperiences((prev) => [...prev, ...shortsData.data])
            }
            // Calculate has_more based on pagination
            const hasMoreData = shortsData.page * shortsData.limit < shortsData.total_experiences
            setHasMoreShorts(hasMoreData)
        }
    }, [shortsData, shortsPage])

    useEffect(() => {
        if (!isFetchingShorts && (isShortsError || !shortsData?.data)) {
            setIsLoadingMoreShorts(false)
        } else if (shortsData?.data) {
            setIsLoadingMoreShorts(false)
        }
    }, [shortsData, isFetchingShorts, isShortsError])

    // Load more shorts
    const handleLoadMoreShorts = useCallback(async () => {
        if (isLoadingMoreShorts || !hasMoreShorts) return

        setIsLoadingMoreShorts(true)
        setShortsPage((prev) => prev + 1)
    }, [isLoadingMoreShorts, hasMoreShorts])

    // Fetch experience mappings for selected video (only for curated videos)
    const { data: mappingsData, isLoading: isMappingsLoading } = useQuery({
        queryKey: ['experienceMappings', selectedVideo?.id],
        queryFn: () => getExperienceMappingsByContent(selectedVideo!.id),
        enabled: !!selectedVideo?.id && isPlayerOpen && !processedVideoData
    })

    // Filter only videos with extracted information and apply search filter
    const allCuratedVideos = curatedVideosData?.data?.filter((video) => video.is_information_extracted) || []
    const allTravelerVideos = travelerVideosData?.data?.filter((video) => video.is_information_extracted) || []

    // Combine all videos for creator filter extraction
    const allVideosForCreators = useMemo(() => {
        return [...allCuratedVideos, ...allTravelerVideos]
    }, [allCuratedVideos, allTravelerVideos])

    // Apply search filter and creator filter (searches in title, description, channel, and tags)
    const filteredCuratedVideos = useMemo(() => {
        let filtered = allCuratedVideos

        // Apply creator filter
        if (selectedCreator) {
            filtered = filtered.filter((video) => video.meta_data.channel_title === selectedCreator)
        }

        // // Apply search filter
        // if (searchQuery.trim()) {
        //     const query = searchQuery.toLowerCase()
        //     filtered = filtered.filter((video) => {
        //         const title = video.meta_data.title?.toLowerCase() || ''
        //         const description = video.meta_data.description?.toLowerCase() || ''
        //         const channel = video.meta_data.channel_title?.toLowerCase() || ''
        //         const tags = video.meta_data.tags?.join(' ')?.toLowerCase() || ''
        //         return title.includes(query) || description.includes(query) || channel.includes(query) || tags.includes(query)
        //     })
        // }

        return filtered
    }, [allCuratedVideos, selectedCreator])

    const filteredTravelerVideos = useMemo(() => {
        let filtered = allTravelerVideos

        // Apply creator filter
        if (selectedCreator) {
            filtered = filtered.filter((video) => video.meta_data.channel_title === selectedCreator)
        }

        return filtered
    }, [allTravelerVideos, selectedCreator])

    const curatedVideos = filteredCuratedVideos
    const travelerVideos = filteredTravelerVideos
    const isVideosLoading = isCuratedVideosLoading || isTravelerVideosLoading
    const videosError = curatedVideosError || travelerVideosError

    // Mapping function: group_type -> content_categories
    const mapGroupTypeToCategory = useCallback((groupType: string | undefined): string | null => {
        if (!groupType) return null

        const normalizedType = groupType.toLowerCase().trim()

        // Map group_type to content_categories
        if (normalizedType === 'family' || normalizedType === 'families' || normalizedType === 'immediate_family') {
            return 'family'
        }
        if (normalizedType === 'couple' || normalizedType === 'couples' || normalizedType === 'couple_with_children') {
            return 'couples'
        }
        if (normalizedType === 'solo' || normalizedType === 'solo_traveler') {
            return 'solo'
        }
        if (normalizedType === 'friends' || normalizedType === 'friends_group') {
            return 'friends'
        }
        if (normalizedType === 'large_group') {
            return 'group'
        }

        return null
    }, [])

    const forYouCategory = useMemo(() => mapGroupTypeToCategory(group_type || undefined), [group_type, mapGroupTypeToCategory])

    // Helper function to capitalize category name
    const formatCategoryName = (category: string): string => {
        return category
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }

    // Filter videos for "For You" section based on content_categories
    const forYouVideos = useMemo(() => {
        if (!forYouCategory) return []

        return curatedVideos.filter((video) => {
            // Check if video's content_categories array includes the mapped category
            return video.content_categories?.some((cat) => cat.toLowerCase() === forYouCategory.toLowerCase()) || false
        })
    }, [curatedVideos, forYouCategory])

    // Filter out "For You" videos from regular category grouping to avoid duplicates
    const curatedVideosWithoutForYou = useMemo(() => {
        if (!forYouCategory || forYouVideos.length === 0) return curatedVideos

        const forYouVideoIds = new Set(forYouVideos.map((v) => v.id))
        return curatedVideos.filter((video) => !forYouVideoIds.has(video.id))
    }, [curatedVideos, forYouVideos, forYouCategory])

    // Group videos by content_category
    const groupVideosByCategory = useCallback((videos: TravelContent[]) => {
        const grouped = new Map<string, TravelContent[]>()

        videos.forEach((video) => {
            const category = video.content_category || 'uncategorized'
            if (!grouped.has(category)) {
                grouped.set(category, [])
            }
            grouped.get(category)!.push(video)
        })

        // Sort categories alphabetically
        return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    }, [])

    const curatedVideosByCategory = useMemo(
        () => groupVideosByCategory(curatedVideosWithoutForYou),
        [curatedVideosWithoutForYou, groupVideosByCategory]
    )
    const travelerVideosByCategory = useMemo(() => groupVideosByCategory(travelerVideos), [travelerVideos, groupVideosByCategory])

    const handleVideoClick = (video: TravelContent) => {
        setSelectedVideo(video)
        setProcessedVideoData(null) // Clear processed video if selecting curated video
        setIsPlayerOpen(true)
    }

    const handleClosePlayer = () => {
        setIsPlayerOpen(false)
        setSelectedVideo(null)
        setProcessedVideoData(null)
    }

    // const handleProcessedVideo = (data: { video: TravelContent; activityMappings: ActivityMapping[] }) => {
    //     setProcessedVideoData(data)
    //     setSelectedVideo(data.video)
    //     setIsPlayerOpen(true)

    //     // Remove from processing videos if it was there
    //     setProcessingVideos((prev) => {
    //         const next = new Map(prev)
    //         next.delete(data.video.id)
    //         return next
    //     })

    //     // Invalidate and refetch traveler videos to show the newly processed video
    //     if (travelerId) {
    //         queryClient.invalidateQueries({ queryKey: ['travelerVideos', countryId, travelerId, countryName] })
    //     }
    // }

    // const handleProcessingStarted = (video: TravelContent) => {
    //     // Add to processing videos
    //     setProcessingVideos((prev) => {
    //         const next = new Map(prev)
    //         next.set(video.id, video)
    //         return next
    //     })

    //     // Switch to processing tab
    //     setActiveTab('processing')
    // }

    const handleRefreshProcessingVideo = async (videoId: string) => {
        try {
            const response = await getTravelContentById(videoId)
            if (response.success && response.data) {
                const updatedVideo = response.data

                // Update processing videos state
                setProcessingVideos((prev) => {
                    const next = new Map(prev)
                    if (updatedVideo.processing_status === 'completed' && updatedVideo.is_information_extracted) {
                        // Remove from processing, it will show in "Your Videos" after refetch
                        next.delete(videoId)
                        // Invalidate traveler videos to refetch
                        if (travelerId) {
                            queryClient.invalidateQueries({ queryKey: ['travelerVideos', countryId, travelerId, countryName] })
                        }
                    } else {
                        // Update status
                        next.set(videoId, updatedVideo)
                    }
                    return next
                })
            }
        } catch (error) {
            toast.error((error as Error).message || 'Failed to refresh video status.')
        }
    }

    const handleOpenProcessingVideo = async (video: TravelContent) => {
        if (video.processing_status === 'completed' && video.is_information_extracted) {
            // Video is ready, treat it like a curated video and fetch experience mappings
            try {
                setSelectedVideo(video)
                setProcessedVideoData(null) // Clear processed data since we'll use regular mappings
                setIsPlayerOpen(true)

                // Remove from processing
                setProcessingVideos((prev) => {
                    const next = new Map(prev)
                    next.delete(video.id)
                    return next
                })
            } catch (error) {
                toast.error((error as Error).message || 'Failed to open video.')
            }
        } else {
            // Still processing or failed, refresh status
            handleRefreshProcessingVideo(video.id)
        }
    }

    // Determine if we should show landing overlay (no country selected)
    const showLandingState = !countryId || !isCountryLive

    // Get preview videos for landing page
    const previewVideos = previewVideosData?.data?.filter((video) => video.is_information_extracted) || []

    return (
        <>
            <ReactHelmet
                title={`Rimigo |  ${WEBSITE_CONFIG.WATCHALONG_TITLE} ${countryName.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || ''}`}
            />
            <div className={`h-screen flex flex-col overflow-hidden relative ${showLandingState ? 'bg-natural-white' : 'bg-grey_6'}`}>
                {/* Landing Overlay - Show when no country is selected */}
                {showLandingState && <WatchAlongLandingOverlay previewVideos={previewVideos} />}

                {/* Header */}
                <MobileCompleteHeaderWithSearch
                    title={WEBSITE_CONFIG.WATCHALONG_TITLE}
                    headerType={'experiences'}
                    iconSrc={selectedCountryIconSrc}
                    countryConfig={{
                        enabled: true,
                        required: false,
                        label: 'Country',
                        placeholder: 'Search countries',
                        multiselect: false,
                        initialData: initialCountryData,
                        onChange: handleCountryChange,
                        metadata:
                            metadataCountries.length > 0
                                ? {
                                      countries: metadataCountries
                                  }
                                : undefined
                    }}
                    whereConfig={{ enabled: false }}
                    whenConfig={{ enabled: false }}
                    preferencesConfig={{ enabled: false }}
                    wishlistConfig={{ enabled: false }}
                />
                <SearchHeader
                    ishidden={true}
                    pageName={WEBSITE_CONFIG.WATCHALONG_TITLE}
                    iconSrc={selectedCountryIconSrc}
                    countryConfig={{
                        enabled: true,
                        required: false,
                        label: 'Country',
                        placeholder: 'Search countries',
                        multiselect: false,
                        initialData: initialCountryData,
                        onChange: handleCountryChange,
                        metadata:
                            metadataCountries.length > 0
                                ? {
                                      countries: metadataCountries
                                  }
                                : undefined
                    }}
                    whereConfig={{ enabled: false }}
                    whenConfig={{ enabled: false }}
                    preferencesConfig={{ enabled: false }}
                    assistantConfig={{ enabled: false }}
                    filterConfig={{ enabled: false }}
                    sortConfig={{ enabled: false }}
                    wishlistConfig={{ enabled: false }}
                />

                {/* Content - Scrollable - Hide when landing state is active */}
                {!showLandingState && (
                    <div className="flex-1 overflow-y-auto">
                        <div className="container mx-auto px-4 py-2">
                            {/* YouTube URL Processor - Compact */}
                            {/* <YouTubeURLProcessor
                        countryId={countryId}
                        onProcessed={handleProcessedVideo}
                        onProcessingStarted={handleProcessingStarted}
                    /> */}

                            {/* Tabs and Search/Filters Section */}
                            {(allCuratedVideos.length > 0 || allTravelerVideos.length > 0 || processingVideos.size > 0) && (
                                <div className="mt-0">
                                    {/* Tabs */}
                                    <div className="flex items-center gap-1 mb-0">
                                        {/* <button
                                    onClick={() => setActiveTab('curated')}
                                    className={`px-4 py-2 text-sm font-medium font-red-hat-display transition-colors relative ${
                                        activeTab === 'curated' ? 'text-primary-default' : 'text-grey-grey_2 hover:text-header-black'
                                    }`}>
                                    Rimigo Curated
                                    {activeTab === 'curated' && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-default"
                                        />
                                    )}
                                    {curatedVideos.length > 0 && (
                                        <span
                                            className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                                                activeTab === 'curated' ? 'bg-primary-default/10 text-primary-default' : 'bg-grey_5 text-grey-grey_2'
                                            }`}>
                                            {curatedVideos.length}
                                        </span>
                                    )}
                                </button> */}
                                        {processingVideos.size > 0 && (
                                            <button
                                                onClick={() => setActiveTab('processing')}
                                                className={`px-4 py-2 text-sm font-medium font-red-hat-display transition-colors relative ${
                                                    activeTab === 'processing' ? 'text-primary-default' : 'text-grey-grey_2 hover:text-header-black'
                                                }`}>
                                                Processing
                                                {activeTab === 'processing' && (
                                                    <motion.div
                                                        layoutId="activeTab"
                                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-default"
                                                    />
                                                )}
                                                <span
                                                    className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                                                        activeTab === 'processing'
                                                            ? 'bg-primary-default/10 text-primary-default'
                                                            : 'bg-grey_5 text-grey-grey_2'
                                                    }`}>
                                                    {processingVideos.size}
                                                </span>
                                            </button>
                                        )}
                                        {allTravelerVideos.length > 0 && (
                                            <button
                                                onClick={() => setActiveTab('your-videos')}
                                                className={`px-4 py-2 text-sm font-medium font-red-hat-display transition-colors relative ${
                                                    activeTab === 'your-videos' ? 'text-primary-default' : 'text-grey-grey_2 hover:text-header-black'
                                                }`}>
                                                Your Videos
                                                {activeTab === 'your-videos' && (
                                                    <motion.div
                                                        layoutId="activeTab"
                                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-default"
                                                    />
                                                )}
                                                {travelerVideos.length > 0 && (
                                                    <span
                                                        className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                                                            activeTab === 'your-videos'
                                                                ? 'bg-primary-default/10 text-primary-default'
                                                                : 'bg-grey_5 text-grey-grey_2'
                                                        }`}>
                                                        {travelerVideos.length}
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {/* Search and Filters - More Integrated */}
                                    <div className="mb-6 py-6 gap-4  flex flex-col justify-between items-start border-b border-grey-4">
                                        <CreatorFilters
                                            videos={allVideosForCreators}
                                            selectedCreator={selectedCreator}
                                            onCreatorSelect={setSelectedCreator}
                                        />

                                        {/* Search Bar - Subtle and Compact */}
                                        {/* <div className="flex items-center gap-3">
                                            <div className="relative flex-1 max-w-full">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-grey-grey_2" />
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search..."
                                                    className="w-full pl-9 pr-9 py-2 bg-white border border-grey_4 rounded-lg focus:outline-none focus:border-primary-default font-red-hat-display text-sm text-header-black placeholder:text-grey-grey_2"
                                                />
                                                {searchQuery && (
                                                    <button
                                                        onClick={() => setSearchQuery('')}
                                                        className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-grey-grey_2 hover:text-header-black">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="text-xs text-primary-default hover:text-primary-hover font-red-hat-display whitespace-nowrap">
                                                    Clear search
                                                </button>
                                            )}
                                        </div> */}

                                        {/* Creator Filters - Full Width */}

                                        {/* Category Filters - Full Width */}
                                        {/* <CategoryFilters
                                    selectedCategories={selectedCategories}
                                    onCategoryToggle={handleCategoryToggle}
                                    onClearAll={handleClearCategories}
                                /> */}
                                    </div>
                                </div>
                            )}

                            {isVideosLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="w-16 h-16 border-4 border-grey_4 border-t-primary-default rounded-full animate-spin"></div>
                                </div>
                            ) : videosError ? (
                                <div className="text-center py-20">
                                    <p className="text-lg text-grey-grey_2 font-red-hat-display mb-4">Failed to load videos. Please try again.</p>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-6 py-2 bg-primary-default text-white rounded-lg hover:bg-primary-hover transition-colors font-red-hat-display">
                                        Retry
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Tab Content */}
                                    {activeTab === 'processing' ? (
                                        /* Processing Videos Tab */
                                        <div>
                                            {processingVideos.size > 0 ? (
                                                <>
                                                    <div className="mb-4">
                                                        <p className="text-sm text-grey-grey_2 font-red-hat-display">
                                                            Videos currently being processed. They'll move to "Your Videos" when ready.
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                        {Array.from(processingVideos.values()).map((video) => (
                                                            <ProcessingVideoCard
                                                                key={video.id}
                                                                video={video}
                                                                onRefresh={() => handleRefreshProcessingVideo(video.id)}
                                                                onOpen={handleOpenProcessingVideo}
                                                            />
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center py-12">
                                                    <p className="text-sm text-grey-grey_2 font-red-hat-display mb-2">
                                                        No videos currently being processed.
                                                    </p>
                                                    <p className="text-xs text-grey-grey_2 font-red-hat-display">
                                                        Process a YouTube video using the input above to see it here!
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : activeTab === 'your-videos' ? (
                                        /* Your Videos Tab */
                                        <div>
                                            {allTravelerVideos.length > 0 ? (
                                                <>
                                                    <div className="mb-6">
                                                        <p className="text-sm text-grey-grey_2 font-red-hat-display">
                                                            Videos you've processed and saved
                                                        </p>
                                                    </div>
                                                    {travelerVideos.length > 0 ? (
                                                        /* Videos grouped by category */
                                                        <div className="space-y-8">
                                                            {travelerVideosByCategory.map(([category, videos], index) => (
                                                                <div key={category}>
                                                                    {index > 0 && <Divider className="mb-8" />}
                                                                    <div className="space-y-4">
                                                                        <h2 className="text-xl font-bold text-header-black font-red-hat-display">
                                                                            {formatCategoryName(category)}
                                                                        </h2>
                                                                        <GenericCarousel>
                                                                            {videos.map((video) => (
                                                                                <div
                                                                                    key={video.id}
                                                                                    className="shrink-0 w-[280px] h-full">
                                                                                    <VideoCard
                                                                                        video={video}
                                                                                        onClick={handleVideoClick}
                                                                                        isTravelerVideo={true}
                                                                                    />
                                                                                </div>
                                                                            ))}
                                                                        </GenericCarousel>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-12 bg-grey_5 rounded-lg">
                                                            <p className="text-sm text-grey-grey_2 font-red-hat-display">
                                                                No videos match your search or filters
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-center py-12">
                                                    <p className="text-sm text-grey-grey_2 font-red-hat-display mb-2">
                                                        You haven't processed any videos yet.
                                                    </p>
                                                    <p className="text-xs text-grey-grey_2 font-red-hat-display">
                                                        Use the input above to process a YouTube video and save it here!
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Rimigo Curated Videos Tab */
                                        <div>
                                            {curatedVideos.length > 0 ? (
                                                <>
                                                    {/* <div className="mb-6">
                                                <p className="text-sm text-grey-grey_2 font-red-hat-display">
                                                    Watch curated YouTube videos and discover experiences mentioned at specific timestamps
                                                </p>
                                            </div> */}
                                                    {/* Videos grouped by category */}
                                                    <div className="space-y-8">
                                                        {/* "For You" Section - Show first if available */}
                                                        {forYouVideos.length > 0 && (
                                                            <div className="rounded-lg p-4 bg-primary-default-80">
                                                                <div className="space-y-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <Wand className="w-5 h-5 text-primary-default" />
                                                                        <h2 className="text-xl italic font-medium font-red-hat-display">
                                                                            {/* write group type */}
                                                                            <span className="text-primary-default">Suggested </span>
                                                                            for {group_type ? `${formattedGroupType}` : 'you'}
                                                                        </h2>
                                                                    </div>
                                                                    {/* <p className="text-sm text-grey-grey_2 font-red-hat-display">
                                                                Personalized recommendations based on your travel group
                                                            </p> */}
                                                                    <GenericCarousel
                                                                        gradientStartColor="var(--color-primary-default-80)"
                                                                        gradientEndColor="transparent"
                                                                        gradientLeftStartColor="var(--color-primary-default-80)"
                                                                        gradientLeftEndColor="transparent">
                                                                        {forYouVideos.map((video) => (
                                                                            <div
                                                                                key={video.id}
                                                                                className="shrink-0 w-[280px] h-full">
                                                                                <VideoCard
                                                                                    video={video}
                                                                                    onClick={handleVideoClick}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </GenericCarousel>
                                                                    {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                                {forYouVideos.map((video) => (
                                                                    <VideoCard
                                                                        key={video.id}
                                                                        video={video}
                                                                        onClick={handleVideoClick}
                                                                    />
                                                                ))}
                                                            </div> */}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* shorts */}
                                                        {/* YouTube Shorts Section */}
                                                        {shortsExperiences.length > 0 && (
                                                            <>
                                                                <Divider className="my-8" />
                                                                <div className="space-y-4">
                                                                    <h2 className="text-xl font-bold text-header-black font-red-hat-display">
                                                                        Explore places, from real travelers
                                                                    </h2>
                                                                    <ShortsCarousel
                                                                        experiences={shortsExperiences}
                                                                        onShortClick={(index) => {
                                                                            setSelectedShortIndex(index)
                                                                            setIsShortsModalOpen(true)
                                                                        }}
                                                                        hasMore={hasMoreShorts}
                                                                        onLoadMore={handleLoadMoreShorts}
                                                                        isLoadingMore={isLoadingMoreShorts}
                                                                    />
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* Divider between "For You" and regular categories */}
                                                        {forYouVideos.length > 0 && curatedVideosByCategory.length > 0 && (
                                                            <Divider className="mb-8" />
                                                        )}

                                                        {/* Regular category sections */}
                                                        {curatedVideosByCategory.map(([category, videos], index) => (
                                                            <div key={category}>
                                                                {index > 0 && <Divider className="mb-8" />}
                                                                <div className="space-y-4">
                                                                    <h2 className="text-xl font-bold text-header-black font-red-hat-display">
                                                                        {formatCategoryName(category)}
                                                                    </h2>
                                                                    <GenericCarousel>
                                                                        {videos.map((video) => (
                                                                            <div
                                                                                key={video.id}
                                                                                className="shrink-0 w-[280px] h-full">
                                                                                <VideoCard
                                                                                    video={video}
                                                                                    onClick={handleVideoClick}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </GenericCarousel>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : allCuratedVideos.length === 0 ? (
                                                <div className="text-center py-12">
                                                    <p className="text-sm text-grey-grey_2 font-red-hat-display mb-2">
                                                        No curated videos available for this country yet.
                                                    </p>
                                                    <p className="text-xs text-grey-grey_2 font-red-hat-display">
                                                        Check back later for new travel videos!
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 bg-grey_5 rounded-lg">
                                                    <p className="text-sm text-grey-grey_2 font-red-hat-display">
                                                        No videos match your search or filters
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Empty State - Only show if no videos at all and no active tab filters */}
                                    {allCuratedVideos.length === 0 && allTravelerVideos.length === 0 && (
                                        <div className="text-center py-12">
                                            <p className="text-sm text-grey-grey_2 font-red-hat-display mb-2">No videos available yet.</p>
                                            <p className="text-xs text-grey-grey_2 font-red-hat-display">
                                                Process a YouTube video using the input above to get started!
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Video Player Window */}
                {(selectedVideo || processedVideoData) && (
                    <WatchAlongPlayerWindow
                        isOpen={isPlayerOpen}
                        onClose={handleClosePlayer}
                        video={selectedVideo || processedVideoData?.video || null}
                        experienceMappings={processedVideoData ? [] : mappingsData?.data || []}
                        activityMappings={processedVideoData?.activityMappings}
                        isLoadingMappings={processedVideoData ? false : isMappingsLoading}
                    />
                )}

                {/* Experience Details Sheet */}
                <ExperienceDetailsSheet
                    experience={selectedExperience}
                    isOpen={isSheetOpen}
                    onClose={closeExperienceDetails}
                    isLoading={isExperienceDetailsLoading}
                />

                {/* Shorts Modal */}
                <ShortsModal
                    isOpen={isShortsModalOpen}
                    onClose={() => setIsShortsModalOpen(false)}
                    experiences={shortsExperiences}
                    initialIndex={selectedShortIndex}
                    hasMore={hasMoreShorts}
                    onLoadMore={handleLoadMoreShorts}
                    isLoadingMore={isLoadingMoreShorts}
                />
            </div>
        </>
    )
}

export default WatchAlongPage
