import { callATAApi, fetchInteraction, fetchInteractions, fetchThreads, type Interaction, type Thread } from '@/api/ataAPI/ataApi'
import { useConciergeStream } from '@/modules/Itinerary/hooks/useConciergeStream'
import { useStreamingQueue } from '@/modules/Itinerary/hooks/useStreamingQueue'
import StreamingResponseCard from '@/modules/Itinerary/components/chat/StreamingResponseCard'
import { dispatchCustomAction } from '@/modules/Itinerary/utils/dispatchCustomAction'
import InlinePresentOptionsCard from '@/modules/Itinerary/components/chat/InlinePresentOptionsCard'
import ItineraryAssistantMessage from '@/modules/Itinerary/components/chat/ItineraryAssistantMessage'
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion'
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
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
import SmartChatInput from '@/modules/AtaAgent/components/Chat/components/SmartInput/SmartChatInput'
import type { ViewContext } from '@/modules/AtaAgent/components/Chat/components/SmartInput/chipConfigs'
import { useAttachments } from '@/modules/AtaAgent/hooks/useAttachments'
import { consumePendingAttachments, returnAttachmentsToChip } from '@/modules/AtaAgent/hooks/pendingAssistantAttachments'
import { MessageAttachmentChips } from '@/modules/AtaAgent/components/Chat/components/Attachments/MessageAttachmentChips'
import {
    ataInteractionsQueryKey,
    ataThreadsQueryKey,
} from '@/modules/AtaAgent/hooks/useAssistantPrefetch'
import FallBackMainContent from '@/modules/AtaAgent/components/Chat/MainContent/FallBackMainContent'
import MainContent from '@/modules/AtaAgent/components/Chat/MainContent/MainContent'
import ChatHeader from '@/modules/AtaAgent/components/SideChatOverlay/ChatHeader'
import LoadingStateWhenSearching from '@/modules/AtaAgent/components/SideChatOverlay/LoadingStateWhenSearching'
import ChatLoadingSkeleton from '@/modules/AtaAgent/components/SideChatOverlay/ChatLoadingSkeleton'
import { useAtaAgentDetails } from '@/modules/AtaAgent/hooks/useAtaAgentDetails'
import { getAtaAgentByIdentifier } from '@/modules/AtaAgent/utils/getAtaAgentByIdentifier'
import type { ItineraryHooksConfig, NavigationAction } from '@/modules/Itinerary/components/chat/types'
import { getCardEntry, CARD_REGISTRY, type CardRenderContext } from '@/modules/Itinerary/components/chat/cardRegistry'
import ChatResponseRenderer from '@/modules/Itinerary/components/chat/ChatResponseRenderer'
// ChatHooksContext available for future use when wrapping with provider
import { buildChatMessages } from '@/modules/Itinerary/components/chat/buildChatMessages'
import { useNavigationAction } from '@/hooks/useNavigationAction'
import PollingInteractionLoader from '@/components/common/PollingInteractionLoader'
import ContextLoader from '@/components/common/ContextLoader'
import ItineraryInlineLoader from '@/modules/Itinerary/components/chat/ItineraryInlineLoader'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import {
    registerAssistantInputPrefiller,
    registerAssistantPromptSender,
    registerAssistantThreadResolver,
    stripSelectionEnvelope,
    unregisterAssistantInputPrefiller,
    unregisterAssistantPromptSender,
    unregisterAssistantThreadResolver
} from './assistantController'
import {
    ChatMessage,
    CustomActionAction,
    IntentAction,
    NavigationAction as NavigationActionCta,
    ReplyAction,
    ResponseAction,
} from '@/modules/AtaAgent/types/AIAssisstantWindowTypes'
import {
    type FollowUpChipAction,
} from '@/modules/Itinerary/components/chat/primitives/FollowUpActions'
// MissingFieldsSection now lazy-loaded via cardRegistry
import {
    convertLoaderFormatToUIConfig,
    getLoaderFormatFromFeature,
    extractPreferencesFromInteraction
} from '@/modules/AtaAgent/utils/loaderConfigUtils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS } from '@/modules/amplitude/components/posthogEventDetails'
import { useIsMobile } from '@/hooks/use-mobile'
import { ArrowDown, UploadCloud } from 'lucide-react'
import { kindFromFile } from '@/api/attachmentsAPI/attachmentsApi'
import { TalkToExpertPromptsModal } from '@/modules/Tripboard/components/TalkToExpertPromptsModal'
import { POTRAIT_IMAGES } from '@/modules/Premium/constants'
import { useTravelerDetails } from '@/modules/TravelerProfile/hooks/travelerProfile'
import { fireExpertWhatsAppHandoff } from '@/modules/Premium/utils/expertWhatsApp'
import { TokenStorage } from '@/lib/api/tokenStorage'

interface AIAssistantWindowProps<T extends AssistantType = AssistantType> {
    // Core props
    isOpen: boolean
    onClose: () => void
    ataId: string
    tripId?: string
    assistantType: T
    entityType: string
    entityId: string
    // Type-specific input data
    inputData: AssistantInputDataMap[T]

    // Optional callbacks
    onSendMessage?: (message: string, response?: any) => void
    onOutputVisibilityChange?: (isVisible: boolean) => void
    hooksConfig?: ItineraryHooksConfig

    /** Height of the parent header in px. Used to position the panel below the header. Defaults to 88. */
    headerHeight?: number

