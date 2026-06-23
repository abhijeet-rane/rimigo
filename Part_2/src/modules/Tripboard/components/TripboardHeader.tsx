import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, ChevronDown, ChevronUp, RefreshCw, Loader2, PenIcon, Ellipsis, Share2, Upload, ExternalLink, Copy, X, Link, Search, History, CreditCard, ArrowUpRight, FileText, Download, LogOut, Menu } from 'lucide-react'
import WhatsAppIcon from '@/components/icons/WhatsAppIcon'
import { useSidebarContext } from '@/components/layouts/SideBarLayout'
import { fireExpertWhatsAppHandoff } from '@/modules/Premium/utils/expertWhatsApp'
import { useTravelerDetails } from '@/modules/TravelerProfile/hooks/travelerProfile'
import VersionsPanel from './Versions/VersionsPanel'
import FloatingAssistantChip from '@/components/common/FloatingAssistantChip/FloatingAssistantChip'
import { useVoiceChat } from '@/hooks/useVoiceChat'
import { useVoiceFunctionCalls } from '@/hooks/useVoiceFunctionCalls'
import { SUGGESTIONS_ITINERARY, HEADING_ITINERARY } from '@/components/common/FloatingAssistantChip/constants'
import { useAssistantPrefetch, ataThreadsQueryKey } from '@/modules/AtaAgent/hooks/useAssistantPrefetch'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LOCK_ICON } from '@/constants/thiingsIcons'
import { cn } from '@/lib/utils'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useUserInfo } from '@/hooks/useUserInfo'
import { useLocationPersonalization } from '@/hooks/useLocationPersonalization'
import { useTripFlagsMap } from '@/hooks/useTripFlags'
import PaymentsPanel from './Payments/PaymentsPanel'
// import ShareButton from '@/components/common/ShareButton'
import InviteGenerationModal from '@/components/common/InviteGenerationModal'
import LeaveTripModal from '@/components/common/LeaveTripModal'
import TripPreferencesModal from '@/components/common/TripPreferencesModal'
import EditTripNameModal from '@/components/common/EditTripNameModal'
import TripCreationFlow from '@/components/common/TripCreationFlow'
import TripDropdown from '@/components/TripDropdown'
import { useTripboardStaleness } from '@/modules/ContentCollection/hooks/useTripboardStaleness'
import { useTripboardSync } from '@/modules/ContentCollection/hooks/useTripboardSync'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
// import AssisstantButton from '@/components/shared/AssisstantButton'
import AIAssistantWindow from '@/pages/Stays/Components/AIAssistantWindow'
import type { AssistantType, AssistantInputDataMap } from '@/pages/Stays/Components/types/assistantTypes'
import { useIsMobile } from '@/hooks/use-mobile'
import { useHideOnScrollDown } from '@/hooks/useHideOnScrollDown'
import {
    registerAssistantOpener,
    unregisterAssistantOpener,
    registerAssistantCloser,
    unregisterAssistantCloser,
    triggerAssistantPrompt,
} from '@/pages/Stays/Components/assistantController'
import { BEACH_TREE } from '@/constants/icons/svgFromCDN'
import { toast } from 'sonner'
import ShareInviteButton from '@/components/common/ShareInviteButton'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { formatCapitalizeFirstLetter, formatTripDropdownData } from '@/utils/tripFormatters'
import { cloneTripboard } from '@/api/tripboardApi'
import { leaveTrip } from '@/api/tripInviteAPI/tripInviteAPI'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'
import { POST_CREATE_DEFAULT_TAB, POST_CREATE_EXPAND_ASSISTANT_KEY } from '../constants/tripboardConfig'
import { FormSection } from '@/modules/Premium/sections/FormSection'
import { TalkToExpertPromptsModal } from './TalkToExpertPromptsModal'
import {
    TRIPBOARD_HEADER_BUTTON_PAGE,
    TALK_TO_EXPERT_BUTTON_NAMES
} from '@/constants/posthogEvents'

export interface TripboardHeaderTab {
    key: string
    label: string
    badge?: string
    hasDropdown?: boolean
    /** When true, shows a small lock icon before the label */
    isLocked?: boolean
    /** When true, shows a purple loading underline animation */
    isLoading?: boolean
}

export interface TripboardAssistantConfig<T extends AssistantType = AssistantType> {
    enabled: boolean
    ataId?: string
    tripId?: string
    assistantType?: T
    entityType?: string
    entityId?: string
    inputData?: AssistantInputDataMap[T]
}

export interface PublishedCollectionItem {
    id: string
    identifier: string
    name: string
    curation_status: string
    country_name: string
    created_at: string | null
}

export interface TripboardHeaderProps {
    tabs: TripboardHeaderTab[]
    activeTab: string | null
    onTabClick: (tabKey: string) => void
    tripId?: string
    collectionIdentifier?: string
    className?: string
    isOwner?: boolean
    assistantConfig?: TripboardAssistantConfig
    /** Fallback trip name shown when no activeTrip is available (e.g., during orchestration) */
    fallbackTripName?: string
    /** Flag icon URL shown next to fallbackTripName */
    fallbackFlagUrl?: string
    /** Hide the Preferences button (e.g., during create flow) */
    hidePreferences?: boolean
    /** Hide the Talk to Expert button (e.g., during create flow) */
    hideTalkToExpert?: boolean
    /** Read-only mode (non-member viewer). Hides Sync / Expert / Preferences and shows the owner's name instead. */
    isReadOnly?: boolean
    /** Name of the trip owner, shown as "Shared by {ownerName}" in read-only mode. */
    ownerName?: string
    hideTabSection?: boolean
    /**
     * When true and no `tabs` are available yet, render placeholder skeleton chips
     * in the tab bar instead of an empty row. Keeps the header visually stable
     * (logo + tab bar) while the section types resolve, so it doesn't pop from
     * "logo only" to "logo + tabs".
     */
    tabsLoading?: boolean
    /** Externally-controlled compression flag. When provided, the chrome
     *  uses this value instead of calling its own useHideOnScrollDown.
     *  Lets the parent share state with sibling components (e.g. the list
     *  container's padding-top compensation) so both transitions stay in
     *  perfect sync — no one-frame desync that would visibly push the list. */
    forceCompressed?: boolean
    /** Hide desktop assistant surfaces (header button + floating input). */
    hideDesktopAssistantUI?: boolean
    /** Hide the floating assistant input (e.g., when itinerary map view is active on mobile) */
    hideFloatingAssistant?: boolean
    publishConfig?: {
        isVisible: boolean
        isPublishing: boolean
        publishedCollections: PublishedCollectionItem[]
        onPublish: () => void
        onViewPublished: (countryName: string, identifier: string) => void
        onSyncToPublicCollection?: (ccIdentifier: string) => void
        syncingIdentifier?: string | null
    }
    /**
     * When set, sync UI uses this state instead of internal hooks so the parent can share
     * one pending/sync with tab-level CTAs (hooks still run with a disabled identifier).
     */
    tripboardSyncFromPage?: {
        canSync: boolean
        isPending: boolean
        sync: () => void
    }
    /**
     * Itinerary-tab-only actions — all wired from TripboardPage via the
     * callback-ref pattern so the underlying handlers (which manipulate
     * local state) can live inside Itinerary / ItineraryTabContent.
     *
     * - onRecreate: re-enter the generate-wizard flow for this itinerary.
     * - onShareItinerary: open the itinerary share modal (internal-only).
     *
     * When a callback is undefined, the corresponding menu row is hidden,
     * so TripboardPage controls visibility via the `isRimigoInternal` +
     * `activeTab` gates at the call site.
     */
    onRecreate?: () => void
    onShareItinerary?: () => void
    /**
     * Tripboard versioning — when enabled, exposes a "Version history" entry
     * in both desktop and mobile overflow menus that opens VersionsPanel.
     */
    versioningConfig?: {
        enabled: boolean
        /** Only Rimigo internal users can delete versions. */
        canDelete?: boolean
    }
    /**
     * PDF export — when provided, shows a "Download PDF" entry in both
     * overflow menus. The parent owns the actual generation logic (it
     * has the loaded itinerary + vouchers + trip context in scope); the
     * header just renders the trigger. Resolves when the download has
     * started so the header can show a loading state if needed.
     */
    onDownloadPDF?: () => Promise<void> | void
}

