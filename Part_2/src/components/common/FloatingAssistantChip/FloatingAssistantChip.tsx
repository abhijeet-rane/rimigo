import { useCallback, useEffect, useRef, useState, FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
    DEFAULT_ARIA_LABEL,
    DEFAULT_AUTO_COLLAPSE_MS,
    DEFAULT_AUTO_EXPAND_MS,
    DEFAULT_HEADING,
    DEFAULT_PILL_PROMPTS,
    DEFAULT_SUGGESTIONS,
    GRADIENT_STYLE,
    PILL_PROMPT_CYCLE_MS,
} from './constants'
import type { AttachmentSummary, ChipState, FloatingAssistantChipProps } from './types'
import DesktopCollapsed from './DesktopCollapsed'
import DesktopExpanded from './DesktopExpanded'
import MobileView from './MobileView'
import MobileCollapsed from './MobileCollapsed'
import { useAttachments } from '@/modules/AtaAgent/hooks/useAttachments'
import { AttachmentMenu } from '@/modules/AtaAgent/components/Chat/components/Attachments/AttachmentMenu'
import { consumeReturningAttachments, setPendingAttachments, subscribeReturningAttachments } from '@/modules/AtaAgent/hooks/pendingAssistantAttachments'
import { extractAttachableUrls, stripUrlsFromText } from '@/api/attachmentsAPI/attachmentsApi'

/**
 * Floating assistant chip — bottom-center widget that cycles attention-grabbing
 * prompts in a collapsed pill and expands into a typing card. Submitting a query
 * calls `onSubmit` (parent wires this to `triggerAssistantPrompt`).
 */
