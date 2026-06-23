import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchThreads, fetchInteractions, callATAApi, fetchInteraction } from '@/api/ataAPI/ataApi'
import { X, Wand2, Sparkles, Search } from 'lucide-react'
import { TypingAnimation } from '@/components/ui/typing-animation'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import FloatingPrompt from '@/modules/Acitvities/components/FilterCarousel/FloatingPrompt'
import Divider from '@/components/shared/Divider/Divider'
import OutputLoadingComponent from '@/pages/Stays/Components/OutputLoadingComponent'
import { toast } from 'sonner'
import ListCard from '@/components/ListCard'
import { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import { formatIdentifierToTitle } from '@/modules/Acitvities/utils/textUtils'
import { getCategoryIcon } from '@/modules/Acitvities/utils/categoryIconMapper'
import { formatPrice } from '@/modules/Experiences/utils/priceFormatter'
import SneakPeekModal from '@/modules/Acitvities/components/SneakPeakModal/SneakPeekModal'
import { useSearchParams } from 'react-router-dom'
import { UIConfig } from '@/modules/AtaAgent/utils/loaderConfigUtils'
import { PROVIDER_LOGOS } from '@/constants/providerLogos'

interface FloatingPromptData {
    text: string
    onClick?: () => void
}

interface SmartSearchSectionProps {
    agentId: string | undefined
    cityId: string | null | undefined
    cityName?: string | null | undefined
    countryId?: string | null | undefined
    countryName?: string | null | undefined
    month?: string | undefined
    groupType?: string | undefined
    purposeType?: string | undefined
    preferences?: string[]
    tripId?: string | null
    floatingPrompts?: FloatingPromptData[]
    onSearch?: (query: string) => void
    onClose?: () => void
    shortlistState?: Record<string, { experienceId: string; isShortlisted: boolean }>
    shortlistLoadingIds?: Record<string, boolean>
    onShortlistToggle?: (experienceId: string) => Promise<void>
    onSneakPeekClick?: (e: React.MouseEvent, experienceId: string) => void
    onExperienceClick?: (experienceId: string) => void
}

const SmartSearchSection: React.FC<SmartSearchSectionProps> = ({
    agentId,
    cityId,
    cityName,
    countryId,
    countryName,
    month,
    groupType,
    purposeType,
    preferences = [],
    tripId,
    floatingPrompts = [],
    onSearch,
    onClose,
    shortlistState = {},
    shortlistLoadingIds = {},
    onShortlistToggle,
    onExperienceClick
}) => {
    const [searchParams] = useSearchParams()
    const [query, setQuery] = useState('')
    const [currentInteractionId, setCurrentInteractionId] = useState<string | null>(null)
    const [isPolling, setIsPolling] = useState(false)
    const [pollingInteraction, setPollingInteraction] = useState<any>(null)
    const [pollingStartTime, setPollingStartTime] = useState<number | null>(null)
    const [selectedExperienceIdForSneakPeek, setSelectedExperienceIdForSneakPeek] = useState<string | null>(null)

    // Fetch latest thread for the agent with entity filters
    const {
        data: threadsData,
        isLoading: isThreadsLoading,
        refetch: refetchThreads
    } = useQuery({
        queryKey: ['smartSearchThreads', agentId, cityId],
        queryFn: async () => {
            if (!agentId || !cityId) return null
            return fetchThreads(agentId, 1, cityId, 'city_id')
        },
        enabled: !!agentId && !!cityId
    })

    // Get the latest thread
    const latestThread = useMemo(() => {
        if (!threadsData?.data?.data || threadsData.data.data.length === 0) return null
        // Sort by updated_at to get the latest thread
        const sortedThreads = [...threadsData.data.data].sort((a, b) => {
            const dateA = new Date(a.updated_at).getTime()
            const dateB = new Date(b.updated_at).getTime()
            return dateB - dateA
        })
        return sortedThreads[0]
    }, [threadsData])

    // Fetch interactions for the latest thread
    const {
        data: interactionsData,
        isLoading: isInteractionsLoading,
        refetch: refetchInteractions
    } = useQuery({
        queryKey: ['smartSearchInteractions', agentId, latestThread?.id],
        queryFn: async () => {
            if (!agentId || !latestThread?.id) return null
            return fetchInteractions(agentId, latestThread.id)
        },
        enabled: !!agentId && !!latestThread?.id
    })

    // Get the latest interaction
    const latestInteraction = useMemo(() => {
        if (!interactionsData?.data?.data || interactionsData.data.data.length === 0) return null
        // Sort by created_at to get the latest interaction
        const sortedInteractions = [...interactionsData.data.data].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime()
            const dateB = new Date(b.created_at).getTime()
            return dateB - dateA
        })
        return sortedInteractions[0]
    }, [interactionsData])

    const isLoading = isThreadsLoading || isInteractionsLoading

    // Transform experience data from API response to ExperienceCardData format
    const transformExperienceData = useCallback((experienceData: any): ExperienceCardData => {
        // Build images array from verified_photos and landscape_image
        const landscapeImage = experienceData.display_props?.landscape_image || ''
        const verifiedPhotoUrls = experienceData.verified_photos?.map((photo: any) => photo.url).filter(Boolean) || []

        const images: string[] = []
        if (landscapeImage) {
            images.push(landscapeImage)
        }
        verifiedPhotoUrls.forEach((url: string) => {
            if (url && !images.includes(url)) {
                images.push(url)
            }
        })

        // Get first category
        const firstCategory = experienceData.categories && experienceData.categories.length > 0 ? experienceData.categories[0] : null
        const categoryIcon = getCategoryIcon(firstCategory ?? null)

        return {
            id: experienceData.id,
            suggestion_priority: experienceData.suggestion_priority ?? null,
            title: formatIdentifierToTitle(experienceData.identifier || experienceData.name),
            name: experienceData.name,
            identifier: experienceData.identifier,
            city_name: experienceData.city_name,
            city_id: experienceData.city_id,
            price: {
                lower_bound: experienceData.price?.lower_bound ?? null,
                upper_bound: experienceData.price?.upper_bound ?? null,
                currency: experienceData.price?.currency ?? null
            },
            image: landscapeImage,
            images: images.length > 0 ? images : undefined,
            short_description: experienceData.short_description ?? null,
            category: null, // We can format this if needed
            categoryBackendValue: firstCategory ?? null,
            categories: experienceData.categories ?? null,
            categoryIcon: categoryIcon ?? null
        }
    }, [])

    // Determine which interaction to use for displaying data
    // Prioritize pollingInteraction if it's completed/failed, otherwise use latestInteraction
    const activeInteraction = useMemo(() => {
        if (pollingInteraction && (pollingInteraction.output_status === 'completed' || pollingInteraction.output_status === 'failed')) {
            return pollingInteraction
        }
        return latestInteraction
    }, [pollingInteraction, latestInteraction])

    // Get transformed experience data from active interaction
    const experienceCards = useMemo(() => {
        if (!activeInteraction?.output_data) return []
        const outputData = activeInteraction.output_data

        if (outputData.output_type === 'experience_list' && outputData.response?.data) {
            return (outputData.response.data as any[]).map(transformExperienceData)
        }
        return []
    }, [activeInteraction, transformExperienceData])

    // Get output summary or response text
    const outputSummary = useMemo(() => {
        if (!activeInteraction?.output_data) return null
        const outputData = activeInteraction.output_data

        if (outputData.output_type === 'invalid_query') {
            return outputData.response || null
        }
        if (outputData.output_type === 'experience_list' && outputData.response?.output_summary) {
            return outputData.response.output_summary
        }
        return null
    }, [activeInteraction])

    // Get output type
    const outputType = useMemo(() => {
        return activeInteraction?.output_data?.output_type || null
    }, [activeInteraction])

    // Get count of results
    const resultsCount = useMemo(() => {
        if (outputType === 'experience_list' && activeInteraction?.output_data?.response?.data) {
            return Array.isArray(activeInteraction.output_data.response.data) ? activeInteraction.output_data.response.data.length : 0
        }
        return 0
    }, [outputType, activeInteraction])

    const defaultProviders = [PROVIDER_LOGOS.GOOGLE, PROVIDER_LOGOS.HEADOUT, PROVIDER_LOGOS.GETYOURGUIDE]

    const loaderConfig: UIConfig = {
        scanning: {
            title: 'Scanning experiences and activities',
            description:
                "We're searching across multiple booking platforms, official websites, blogs, and user reviews to find the best experiences. We're also analyzing our curated database of activities.",
            databaseText: 'Analyzing 100+ curated experiences from our database',
            providersText: 'Checking availability across multiple booking platforms',
            providers: defaultProviders
        },
        analyzing: {
            title: 'Analyzing against your preferences',
            description: 'We are matching each experience against your specific criteria to find the most suitable activities for you.',
            criteriaHeading: 'YOUR PREFERENCES',
            chips: [
                { text: 'Exploring activities', kind: 'default', icon: 'route' },
                { text: `Things to do for ${groupType}`, kind: 'default', icon: 'users' }
            ],
            progressText: 'Matching experiences against your criteria'
        },
        picking: {
            title: 'Selecting the best experiences for you',
            description: 'Our AI is carefully selecting the most suitable experiences based on your preferences and traveler reviews.',
            text: 'Choosing the perfect activities',
            pillIcon: '/icons/wand.png'
        }
    }

    // Poll interaction when we have an interaction_id
    useEffect(() => {
        if (!currentInteractionId || !agentId || !latestThread?.id || !isPolling || !pollingStartTime) return

        const POLLING_INTERVAL = 1500 // Poll every 1.5 seconds
        const MAX_POLLING_DURATION = 40000 // Stop polling after 40 seconds

        const interval = setInterval(async () => {
            try {
                // Check if we've exceeded the 40s timeout
                const elapsedTime = Date.now() - pollingStartTime
                if (elapsedTime >= MAX_POLLING_DURATION) {
                    setIsPolling(false)
                    setCurrentInteractionId(null)
                    setPollingStartTime(null)
                    // Refetch interactions to get the latest data even if timeout
                    await refetchInteractions()
                    // Clear polling interaction and input data after a brief delay to allow refetch to complete
                    setTimeout(() => {
                        setPollingInteraction(null)
                    }, 100)
                    clearInterval(interval)
                    return
                }

                const interaction = await fetchInteraction(agentId, latestThread.id, currentInteractionId)
                setPollingInteraction(interaction)

                // If interaction is completed or failed, stop polling and refresh interactions
                if (interaction.output_status === 'completed' || interaction.output_status === 'failed') {
                    setIsPolling(false)
                    setCurrentInteractionId(null)
                    setPollingStartTime(null)
                    // Refetch interactions to get the latest data
                    await refetchInteractions()
                    // Clear polling interaction and input data after a brief delay to allow refetch to complete
                    setTimeout(() => {
                        setPollingInteraction(null)
                    }, 100)
                    clearInterval(interval)
                }
            } catch (error) {
                console.error('Error polling interaction:', error)
                // Continue polling even on error
            }
        }, POLLING_INTERVAL)

        return () => clearInterval(interval)
    }, [currentInteractionId, agentId, latestThread?.id, isPolling, pollingStartTime, refetchInteractions])

    const handleSearch = async () => {
        // Prevent new search if already polling
        if (isPolling) return

        if (query.trim()) {
            await handleAgentCall(query.trim())
            if (onSearch) {
                onSearch(query.trim())
            }
        }
    }

    const handlePromptClick = async (promptText: string) => {
        // Prevent new search if already polling
        if (isPolling) return

        setQuery(promptText)
        await handleAgentCall(promptText)
        if (onSearch) {
            onSearch(promptText)
        }
    }

    const handleSneakPeekClick = (e: React.MouseEvent, experienceId: string) => {
        e.stopPropagation() // Prevent card click event
        setSelectedExperienceIdForSneakPeek(experienceId)
    }

    const handleCloseSneakPeekModal = () => {
        setSelectedExperienceIdForSneakPeek(null)
    }

    const handleExperienceCardClick = (experienceId: string) => {
        if (onExperienceClick) {
            onExperienceClick(experienceId)
        } else {
            // Default navigation behavior if parent doesn't provide handler
            const queryString = searchParams.toString()
            window.open(`/experiences/${experienceId}${queryString ? `?${queryString}` : ''}`, '_blank')
        }
    }

    const handleShortlistClick = async (e: React.MouseEvent, experienceId: string) => {
        e.stopPropagation() // Prevent card click event
        if (onShortlistToggle) {
            await onShortlistToggle(experienceId)
        }
    }

    const handleAgentCall = useCallback(
        async (userTextInput: string) => {
            if (!agentId || !groupType || !purposeType) {
                toast.error('Missing required information. Please try again.')
                return
            }

            try {
                // Prepare input_data according to ExperienceSmartSearchRequestSerializer
                const inputData: Record<string, any> = {
                    user_text_input: userTextInput,
                    group_type: groupType,
                    purpose_type: purposeType,
                    preferences: preferences || []
                }

                // Add city or country information
                if (cityId && cityName) {
                    inputData.city_id = cityId
                    inputData.city_name = cityName
                } else if (countryId && countryName) {
                    inputData.country_id = countryId
                    inputData.country_name = countryName
                }

                // Add month if available
                if (month) {
                    inputData.month = month
                }

                // Get existing thread_id or create new one
                const existingThreadId = latestThread?.id || null

                // Call the ATA API
                const response = await callATAApi(agentId, {
                    input_data: inputData,
                    space: 'experience_smart_search_agent',
                    trip_id: tripId || null,
                    thread_id: existingThreadId,
                    entity_type: cityId ? 'city_id' : countryId ? 'country_id' : null,
                    entity_id: cityId || countryId || null
                })

                // Extract interaction_id from response
                // Response structure: { data: { id: "...", ... } }
                const interactionId =
                    (response as any)?.data?.id ||
                    (response as any)?.data?.interaction?.id ||
                    (response as any)?.data?.data?.id ||
                    (response as any)?.interaction?.id ||
                    (response as any)?.id

                if (interactionId) {
                    // Clear any previous polling state
                    setIsPolling(false)
                    setCurrentInteractionId(null)
                    setPollingStartTime(null)
                    setPollingInteraction(null)

                    // If we don't have a thread yet, refetch threads to get the new one
                    let threadIdToUse = latestThread?.id
                    if (!threadIdToUse) {
                        const refetchedThreads = await refetchThreads()
                        const threads = refetchedThreads.data?.data?.data || []
                        if (threads.length > 0) {
                            // Sort by updated_at to get the latest thread
                            const sortedThreads = [...threads].sort((a, b) => {
                                const dateA = new Date(a.updated_at).getTime()
                                const dateB = new Date(b.updated_at).getTime()
                                return dateB - dateA
                            })
                            threadIdToUse = sortedThreads[0].id
                        }
                    }

                    // Set polling state immediately to show loading component
                    setCurrentInteractionId(interactionId)
                    setIsPolling(true)
                    setPollingStartTime(Date.now())

                    // Create initial polling interaction object to show loading immediately
                    const initialPollingInteraction = {
                        id: interactionId,
                        output_status: 'queued' as const,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        output_data: null
                    }
                    setPollingInteraction(initialPollingInteraction)

                    // Fetch initial interaction state if we have a thread ID
                    if (threadIdToUse) {
                        try {
                            const initialInteraction = await fetchInteraction(agentId, threadIdToUse, interactionId)
                            setPollingInteraction(initialInteraction)
                            // If already completed, stop polling
                            if (initialInteraction.output_status === 'completed' || initialInteraction.output_status === 'failed') {
                                setIsPolling(false)
                                setCurrentInteractionId(null)
                                setPollingStartTime(null)
                                await refetchInteractions()
                                // Clear polling interaction and input data after refetch completes
                                setTimeout(() => {
                                    setPollingInteraction(null)
                                }, 100)
                            }
                        } catch (error) {
                            console.error('Error fetching initial interaction:', error)
                            // Still continue polling - it will retry in the polling interval
                        }
                    } else {
                        // If we still don't have a thread ID, we'll need to wait for threads to be fetched
                        // The polling effect will handle this once latestThread is available
                    }
                } else {
                    toast.error('Failed to get interaction ID from response')
                }
            } catch (error: any) {
                console.error('Error calling agent API:', error)
                toast.error(error?.response?.data?.message || 'Failed to process your request. Please try again.')
            }
        },
        [
            agentId,
            cityId,
            cityName,
            countryId,
            countryName,
            month,
            groupType,
            purposeType,
            preferences,
            tripId,
            latestThread?.id,
            refetchInteractions,
            refetchThreads
        ]
    )

    return (
        <div className="w-full flex flex-col py-12 min-h-[80vh] ">
            {/* Floating Prompts - Left aligned, above close/input section */}

            {/* Close Button and Input Box Section */}
            <Divider className="md:mb-4" />
            <div className="w-full max-md:sticky max-md:top-[160px] max-md:z-25 max-md:pt-4 flex max-md:flex-col items-center gap-2 pb-4 max-md:bg-grey-5 max-md:px-[20px]">
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="max-md:mr-auto flex items-center gap-2 px-4 py-2 md:py-3 rounded-[24px] border border-grey-4 bg-white text-[12px] max-md:px-[30px] md:text-sm font-semibold font-manrope text-grey-0 hover:bg-grey-5 transition-colors shrink-0 cursor-pointer">
                    <X
                        size={16}
                        className="text-grey-0"
                    />
                    Close
                </button>
                <Divider className="md:hidden mt-3" />

                {/* Input Box */}
                <div className="flex-1 flex items-center w-full md:justify-center">
                    <div
                        className="w-full md:max-w-[50vw] relative"
                        style={{
                            borderRadius: '14px',
                            boxShadow: '0 0 14px 3px rgba(139,92,246,0.08), 0 0 28px 6px rgba(99,102,241,0.04)',
                        }}>
                        <div className="flex items-center gap-2 pl-10 pr-1 py-1.5 rounded-xl border border-violet-200/60 bg-white">
                            <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 pointer-events-none" />
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder=""
                                    disabled={isPolling}
                                    className={`w-full text-sm font-semibold font-manrope bg-transparent border-none outline-none ${
                                        isPolling ? 'text-grey-2 cursor-not-allowed' : 'text-grey-0'
                                    }`}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !isPolling) {
                                            handleSearch()
                                        }
                                    }}
                                />
                                {!query.trim() && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm text-violet-300 pointer-events-none truncate font-manrope">
                                        <TypingAnimation
                                            words={[
                                                '"Show me some hidden gems!"',
                                                '"Best sunset spots nearby"',
                                                '"Family-friendly activities"',
                                                '"Top-rated local food tours"',
                                            ]}
                                            loop
                                            className="inline"
                                        />
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={handleSearch}
                                disabled={isPolling}
                                className={`py-2 px-2.5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                    isPolling ? 'bg-grey-3 cursor-not-allowed' : 'bg-violet-600 cursor-pointer hover:bg-violet-700'
                                }`}>
                                <Search size={16} className="text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Divider className="mb-4" />

            {/* Loading or Interaction Content */}
            {isLoading ? (
                <div className="w-full flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full bg-primary-default animate-bounce"
                                style={{ animationDelay: '0ms' }}></div>
                            <div
                                className="w-2 h-2 rounded-full bg-primary-default animate-bounce"
                                style={{ animationDelay: '150ms' }}></div>
                            <div
                                className="w-2 h-2 rounded-full bg-primary-default animate-bounce"
                                style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <p className="text-sm text-grey-grey_2 font-medium">Loading interaction...</p>
                    </div>
                </div>
            ) : isPolling &&
              pollingInteraction &&
              pollingInteraction.output_status !== 'completed' &&
              pollingInteraction.output_status !== 'failed' ? (
                <>
                    {/* Floating Prompts - Carousel version when polling */}
                    {floatingPrompts.length > 0 && (
                        <div className="w-full mb-4">
                            <GenericCarousel
                                className="py-0"
                                gap={12}
                                gradientStartColor="white"
                                gradientEndColor="rgba(255,255,255,0)">
                                {floatingPrompts.map((prompt, index) => (
                                    <FloatingPrompt
                                        key={index}
                                        text={prompt.text}
                                        onClick={() => {
                                            if (!isPolling) {
                                                handlePromptClick(prompt.text)
                                                prompt.onClick?.()
                                            }
                                        }}
                                        className={isPolling ? 'opacity-50 cursor-not-allowed' : ''}
                                    />
                                ))}
                            </GenericCarousel>
                        </div>
                    )}
                    {/* Show OutputLoadingComponent during polling */}
                    <div className="w-full max-w-2xl py-8">
                        <OutputLoadingComponent
                            status={pollingInteraction.output_status === 'queued' ? 'queued' : 'in_progress'}
                            uiConfig={loaderConfig}
                            elapsedMs={Math.max(0, Date.now() - new Date(pollingInteraction.created_at || pollingInteraction.updated_at).getTime())}
                        />
                    </div>
                </>
            ) : activeInteraction ? (
                <>
                    {/* Floating Prompts - Carousel version when interactions exist */}
                    {floatingPrompts.length > 0 && (
                        <div className="w-full mb-4 max-md:pl-[20px]">
                            <GenericCarousel
                                className="py-0"
                                gap={12}
                                gradientStartColor="white"
                                gradientEndColor="rgba(255,255,255,0)">
                                {floatingPrompts.map((prompt, index) => (
                                    <FloatingPrompt
                                        key={index}
                                        text={prompt.text}
                                        onClick={() => {
                                            if (!isPolling) {
                                                handlePromptClick(prompt.text)
                                                prompt.onClick?.()
                                            }
                                        }}
                                        className={isPolling ? 'opacity-50 cursor-not-allowed' : ''}
                                    />
                                ))}
                            </GenericCarousel>
                        </div>
                    )}
                    {/* Latest interaction data is available */}
                    <div className="w-full max-w-[1320px] mx-auto py-2 max-md:px-[20px]">
                        {/* Purple Summary Container */}
                        <div className="flex justify-between items-center">
                            {outputSummary && (
                                <div className="mb-6 flex items-start gap-3 bg-[#EFE6FC] w-full md:max-w-[35vw] rounded-2xl p-4 md:p-4">
                                    <div className="flex-shrink-0 mt-1">
                                        <Sparkles className="w-5 h-5 text-primary-default" />
                                    </div>
                                    <p className="text-sm md:text-base font-medium text-primary-default leading-relaxed flex-1">{outputSummary}</p>
                                </div>
                            )}

                            {/* Results Count */}
                            {outputType === 'experience_list' && resultsCount > 0 && (
                                <div className="mb-6 flex justify-end max-md:hidden">
                                    <span className="text-sm font-semibold text-grey-2">
                                        {resultsCount} {resultsCount === 1 ? 'place' : 'places'} found
                                    </span>
                                </div>
                            )}
                        </div>
                        {/* Experience Cards Grid */}
                        {outputType === 'experience_list' && experienceCards.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-15">
                                {experienceCards.map((experience) => {
                                    const { lower_bound, upper_bound, currency } = experience.price
                                    const formattedPrice = formatPrice(lower_bound || 0, upper_bound || 0, currency || '')
                                    const firstVerifiedPhoto = experience.images && experience.images.length > 1 ? experience.images[1] : undefined

                                    // Get shortlist state for this experience
                                    const shortlistEntry = shortlistState[experience.id]
                                    const isShortlisted = shortlistEntry?.isShortlisted ?? false
                                    const isShortlisting = Boolean(shortlistLoadingIds[experience.id])

                                    return (
                                        <div
                                            key={experience.id}
                                            className="relative w-full">
                                            <ListCard
                                                image={experience.image}
                                                images={experience.images}
                                                imageAlt={experience.name || experience.title}
                                                fullHeight={true}
                                                className="group w-full"
                                                onClick={() => handleExperienceCardClick(experience.id)}
                                                title={experience.name || experience.title}
                                                price={formattedPrice}
                                                category={null}
                                                categoryIcon={null}
                                                categories={undefined}
                                                showShortlistButton={true}
                                                isShortlisted={isShortlisted}
                                                isShortlisting={isShortlisting}
                                                onShortlistClick={(e) => handleShortlistClick(e, experience.id)}
                                                showSneakPeekButton={true}
                                                sneakPeekUserImage={firstVerifiedPhoto}
                                                onSneakPeekClick={(e) => handleSneakPeekClick(e, experience.id)}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Grid container for floating prompts when no interactions */
                floatingPrompts.length > 0 && (
                    <div className="w-full flex flex-col items-center py-8 max-md:px-[20px]">
                        <div className="w-full max-w-4xl bg-grey-5 rounded-lg p-6">
                            <h3 className="text-sm font-[550] font-red-hat-display text-grey-2 mb-6 text-center leading-none tracking-[-0.02em]">
                                Here are some suggestions
                            </h3>
                            <div className="w-full flex justify-center">
                                <div className="flex flex-wrap justify-center gap-3 max-w-[900px]">
                                    {floatingPrompts.map((prompt, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => {
                                                if (!isPolling) {
                                                    handlePromptClick(prompt.text)
                                                    prompt.onClick?.()
                                                }
                                            }}
                                            disabled={isPolling}
                                            className={`flex  items-center gap-2 px-3 py-2 rounded-lg border border-grey-4 text-[12px] md:text-xs font-semibold font-manrope transition-colors leading-4 tracking-[-0.02em] text-left w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)] ${
                                                isPolling
                                                    ? 'bg-grey-5 text-grey-2 cursor-not-allowed'
                                                    : 'bg-white text-grey-0 cursor-pointer hover:bg-grey-5'
                                            }`}>
                                            <img
                                                src="/icons/purple-star.png"
                                                alt=""
                                                className="w-6 h-6 object-contain shrink-0"
                                            />
                                            <span>{prompt.text}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* SneakPeek Modal */}
            {selectedExperienceIdForSneakPeek && (
                <SneakPeekModal
                    isOpen={!!selectedExperienceIdForSneakPeek}
                    onClose={handleCloseSneakPeekModal}
                    experienceId={selectedExperienceIdForSneakPeek}
                />
            )}
        </div>
    )
}

export default SmartSearchSection
