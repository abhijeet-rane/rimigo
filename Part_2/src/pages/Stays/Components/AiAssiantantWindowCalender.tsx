import { callATAApi, fetchInteraction, fetchInteractions, fetchThreads, type Interaction, type Thread } from '@/api/ataAPI/ataApi'
import { AnimatePresence, motion } from 'framer-motion'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import OutputLoadingComponent from './OutputLoadingComponent'
import ScrollableHotelResults from './ScrollableHotelResults'
import StructuredChatResponse from './StructuredChatResponse'
import {
    ASSISTANT_CONFIG_MAP,
    AssistantInputDataMap,
    AssistantType,
    getAssistantTypeFromIdentifier,
    transformInputDataToAPIPayload,
    validateInputData
} from './types/assistantTypes'

import { IATAFeature } from '@/api/ataAPI/types/getATAByAgentIdTypes'
import ChatInputSection from '@/modules/AtaAgent/components/Chat/components/Generics/ChatInputSection'
import FallBackMainContent from '@/modules/AtaAgent/components/Chat/MainContent/FallBackMainContent'
import MainContent from '@/modules/AtaAgent/components/Chat/MainContent/MainContent'
import ChatHeader from '@/modules/AtaAgent/components/SideChatOverlay/ChatHeader'
import LoadingStateWhenSearching from '@/modules/AtaAgent/components/SideChatOverlay/LoadingStateWhenSearching'
import { useAtaAgentDetails } from '@/modules/AtaAgent/hooks/useAtaAgentDetails'
import { getAtaAgentByIdentifier } from '@/modules/AtaAgent/utils/getAtaAgentByIdentifier'
import CategoryRecommendationOutput from './CategoryRecommendationOutput'
import ItineraryUpdateOutput from './ItineraryUpdateOutput'
import AlternativesCarousel from '@/modules/Itinerary/components/chat/AlternativesCarousel'
import HotelSearchResultsCard from '@/modules/Itinerary/components/chat/HotelSearchResultsCard'
import FlightSearchResultsCard from '@/modules/Itinerary/components/chat/FlightSearchResultsCard'
import DiscoveryMapPanel from '@/modules/Itinerary/components/chat/DiscoveryMapPanel'
import NavigationCard from '@/modules/Itinerary/components/chat/NavigationCard'
import CostBreakdownCard from '@/modules/Itinerary/components/chat/CostBreakdownCard'
import ExplanationCard from '@/modules/Itinerary/components/chat/ExplanationCard'
import DateShiftCard from '@/modules/Itinerary/components/chat/DateShiftCard'
import type { ItineraryHooksConfig, NavigationAction } from '@/modules/Itinerary/components/chat/types'
import { useNavigationAction } from '@/hooks/useNavigationAction'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { bulkUpsertTripAccommodations, getShortlistedByTrip } from '../Apis/shortlistAPI'
import { dispatchOpenTripCreationModal } from '@/lib/events/tripCreationModalEvents'
import {
    registerAssistantInputPrefiller,
    registerAssistantPromptSender,
    registerAssistantThreadResolver,
    stripSelectionEnvelope,
    unregisterAssistantInputPrefiller,
    unregisterAssistantPromptSender,
    unregisterAssistantThreadResolver
} from './assistantController'
import { ChatMessage } from '@/modules/AtaAgent/types/AIAssisstantWindowTypes'
import MissingFieldsSection from '@/modules/AtaAgent/components/Chat/sections/MissingFieldsSection'
import {
    convertLoaderFormatToUIConfig,
    getLoaderFormatFromFeature,
    extractPreferencesFromInteraction
} from '@/modules/AtaAgent/utils/loaderConfigUtils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

interface AIAssistantWindowProps<T extends AssistantType = AssistantType> {
    // Core props
    isOpen: boolean
    onClose: () => void
    ataId: string
    tripId?: string
    assistantType: T
    entityType: string
    entityId: string
    renderAsInline?: boolean
    // Type-specific input data
    inputData: AssistantInputDataMap[T]

    // Optional callbacks
    onSendMessage?: (message: string, response?: any) => void
    onOutputVisibilityChange?: (isVisible: boolean) => void
    hooksConfig?: ItineraryHooksConfig
}

const formatBudgetRangeDisplay = (range: any): string | undefined => {
    if (!range) return undefined
    if (typeof range === 'string') return range

    const min = typeof range.min === 'number' ? range.min : undefined
    const max = typeof range.max === 'number' ? range.max : undefined

    const formatCurrency = (value: number) =>
        value.toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        })

    if (min != null && max != null) {
        return `${formatCurrency(min)} - ${formatCurrency(max)}`
    }
    if (min != null) {
        return `Min ${formatCurrency(min)}`
    }
    if (max != null) {
        return `Up to ${formatCurrency(max)}`
    }
    return undefined
}