const FloatingAssistantChip: React.FC<FloatingAssistantChipProps> = ({
    isMobile,
    showWand,
    currentPlaceholder,
    placeholderIndex,
    onClick,
    onSubmit,
    tripId = null,
    hasExistingThread = false,
    suggestions = DEFAULT_SUGGESTIONS,
    pillPrompts = DEFAULT_PILL_PROMPTS,
    heading = DEFAULT_HEADING,
    isLoading: externalLoading = false,
    trackButtonClick,
    ariaLabel = DEFAULT_ARIA_LABEL,
    className,
    autoExpandDelayMs = DEFAULT_AUTO_EXPAND_MS,
    autoCollapseDelayMs = DEFAULT_AUTO_COLLAPSE_MS,
    ctaVerb = 'Edit',
    mobilePlaceholder,
    collapsed = false,
    forceExpandOnMount = false,
    voiceEnabled = false,
    voiceState = 'idle',
    voiceCaption = '',
    onStartVoice,
    onStopVoice,
}) => {
    // Voice mode — any non-idle state pins the chip open in its voice variant.
    const isVoiceActive = voiceState !== 'idle'

    // --- State ---
    // forceExpandOnMount → start expanded so the chip pops open automatically
    // (e.g. right after a tripboard is created) regardless of thread state.
    const [state, setState] = useState<ChipState>(forceExpandOnMount && !isMobile ? 'expanded' : 'collapsed')
    const [query, setQuery] = useState('')
    const [isHovered, setIsHovered] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [internalCycleIndex, setInternalCycleIndex] = useState(0)
    // Once dismissed (or thread exists), don't auto-pop on hover.
    // forceExpandOnMount overrides the existing-thread suppression.
    const [hasBeenDismissed, setHasBeenDismissed] = useState(forceExpandOnMount ? false : hasExistingThread)

    const inputRef = useRef<HTMLInputElement | null>(null)
    const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Uploads happen in-chip; completed ids forwarded via onSubmit.
    const attachmentsApi = useAttachments({ tripId })
    const [menuOpen, setMenuOpen] = useState(false)
    const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null)
    const attachBtnRef = useRef<HTMLButtonElement | null>(null)

    const openAttachmentMenu = () => {
        const rect = attachBtnRef.current?.getBoundingClientRect() ?? null
        setMenuAnchorRect(rect)
        setMenuOpen(true)
        trackButtonClick?.({
            button_name: 'Assistant Attachment Menu Open',
            location: isMobile ? 'Floating Wand Mobile' : 'Floating Wand Desktop',
            extra: { device: isMobile ? 'mobile' : 'desktop' },
        })
    }
    const closeAttachmentMenu = () => {
        setMenuOpen(false)
        trackButtonClick?.({
            button_name: 'Assistant Attachment Menu Close',
            location: isMobile ? 'Floating Wand Mobile' : 'Floating Wand Desktop',
            extra: { device: isMobile ? 'mobile' : 'desktop' },
        })
    }

    /** Wraps addFile to emit a tracking event. */
    const handlePickFile = (file: File) => {
        trackButtonClick?.({
            button_name: 'Assistant Attachment File Picked',
            location: isMobile ? 'Floating Wand Mobile' : 'Floating Wand Desktop',
            extra: {
                device: isMobile ? 'mobile' : 'desktop',
                mime_type: file.type || 'unknown',
                size_bytes: file.size,
            },
        })
        return attachmentsApi.addFile(file)
    }

    /** Wraps addLink to emit a tracking event. */
    const handlePickLink = (url: string, kind: 'youtube' | 'instagram') => {
        trackButtonClick?.({
            button_name: 'Assistant Attachment Link Picked',
            location: isMobile ? 'Floating Wand Mobile' : 'Floating Wand Desktop',
            extra: { device: isMobile ? 'mobile' : 'desktop', kind },
        })
        return attachmentsApi.addLink(url, kind)
    }

    const clearCollapseTimer = () => {
        if (collapseTimerRef.current) {
            clearTimeout(collapseTimerRef.current)
            collapseTimerRef.current = null
        }
    }
    const clearExpandTimer = () => {
        if (expandTimerRef.current) {
            clearTimeout(expandTimerRef.current)
            expandTimerRef.current = null
        }
    }

    // Rotate prompts inside the collapsed pill for attention.
    useEffect(() => {
        if (!showWand || state !== 'collapsed' || !pillPrompts || pillPrompts.length < 2) return
        const id = setInterval(() => {
            setInternalCycleIndex((i) => (i + 1) % pillPrompts.length)
        }, PILL_PROMPT_CYCLE_MS)
        return () => clearInterval(id)
    }, [showWand, state, pillPrompts])

    const scheduleCollapse = useCallback(() => {
        if (isMobile) return
        clearCollapseTimer()
        collapseTimerRef.current = setTimeout(() => {
            setState((prev) => {
                if (prev !== 'expanded') return prev
                // Auto-collapse = dismissal. Don't auto-pop again.
                setHasBeenDismissed(true)
                return 'collapsed'
            })
        }, autoCollapseDelayMs)
    }, [autoCollapseDelayMs, isMobile])

    // Initial auto-expand (desktop). Skip if dismissed or thread exists.
    useEffect(() => {
        if (isMobile || !showWand || hasBeenDismissed) return
        clearExpandTimer()
        expandTimerRef.current = setTimeout(() => {
            setState((prev) => (prev === 'collapsed' ? 'expanded' : prev))
        }, autoExpandDelayMs)
        return () => clearExpandTimer()
    }, [showWand, autoExpandDelayMs, isMobile, hasBeenDismissed])

    // Auto-collapse after inactivity. Blocked while user has typed text,
    // staged an attachment, or has the attachment menu open.
    const hasStagedAttachments = attachmentsApi.attachments.length > 0
    useEffect(() => {
        if (isMobile) return
        if (
            state !== 'expanded' ||
            isHovered ||
            isFocused ||
            query.length > 0 ||
            menuOpen ||
            hasStagedAttachments ||
            isVoiceActive
        ) {
            clearCollapseTimer()
            return
        }
        scheduleCollapse()
        return () => clearCollapseTimer()
    }, [state, isHovered, isFocused, query, menuOpen, hasStagedAttachments, isVoiceActive, scheduleCollapse, isMobile])

    useEffect(() => {
        return () => {
            clearCollapseTimer()
            clearExpandTimer()
        }
    }, [])

    // Drain any attachments the assistant pushed back when it was closed
    // without sending — keeps staged uploads from disappearing on close.
    const seedRef = useRef(attachmentsApi.seed)
    seedRef.current = attachmentsApi.seed
    useEffect(() => {
        const drain = () => {
            const drafts = consumeReturningAttachments()
            if (drafts.length) seedRef.current(drafts)
        }
        drain()
        return subscribeReturningAttachments(drain)
    }, [])

    // --- Handlers ---
    const track = (button_name: string, extra: Record<string, unknown> = {}) => {
        trackButtonClick?.({
            button_name,
            location: isMobile ? 'Floating Wand Mobile' : 'Floating Wand Desktop',
            extra: { device: isMobile ? 'mobile' : 'desktop', ...extra },
        })
    }

    const handleHoverEnter = () => {
        if (isMobile) return
        setIsHovered(true)
        // Only first-time strip expands on hover; dismissed = click-only.
        if (state === 'collapsed' && !hasBeenDismissed) {
            clearExpandTimer()
            setState('expanded')
        }
    }
    const handleHoverLeave = () => {
        if (isMobile) return
        setIsHovered(false)
    }

    /** Tracks the open action with a source label. */
    const trackOpen = (source: 'pill' | 'continue_editing' | 'view_chat_banner') => {
        const buttonName =
            source === 'continue_editing'
                ? 'Assistant Continue Editing View Chat'
                : source === 'view_chat_banner'
                    ? 'Assistant View Chat Banner'
                    : 'Assisstant Button'
        track(buttonName, { action: 'clicked', source })
    }

    const openAssistant = () => {
        trackOpen('pill')
        // Hand off staged attachments — chip's input is read-only on
        // mobile, so without this the attachments would be lost.
        if (attachmentsApi.attachments.length > 0) {
            setPendingAttachments(attachmentsApi.attachments)
            attachmentsApi.clear()
        }
        onClick()
    }

    /** Dismissed-state "Continue editing → View chat" strip click. */
    const openAssistantFromContinueEditing = () => {
        trackOpen('continue_editing')
        if (attachmentsApi.attachments.length > 0) {
            setPendingAttachments(attachmentsApi.attachments)
            attachmentsApi.clear()
        }
        onClick()
    }

    /** "View chat" button in the expanded popup banner. */
    const openAssistantFromBanner = () => {
        trackOpen('view_chat_banner')
        if (attachmentsApi.attachments.length > 0) {
            setPendingAttachments(attachmentsApi.attachments)
            attachmentsApi.clear()
        }
        onClick()
    }

    // "View chat" path: submits if user has text/attachments staged,
    // otherwise just opens the chat.
    const openAssistantWithPending = () => {
        const q = query.trim()
        const ids = attachmentsApi.completedIds
        // Nothing pending → just open the chat.
        if (!q && !ids.length) {
            openAssistantFromBanner()
            return
        }
        // Uploads in flight → open without submit so nothing is dropped.
        if (attachmentsApi.hasInFlight) {
            openAssistantFromBanner()
            return
        }
        // Attachments without text → BE rejects empty prompts, so default.
        const promptToSend = q || 'Use this attachment as context for my trip.'
        const summary = ids.length ? buildAttachmentsSummary() : undefined
        track('Assistant View Chat Submit', { query_length: q.length, attachments: ids.length })
        setHasBeenDismissed(true)
        setState('loading')
        if (onSubmit) onSubmit(promptToSend, ids.length ? ids : undefined, summary)
        else onClick()
        if (ids.length) attachmentsApi.clear()
        setQuery('')
    }

    /** Summary used by the user-bubble's attachment chips. */
    const buildAttachmentsSummary = (): AttachmentSummary[] =>
        attachmentsApi.attachments
            .filter((a) => a.status === 'completed' && a.attachmentId)
            .map((a) => ({
                attachment_id: a.attachmentId as string,
                kind: a.kind,
                title: a.record?.title || a.label || null,
                source_url: a.sourceUrl ?? a.record?.source_url ?? null,
                filename: a.record?.filename ?? null,
            }))

    // Core send path — shared by the user-initiated submit and the
    // deferred auto-submit that fires once auto-promoted URL attachments
    // finish processing.
    const performSubmit = (promptText: string) => {
        const q = promptText.trim()
        if (!q) {
            openAssistant()
            return
        }
        if (attachmentsApi.hasInFlight) return
        const ids = attachmentsApi.completedIds
        const summary = ids.length ? buildAttachmentsSummary() : undefined
        track('Assistant Query Submit', { query_length: q.length, attachments: ids.length })
        setHasBeenDismissed(true)
        setState('loading')
        if (onSubmit) onSubmit(q, ids.length ? ids : undefined, summary)
        else onClick()
        if (ids.length) attachmentsApi.clear()
        setQuery('')
    }

    // Prompt to fire once auto-promoted URL attachments finish processing.
    const pendingAutoSubmitRef = useRef<string | null>(null)
    const wasInFlightRef = useRef(false)
    useEffect(() => {
        const inFlight = attachmentsApi.hasInFlight
        // hasInFlight transitions true → false when every attachment
        // settled (completed or failed). Fire the deferred submit then.
        if (wasInFlightRef.current && !inFlight && pendingAutoSubmitRef.current !== null) {
            const prompt = pendingAutoSubmitRef.current
            pendingAutoSubmitRef.current = null
            // Skip if every attachment failed / was removed — nothing to attach.
            if (attachmentsApi.completedIds.length > 0) performSubmit(prompt)
        }
        wasInFlightRef.current = inFlight
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attachmentsApi.hasInFlight])

    const handleSubmit = (e?: FormEvent) => {
        e?.preventDefault()
        // Auto-promote any YouTube / Instagram URLs in the text to
        // attachments. The URL is stripped, the remaining prompt is
        // stashed, and submit fires automatically once processing finishes.
        const extracted = extractAttachableUrls(query)
        if (extracted.length > 0) {
            const remaining = stripUrlsFromText(query, extracted.map((u) => u.url))
            setQuery(remaining)
            pendingAutoSubmitRef.current = remaining.trim() || 'Use this attachment as context for my trip.'
            extracted.forEach((u) => handlePickLink(u.url, u.kind))
            track('Assistant Auto Link Promoted', { count: extracted.length })
            return
        }
        performSubmit(query)
    }

    const handleChipClick = (chip: string) => {
        track('Assistant Suggestion Chip', { chip })
        setQuery(chip)
        setHasBeenDismissed(true)
        setState('loading')
        const ids = attachmentsApi.completedIds
        const summary = ids.length ? buildAttachmentsSummary() : undefined
        if (onSubmit) onSubmit(chip, ids.length ? ids : undefined, summary)
        else onClick()
        if (ids.length) attachmentsApi.clear()
    }

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation()
        track('Assistant Chip Close', { action: 'close' })
        if (isVoiceActive) onStopVoice?.()
        setQuery('')
        setHasBeenDismissed(true)
        setState('collapsed')
    }

    // --- Voice handlers ---
    const handleStartVoice = () => {
        track('Assistant Voice Start')
        // Pin the chip open so the voice variant is visible.
        setState('expanded')
        onStartVoice?.()
    }
    /** Keyboard toggle — leave voice but stay in the expanded text card. */
    const handleVoiceKeyboard = () => {
        track('Assistant Voice Keyboard')
        onStopVoice?.()
        setState('expanded')
    }
    /** Close — leave voice and collapse the chip. */
    const handleVoiceClose = () => {
        track('Assistant Voice Close')
        onStopVoice?.()
        setHasBeenDismissed(true)
        setState('collapsed')
    }

    // --- Derived view state ---
    // The redesigned chip always anchors bottom-center per spec; we intentionally
    // ignore the `className` prop and the parent's `currentPlaceholder` cycle for
    // the collapsed pill to keep layout stable.
    void className
    void placeholderIndex
    void currentPlaceholder

    // Mobile uses flex-col (line removed, single card). Desktop uses pure absolute
    // positioning so the pill, card, and anchor line share the same bottom space
    // and can overlap during transitions without pushing layout.
    const mobileContainerClass =
        'fixed bottom-0 left-0 right-0 z-[60] flex flex-col items-center pointer-events-none'
    const desktopContainerClass =
        'fixed bottom-0 left-0 right-0 z-[120] pointer-events-none'
    const isLoadingView = state === 'loading' || externalLoading
    const cycled = pillPrompts?.[internalCycleIndex] ?? ''
    const cycledPlaceholder = `"${cycled}"`
    const cyclePlaceholderKey = `i-${internalCycleIndex}`

    if (!showWand) return null

    // --- Mobile ---
    if (isMobile) {
        // While the page is scrolled (`collapsed`) — and the user isn't mid
        // voice session / loading — shrink to the compact "Continue editing"
        // pill so the list gets more room. Crossfades back to the full input
        // bar on scroll-up. `mode="wait"` so the two never overlap.
        const showCollapsedPill = collapsed && !isVoiceActive && !isLoadingView
        return (
            <div className={mobileContainerClass} data-assistant-dock="mobile">
                <AnimatePresence initial={false} mode="wait">
                    {showCollapsedPill ? (
                        <MobileCollapsed
                            key="mobile-collapsed"
                            ariaLabel={ariaLabel}
                            voiceEnabled={voiceEnabled}
                            onOpen={openAssistant}
                            onStartVoice={handleStartVoice}
                        />
                    ) : (
                        <MobileView
                            key="mobile-full"
                            ariaLabel={ariaLabel}
                            heading={heading}
                            placeholder={mobilePlaceholder}
                            query={query}
                            isFocused={isFocused}
                            isLoadingView={isLoadingView}
                            attachments={attachmentsApi.attachments}
                            hasInFlightAttachments={attachmentsApi.hasInFlight}
                            onRemoveAttachment={attachmentsApi.remove}
                            onAttachClick={openAttachmentMenu}
                            attachBtnRef={attachBtnRef}
                            attachmentMenuOpen={menuOpen}
                            onOpenAssistant={openAssistant}
                            onSubmit={handleSubmit}
                            onQueryChange={setQuery}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            voiceEnabled={voiceEnabled}
                            voiceState={voiceState}
                            voiceCaption={voiceCaption}
                            onStartVoice={handleStartVoice}
                            onVoiceKeyboard={handleVoiceKeyboard}
                            onVoiceClose={handleVoiceClose}
                        />
                    )}
                </AnimatePresence>
                <AttachmentMenu
                    open={menuOpen}
                    anchorRect={menuAnchorRect}
                    onClose={closeAttachmentMenu}
                    onPickFile={handlePickFile}
                    onPickLink={handlePickLink}
                />
            </div>
        )
    }

    // --- Desktop ---
    // All three layers (line, pill, card) are ABSOLUTELY positioned inside the
    // same fixed-bottom viewport strip. That means:
    //   • the pill sits flush on top of the line (no gap),
    //   • pill and card can overlap during state changes,
    //   • removing mode="wait" lets them crossfade instead of sequence.
    return (
        <div className={desktopContainerClass} style={{ height: 240 }}>
            {/* Bottom anchor line — always at the very bottom of the viewport. */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-[5px]"
                style={GRADIENT_STYLE}
                animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    opacity: state === 'collapsed' ? 1 : 0,
                }}
                transition={{
                    backgroundPosition: { duration: 6.5, repeat: Infinity, ease: 'linear' },
                    opacity: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
                }}
            />

            {/* Pill + expanded card — both absolutely positioned on top of the line.
                No mode="wait": they crossfade and the card blooms UP from the pill. */}
            <AnimatePresence initial={false}>
                {state === 'collapsed' && !isVoiceActive ? (
                    <DesktopCollapsed
                        key="collapsed"
                        ariaLabel={ariaLabel}
                        ctaVerb={ctaVerb}
                        cycledPlaceholder={cycledPlaceholder}
                        cyclePlaceholderKey={cyclePlaceholderKey}
                        dismissed={hasBeenDismissed}
                        hasExistingThread={hasExistingThread}
                        // Distinct tracking for dismissed-state strip.
                        onClick={
                            hasBeenDismissed
                                ? openAssistantFromContinueEditing
                                : openAssistant
                        }
                        onMouseEnter={handleHoverEnter}
                        onMouseLeave={handleHoverLeave}
                        voiceEnabled={voiceEnabled}
                        onStartVoice={handleStartVoice}
                    />
                ) : (
                    <DesktopExpanded
                        key="expanded"
                        heading={heading}
                        suggestions={suggestions}
                        query={query}
                        isFocused={isFocused}
                        isLoadingView={isLoadingView}
                        inputRef={inputRef}
                        attachments={attachmentsApi.attachments}
                        hasInFlightAttachments={attachmentsApi.hasInFlight}
                        onRemoveAttachment={attachmentsApi.remove}
                        onAttachClick={openAttachmentMenu}
                        attachBtnRef={attachBtnRef}
                        attachmentMenuOpen={menuOpen}
                        onMouseEnter={handleHoverEnter}
                        onMouseLeave={handleHoverLeave}
                        onClose={handleClose}
                        onOpenAssistant={openAssistantWithPending}
                        onChipClick={handleChipClick}
                        onSubmit={handleSubmit}
                        onQueryChange={setQuery}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        voiceEnabled={voiceEnabled}
                        voiceState={voiceState}
                        voiceCaption={voiceCaption}
                        onStartVoice={handleStartVoice}
                        onVoiceKeyboard={handleVoiceKeyboard}
                        onVoiceClose={handleVoiceClose}
                    />
                )}
            </AnimatePresence>

            <AttachmentMenu
                open={menuOpen}
                anchorRect={menuAnchorRect}
                onClose={closeAttachmentMenu}
                onPickFile={(f) => attachmentsApi.addFile(f)}
                onPickLink={(url, kind) => attachmentsApi.addLink(url, kind)}
            />
        </div>
    )
}

export default FloatingAssistantChip