    /** Optional info banner text displayed below the chat header */
    infoBanner?: string
    MobileContainerClass?:string
    /** If true, the chat header's "Talk to expert" button is hidden on desktop (md+) but still shown on mobile. */
    hideCallbackOnDesktop?: boolean
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

/** Lightweight inline markdown: bold, italic, bold+italic, inline code */
const parseSimpleMarkdown = (text: string): React.ReactNode => {
    if (!text) return null
    // Split on markdown patterns: ***bold italic***, **bold**, *italic*, `code`
    const parts = text.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|`[^`]+`)/)
    return parts.map((part, i) => {
        if (part.startsWith('***') && part.endsWith('***')) {
            return <strong key={i}><em>{part.slice(3, -3)}</em></strong>
        }
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            return <em key={i}>{part.slice(1, -1)}</em>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="px-1 py-0.5 bg-grey_5 rounded text-xs font-mono">{part.slice(1, -1)}</code>
        }
        return part
    })
}

/**
 * Small circular avatar shown to the LEFT of assistant messages. The
 * visual anchor that tells the traveler "this reply is from Rimigo AI"
 * — currently the chat had no per-message sender cue, so assistant
 * text read as disembodied system output.
 *
 * Uses a Sparkles glyph (not the compass PNG) because at 14px the
 * compass compressed into what read as a checkmark, making replies
 * look like a done-list rather than a conversation. Sparkles is the
 * conventional "AI agent" cue across the industry and reads
 * unambiguously even at this size.
 *
 * Styled to match the ``bg-primary-default/10`` soft-wash aesthetic
 * the View Changes chip already uses — the whole Rimigo AI surface
 * (avatar + chips + "Rimigo AI" header label) now reads as one
 * coherent system rather than a loud gradient popping against the
 * rest of the restrained layout.
 */
const AssistantAvatar: React.FC = () => (
    <div
        className="shrink-0 w-7 h-7 rounded-full bg-primary-default/10 flex items-center justify-center mt-0.5 text-primary-default"
        aria-label="Rimigo AI">
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden>
            <path d="M12 2l1.8 5.4L19 9l-5.2 1.8L12 16l-1.8-5.4L5 9l5.2-1.8L12 2zM19 14l.9 2.5L22 17l-2.1.5L19 20l-.9-2.5L16 17l2.1-.5L19 14zM5 14l.9 2.5L8 17l-2.1.5L5 20l-.9-2.5L2 17l2.1-.5L5 14z" />
        </svg>
    </div>
)


/**
 * Inline CTA pills for the post-hoc derived ``navigation`` actions
 * the concierge emits after specific tool calls (``get_budget_details``
 * → budget tab, ``apply_patch`` → itinerary tab). Pill styling stays
 * deliberately quieter than the new ``FollowUpActions`` chip strip —
 * these are deterministic CTAs the backend always attaches, so they
 * should feel like an inline link, not a primary recommendation.
 *
 * LLM-attached intent/reply/dismiss actions render through
 * ``FollowUpActions`` (see ``renderActionRow`` below).
 */
interface ResponseActionsProps {
    actions: NavigationActionCta[]
    onClose: () => void
}

const ChevronRightGlyph: React.FC = () => (
    <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden>
        <path d="M9 6l6 6-6 6" />
    </svg>
)

const ResponseActions: React.FC<ResponseActionsProps> = ({
    actions,
    onClose,
}) => {
    const navigate = useNavigate()
    const location = useLocation()

    const handleClick = (action: NavigationActionCta) => {
        const path = action.action_data?.path
        if (!path) return
        // Same-location nav still re-runs the route handler so query
        // params (e.g. ``?tab=budget``) take effect even if the user
        // is already on /tripboard/<id>.
        const target = `${location.pathname}${location.search}` === path ? path : path
        navigate(target)
        onClose()
    }

    if (actions.length === 0) return null

    return (
        <div className="mt-2 flex flex-wrap gap-1.5">
            {actions.map((action, idx) => (
                <button
                    key={`${action.action}-${idx}`}
                    type="button"
                    onClick={() => handleClick(action)}
                    className="inline-flex items-center gap-1.5 rounded-[12px] bg-primary-default/[0.08] px-2.5 py-1 text-[11px] font-semibold font-manrope text-primary-default hover:bg-primary-default/15 active:scale-[0.98] transition-[background-color,transform] cursor-pointer"
                    aria-label={action.cta}>
                    <span>{action.cta}</span>
                    <ChevronRightGlyph />
                </button>
            ))}
        </div>
    )
}

/**
 * Partition the unified ``actions[]`` envelope into the two visual
 * surfaces: pill-style navigation CTAs (deterministic, post-hoc) and
 * chip-style follow-up actions (LLM-attached, tappable intent/reply/
 * dismiss). Order is preserved within each bucket.
 */
function partitionActions(
    actions: ResponseAction[] | undefined,
): {
    nav: NavigationActionCta[]
    chips: FollowUpChipAction[]
} {
    const nav: NavigationActionCta[] = []
    const chips: FollowUpChipAction[] = []
    for (const a of actions ?? []) {
        if (a.action === 'navigation') nav.push(a)
        else chips.push(a)
    }
    return { nav, chips }
}

// ``dispatchCustomAction`` + ``TAB_ACTION_TARGET`` moved to the shared util
// ``@/modules/Itinerary/utils/dispatchCustomAction`` (imported above) so these
// follow-up chips AND the chat card registry's collection-window "See all"
// affordance dispatch through one source of truth.


const AIAssistantWindow: React.FC<AIAssistantWindowProps> = ({
    isOpen,
    onClose,
    onSendMessage,
    ataId,
    tripId,
    assistantType,
    entityType,
    entityId,
    inputData,
    onOutputVisibilityChange,
    hooksConfig,
    infoBanner,
    MobileContainerClass,
    hideCallbackOnDesktop = false
}) => {
    // Get configuration for this assistant type
    const config = ASSISTANT_CONFIG_MAP[assistantType]

    // ── Concierge SSE streaming wiring ──────────────────────────────────────
    //
    // Enabled for the itinerary concierge only (``ItineraryExpertChat``);
    // other assistant types (stays, experience, hotel, Burj) stay on the
    // queue + polling path unchanged. The streaming hook owns an
    // ``AbortController`` bound to this component's lifetime — closing the
    // assistant mid-turn tears down the fetch, which the backend treats as
    // a ``disconnect`` abort (emits orphan-tool cleanup + persists partial).
    const isStreamingMode = assistantType === 'ItineraryExpertChat'
    const conciergeStream = useConciergeStream({
        agentId: ataId,
        tripId: tripId ?? '',
        // ``userId`` is optional on the hook — backend resolves the
        // user from the auth token anyway. We deliberately don't pass
        // ``threadUserId`` here because that prop was removed from
        // ``AIAssistantWindow`` on stage.
        entityId: entityId,
        entityType: entityType,
        source: 'itinerary_details'
    })

    // Throttled presentation state for the streaming card. Drains the
    // raw stream's tools/phases at one fixed rate and text at another so
    // the user sees a calm, reading-paced reveal regardless of network
    // burstiness. ``isCaughtUp`` lets the swap-to-persisted-message
    // logic wait for everything visible to fully settle before
    // unmounting the streaming card.
    const queued = useStreamingQueue(conciergeStream.state, {
        phaseIntervalMs: 380,
        textCharsPerSec: 95,
        catchUpMultiplier: 4
    })

    // Mirror ``isCaughtUp`` into a ref so the async sendTurn flow can
    // wait for the queue to fully drain before swapping the streaming
    // card for the persisted interaction. Without this gate, FINISH +
    // an immediate swap would unmount the card mid-typing.
    const queuedCaughtUpRef = useRef(true)
    queuedCaughtUpRef.current = queued.isCaughtUp
    const waitForQueueDrained = useCallback(() => {
        return new Promise<void>((resolve) => {
            if (queuedCaughtUpRef.current) {
                resolve()
                return
            }
            const id = window.setInterval(() => {
                if (queuedCaughtUpRef.current) {
                    window.clearInterval(id)
                    resolve()
                }
            }, 80)
        })
    }, [])

    // Query client — used for both itinerary cache invalidation AND for
    // seeding thread/interaction state from a tripboard-level prefetch
    // (see ``useAssistantPrefetch``). Hoisted above the threads/
    // interactions useState calls so the lazy initializers below can
    // read cached data synchronously on first render.
    const itineraryCacheClient = useQueryClient()

    // ---- Hydrate from prefetch cache (if available) ---------------------
    // ``useAssistantPrefetch`` warms these query keys when the tripboard
    // mounts, so by the time this component lazy-mounts on "View chat",
    // the data is usually ready. Lazy initializers read the cache once;
    // ``loadThreadsAndInteractions`` below revalidates via fetchQuery.
    const _cachedThreads = (() => {
        if (!ataId) return null
        const data = itineraryCacheClient.getQueryData<{
            data: { data: Thread[] }
        }>(ataThreadsQueryKey(ataId, entityId, entityType, tripId))
        return data?.data?.data ?? null
    })()

    const _cachedFirstThreadId = _cachedThreads?.[0]?.id ?? null
    const _cachedInteractions = (() => {
        if (!ataId || !_cachedFirstThreadId) return null
        const data = itineraryCacheClient.getQueryData<{
            data: { data: Interaction[] }
        }>(ataInteractionsQueryKey(ataId, _cachedFirstThreadId))
        return data?.data?.data ?? null
    })()

    // Internal state for threads and interactions — seeded from cache
    // when a prefetch hit was available. First render now shows the
    // chat conversation branch instead of the empty initial-content
    // branch, eliminating the layout swap.
    const [threads, setThreads] = useState<Thread[]>(() => _cachedThreads ?? [])
    const [currentInteraction, setCurrentInteraction] = useState<Interaction | null>(
        () =>
            _cachedInteractions && _cachedInteractions.length
                ? _cachedInteractions[_cachedInteractions.length - 1]
                : null,
    )
    const [allInteractions, setAllInteractions] = useState<Interaction[]>(
        () => _cachedInteractions ?? [],
    )
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
    const isMobile = useIsMobile()

    // Drag-to-close (mobile only): controls are attached to the sheet, and the
    // drag is only initiated from the header's drag handle so chat scrolling
    // still works everywhere else.
    const sheetDragControls = useDragControls()
    const startSheetDrag = useCallback(
        (event: React.PointerEvent) => {
            if (!isMobile) return
            sheetDragControls.start(event)
        },
        [isMobile, sheetDragControls]
    )

    // Shortlist state
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null

    // Tripboard AI Assistant — file/link attachments support.
    // The hook owns the upload/poll lifecycle; we read `completedIds`
    // through a ref so the existing handleSend closures don't need
    // rebinding on each attachment status change.
    const attachmentsApi = useAttachments({ tripId: activeTripId })
    const attachmentIdsRef = useRef<string[]>([])
    useEffect(() => {
        attachmentIdsRef.current = attachmentsApi.completedIds
    }, [attachmentsApi.completedIds])

    // Drain chip→assistant attachment handoff on open.
    useEffect(() => {
        if (!isOpen) return
        const drafts = consumePendingAttachments()
        if (drafts.length) attachmentsApi.seed(drafts)
    }, [isOpen])

    // Drag-and-drop attach. Use a depth counter (not a boolean) because
    // dragenter/leave fire on every nested child — a boolean flickers.
    const [dragDepth, setDragDepth] = useState(0)
    const dragOverlayActive = isOpen && dragDepth > 0

    const hasFileDrag = useCallback(
        (e: React.DragEvent): boolean => Array.from(e.dataTransfer?.types ?? []).includes('Files'),
        [],
    )

    const onPanelDragEnter = useCallback(
        (e: React.DragEvent) => {
            if (!isOpen || !hasFileDrag(e)) return
            e.preventDefault()
            setDragDepth((d) => d + 1)
        },
        [hasFileDrag, isOpen],
    )

    const onPanelDragOver = useCallback(
        (e: React.DragEvent) => {
            if (!isOpen || !hasFileDrag(e)) return
            // Without preventDefault here the browser blocks the drop event.
            e.preventDefault()
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
        },
        [hasFileDrag, isOpen],
    )

    const onPanelDragLeave = useCallback(
        (e: React.DragEvent) => {
            if (!isOpen || !hasFileDrag(e)) return
            setDragDepth((d) => Math.max(0, d - 1))
        },
        [hasFileDrag, isOpen],
    )

    const onPanelDrop = useCallback(
        (e: React.DragEvent) => {
            if (!isOpen) return
            // Always reset depth so the overlay dismisses even on reject.
            setDragDepth(0)
            if (!hasFileDrag(e)) return
            e.preventDefault()
            const files = Array.from(e.dataTransfer?.files ?? [])
            if (files.length === 0) return
            const accepted: File[] = []
            const rejected: string[] = []
            files.forEach((f) => {
                if (kindFromFile(f)) accepted.push(f)
                else rejected.push(f.name)
            })
            if (rejected.length > 0) {
                toast.error(
                    rejected.length === 1
                        ? `Can't read "${rejected[0]}". Try a PDF, DOCX, or spreadsheet.`
                        : `${rejected.length} files weren't readable — try PDFs, DOCX, or spreadsheets.`,
                )
            }
            // useAttachments enforces the per-message cap + cap toast.
            accepted.forEach((f) => void attachmentsApi.addFile(f))
        },
        [attachmentsApi, hasFileDrag, isOpen],
    )


    const [chatMessages, setChatMessages] = useState<Array<ChatMessage>>([])
    const [isNewMessageLoading, setIsNewMessageLoading] = useState(false)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const chatContainerRef = useRef<HTMLDivElement>(null)

    // Local interactions for smooth in-place replacement
    const [liveInteractions, setLiveInteractions] = useState<any[]>(allInteractions)
    const [isRequestCallbackModalOpen, setIsRequestCallbackModalOpen] = useState(false)

    // Traveler details, pre-fetched so the mobile "Talk to expert" tap can fire
    // the lead-capture call synchronously (and open WhatsApp inside the user
    // gesture, avoiding popup blocking). Mirrors TalkToExpertPromptsModal's own
    // resolution (TokenStorage → useTravelerDetails).
    const [travelerId, setTravelerId] = useState<string | undefined>()
    const { travelerDetails } = useTravelerDetails(travelerId)
    useEffect(() => {
        TokenStorage.getUserInfo()
            .then((info) => setTravelerId(info?.traveler_id))
            .catch(() => setTravelerId(undefined))
    }, [])

    // Per-assistant subscription intent — shared by the mobile direct path and
    // the desktop modal so the lead is tagged identically either way.
    const resolvedSubscriptionIntent = useMemo(
        () =>
            assistantType === 'ItineraryExpertChat'
                ? 'tripboard_callback'
                : assistantType === 'HotelSmartSearch' || assistantType === 'HotelExpertChat'
                    ? 'stay_callback'
                    : assistantType === 'ExperienceExpertChat'
                        ? 'activity_callback'
                        : 'premium',
        [assistantType],
    )

    // Optimistic ``present_options`` selections, keyed by the carousel's
    // interaction id. Captured the moment the user taps an option in the
    // STREAMING card; consumed as ``preselectedId`` by both the live
    // render below AND the persisted-side render in cardRegistry. The
    // BE eventually stamps ``output_data.selected_id`` on the persisted
    // child Interaction (canonical) — until then this fills the gap so
    // the carousel doesn't render unselected during the brief window
    // between click time and BE persistence. Entries are never removed
    // here; the BE's stamped value transparently overrides on next
    // render once it lands.
    const [presentOptionsLocalSelections, setPresentOptionsLocalSelections] = useState<
        Record<string, string>
    >({})

    // The streaming card is now the canonical view for the active turn —
    // before, during, and after FINISH. No stream→persisted swap happens
    // at FINISH; the swap is deferred to the start of the NEXT turn (when
    // ``dispatch('start')`` wipes the hook's state and the filter relaxes,
    // letting the prior interaction render as a persisted message). This
    // removes the polling window and its associated flicker entirely.

    // Navigation action dispatch for cross-page navigation from chat responses
    const { dispatchNavigationAction } = useNavigationAction()

    // Debug: trace hooksConfig

    const {
        agent: agentDetails,
        isLoading: isAgentByIdLoading,
        agentDisplayName,
        activeFeatureName: _activeFeatureName,
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

    // Ref to track which interaction IDs we've already fired the "AI Response Received"
    // posthog event for — the polling loop can see the same completed status across
    // multiple ticks during the state-update window, so we dedupe per interaction.
    const trackedResponseIdsRef = useRef<Set<string>>(new Set())

    // ``itineraryCacheClient`` is hoisted near the top of the component
    // (above the threads/interactions useState calls) so the lazy
    // initializers can read the prefetch cache synchronously. The
    // itinerary + route-summary refresh used to also be triggered by
    // walking ``liveInteractions`` for ``output_data.itinerary_updated``;
    // that branch has been retired in favor of the FINISH-event-driven
    // invalidation below, which fires the moment the agent reports
    // ``patch_applied`` instead of after the persisted interaction
    // record propagates.

    // PostHog — hoisted above the polling useEffect so it can reference
    const { trackEvent, trackButtonClickCustom } = usePostHog()

    // Reusable function to fetch threads and interactions
    const loadThreadsAndInteractions = React.useCallback(
        // forceRefresh bypasses the 60s React Query cache (needed after submit).
        async (showLoading = true, forceRefresh = false): Promise<Thread[]> => {
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
                    if (forceRefresh) {
                        await itineraryCacheClient.invalidateQueries({
                            queryKey: ataThreadsQueryKey(ataId, entityId, entityType, tripId),
                        })
                    }
                    // Cache-aware fetch — if ``useAssistantPrefetch``
                    // already warmed this key (typical for "View chat"
                    // open), this resolves from cache in <1ms and we
                    // skip the network round-trip entirely. Otherwise
                    // it does the actual request and stores the result
                    // for the next caller (incl. the lazy
                    // initializers above on a future remount).
                    const threadsResponse = await itineraryCacheClient.fetchQuery({
                        queryKey: ataThreadsQueryKey(ataId, entityId, entityType, tripId),
                        queryFn: () =>
                            fetchThreads(
                                ataId, 10, entityId, entityType, tripId || undefined,
                            ),
                        staleTime: 60_000,
                    })
                    const fetchedThreads = threadsResponse.data.data || []
                    setThreads(fetchedThreads)
                    threadsRef.current = fetchedThreads

                    if (fetchedThreads.length > 0) {
                        const firstThreadId = fetchedThreads[0].id
                        if (forceRefresh) {
                            await itineraryCacheClient.invalidateQueries({
                                queryKey: ataInteractionsQueryKey(ataId, firstThreadId),
                            })
                        }
                        const interactionsResponse = await itineraryCacheClient.fetchQuery({
                            queryKey: ataInteractionsQueryKey(ataId, firstThreadId),
                            queryFn: () => fetchInteractions(ataId, firstThreadId),
                            staleTime: 60_000,
                        })
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
        [ataId, entityId, entityType, tripId, itineraryCacheClient]
    )

    // Fetch threads and interactions on mount or when ataId changes
    useEffect(() => {
        loadThreadsAndInteractions()
    }, [loadThreadsAndInteractions])

    // Sync local interactions when parent list changes
    useEffect(() => {
        setLiveInteractions(allInteractions)
    }, [allInteractions])

    // Terminal-time background refresh.
    //
    // The streaming card now owns the live render even after FINISH, so
    // the user-facing output doesn't depend on this refresh. We still
    // fire it once so that:
    //   1) The next turn's "show prior turn as persisted message" swap
    //      (which happens at ``dispatch('start')`` time) has the data
    //      it needs — no blank gap between the card content swap and
    //      the prior interaction landing in the list.
    //   2) Downstream consumers (auto-nav from
    //      ``output_data.navigation_action``, itinerary cache
    //      invalidation, etc.) pick up the freshly persisted record.
    //
    // FINISH event with ``patch_applied: true`` is now the sole trigger
    // for the itinerary + route-summary refresh — the previous fallback
    // that walked persisted interactions for ``output_data.itinerary_updated``
    // has been removed. Firing here means the day strip on the kanban
    // refreshes the moment the agent reports the patch landed, instead
    // of after ``commit_to_db`` + the interactions poll catches up.
    // ``useItineraryRouteSummary`` subscribes to ``itineraryCompleted``
    // invalidations and refreshes in the same beat.
    useEffect(() => {
        if (!isStreamingMode) return
        const terminal = conciergeStream.state.terminal
        if (!terminal) return
        void loadThreadsAndInteractions(false, true)
        if (terminal.kind === 'finish' && terminal.event.patch_applied) {
            itineraryCacheClient.invalidateQueries({
                predicate: (q) => q.queryKey[0] === 'itineraryCompleted',
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conciergeStream.state.terminal, isStreamingMode])

    // Post-stream housekeeping.
    //
    // Previously this function held the streaming card mounted while it
    // polled ``loadThreadsAndInteractions`` for the persisted record (up
    // to 12s), then cleared local rows + reset the stream so the
    // persisted message could render in its place. That polling window
    // was the user-perceived "delay then flicker" between FINISH and the
    // output appearing.
    //
    // FINISH already carries everything the user needs to read and act
    // on (``final_message`` + ``actions[]`` + ``patch_applied``), and the
    // streaming card is the single source of truth for the active turn.
    // So the only thing to do on the local side is wait for the typing
    // animation to settle so the input doesn't unlock mid-reveal, then
    // unlock it. The persisted record is refreshed in the background by
    // the terminal-refresh effect above; the swap to that record happens
    // implicitly when the user starts a NEXT turn (``dispatch('start')``
    // wipes hook state and the filter relaxes — invisible to the user
    // because the previous turn is already in ``liveInteractions``).
    const finalizeStreamedTurn = React.useCallback(async () => {
        await waitForQueueDrained()
        // Drop the local "Thinking…" loading row inserted at submit time.
        // The streaming card has fully taken over rendering the turn; the
        // local row would only resurface if ``streamActive`` later flipped
        // false (e.g. explicit reset on panel teardown). Removing it now
        // keeps ``chatMessages`` clean and avoids any chance of a stale
        // loader appearing later.
        setChatMessages((prev) =>
            prev.filter((m) => !(m.type === 'assistant' && m.isLoading)),
        )
        setIsNewMessageLoading(false)
    }, [waitForQueueDrained])

    // Notify parent when output visibility changes
    useEffect(() => {
        onOutputVisibilityChange?.(showOutput)
    }, [showOutput, onOutputVisibilityChange])

    // On desktop, hide the page scrollbar when the panel is open so it doesn't
    // peek through in the header row.
    useEffect(() => {
        if (isMobile || !isOpen) return

        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

        const styleEl = document.createElement('style')
        styleEl.setAttribute('data-assistant-scroll-lock', 'true')
        styleEl.textContent = `
            /* Lock the page behind the panel */
            html, body {
                overflow: hidden !important;
            }
            ${scrollbarWidth > 0 ? `body { padding-right: ${scrollbarWidth}px !important; }` : ''}

            /* Hide ALL scrollbars everywhere while panel is open — Chrome/Safari/Edge */
            *::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
                background: transparent !important;
            }
            /* Firefox */
            * {
                scrollbar-width: none !important;
            }
            /* IE/old Edge */
            * {
                -ms-overflow-style: none !important;
            }
        `
        document.head.appendChild(styleEl)

        return () => {
            styleEl.remove()
        }
    }, [isOpen, isMobile])


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

    // Convert interactions to chat messages.
    // Completed-interaction mapping is delegated to the pure buildChatMessages() function.
    // Loading / error states require component context so they are injected here.
    const getChatMessages = () => {
        // The streaming card is the canonical view for the active turn —
        // from the first SSE event through and past FINISH, until the
        // user starts the NEXT turn (which dispatches ``'start'`` and
        // resets ``status`` to ``'streaming'`` again, wiping prior turn
        // content). While that card is mounted we suppress both the
        // queued/in-progress synthesized row AND the completed/failed
        // persisted row for the SAME interaction from the message list,
        // so the user never sees a duplicate or a flicker between the
        // card's text and a freshly-rendered persisted message.
        //
        // ``status !== 'idle'`` covers the whole live → terminal'd
        // lifetime. ``!queued.isCaughtUp`` extends the suppression
        // through the typing-animation tail in the rare case where
        // ``reset()`` lands before the queue is fully drained.
        //
        // The local assistant loading row inserted at submit time is
        // also hidden — the card replaces it, and leaving it visible
        // would look like a duplicate "Thinking…" bubble.
        const streamActive =
            isStreamingMode &&
            (conciergeStream.state.status !== 'idle' || !queued.isCaughtUp)
        const streamActiveId = streamActive ? conciergeStream.state.interactionId : null
        // Anchor for "this turn" — use the parent interaction's own
        // ``created_at`` so we catch any child Interaction the agent
        // spawned during the turn (notably ``output_type: present_options``
        // carousels which the streaming card already renders live via
        // ``state.presentOptions``). Works equally for fresh sends and
        // refresh-resumes — we read it off the persisted record rather
        // than tracking local timestamps that the resume path would miss.
        const activeParent = streamActiveId
            ? liveInteractions.find((i) => i?.id === streamActiveId)
            : null
        const turnStartedAtMs = activeParent?.created_at
            ? new Date(activeParent.created_at).getTime()
            : null
        const visibleLiveInteractions = streamActive
            ? streamActiveId
                ? liveInteractions.filter((i) => {
                      if (!i) return false
                      // Parent turn — always hidden while the card owns it.
                      if (i.id === streamActiveId) return false
                      // Child interactions of this turn (e.g. persisted
                      // ``present_options`` carousels) — the streaming
                      // card already renders them. Suppress until the
                      // user starts the NEXT turn and the filter relaxes.
                      if (turnStartedAtMs && i.created_at) {
                          const createdMs = new Date(i.created_at).getTime()
                          if (Number.isFinite(createdMs) && createdMs >= turnStartedAtMs) {
                              return false
                          }
                      }
                      return true
                  })
                : // Pre-first-event window: interactionId not yet known.
                  // Hide any queued/in-progress row that just arrived so
                  // we don't briefly show a "Thinking…" alongside the
                  // streaming card before the id resolves.
                  liveInteractions.filter(
                      (i) => i?.output_status !== 'queued' && i?.output_status !== 'in_progress',
                  )
            : liveInteractions
        const visibleChatMessages = streamActive
            ? chatMessages.filter((m) => !(m.type === 'assistant' && m.isLoading))
            : chatMessages

        // 1. Build messages for completed interactions via the pure function
        const messages = buildChatMessages(visibleLiveInteractions, CARD_REGISTRY, visibleChatMessages)

        // 2. Inject loading / error messages that need component-level context
        visibleLiveInteractions.forEach((interaction) => {
            const outputStatus = interaction.output_status

            if (outputStatus === 'queued' || outputStatus === 'in_progress') {
                // Get feature for this interaction (needed for loader config)
                const featureIdentifier = (interaction.input_data as any)?.feature?.identifier || (interaction.input_data as any)?.feature_identifier
                const feature = featureIdentifier && features ? features.find((f) => f.identifier === featureIdentifier) : undefined

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

                // Check if this is an itinerary interaction with progress_details
                const isItineraryAgent = interaction.space === 'itinerary_details' || assistantType === 'ItineraryExpertChat'
                const hasProgressDetails =
                    interaction.progress_details && (interaction.progress_details.current_step || interaction.progress_details.progress?.length > 0)

                // Show loading component for queued/in_progress status
                // For itinerary agent, show "Thinking..." instead of "Processing your request..."
                const loadingContent = isItineraryAgent ? 'Thinking...' : 'Processing your request...'

                messages.push({
                    type: 'assistant',
                    content: loadingContent,
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    isLoading: true,
                    loadingStatus: outputStatus,
                    elapsedMs: Math.max(0, Date.now() - new Date(interaction.updated_at).getTime()),
                    loaderConfig,
                    // For agents with useInlineLoader, just pass progressDetails for ContextLoader
                    // For others, flag usePollingLoader so PollingInteractionLoader handles its own polling
                    ...(isItineraryAgent && hasProgressDetails
                        ? config.useInlineLoader
                            ? { interactionData: { progressDetails: interaction.progress_details } }
                            : {
                                  usePollingLoader: true,
                                  interactionData: {
                                      agentId: interaction.agent_id,
                                      threadId: interaction.thread_id,
                                      interactionId: interaction.id,
                                      progressDetails: interaction.progress_details,
                                  },
                              }
                        : {})
                } as any)
            } else if (outputStatus === 'failed') {
                // Show failed/error message
                const errorResponse = interaction.output_data?.response
                const defaultErrorMessage = "I ran into a hiccup while working on that. Could you try rephrasing or give it another go?"
                messages.push({
                    type: 'assistant',
                    content: errorResponse || "I wasn't able to complete that request.",
                    timestamp: new Date(interaction.updated_at),
                    interactionId: interaction.id,
                    isError: true,
                    errorMessage: errorResponse || defaultErrorMessage
                })
            }
        })

        // Re-sort after injecting loading/error messages
        return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    }

    // Clear chat messages when flag is set (after interactions are refreshed)
    useEffect(() => {
        if (clearChatMessages) {
            setChatMessages([])
        }
    }, [clearChatMessages])

    // Chat-style scroll: stick to bottom when user is already there, show arrow otherwise
    const [showScrollArrow, setShowScrollArrow] = useState(false)
    const isNearBottomRef = useRef(true)

    const scrollChatToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        const el = chatContainerRef.current
        if (el) el.scrollTo({ top: el.scrollHeight, behavior })
    }, [])

    // Pin to the bottom for a short window — covers the loading bubble /
    // streaming card growing in just after a submit.
    const stickChatToBottomBriefly = useCallback((durationMs = 700) => {
        isNearBottomRef.current = true
        setShowScrollArrow(false)
        const start = performance.now()
        const stick = () => {
            const el = chatContainerRef.current
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
            if (performance.now() - start < durationMs) {
                requestAnimationFrame(stick)
            }
        }
        requestAnimationFrame(stick)
    }, [])

    const handleChatScroll = useCallback(() => {
        const el = chatContainerRef.current
        if (!el) return
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
        const nearBottom = distFromBottom < 100
        isNearBottomRef.current = nearBottom
        setShowScrollArrow(!nearBottom)
    }, [])

    // Track whether user is near the bottom
    useEffect(() => {
        const el = chatContainerRef.current
        if (!el) return
        el.addEventListener('scroll', handleChatScroll, { passive: true })
        handleChatScroll()
        return () => el.removeEventListener('scroll', handleChatScroll)
    }, [isOpen, allInteractions.length, chatMessages.length, handleChatScroll])

    // Always open at the latest message (bottom). Late layout shifts
    // (images loading, card lazy-renders) can grow the content after
    // the initial scroll lands, leaving the chat short of the bottom —
    // so re-pin to bottom for ~700ms after open.
    useEffect(() => {
        if (!isOpen) return
        let rafId = 0
        const start = performance.now()
        const STICK_FOR_MS = 700
        const stick = () => {
            const el = chatContainerRef.current
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
            isNearBottomRef.current = true
            setShowScrollArrow(false)
            if (performance.now() - start < STICK_FOR_MS) {
                rafId = requestAnimationFrame(stick)
            }
        }
        rafId = requestAnimationFrame(stick)
        return () => cancelAnimationFrame(rafId)
    }, [isOpen, allInteractions.length])

    // Auto-scroll to bottom when new messages arrive, but only if user was already at the bottom
    useEffect(() => {
        if (chatMessages.length > 0 && isNearBottomRef.current) {
            requestAnimationFrame(() => scrollChatToBottom('smooth'))
        }
    }, [chatMessages.length, scrollChatToBottom])

    // Auto-scroll while the concierge is streaming OR the queue is still
    // draining.
    //
    // ResizeObserver was insufficient here: the chat container and its
    // inner wrapper both use ``flex-1`` inside a fixed-height parent,
    // so their own bounding boxes never change even as ``scrollHeight``
    // grows from new content. ResizeObserver only fires on the OBSERVED
    // element's size changes — the children growing past the viewport
    // doesn't qualify.
    //
    // Polling ``scrollHeight`` once per animation frame is ~16ms of
    // work and reliably catches every kind of growth — text streaming,
    // new phase rows landing, the expandable checklist opening, motion
    // layout transitions resizing rows. Compared to the network-event-
    // driven effect, this also sticks the bottom DURING the queue's
    // throttled reveal (between source state changes), which is when
    // the visible content keeps growing without state ticking.
    //
    // Bound by ``isNearBottomRef`` so a user who scrolled up to re-read
    // an earlier turn isn't yanked back. Only runs in streaming mode.
    const queueIsCaughtUp = queued.isCaughtUp
    const streamPhase = conciergeStream.state.status
    const followStreamingScroll =
        isStreamingMode &&
        (streamPhase === 'streaming' || streamPhase === 'aborting' || !queueIsCaughtUp)
    useEffect(() => {
        if (!followStreamingScroll) return
        const el = chatContainerRef.current
        if (!el) return
        let rafId = 0
        let lastScrollHeight = el.scrollHeight
        const tick = () => {
            const current = el.scrollHeight
            if (current !== lastScrollHeight) {
                lastScrollHeight = current
                if (isNearBottomRef.current) {
                    el.scrollTo({ top: current, behavior: 'auto' })
                }
            }
            rafId = requestAnimationFrame(tick)
        }
        rafId = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId)
    }, [followStreamingScroll])


    // Poll interactions; when completed/failed, replace object in local list and remove loader chat row
    useEffect(() => {
        const agentId = ataId
        const threadId = threads && threads.length > 0 ? threads[0].id : undefined
        if (!threadId) return

        const idSet = new Set<string>()
        // Identify interactions handled by PollingInteractionLoader (self-polling) to avoid double polling
        const pollingLoaderIds = new Set(
            chatMessages
                .filter((m: any) => m.isLoading && m.usePollingLoader && m.interactionId)
                .map((m) => m.interactionId as string)
        )
        // from server list (live interactions) — exclude those handled by PollingInteractionLoader
        liveInteractions.filter((i) => (i.output_status === 'queued' || i.output_status === 'in_progress') && !pollingLoaderIds.has(i.id)).forEach((i) => idSet.add(i.id))
        // from local chat rows — exclude those handled by PollingInteractionLoader
        chatMessages.filter((m) => m.isLoading && !!m.interactionId && !(m as any).usePollingLoader).forEach((m) => idSet.add(m.interactionId as string))

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
                    // Fire a posthog event when the AI response lands (completed or
                    // failed). Deduped per-interaction via trackedResponseIdsRef so
                    // that polling re-reads of the same terminal status don't
                    // double-fire during the state-update window.
                    if (
                        (r.output_status === 'completed' || r.output_status === 'failed') &&
                        r.id &&
                        !trackedResponseIdsRef.current.has(r.id)
                    ) {
                        trackedResponseIdsRef.current.add(r.id)
                        const createdAt = r.created_at ? new Date(r.created_at).getTime() : null
                        const updatedAt = r.updated_at ? new Date(r.updated_at).getTime() : null
                        const durationMs = createdAt && updatedAt ? Math.max(0, updatedAt - createdAt) : null
                        trackButtonClickCustom?.({
                            buttonPage: 'ai_assistant_window',
                            buttonName: 'ai_response_received',
                            buttonAction: POSTHOG_ACTIONS.CLICK,
                            extra: {
                                assistant_type: assistantType,
                                entity_type: entityType,
                                entity_id: entityId,
                                ata_id: ataId,
                                trip_id: tripId ?? null,
                                thread_id: r.thread_id ?? threadId ?? null,
                                interaction_id: r.id,
                                output_status: r.output_status,
                                output_type: r.output_data?.output_type ?? null,
                                itinerary_updated: !!r.output_data?.itinerary_updated,
                                has_navigation_action: !!r.output_data?.navigation_action,
                                duration_ms: durationMs,
                                is_mobile: isMobile
                            }
                        })
                    }
                })
            } catch (e) {
                // ignore polling errors
            }
        }, 3000)

        return () => clearInterval(interval)
    }, [liveInteractions, chatMessages, ataId, threads, assistantType, entityType, entityId, tripId, isMobile, trackButtonClickCustom, dispatchNavigationAction])

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
        // Hand staged attachments back to the floating chip so they aren't
        // lost when the user closes the assistant without sending.
        if (attachmentsApi.attachments.length > 0) {
            returnAttachmentsToChip(attachmentsApi.attachments)
            attachmentsApi.clear()
        }
        setShowSuccess(false)
        setSearchQuery('')
        setInputText('')
        onClose()
    }

    // Fire a posthog event when the mobile header callback button is tapped,
    // then open the callback modal. Uses trackButtonClickCustom — same shape as
    // other callers (TripboardHeader, SearchHeader, SideBarLayout, FormSection).
    const handleHeaderCallbackClick = useCallback(() => {
        trackButtonClickCustom?.({
            buttonPage: 'ai_assistant_window_header',
            buttonName: 'request_callback',
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                assistant_type: assistantType,
                entity_type: entityType,
                entity_id: entityId,
                ata_id: ataId,
                is_mobile: isMobile,
                has_conversation: !!(currentInteraction?.output_data) || chatMessages.length > 0
            }
        })
        // Mobile: skip the selection modal entirely — record the lead and hand
        // straight off to WhatsApp (shared with the tripboard header).
        if (isMobile) {
            fireExpertWhatsAppHandoff({ travelerDetails, subscriptionIntent: resolvedSubscriptionIntent })
            return
        }

        setIsRequestCallbackModalOpen(true)
    }, [trackButtonClickCustom, assistantType, entityType, entityId, ataId, isMobile, currentInteraction, chatMessages.length, travelerDetails, resolvedSubscriptionIntent])

    // Lock background scroll while the callback modal is open — prevents mobile
    // viewport reflow (which shows up as a "flicker" as the sheet below moves).
    useEffect(() => {
        if (!isRequestCallbackModalOpen) return
        const previousOverflow = document.body.style.overflow
        const previousOverscroll = document.body.style.overscrollBehavior
        document.body.style.overflow = 'hidden'
        document.body.style.overscrollBehavior = 'contain'
        return () => {
            document.body.style.overflow = previousOverflow
            document.body.style.overscrollBehavior = previousOverscroll
        }
    }, [isRequestCallbackModalOpen])

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

        // Snapshot completed attachment ids + summary BEFORE the optimistic
        // setChatMessages below — the updater closes over these names and
        // they must be initialized before React invokes it. Also captured
        // before attachmentsApi.clear() runs below, so the chip data is
        // preserved into the user bubble even after the chips are cleared.
        const _capturedAttachmentIds = attachmentIdsRef.current.slice()
        const _capturedAttachmentsSummary = attachmentsApi.attachments
            .filter((a) => a.status === 'completed' && a.attachmentId)
            .map((a) => ({
                attachment_id: a.attachmentId as string,
                kind: a.kind,
                title: a.record?.title || a.label,
                source_url: a.sourceUrl ?? a.record?.source_url ?? null,
                filename: a.record?.filename ?? null,
            }))

        // Immediately update UI before API call for better UX
        setChatMessages((prev) => {
            const filteredPrev =
                interactionIdToReplace && interactionIdToReplace.length > 0
                    ? prev.filter((message) => message.interactionId !== interactionIdToReplace)
                    : prev
            return [
                ...filteredPrev,
                // Add user message (hide internal form submission markers)
                // Concierge rebuild: strip the <selection> envelope from the
                // displayed user message — the structured intent JSON should
                // not leak into the chat transcript.
                ...(stripSelectionEnvelope(queryToSend)
                    ? [
                          {
                              type: 'user' as const,
                              content: stripSelectionEnvelope(queryToSend),
                              timestamp: new Date(),
                              attachmentsSummary: _capturedAttachmentsSummary.length
                                  ? _capturedAttachmentsSummary
                                  : undefined,
                          },
                      ]
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
        attachmentsApi.clear()
        setIsNewMessageLoading(true)
        // Land on the just-sent message even if scrolled up.
        stickChatToBottomBriefly()

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

                // ── Streaming branch (itinerary concierge only) ────────────
                //
                // The chat input (SmartChatInput) routes through handleSend,
                // so streaming must be wired here too — ``sendPromptMessage``
                // alone only covers programmatic triggers from the assistant
                // controller (e.g. card taps). When on ItineraryExpertChat
                // we swap the queue POST for the SSE endpoint and let the
                // ``useConciergeStream`` hook drive the render path.
                if (isStreamingMode) {
                    // One-tap schedule-shortlist TEST AFFORDANCE: typing
                    // "/schedule-shortlisted" stands in for the (not yet
                    // built) wishlist button. Sends the canonical bulk-
                    // schedule turn with skills=['schedule_shortlisted'] so
                    // the BE force-activates the skill regardless of which
                    // page (source) hosts the button. Remove once the real
                    // wishlist entry point ships.
                    const isScheduleShortlisted =
                        queryToSend.trim().toLowerCase() === '/schedule-shortlisted'
                    await conciergeStream.sendTurn(
                        isScheduleShortlisted
                            ? 'Schedule my shortlisted experiences into my trip'
                            : queryToSend,
                        {
                            threadId: existingThreadId,
                            attachmentIds: _capturedAttachmentIds.length
                                ? _capturedAttachmentIds
                                : undefined,
                            skills: isScheduleShortlisted
                                ? ['schedule_shortlisted']
                                : undefined
                        }
                    )
                    // Drain the throttled reveal, then keep the card up
                    // until the BE-persisted interaction is actually
                    // present before swapping — no blank gap.
                    await finalizeStreamedTurn()
                    return
                }

                // Prepare API request data — fold in any completed
                // Tripboard AI Assistant attachments (PDF/DOCX/YouTube/IG).
                const _attachmentIds = _capturedAttachmentIds
                const requestData = {
                    input_data: _attachmentIds.length
                        ? { ...apiInputData, attachment_ids: _attachmentIds }
                        : apiInputData,
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

                // Bypass cache so the new interaction is read fresh from BE.
                await loadThreadsAndInteractions(false, true)

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

            // Forwarded by FloatingAssistantChip; renders chips on the user bubble immediately.
            const _forwardedAttachmentsSummary = Array.isArray((metadata as any)?.attachments_summary)
                ? ((metadata as any).attachments_summary as Array<any>)
                : []

            setChatMessages((prev) => [
                ...prev,
                // Concierge rebuild: strip the <selection> envelope from the
                // displayed user message — the structured intent JSON should
                // not leak into the chat transcript.
                ...(stripSelectionEnvelope(queryToSend)
                    ? [
                          {
                              type: 'user' as const,
                              content: stripSelectionEnvelope(queryToSend),
                              timestamp: new Date(),
                              attachmentsSummary: _forwardedAttachmentsSummary.length
                                  ? _forwardedAttachmentsSummary
                                  : undefined,
                          },
                      ]
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

            // Snapshot ids + merge metadata-forwarded ones from FloatingAssistantChip.
            const _metadataAttachmentIds: string[] = Array.isArray((metadata as any)?.attachment_ids)
                ? ((metadata as any).attachment_ids as string[])
                : []
            const _capturedAttachmentIdsB = Array.from(
                new Set([...attachmentIdsRef.current, ..._metadataAttachmentIds])
            )

            setInputText('')
            setIsNewMessageLoading(true)
            // Land on the just-sent message even if scrolled up.
            stickChatToBottomBriefly()

            // Yield to allow UI to update before heavy work
            await new Promise((resolve) => setTimeout(resolve, 0))

            try {
                const latestThreadId = providedThreadId !== undefined ? providedThreadId : ((await loadThreadsAndInteractions(false))[0]?.id ?? null)

                // ── Streaming branch (itinerary concierge only) ────────────
                //
                // For ItineraryExpertChat we hit ``/api/ata/<id>/stream/``
                // via ``useConciergeStream``. The hook drives the streaming
                // render path; on terminal we reload interactions so the
                // persisted interaction (which ``commit_to_db`` wrote at
                // stream end) picks up in the normal card-render flow.
                if (isStreamingMode) {
                    // ``metadata.skills`` is action intent (e.g. the shortlist
                    // banner's "Add with AI" passes ['schedule_shortlisted']) —
                    // it rides the request's top-level ``skills`` field, NOT
                    // input_data, so pluck it out of the metadata here.
                    const _forcedSkills: string[] | undefined = Array.isArray((metadata as any)?.skills)
                        ? ((metadata as any).skills as string[])
                        : undefined
                    // ``metadata.experienceIds`` is the "+ Add" fast path —
                    // ids of experiences the user is explicitly adding. Rides
                    // input_data.experience_ids so the BE skips search.
                    const _experienceIds: string[] | undefined = Array.isArray((metadata as any)?.experienceIds)
                        ? ((metadata as any).experienceIds as string[])
                        : undefined
                    // ``metadata.flightRimigoIds`` is the Flights-tab "+ Add"
                    // fast path — opaque flight_cache tokens. Rides
                    // input_data.preresolved_flights so the BE resolves the
                    // chosen flight without re-searching.
                    const _flightRimigoIds: string[] | undefined = Array.isArray((metadata as any)?.flightRimigoIds)
                        ? ((metadata as any).flightRimigoIds as string[])
                        : undefined
                    await conciergeStream.sendTurn(queryToSend, {
                        threadId: latestThreadId,
                        attachmentIds: _capturedAttachmentIdsB.length
                            ? _capturedAttachmentIdsB
                            : undefined,
                        skills: _forcedSkills,
                        experienceIds: _experienceIds,
                        flightRimigoIds: _flightRimigoIds
                    })
                    // Drain the throttled reveal, then keep the card up
                    // until the BE-persisted interaction is actually
                    // present before swapping — no blank gap.
                    await finalizeStreamedTurn()
                    return
                }

                const apiInputData = transformInputDataToAPIPayload(assistantType, inputData, queryToSend, null)
                const _attachmentIds = _capturedAttachmentIdsB
                // attachment_ids already merged above; attachments_summary stays
                // in restMetadata so BE persists it (avoids a chip-flicker race).
                const {
                    attachment_ids: _ignoredMetadataIds,
                    // ``skills`` is a top-level request field on the streaming
                    // path; on the legacy path it has no home in input_data, so
                    // drop it rather than spreading it into the payload.
                    skills: _ignoredSkills,
                    ...restMetadata
                } = (metadata || {}) as Record<string, any>
                void _ignoredMetadataIds
                void _ignoredSkills
                const requestData = {
                    input_data: _attachmentIds.length
                        ? { ...apiInputData, ...restMetadata, attachment_ids: _attachmentIds }
                        : { ...apiInputData, ...restMetadata },
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

                // Bypass cache so new interaction is read fresh.
                await loadThreadsAndInteractions(false, true)

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
            config.source,
            tripId,
            entityType,
            entityId,
            ataId,
            onSendMessage,
            loadThreadsAndInteractions,
            isStreamingMode,
            conciergeStream
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

    /**
     * Route an LLM-attached follow-up action (intent / reply) into the
     * existing assistant submit path. Mirrors the
     * ``InlinePresentOptionsCard`` ``onSelect`` plumbing — visible text +
     * ``<selection>{action_data}</selection>`` envelope + metadata kwarg.
     * Dismiss taps don't reach here; ``FollowUpActions`` resolves them
     * locally (silent hide).
     */
    const handleFollowUpAction = useCallback(
        (
            action: IntentAction | ReplyAction | CustomActionAction,
            ctx: { sourceInteractionId?: string; selectedActionIdx: number },
        ) => {
            // ``custom_action`` fires an in-app affordance in place (e.g.
            // open the invite modal) — it never posts back to the agent.
            if (action.action === 'custom_action') {
                dispatchCustomAction(action.action_data.action)
                return
            }
            const visibleText =
                action.action === 'reply' ? action.action_data.message : action.cta
            // ``action_data`` carries the structured intent. Inject it via
            // <selection> so the BE history_loader stitches it onto the
            // next-turn user message, matching the present_options path.
            //
            // The ``action: 'follow_up_action_select'`` discriminator +
            // ``source_interaction_id`` + ``selected_action_idx`` let the BE
            // (``_persist_follow_up_action_selection`` in
            // ``StreamingItineraryInteractionService.py``) stamp the picked
            // chip onto the parent assistant Interaction's output_data so
            // the chip strip renders in its ``selected`` state on revisit.
            // ``sourceInteractionId`` may be undefined on the live-streaming
            // turn (the parent message hasn't been persisted yet); in that
            // case the stamping pass becomes a no-op and the post-turn
            // persisted render takes over from there.
            const metadata: Record<string, unknown> = {
                ...action.action_data,
                cta: action.cta,
                action: 'follow_up_action_select',
                selected_action_idx: ctx.selectedActionIdx,
            }
            if (ctx.sourceInteractionId) {
                metadata.source_interaction_id = ctx.sourceInteractionId
            }
            void sendPromptMessage(
                `${visibleText}<selection>${JSON.stringify(metadata)}</selection>`,
                undefined,
                metadata,
            )
        },
        [sendPromptMessage],
    )

    // ── View context for SmartChatInput contextual chips ──────────────────
    const currentViewContext: ViewContext | undefined = (() => {
        if (assistantType === 'ItineraryExpertChat') {
            return { page: 'itinerary' as const, subview: 'overview' as const }
        }
        if (assistantType === 'HotelSmartSearch') {
            return { page: 'stays' as const, subview: 'listing' as const }
        }
        if (assistantType === 'HotelExpertChat') {
            return { page: 'stays' as const, subview: 'detail' as const }
        }
        if (assistantType === 'ExperienceExpertChat') {
            return { page: 'experience' as const, subview: 'detail' as const }
        }
        return { page: 'generic' as const }
    })()

    // ── Latest turn's follow-up chips, promoted to the input-bar slot ─────
    // Follow-up chips (intent / reply / custom_action) ride ABOVE the input
    // bar instead of inline under the message — only the LATEST turn's, so the
    // freshest CTAs sit where the eye lands and the transcript stays clean.
    // Source: the just-finished stream's FINISH actions while it's settling,
    // else the persisted last assistant turn. While a turn is actively
    // streaming we surface none (they reappear the instant it finishes).
    // Navigation actions are NOT promoted — they stay inline with their message.
    const latestFollowUps: {
        chips: FollowUpChipAction[]
        sourceInteractionId?: string
    } = (() => {
        const status = conciergeStream.state.status
        const isLive =
            status === 'streaming' || status === 'aborting' || !queued.isCaughtUp
        if (isLive) return { chips: [] }
        const terminalEvent =
            conciergeStream.state.terminal?.kind === 'finish'
                ? conciergeStream.state.terminal.event
                : null
        if (status !== 'idle' && terminalEvent?.actions?.length) {
            return {
                chips: partitionActions(terminalEvent.actions).chips,
                sourceInteractionId: conciergeStream.state.interactionId ?? undefined,
            }
        }
        const msgs = getChatMessages()
        for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].type === 'assistant') {
                return {
                    chips: partitionActions(msgs[i].actions).chips,
                    sourceInteractionId: msgs[i].interactionId,
                }
            }
        }
        return { chips: [] }
    })()

    // ── Card render context for ChatResponseRenderer ──────────────────────
    const cardRenderContext: CardRenderContext = {
        hooks: {
            ...hooksConfig,
            onClose,
        },
        sendPromptMessage,
        features,
        allInteractions,
        assistantType,
        inputData,
        handleMissingFieldsNext,
        presentOptionsLocalSelections,
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
        const sender = async (prompt: string, threadId: string | null, metadata?: Record<string, any>) => {
            await sendPromptMessage(prompt, threadId, metadata)
        }
        registerAssistantPromptSender(sender)
        return () => {
            unregisterAssistantPromptSender(sender)
        }
    }, [sendPromptMessage])

    // Prefill-only path: drop text into the input and focus it, no send.
    useEffect(() => {
        const prefill = (text: string) => {
            setInputText(text)
            requestAnimationFrame(() => inputRef.current?.focus())
        }
        registerAssistantInputPrefiller(prefill)
        return () => {
            unregisterAssistantInputPrefiller(prefill)
        }
    }, [])

    // Auto-resume on reopen: when the assistant opens and we see any
    // in-progress / queued interaction for this thread, reconnect to
    // its live stream via GET. The detached task on the backend keeps
    // running even after the user closed the panel, so this just hooks
    // us back into the ongoing event feed.
    //
    // Guards so we don't double-resume: skip when the hook is already
    // streaming or still in done/errored from a previous turn — the
    // interaction list will also contain freshly-completed interactions
    // whose output_status transitions lag by a frame.
    useEffect(() => {
        if (!isStreamingMode || !isOpen) return
        if (conciergeStream.state.status === 'streaming' || conciergeStream.state.status === 'aborting') return
        const pending = allInteractions.find(
            (i: any) => i.output_status === 'in_progress' || i.output_status === 'queued'
        )
        if (!pending?.id) return
        conciergeStream.resume(pending.id).catch((err) => {
            console.warn('[AIAssistantWindow] auto-resume failed', err)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStreamingMode, isOpen, allInteractions])

    // Global Escape → stop the in-flight concierge stream. Skipped on
    // non-streaming assistants so hotel / stay / experience chats aren't
    // affected. Listener is bound for the lifetime of the open assistant.
    useEffect(() => {
        if (!isStreamingMode || !isOpen) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return
            if (conciergeStream.state.status !== 'streaming') return
            e.preventDefault()
            void conciergeStream.stop()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isStreamingMode, isOpen, conciergeStream])

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

    // Desktop panel width — 50% of the viewport for the streaming
    // concierge so the kanban behind it gets equal real estate, making
    // the View-Changes / day-jump flows land somewhere the user can
    // see. Other assistants keep the wider 75% layout they already
    // ship with.
    const panelWidthClass = 'w-1/2'

    // Overlay with fade in/out — rendered via portal with its own AnimatePresence
    // so the exit animation plays even when the parent unmounts this component
    // Mobile panel sits above the SideBarLayout hamburger (z-1000) — otherwise
    // the menu button clips over the sheet.
    const overlayClassName = isMobile
        ? 'fixed inset-0 z-[1050] bg-black/40'
        : 'fixed inset-0 z-[1200] bg-black/30'

    const panelClassName = isMobile
        ? `fixed inset-0 h-[100dvh] bg-white flex flex-col z-[1100] ${MobileContainerClass ?? ''}`
        : `fixed right-0 top-0 h-screen ${panelWidthClass} bg-white border-l border-feature-card-border flex flex-col z-[1210]`

    const overlayPortal = portalContainer
        ? createPortal(
              <AnimatePresence>
                  {isOpen && (
                      <motion.div
                          key="assistant-overlay"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: isMobile ? 0.5 : 0.5, ease: [0.4, 0, 0.2, 1] }}
                          className={overlayClassName}
                          onClick={handleClose}
                          aria-hidden="true"
                      />
                  )}
              </AnimatePresence>,
              portalContainer
          )
        : null

    // Compute content state values (always computed so panel stays mounted across open/close)
    //
    // ``hasConversation`` drives a top-level ternary between the empty-state
    // layout (FallBackMainContent + a fresh input) and the chat layout
    // (message list + chat input). Anything that flips this mid-mount remounts
    // the entire input region, which the user perceives as a flicker. On a
    // page refresh into a mid-stream session the old predicate read false at
    // first paint (``output_data`` not landed yet, ``chatMessages`` empty)
    // and then flipped true once ``loadThreadsAndInteractions`` resolved.
    // Treating ANY known interaction as "in conversation" keeps the layout
    // stable from first paint through resume / FINISH.
    const hasConversation =
        !!(currentInteraction?.output_data) ||
        chatMessages.length > 0 ||
        allInteractions.length > 0 ||
        liveInteractions.length > 0
    const input_data = currentInteraction?.input_data || {}
    const duration = currentInteraction
        ? calculateDuration(currentInteraction.created_at, currentInteraction.updated_at)
        : { minutes: 0, seconds: 0 }

    // Single panel — always mounted to prevent child components re-making API calls on reopen.
    // Visibility is driven by `animate` (slide off-screen when closed) instead of unmounting.
    const panelNode = (
            <motion.div
                initial={isMobile ? { y: '100%' } : { x: '100%' }}
                animate={
                    isMobile
                        ? { y: isOpen ? 0 : '100%' }
                        : { x: isOpen ? 0 : '100%' }
                }
                // Symmetric tween for both directions so the slide-in mirrors
                // the slide-out exactly (a spring's settle-in vs launch-out read
                // as different). Same curve as the backdrop fade for cohesion.
                transition={{
                    type: 'tween',
                    duration: isMobile ? 0.4 : 0.42,
                    ease: [0.4, 0, 0.2, 1],
                }}
                drag={isMobile && isOpen ? 'y' : false}
                dragListener={false}
                dragControls={sheetDragControls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                dragMomentum={false}
                onDragEnd={(_, info: PanInfo) => {
                    if (!isMobile) return
                    const passedDistance = info.offset.y > 140
                    const flickedDown = info.velocity.y > 600
                    if (passedDistance || flickedDown) {
                        handleClose()
                    }
                }}
                className={panelClassName}
                // Seals this subtree from useHideOnScrollDown so chat scrolls
                // don't collapse the page's sticky sub-header.
                data-overlay-scroll
                style={{
                    pointerEvents: isOpen ? 'auto' : 'none',
                    willChange: 'transform',
                    backfaceVisibility: 'hidden',
                }}
                onDragEnter={onPanelDragEnter}
                onDragOver={onPanelDragOver}
                onDragLeave={onPanelDragLeave}
                onDrop={onPanelDrop}>

            {/* Drag-to-attach overlay — dashed dropzone shown while a file
                is being dragged from the OS. pointer-events:none so nothing
                underneath swallows the drop. */}
            <AnimatePresence>
                {dragOverlayActive && (
                    <motion.div
                        key="drop-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="absolute inset-2 z-[1500] pointer-events-none rounded-2xl border-2 border-dashed border-primary-default bg-primary-default/10 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                        <UploadCloud className="h-10 w-10 text-primary-default" strokeWidth={1.75} />
                        <p className="font-manrope text-[15px] font-semibold text-primary-default">
                            Drop to attach
                        </p>
                        <p className="font-manrope text-[12px] text-grey_1">
                            PDF, DOCX, or spreadsheet — up to 5 per message
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Searching state ── */}
            {showSuccess ? (
                <LoadingStateWhenSearching
                    searchQuery={searchQuery}
                    handleClose={handleClose}
                    currentLoadingMessageIndex={currentLoadingMessageIndex}
                    loadingMessages={loadingMessages}
                    headerProps={{
                        logoSrc: '',
                        agentName: null,
                        featureName: null,
                        onMinimize: handleClose,
                        onDragHandlePointerDown: isMobile ? startSheetDrag : undefined
                    }}
                />

            ) : (isLoadingThreads && !hasConversation) ? (
                /* ── Loading state ── designed conversation skeleton, shown only
                   while threads/interactions are fetching AND there is no
                   content yet, so it never covers an existing conversation. */
                <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col" style={{ overflowAnchor: 'none' }}>
                    <ChatHeader
                        logoSrc={agentIconUrl}
                        agentName={agentDisplayName}
                        onMinimize={handleClose}
                        className="w-full"
                        onCallbackClick={handleHeaderCallbackClick}
                        callbackImageSrc={POTRAIT_IMAGES.PORTRAIT_1}
                        hideCallbackOnDesktop={hideCallbackOnDesktop}
                        onDragHandlePointerDown={isMobile ? startSheetDrag : undefined}
                    />
                    <ChatLoadingSkeleton isMobile={isMobile} />
                </div>

            ) : hasConversation ? (
                <>
                    {/* Main Content */}
                    <div ref={chatContainerRef} onScroll={handleChatScroll} className="flex-1 overflow-y-auto chat-messages-container scrollbar-hide relative flex flex-col" style={{ overflowAnchor: 'none', WebkitOverflowScrolling: 'touch' , overscrollBehavior: 'none' , position: 'relative'}}>
                        {/* chat header */}
                        <ChatHeader
                            logoSrc={agentIconUrl}
                            agentName={agentDisplayName}
                            onMinimize={handleClose}
                            className="w-full"
                            infoBanner={infoBanner}
                            onCallbackClick={handleHeaderCallbackClick}
                            callbackImageSrc={POTRAIT_IMAGES.PORTRAIT_1}
                            hideCallbackOnDesktop={hideCallbackOnDesktop}
                            onDragHandlePointerDown={isMobile ? startSheetDrag : undefined}
                        />
                        
                        <div className={`flex-1 px-4 py-5 space-y-5 ${isMobile ? 'pb-30 pt-14' : ''}`}>
                            {/* Initial interaction display - only show when there's a completed interaction but no chat history */}
                            {allInteractions.length === 0 && currentInteraction && chatMessages.length === 0 && (
                                <>
                                    {/* User Message - Right Aligned */}
                                    <div className="flex justify-end">
                                        <div className="max-w-[90%] md:max-w-[80%] bg-grey-47 text-grey_0 px-4 py-3 rounded-[12px] rounded-tr-[4px]">
                                            <p className="text-sm font-medium leading-5 font-manrope">
                                                {(input_data as any)?.user_text_input || ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* System Response with Output */}
                                    <div className="flex justify-start">
                                        <div className="max-w-[96%] bg-grey_5 px-0 py-3 rounded-2xl rounded-tl-sm">
                                            {/* Thought & analysed duration */}
                                            <div className="mb-3 p-2 bg-grey_4 rounded-lg mx-4">
                                                <p className="text-xs text-grey_2 font-manrope">
                                                    Thought & analysed for {duration.minutes}m {duration.seconds}s
                                                </p>
                                            </div>

                                            {/* AI Recommendation Text */}
                                            <p className="text-sm font-medium text-grey_0 mb-4 font-manrope px-4">
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
                                (() => {
                                    const _renderedMessages = getChatMessages()
                                    // Follow-up chips are no longer rendered inline per message
                                    // (they're promoted to the input-bar slot via
                                    // ``latestFollowUps``), so the previous stale-chip bookkeeping
                                    // (_lastAssistantIdx / _hasActiveStreamingTurn) is gone — only
                                    // the navigation pill stays inline and it has no stale state.
                                    return _renderedMessages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start items-start gap-2'}`}>
                                        {/* Assistant identity treatment.
                                            - Itinerary concierge (streaming mode): replace the
                                              sparkle avatar with a 2px primary-tinted left
                                              rail. Trust comes from the work the panel shows
                                              (verified venues, updated days), not from a
                                              chatbot glyph. Reads as a well-typeset brief
                                              rather than a chat bubble.
                                            - Legacy assistants (stays / experience / hotel /
                                              Burj): keep the sparkle avatar they already ship
                                              with so this refactor's scope stays on the
                                              concierge surface only. */}
                                        {message.type === 'assistant' && !isStreamingMode && <AssistantAvatar />}
                                        <div
                                            className={`${
                                                message.type === 'user'
                                                    ? 'max-w-[90%] md:max-w-[75%] my-[2.5px] px-3.5 py-2.5 bg-grey-47 text-grey_0 rounded-[12px] rounded-tr-[4px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
                                                    : isStreamingMode
                                                    ? 'w-full pt-0.5 text-[#1F2937] border-l-2 border-primary-default/35'
                                                    : 'max-w-[82%] pt-1 text-[#1F2937]'
                                            }`}>
                                            {/* Show structured response if available */}
                                            {message.type === 'assistant' && message.structuredData && !message.isError && (
                                                <div className="mt-0">
                                                    <StructuredChatResponse data={message.structuredData} />
                                                </div>
                                            )}
                                            {/* Show plain text content only if no card handles it */}
                                            {(() => {
                                                const cardEntry = getCardEntry(message.outputType || '')
                                                const cardHandlesText = cardEntry?.handlesText ?? false
                                                if (cardHandlesText || message.structuredData || (message as any).isError) {
                                                    return null
                                                }
                                                // Streaming: the card owns the loading bubble. Suppress
                                                // the "Processing…" placeholder for ANY loading bubble
                                                // (not just the last) — once the persisted message
                                                // sorts in, the session bubble isn't last and the
                                                // text would otherwise flash in before it's cleared.
                                                if (
                                                    message.type === 'assistant' &&
                                                    isStreamingMode &&
                                                    message.isLoading
                                                ) {
                                                    return null
                                                }
                                                // Itinerary concierge → premium message renderer with
                                                // option-list detection + recommendation call-out.
                                                if (
                                                    message.type === 'assistant' &&
                                                    isStreamingMode &&
                                                    typeof message.content === 'string' &&
                                                    !message.isLoading
                                                ) {
                                                    return <ItineraryAssistantMessage text={message.content} />
                                                }
                                                return (
                                                    <p className="text-[16px] md:text-[14px] font-[400] leading-[1.5] font-manrope">
                                                        {typeof message.content === 'string' ? parseSimpleMarkdown(message.content) : message.content}
                                                    </p>
                                                )
                                            })()}
                                            {/* Tripboard AI Assistant: when this user turn folded
                                                in attachments (PDF / DOCX / xlsx / csv / YouTube /
                                                Instagram), render a small chip strip inside the
                                                user bubble so the message is self-explanatory
                                                without leaking the structured "[Attached context]"
                                                block the agent consumes. */}
                                            {message.type === 'user' &&
                                                Array.isArray(message.attachmentsSummary) &&
                                                message.attachmentsSummary.length > 0 && (
                                                    <MessageAttachmentChips
                                                        attachments={message.attachmentsSummary}
                                                        align="right"
                                                    />
                                                )}

                                            {/* The legacy "Itinerary updated · View" pill (driven off
                                                ``message.itineraryUpdated``) is gone — the concierge
                                                now emits a canonical "View changes" navigation entry
                                                inside ``output_data.actions`` whenever a patch lands,
                                                so the ResponseActions pill row below covers this
                                                intent and any other CTAs the agent surfaces. */}

                                            {/* Response-time CTAs derived by the concierge after
                                                tool calls (e.g. ``get_budget_details`` → "View
                                                budget details") AND LLM-attached follow-up actions
                                                (intent / reply / dismiss). Partitioned by action
                                                type: navigation → quiet pill, others → chip strip. */}
                                            {message.type === 'assistant' &&
                                                !message.isError &&
                                                Array.isArray(message.actions) &&
                                                message.actions.length > 0 &&
                                                (() => {
                                                    // Follow-up chips now live above the input bar
                                                    // (latest turn only — see ``latestFollowUps``).
                                                    // Only the navigation "view changes" link stays
                                                    // inline with its message, as a standalone pill
                                                    // (no "or" — the chips it used to sit beside
                                                    // have moved out).
                                                    const { nav } = partitionActions(message.actions)
                                                    if (nav.length === 0) return null
                                                    return (
                                                        <ResponseActions
                                                            actions={nav}
                                                            onClose={handleClose}
                                                        />
                                                    )
                                                })()}

                                            {/* Streaming card used to render here, coupled to a
                                                specific message row's identity / index. That coupling
                                                produced four overlapping bugs (mid-stream vanish,
                                                "Done…" cut-off, resume-from-refresh empty, input
                                                flicker) because any rearrangement of the message list
                                                — a synthesized loading row from a new in-progress
                                                interaction, the completed message landing on FINISH,
                                                another turn arriving — knocked the host row off the
                                                tail and unmounted the card. The card now lives as a
                                                sibling of this map (see render below the closing
                                                ``))}`` of the messages list), gated purely on stream
                                                state — its lifetime is bound to ``conciergeStream``,
                                                not to a message. */}

                                            {/* Loader for queued/in_progress. In streaming mode the
                                                card owns all progress UI, so skip the polling loader
                                                for ANY loading bubble (not just the last) — same
                                                not-last race as the placeholder text above. */}
                                            {!(isStreamingMode &&
                                                message.type === 'assistant' &&
                                                message.isLoading) &&
                                                message.type === 'assistant' &&
                                                message.isLoading &&
                                                (message.loadingStatus === 'queued' || message.loadingStatus === 'in_progress') &&
                                                (() => {
                                                    // Get the latest interaction data — use liveInteractions for real-time progress_details
                                                    const interaction = liveInteractions.find((i: any) => i.id === message.interactionId)
                                                        || allInteractions.find((i) => i.id === message.interactionId)
                                                    const interactionAny = interaction as any
                                                    const isItineraryAgent =
                                                        interaction?.space === 'itinerary_details' || assistantType === 'ItineraryExpertChat'
                                                    const hasProgressDetails =
                                                        interactionAny?.progress_details &&
                                                        (interactionAny.progress_details.current_step ||
                                                            interactionAny.progress_details.progress?.length > 0)

                                                    // For itinerary agent: distinguish full generation (complex progress array) from interaction service (simple step)
                                                    if (isItineraryAgent) {
                                                        const isFullGeneration = hasProgressDetails &&
                                                            interactionAny?.progress_details?.progress?.length > 0 &&
                                                            interactionAny.progress_details.progress.some((s: any) =>
                                                                ['scanning', 'db_search', 'analyzing', 'picking'].includes(s.type)
                                                            )

                                                        if (isFullGeneration) {
                                                            if (config.useInlineLoader) {
                                                                // Inline loader — derive step label from progress array
                                                                const progressArr = interactionAny?.progress_details?.progress || []
                                                                const currentKey = interactionAny?.progress_details?.current_step || ''
                                                                const loaderText = interactionAny?.progress_details?.loader_text
                                                                const genStepLabels: Record<string, string> = {
                                                                    'scanning': 'Scanning experiences & activities',
                                                                    'db_search': 'Searching our database',
                                                                    'analyzing': 'Analyzing your preferences',
                                                                    'picking': 'Picking the best options',
                                                                }
                                                                const genStepIdx = progressArr.findIndex((s: any) => s.key === currentKey)
                                                                const activeConfig = genStepIdx >= 0 ? (progressArr[genStepIdx] as any)?.ui_config : null
                                                                const genLabel = loaderText
                                                                    || activeConfig?.title
                                                                    || (currentKey ? (genStepLabels[currentKey] || currentKey) : 'Building your itinerary')

                                                                return (
                                                                    <ItineraryInlineLoader
                                                                        label={genLabel}
                                                                        stepIndex={genStepIdx >= 0 ? genStepIdx : 0}
                                                                        totalSteps={progressArr.length || 4}
                                                                    />
                                                                )
                                                            }

                                                            // Default: PollingInteractionLoader with self-polling
                                                            if (interaction) {
                                                                return (
                                                                    <PollingInteractionLoader
                                                                        agentId={interaction.agent_id}
                                                                        threadId={interaction.thread_id}
                                                                        interactionId={interaction.id}
                                                                        pollingInterval={3000}
                                                                        onComplete={(updatedInteraction) => {
                                                                            setLiveInteractions((prev) =>
                                                                                prev.map((it) =>
                                                                                    it.id === updatedInteraction.id
                                                                                        ? { ...it, ...updatedInteraction }
                                                                                        : it
                                                                                )
                                                                            )
                                                                        }}
                                                                        onError={(error) => {
                                                                            console.error('Polling error:', error)
                                                                        }}
                                                                    />
                                                                )
                                                            }
                                                        } else {
                                                            // Context-aware loader — prefer backend loader_text, fall back to static labels
                                                            const stepText = interactionAny?.progress_details?.current_step
                                                            const loaderText = interactionAny?.progress_details?.loader_text
                                                            // ``loader_text`` is the real source of truth — the
                                                            // streaming bridge always sets it from the active phase
                                                            // verb. Static stepLabels are only the fallback for the
                                                            // brief window before any progress event lands. Keep them
                                                            // generic so a stale "Applying updates" flash never
                                                            // contradicts what the tool is actually doing.
                                                            const stepLabels: Record<string, string> = {
                                                                'understanding': 'Reading your request',
                                                                'classifying': 'Reading your request',
                                                                'planning': 'Planning changes',
                                                                'applying': 'Working on your itinerary',
                                                                'responding': 'Preparing response',
                                                            }
                                                            const label = loaderText || (stepText ? (stepLabels[stepText] || stepText) : 'Thinking')

                                                            const STEP_ORDER = ['understanding', 'planning', 'applying', 'responding']
                                                            const stepIndex = stepText ? STEP_ORDER.indexOf(stepText) : 0

                                                            if (config.useInlineLoader) {
                                                                return (
                                                                    <ItineraryInlineLoader
                                                                        label={label}
                                                                        stepIndex={stepIndex >= 0 ? stepIndex : 0}
                                                                        totalSteps={4}
                                                                    />
                                                                )
                                                            }

                                                            return (
                                                                <ContextLoader
                                                                    label={label}
                                                                    stepIndex={stepIndex >= 0 ? stepIndex : 0}
                                                                    totalSteps={4}
                                                                />
                                                            )
                                                        }
                                                    }

                                                    // For non-itinerary agents: show OutputLoadingComponent if loaderConfig exists
                                                    // Otherwise show animated dots as fallback
                                                    if (message.loaderConfig) {
                                                        return (
                                                            <div className="mt-3">
                                                                <OutputLoadingComponent
                                                                    status={message.loadingStatus || 'queued'}
                                                                    elapsedMs={message.elapsedMs ?? 0}
                                                                    uiConfig={message.loaderConfig}
                                                                />
                                                            </div>
                                                        )
                                                    }

                                                    // Fallback: show "Processing your request..." with animated dots if no loaderConfig
                                                    if (message.content === 'Processing your request...') {
                                                        return (
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-grey_2 rounded-full animate-bounce"></div>
                                                                <div
                                                                    className="w-2 h-2 bg-grey_2 rounded-full animate-bounce"
                                                                    style={{ animationDelay: '0.1s' }}></div>
                                                                <div
                                                                    className="w-2 h-2 bg-grey_2 rounded-full animate-bounce"
                                                                    style={{ animationDelay: '0.2s' }}></div>
                                                            </div>
                                                        )
                                                    }

                                                    // Default to OutputLoadingComponent for non-itinerary agents (even without loaderConfig)
                                                    return (
                                                        <div className="mt-3">
                                                            <OutputLoadingComponent
                                                                status={message.loadingStatus || 'queued'}
                                                                elapsedMs={message.elapsedMs ?? 0}
                                                                uiConfig={message.loaderConfig}
                                                            />
                                                        </div>
                                                    )
                                                })()}

                                            {/* Error state */}
                                            {message.type === 'assistant' && message.isError && (
                                                <div className="mt-3">
                                                    <div className="">
                                                        <div className="flex items-start gap-3">
                                                            <span className="text-[18px] flex-shrink-0 mt-[1px]">
                                                                💬
                                                            </span>
                                                            <div className="flex-1">
                                                                <p className="text-[14px] leading-[18px] tracking-[-0.28px] text-grey_0 font-manrope font-semibold mb-1">
                                                                    I couldn't quite get that
                                                                </p>
                                                                <p className="text-[12px] leading-[18px] tracking-[-0.24px] text-grey_1 font-manrope font-medium">
                                                                    {message.errorMessage}
                                                                </p>
                                                                <button
                                                                    className="cursor-pointer mt-3 inline-flex px-4 py-2 justify-center items-center gap-1.5 rounded-full border border-grey_3 bg-white text-grey_1 text-[11px] leading-4 tracking-[-0.12px] font-manrope font-semibold hover:bg-grey_5 hover:border-grey_2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                <Suspense fallback={<div className="animate-pulse h-20 bg-grey_5 rounded-[20px]" />}>
                                                <div className="mt-3 space-y-3">
                                                    <div className="inline-flex items-center gap-1 text-[11px] text-grey_3 font-medium font-manrope">
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

                                                    {/* Registry-driven card rendering — replaces 35+ explicit conditionals */}
                                                    {message.outputType !== 'stay_smart_search_hotel_cards' && (
                                                        <ChatResponseRenderer
                                                            message={message}
                                                            context={cardRenderContext}
                                                        />
                                                    )}

                                                    {/* hotel smart search — kept inline due to complex shortlist state */}
                                                    {message.outputType === 'stay_smart_search_hotel_cards' &&
                                                        Array.isArray(message.results) &&
                                                        message.results.length > 0 &&
                                                        (() => {
                                                            // Get input data from the interaction that generated this message
                                                            const interaction = allInteractions.find((i) => i.id === message.interactionId)
                                                            const interactionInputData = interaction?.input_data || {}
                                                            // Fallback to current inputData if interaction data not available
                                                            const searchInputData =
                                                                assistantType === 'HotelSmartSearch'
                                                                    ? (interactionInputData as any)?.selectedCityId
                                                                        ? interactionInputData
                                                                        : inputData
                                                                    : inputData

                                                            return (
                                                                <ScrollableHotelResults
                                                                    hotels={message.results}
                                                                    cityId={
                                                                        assistantType === 'HotelSmartSearch'
                                                                            ? (searchInputData as any)?.selectedCityId ||
                                                                              (searchInputData as any)?.city_id
                                                                            : undefined
                                                                    }
                                                                    cityName={
                                                                        assistantType === 'HotelSmartSearch'
                                                                            ? (searchInputData as any)?.cityName ||
                                                                              (searchInputData as any)?.city_name
                                                                            : undefined
                                                                    }
                                                                    checkIn={
                                                                        assistantType === 'HotelSmartSearch'
                                                                            ? (searchInputData as any)?.checkIn || (searchInputData as any)?.check_in
                                                                            : undefined
                                                                    }
                                                                    checkOut={
                                                                        assistantType === 'HotelSmartSearch'
                                                                            ? (searchInputData as any)?.checkOut ||
                                                                              (searchInputData as any)?.check_out
                                                                            : undefined
                                                                    }
                                                                    travelPurpose={
                                                                        assistantType === 'HotelSmartSearch'
                                                                            ? (searchInputData as any)?.travelPurpose ||
                                                                              (searchInputData as any)?.purpose_type
                                                                            : undefined
                                                                    }
                                                                    groupType={
                                                                        assistantType === 'HotelSmartSearch'
                                                                            ? (searchInputData as any)?.groupType ||
                                                                              (searchInputData as any)?.group_type
                                                                            : undefined
                                                                    }
                                                                    preferences={
                                                                        assistantType === 'HotelSmartSearch'
                                                                            ? (searchInputData as any)?.cityPreferences ||
                                                                              ((searchInputData as any)?.location_preference
                                                                                  ? [(searchInputData as any).location_preference]
                                                                                  : undefined)
                                                                            : undefined
                                                                    }
                                                                    adults={
                                                                        assistantType === 'HotelSmartSearch'
                                                                            ? (searchInputData as any)?.adults
                                                                            : undefined
                                                                    }
                                                                    children={
                                                                        assistantType === 'HotelSmartSearch'
                                                                            ? (searchInputData as any)?.children
                                                                            : undefined
                                                                    }
                                                                    infants={
                                                                        assistantType === 'HotelSmartSearch'
                                                                            ? (searchInputData as any)?.infants
                                                                            : undefined
                                                                    }
                                                                    children_age={
                                                                        assistantType === 'HotelSmartSearch'
                                                                            ? (searchInputData as any)?.children_age
                                                                            : undefined
                                                                    }
                                                                />
                                                            )
                                                        })()}
                                                </div>
                                                </Suspense>
                                            )}
                                        </div>
                                    </div>
                                    ))
                                })()}

                            {/* Streaming card — canonical view for the active turn.
                                Lifetime is bound to ``conciergeStream`` alone:
                                  • mounts when ``status`` leaves ``'idle'`` —
                                    fresh send dispatches ``'start'``, auto-resume
                                    dispatches ``'resume-start'``, both go straight
                                    to ``'streaming'``.
                                  • stays mounted through ``'aborting'``, through
                                    the terminal ``'done'`` / ``'errored'`` states
                                    (carrying the final text + action pills), and
                                    through the queue's typing-animation tail
                                    (``!queued.isCaughtUp``).
                                  • unmounts when the user starts the NEXT turn
                                    (``'start'`` wipes state but ``status`` stays
                                    non-``'idle'``, so the same card just swaps
                                    content) or when ``reset()`` is called
                                    explicitly on panel teardown.
                                FINISH carries everything we need to render the
                                final state — ``state.finalMessage`` for the text
                                and ``state.terminal.event.actions`` for the CTA
                                pills — so there's no swap to a persisted message,
                                no polling, no flicker. */}
                            {isStreamingMode &&
                                (conciergeStream.state.status !== 'idle' ||
                                    !queued.isCaughtUp) && (() => {
                                    const status = conciergeStream.state.status
                                    const isLive =
                                        status === 'streaming' ||
                                        status === 'aborting' ||
                                        !queued.isCaughtUp
                                    const terminalEvent =
                                        conciergeStream.state.terminal?.kind === 'finish'
                                            ? conciergeStream.state.terminal.event
                                            : null
                                    // Single source of truth for the CTA row — the FINISH event's
                                    // ``actions[]`` now includes the canonical ``View changes``
                                    // navigation entry whenever the patch landed, alongside any
                                    // other agent-surfaced CTAs. ``<ResponseActions>`` renders the
                                    // lot; no separate "Itinerary updated" pill.
                                    const finishedActions = terminalEvent?.actions ?? []
                                    return (
                                        <div className="flex justify-start items-start gap-2">
                                            {/* Match the persisted-message bubble's left-rail
                                                treatment and width exactly — ``w-full`` (the
                                                assistant message spans the full column minus the
                                                container's side padding + the left rail) — so the
                                                live streaming card renders identically to the
                                                persisted/interactions-list version. */}
                                            <div className="flex flex-col gap-2 mt-0 w-full min-w-0 border-l-2 border-primary-default/35">
                                                <StreamingResponseCard
                                                    tools={queued.tools}
                                                    textSnapshot={queued.textSnapshot}
                                                    progressVerb={queued.progressVerb}
                                                    isStreaming={isLive}
                                                    finalMessage={conciergeStream.state.finalMessage}
                                                />
                                                {conciergeStream.state.presentOptions.map((po) => (
                                                    <InlinePresentOptionsCard
                                                        key={po.toolCallId}
                                                        title={po.title}
                                                        kind={po.kind}
                                                        items={po.items}
                                                        interactionId={po.interactionId}
                                                        allowTextReply={po.allowTextReply}
                                                        multiSelect={po.multiSelect}
                                                        // Collection-window chrome (count header + "See all"),
                                                        // backend-owned — same fields the persisted reload path
                                                        // renders, so the live carousel matches it.
                                                        totalCount={po.totalCount}
                                                        shownCount={po.shownCount}
                                                        viewAll={po.viewAll}
                                                        collectionLabel={po.collectionLabel}
                                                        onViewAll={(token) => dispatchCustomAction(token)}
                                                        interactive={!isLive}
                                                        preselectedId={
                                                            po.interactionId
                                                                ? presentOptionsLocalSelections[po.interactionId]
                                                                : undefined
                                                        }
                                                        onSelect={(text, metadata) => {
                                                            // Optimistically lock in the selection so the
                                                            // tile shows "selected" + disables further clicks
                                                            // immediately. The BE later stamps
                                                            // ``output_data.selected_id`` on the persisted
                                                            // child Interaction — once that lands, the
                                                            // persisted render takes over and this entry
                                                            // becomes transparent (BE value wins on the
                                                            // next render anyway).
                                                            const selId = metadata?.selected_id
                                                            const carouselId =
                                                                (metadata?.source_interaction_id as
                                                                    | string
                                                                    | undefined) ?? po.interactionId
                                                            if (carouselId && selId !== undefined && selId !== null) {
                                                                setPresentOptionsLocalSelections((prev) => ({
                                                                    ...prev,
                                                                    [String(carouselId)]: String(selId),
                                                                }))
                                                            }
                                                            // Route through the existing submit path so the
                                                            // <selection> envelope + routing stay consistent.
                                                            void sendPromptMessage(
                                                                `${text}<selection>${JSON.stringify(metadata)}</selection>`,
                                                                undefined,
                                                                metadata,
                                                            )
                                                        }}
                                                    />
                                                ))}
                                                {/* All CTAs from the FINISH event's ``actions[]``.
                                                    Same shape as persisted ``output_data.actions``;
                                                    partitioned by action type: navigation → quiet
                                                    pill, others → FollowUpActions chip strip. */}
                                                {!isLive && finishedActions.length > 0 && (() => {
                                                    // Follow-up chips for the just-finished turn are
                                                    // promoted above the input bar (``latestFollowUps``
                                                    // reads this same FINISH event). Only the inline
                                                    // navigation "view changes" pill stays here.
                                                    // ``-mt-2`` cancels the parent flex's ``gap-2`` so
                                                    // the spacing matches the persisted-message path.
                                                    const { nav } = partitionActions(finishedActions)
                                                    if (nav.length === 0) return null
                                                    return (
                                                        <div className="-mt-2">
                                                            <ResponseActions
                                                                actions={nav}
                                                                onClose={handleClose}
                                                            />
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    )
                                })()}
                        </div>
                        {/* Floating scroll-to-bottom arrow */}
                        <AnimatePresence>
                            {showScrollArrow && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.92, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.92, y: 10 }}
                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                    className={
                                        isMobile
                                            ? 'fixed pointer-events-none z-[1220] bottom-36 right-4'
                                            : 'fixed pointer-events-none z-[1220] bottom-40 right-50 w-1/2 flex justify-center'
                                    }>
                                    <button
                                        onClick={() => scrollChatToBottom()}
                                        className="pointer-events-auto w-9 h-9 rounded-full bg-white border border-grey_4 shadow-md flex items-center justify-center hover:bg-grey_5 transition-all duration-200 cursor-pointer text-grey_1">
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {/* Input Section - Always Visible */}
                    <div className="relative bg-white">
                        {/* Top fade — scrolling messages dissolve into the input
                            area instead of cutting off hard above the chips. */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-x-0 bottom-full h-10 bg-gradient-to-t from-white to-transparent"
                        />
                        <SmartChatInput
                            inputText={inputText}
                            setInputText={setInputText}
                            handleSend={(text?: string) => text ? handleSend(text) : handleSend()}
                            isSearching={isSearching}
                            isNewMessageLoading={isNewMessageLoading}
                            placeholder={config.placeholder || 'Describe your ideal stay'}
                            inputRef={inputRef}
                            variant="default"
                            viewContext={currentViewContext}
                            followUps={latestFollowUps.chips}
                            onFollowUp={(action, idx) =>
                                handleFollowUpAction(action, {
                                    sourceInteractionId: latestFollowUps.sourceInteractionId,
                                    selectedActionIdx: idx,
                                })
                            }
                            isStreaming={isStreamingMode && (
                                conciergeStream.state.status === 'streaming' ||
                                conciergeStream.state.status === 'aborting'
                            )}
                            onStop={isStreamingMode ? () => void conciergeStream.stop() : undefined}
                            attachments={attachmentsApi.attachments}
                            onAddAttachmentFile={attachmentsApi.addFile}
                            onAddAttachmentLink={attachmentsApi.addLink}
                            onRemoveAttachment={attachmentsApi.remove}
                            sendBlockedByAttachments={attachmentsApi.hasInFlight}
                            onChipsShown={() => stickChatToBottomBriefly()}
                        />
                    </div>
                </>
            ) : (
                <motion.div
                    key="initial-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    className="h-full overflow-hidden relative">
                    {/* Background ellipse image */}
                    <img
                        src="/images/ellipse.png"
                        alt=""
                        className="absolute top-0 left-0 right-0 h-1/3 w-full object-cover pointer-events-none"
                    />

                    <div className="h-full flex flex-col relative">
                        {agentDetails ? (
                            <ChatHeader
                                logoSrc={agentIconUrl}
                                agentName={agentDetails.name}
                                featureName={null}
                                className=""
                                onMinimize={handleClose}
                                onCallbackClick={handleHeaderCallbackClick}
                                callbackImageSrc={POTRAIT_IMAGES.PORTRAIT_1}
                                hideCallbackOnDesktop={hideCallbackOnDesktop}
                                onDragHandlePointerDown={isMobile ? startSheetDrag : undefined}
                            />
                        ) : (
                            <ChatHeader
                                logoSrc={agentIconUrl}
                                agentName={null}
                                featureName={null}
                                className=""
                                onMinimize={handleClose}
                                onCallbackClick={handleHeaderCallbackClick}
                                callbackImageSrc={POTRAIT_IMAGES.PORTRAIT_1}
                                hideCallbackOnDesktop={hideCallbackOnDesktop}
                                onDragHandlePointerDown={isMobile ? startSheetDrag : undefined}
                            />
                        )}

                        {/* Main content */}
                        <div className={`flex-1 overflow-y-auto ${isMobile ? 'pt-14' : ''}`}>
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

                        {/* Bottom section with input — same composer, fade, and
                            suggestion chips as the active (final) state so nothing
                            shifts when the conversation loads in. */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="relative z-10 bg-white">
                            {/* Top fade — matches the active chat input. */}
                            <div
                                aria-hidden
                                className="pointer-events-none absolute inset-x-0 bottom-full h-10 bg-gradient-to-t from-white to-transparent"
                            />
                            <SmartChatInput
                                inputText={inputText}
                                setInputText={setInputText}
                                handleSend={(text?: string) => text ? handleSend(text) : handleSend()}
                                isSearching={isSearching}
                                isNewMessageLoading={isNewMessageLoading}
                                placeholder={config.placeholder || 'Describe your ideal stay'}
                                inputRef={inputRef}
                                variant="default"
                                viewContext={currentViewContext}
                                followUps={latestFollowUps.chips}
                                onFollowUp={(action, idx) =>
                                    handleFollowUpAction(action, {
                                        sourceInteractionId: latestFollowUps.sourceInteractionId,
                                        selectedActionIdx: idx,
                                    })
                                }
                                isStreaming={isStreamingMode && (
                                    conciergeStream.state.status === 'streaming' ||
                                    conciergeStream.state.status === 'aborting'
                                )}
                                onStop={isStreamingMode ? () => void conciergeStream.stop() : undefined}
                                attachments={attachmentsApi.attachments}
                                onAddAttachmentFile={attachmentsApi.addFile}
                                onAddAttachmentLink={attachmentsApi.addLink}
                                onRemoveAttachment={attachmentsApi.remove}
                                sendBlockedByAttachments={attachmentsApi.hasInFlight}
                                onChipsShown={() => stickChatToBottomBriefly()}
                            />
                        </motion.div>
                    </div>
                </motion.div>
            )}

            </motion.div>
    )

    return (
        <>
            {overlayPortal}
            {portalContainer ? createPortal(panelNode, portalContainer) : panelNode}

            <TalkToExpertPromptsModal
                isOpen={isRequestCallbackModalOpen}
                onClose={() => setIsRequestCallbackModalOpen(false)}
                subscriptionIntent={resolvedSubscriptionIntent}
                analyticsButtonPage={`ai_assistant_window_${assistantType}`}
            />
        </>
    )
}

export default AIAssistantWindow