const AIAssistantWindowCalender: React.FC<AIAssistantWindowProps> = ({
    isOpen,
    onClose,
    onSendMessage,
    ataId,
    tripId,
    assistantType,
    entityType,
    entityId,
    inputData,
    renderAsInline = false,
    onOutputVisibilityChange,
    hooksConfig
}) => {
    // Get configuration for this assistant type
    const config = ASSISTANT_CONFIG_MAP[assistantType]

    // Internal state for threads and interactions
    const [threads, setThreads] = useState<Thread[]>([])
    const [currentInteraction, setCurrentInteraction] = useState<Interaction | null>(null)
    const [allInteractions, setAllInteractions] = useState<Interaction[]>([])
    const [isLoadingThreads, setIsLoadingThreads] = useState<boolean>(false)
    const [clearChatMessages, setClearChatMessages] = useState<boolean>(false)

    const [inputText, setInputText] = useState('')
    const [currentExampleIndex, setCurrentExampleIndex] = useState(0)
    const [isAnimating, setIsAnimating] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [currentLoadingMessageIndex, setCurrentLoadingMessageIndex] = useState(0)
    const [isLoadingMessageAnimating, setIsLoadingMessageAnimating] = useState(false)
    const [isSearching] = useState(false)
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [showOutput] = useState(false)
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
    const threadsRef = useRef<Thread[]>([])
    const loadThreadsPromiseRef = useRef<Promise<Thread[]> | null>(null)

    // Shortlist state
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null
    const [shortlistState, setShortlistState] = useState<Record<string, { accommodationId: string; isShortlisted: boolean }>>({})
    const [shortlistLoadingIds, setShortlistLoadingIds] = useState<Record<string, boolean>>({})

    const [chatMessages, setChatMessages] = useState<Array<ChatMessage>>([])
    const [isNewMessageLoading, setIsNewMessageLoading] = useState(false)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Local interactions for smooth in-place replacement
    const [liveInteractions, setLiveInteractions] = useState<any[]>(allInteractions)

    // Navigation action dispatch for cross-page navigation from chat responses
    const { dispatchNavigationAction } = useNavigationAction()

    const {
        agent: agentDetails,
        isLoading: isAgentByIdLoading,
        agentDisplayName,
        activeFeatureName,
        agentIconUrl,
        features
    } = useAtaAgentDetails({
        ataId,
        currentInteraction
    })

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPortalContainer(document.body)
        }
    }, [])

    // Fetch threads and interactions on mount or when ataId changes
    useEffect(() => {
        const loadThreadsAndInteractions = async () => {
            if (!ataId) return
        }
        loadThreadsAndInteractions()
    }, [ataId, entityId])

    // Ref to prevent concurrent fetches
    const isFetchingRef = useRef(false)

    // Reusable function to fetch threads and interactions
    const loadThreadsAndInteractions = React.useCallback(
        async (showLoading = true): Promise<Thread[]> => {
            if (!ataId) return threadsRef.current

            if (isFetchingRef.current && loadThreadsPromiseRef.current) {
                return loadThreadsPromiseRef.current
            }

            isFetchingRef.current = true
            if (showLoading) {
                setIsLoadingThreads(true)
            }

            const fetchPromise = (async () => {
                try {
                    const threadsResponse = await fetchThreads(ataId, 10, entityId)
                    const fetchedThreads = threadsResponse.data.data || []
                    setThreads(fetchedThreads)
                    threadsRef.current = fetchedThreads

                    if (fetchedThreads.length > 0) {
                        const firstThreadId = fetchedThreads[0].id
                        const interactionsResponse = await fetchInteractions(ataId, firstThreadId)
                        const interactions = interactionsResponse.data.data || []

                        if (interactions.length > 0) {
                            setAllInteractions(interactions)
                            setCurrentInteraction(interactions[interactions.length - 1])
                        }
                    }
                    return fetchedThreads
                } catch (error) {
                    console.error('Failed to load threads and interactions:', error)
                    return threadsRef.current
                } finally {
                    isFetchingRef.current = false
                    loadThreadsPromiseRef.current = null
                    if (showLoading) {
                        setIsLoadingThreads(false)
                    }
                }
            })()

            loadThreadsPromiseRef.current = fetchPromise
            return fetchPromise
        },
        [ataId, entityId]
    )

    // Fetch threads and interactions on mount or when ataId changes
    useEffect(() => {
        loadThreadsAndInteractions()
    }, [loadThreadsAndInteractions])

    // Sync local interactions when parent list changes
    useEffect(() => {
        setLiveInteractions(allInteractions)
    }, [allInteractions])

    // Notify parent when output visibility changes
    useEffect(() => {
        onOutputVisibilityChange?.(showOutput)
    }, [showOutput, onOutputVisibilityChange])

    // Fetch shortlisted hotels
    useEffect(() => {
        if (!activeTripId || !entityId) {
            setShortlistState({})
            return
        }

        let isCancelled = false

        const fetchShortlisted = async () => {
            const aggregated: Record<string, { accommodationId: string; isShortlisted: boolean }> = {}
            let page = 1
            const limit = 100

            try {
                while (true) {
                    const response = await getShortlistedByTrip({
                        tripId: activeTripId,
                        baseCityIds: entityId,
                        page,
                        limit
                    })

                    if (isCancelled) {
                        return
                    }

                    response.results?.forEach((item) => {
                        if (!item.zentrum_hub_id) {
                            return
                        }

                        const accommodationId = item.accommodation?.id ?? item.accommodation_id ?? ''
                        aggregated[item.zentrum_hub_id] = {
                            accommodationId,
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
                    console.error('Failed to fetch shortlisted stays', error)
                }
            }
        }

        void fetchShortlisted()

        return () => {
            isCancelled = true
        }
    }, [activeTripId, entityId])

    // Handle shortlist toggle
    const handleShortlistToggle = useCallback(
        async (zentrumHubId: string, accommodationId: string) => {
            if (!zentrumHubId || !accommodationId) {
                return
            }

            if (!activeTripId) {
                dispatchOpenTripCreationModal({ source: 'stays-card' })
                return
            }

            const existingEntry = shortlistState[zentrumHubId]
            const nextState = !(existingEntry?.isShortlisted ?? false)

            setShortlistLoadingIds((prev) => ({ ...prev, [zentrumHubId]: true }))

            try {
                await bulkUpsertTripAccommodations({
                    trip_id: activeTripId,
                    accommodations: [
                        {
                            accommodation_id: accommodationId,
                            zentrum_hub_id: zentrumHubId,
                            is_traveler_shortlisted: nextState
                        }
                    ]
                })

                setShortlistState((prev) => ({
                    ...prev,
                    [zentrumHubId]: {
                        accommodationId,
                        isShortlisted: nextState
                    }
                }))

                toast.success(nextState ? 'Added to shortlist' : 'Removed from shortlist')
            } catch (error) {
                console.error('Failed to update shortlist', error)
                toast.error("Couldn't update your shortlist right now. Please try again.")
            } finally {
                setShortlistLoadingIds((prev) => {
                    const next = { ...prev }
                    delete next[zentrumHubId]
                    return next
                })
            }
        },
        [activeTripId, shortlistState]
    )

    // Calculate duration in minutes and seconds
    const calculateDuration = (createdAt: string, updatedAt: string) => {
        const created = new Date(createdAt)
        const updated = new Date(updatedAt)
        const diffMs = updated.getTime() - created.getTime()
        const totalSeconds = Math.floor(diffMs / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return { minutes, seconds }
    }

    // Convert interactions to chat messages
    const getChatMessages = () => {
        const messages: Array<ChatMessage> = []

        // Pre-compute which failed interactions to hide:
        // If a failed interaction is followed by another interaction with the same user text
        // (i.e. backend retried/delegated), skip the failed one entirely — only show the final result.
        const hiddenInteractionIds = new Set<string>()
        for (let i = 0; i < liveInteractions.length; i++) {
            const curr = liveInteractions[i]
            if (curr.output_status !== 'failed') continue

            const currText = (curr.input_data?.user_text_input || curr.input_data?.question || '').trim().toLowerCase()
            if (!currText) continue

            for (let j = i + 1; j < liveInteractions.length; j++) {
                const next = liveInteractions[j]
                const nextText = (next.input_data?.user_text_input || next.input_data?.question || '').trim().toLowerCase()
                if (nextText === currText) {
                    hiddenInteractionIds.add(curr.id)
                    break
                }
                if (nextText && nextText !== currText) break
            }
        }

        let lastUserText = '' // Track last user message to deduplicate bubbles

        liveInteractions.forEach((interaction) => {
            // Skip failed interactions that were retried/delegated successfully
            if (hiddenInteractionIds.has(interaction.id)) return

            // Get feature for this interaction (needed for loader config)
            const featureIdentifier = (interaction.input_data as any)?.feature?.identifier || (interaction.input_data as any)?.feature_identifier
            const feature = featureIdentifier && features ? features.find((f) => f.identifier === featureIdentifier) : undefined
            // Add user message — deduplicate consecutive identical messages
            // (e.g. when backend retries/delegates creating multiple interactions for the same request)
            const userText = interaction.input_data?.user_text_input || interaction.input_data?.question || ''
            const normalizedText = typeof userText === 'string' ? userText.trim().toLowerCase() : ''
            if (userText && normalizedText !== lastUserText) {
                messages.push({
                    type: 'user',
                    content: userText,
                    timestamp: new Date(interaction.created_at),
                    interactionId: interaction.id
                })
                lastUserText = normalizedText
            }

            // Add assistant response with results or loading state
            const outputStatus = interaction.output_status

            if (outputStatus === 'queued' || outputStatus === 'in_progress') {
                // Extract preferences from interaction input_data
                const { preferences, inputData: fullInputData } = extractPreferencesFromInteraction(interaction.input_data)

                // Enrich inputData with traveler preferences from activeTrip if not already present
                const enrichedInputData = { ...fullInputData }
                if (!enrichedInputData?.group_type && activeTrip?.tripProfile?.group_type) {
                    enrichedInputData.group_type = activeTrip.tripProfile.group_type
                }
                if (!enrichedInputData?.budget_range && activeTrip?.tripProfile?.budget_range) {
                    const formattedRange = formatBudgetRangeDisplay(activeTrip.tripProfile.budget_range)
                    if (formattedRange) {
                        enrichedInputData.budget_range = formattedRange
                    }
                } else if (enrichedInputData?.budget_range) {
                    const formattedRange = formatBudgetRangeDisplay(enrichedInputData.budget_range)
                    if (formattedRange) {
                        enrichedInputData.budget_range = formattedRange
                    }
                }
                if (!enrichedInputData?.budget_range && activeTrip?.tripProfile?.budget_range) {
                    const formattedRange = formatBudgetRangeDisplay(activeTrip.tripProfile.budget_range)
                    if (formattedRange) {
                        enrichedInputData.budget_range = formattedRange
                    }
                } else if (enrichedInputData?.budget_range) {
                    const formattedRange = formatBudgetRangeDisplay(enrichedInputData.budget_range)
                    if (formattedRange) {
                        enrichedInputData.budget_range = formattedRange
                    }
                }
                if (!enrichedInputData?.purpose_type && activeTrip?.tripProfile?.travel_purpose) {
                    enrichedInputData.purpose_type = activeTrip.tripProfile.travel_purpose
                }
                if (!enrichedInputData?.adults && activeTrip?.trip_preference?.group_setup?.adults) {
                    enrichedInputData.adults = String(activeTrip.trip_preference.group_setup.adults)
                }
                if (!enrichedInputData?.children && activeTrip?.trip_preference?.group_setup?.children) {
                    const childrenCount = activeTrip.trip_preference.group_setup.children
                    if (childrenCount > 0) {
                        enrichedInputData.children = Array(childrenCount).fill('child')
                    }
                }

                // Get loader format from feature or agent
                const loaderFormat = getLoaderFormatFromFeature(feature, agentDetails?.loader_format)
                const loaderConfig = loaderFormat
                    ? convertLoaderFormatToUIConfig(
                          loaderFormat,
                          preferences,
                          feature,
                          Object.keys(enrichedInputData).length > 0 ? enrichedInputData : undefined
                      )
                    : undefined

                // Show loading component for queued/in_progress status
                messages.push({
                    type: 'assistant',
                    content: 'Processing your request...',
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    isLoading: true,
                    loadingStatus: outputStatus,
                    elapsedMs: Math.max(0, Date.now() - new Date(interaction.updated_at).getTime()),
                    loaderConfig
                })
            } else if (outputStatus === 'failed') {
                // Show failed/error message with actionable suggestions from backend
                const errorOutputData = interaction.output_data || {}
                const backendMessage = errorOutputData.response || ''
                const errorType = errorOutputData.error_type || ''
                const suggestedActions = errorOutputData.suggested_actions || []

                messages.push({
                    type: 'assistant',
                    content: backendMessage || "I wasn't able to complete that request.",
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    isError: true,
                    errorMessage: backendMessage || "I ran into a hiccup while working on that. Could you try rephrasing or give it another go?",
                    errorType,
                    suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
                })
            } else if (
                interaction.output_data?.output_type === 'experience_chat_response' ||
                interaction.output_data?.output_type === 'hotel_chat_response' ||
                interaction.output_data?.output_type === 'faq_response'
            ) {
                // Handle structured chat response (prioritize over results)
                const outputData = interaction.output_data
                messages.push({
                    type: 'assistant',
                    content: outputData.text || outputData.response || 'Response received',
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    outputType: outputData.output_type,
                    structuredData: {
                        text: outputData.text || outputData.response || '',
                        reasoning: outputData.reasoning,
                        urls: outputData.urls || null,
                        images: outputData.images || null,
                        output_type: outputData.output_type as 'experience_chat_response' | 'hotel_chat_response',
                        content: outputData.content || {
                            paragraphs: null,
                            bullet_lists: null,
                            numbered_lists: null,
                            sections: null
                        },
                        experience: outputData.experience,
                        zentrum_hub_id: outputData.zentrum_hub_id,
                        location_field: outputData.location_field,
                        locations: outputData.locations
                    }
                })
            } else if (interaction.output_data?.output_type === 'update') {
                const outputData = interaction.output_data
                messages.push({
                    type: 'assistant',
                    content: outputData?.response || 'Your itinerary has been updated.',
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    outputType: 'update',
                    results: {
                        response: outputData?.response,
                        understood: outputData?.understood,
                        changes: outputData?.changes,
                        itinerary_id: outputData?.itinerary_id
                    } as any
                })
            } else if (interaction.output_data?.output_type === 'alternatives') {
                const outputData = interaction.output_data
                messages.push({
                    type: 'assistant',
                    content: outputData?.response || 'Here are some alternatives.',
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    outputType: 'alternatives',
                    results: outputData as any
                })
            } else if (interaction.output_data?.output_type === 'hotel_search_results') {
                const outputData = interaction.output_data
                messages.push({
                    type: 'assistant',
                    content: outputData?.response || 'Here are some hotel options.',
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    outputType: 'hotel_search_results',
                    results: outputData as any
                })
            } else if (interaction.output_data?.output_type === 'flight_search_results') {
                const outputData = interaction.output_data
                messages.push({
                    type: 'assistant',
                    content: outputData?.response || 'Here are some flight options.',
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    outputType: 'flight_search_results',
                    results: outputData as any
                })
            } else if (interaction.output_data?.output_type === 'discovery') {
                const outputData = interaction.output_data
                messages.push({
                    type: 'assistant',
                    content: outputData?.response || 'Here are nearby places.',
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    outputType: 'discovery',
                    results: outputData as any
                })
            } else if (interaction.output_data?.output_type === 'navigation') {
                const outputData = interaction.output_data
                messages.push({
                    type: 'assistant',
                    content: outputData?.response || 'Navigation result.',
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    outputType: 'navigation',
                    results: outputData as any
                })
            } else if (interaction.output_data?.output_type === 'cost_estimate') {
                const outputData = interaction.output_data
                messages.push({
                    type: 'assistant',
                    content: outputData?.response || 'Cost estimate.',
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    outputType: 'cost_estimate',
                    results: outputData as any
                })
            } else if (interaction.output_data?.output_type === 'explanation') {
                const outputData = interaction.output_data
                messages.push({
                    type: 'assistant',
                    content: outputData?.response || 'Here is the explanation.',
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    outputType: 'explanation',
                    results: outputData as any
                })
            } else if (interaction.output_data?.output_type === 'date_shift') {
                const outputData = interaction.output_data
                messages.push({
                    type: 'assistant',
                    content: outputData?.response || 'Dates have been shifted.',
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    outputType: 'date_shift',
                    results: outputData as any
                })
            } else if (interaction.output_data?.output_type === 'missing_fields') {
                messages.push({
                    type: 'assistant',
                    content: `I need a bit more information to finish this recommendation.`,
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    results: {
                        feature_identifier: interaction.output_data?.feature_identifier || null,
                        provided_data: interaction.output_data?.provided_data || null
                    },
                    outputType: 'missing_fields',
                    missingFields: interaction.output_data?.provided_data || null,
                    feature_identifier: interaction.output_data?.feature_identifier || null
                })
            } else if (
                interaction.output_data?.output_type === 'category_recommendation' ||
                (interaction.output_data?.recommendation && interaction.output_data.recommendation)
            ) {
                // Handle category recommendation output
                const result = interaction.output_data
                messages.push({
                    type: 'assistant',
                    content: `Here's your personalized recommendation`,
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    results: {
                        recommendation: result.recommendation,
                        tips: result.tips,
                        high_level_itinerary: result.high_level_itinerary
                    },
                    outputType: 'category_recommendation'
                })
            } else if (interaction.output_data?.results && interaction.output_data.results.length > 0) {
                // Show results for completed status (e.g., hotel cards)
                const resultCount = interaction.output_data.results.length
                messages.push({
                    type: 'assistant',
                    content: `Found ${resultCount} perfect matches`,
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    results: interaction.output_data.results,
                    outputType: interaction.output_data.output_type
                })
            } else if (interaction.output_data?.result?.response?.faq_response) {
                // Handle FAQ answer response structure
                messages.push({
                    type: 'assistant',
                    content: interaction.output_data.result.response.faq_response,
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id
                })
            } else if (interaction.output_data?.response) {
                // Fallback: plain text response when no output_type/results available
                messages.push({
                    type: 'assistant',
                    content: interaction.output_data.response,
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id
                })
            }
        })

        // Add any new messages from current session
        messages.push(...chatMessages)

        // Sort by timestamp
        return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    }

    // Clear chat messages when flag is set (after interactions are refreshed)
    useEffect(() => {
        if (clearChatMessages) {
            setChatMessages([])
        }
    }, [clearChatMessages])

    // Auto-scroll to bottom when interactions change
    useEffect(() => {
        if (liveInteractions.length > 0) {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                const chatContainer = document.querySelector('.chat-messages-container')
                if (chatContainer) {
                    chatContainer.scrollTop = chatContainer.scrollHeight
                }
            }, 100)
        }
    }, [liveInteractions])

    // Auto-scroll to bottom when local chat messages update (e.g., user sends or loading states change)
    useEffect(() => {
        // Small delay to allow message DOM to render
        const timer = setTimeout(() => {
            const chatContainer = document.querySelector('.chat-messages-container')
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight
            }
        }, 50)
        return () => clearTimeout(timer)
    }, [chatMessages.length])

    // Poll interactions; when completed/failed, replace object in local list and remove loader chat row
    useEffect(() => {
        const agentId = ataId
        const threadId = threads && threads.length > 0 ? threads[0].id : undefined
        if (!threadId) return

        const idSet = new Set<string>()
        // from server list (live interactions)
        liveInteractions.filter((i) => i.output_status === 'queued' || i.output_status === 'in_progress').forEach((i) => idSet.add(i.id))
        // from local chat rows
        chatMessages.filter((m) => m.isLoading && !!m.interactionId).forEach((m) => idSet.add(m.interactionId as string))

        const loadingIds = Array.from(idSet)
        if (loadingIds.length === 0) return

        const interval = setInterval(async () => {
            try {
                const results = await Promise.all(loadingIds.map((id) => fetchInteraction(agentId, threadId, id).catch(() => undefined)))
                results.forEach((raw: any) => {
                    const r = raw?.data?.interaction ? raw.data.interaction : raw
                    if (!r) return
                    // Replace the matching interaction in local list
                    setLiveInteractions((prev) => prev.map((it) => (it.id === r.id ? { ...it, ...r } : it)))
                    // Remove loader chat row for this interaction (smooth transition)
                    setChatMessages((prev) => prev.filter((m) => !(m.isLoading && m.interactionId === r.id)))
                    // Dispatch navigation action if present in completed response
                    if (r.output_status === 'completed' && r.output_data?.navigation_action) {
                        dispatchNavigationAction(r.output_data.navigation_action as NavigationAction)
                    }
                })
            } catch (e) {
                // ignore polling errors
            }
        }, 3000)

        return () => clearInterval(interval)
    }, [liveInteractions, chatMessages, ataId, threads])

    // Get examples from config
    const examples = config.examples || []

    const loadingMessages = [
        'Finding you the perfect getaway… 🧳',
        'Curating stays that fit just right.',
        'Matching your vibe with the best stays. 🛏️',
        'Handpicking comfort, just for you.',
        'Searching hidden gems for your trip. 🏝️',
        'Scanning stays, filtering the best.',
        'Sorting options, keeping only the finest. 🏨',
        'Crafting a shortlist made for your journey.',
        "Checking reviews so you don't have to.",
        'Your ideal stay is loading… 🛎️',
        'A smarter search for smarter travel.',
        "Relax, we're curating the best for you."
    ]

    const handleClose = () => {
        setShowSuccess(false)
        setSearchQuery('')
        setInputText('')
        onClose()
    }
    const { trackEvent } = usePostHog()

    const handleSend = async (
        queryOverride?: string,

        // this is assistant data with user preferences
        assistant_data_with_user_preferences?: {
            assistant_identifier: string
            all_preferences: Record<string, unknown>
            feature: IATAFeature
        } | null,
        interactionIdToReplace?: string | null
    ) => {
        const effectiveText = (queryOverride ?? inputText).trim()
        // Allow proceeding if assistant_data is provided, even without effectiveText
        if ((!effectiveText && !assistant_data_with_user_preferences) || isSearching || isNewMessageLoading) return
        trackEvent('Chat Send Button Clicked', {
            input_text: effectiveText,
            assistant_identifier: assistant_data_with_user_preferences?.assistant_identifier ?? null,
            preferences: assistant_data_with_user_preferences?.all_preferences ?? null,
            interaction_id: interactionIdToReplace ?? null,
            assistant_type: assistantType
        })
        // Validate input data based on assistant type

        if (!assistant_data_with_user_preferences) {
            const validation = validateInputData(assistantType, inputData)
            if (!validation.valid) {
                toast.error(validation.error || 'Please fill in all required fields')
                return
            }
        }

        const queryToSend = effectiveText

        // Immediately update UI before API call for better UX
        setChatMessages((prev) => {
            const filteredPrev =
                interactionIdToReplace && interactionIdToReplace.length > 0
                    ? prev.filter((message) => message.interactionId !== interactionIdToReplace)
                    : prev
            const displayedUserText = stripSelectionEnvelope(queryToSend)
            return [
                ...filteredPrev,
                // Concierge rebuild: strip the <selection> envelope from the
                // displayed user message so the structured intent JSON does
                // not leak into the chat transcript.
                ...(displayedUserText
                    ? [{ type: 'user' as const, content: displayedUserText, timestamp: new Date() }]
                    : []),
                // Add initial loading message with loader config
                (() => {
                    // Get loader config from feature if available
                    let loaderConfig = undefined
                    if (assistant_data_with_user_preferences?.feature) {
                        const feature = assistant_data_with_user_preferences.feature
                        const preferences = assistant_data_with_user_preferences.all_preferences
                        const loaderFormat = getLoaderFormatFromFeature(feature, agentDetails?.loader_format)
                        if (loaderFormat) {
                            // Extract traveler preferences from activeTrip if available
                            const travelerInputData: any = {}
                            if (activeTrip?.tripProfile) {
                                const profile = activeTrip.tripProfile
                                if (profile.group_type) travelerInputData.group_type = profile.group_type
                                if (profile.budget_range) {
                                    const formattedRange = formatBudgetRangeDisplay(profile.budget_range)
                                    if (formattedRange) {
                                        travelerInputData.budget_range = formattedRange
                                    }
                                }
                                if (profile.travel_purpose) travelerInputData.purpose_type = profile.travel_purpose
                            }
                            if (activeTrip?.trip_preference?.group_setup) {
                                const groupSetup = activeTrip.trip_preference.group_setup
                                if (groupSetup.adults) travelerInputData.adults = String(groupSetup.adults)
                                if (groupSetup.children && groupSetup.children > 0) {
                                    travelerInputData.children = Array(groupSetup.children).fill('child')
                                }
                            }
                            // Also extract from inputData if available (for HotelSmartSearch)
                            if (inputData && assistantType === 'HotelSmartSearch') {
                                const hotelData = inputData as any
                                if (hotelData.groupType) travelerInputData.group_type = hotelData.groupType
                                if (hotelData.travelPurpose) travelerInputData.purpose_type = hotelData.travelPurpose
                            }
                            loaderConfig = convertLoaderFormatToUIConfig(
                                loaderFormat,
                                preferences,
                                feature,
                                Object.keys(travelerInputData).length > 0 ? travelerInputData : undefined
                            )
                        }
                    } else if (agentDetails?.loader_format) {
                        // Extract traveler preferences from activeTrip or inputData
                        const travelerInputData: any = {}
                        if (activeTrip?.tripProfile) {
                            const profile = activeTrip.tripProfile
                            if (profile.group_type) travelerInputData.group_type = profile.group_type
                            if (profile.budget_range) {
                                const formattedRange = formatBudgetRangeDisplay(profile.budget_range)
                                if (formattedRange) {
                                    travelerInputData.budget_range = formattedRange
                                }
                            }
                            if (profile.travel_purpose) travelerInputData.purpose_type = profile.travel_purpose
                        }
                        if (activeTrip?.trip_preference?.group_setup) {
                            const groupSetup = activeTrip.trip_preference.group_setup
                            if (groupSetup.adults) travelerInputData.adults = String(groupSetup.adults)
                            if (groupSetup.children && groupSetup.children > 0) {
                                travelerInputData.children = Array(groupSetup.children).fill('child')
                            }
                        }
                        // Also extract from inputData if available (for HotelSmartSearch)
                        if (inputData && assistantType === 'HotelSmartSearch') {
                            const hotelData = inputData as any
                            if (hotelData.groupType) travelerInputData.group_type = hotelData.groupType
                            if (hotelData.travelPurpose) travelerInputData.purpose_type = hotelData.travelPurpose
                        }
                        // Fallback to agent-level loader format
                        loaderConfig = convertLoaderFormatToUIConfig(
                            agentDetails.loader_format,
                            undefined,
                            undefined,
                            Object.keys(travelerInputData).length > 0 ? travelerInputData : undefined
                        )
                    }

                    return {
                        type: 'assistant',
                        content: 'Processing your request...',
                        timestamp: new Date(),
                        isLoading: true,
                        loadingStatus: 'queued',
                        elapsedMs: 0,
                        interactionId: interactionIdToReplace ?? undefined,
                        loaderConfig
                    }
                })()
            ]
        })

        setInputText('')
        setIsNewMessageLoading(true)

        // Let React render the UI updates before starting API call
        setTimeout(async () => {
            try {
                // Get existing thread_id from the threads array (first thread is the latest)
                const existingThreadId = threads && threads.length > 0 ? threads[0].id : null

                // if feature object is provided, we need to send the payload to the ATA API
                let assistantTypeToUse = assistantType
                let featureToUse = null
                let inputDataToUse = inputData
                if (assistant_data_with_user_preferences) {
                    assistantTypeToUse = assistant_data_with_user_preferences.assistant_identifier as AssistantType
                    const final_assistant_type = getAssistantTypeFromIdentifier(assistantTypeToUse)
                    assistantTypeToUse = final_assistant_type
                    featureToUse = assistant_data_with_user_preferences.feature.identifier
                    inputDataToUse = assistant_data_with_user_preferences.all_preferences
                }

                // Transform input data to API payload based on assistant type
                const apiInputData = transformInputDataToAPIPayload(assistantTypeToUse, inputDataToUse, queryToSend, featureToUse)

                // Prepare API request data
                const requestData = {
                    input_data: apiInputData,
                    space: config.space,
                    trip_id: tripId || null,
                    thread_id: existingThreadId,
                    entity_type: entityType || null,
                    entity_id: entityId || null,
                    interaction_id: interactionIdToReplace ?? undefined,
                    source: config.source || null
                }

                // Call the ATA API
                const response = await callATAApi(ataId, requestData)

                // Update loading message to in_progress status
                setChatMessages((prev) => {
                    const updated = [...prev]
                    // Find latest loading message
                    for (let i = updated.length - 1; i >= 0; i--) {
                        const msg = updated[i] as any
                        if (msg && msg.isLoading) {
                            msg.loadingStatus = 'in_progress'
                            // Try to stamp interaction id from response
                            const createdId =
                                (response as any)?.data?.interaction?.id ||
                                (response as any)?.data?.data?.id ||
                                (response as any)?.interaction?.id ||
                                (response as any)?.id
                            if (createdId) {
                                msg.interactionId = createdId
                            }
                            break
                        }
                    }
                    return updated
                })

                // Notify parent (optional callback)
                onSendMessage?.(queryToSend, response)

                // Refresh threads and interactions internally (without showing loading indicator)
                await loadThreadsAndInteractions(false)

                // Clear current session chat messages to avoid duplication
                setClearChatMessages(true)
                setTimeout(() => setClearChatMessages(false), 100)

                toast.success('Message sent to Rimigo AI')
                setIsNewMessageLoading(false)
            } catch (error: any) {
                toast.error(error?.response?.data?.message || "I had trouble processing that. Let's give it another shot.")

                // Remove loading message and add error message
                setChatMessages((prev) => {
                    const updated = prev.slice(0, -1) // Remove last message (loading)
                    return [
                        ...updated,
                        {
                            type: 'assistant',
                            content: "I wasn't able to process that. Could you try again or rephrase your request?",
                            timestamp: new Date(),
                            isLoading: false
                        }
                    ]
                })
                setIsNewMessageLoading(false)
            }
        }, 0) // End setTimeout - allow React to render UI updates before API call
    }

    const sendPromptMessage = useCallback(
        async (queryOverride?: string, providedThreadId?: string | null, metadata?: Record<string, any>) => {
            const effectiveText = (queryOverride ?? inputText).trim()
            if (!effectiveText || isSearching || isNewMessageLoading) return

            const validation = validateInputData(assistantType, inputData)
            if (!validation.valid) {
                toast.error(validation.error || 'Please fill in all required fields')
                return
            }

            const queryToSend = effectiveText

            const displayedUserText = stripSelectionEnvelope(queryToSend)
            setChatMessages((prev) => [
                ...prev,
                // Concierge rebuild: strip the <selection> envelope from the
                // displayed user message so the structured intent JSON does
                // not leak into the chat transcript.
                ...(displayedUserText
                    ? [{ type: 'user' as const, content: displayedUserText, timestamp: new Date() }]
                    : []),
                {
                    type: 'assistant' as const,
                    content: 'Processing your request...',
                    timestamp: new Date(),
                    isLoading: true,
                    loadingStatus: 'queued' as const,
                    elapsedMs: 0,
                    interactionId: undefined
                }
            ])

            setInputText('')
            setIsNewMessageLoading(true)

            // Yield to allow UI to update before heavy work
            await new Promise((resolve) => setTimeout(resolve, 0))

            try {
                const latestThreadId = providedThreadId !== undefined ? providedThreadId : ((await loadThreadsAndInteractions(false))[0]?.id ?? null)

                const apiInputData = transformInputDataToAPIPayload(assistantType, inputData, queryToSend, null)
                // Concierge rebuild: structured intent metadata is now wrapped
                // into a <selection>...</selection> envelope inside queryToSend
                // (see assistantController.wrapWithSelection). The legacy
                // metadata-merge branch is preserved here only as a defensive
                // fallback for any caller that has not yet been migrated.
                if (metadata) {
                    Object.assign(apiInputData, metadata)
                }
                const requestData = {
                    input_data: apiInputData,
                    space: config.space,
                    trip_id: tripId || null,
                    thread_id: latestThreadId,
                    entity_type: entityType || null,
                    entity_id: entityId || null,
                    source: config.source || null
                }

                const response = await callATAApi(ataId, requestData)

                setChatMessages((prev) => {
                    const updated = [...prev]
                    for (let i = updated.length - 1; i >= 0; i--) {
                        const msg = updated[i] as any
                        if (msg && msg.isLoading) {
                            msg.loadingStatus = 'in_progress'
                            const createdId =
                                (response as any)?.data?.interaction?.id ||
                                (response as any)?.data?.data?.id ||
                                (response as any)?.interaction?.id ||
                                (response as any)?.id
                            if (createdId) {
                                msg.interactionId = createdId
                            }
                            break
                        }
                    }
                    return updated
                })

                onSendMessage?.(queryToSend, response)

                await loadThreadsAndInteractions(false)

                setClearChatMessages(true)
                setTimeout(() => setClearChatMessages(false), 100)

                toast.success('Message sent to Rimigo AI')
                setIsNewMessageLoading(false)
            } catch (error: any) {
                toast.error(error?.response?.data?.message || "I had trouble processing that. Let's give it another shot.")

                setChatMessages((prev) => {
                    const updated = prev.slice(0, -1)
                    return [
                        ...updated,
                        {
                            type: 'assistant',
                            content: "I wasn't able to process that. Could you try again or rephrase your request?",
                            timestamp: new Date(),
                            isLoading: false
                        }
                    ]
                })
                setIsNewMessageLoading(false)
            }
        },
        [
            inputText,
            isSearching,
            isNewMessageLoading,
            assistantType,
            inputData,
            config.space,
            tripId,
            entityType,
            entityId,
            ataId,
            onSendMessage,
            loadThreadsAndInteractions
        ]
    )

    const handleExamplePress = (example: string) => {
        setInputText(example)
    }

    /*
 const payload = {
            assistant_identifier: assistantIdentifier,
            all_preferences: allPreferences,
            feature: feature
        }
    */
    // Handler for when Burj Khalifa input flow is completed
    const handleBurjKhalifaComplete = async (
        payload: {
            assistant_identifier: string
            all_preferences: Record<string, unknown>
            feature: IATAFeature
        },
        interactionId?: string | null
    ) => {
        const input_data = {
            assistant_identifier: payload.assistant_identifier,
            all_preferences: payload.all_preferences,
            feature: payload.feature
        }
        handleSend(payload.feature.name, input_data, interactionId ?? null)
    }

    const handleATAFeatureClick = (feature: IATAFeature) => {
        const userMessage: ChatMessage = {
            type: 'user',
            content: `${feature.name}`,
            timestamp: new Date(),
            isInputRequired: true,
            inputStructure: feature
        }

        const contentBasedOnIdentifier = getAtaAgentByIdentifier({
            identifier: feature.identifier,
            feature: feature,
            assistantIdentifier: 'burj_khalifa_recommendation',
            onComplete: handleBurjKhalifaComplete
        })
        // Create a chat message from the assistant requesting input for this feature
        const assistantMessage: ChatMessage = {
            type: 'assistant',
            content: contentBasedOnIdentifier,
            timestamp: new Date(),
            isInputRequired: true,
            inputStructure: feature
        }

        // Add the message to chat messages
        setChatMessages((prev) => [...prev, userMessage, assistantMessage])

        // Auto-scroll to show the new message
        setTimeout(() => {
            const chatContainer = document.querySelector('.chat-messages-container')
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight
            }
        }, 100)
    }

    const handleMissingFieldsNext = (payload: {
        assistant_identifier: string
        all_preferences: Record<string, unknown>
        feature: IATAFeature
        interactionId: string | null
    }) => {
        handleBurjKhalifaComplete(
            {
                assistant_identifier: payload.assistant_identifier,
                all_preferences: payload.all_preferences,
                feature: payload.feature
            },
            payload.interactionId
        )
    }

    // Auto-focus input when component becomes visible
    useEffect(() => {
        if (isOpen && inputRef.current) {
            const timer = setTimeout(() => {
                inputRef.current?.focus()
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    // Rolling animation for examples
    useEffect(() => {
        if (!isOpen) return

        const interval = setInterval(() => {
            if (isAnimating) return

            setIsAnimating(true)
            setTimeout(() => {
                setCurrentExampleIndex((prevIndex) => (prevIndex + 1) % examples.length)
                setIsAnimating(false)
            }, 800)
        }, 3000)

        return () => clearInterval(interval)
    }, [isOpen, isAnimating, examples.length])

    // Loading message cycling animation
    useEffect(() => {
        if (!showSuccess) return

        const interval = setInterval(() => {
            if (isLoadingMessageAnimating) return

            setIsLoadingMessageAnimating(true)
            setTimeout(() => {
                setCurrentLoadingMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length)
                setIsLoadingMessageAnimating(false)
            }, 2500)
        }, 2500)

        return () => clearInterval(interval)
    }, [showSuccess, loadingMessages.length, isLoadingMessageAnimating])

    useEffect(() => {
        const sender = async (prompt: string, threadId: string | null) => {
            await sendPromptMessage(prompt, threadId)
        }
        registerAssistantPromptSender(sender)
        return () => {
            unregisterAssistantPromptSender(sender)
        }
    }, [sendPromptMessage])

    // Prefill path — opens the assistant with a staged prompt, user
    // clicks Send themselves. Used by flight-add / leg-add flows.
    useEffect(() => {
        const prefiller = (text: string) => {
            setInputText(text)
            requestAnimationFrame(() => {
                inputRef.current?.focus()
            })
        }
        registerAssistantInputPrefiller(prefiller)
        return () => {
            unregisterAssistantInputPrefiller(prefiller)
        }
    }, [])

    useEffect(() => {
        const resolver = async () => {
            const latestThreads = await loadThreadsAndInteractions(false)
            return latestThreads.length > 0 ? latestThreads[0].id : null
        }
        registerAssistantThreadResolver(resolver)
        return () => {
            unregisterAssistantThreadResolver(resolver)
        }
    }, [loadThreadsAndInteractions])

    if (!isOpen) return null

    const shouldShowOverlay = !renderAsInline && portalContainer

    const overlay = shouldShowOverlay
        ? createPortal(
              <div
                  className="fixed inset-0 z-40 bg-grey-0-80 backdrop-blur-[2px] w-[calc(100vw-25%)]"
                  onClick={handleClose}
                  aria-hidden="true"
              />,

              portalContainer
          )
        : null

    // Show loading state when fetching threads
    if (isLoadingThreads && threads.length === 0 && allInteractions.length === 0) {
        return (
            <>
                {overlay}
                <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    style={!renderAsInline ? {} : undefined}
                    transition={{
                        duration: 0.4,
                        ease: 'easeInOut'
                    }}
                    className="absolute bottom-0 right-0 w-1/4 h-[calc(100vh-87px)] bg-white overflow-hidden border-l border-grey_4 z-50">
                    <div className="h-full flex flex-col relative">
                        <ChatHeader
                            logoSrc="/rimigo_ai_beta_logo.png"
                            agentName={agentDisplayName}
                            featureName={activeFeatureName}
                            onMinimize={handleClose}
                            className="border-b border-grey_4 bg-white/95"
                        />

                        {/* Loading content */}
                        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-20">
                            <div className="relative mb-6">
                                {/* Animated spinner */}
                                <div className="w-16 h-16 border-4 border-grey_4 border-t-primary-default rounded-full animate-spin"></div>
                            </div>
                            <p className="text-base font-semibold text-grey_0 mb-2 font-red-hat-display">Loading your conversations...</p>
                            <p className="text-sm text-grey_2 text-center font-red-hat-display">Getting ready to help you find the perfect stay</p>
                        </div>
                    </div>
                </motion.div>
            </>
        )
    }

    // Show loading state when searching
    if (showSuccess) {
        return (
            <>
                {overlay}
                <LoadingStateWhenSearching
                    searchQuery={searchQuery}
                    handleClose={handleClose}
                    currentLoadingMessageIndex={currentLoadingMessageIndex}
                    loadingMessages={loadingMessages}
                    headerProps={{
                        logoSrc: '',
                        agentName: null,
                        featureName: null,
                        onMinimize: handleClose
                    }}
                />
            </>
        )
    }
    const getMotionStyles = () => {
        if (renderAsInline) {
            // Inline mode: width animation only
            return {
                initial: { width: 0, opacity: 0 },
                animate: { width: '400px', opacity: 1 },
                exit: { width: 0, opacity: 0 },
                transition: { duration: 0.3, ease: 'easeInOut' as const }
            }
        }
        // Modal mode: slide from right (existing behavior)
        return {
            initial: { x: '100%', opacity: 0 },
            animate: { x: 0, opacity: 1 },
            exit: { x: '100%', opacity: 0 },
            transition: { duration: 0.4, ease: 'easeInOut' as const }
        }
    }

    // Alternative: Use easing array format
    // const getMotionStylesAlternative = () => {
    //     if (renderAsInline) {
    //         return {
    //             initial: { width: 0, opacity: 0 },
    //             animate: { width: '400px', opacity: 1 },
    //             exit: { width: 0, opacity: 0 },
    //             transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } // cubic-bezier
    //         }
    //     }
    //     return {
    //         initial: { x: '100%', opacity: 0 },
    //         animate: { x: 0, opacity: 1 },
    //         exit: { x: '100%', opacity: 0 },
    //         transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    //     }
    // }
    // Show conversation view if there's an interaction OR if user has started chatting (even without response yet)
    if ((currentInteraction && currentInteraction.output_data) || chatMessages.length > 0) {
        const input_data = currentInteraction?.input_data || {}
        const duration = currentInteraction
            ? calculateDuration(currentInteraction.created_at, currentInteraction.updated_at)
            : { minutes: 0, seconds: 0 }

        return (
            <>
                {overlay}

                <motion.div
                    {...getMotionStyles()}
                    className={
                        renderAsInline
                            ? 'h-full bg-white border-l border-feature-card-border flex flex-col overflow-hidden'
                            : 'absolute top-[130px] md:top-[88px] right-0 h-[calc(100vh-88px)] bg-white border-l border-feature-card-border flex flex-col z-50'
                    }
                    style={!renderAsInline ? { width: '25%' } : undefined}>
                    {/* Loading indicator overlay when refreshing threads */}
                    <AnimatePresence>
                        {isLoadingThreads && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="absolute top-4 right-4 z-10">
                                <div className="bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2">
                                    <div className="w-4 h-4 border border-grey_4 border-t-primary-default rounded-full animate-spin"></div>
                                    <span className="text-xs text-grey_1 font-medium">Updating...</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto chat-messages-container relative flex flex-col">
                        {/* chat header */}
                        <ChatHeader
                            logoSrc={agentIconUrl}
                            agentName={agentDisplayName}
                            onMinimize={handleClose}
                            className="w-full"
                        />
                        <div className="flex-1 px-5 py-5 space-y-5">
                            {/* Initial interaction display - only show when there's a completed interaction but no chat history */}
                            {allInteractions.length === 0 && currentInteraction && chatMessages.length === 0 && (
                                <>
                                    {/* User Message - Right Aligned */}
                                    <div className="flex justify-end">
                                        <div className="max-w-[80%] bg-primary-default text-white px-4 py-3 rounded-[12px] rounded-tr-sm">
                                            <p className="text-sm font-medium leading-5 font-red-hat-display">
                                                {(input_data as any)?.user_text_input || ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* System Response with Output */}
                                    <div className="flex justify-start">
                                        <div className="max-w-[96%] bg-grey_5 px-0 py-3 rounded-2xl rounded-tl-sm">
                                            {/* Thought & analysed duration */}
                                            <div className="mb-3 p-2 bg-primary-default/[0.06] rounded-lg mx-4">
                                                <p className="text-xs text-primary-default/70 font-red-hat-display">
                                                    Thought & analysed for {duration.minutes}m {duration.seconds}s
                                                </p>
                                            </div>

                                            {/* AI Recommendation Text */}
                                            <p className="text-sm font-medium text-grey_0 mb-4 font-red-hat-display px-4">
                                                That's awesome! Based on your group of{' '}
                                                {(input_data as any)?.group_type === 'family'
                                                    ? 'family'
                                                    : (input_data as any)?.group_type || 'guests'}{' '}
                                                guests - for a one-day trip, we recommend focusing on just one area instead of multiple. I've found
                                                these hotel options that best match your needs.
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Chat Messages - show when there are interactions OR when user has started chatting */}
                            {(allInteractions.length > 0 || chatMessages.length > 0) &&
                                getChatMessages().map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-[96%] px-2 py-3 rounded-2xl ${
                                                message.type === 'user'
                                                    ? 'bg-primary-default text-white rounded-[12px] rounded-tr-sm'
                                                    : 'bg-grey_5 text-grey_0 rounded-tl-sm'
                                            }`}>
                                            {/* Show structured response if available */}
                                            {message.type === 'assistant' && message.structuredData && !message.isError && (
                                                <div className="mt-0">
                                                    <StructuredChatResponse data={message.structuredData} />
                                                </div>
                                            )}
                                            {/* Show plain text content only if no structured data */}
                                            {!(message as any).isError && !message.structuredData && message.outputType !== 'missing_fields' && (
                                                <p className="text-sm font-medium leading-5 font-red-hat-display">{message.content}</p>
                                            )}

                                            {message.type === 'assistant' && message.content === 'Processing your request...' && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-grey_2 rounded-full animate-bounce"></div>
                                                    <div
                                                        className="w-2 h-2 bg-grey_2 rounded-full animate-bounce"
                                                        style={{ animationDelay: '0.1s' }}></div>
                                                    <div
                                                        className="w-2 h-2 bg-grey_2 rounded-full animate-bounce"
                                                        style={{ animationDelay: '0.2s' }}></div>
                                                </div>
                                            )}

                                            {/* Show loading component for queued/in_progress messages */}
                                            {message.type === 'assistant' &&
                                                message.isLoading &&
                                                (message.loadingStatus === 'queued' || message.loadingStatus === 'in_progress') && (
                                                    <div className="mt-3">
                                                        <OutputLoadingComponent
                                                            status={message.loadingStatus || 'queued'}
                                                            elapsedMs={message.elapsedMs ?? 0}
                                                            uiConfig={message.loaderConfig}
                                                        />
                                                    </div>
                                                )}

                                            {/* Error state */}
                                            {message.type === 'assistant' && message.isError && (
                                                <div className="mt-3">
                                                    <div className="">
                                                        <div className="flex items-start gap-3">
                                                            <span className="text-[18px] flex-shrink-0 mt-[1px]">
                                                                💬
                                                            </span>
                                                            <div className="flex-1">
                                                                <p className="text-[14px] leading-[18px] tracking-[-0.28px] text-grey_0 font-red-hat-display font-semibold mb-1">
                                                                    I couldn't quite get that
                                                                </p>
                                                                <p className="text-[12px] leading-[18px] tracking-[-0.24px] text-grey_1 font-manrope font-medium">
                                                                    {message.errorMessage}
                                                                </p>
                                                                {/* Suggested actions from backend */}
                                                                {message.suggestedActions && message.suggestedActions.length > 0 && (
                                                                    <div className="mt-3">
                                                                        <p className="text-[11px] leading-[16px] text-grey_2 font-manrope font-medium mb-2">
                                                                            Try these instead:
                                                                        </p>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {message.suggestedActions.map((action, actionIdx) => (
                                                                                <button
                                                                                    key={actionIdx}
                                                                                    className="cursor-pointer inline-flex px-3 py-2 rounded-full border border-primary-default/20 bg-primary-default/5 text-primary-default text-[11px] leading-[16px] font-manrope font-medium hover:bg-primary-default/10 transition-colors"
                                                                                    onClick={() => handleSend(action)}>
                                                                                    {action}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <button
                                                                    className="cursor-pointer mt-4 inline-flex px-4 py-3 justify-center items-center gap-2 rounded-[8px] border border-grey_0 bg-white text-grey_0 text-[12px] leading-[18px] tracking-[-0.12px] font-red-hat-display font-semibold hover:bg-grey_6 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    disabled={(() => {
                                                                        // Disable if next message query equals this message's original query
                                                                        const all = getChatMessages()
                                                                        const idx = all.findIndex(
                                                                            (m) => m.interactionId === message.interactionId && m.isError
                                                                        )
                                                                        const currUserIdx = idx > 0 ? idx - 1 : -1
                                                                        const nextUserIdx = idx >= 0 ? idx + 1 : -1
                                                                        const currUserMsg = currUserIdx >= 0 ? all[currUserIdx] : undefined
                                                                        const nextUserMsg = nextUserIdx >= 0 ? all[nextUserIdx] : undefined
                                                                        return (
                                                                            currUserMsg?.type === 'user' &&
                                                                            nextUserMsg?.type === 'user' &&
                                                                            typeof currUserMsg?.content === 'string' &&
                                                                            typeof nextUserMsg?.content === 'string' &&
                                                                            currUserMsg?.content?.trim().toLowerCase() ===
                                                                                nextUserMsg?.content?.trim().toLowerCase()
                                                                        )
                                                                    })()}
                                                                    onClick={() => {
                                                                        // Find the original user query for this failed interaction
                                                                        const all = getChatMessages()
                                                                        const idx = all.findIndex(
                                                                            (m) => m.interactionId === message.interactionId && m.isError
                                                                        )
                                                                        const userIdx = idx > 0 ? idx - 1 : -1
                                                                        const originalQuery =
                                                                            userIdx >= 0 && all[userIdx].type === 'user' ? all[userIdx].content : ''
                                                                        if (originalQuery && typeof originalQuery === 'string') {
                                                                            handleSend(originalQuery)
                                                                        } else if (inputText.trim()) {
                                                                            handleSend()
                                                                        } else {
                                                                            inputRef.current?.focus()
                                                                        }
                                                                    }}>
                                                                    Let me try again
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Show hotel results for assistant messages */}
                                            {message.type === 'assistant' && message.results && (
                                                <div className="mt-3 space-y-3">
                                                    <div className="text-xs text-primary-default/60 font-medium font-red-hat-display">
                                                        Thought & analysed for{' '}
                                                        {
                                                            calculateDuration(
                                                                allInteractions.find((i) => i.id === message.interactionId)?.created_at || '',
                                                                allInteractions.find((i) => i.id === message.interactionId)?.updated_at || ''
                                                            ).minutes
                                                        }
                                                        m{' '}
                                                        {
                                                            calculateDuration(
                                                                allInteractions.find((i) => i.id === message.interactionId)?.created_at || '',
                                                                allInteractions.find((i) => i.id === message.interactionId)?.updated_at || ''
                                                            ).seconds
                                                        }
                                                        s
                                                    </div>

                                                    {/* Itinerary update output */}
                                                    {message.outputType === 'update' &&
                                                        !Array.isArray(message.results) &&
                                                        message.results &&
                                                        (message.results as any)?.response && (
                                                            <ItineraryUpdateOutput
                                                                data={{
                                                                    response: (message.results as any)?.response || '',
                                                                    understood: (message.results as any)?.understood || '',
                                                                    changes: (message.results as any)?.changes || {
                                                                        days_updated: 0,
                                                                        summaries: []
                                                                    },
                                                                    itinerary_id: (message.results as any)?.itinerary_id
                                                                }}
                                                                onViewChangeClick={hooksConfig?.onViewChangeClick}
                                                                onClose={onClose}
                                                            />
                                                        )}

                                                    {/* Alternatives carousel */}
                                                    {message.outputType === 'alternatives' && message.results && (
                                                        <AlternativesCarousel
                                                            data={message.results as any}
                                                            onSendAgentMessage={hooksConfig?.onSendAgentMessage}
                                                        />
                                                    )}

                                                    {/* Hotel search results */}
                                                    {message.outputType === 'hotel_search_results' && message.results && (
                                                        <HotelSearchResultsCard
                                                            data={message.results as any}
                                                            onSendAgentMessage={hooksConfig?.onSendAgentMessage}
                                                            sourceInteractionId={message.interactionId}
                                                        />
                                                    )}

                                                    {/* Flight search results */}
                                                    {message.outputType === 'flight_search_results' && message.results && (
                                                        <FlightSearchResultsCard
                                                            data={message.results as any}
                                                        />
                                                    )}

                                                    {/* Discovery map panel */}
                                                    {message.outputType === 'discovery' && message.results && (
                                                        <DiscoveryMapPanel
                                                            data={message.results as any}
                                                            onSendAgentMessage={hooksConfig?.onSendAgentMessage}
                                                        />
                                                    )}

                                                    {/* Navigation card */}
                                                    {message.outputType === 'navigation' && message.results && (
                                                        <NavigationCard
                                                            data={message.results as any}
                                                            onNavigateToSlot={hooksConfig?.onNavigateToSlot}
                                                        />
                                                    )}

                                                    {/* Cost breakdown */}
                                                    {message.outputType === 'cost_estimate' && message.results && (
                                                        <CostBreakdownCard data={message.results as any} />
                                                    )}

                                                    {/* Explanation card */}
                                                    {message.outputType === 'explanation' && message.results && (
                                                        <ExplanationCard
                                                            data={message.results as any}
                                                            onNavigateToSlot={hooksConfig?.onNavigateToSlot}
                                                        />
                                                    )}

                                                    {/* Date shift card */}
                                                    {message.outputType === 'date_shift' && message.results && (
                                                        <DateShiftCard
                                                            data={message.results as any}
                                                            onRefreshItinerary={hooksConfig?.onRefreshItinerary}
                                                        />
                                                    )}

                                                    {/* handle missing fields */}
                                                    {message.outputType === 'missing_fields' && (
                                                        <>
                                                            <MissingFieldsSection
                                                                features={features}
                                                                featureIdentifier={(message.results as any)?.feature_identifier as string | null}
                                                                missingFields={message.missingFields ?? null}
                                                                interactionId={message.interactionId ?? null}
                                                                onHandleNext={handleMissingFieldsNext}
                                                                providedData={(message.results as any)?.provided_data ?? null}
                                                            />
                                                        </>
                                                    )}

                                                    {/* Burj khalifa output */}
                                                    {/* Category recommendation output */}
                                                    {message.outputType === 'category_recommendation' &&
                                                        !Array.isArray(message.results) &&
                                                        message.results &&
                                                        (message.results as any)?.recommendation && (
                                                            <CategoryRecommendationOutput
                                                                recommendation={(message.results as any)?.recommendation}
                                                                tips={(message.results as any)?.tips}
                                                                high_level_itinerary={(message.results as any)?.high_level_itinerary}
                                                            />
                                                        )}

                                                    {/* hotel smart search */}
                                                    {/* Hotel results in horizontal scrollable container - only show for hotel cards output type */}
                                                    {message.outputType === 'stay_smart_search_hotel_cards' &&
                                                        Array.isArray(message.results) &&
                                                        message.results.length > 0 &&
                                                        (() => {
                                                            // Get input data from the interaction that generated this message
                                                            const interaction = allInteractions.find((i) => i.id === message.interactionId)
                                                            const interactionInputData = interaction?.input_data || {}
                                                            const interactionOutputData = interaction?.output_data || {}
                                                            // Resolve search context: try interaction input_data first (has
                                                            // city_id, city_name, check_in, check_out from delegation or
                                                            // direct SmartSearch), then output_data, then component inputData
                                                            const searchInputData = (() => {
                                                                const iData = interactionInputData as any
                                                                if (iData?.city_id || iData?.selectedCityId) return iData
                                                                const oData = interactionOutputData as any
                                                                if (oData?.city_id) return oData
                                                                return inputData
                                                            })()

                                                            return (
                                                                <ScrollableHotelResults
                                                                    hotels={message.results}
                                                                    cityId={
                                                                        (searchInputData as any)?.selectedCityId ||
                                                                        (searchInputData as any)?.city_id
                                                                    }
                                                                    cityName={
                                                                        (searchInputData as any)?.cityName ||
                                                                        (searchInputData as any)?.city_name
                                                                    }
                                                                    checkIn={
                                                                        (searchInputData as any)?.checkIn ||
                                                                        (searchInputData as any)?.check_in
                                                                    }
                                                                    checkOut={
                                                                        (searchInputData as any)?.checkOut ||
                                                                        (searchInputData as any)?.check_out
                                                                    }
                                                                    travelPurpose={
                                                                        (searchInputData as any)?.travelPurpose ||
                                                                        (searchInputData as any)?.purpose_type
                                                                    }
                                                                    groupType={
                                                                        (searchInputData as any)?.groupType ||
                                                                        (searchInputData as any)?.group_type
                                                                    }
                                                                    preferences={
                                                                        (searchInputData as any)?.cityPreferences ||
                                                                        ((searchInputData as any)?.location_preference
                                                                            ? [(searchInputData as any).location_preference]
                                                                            : undefined)
                                                                    }
                                                                    adults={(searchInputData as any)?.adults}
                                                                    children={(searchInputData as any)?.children}
                                                                    infants={(searchInputData as any)?.infants}
                                                                    children_age={(searchInputData as any)?.children_age}
                                                                    shortlistState={shortlistState}
                                                                    shortlistLoadingIds={shortlistLoadingIds}
                                                                    onToggleShortlist={handleShortlistToggle}
                                                                />
                                                            )
                                                        })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                        {/* Input Section - Always Visible */}
                        <ChatInputSection
                            inputText={inputText}
                            setInputText={setInputText}
                            handleSend={() => handleSend()}
                            isSearching={isSearching}
                            isNewMessageLoading={isNewMessageLoading}
                            placeholder={config.placeholder || 'Describe your ideal stay'}
                            inputRef={inputRef}
                            variant="default"
                        />
                    </div>
                </motion.div>
            </>
        )
    }

    // initial case
    return (
        <>
            {overlay}
            <motion.div
                {...getMotionStyles()}
                className={
                    renderAsInline
                        ? 'h-full bg-white border-l border-feature-card-border flex flex-col overflow-hidden'
                        : 'fixed right-0 w-[28%] bg-white overflow-hidden border-l border-grey_4 z-50'
                }
                style={!renderAsInline ? { height: 'calc(100vh - 87px)', bottom: 0 } : undefined}>
                {/* Background ellipse image - only show in modal mode */}

                {!renderAsInline && (
                    <img
                        src="/images/ellipse.png"
                        alt=""
                        className="absolute top-0 left-0 right-0 h-1/3 w-full object-cover pointer-events-none"
                    />
                )}

                <div className="h-full flex flex-col relative">
                    {agentDetails ? (
                        <ChatHeader
                            logoSrc={agentIconUrl}
                            agentName={agentDetails.name}
                            featureName={null}
                            className=""
                        />
                    ) : (
                        <ChatHeader
                            logoSrc={agentIconUrl}
                            agentName={null}
                            featureName={null}
                            className=""
                        />
                    )}

                    {/* Loading indicator when refreshing */}
                    <AnimatePresence>
                        {isLoadingThreads && threads.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="absolute top-16 right-5 z-10">
                                <div className="bg-white shadow-md rounded-full px-3 py-1.5 flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-grey_4 border-t-primary-default rounded-full animate-spin"></div>
                                    <span className="text-xs text-grey_1 font-medium">Updating...</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main content */}

                    <div className="flex-1 overflow-y-auto">
                        {agentDetails ? (
                            <MainContent
                                isLoading={isAgentByIdLoading}
                                agent={agentDetails}
                                ataFeatureOnClick={handleATAFeatureClick}
                            />
                        ) : (
                            <FallBackMainContent
                                config={{ title: 'Describe your stay the\nway you want', subtitle: 'Try something like:' }}
                                currentExampleIndex={currentExampleIndex}
                                examples={examples}
                                handleExamplePress={() => handleExamplePress(examples[currentExampleIndex])}
                            />
                        )}
                    </div>

                    {/* Bottom section with input */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className=" z-10">
                        {/* Input section */}
                        <ChatInputSection
                            inputText={inputText}
                            setInputText={setInputText}
                            handleSend={() => handleSend()}
                            isSearching={isSearching}
                            isNewMessageLoading={isNewMessageLoading}
                            placeholder={config.placeholder || 'Describe your ideal stay'}
                            inputRef={inputRef}
                            variant="experience"
                        />
                    </motion.div>
                </div>
            </motion.div>
        </>
    )
}

export default AIAssistantWindowCalender