const TripboardHeader: React.FC<TripboardHeaderProps> = ({
    tabs,
    activeTab,
    onTabClick,
    tripId,
    collectionIdentifier,
    className,
    isOwner = true,
    assistantConfig = { enabled: false },
    fallbackTripName,
    fallbackFlagUrl,
    hidePreferences = false,
    hideTalkToExpert = false,
    hideTabSection = false,
    tabsLoading = false,
    forceCompressed,
    hideDesktopAssistantUI = false,
    hideFloatingAssistant = false,
    publishConfig,
    tripboardSyncFromPage,
    isReadOnly = false,
    ownerName,
    onRecreate,
    onShareItinerary,
    versioningConfig = { enabled: false },
    onDownloadPDF
}) => {
    const { isAuthenticated } = useAuth()
    const { user, isRimigoInternal, isPro, isPremium } = useUserInfo()
    const queryClient = useQueryClient()
    // The Payments drawer is exposed to every paying tier — Premium, Pro, and
    // internal Rimigo curators. Regular (free) travelers and logged-out viewers
    // don't see it; they still receive payment links via the share-out flow.
    const canSeePayments = isPremium || isPro || isRimigoInternal
    // PDF export is available to every viewer — the "Download PDF" entry shows
    // for all tiers (regular, Premium, Pro, internal) and shared-link viewers.
    const canDownloadPDF = true
    const [isPaymentsPanelOpen, setIsPaymentsPanelOpen] = useState(false)
    // PDF download in-flight state — used to disable the menu entry and
    // swap the icon for a spinner while react-pdf is building the file.
    const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
    const { trackButtonClickCustom, trackButtonClick } = usePostHog()
    const handleDownloadPDFClick = useCallback(async () => {
        if (!onDownloadPDF || isDownloadingPDF) return
        trackButtonClick({
            button_name: 'Download PDF',
            location: 'Tripboard Header',
            extra: {
                trip_id: tripId,
                collection_identifier: collectionIdentifier,
                is_authenticated: isAuthenticated,
                is_owner: isOwner,
                access_mode: isOwner ? 'owner' : 'invitee'
            }
        })
        setIsDownloadingPDF(true)
        try {
            await onDownloadPDF()
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to generate PDF', err)
        } finally {
            setIsDownloadingPDF(false)
        }
    }, [onDownloadPDF, isDownloadingPDF, trackButtonClick, tripId, collectionIdentifier, isAuthenticated, isOwner])
    // "Open on Rio" is an internal-curator escape hatch to jump straight to the
    // same trip inside our ops admin (Rio). The trip ID is the Mongo ObjectId,
    // which is what Rio routes by as well — no separate identifier translation.
    const rioTripUrl = tripId ? `https://rio.rimigo.com/trips/${tripId}` : null
    // Internal Rimigo staff curate other travelers' trips and aren't the
    // owner of the trip record, so any "owner-only" affordance that's
    // also valid for internal curators ORs both flags. Keep this local —
    // route-level pages should still gate on isRimigoInternal directly.
    const canActAsOwner = isOwner || isRimigoInternal
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const { countries } = useLocationPersonalization()
    const isMobile = useIsMobile()
    // Mobile-only chrome compression on scroll-down.
    //
    // - Trip-name row collapses height 56 → 0
    // - Collection tabs naturally glide up via document flow
    // - The list (in the scroll container below) naturally moves up with
    //   the chrome shrinking — this is the desired effect ("more list
    //   visible after I scroll"). No padding compensation, so there's no
    //   gap between the tabs and any tab's sticky sub-header.
    //
    // `forceCompressed` (passed from TripboardPage) ensures both sides
    // share the EXACT same state in the same React render batch, so the
    // chrome shrink and the list movement stay perfectly in lockstep —
    // no transient desync that would manifest as a push in any tab.
    const localHideMobileChrome = useHideOnScrollDown()
    const hideMobileChrome = forceCompressed ?? localHideMobileChrome
    const isMobileCompressed = isMobile && hideMobileChrome

    // The mobile member header renders its own hamburger inline (left slot,
    // same row as the WhatsApp + ⋯ buttons), so suppress the global floating
    // hamburger while this header is mounted to avoid a duplicate. Read-only
    // viewers keep the floating one (their header has no inline menu button).
    const { openSidebar, setHideHamburger } = useSidebarContext()
    useEffect(() => {
        if (!isMobile || isReadOnly) return
        setHideHamburger(true)
        return () => setHideHamburger(false)
    }, [isMobile, isReadOnly, setHideHamburger])
    const mobileChromeTransition: React.CSSProperties = {
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        transitionDuration: '500ms',
        transitionProperty: 'opacity'
    }
    const TRIP_NAME_ROW_HEIGHT = 56
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
    const moreMenuRef = useRef<HTMLDivElement>(null)

    const [isPublishDropdownOpen, setIsPublishDropdownOpen] = useState(false)
    const publishDropdownRef = useRef<HTMLDivElement>(null)

    // Desktop action bar overflow menu (the 3-dot dropdown that houses Sync,
    // Preferences, Share, Clone, Publish). Separate from `moreMenuRef` above
    // which is used for the mobile-only menu.
    const [isActionsOverflowOpen, setIsActionsOverflowOpen] = useState(false)
    const actionsOverflowRef = useRef<HTMLDivElement>(null)
    // Transient glow on an overflow-menu row ('invite' | 'share') — set when
    // the concierge fires an ``open_invite`` / ``open_share`` custom action so
    // the traveler is pointed at where that action lives, rather than dropping
    // a centered modal / copying silently.
    const [highlightedMenuItem, setHighlightedMenuItem] = useState<string | null>(null)
    const menuHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
    useEffect(() => () => {
        if (menuHighlightTimeoutRef.current) {
            clearTimeout(menuHighlightTimeoutRef.current)
        }
    }, [])
    const [isLeaveTripModalOpen, setIsLeaveTripModalOpen] = useState(false)
    const [isLeavingTrip, setIsLeavingTrip] = useState(false)
    // Hidden ShareInviteButton is rendered once and triggered programmatically
    // from the overflow menu's "Share" row when the non-internal flow applies.
    const shareInviteWrapperRef = useRef<HTMLDivElement>(null)

    // Trip dropdown data
    const tripsList = travelerTripsContext?.tripsData?.trips || []
    const tripFlagsMap = useTripFlagsMap(tripsList, countries)
    const [isTripDropdownOpen, setIsTripDropdownOpen] = useState(false)
    const tripDropdownRef = useRef<HTMLDivElement>(null)

    // Tripboard staleness detection + sync (disabled internally when parent lifts state)
    const syncHookIdentifier = tripboardSyncFromPage ? undefined : collectionIdentifier
    const staleness = useTripboardStaleness(syncHookIdentifier, 'traveler')
    const tripboardSync = useTripboardSync(syncHookIdentifier, 'traveler')

    // Read-only viewers (non-members / incognito) can't sync — they don't own the trip,
    // and the sync action mutates tripboard content. Hide the button entirely for them.
    const canShowTripboardSync = isReadOnly
        ? false
        : tripboardSyncFromPage
            ? tripboardSyncFromPage.canSync
            : staleness.hasItinerary &&
              (staleness.isStale || tripboardSync.isPending) &&
              !!collectionIdentifier
    const isTripboardSyncPending = tripboardSyncFromPage
        ? tripboardSyncFromPage.isPending
        : tripboardSync.isPending
    const runTripboardSync = tripboardSyncFromPage ? tripboardSyncFromPage.sync : tripboardSync.sync

    // Mark staleness as resolved after a successful sync (parent handles when lifted)
    useEffect(() => {
        if (tripboardSyncFromPage) return
        if (tripboardSync.isSuccess) {
            staleness.markSynced()
        }
    }, [tripboardSyncFromPage, tripboardSync.isSuccess, staleness.markSynced])

    // Mark staleness as resolved after a successful sync (parent handles when lifted)
    useEffect(() => {
        if (tripboardSyncFromPage) return
        if (tripboardSync.isSuccess) {
            staleness.markSynced()
        }
    }, [tripboardSyncFromPage, tripboardSync.isSuccess, staleness.markSynced])

    // Mark staleness as resolved after a successful sync
    useEffect(() => {
        if (tripboardSync.isSuccess) {
            staleness.markSynced()
        }
    }, [tripboardSync.isSuccess])

    // Invite modal state
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

    // Trip preferences modal state
    const [isTripPreferencesOpen, setIsTripPreferencesOpen] = useState(false)
    const [isEditTripNameOpen, setIsEditTripNameOpen] = useState(false)
    const [isTripCreationOpen, setIsTripCreationOpen] = useState(false)
    const [tripPreferencesAnchor, setTripPreferencesAnchor] = useState<DOMRect | null>(null)

    // Tripboard versioning — panel open state
    const [isVersionsPanelOpen, setIsVersionsPanelOpen] = useState(false)

    // Talk to Expert modal state
    const [isTalkToExpertPromptsOpen, setIsTalkToExpertPromptsOpen] = useState(false)
    const [isTalkToExpertFormOpen, setIsTalkToExpertFormOpen] = useState(false)

    const handleTalkToExpertClick = useCallback(() => {
        trackButtonClickCustom({
            buttonPage: TRIPBOARD_HEADER_BUTTON_PAGE,
            buttonName: TALK_TO_EXPERT_BUTTON_NAMES.OPEN,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                is_authenticated: isAuthenticated,
                trip_id: tripId ?? null
            }
        })
        if (isAuthenticated) {
            setIsTalkToExpertPromptsOpen(true)
        } else {
            setIsTalkToExpertFormOpen(true)
        }
    }, [isAuthenticated, tripId, trackButtonClickCustom])

    // Traveler details, pre-fetched so the mobile WhatsApp hand-off can fire the
    // lead-capture call synchronously (and open WhatsApp inside the tap gesture).
    const [tteTravelerId, setTteTravelerId] = useState<string | undefined>()
    const { travelerDetails: tteTravelerDetails } = useTravelerDetails(tteTravelerId)
    useEffect(() => {
        TokenStorage.getUserInfo()
            .then((info) => setTteTravelerId(info?.traveler_id))
            .catch(() => setTteTravelerId(undefined))
    }, [])

    // Mobile "Talk to expert": skip the modal and hand straight off to WhatsApp,
    // mirroring the in-assistant behavior (record the lead, open WhatsApp). The
    // hand-off runs synchronously so window.open stays inside the tap gesture.
    const handleTalkToExpertWhatsApp = useCallback(() => {
        trackButtonClickCustom({
            buttonPage: TRIPBOARD_HEADER_BUTTON_PAGE,
            buttonName: TALK_TO_EXPERT_BUTTON_NAMES.OPEN,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                is_authenticated: isAuthenticated,
                trip_id: tripId ?? null,
                channel: 'whatsapp'
            }
        })
        fireExpertWhatsAppHandoff({
            travelerDetails: tteTravelerDetails,
            subscriptionIntent: 'tripboard_callback'
        })
    }, [isAuthenticated, tripId, trackButtonClickCustom, tteTravelerDetails])

    // Clone tripboard modal state
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false)
    const [cloneUrl, setCloneUrl] = useState('')
    const [cloneStartDate, setCloneStartDate] = useState('')
    const [isCloning, setIsCloning] = useState(false)
    const [cloneSelectedTripId, setCloneSelectedTripId] = useState<string | null>(null)
    const [cloneTripSearch, setCloneTripSearch] = useState('')
    // 'current' = clone the tripboard the user is on; 'other' = paste a different URL.
    const [cloneSourceMode, setCloneSourceMode] = useState<'current' | 'other'>('current')

    // Default mode each time the modal opens: 'current' if we're on a tripboard, else 'other'.
    useEffect(() => {
        if (!isCloneModalOpen) return
        setCloneSourceMode(tripId ? 'current' : 'other')
    }, [isCloneModalOpen, tripId])

    // Keep cloneUrl in sync with the selected source mode.
    useEffect(() => {
        if (!isCloneModalOpen) return
        if (cloneSourceMode === 'current' && tripId && typeof window !== 'undefined') {
            setCloneUrl(`${window.location.origin}/tripboard/${tripId}`)
        } else if (cloneSourceMode === 'other') {
            setCloneUrl('')
        }
    }, [isCloneModalOpen, cloneSourceMode, tripId])

    const extractCloneInfo = (url: string): { identifier: string; collectionType: string } | null => {
        try {
            const parsed = new URL(url)
            const segments = parsed.pathname.split('/').filter(Boolean)
            if (segments.length >= 2 && segments[0] === 'rimigo-collection') {
                return { identifier: segments[segments.length - 1], collectionType: 'content_collection' }
            }
            if (segments.length >= 2 && segments[0] === 'traveler_collection') {
                return { identifier: segments[segments.length - 1], collectionType: 'traveler_collection' }
            }
            // /tripboard/<trip_id> — backend resolves the trip_id to the active traveler_collection.
            if (segments.length >= 2 && segments[0] === 'tripboard') {
                const last = segments[segments.length - 1]
                if (last === 'new' || last === 'create') return null
                return { identifier: last, collectionType: 'traveler_collection' }
            }
            return null
        } catch {
            return null
        }
    }

    const resetCloneModal = () => {
        setIsCloneModalOpen(false)
        setCloneUrl('')
        setCloneStartDate('')
        setCloneSelectedTripId(null)
        setCloneTripSearch('')
    }

    const handleCloneIntoTrip = async () => {
        const cloneInfo = extractCloneInfo(cloneUrl)
        if (!cloneInfo) {
            toast.error('Invalid URL. Paste a rimigo-collection or traveler_collection link.')
            return
        }
        if (!cloneStartDate) {
            toast.error('Please select a start date.')
            return
        }
        const targetTripId = cloneSelectedTripId || travelerTripsContext?.activeTripId
        if (!targetTripId) {
            toast.error('Please select a trip.')
            return
        }
        setIsCloning(true)
        try {
            const userInfo = await TokenStorage.getUserInfo()
            if (!userInfo?.traveler_id) {
                throw new Error('Unable to get user information')
            }
            await cloneTripboard(cloneInfo.identifier, {
                traveler_id: userInfo.traveler_id,
                collection_type: cloneInfo.collectionType,
                trip_id: targetTripId,
                start_date: cloneStartDate
            })
            // Set the selected trip as active
            if (travelerTripsContext?.updateActiveTrip) {
                await travelerTripsContext.updateActiveTrip(targetTripId, { force: true, replaceOnly: true })
            }
            toast.success('Tripboard cloned successfully!')
            resetCloneModal()
            // Navigate to the trip we cloned into — bare `/tripboard` would rely on the
            // active-trip redirect, which is racy right after the API call. Going straight
            // to `/tripboard/<targetTripId>` puts the cloned trip in the URL deterministically.
            window.location.href = `/tripboard/${targetTripId}?tab=${POST_CREATE_DEFAULT_TAB}`
        } catch (error) {
            console.error('Clone failed:', error)
            toast.error('Failed to clone tripboard. Please check the URL and try again.')
        } finally {
            setIsCloning(false)
        }
    }

    // ── Assistant state ──────────────────────────────────────────────
    const hasAssistantWindowConfig = Boolean(
        assistantConfig.enabled &&
        assistantConfig.ataId &&
        assistantConfig.assistantType &&
        assistantConfig.entityType &&
        assistantConfig.entityId &&
        assistantConfig.inputData
    )

    // Pre-warm the AI assistant's threads + first-thread interactions
    // so when the user clicks "View chat" the lazy-mounted window
    // already has its content cached. Removes the open-then-spinner
    // delay AND the "empty initial-content → conversation" layout
    // swap. No-op until the config is available.
    useAssistantPrefetch({
        enabled: hasAssistantWindowConfig,
        ataId: assistantConfig.ataId,
        tripId: assistantConfig.tripId,
        entityId: assistantConfig.entityId,
        entityType: assistantConfig.entityType,
    })

    // Pure cache read of prefetched threads (drives "View chat" affordance).
    const threadsCacheQuery = useQuery({
        queryKey: hasAssistantWindowConfig
            ? ataThreadsQueryKey(
                  assistantConfig.ataId as string,
                  assistantConfig.entityId,
                  assistantConfig.entityType,
                  assistantConfig.tripId,
              )
            : ['ata', 'threads', 'noop'],
        queryFn: () => null,
        enabled: false,
    })
    const hasExistingThread = Boolean(
        (threadsCacheQuery.data as any)?.data?.data?.length,
    )

    const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)
    const [showFloatingAssistantWand, setShowFloatingAssistantWand] = useState(false)
    const [showFloatingAssistantInput, setShowFloatingAssistantInput] = useState(false)
    const [showFloatingAssistantPlaceholder, setShowFloatingAssistantPlaceholder] = useState(false)
    const [isFloatingAssistantClosing, setIsFloatingAssistantClosing] = useState(false)
    const [floatingPlaceholderIndex, setFloatingPlaceholderIndex] = useState(0)

    const handleOpenAssistant = useCallback(() => {
        if (!hasAssistantWindowConfig) return
        if (!isAuthenticated) {
            const newSearchParams = new URLSearchParams(searchParams)
            newSearchParams.set('isAssistantOpen', 'true')
            const redirectUrl = `${location.pathname}?${newSearchParams.toString()}`
            navigate(`/login?redirectTo=${encodeURIComponent(redirectUrl)}`)
            return
        }
        setIsAIAssistantOpen(true)
    }, [hasAssistantWindowConfig, isAuthenticated, location.pathname, navigate, searchParams])

    const handleCloseAssistant = useCallback(() => {
        setIsAIAssistantOpen(false)
    }, [])

    const handleToggleAssistant = useCallback(() => {
        if (isAIAssistantOpen) {
            handleCloseAssistant()
        } else {
            handleOpenAssistant()
        }
    }, [isAIAssistantOpen, handleOpenAssistant, handleCloseAssistant])

    // Register assistant opener/closer for external control.
    useEffect(() => {
        if (!hasAssistantWindowConfig) return
        registerAssistantOpener(handleOpenAssistant)
        registerAssistantCloser(handleCloseAssistant)
        return () => {
            unregisterAssistantOpener(handleOpenAssistant)
            unregisterAssistantCloser(handleCloseAssistant)
        }
    }, [hasAssistantWindowConfig, handleOpenAssistant, handleCloseAssistant])

    // Listen for voice delegation — open expert and send prompt
    useEffect(() => {
        const handler = async (e: Event) => {
            const { prompt } = (e as CustomEvent).detail || {}
            if (!prompt) return
            if (!hasAssistantWindowConfig) {
                toast.error('Expert is not available yet. Please try again.')
                return
            }

            await new Promise((r) => setTimeout(r, 1200))
            await triggerAssistantPrompt(prompt, { source: 'voice_delegation' })
        }
        window.addEventListener('voice:delegate-to-expert', handler)
        return () => window.removeEventListener('voice:delegate-to-expert', handler)
    }, [hasAssistantWindowConfig])

    // Listen for voice UI navigation (tab switches + modal opens)
    useEffect(() => {
        const handler = (e: Event) => {
            const { action, target } = (e as CustomEvent).detail || {}
            if (!action || !target) return

            // Voice target → tripboard section_type. Visa/SIM/tips are all
            // collapsed into the single "must_have" tab; there is no longer
            // an overview tab. Budget is its own tab.
            const tabMap: Record<string, string> = {
                itinerary: 'itinerary',
                stays: 'stays',
                stay: 'stays',
                activities: 'experience',
                activity: 'experience',
                experiences: 'experience',
                experience: 'experience',
                food: 'restaurant',
                restaurant: 'restaurant',
                restaurants: 'restaurant',
                must_have: 'must_have',
                visa: 'must_have',
                sim: 'must_have',
                tips: 'must_have',
                flights: 'flights',
                flight: 'flights',
                budget: 'budget',
                vouchers: 'vouchers',
                voucher: 'vouchers',
            }

            switch (action) {
                case 'switch_tab': {
                    const tabKey = tabMap[target.toLowerCase()] || target
                    onTabClick(tabKey)
                    break
                }
                case 'highlight': {
                    // Open the overflow menu and glow the relevant row so the
                    // traveler sees where the action lives. Supports ``invite``
                    // and ``share`` — opens both the desktop actions-overflow
                    // and the mobile more-menu (only the rendered one shows)
                    // and pulses the matching row for a few seconds.
                    const t = target.toLowerCase()
                    if (t === 'invite' || t === 'share') {
                        setIsActionsOverflowOpen(true)
                        setIsMoreMenuOpen(true)
                        setHighlightedMenuItem(t)
                        if (menuHighlightTimeoutRef.current) {
                            clearTimeout(menuHighlightTimeoutRef.current)
                        }
                        menuHighlightTimeoutRef.current = setTimeout(
                            () => setHighlightedMenuItem(null),
                            4500,
                        )
                    }
                    break
                }
                case 'open_modal': {
                    // Anchor for popovers when the voice agent (not a click) opens them.
                    const centerAnchor = new DOMRect(window.innerWidth / 2, 80, 0, 0)
                    switch (target) {
                        case 'preferences':
                            if (activeTrip) {
                                setTripPreferencesAnchor(centerAnchor)
                                setIsTripPreferencesOpen(true)
                            } else {
                                setIsTripCreationOpen(true)
                            }
                            break
                        case 'share': {
                            // Mirror handleShareClick — copy the tripboard link.
                            if (tripId && typeof window !== 'undefined') {
                                const shareUrl = `${window.location.origin}/tripboard/${tripId}`
                                navigator.clipboard?.writeText(shareUrl)
                                    .then(() => toast.success('Link copied to clipboard'))
                                    .catch(() => toast.error('Failed to copy link'))
                            }
                            break
                        }
                        case 'invite':
                            setInviteAnchorRect(centerAnchor)
                            setIsInviteModalOpen(true)
                            break
                        case 'version_history':
                        case 'versions':
                        case 'version':
                            // Panel is only mounted when versioning is enabled —
                            // setting state otherwise is a harmless no-op.
                            setIsVersionsPanelOpen(true)
                            break
                        case 'payments':
                            setIsPaymentsPanelOpen(true)
                            break
                        case 'clone':
                            setIsCloneModalOpen(true)
                            break
                        case 'recreate':
                            onRecreate?.()
                            break
                        case 'edit_name':
                        case 'rename':
                            setTripPreferencesAnchor(centerAnchor)
                            setIsEditTripNameOpen(true)
                            break
                        case 'sync':
                        case 'update':
                            runTripboardSync()
                            break
                        default:
                            break
                    }
                    break
                }
                case 'close_modal': {
                    // Mirror of open_modal — lets the voice agent dismiss a
                    // panel/modal/window it (or the user) opened. 'all' closes
                    // everything that could be open.
                    const t = target.toLowerCase()
                    const closeExpert = () => setIsAIAssistantOpen(false)
                    const closeVersions = () => setIsVersionsPanelOpen(false)
                    const closePayments = () => setIsPaymentsPanelOpen(false)
                    const closeClone = () => setIsCloneModalOpen(false)
                    const closePreferences = () => {
                        setIsTripPreferencesOpen(false)
                        setIsTripCreationOpen(false)
                    }
                    const closeEditName = () => setIsEditTripNameOpen(false)
                    const closeInvite = () => setIsInviteModalOpen(false)
                    switch (t) {
                        case 'expert':
                        case 'chat':
                        case 'assistant':
                            closeExpert()
                            break
                        case 'version_history':
                        case 'versions':
                        case 'version':
                            closeVersions()
                            break
                        case 'payments':
                            closePayments()
                            break
                        case 'clone':
                            closeClone()
                            break
                        case 'preferences':
                            closePreferences()
                            break
                        case 'edit_name':
                        case 'rename':
                            closeEditName()
                            break
                        case 'invite':
                            closeInvite()
                            break
                        case 'all':
                            closeExpert()
                            closeVersions()
                            closePayments()
                            closeClone()
                            closePreferences()
                            closeEditName()
                            closeInvite()
                            break
                        default:
                            break
                    }
                    break
                }
                default:
                    break
            }
        }
        window.addEventListener('voice:navigate-ui', handler)
        return () => window.removeEventListener('voice:navigate-ui', handler)
    }, [activeTrip, onTabClick, onRecreate, runTripboardSync])

    // Sync assistant open state from URL query param on mount
    useEffect(() => {
        const isAssistantOpenFromQuery = searchParams.get('isAssistantOpen') === 'true'
        if (isAssistantOpenFromQuery && hasAssistantWindowConfig && isAuthenticated) {
            setIsAIAssistantOpen(true)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Lock page scroll when assistant window is open
    useEffect(() => {
        if (isAIAssistantOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isAIAssistantOpen])

    // Stage floating assistant UX: short delay, wand first, then side pill.
    useEffect(() => {
        if (!hasAssistantWindowConfig || isAIAssistantOpen || hideFloatingAssistant) {
            setShowFloatingAssistantWand(false)
            setShowFloatingAssistantInput(false)
            setShowFloatingAssistantPlaceholder(false)
            setIsFloatingAssistantClosing(false)
            return
        }
        const wandDelay = 300 + Math.floor(Math.random() * 200)
        const wandTimeoutId = window.setTimeout(() => {
            setShowFloatingAssistantWand(true)
        }, wandDelay)
        const inputTimeoutId = window.setTimeout(() => {
            setShowFloatingAssistantInput(true)
        }, wandDelay + 420)
        const placeholderTimeoutId = window.setTimeout(() => {
            setShowFloatingAssistantPlaceholder(true)
        }, wandDelay + 900)

        return () => {
            window.clearTimeout(wandTimeoutId)
            window.clearTimeout(inputTimeoutId)
            window.clearTimeout(placeholderTimeoutId)
        }
    }, [hasAssistantWindowConfig, hideFloatingAssistant, isAIAssistantOpen])

    const floatingAssistantContainerClass = isMobile
        ? 'fixed bottom-6 right-6 z-[60] pointer-events-none'
        : 'fixed bottom-12 left-1/2 -translate-x-1/2 md:left-auto md:right-12 md:translate-x-0 z-[60] w-[min(620px,calc(100%-28px))] md:w-[min(500px,36%)] pointer-events-none'
    const floatingAssistantPlaceholders = [
        'Best things to do today',
        'Where should we eat nearby?',
        'Plan my evening itinerary'
    ]

    useEffect(() => {
        if (!showFloatingAssistantInput || isAIAssistantOpen || !showFloatingAssistantPlaceholder) return
        const intervalMs = 3200
        const intervalId = window.setInterval(() => {
            setFloatingPlaceholderIndex((idx) => {
                if (idx >= floatingAssistantPlaceholders.length - 1) {
                    window.setTimeout(() => {
                        setIsFloatingAssistantClosing(true)
                        setShowFloatingAssistantInput(false)
                        setShowFloatingAssistantPlaceholder(false)
                        window.setTimeout(() => {
                            setFloatingPlaceholderIndex(0)
                            setIsFloatingAssistantClosing(false)
                        }, 650)
                    }, 350)
                    return idx
                }
                return idx + 1
            })
        }, intervalMs)
        return () => {
            window.clearInterval(intervalId)
        }
    }, [isAIAssistantOpen, showFloatingAssistantInput, showFloatingAssistantPlaceholder, floatingAssistantPlaceholders.length])

    // Tab underline animation
    const containerRef = useRef<HTMLDivElement>(null)
    const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
    const [underlineStyle, setUnderlineStyle] = useState<{ left: number; width: number } | null>(null)

    const updateUnderline = useCallback(() => {
        if (!activeTab || !containerRef.current) return
        const tabEl = tabRefs.current.get(activeTab)
        if (!tabEl) return
        const containerRect = containerRef.current.getBoundingClientRect()
        const tabRect = tabEl.getBoundingClientRect()
        setUnderlineStyle({
            left: tabRect.left - containerRect.left + containerRef.current.scrollLeft,
            width: tabRect.width
        })
    }, [activeTab])

    // Re-run underline positioning when activeTab or tabs change (tabs may load async)
    // Use ResizeObserver to reliably detect when tab container finishes layout
    useEffect(() => {
        updateUnderline()

        // Also observe the container for layout changes (e.g. first render after trip switch)
        if (!containerRef.current) return
        const observer = new ResizeObserver(() => {
            updateUnderline()
        })
        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [updateUnderline, tabs])

    // Close trip dropdown when clicking outside
    useEffect(() => {
        if (!isTripDropdownOpen) return
        const handleClickOutside = (event: MouseEvent) => {
            if (tripDropdownRef.current && !tripDropdownRef.current.contains(event.target as Node)) {
                setIsTripDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isTripDropdownOpen])

    useEffect(() => {
    if (!isMoreMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setIsMoreMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isMoreMenuOpen])

    useEffect(() => {
        if (!isPublishDropdownOpen) return
        const handleClickOutside = (event: MouseEvent) => {
            if (publishDropdownRef.current && !publishDropdownRef.current.contains(event.target as Node)) {
                setIsPublishDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isPublishDropdownOpen])

    // Close the desktop actions overflow menu on outside click / Escape.
    useEffect(() => {
        if (!isActionsOverflowOpen) return
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsOverflowRef.current && !actionsOverflowRef.current.contains(event.target as Node)) {
                setIsActionsOverflowOpen(false)
                // Also collapse the nested publish dropdown if it was left open
                setIsPublishDropdownOpen(false)
            }
        }
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsActionsOverflowOpen(false)
                setIsPublishDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKey)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKey)
        }
    }, [isActionsOverflowOpen])

    const handleTabClick = (tabKey: string) => {
        onTabClick(tabKey)
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
            buttonName: POSTHOG_EVENTS.COLLECTION_TAB_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { tabName: tabKey }
        })
    }

    const [inviteAnchorRect, setInviteAnchorRect] = useState<DOMRect | null>(null)

    const handleInviteClick = (rect: DOMRect | null) => {
        setInviteAnchorRect(rect)
        setIsInviteModalOpen(true)
    }

    const isInvitedTrip = activeTrip?.role === 'invited' || activeTrip?.role === 'co_traveler'
    const invitedByName = activeTrip?.owner?.name?.trim() || null
    const canLeaveTrip = isRimigoInternal && isInvitedTrip && !isOwner && !!tripId

    // ── Voice assistant ───────────────────────────────────────────────────
    // Voice is folded into the FloatingAssistantChip. The session lives here
    // (parent of the chip); the chip is presentation-only. Gated to Rimigo
    // internal users for now via `voiceEnabled` on the chip below.
    const handleVoiceSlotChanged = useCallback((slotId: string) => {
        window.dispatchEvent(new CustomEvent('voice:slot-changed', { detail: { slotId } }))
    }, [])
    const { handleFunctionExecuted: handleVoiceFunctionExecuted } = useVoiceFunctionCalls({
        tripId: tripId || '',
        onSlotChanged: handleVoiceSlotChanged,
    })
    const {
        voiceState,
        transcript: voiceTranscript,
        currentTranscript: voiceCurrentTranscript,
        startSession: startVoiceSession,
        stopSession: stopVoiceSession,
    } = useVoiceChat({
        tripId: tripId || '',
        onFunctionExecuted: handleVoiceFunctionExecuted,
        onError: (err) => toast.error(err),
    })
    // Latest line only — assistant speech in progress, else the last finished turn.
    const voiceCaption =
        voiceCurrentTranscript || voiceTranscript[voiceTranscript.length - 1]?.text || ''

    const handleLeaveTrip = useCallback(async () => {
        if (!tripId || isLeavingTrip) return
        setIsLeavingTrip(true)
        try {
            await leaveTrip(tripId)
            toast.success('You have left the trip')
            setIsLeaveTripModalOpen(false)
            if (user?.id) {
                await queryClient.invalidateQueries({ queryKey: ['travelerTrips', user.id] })
            }
            navigate(DEFAULT_LANDING_PAGE_ROUTE)
        } catch (error: any) {
            toast.error(error?.message || 'Failed to leave trip')
        } finally {
            setIsLeavingTrip(false)
        }
    }, [tripId, isLeavingTrip, navigate, queryClient, user?.id])
    const activeTripDisplayName = activeTrip?.name?.split("'s ")?.[1] || activeTrip?.name || 'My Trip'

    const shouldShowFloatingAssistant = hasAssistantWindowConfig &&
        !isAIAssistantOpen &&
        !hideFloatingAssistant &&
        !(hideDesktopAssistantUI && !isMobile) &&
        (isAuthenticated || !isMobile)

    // One-shot post-create signal from the tripboard creation flow: read-and-
    // remove the sessionStorage flag set right before the full-page redirect.
    // When present, force the floating chip to auto-pop on this mount.
    const [forceAssistantExpand] = useState(() => {
        try {
            if (sessionStorage.getItem(POST_CREATE_EXPAND_ASSISTANT_KEY) === '1') {
                sessionStorage.removeItem(POST_CREATE_EXPAND_ASSISTANT_KEY)
                return true
            }
        } catch { /* non-fatal */ }
        return false
    })


    const floatingAssistantNode = shouldShowFloatingAssistant ? (
        <FloatingAssistantChip
            isMobile={isMobile}
            collapsed={isMobileCompressed}
            showWand={showFloatingAssistantWand}
            showInput={showFloatingAssistantInput}
            showPlaceholder={showFloatingAssistantPlaceholder}
            isClosing={isFloatingAssistantClosing}
            currentPlaceholder={`"${floatingAssistantPlaceholders[floatingPlaceholderIndex]}"`}
            placeholderIndex={floatingPlaceholderIndex}
            onClick={handleToggleAssistant}
            onSubmit={(q, attachmentIds, attachmentsSummary) => {
                const meta: Record<string, unknown> = {}
                if (attachmentIds?.length) meta.attachment_ids = attachmentIds
                if (attachmentsSummary?.length) meta.attachments_summary = attachmentsSummary
                void triggerAssistantPrompt(q, Object.keys(meta).length ? meta : undefined)
            }}
            tripId={activeTrip?.trip_id ?? null}
            hasExistingThread={hasExistingThread}
            suggestions={SUGGESTIONS_ITINERARY}
            heading={HEADING_ITINERARY}
            forceExpandOnMount={forceAssistantExpand}
            trackButtonClick={trackButtonClick}
            ariaLabel="Open trip expert assistant"
            className={floatingAssistantContainerClass}
            voiceEnabled={isRimigoInternal && !!tripId}
            voiceState={voiceState}
            voiceCaption={voiceCaption}
            onStartVoice={startVoiceSession}
            onStopVoice={stopVoiceSession}
        />
    ) : null

    // ── Read-only viewers (incognito OR logged-in non-member) ─────────────────────
    // Render a minimal header that mirrors the `/rimigo-collection` detail pages:
    //   Row 1: Rimigo logo (left) | Tripboard name (centered) | Share + Login (right)
    //   Row 2: Tabs scrollable with animated underline.
    // The member render below is intentionally untouched — this branch ONLY fires
    // when the viewer is NOT the owner and NOT an invitee of the current tripboard.
    // (A logged-in user who is a member takes the normal render path.)
    const leaveTripModalNode = (
        <LeaveTripModal
            isOpen={isLeaveTripModalOpen}
            isLeaving={isLeavingTrip}
            tripName={activeTrip ? formatCapitalizeFirstLetter(activeTrip) : null}
            onCancel={() => setIsLeaveTripModalOpen(false)}
            onConfirm={handleLeaveTrip}
        />
    )

    // Placeholder tab chips shown while the real tabs resolve. Approximates the
    // width of the eventual labels so the bar doesn't visibly reflow when they
    // arrive. Only rendered when `tabsLoading` is set and no tabs exist yet.
    const showTabSkeletons = tabsLoading && tabs.length === 0
    const renderTabSkeletons = () =>
        [84, 56, 96, 72, 78, 52, 104].map((w, i) => (
            <div key={`tab-skeleton-${i}`} className="px-2 pb-4 pt-3 flex-shrink-0">
                <div className="h-5 rounded-md bg-grey-4 animate-pulse" style={{ width: w }} />
            </div>
        ))
    if (isReadOnly) {
        return (
            <>
                <div
                    className={cn(
                        'sticky top-0 z-70 border-b border-feature-card-border bg-natural-white w-full animate-header-slide-in',
                        className
                    )}
                >
                    <div className="w-full">
                        {/* Row 1: Logo | Name | Actions */}
                        <div className="flex items-center justify-between h-[64px] md:h-[72px] px-4 md:px-6 gap-3">
                            <div className="flex-shrink-0">
                                <img
                                    src="/icons/logo-transparent-indigo.png"
                                    alt="Rimigo"
                                    className="h-7 md:h-8 w-auto cursor-pointer"
                                    onClick={() => navigate('/')}
                                />
                            </div>

                            <div className="flex-1 flex justify-center items-center min-w-0 px-2">
                                {ownerName ? (
                                    <span
                                        className="font-red-hat-display text-[15px] md:text-[18px] font-semibold text-grey-0 truncate max-w-[180px] md:max-w-[360px]"
                                        title={ownerName}
                                    >
                                        {ownerName}
                                    </span>
                                ) : fallbackTripName ? (
                                    <span className="font-red-hat-display text-[15px] md:text-[18px] font-semibold text-grey-0 truncate max-w-[180px] md:max-w-[360px]">
                                        {fallbackTripName}
                                    </span>
                                ) : null}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                <ShareInviteButton
                                    shareLink={
                                        tripId && typeof window !== 'undefined'
                                            ? `${window.location.origin}/tripboard/${tripId}`
                                            : undefined
                                    }
                                    location="Tripboard Header (Read-only)"
                                    trackingData={{
                                        trip_id: tripId,
                                        collection_identifier: collectionIdentifier,
                                        is_authenticated: isAuthenticated,
                                        access_mode: 'read_only',
                                        viewport: isMobile ? 'mobile' : 'desktop'
                                    }}
                                />
                                {/* Login button only for truly logged-out viewers — logged-in
                                    non-members already have a session, so no Login prompt. */}
                                {!isAuthenticated && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const redirectUrl = `${location.pathname}${location.search}`
                                            navigate(`/login?redirectTo=${encodeURIComponent(redirectUrl)}`)
                                        }}
                                        className="flex items-center px-3 md:px-4 h-9 md:h-10 rounded-lg md:rounded-xl text-white text-sm font-semibold cursor-pointer"
                                        style={{
                                            background:
                                                'linear-gradient(90deg, var(--primary-indigo, #7011F6) 0%, var(--primary-dark, #4D1D91) 100%)'
                                        }}
                                    >
                                        Login
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Tabs */}
                        {!hideTabSection && (
                            <div className="border-t border-feature-card-border overflow-x-auto overflow-y-hidden scrollbar-hide">
                                <div
                                    ref={containerRef}
                                    className="relative flex items-end justify-center gap-1 md:gap-4 min-w-max px-4"
                                >
                                    {showTabSkeletons && renderTabSkeletons()}
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.key}
                                            ref={(el) => {
                                                if (el) tabRefs.current.set(tab.key, el)
                                                else tabRefs.current.delete(tab.key)
                                            }}
                                            type="button"
                                            onClick={() => handleTabClick(tab.key)}
                                            className={cn(
                                                'px-2 pb-3 md:pb-4 pt-3 font-manrope text-[14px] leading-[18px] tracking-[-0.56px] transition-colors whitespace-nowrap flex-shrink-0 flex items-center gap-1 cursor-pointer relative',
                                                activeTab === tab.key ? 'text-primary-default' : 'text-grey-2 hover:text-grey-0'
                                            )}
                                            style={{
                                                fontWeight: activeTab === tab.key ? 700 : 600
                                            }}
                                        >
                                            {tab.isLocked && <img src={LOCK_ICON} alt="" className="w-4 h-4 shrink-0" />}
                                            {tab.isLoading && tab.key === 'itinerary' && (
                                                <img
                                                    src="https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/logos/compass_logo/compass_logo_purple_transparent.png"
                                                    alt=""
                                                    className="w-4 h-4 shrink-0 animate-compass"
                                                />
                                            )}
                                            {tab.label}
                                            {tab.badge && <span className="text-inherit">{tab.badge}</span>}
                                            {tab.hasDropdown && <ChevronDown className="w-3.5 h-3.5" />}
                                        </button>
                                    ))}
                                    {underlineStyle && (
                                        <motion.div
                                            className="absolute bottom-0 h-[3px] bg-primary-default rounded-full"
                                            animate={{ left: underlineStyle.left, width: underlineStyle.width }}
                                            transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </>
        )
    }

    if(isMobile){
            return (
                <>
                    <div className="sticky top-0 z-70 border-b border-feature-card-border bg-natural-white w-full animate-header-slide-in">
                        <div className="w-full pt-3">
                            <div
                                style={{
                                    // Use transform + negative margin instead of
                                    // height/overflow:hidden so the trip switcher
                                    // dropdown and the three-dot menu (which
                                    // extend BELOW the row) aren't clipped by
                                    // the animating wrapper. Visual effect is
                                    // the same — row slides up off-screen and
                                    // the tabs are pulled up by the negative
                                    // margin — but children can render freely.
                                    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                                    transitionDuration: '500ms',
                                    transitionProperty: 'transform, margin-bottom, opacity',
                                    transform: isMobileCompressed
                                        ? `translateY(-${TRIP_NAME_ROW_HEIGHT}px)`
                                        : 'translateY(0)',
                                    marginBottom: isMobileCompressed
                                        ? `-${TRIP_NAME_ROW_HEIGHT}px`
                                        : '0px',
                                    opacity: isMobile ? (isMobileCompressed ? 0 : 1) : 1
                                }}
                                // `will-change-transform` makes this wrapper a stacking
                                // context, so the trip-switcher dropdown inside it (even
                                // `fixed z-[100]`) is trapped below the sibling tabs row
                                // (z-60). While the dropdown is open, lift the whole
                                // wrapper above the tabs so the dropdown paints on top.
                                className={cn('will-change-transform', isTripDropdownOpen && 'relative z-[80]')}>
                            <div className="flex items-center justify-between h-[56px] pr-3">

                                {!isAuthenticated ? (
                                    <div className="flex items-center px-3">
                                        <img src="/icons/logo-transparent-indigo.png" alt="Rimigo" className="h-7 w-auto" />
                                    </div>
                                ) : (
                                    /* Left slot holds the inline hamburger. Fixed 88px width
                                       mirrors the right icon cluster so the centered trip
                                       switcher stays visually centered and never drifts as
                                       the right icons fade. */
                                    <div className="w-[88px] shrink-0 flex items-center pl-3">
                                        <button
                                            type="button"
                                            onClick={openSidebar}
                                            aria-label="Open menu"
                                            className="flex items-center justify-center w-10 h-10 rounded-full bg-white hover:bg-grey-5 transition-colors cursor-pointer">
                                            <Menu className="w-5 h-5 text-grey-1" />
                                        </button>
                                    </div>
                                )}

                                {/* Center: Trip Info (Mobile) */}
                                <div className="flex-1 flex justify-center relative" ref={tripDropdownRef}>
                                    {/* Fallback trip name during orchestration — takes priority over activeTrip */}
                                    {fallbackTripName && (
                                        <button
                                            type="button"
                                            onClick={() => setIsTripDropdownOpen(!isTripDropdownOpen)}
                                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-grey-5 transition-colors cursor-pointer rounded-lg"
                                        >
                                            <img src={fallbackFlagUrl || BEACH_TREE} alt="destination" className="w-6 h-6 rounded-full object-cover" />
                                            <span className="font-red-hat-display text-[14px] font-semibold text-grey-0">
                                                {fallbackTripName}
                                            </span>
                                            {isTripDropdownOpen ? (
                                                <ChevronUp className="w-4 h-4 text-grey-2 shrink-0" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-grey-2 shrink-0" />
                                            )}
                                        </button>
                                    )}
                                    {!fallbackTripName && activeTrip && isAuthenticated && (
                                    <button
                                        type="button"
                                        onClick={() => setIsTripDropdownOpen(!isTripDropdownOpen)}
                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-grey-5 transition-colors cursor-pointer rounded-lg"
                                    >
                                        {/* Flags */}
                                        <div className="flex items-center -space-x-1 shrink-0">
                                        {tripFlagsMap?.[activeTrip.trip_id]?.flags?.length ? (
                                            tripFlagsMap[activeTrip.trip_id].flags.slice(0, 2).map((flagUrl: string, i: number) => (
                                            <img
                                                key={i}
                                                src={flagUrl}
                                                alt="flag"
                                                className="w-6 h-6 rounded-full object-cover border border-white"
                                                style={{ zIndex: tripFlagsMap[activeTrip.trip_id].flags.length - i }}
                                            />
                                            ))
                                        ) : (
                                            <img
                                            src={BEACH_TREE}
                                            alt="destination"
                                            className="w-6 h-6 rounded-full object-cover"
                                            />
                                        )}
                                        </div>

                                        {/* Text + Chevron */}
                                        <div className="flex flex-col items-start gap-1 leading-tight">
                                        {isInvitedTrip && invitedByName && (
                                            <div className="flex items-center gap-1">
                                                <span className="rounded-full bg-primary-default-08 text-primary-default text-[9px] font-semibold px-1.5 py-[1px] leading-none">
                                                    Invited Trip
                                                </span>
                                                <span className="font-red-hat-display text-[10px] font-[550] text-grey-2">
                                                    {invitedByName}
                                                </span>
                                            </div>
                                        )}
                                        {/* Top row: Name + Chevron */}
                                        <div className="flex items-center gap-2">
                                            <span className="font-red-hat-display text-[14px] font-semibold text-grey-0">
                                            {activeTripDisplayName}
                                            </span>

                                            {isTripDropdownOpen ? (
                                            <ChevronUp className="w-4 h-4 text-grey-2" />
                                            ) : (
                                            <ChevronDown className="w-4 h-4 text-grey-2" />
                                            )}
                                        </div>

                                        {/* Bottom row: Date */}
                                        {/* {(activeTrip?.tripProfile?.preferred_travel_time?.startDate || activeTrip?.preferred_travel_time?.startDate) && (
                                            <span className="font-red-hat-display text-[10px] font-[550] text-grey-2">
                                                {formatActiveTripDateRange(activeTrip)}
                                            </span>
                                        )} */}
                                        </div>
                                    </button>
                                    )}
                                    {/* Trip Dropdown */}
                                    {isTripDropdownOpen && (
                                        <TripDropdown
                                            tripsList={tripsList}
                                            tripFlagsMap={tripFlagsMap}
                                            activeTripId={travelerTripsContext?.activeTripId}
                                            onSelectTrip={(selectedTripId) => {
                                                travelerTripsContext?.updateActiveTrip?.(selectedTripId)
                                                setIsTripDropdownOpen(false)
                                                navigate(`/tripboard/${selectedTripId}`)
                                            }}
                                            onCreateTrip={() => {
                                                trackButtonClickCustom?.({
                                                    buttonPage: 'header_trip_selector',
                                                    buttonName: 'create_new_trip',
                                                    buttonAction: 'click'
                                                })
                                                navigate('/tripboard/new?create=true')
                                            }}
                                            // Mobile: use `fixed` (not `absolute`) so the dropdown
                                            // escapes the trip-name wrapper's stacking context
                                            // (`will-change-transform` + animated transform on the
                                            // wrapper silently creates a new context, trapping the
                                            // previously-used z-80 below the sibling tabs row).
                                            // `top-[52px]` lands it just under the trip-name row on
                                            // the (compressible) mobile header.
                                            // `z-[100]` clears every sticky header on the page.
                                            containerClassName="
                                                fixed top-[52px] left-1/2 -translate-x-1/2 w-65 z-[100] rounded-xl border border-grey-4 bg-white shadow-lg scrollbar-hide
                                            "
                                            buttonClassName={(isActive) =>
                                                `w-full text-left px-2 py-2 text-[13px] font-medium font-manrope text-grey-0 hover:bg-grey-5 flex items-center gap-1 border-b border-grey-4
                                                ${isActive ? 'bg-primary-default-08 font-semibold' : ''}`
                                            }
                                        />
                                    )}
                                </div>
    
                                {/* Right: Login (logged out) or More Menu (logged in) */}
                                {!isAuthenticated ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const redirectUrl = `${location.pathname}${location.search}`
                                            navigate(`/login?redirectTo=${encodeURIComponent(redirectUrl)}`)
                                        }}
                                        className="flex items-center px-3 py-1.5 rounded-lg text-white text-sm font-semibold cursor-pointer"
                                        style={{
                                            background: 'linear-gradient(90deg, var(--primary-indigo, #7011F6) 0%, var(--primary-dark, #4D1D91) 100%)'
                                        }}>
                                        Login
                                    </button>
                                ) : (
                                <div
                                    style={mobileChromeTransition}
                                    className={cn(
                                        'flex items-center gap-2 shrink-0 will-change-[opacity]',
                                        // Opacity-only fade — width stays constant so
                                        // the trip name (centered) doesn't drift, and
                                        // the document flow doesn't reflow when icons
                                        // hide/show.
                                        isMobileCompressed
                                            ? 'opacity-0 pointer-events-none'
                                            : 'opacity-100'
                                    )}>
                                {/* (Read-only name moved to the centered trip-info slot above — mobile
                                    header now has a consistent Logo | Name | Actions layout.) */}
                                {/* Get expert help (mobile) — hidden in read-only (non-member) mode */}
                                {!hideTalkToExpert && !isReadOnly && (
                                    <button
                                        type="button"
                                        onClick={handleTalkToExpertWhatsApp}
                                        className="flex items-center justify-center w-8 h-8 rounded-full transition-colors cursor-pointer"
                                        aria-label="Chat with an expert on WhatsApp"
                                        title="Chat with an expert on WhatsApp"
                                    >
                                        <WhatsAppIcon className="w-6 h-6 [&_path]:fill-secondary-green" />
                                    </button>
                                )}
                                <div className="relative" ref={moreMenuRef}>
                                    <button
                                        type="button"
                                        className="flex items-center justify-center w-8 h-8 rounded-full border border-grey-4 hover:bg-grey-5 transition-colors cursor-pointer"
                                        onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                                        aria-label="More options"
                                    >
                                        <Ellipsis className="w-4 h-4 text-grey-0" />
                                    </button>
                                
                                    {isMoreMenuOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-natural-white rounded-xl border border-feature-card-border shadow-lg z-80 overflow-hidden">
                                            {/* Mobile overflow mirrors the desktop overflow item-for-item
                                                (same order, gates, labels). Handlers reuse desktop logic
                                                where possible; the Share-tripboard row merges what used to
                                                be the separate "Copy link" / "Share Tripboard (internal)"
                                                rows, matching desktop's single "Share tripboard" entry. */}

                                            {/* Update tripboard (sync) */}
                                            {canShowTripboardSync && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsMoreMenuOpen(false)
                                                        runTripboardSync()
                                                    }}
                                                    disabled={isTripboardSyncPending}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-grey-0 hover:bg-grey-5 transition-colors border-b border-grey-4 disabled:opacity-50"
                                                >
                                                    {isTripboardSyncPending ? (
                                                        <Loader2 className="w-5 h-5 animate-spin flex-shrink-0 text-grey-0" />
                                                    ) : (
                                                        <RefreshCw className="w-5 h-5 flex-shrink-0 text-grey-0" />
                                                    )}
                                                    <span className='font-red-hat-display font-[550] text-[14px]'>Update tripboard</span>
                                                </button>
                                            )}

                                            {/* Payments — opens drawer with the latest payment link
                                                (Pay Now CTA) plus all customer payments recorded for
                                                this trip. Visible only to Pro and Rimigo Internal users. */}
                                            {canSeePayments && !!tripId && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsMoreMenuOpen(false)
                                                        setIsPaymentsPanelOpen(true)
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-grey-0 hover:bg-grey-5 transition-colors border-b border-grey-4"
                                                >
                                                    <CreditCard className="w-5 h-5 flex-shrink-0 text-grey-0" />
                                                    <span className='font-red-hat-display font-[550] text-[14px]'>Payments</span>
                                                </button>
                                            )}

                                            {/* Download PDF — exports the itinerary (cover, days,
                                                vouchers appendix) as a single PDF the traveler can
                                                save / share offline. Heavy module loads on click. */}
                                            {onDownloadPDF && !!tripId && canDownloadPDF && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        // Keep the menu open so the in-button
                                                        // spinner stays visible while the PDF builds.
                                                        void handleDownloadPDFClick()
                                                    }}
                                                    disabled={isDownloadingPDF}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-grey-0 hover:bg-grey-5 transition-colors border-b border-grey-4 disabled:opacity-60"
                                                >
                                                    {isDownloadingPDF ? (
                                                        <Loader2 className="w-5 h-5 animate-spin flex-shrink-0 text-grey-0" />
                                                    ) : (
                                                        <Download className="w-5 h-5 flex-shrink-0 text-grey-0" />
                                                    )}
                                                    <span className='font-red-hat-display font-[550] text-[14px]'>
                                                        {isDownloadingPDF ? 'Preparing PDF…' : 'Download PDF'}
                                                    </span>
                                                </button>
                                            )}

                                            {/* Add vouchers — opens (or creates) the Vouchers tab.
                                                Open to every authenticated, edit-capable user. Hidden
                                                for logged-out viewers and read-only (shared-link)
                                                viewers — vouchers are personal trip data they can't
                                                contribute to. */}
                                            {isAuthenticated && !isReadOnly && !!tripId && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsMoreMenuOpen(false)
                                                        handleTabClick('vouchers')
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-grey-0 hover:bg-grey-5 transition-colors border-b border-grey-4"
                                                >
                                                    <FileText className="w-5 h-5 flex-shrink-0 text-grey-0" />
                                                    <span className='font-red-hat-display font-[550] text-[14px]'>Add vouchers</span>
                                                </button>
                                            )}

                                            {/* Preferences */}
                                            {isAuthenticated && !hidePreferences && !isReadOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const triggerRect = moreMenuRef.current?.getBoundingClientRect() ?? null
                                                        setTripPreferencesAnchor(triggerRect)
                                                        if (activeTrip) {
                                                            setIsTripPreferencesOpen(true)
                                                        } else {
                                                            setIsTripCreationOpen(true)
                                                        }
                                                        setIsMoreMenuOpen(false)
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-grey-0 hover:bg-grey-5 transition-colors border-b border-grey-4"
                                                >
                                                    <PenIcon className="w-5 h-5 flex-shrink-0 text-grey-0" />
                                                    <span className='font-red-hat-display font-[550] text-[14px]'>Preferences</span>
                                                </button>
                                            )}

                                            {/* Version history */}
                                            {versioningConfig?.enabled && !!tripId && isAuthenticated && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsMoreMenuOpen(false)
                                                        setIsVersionsPanelOpen(true)
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-grey-0 hover:bg-grey-5 transition-colors border-b border-grey-4"
                                                >
                                                    <History className="w-5 h-5 flex-shrink-0 text-grey-0" />
                                                    <span className='font-red-hat-display font-[550] text-[14px]'>Version history</span>
                                                </button>
                                            )}

                                            {/* Share tripboard — combines internal-collection copy and
                                                general share-link flows so there's a single entry point,
                                                matching desktop. */}
                                            {((publishConfig?.isVisible && !!collectionIdentifier) || !!tripId) && (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        setIsMoreMenuOpen(false)
                                                        const shareUrl = `${window.location.origin}/tripboard/${tripId}`
                                                        trackButtonClick({
                                                            button_name: 'Share Button',
                                                            location: 'Tripboard Header (Mobile Kebab Menu)',
                                                            extra: {
                                                                share_link: shareUrl,
                                                                trip_id: tripId,
                                                                collection_identifier: collectionIdentifier,
                                                                is_authenticated: isAuthenticated,
                                                                is_owner: isOwner,
                                                                access_mode: isOwner ? 'owner' : 'invitee',
                                                                viewport: 'mobile'
                                                            }
                                                        })
                                                        try {
                                                            await navigator.clipboard.writeText(shareUrl)
                                                            toast.success('Link copied to clipboard')
                                                        } catch {
                                                            toast.error('Failed to copy link')
                                                        }
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-grey-0 hover:bg-grey-5 transition-colors border-b border-grey-4 ${highlightedMenuItem === 'share' ? 'animate-menu-highlight' : ''}`}
                                                >
                                                    <Share2 className="w-5 h-5 flex-shrink-0 text-grey-0" />
                                                    <span className='font-red-hat-display font-[550] text-[14px]'>Share tripboard</span>
                                                </button>
                                            )}

                                            {/* Invite — only visible to the trip owner */}
                                            {isAuthenticated && tripId && isOwner && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsMoreMenuOpen(false)
                                                        handleInviteClick(moreMenuRef.current?.getBoundingClientRect() ?? null)
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-grey-0 hover:bg-grey-5 transition-colors border-b border-grey-4 ${highlightedMenuItem === 'invite' ? 'animate-menu-highlight' : ''}`}
                                                >
                                                    <UserPlus className="w-5 h-5 flex-shrink-0 text-grey-0" />
                                                    <span className='font-red-hat-display font-[550] text-[14px]'>Invite</span>
                                                </button>
                                            )}

                                            {/* Recreate itinerary — registered from Itinerary via callback ref */}
                                            {!!onRecreate && canActAsOwner && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsMoreMenuOpen(false)
                                                        onRecreate?.()
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-grey-0 hover:bg-grey-5 transition-colors border-b border-grey-4"
                                                >
                                                    <RefreshCw className="w-5 h-5 flex-shrink-0 text-grey-0" />
                                                    <span className='font-red-hat-display font-[550] text-[14px]'>Recreate itinerary</span>
                                                </button>
                                            )}

                                            {/* ────────── Internal-only section (Rimigo staff) ──────────
                                                Items below this divider are exclusive to internal curators —
                                                separated visually so staff can spot the affordances that
                                                travelers (regular/pro/premium) don't see. */}
                                            {(!!onShareItinerary
                                                || (publishConfig?.isVisible && isAuthenticated && travelerTripsContext?.activeTripId)
                                                || (isRimigoInternal && !!rioTripUrl)
                                                || publishConfig?.isVisible
                                                || canLeaveTrip) && (
                                                <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-grey-2 font-manrope border-t-2 border-grey-4 bg-grey-5/60">
                                                    Internal
                                                </div>
                                            )}

                                            {canLeaveTrip && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsMoreMenuOpen(false)
                                                        setIsLeaveTripModalOpen(true)
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-b border-grey-4"
                                                >
                                                    <LogOut className="w-5 h-5 flex-shrink-0 text-red-600" />
                                                    <span className='font-red-hat-display font-[550] text-[14px]'>Leave trip</span>
                                                </button>
                                            )}

                                            {/* Share itinerary (internal only — parent gates by not passing the callback) */}
                                            {!!onShareItinerary && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsMoreMenuOpen(false)
                                                        onShareItinerary?.()
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-grey-0 hover:bg-grey-5 transition-colors border-b border-grey-4"
                                                >
                                                    <Share2 className="w-5 h-5 flex-shrink-0 text-grey-0" />
                                                    <span className='font-red-hat-display font-[550] text-[14px]'>Share itinerary</span>
                                                </button>
                                            )}

                                            {/* Clone Tripboard (internal users only) */}
                                            {publishConfig?.isVisible && isAuthenticated && travelerTripsContext?.activeTripId && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsMoreMenuOpen(false)
                                                        setIsCloneModalOpen(true)
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-grey-0 hover:bg-grey-5 transition-colors border-b border-grey-4"
                                                >
                                                    <Copy className="w-5 h-5 flex-shrink-0 text-grey-0" />
                                                    <span className='font-red-hat-display font-[550] text-[14px]'>Clone tripboard</span>
                                                </button>
                                            )}

                                            {/* Open on Rio — jumps to the same trip in the internal ops admin. */}
                                            {isRimigoInternal && !!rioTripUrl && (
                                                <a
                                                    href={rioTripUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={() => setIsMoreMenuOpen(false)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors border-b border-grey-4"
                                                >
                                                    <ArrowUpRight className="w-5 h-5 flex-shrink-0 text-blue-600" />
                                                    <span className='font-red-hat-display font-[550] text-[14px]'>Open on Rio</span>
                                                </a>
                                            )}

                                            {/* Publish (internal users only) */}
                                            {publishConfig?.isVisible && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsMoreMenuOpen(false)
                                                            publishConfig.onPublish()
                                                        }}
                                                        disabled={publishConfig.isPublishing}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-grey-0 hover:bg-grey-5 transition-colors border-t border-grey-4 disabled:opacity-50"
                                                    >
                                                        {publishConfig.isPublishing ? (
                                                            <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                                                        ) : (
                                                            <Upload className="w-5 h-5 text-primary-default flex-shrink-0" />
                                                        )}
                                                        <span className='font-red-hat-display font-[550] text-[14px]'>Publish as Collection</span>
                                                    </button>

                                                    {publishConfig.publishedCollections.length > 0 && (
                                                        <div className="border-t border-grey-4 px-4 py-2">
                                                            <span className="text-xs text-grey-2 font-medium">Published versions</span>
                                                            {publishConfig.publishedCollections.map((pc) => (
                                                                <div key={pc.id} className="flex items-center gap-1 py-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setIsMoreMenuOpen(false)
                                                                            publishConfig.onViewPublished(pc.country_name, pc.identifier)
                                                                        }}
                                                                        className="flex items-center gap-2 text-sm text-grey-0 hover:text-primary-default transition-colors flex-1 min-w-0"
                                                                    >
                                                                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                                                        <div className="truncate text-left flex-1">
                                                                            <span className="font-red-hat-display text-[13px]">{pc.name}</span>
                                                                            {pc.created_at && (
                                                                                <span className="block text-[10px] text-grey-2">{new Date(pc.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                                            )}
                                                                        </div>
                                                                        <span className={cn(
                                                                            'text-[11px] px-1.5 py-0.5 rounded-full font-medium',
                                                                            pc.curation_status === 'published'
                                                                                ? 'bg-green-100 text-green-700'
                                                                                : 'bg-amber-100 text-amber-700'
                                                                        )}>
                                                                            {pc.curation_status}
                                                                        </span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        title="Sync sections to this collection"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            publishConfig.onSyncToPublicCollection?.(pc.identifier)
                                                                        }}
                                                                        disabled={publishConfig.syncingIdentifier === pc.identifier}
                                                                        className="p-1.5 rounded hover:bg-grey-5 transition-colors flex-shrink-0 disabled:opacity-50"
                                                                    >
                                                                        {publishConfig.syncingIdentifier === pc.identifier ? (
                                                                            <Loader2 className="w-4 h-4 animate-spin text-primary-default" />
                                                                        ) : (
                                                                            <RefreshCw className="w-4 h-4 text-grey-2 hover:text-primary-default" />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                </div>
                                )}
                            </div>
                            </div>
                            {!hideTabSection && (
                                <>
                                    {/* Mobile Tabs Section — constant sticky offset.
                                        The tabs glide up naturally as the trip-name
                                        wrapper above collapses (document flow). No
                                        need to animate `top` on the tabs themselves.
                                        data-tripboard-tabbar: the Bookings tab measures
                                        this element's bottom edge to flush-mount its
                                        fixed budget bar under the (collapsing) header. */}
                                    <div data-tripboard-tabbar className="sticky top-0 z-60 bg-natural-white w-full">
                                        <div className="w-full">
                                            <div className="flex-1 flex items-end overflow-x-auto overflow-y-hidden scrollbar-hide h-full">
                                                <div
                                                    ref={containerRef}
                                                    className="relative flex items-end gap-2 min-w-max w-full">
                                                    {showTabSkeletons && renderTabSkeletons()}
                                                    {tabs.map((tab) => (
                                                        <button
                                                            key={tab.key}
                                                            ref={(el) => {
                                                                if (el) tabRefs.current.set(tab.key, el)
                                                                else tabRefs.current.delete(tab.key)
                                                            }}
                                                            type="button"
                                                            onClick={() => handleTabClick(tab.key)}
                                                            className={cn(
                                                                'px-3 pb-3 pt-2 text-[14px] font-medium transition-colors whitespace-nowrap flex-shrink-0 flex items-center gap-1 cursor-pointer relative',
                                                                activeTab === tab.key
                                                                    ? 'text-primary-default'
                                                                    : 'text-grey-2 hover:text-grey-0'
                                                            )}
                                                            style={{
                                                                fontWeight: activeTab === tab.key ? 600 : 500
                                                            }}>
                                                    {tab.isLocked && <img src={LOCK_ICON} alt="" className="w-4 h-4 shrink-0" />}
                                                    {tab.isLoading && tab.key === 'itinerary' && (
                                                        <img
                                                            src="https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/logos/compass_logo/compass_logo_purple_transparent.png"
                                                            alt=""
                                                            className="w-3.5 h-3.5 shrink-0 animate-compass"
                                                        />
                                                    )}
                                                            {tab.label}
                                                            {tab.badge && (
                                                                <span className="text-inherit text-xs">
                                                                    {tab.badge}
                                                                </span>
                                                            )}
                                                        </button>
                                                    ))}

                                                    {/* Animated underline */}
                                                    {underlineStyle && (
                                                        <motion.div
                                                            className="absolute bottom-0 h-[3px] bg-primary-default rounded-t-full"
                                                            animate={{ left: underlineStyle.left, width: underlineStyle.width }}
                                                            transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
    
                    {/* Invite Modal */}
                    {tripId && (
                        <InviteGenerationModal
                            isOpen={isInviteModalOpen}
                            onClose={() => setIsInviteModalOpen(false)}
                            tripId={tripId}
                            anchorRect={moreMenuRef.current?.getBoundingClientRect() || null}
                            ModalContainer='z-100'
                        />
                    )}

                    {leaveTripModalNode}
    
                    {/* Trip Creation Flow */}
                    <TripCreationFlow
                        isOpen={isTripCreationOpen}
                        anchorRect={null}
                        onClose={() => setIsTripCreationOpen(false)}
                    />
    
                    {floatingAssistantNode}

                    {/* AI Assistant Window */}
                    {hasAssistantWindowConfig && isAIAssistantOpen && (
                        <AIAssistantWindow
                            isOpen={isAIAssistantOpen}
                            onClose={handleCloseAssistant}
                            ataId={assistantConfig.ataId!}
                            tripId={assistantConfig.tripId}
                            assistantType={assistantConfig.assistantType!}
                            entityType={assistantConfig.entityType!}
                            entityId={assistantConfig.entityId!}
                            inputData={assistantConfig.inputData!}
                            headerHeight={30}
                            // infoBanner="This expert currently supports itinerary tab only"
                            MobileContainerClass='shadow-[0_-10px_30px_rgba(0,0,0,0.2)]'
                        />
                    )}

                    {/* Talk to Expert — logged-in prompts modal */}
                    <TalkToExpertPromptsModal
                        isOpen={isTalkToExpertPromptsOpen}
                        onClose={() => setIsTalkToExpertPromptsOpen(false)}
                        subscriptionIntent="tripboard_callback"
                        headline="Plan your trip with a travel expert"
                        subtext="Tell us what you need and we'll reach out soon."
                        inputLabel="Anything else you need help with?"
                        inputPlaceholder="e.g. I want help finalising my itinerary"
                    />

                    {/* Tripboard Versions panel (mobile mount — bottom sheet) */}
                    {versioningConfig?.enabled && !!tripId && (
                        <VersionsPanel
                            isOpen={isVersionsPanelOpen}
                            tripId={tripId}
                            canDelete={!!versioningConfig.canDelete}
                            onClose={() => setIsVersionsPanelOpen(false)}
                        />
                    )}

                    {/* Payments panel (mobile mount — bottom sheet) */}
                    {canSeePayments && !!tripId && (
                        <PaymentsPanel
                            isOpen={isPaymentsPanelOpen}
                            tripId={tripId}
                            onClose={() => setIsPaymentsPanelOpen(false)}
                        />
                    )}

                    {/* Talk to Expert — logged-out form modal */}
                    <AnimatePresence>
                        {isTalkToExpertFormOpen && (
                            <motion.div
                                key="tte-form-backdrop-mobile"
                                className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div
                                    className="absolute inset-0 bg-black/40"
                                    onClick={() => setIsTalkToExpertFormOpen(false)}
                                    aria-hidden
                                />
                                <motion.div
                                    key="tte-form-card-mobile"
                                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                    className="relative w-full max-w-[400px] rounded-2xl bg-white shadow-[0_24px_60px_rgba(16,16,16,0.18)]"
                                >
                                    <FormSection
                                        compact
                                        subscriptionIntent="tripboard_callback"
                                        onCancel={() => setIsTalkToExpertFormOpen(false)}
                                    />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )
    }

    return (
        <>
            <div
                className={cn(
                    'sticky top-0 z-70 border-b border-feature-card-border bg-natural-white w-full animate-header-slide-in',
                    className
                )}>
                <div className="w-full px-4 sm:px-6 lg:px-0">
                    <div className="flex items-center justify-between h-[72px]">
                        {/* Left Section: Rimigo logo — branding stays consistent
                            in screenshots and links back to home. */}
                        <div className="flex items-center flex-shrink-0 px-4 md:px-5 min-h-full">
                            <img
                                src="/icons/logo-transparent-indigo.png"
                                alt="Rimigo"
                                className="h-8 w-auto cursor-pointer"
                                onClick={() => navigate('/')}
                            />
                        </div>

                        {!hideTabSection && (
                            <div className="flex-1 flex items-end overflow-x-auto overflow-y-hidden scrollbar-hide mx-4 h-full">
                                <div
                                    ref={containerRef}
                                    className="relative flex items-end justify-center gap-1 md:gap-4 min-w-max w-full">
                                    {showTabSkeletons && renderTabSkeletons()}
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.key}
                                            ref={(el) => {
                                                if (el) tabRefs.current.set(tab.key, el)
                                                else tabRefs.current.delete(tab.key)
                                            }}
                                            type="button"
                                            onClick={() => handleTabClick(tab.key)}
                                            className={cn(
                                                'px-2 pb-4 pt-3 text-[14px] md:text-base font-medium transition-colors whitespace-nowrap flex-shrink-0 flex items-center gap-1 cursor-pointer relative',
                                                activeTab === tab.key
                                                    ? 'text-primary-default'
                                                    : 'text-grey-2 hover:text-grey-0'
                                            )}
                                            style={{
                                                fontWeight: activeTab === tab.key ? 700 : 600
                                            }}>
                                        {tab.isLocked && <img src={LOCK_ICON} alt="" className="w-4 h-4 shrink-0" />}
                                        {tab.isLoading && tab.key === 'itinerary' && (
                                            <img
                                                src="https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/logos/compass_logo/compass_logo_purple_transparent.png"
                                                alt=""
                                                className="w-4 h-4 shrink-0 animate-compass"
                                            />
                                        )}
                                            {tab.label}
                                            {tab.badge && (
                                                <span className="text-inherit">
                                                    {tab.badge}
                                                </span>
                                            )}
                                            {tab.hasDropdown && (
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    ))}

                                    {/* Animated underline */}
                                    {underlineStyle && (
                                        <motion.div
                                            className="absolute bottom-0 h-[3px] bg-primary-default rounded-full"
                                            animate={{ left: underlineStyle.left, width: underlineStyle.width }}
                                            transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Right Section: Action Buttons + Trip Switcher. */}
                        <div className="flex items-center flex-shrink-0 h-full">
                        <div className="flex items-center gap-2 md:pr-4">
                            {/* Get expert help — hidden in read-only (non-member) mode */}
                            {!hideTalkToExpert && !isReadOnly && (
                                <button
                                    type="button"
                                    onClick={handleTalkToExpertClick}
                                    className="hidden md:flex cursor-pointer items-center gap-1.5 rounded-full bg-grey-0 px-3 h-10 transition-colors hover:bg-grey-1"
                                    aria-label="Get expert help"
                                    title="Get expert help"
                                >
                                    <WhatsAppIcon className="h-5 w-5" />
                                    <span className="text-[12px] font-semibold text-white font-red-hat-display">
                                        Get expert help
                                    </span>
                                </button>
                            )}

                            {/* Hidden ShareInviteButton — triggered programmatically from the
                                overflow menu's "Share" row for the non-internal flow.
                                Rendered once with a ref so we can forward the click. When its
                                internal popover opens it anchors to this element; keep it
                                visible-size-zero so the overall layout is unaffected. */}
                            <div
                                ref={shareInviteWrapperRef}
                                aria-hidden="true"
                                className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden pointer-events-none"
                            >
                                <ShareInviteButton
                                    shareLink={tripId && typeof window !== 'undefined' ? `${window.location.origin}/tripboard/${tripId}` : undefined}
                                    hasInvite={isAuthenticated && !!tripId && isOwner}
                                    onInviteClick={handleInviteClick}
                                    location="Tripboard Header"
                                    trackingData={{
                                        trip_id: tripId,
                                        collection_identifier: collectionIdentifier,
                                        is_authenticated: isAuthenticated,
                                        is_owner: isOwner,
                                        access_mode: isOwner ? 'owner' : 'invitee',
                                        viewport: 'desktop'
                                    }}
                                />
                            </div>

                            {/* 3-dot overflow menu (desktop only) — housing Sync, Preferences,
                                Share, Clone, Publish with identical visibility gating. */}
                            {(() => {
                                const hasSync = canShowTripboardSync
                                const hasPayments = canSeePayments && !!tripId
                                // Add vouchers — open to every authenticated, edit-capable user.
                                // Hidden for read-only viewers since vouchers are personal data
                                // they can't contribute to.
                                const hasAddVouchers = isAuthenticated && !isReadOnly && !!tripId
                                // Download PDF — paid-tier feature, gated to Pro and internal
                                // Rimigo curators only (see canDownloadPDF above).
                                const hasDownloadPDF = !!onDownloadPDF && !!tripId && canDownloadPDF
                                const hasPreferences = isAuthenticated && !hidePreferences && !isReadOnly
                                const hasEditName = isAuthenticated && !isReadOnly && !!activeTrip
                                // Share is visible if either:
                                //  - internal users: have a collectionIdentifier + publishConfig visible
                                //  - everyone else: we have a tripId (ShareInviteButton's shareLink would
                                //    be populated, which is its own internal render precondition)
                                const hasShare =
                                    (publishConfig?.isVisible && !!collectionIdentifier) ||
                                    !!tripId
                                const hasInvite = isAuthenticated && !!tripId && isOwner
                                const hasClone = !!publishConfig?.isVisible && isAuthenticated && !!travelerTripsContext?.activeTripId
                                const hasPublish = !!publishConfig?.isVisible
                                const hasRecreate = !!onRecreate && canActAsOwner
                                const hasLeaveTrip = canLeaveTrip
                                // Itinerary-level internal-only rows — parent controls the
                                // internal gate by only passing the callback for Rimigo staff.
                                const hasShareItinerary = !!onShareItinerary
                                // Tripboard versioning — show when enabled and we have a trip context.
                                const hasVersions = !!versioningConfig?.enabled && !!tripId && isAuthenticated
                                // Open on Rio — internal-only deep link into ops admin.
                                const hasOpenOnRio = isRimigoInternal && !!rioTripUrl

                                // Split rows into traveler-visible vs internal-only so we can
                                // render a clear "Internal" divider between them.
                                const hasInternalSection =
                                    hasShareItinerary || hasClone || hasOpenOnRio || hasPublish || hasLeaveTrip

                                const anyVisible =
                                    hasSync ||
                                    hasPayments ||
                                    hasAddVouchers ||
                                    hasDownloadPDF ||
                                    hasPreferences ||
                                    hasEditName ||
                                    hasVersions ||
                                    hasShare ||
                                    hasInvite ||
                                    hasRecreate ||
                                    hasLeaveTrip ||
                                    hasInternalSection
                                if (!anyVisible) return null

                                const handleSyncClick = () => {
                                    if (isTripboardSyncPending) return
                                    runTripboardSync()
                                    setIsActionsOverflowOpen(false)
                                }

                                const handleEditNameClick = (event: React.MouseEvent<HTMLButtonElement>) => {
                                    const triggerRect = actionsOverflowRef.current?.getBoundingClientRect()
                                        ?? event.currentTarget.getBoundingClientRect()
                                    setTripPreferencesAnchor(triggerRect)
                                    setIsEditTripNameOpen(true)
                                    setIsActionsOverflowOpen(false)
                                    setIsPublishDropdownOpen(false)
                                }

                                const handlePreferencesClick = (event: React.MouseEvent<HTMLButtonElement>) => {
                                    // Anchor preference modals to the overflow trigger (not the menu row)
                                    const triggerRect = actionsOverflowRef.current?.getBoundingClientRect()
                                        ?? event.currentTarget.getBoundingClientRect()
                                    setTripPreferencesAnchor(triggerRect)
                                    if (activeTrip) {
                                        setIsTripPreferencesOpen(true)
                                    } else {
                                        setIsTripCreationOpen(true)
                                    }
                                    setIsActionsOverflowOpen(false)
                                    setIsPublishDropdownOpen(false)
                                }

                                const handleShareClick = async () => {
                                    setIsActionsOverflowOpen(false)
                                    setIsPublishDropdownOpen(false)
                                    if (!tripId || typeof window === 'undefined') {
                                        toast.error('Unable to share — tripboard not ready yet.')
                                        return
                                    }
                                    const shareUrl = `${window.location.origin}/tripboard/${tripId}`
                                    trackButtonClick({
                                        button_name: 'Share Button',
                                        location: 'Tripboard Header',
                                        extra: {
                                            share_link: shareUrl,
                                            trip_id: tripId,
                                            collection_identifier: collectionIdentifier,
                                            is_authenticated: isAuthenticated,
                                            is_owner: isOwner,
                                            access_mode: isOwner ? 'owner' : 'invitee',
                                            viewport: 'desktop'
                                        }
                                    })
                                    try {
                                        await navigator.clipboard.writeText(shareUrl)
                                        toast.success('Link copied to clipboard')
                                    } catch {
                                        toast.error('Failed to copy link')
                                    }
                                }

                                const handleCloneClick = () => {
                                    setIsCloneModalOpen(true)
                                    setIsActionsOverflowOpen(false)
                                    setIsPublishDropdownOpen(false)
                                }

                                const handlePublishClick = () => {
                                    if (!publishConfig) return
                                    if (publishConfig.publishedCollections.length > 0) {
                                        // Toggle the nested publish dropdown inside the overflow menu.
                                        setIsPublishDropdownOpen((prev) => !prev)
                                    } else {
                                        publishConfig.onPublish()
                                        setIsActionsOverflowOpen(false)
                                        setIsPublishDropdownOpen(false)
                                    }
                                }

                                return (
                                    <div className="relative hidden md:block" ref={actionsOverflowRef}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsActionsOverflowOpen((prev) => {
                                                    const next = !prev
                                                    if (!next) setIsPublishDropdownOpen(false)
                                                    return next
                                                })
                                            }}
                                            aria-label="More actions"
                                            aria-haspopup="menu"
                                            aria-expanded={isActionsOverflowOpen}
                                            className="relative flex items-center justify-center w-10 h-10 border border-grey-4 bg-white text-grey-0 rounded-full cursor-pointer hover:bg-grey-5 transition-colors"
                                        >
                                            <Ellipsis className="w-5 h-5" />
                                            {hasSync && !isTripboardSyncPending && (
                                                <span className="absolute top-0 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                                            )}
                                        </button>

                                        {isActionsOverflowOpen && (
                                            <div
                                                role="menu"
                                                className="absolute right-0 top-full mt-2 w-60 bg-natural-white rounded-xl border border-feature-card-border shadow-lg z-80 overflow-hidden"
                                            >
                                                {hasSync && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={handleSyncClick}
                                                        disabled={isTripboardSyncPending}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                    >
                                                        {isTripboardSyncPending ? (
                                                            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-grey-0" />
                                                        ) : (
                                                            <RefreshCw className="w-4 h-4 flex-shrink-0 text-grey-0" />
                                                        )}
                                                        <span className="font-red-hat-display font-[550] text-[13px] text-grey-0">
                                                            Update tripboard
                                                        </span>
                                                    </button>
                                                )}

                                                {hasPayments && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setIsActionsOverflowOpen(false)
                                                            setIsPublishDropdownOpen(false)
                                                            setIsPaymentsPanelOpen(true)
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 transition-colors cursor-pointer"
                                                    >
                                                        <CreditCard className="w-4 h-4 flex-shrink-0 text-grey-0" />
                                                        <span className="font-red-hat-display font-[550] text-[13px] text-grey-0">
                                                            Payments
                                                        </span>
                                                    </button>
                                                )}

                                                {hasDownloadPDF && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={() => {
                                                            // Keep the menu open so the in-button
                                                            // spinner stays visible while the PDF builds.
                                                            void handleDownloadPDFClick()
                                                        }}
                                                        disabled={isDownloadingPDF}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 transition-colors cursor-pointer disabled:opacity-60"
                                                    >
                                                        {isDownloadingPDF ? (
                                                            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-grey-0" />
                                                        ) : (
                                                            <Download className="w-4 h-4 flex-shrink-0 text-grey-0" />
                                                        )}
                                                        <span className="font-red-hat-display font-[550] text-[13px] text-grey-0">
                                                            {isDownloadingPDF ? 'Preparing PDF…' : 'Download PDF'}
                                                        </span>
                                                    </button>
                                                )}

                                                {hasAddVouchers && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setIsActionsOverflowOpen(false)
                                                            setIsPublishDropdownOpen(false)
                                                            handleTabClick('vouchers')
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 transition-colors cursor-pointer"
                                                    >
                                                        <FileText className="w-4 h-4 flex-shrink-0 text-grey-0" />
                                                        <span className="font-red-hat-display font-[550] text-[13px] text-grey-0">
                                                            Add vouchers
                                                        </span>
                                                    </button>
                                                )}

                                                {hasPreferences && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={handlePreferencesClick}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 transition-colors cursor-pointer"
                                                    >
                                                        <PenIcon className="w-4 h-4 flex-shrink-0 text-grey-0" />
                                                        <span className="font-red-hat-display font-[550] text-[13px] text-grey-0">
                                                            Preferences
                                                        </span>
                                                    </button>
                                                )}

                                                {hasVersions && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setIsActionsOverflowOpen(false)
                                                            setIsPublishDropdownOpen(false)
                                                            setIsVersionsPanelOpen(true)
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 transition-colors cursor-pointer"
                                                    >
                                                        <History className="w-4 h-4 flex-shrink-0 text-grey-0" />
                                                        <span className="font-red-hat-display font-[550] text-[13px] text-grey-0">
                                                            Version history
                                                        </span>
                                                    </button>
                                                )}

                                                {hasEditName && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={handleEditNameClick}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 transition-colors cursor-pointer"
                                                    >
                                                        <PenIcon className="w-4 h-4 flex-shrink-0 text-grey-0" />
                                                        <span className="font-red-hat-display font-[550] text-[13px] text-grey-0">
                                                            Edit Trip Name
                                                        </span>
                                                    </button>
                                                )}

                                                {hasShare && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={handleShareClick}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 transition-colors cursor-pointer ${highlightedMenuItem === 'share' ? 'animate-menu-highlight' : ''}`}
                                                    >
                                                        <Share2 className="w-4 h-4 flex-shrink-0 text-grey-0" />
                                                        <span className="font-red-hat-display font-[550] text-[13px] text-grey-0">
                                                            Share tripboard
                                                        </span>
                                                    </button>
                                                )}

                                                {hasInvite && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setIsActionsOverflowOpen(false)
                                                            handleInviteClick(
                                                                actionsOverflowRef.current?.getBoundingClientRect() ?? null,
                                                            )
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 transition-colors cursor-pointer ${highlightedMenuItem === 'invite' ? 'animate-menu-highlight' : ''}`}
                                                    >
                                                        <UserPlus className="w-4 h-4 flex-shrink-0 text-grey-0" />
                                                        <span className="font-red-hat-display font-[550] text-[13px] text-grey-0">
                                                            Invite
                                                        </span>
                                                    </button>
                                                )}

                                                {hasRecreate && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setIsActionsOverflowOpen(false)
                                                            onRecreate?.()
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 transition-colors cursor-pointer"
                                                    >
                                                        <RefreshCw className="w-4 h-4 flex-shrink-0 text-grey-0" />
                                                        <span className="font-red-hat-display font-[550] text-[13px] text-grey-0">
                                                            Recreate itinerary
                                                        </span>
                                                    </button>
                                                )}

                                                {/* ───── Internal-only section (Rimigo staff) ─────
                                                    Visual break + small "Internal" label so curators can
                                                    spot the affordances regular/pro/premium travelers
                                                    don't see. */}
                                                {hasInternalSection && (
                                                    <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-grey-2 font-manrope border-t-2 border-grey-4 bg-grey-5/60">
                                                        Internal
                                                    </div>
                                                )}

                                                {hasLeaveTrip && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setIsActionsOverflowOpen(false)
                                                            setIsPublishDropdownOpen(false)
                                                            setIsLeaveTripModalOpen(true)
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors cursor-pointer"
                                                    >
                                                        <LogOut className="w-4 h-4 flex-shrink-0 text-red-600" />
                                                        <span className="font-red-hat-display font-[550] text-[13px] text-red-600">
                                                            Leave trip
                                                        </span>
                                                    </button>
                                                )}

                                                {hasShareItinerary && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setIsActionsOverflowOpen(false)
                                                            onShareItinerary?.()
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 transition-colors cursor-pointer"
                                                    >
                                                        <Share2 className="w-4 h-4 flex-shrink-0 text-grey-0" />
                                                        <span className="font-red-hat-display font-[550] text-[13px] text-grey-0">
                                                            Share itinerary
                                                        </span>
                                                    </button>
                                                )}

                                                {hasClone && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={handleCloneClick}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 transition-colors cursor-pointer"
                                                    >
                                                        <Copy className="w-4 h-4 flex-shrink-0 text-grey-0" />
                                                        <span className="font-red-hat-display font-[550] text-[13px] text-grey-0">
                                                            Clone tripboard
                                                        </span>
                                                    </button>
                                                )}

                                                {hasOpenOnRio && rioTripUrl && (
                                                    <a
                                                        href={rioTripUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setIsActionsOverflowOpen(false)
                                                            setIsPublishDropdownOpen(false)
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors cursor-pointer"
                                                    >
                                                        <ArrowUpRight className="w-4 h-4 flex-shrink-0 text-blue-600" />
                                                        <span className="font-red-hat-display font-[550] text-[13px] text-blue-700">
                                                            Open on Rio
                                                        </span>
                                                    </a>
                                                )}

                                                {hasPublish && publishConfig && (
                                                    <div ref={publishDropdownRef}>
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            onClick={handlePublishClick}
                                                            disabled={publishConfig.isPublishing}
                                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                        >
                                                            {publishConfig.isPublishing ? (
                                                                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-grey-0" />
                                                            ) : (
                                                                <Upload className="w-4 h-4 flex-shrink-0 text-grey-0" />
                                                            )}
                                                            <span className="font-red-hat-display font-[550] text-[13px] text-grey-0 flex-1 text-left">
                                                                Make this public
                                                            </span>
                                                            {publishConfig.publishedCollections.length > 0 && (
                                                                <ChevronDown
                                                                    className={cn(
                                                                        'w-3.5 h-3.5 text-grey-2 transition-transform',
                                                                        isPublishDropdownOpen && 'rotate-180'
                                                                    )}
                                                                />
                                                            )}
                                                        </button>

                                                        {isPublishDropdownOpen && publishConfig.publishedCollections.length > 0 && (
                                                            <div className="border-t border-grey-4 bg-grey-5/40">
                                                                {/* Publish new */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setIsPublishDropdownOpen(false)
                                                                        setIsActionsOverflowOpen(false)
                                                                        publishConfig.onPublish()
                                                                    }}
                                                                    disabled={publishConfig.isPublishing}
                                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-grey-0 hover:bg-grey-5 transition-colors border-b border-grey-4 disabled:opacity-50 cursor-pointer"
                                                                >
                                                                    {publishConfig.isPublishing ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                                                                    ) : (
                                                                        <Upload className="w-4 h-4 text-primary-default flex-shrink-0" />
                                                                    )}
                                                                    <span className="font-red-hat-display font-[550] text-[13px]">Publish as new public tripboard</span>
                                                                </button>

                                                                {/* Published versions */}
                                                                <div className="px-4 py-2">
                                                                    <span className="text-xs text-grey-2 font-medium">Published public TB versions</span>
                                                                    {publishConfig.publishedCollections.map((pc) => (
                                                                        <div key={pc.id} className="flex items-center gap-1 py-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setIsPublishDropdownOpen(false)
                                                                                    setIsActionsOverflowOpen(false)
                                                                                    publishConfig.onViewPublished(pc.country_name, pc.identifier)
                                                                                }}
                                                                                className="flex items-center gap-2 text-sm text-grey-0 hover:text-primary-default transition-colors flex-1 min-w-0 cursor-pointer"
                                                                            >
                                                                                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                                                                <div className="truncate text-left flex-1">
                                                                                    <span className="font-red-hat-display text-[13px]">{pc.name}</span>
                                                                                    {pc.created_at && (
                                                                                        <span className="block text-[10px] text-grey-2">{new Date(pc.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                                                    )}
                                                                                </div>
                                                                                <span className={cn(
                                                                                    'text-[11px] px-1.5 py-0.5 rounded-full font-medium',
                                                                                    pc.curation_status === 'published'
                                                                                        ? 'bg-green-100 text-green-700'
                                                                                        : 'bg-amber-100 text-amber-700'
                                                                                )}>
                                                                                    {pc.curation_status}
                                                                                </span>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                title="Sync sections to this collection"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    publishConfig.onSyncToPublicCollection?.(pc.identifier)
                                                                                }}
                                                                                disabled={publishConfig.syncingIdentifier === pc.identifier}
                                                                                className="p-1.5 rounded hover:bg-grey-5 transition-colors flex-shrink-0 disabled:opacity-50 cursor-pointer"
                                                                            >
                                                                                {publishConfig.syncingIdentifier === pc.identifier ? (
                                                                                    <Loader2 className="w-4 h-4 animate-spin text-primary-default" />
                                                                                ) : (
                                                                                    <RefreshCw className="w-4 h-4 text-grey-2 hover:text-primary-default" />
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })()}

                            {/* Login button (logged out) — standalone gradient CTA */}
                            {!isAuthenticated && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const redirectUrl = `${location.pathname}${location.search}`
                                        navigate(`/login?redirectTo=${encodeURIComponent(redirectUrl)}`)
                                    }}
                                    className="hidden md:flex items-center gap-3 px-4 h-9.5 rounded-xl text-white cursor-pointer"
                                    style={{
                                        borderRadius: 8,
                                        background: 'linear-gradient(90deg, var(--primary-indigo, #7011F6) 0%, var(--primary-dark, #4D1D91) 100%)'
                                    }}>
                                    <span className="text-sm font-semibold tracking-[-0.28px] font-['Red_Hat_Display']">Login</span>
                                </button>
                            )}
                        </div>

                            {/* Trip switcher — sits at the end of the action row,
                                separated by a left vertical divider. Original
                                borderless flag + name + chevron look. */}
                            {isAuthenticated && (
                                <div
                                    ref={tripDropdownRef}
                                    className="hidden md:flex hover:bg-grey-5 items-center gap-2 flex-shrink-0 cursor-pointer relative border-l border-grey-4 h-full"
                                    onClick={() => setIsTripDropdownOpen(!isTripDropdownOpen)}>
                                    {fallbackTripName ? (
                                        <div className="flex items-center px-3 gap-2">
                                            <img
                                                src={fallbackFlagUrl || BEACH_TREE}
                                                alt=""
                                                className="w-5 h-4 object-cover rounded-[2px] shrink-0"
                                            />
                                            <span className="font-red-hat-display text-[13px] font-semibold text-grey-0 max-w-[140px] truncate">
                                                {fallbackTripName}
                                            </span>
                                            {isTripDropdownOpen ? (
                                                <ChevronUp className="w-4 h-4 text-grey-2 shrink-0" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-grey-2 shrink-0" />
                                            )}
                                        </div>
                                    ) : (
                                        activeTrip && (
                                            <button
                                                type="button"
                                                className="flex items-center px-3 cursor-pointer transition-colors gap-2">
                                                <div className="flex items-center -space-x-1 shrink-0">
                                                    {tripFlagsMap?.[activeTrip.trip_id]?.flags?.length ? (
                                                        tripFlagsMap[activeTrip.trip_id].flags.map((flagUrl: string, i: number) => (
                                                            <img
                                                                key={i}
                                                                src={flagUrl}
                                                                alt=""
                                                                className="w-5 h-5 rounded-full object-cover border-[2px] border-white"
                                                                style={{ zIndex: tripFlagsMap[activeTrip.trip_id].flags.length - i }}
                                                            />
                                                        ))
                                                    ) : (
                                                        <img
                                                            src={BEACH_TREE}
                                                            alt=""
                                                            className="w-5 h-5 rounded-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-start min-w-0">
                                                    <span className="font-red-hat-display text-[13px] font-semibold text-grey-0 max-w-[140px] truncate">
                                                        {activeTripDisplayName}
                                                    </span>
                                                    {isInvitedTrip && invitedByName && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <span className="rounded-full bg-primary-default-08 text-primary-default text-[9px] font-semibold px-1.5 py-[1px] leading-none">
                                                                Invited Trip
                                                            </span>
                                                            <span className="font-red-hat-display text-[10px] font-[550] text-grey-2 max-w-[100px] truncate">
                                                                {invitedByName}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {isTripDropdownOpen ? (
                                                    <ChevronUp className="w-4 h-4 text-grey-2 shrink-0" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-grey-2 shrink-0" />
                                                )}
                                            </button>
                                        )
                                    )}

                                    {isTripDropdownOpen && (
                                        <TripDropdown
                                            tripsList={tripsList}
                                            tripFlagsMap={tripFlagsMap}
                                            activeTripId={travelerTripsContext?.activeTripId}
                                            onSelectTrip={(selectedTripId) => {
                                                travelerTripsContext?.updateActiveTrip?.(selectedTripId)
                                                setIsTripDropdownOpen(false)
                                                navigate(`/tripboard/${selectedTripId}`)
                                            }}
                                            onCreateTrip={() => {
                                                trackButtonClickCustom?.({
                                                    buttonPage: 'header_trip_selector',
                                                    buttonName: 'create_new_trip',
                                                    buttonAction: 'click'
                                                })
                                                navigate('/tripboard/new?create=true')
                                            }}
                                            containerClassName="
                                                absolute top-full right-0 mt-2 w-80 z-80
                                                rounded-xl border-b border-r border-gray-200
                                                bg-white shadow-lg scrollbar-hide
                                            "
                                            buttonClassName={(isActive) =>
                                                `w-full text-left px-2 py-2 text-[13px]
                                                font-medium font-manrope text-grey-0
                                                hover:bg-gray-100 flex items-center gap-1
                                                border-b border-[#EDEDED]
                                                ${isActive ? 'bg-primary-default-08 font-semibold' : ''}`
                                            }
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Invite Modal */}
            {tripId && (
                <InviteGenerationModal
                    isOpen={isInviteModalOpen}
                    onClose={() => setIsInviteModalOpen(false)}
                    tripId={tripId}
                    anchorRect={inviteAnchorRect}
                />
            )}

            {/* Trip Preferences Modal */}
            <TripPreferencesModal
                isOpen={isTripPreferencesOpen}
                anchorRect={tripPreferencesAnchor}
                onClose={() => setIsTripPreferencesOpen(false)}
                trip={activeTrip}
            />

            {/* Edit Trip Name Modal */}
            <EditTripNameModal
                isOpen={isEditTripNameOpen}
                anchorRect={tripPreferencesAnchor}
                onClose={() => setIsEditTripNameOpen(false)}
                trip={activeTrip}
            />

            {/* Trip Creation Flow */}
            <TripCreationFlow
                isOpen={isTripCreationOpen}
                anchorRect={tripPreferencesAnchor}
                onClose={() => setIsTripCreationOpen(false)}
            />

            {leaveTripModalNode}

            {/* Tripboard Versions panel — slide-over with timeline of saved versions */}
            {versioningConfig?.enabled && !!tripId && (
                <VersionsPanel
                    isOpen={isVersionsPanelOpen}
                    tripId={tripId}
                    canDelete={!!versioningConfig.canDelete}
                    onClose={() => setIsVersionsPanelOpen(false)}
                />
            )}

            {/* Payments panel — slide-over with latest payment link + customer payments */}
            {canSeePayments && !!tripId && (
                <PaymentsPanel
                    isOpen={isPaymentsPanelOpen}
                    tripId={tripId}
                    onClose={() => setIsPaymentsPanelOpen(false)}
                />
            )}

            {/* Talk to Expert — logged-in prompts modal */}
            <TalkToExpertPromptsModal
                isOpen={isTalkToExpertPromptsOpen}
                onClose={() => setIsTalkToExpertPromptsOpen(false)}
                subscriptionIntent="tripboard_callback"
            />

            {/* Talk to Expert — logged-out form modal */}
            <AnimatePresence>
                {isTalkToExpertFormOpen && (
                    <motion.div
                        key="tte-form-backdrop"
                        className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <div
                            className="absolute inset-0 bg-black/40"
                            onClick={() => setIsTalkToExpertFormOpen(false)}
                            aria-hidden
                        />
                        <motion.div
                            key="tte-form-card"
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="relative w-full max-w-[400px] rounded-2xl bg-white shadow-[0_24px_60px_rgba(16,16,16,0.18)]"
                        >
                            <FormSection
                                compact
                                subscriptionIntent="tripboard_callback"
                                onCancel={() => setIsTalkToExpertFormOpen(false)}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Clone Tripboard Modal */}
            {isCloneModalOpen && (() => {
                const selectedTripId = cloneSelectedTripId || travelerTripsContext?.activeTripId || null
                const selectedTrip = tripsList.find((t) => t.trip_id === selectedTripId)
                const searchLower = cloneTripSearch.toLowerCase()
                const filteredTrips = cloneTripSearch
                    ? tripsList.filter((t) => {
                          const name = (t.name || '').toLowerCase()
                          return name.includes(searchLower)
                      })
                    : tripsList

                return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={resetCloneModal}
                    />
                    <div className="relative bg-white rounded-2xl shadow-xl w-[min(520px,calc(100%-32px))] p-6 max-h-[90vh] overflow-y-auto">
                        <button
                            type="button"
                            onClick={resetCloneModal}
                            className="absolute top-4 right-4 text-grey-2 hover:text-grey-0 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-bold font-red-hat-display text-grey-0 mb-2">
                            Clone a Tripboard
                        </h2>
                        <p className="text-sm font-manrope text-grey-2 mb-5">
                            This will replace the itinerary and sections in the selected trip.
                            {' '}Want a fresh trip instead?{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    resetCloneModal()
                                    navigate('/tripboard/create')
                                }}
                                className="text-primary-default font-semibold hover:underline cursor-pointer"
                            >
                                Clone into a new trip
                            </button>
                        </p>

                        {/* Source mode toggle — only when we're on a tripboard. */}
                        {tripId && (
                            <div className="mb-4">
                                <label className="text-sm font-red-hat-display font-medium text-grey-0 mb-2 block">
                                    What do you want to clone?
                                </label>
                                <div className="inline-flex w-full p-0.5 rounded-xl bg-grey-5">
                                    <button
                                        type="button"
                                        onClick={() => setCloneSourceMode('current')}
                                        className={cn(
                                            'flex-1 px-3 py-2 text-xs font-manrope font-semibold rounded-lg transition-colors cursor-pointer',
                                            cloneSourceMode === 'current'
                                                ? 'bg-white text-grey-0 shadow-sm'
                                                : 'text-grey-2 hover:text-grey-0'
                                        )}
                                    >
                                        This tripboard
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCloneSourceMode('other')}
                                        className={cn(
                                            'flex-1 px-3 py-2 text-xs font-manrope font-semibold rounded-lg transition-colors cursor-pointer',
                                            cloneSourceMode === 'other'
                                                ? 'bg-white text-grey-0 shadow-sm'
                                                : 'text-grey-2 hover:text-grey-0'
                                        )}
                                    >
                                        Another tripboard
                                    </button>
                                </div>
                                <p className="text-xs text-grey-2 font-manrope mt-2">
                                    {cloneSourceMode === 'current'
                                        ? 'Clones the tripboard you’re viewing into the trip you select below.'
                                        : 'Paste a tripboard link to clone someone else’s tripboard into the selected trip.'}
                                </p>
                            </div>
                        )}

                        {/* Tripboard URL — hidden when cloning the current tripboard. */}
                        {cloneSourceMode === 'other' && (
                            <>
                                <label className="text-sm font-red-hat-display font-medium text-grey-0 mb-2 block">
                                    Tripboard URL
                                </label>
                                <div className="relative mb-2">
                                    <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-3" />
                                    <input
                                        type="url"
                                        value={cloneUrl}
                                        onChange={(e) => setCloneUrl(e.target.value)}
                                        placeholder="https://rimigo.com/rimigo-collection/..."
                                        className="w-full pl-9 pr-4 py-3 rounded-xl border border-grey-4 text-sm font-manrope text-grey-0 placeholder:text-grey-3 focus:outline-none focus:ring-2 focus:ring-primary-default/30 focus:border-primary-default"
                                    />
                                </div>
                                {cloneUrl && extractCloneInfo(cloneUrl) && (
                                    <p className="text-xs text-grey-2 font-manrope mb-4">
                                        Identifier: <span className="font-medium text-grey-0">{extractCloneInfo(cloneUrl)!.identifier}</span>
                                        <span className="ml-2 text-grey-3">({extractCloneInfo(cloneUrl)!.collectionType})</span>
                                    </p>
                                )}
                                {cloneUrl && !extractCloneInfo(cloneUrl) && (
                                    <p className="text-xs text-red-500 font-manrope mb-4">
                                        Invalid URL. Paste a rimigo-collection or traveler_collection link.
                                    </p>
                                )}
                            </>
                        )}

                        {/* Select Trip */}
                        <label className="text-sm font-red-hat-display font-medium text-grey-0 mb-2 block">
                            Clone into trip
                        </label>
                        <div className="border border-grey-4 rounded-xl mb-4 overflow-hidden">
                            {/* Search */}
                            <div className="relative border-b border-grey-4">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-3" />
                                <input
                                    type="text"
                                    value={cloneTripSearch}
                                    onChange={(e) => setCloneTripSearch(e.target.value)}
                                    placeholder="Search trips..."
                                    className="w-full pl-9 pr-4 py-2.5 text-sm font-manrope text-grey-0 placeholder:text-grey-3 focus:outline-none"
                                />
                            </div>
                            {/* Trip list */}
                            <div className="max-h-40 overflow-y-auto">
                                {filteredTrips.length === 0 ? (
                                    <p className="px-4 py-3 text-sm text-grey-3 font-manrope text-center">No trips found</p>
                                ) : (
                                    filteredTrips.map((t) => {
                                        const flagData = tripFlagsMap[t.trip_id]
                                        const isSelected = t.trip_id === selectedTripId
                                        return (
                                            <button
                                                key={t.trip_id}
                                                type="button"
                                                onClick={() => setCloneSelectedTripId(t.trip_id)}
                                                className={cn(
                                                    'w-full px-3 py-2.5 text-left flex items-center gap-3 border-b border-grey-4/50 last:border-b-0 transition-colors cursor-pointer',
                                                    isSelected
                                                        ? 'bg-primary-default-80/30'
                                                        : 'hover:bg-grey-5'
                                                )}
                                            >
                                                <div className="flex items-center justify-center -space-x-1 shrink-0 w-10">
                                                    {flagData?.flags?.length ? (
                                                        flagData.flags.map((flagUrl: string, i: number) => (
                                                            <img
                                                                key={i}
                                                                src={flagUrl}
                                                                alt="flag"
                                                                className="w-5 h-5 rounded-full object-cover border-[2px] border-white"
                                                                style={{ zIndex: flagData.flags.length - i }}
                                                            />
                                                        ))
                                                    ) : (
                                                        <img src={BEACH_TREE} alt="flag" className="w-5 h-5 rounded-full object-cover" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col justify-center flex-1 min-w-0">
                                                    <span className="font-red-hat-display text-sm font-medium text-grey-0 truncate">
                                                        {formatCapitalizeFirstLetter(t)}
                                                    </span>
                                                    <span className="text-[11px] font-manrope text-grey-2">
                                                        {formatTripDropdownData(t)}
                                                    </span>
                                                </div>
                                                {isSelected && (
                                                    <div className="w-4 h-4 rounded-full bg-primary-default flex items-center justify-center shrink-0">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Start Date */}
                        <label className="text-sm font-red-hat-display font-medium text-grey-0 mb-2 block">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={cloneStartDate}
                            onChange={(e) => setCloneStartDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-grey-4 text-sm font-manrope text-grey-0 focus:outline-none focus:ring-2 focus:ring-primary-default/30 focus:border-primary-default mb-5"
                        />

                        {/* Submit */}
                        <button
                            type="button"
                            onClick={handleCloneIntoTrip}
                            disabled={isCloning || !cloneUrl || !extractCloneInfo(cloneUrl) || !cloneStartDate || !selectedTripId}
                            className="w-full py-3 rounded-xl bg-primary-default text-white font-manrope font-semibold text-base hover:bg-primary-default/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCloning ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Cloning...
                                </span>
                            ) : (
                                `Clone into ${selectedTrip ? formatCapitalizeFirstLetter(selectedTrip) : 'selected trip'}`
                            )}
                        </button>
                    </div>
                </div>
                )
            })()}

            {floatingAssistantNode}

            {/* AI Assistant Window — only mount when open to prevent background polling */}
            {hasAssistantWindowConfig && isAIAssistantOpen && (
                <AIAssistantWindow
                    isOpen={isAIAssistantOpen}
                    onClose={handleCloseAssistant}
                    ataId={assistantConfig.ataId!}
                    tripId={assistantConfig.tripId}
                    assistantType={assistantConfig.assistantType!}
                    entityType={assistantConfig.entityType!}
                    entityId={assistantConfig.entityId!}
                    inputData={assistantConfig.inputData!}
                    headerHeight={72}
                    // infoBanner="This expert currently supports itinerary tab only"
                />
            )}
        </>
    )
}

export default TripboardHeader
