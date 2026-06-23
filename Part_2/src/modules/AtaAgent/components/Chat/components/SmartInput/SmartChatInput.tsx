/**
 * Enhanced chat input with contextual action chips.
 * Wraps the existing ChatInputSection, adding:
 * - Context-aware action chips (change based on current page/view)
 * - Post-mutation chips (Undo, What changed?)
 * - Premium two-month calendar picker for date shift
 * - Auto-expiring mutation chips (30s TTL)
 * - (NEW) Optional attachment "+" button + menu (Tripboard AI Assistant)
 */
import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import ChatInputSection from '../Generics/ChatInputSection'
import ActionChips from './ActionChips'
import DateShiftPicker from './DateShiftPicker'
import { getContextualChips, POST_MUTATION_CHIPS, type ViewContext, type ActionChipConfig } from './chipConfigs'
import { useMutationUndoStore } from '@/stores/mutationUndoStore'
import FollowUpActions, { type FollowUpChipAction } from '@/modules/Itinerary/components/chat/primitives/FollowUpActions'
import type { IntentAction, ReplyAction, CustomActionAction } from '@/modules/AtaAgent/types/AIAssisstantWindowTypes'

import { AttachmentMenu } from '@/modules/AtaAgent/components/Chat/components/Attachments/AttachmentMenu'
import type { AttachmentDraft, AttachmentKind } from '@/modules/AtaAgent/types/Attachments'
import { extractAttachableUrls, stripUrlsFromText } from '@/api/attachmentsAPI/attachmentsApi'

interface SmartChatInputProps {
    inputText: string
    setInputText: (value: string) => void
    handleSend: (text?: string) => void
    isSearching: boolean
    isNewMessageLoading: boolean
    placeholder: string
    inputRef?: any
    variant?: 'default' | 'experience' | 'floating'
    placeholderCycle?: string[]
    disclaimerText?: string
    onContainerClick?: () => void
    readOnly?: boolean
    onInputFocus?: () => void
    viewContext?: ViewContext
    /** Claude-style in-flight affordance: when true, the send button
     *  becomes a stop button and the textarea is disabled. */
    isStreaming?: boolean
    onStop?: () => void
    /** Fired when the chip row becomes visible so the parent can scroll
     *  the chat down — otherwise the chips clip the last message. */
    onChipsShown?: () => void

    /** The latest assistant turn's follow-up chips, promoted into the chip
     *  row above the input bar. When non-empty they REPLACE the default
     *  contextual starters; when empty the starters render as before. */
    followUps?: FollowUpChipAction[]
    /** Tap handler for a promoted follow-up chip (dismiss is resolved inside
     *  ``FollowUpActions`` and never reaches here). */
    onFollowUp?: (
        action: IntentAction | ReplyAction | CustomActionAction,
        idx: number,
    ) => void

    // ---- Attachments (Tripboard AI Assistant) ----
    /** Pending attachment drafts to show as chips. */
    attachments?: AttachmentDraft[]
    /** When provided, the `+` button is rendered. */
    onAddAttachmentFile?: (file: File) => void
    onAddAttachmentLink?: (url: string, kind: AttachmentKind) => void
    onRemoveAttachment?: (localId: string) => void
    sendBlockedByAttachments?: boolean
}

const formatDateMessage = (date: Date): string =>
    date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

const SmartChatInput: React.FC<SmartChatInputProps> = ({
    viewContext,
    handleSend,
    isNewMessageLoading,
    isSearching,
    isStreaming,
    onStop,
    onChipsShown,
    followUps,
    onFollowUp,
    attachments = [],
    onAddAttachmentFile,
    onAddAttachmentLink,
    onRemoveAttachment,
    sendBlockedByAttachments,
    inputText,
    setInputText,
    ...inputProps
}) => {
    const { showPostMutationChips, clearPostMutationChips } = useMutationUndoStore()
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [showDatePicker, setShowDatePicker] = useState(false)

    const [menuOpen, setMenuOpen] = useState(false)
    const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null)

    const attachmentsEnabled =
        Boolean(onAddAttachmentFile) && Boolean(onAddAttachmentLink)

    useEffect(() => {
        if (showPostMutationChips) {
            timerRef.current = setTimeout(() => clearPostMutationChips(), 30000)
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    }, [showPostMutationChips, clearPostMutationChips])

    const handleChipTap = (prompt: string, _metadata?: Record<string, any>) => {
        if (prompt === '__undo_last_mutation__') {
            const snapshot = useMutationUndoStore.getState().undoLastMutation()
            if (snapshot) handleSend('Undo my last change')
            return
        }
        if (prompt === '__show_date_picker__') {
            setShowDatePicker(true)
            return
        }
        // ``__custom_action__:<token>`` fires an in-app affordance locally
        // (e.g. open the invite menu, switch to the stays tab) via the same
        // ``onFollowUp`` path the agent's follow-up chips use — no agent round
        // trip, no user bubble.
        if (prompt.startsWith('__custom_action__:')) {
            const token = prompt.slice('__custom_action__:'.length)
            onFollowUp?.(
                { action: 'custom_action', cta: token, action_data: { action: token } },
                -1,
            )
            return
        }
        handleSend(prompt)
    }

    const handleDateConfirm = (date: Date) => {
        handleSend(`Change my trip start date to ${formatDateMessage(date)}`)
        setShowDatePicker(false)
    }

    let chips: ActionChipConfig[] = []
    const isLoading = isNewMessageLoading || isSearching || Boolean(isStreaming)

    // The latest turn's follow-up chips take priority over the default
    // contextual starters: when present, they fill the chip row instead.
    // (Parent passes none while a turn is actively streaming, so this is
    // empty during streaming and the starters' isLoading gate still holds.)
    const hasFollowUps = !showDatePicker && (followUps?.length ?? 0) > 0

    if (!hasFollowUps && !isLoading && !showDatePicker) {
        if (showPostMutationChips) {
            chips = POST_MUTATION_CHIPS
        } else if (viewContext) {
            chips = getContextualChips(viewContext)
        }
    }

    // Notify parent only on the hidden→visible edge of the chip row.
    const chipsVisible = hasFollowUps || chips.length > 0
    const wasChipsVisibleRef = useRef(false)
    useEffect(() => {
        if (chipsVisible && !wasChipsVisibleRef.current) {
            onChipsShown?.()
        }
        wasChipsVisibleRef.current = chipsVisible
    }, [chipsVisible, onChipsShown])

    const onOpenAttachmentMenu = attachmentsEnabled
        ? (rect: DOMRect) => {
              setMenuAnchorRect(rect)
              setMenuOpen(true)
          }
        : undefined

    // Auto-promote YouTube / Instagram URLs in the prompt to attachments,
    // then auto-fire the send once they finish processing. Stash the
    // remaining prompt here; the effect below watches the in-flight edge.
    const pendingAutoSubmitRef = useRef<string | null>(null)
    const hasInFlight = attachments.some(
        (a) => a.status === 'processing' || a.status === 'uploading' || a.status === 'pending' || a.status === 'ready',
    )
    const hasCompleted = attachments.some((a) => a.status === 'completed')
    const wasInFlightRef = useRef(false)
    useEffect(() => {
        if (wasInFlightRef.current && !hasInFlight && pendingAutoSubmitRef.current !== null) {
            const prompt = pendingAutoSubmitRef.current
            pendingAutoSubmitRef.current = null
            // Skip if everything failed / got removed — nothing to attach.
            if (hasCompleted) {
                // Defer one macrotask so the parent's `attachmentIdsRef`
                // sync effect (which runs AFTER child effects) lands first.
                // Without this, handleSend snapshots a stale/empty ref and
                // the BE receives no attachment_ids for this turn.
                const id = setTimeout(() => {
                    setInputText?.('')
                    handleSend(prompt)
                }, 0)
                wasInFlightRef.current = hasInFlight
                return () => clearTimeout(id)
            }
        }
        wasInFlightRef.current = hasInFlight
        // handleSend identity may change per render; we only want to fire
        // on the in-flight edge, so depend on that and the completion flag.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasInFlight, hasCompleted])

    const handleSendIntercepted = (text?: string) => {
        if (!attachmentsEnabled || !onAddAttachmentLink) {
            handleSend(text)
            return
        }
        const source = typeof text === 'string' ? text : (inputText ?? '')
        const extracted = extractAttachableUrls(source)
        if (extracted.length === 0) {
            handleSend(text)
            return
        }
        const remaining = stripUrlsFromText(source, extracted.map((u) => u.url))
        pendingAutoSubmitRef.current = remaining.trim() || 'Use this attachment as context for my trip.'
        // Keep the URL-stripped prompt visible in the input while the
        // attachment processes — auto-submit will fire it on completion.
        if (typeof text !== 'string') setInputText?.(remaining)
        extracted.forEach((u) => onAddAttachmentLink(u.url, u.kind))
    }

    return (
        <div className="flex flex-col gap-0">
            {/* Premium date shift picker */}
            <AnimatePresence>
                {showDatePicker && (
                    <DateShiftPicker
                        onConfirm={handleDateConfirm}
                        onCancel={() => setShowDatePicker(false)}
                    />
                )}
            </AnimatePresence>

            {/* Chip row — fade/slide in, no abrupt pop. The latest turn's
                follow-up chips take this slot when present; otherwise the
                default contextual starters render here. */}
            <AnimatePresence initial={false}>
                {(hasFollowUps || chips.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: 8, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                        {hasFollowUps ? (
                            // FollowUpActions (suggestion tone) owns its own
                            // insets — left margin + edge-to-edge mobile scroll.
                            <FollowUpActions
                                // Remount on a new chip set so the staggered
                                // entrance replays — the cue that suggestions
                                // refreshed for this turn.
                                key={followUps!.map((a) => a.cta).join('|')}
                                actions={followUps!}
                                tone="suggestion"
                                onAction={(action, idx) => onFollowUp?.(action, idx)}
                            />
                        ) : (
                            // ``pl-3.5`` to match the follow-up chips' ``pl-3.5``.
                            // (ActionChips no longer adds its own px, so the
                            // first starter chip lands at the same 14px.)
                            <div className="pl-3.5">
                                <ActionChips
                                    chips={chips}
                                    onChipTap={handleChipTap}
                                    disabled={isLoading}
                                />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Original input */}
            <ChatInputSection
                {...inputProps}
                inputText={inputText}
                setInputText={setInputText}
                handleSend={() => handleSendIntercepted()}
                isSearching={isSearching}
                isNewMessageLoading={isNewMessageLoading}
                isStreaming={isStreaming}
                onStop={onStop}
                attachments={attachments}
                onOpenAttachmentMenu={onOpenAttachmentMenu}
                onRemoveAttachment={onRemoveAttachment}
                sendBlockedByAttachments={sendBlockedByAttachments}
                attachmentMenuOpen={menuOpen}
            />

            {attachmentsEnabled && (
                <AttachmentMenu
                    open={menuOpen}
                    anchorRect={menuAnchorRect}
                    onClose={() => setMenuOpen(false)}
                    onPickFile={(file) => onAddAttachmentFile?.(file)}
                    onPickLink={(url, kind) => onAddAttachmentLink?.(url, kind)}
                />
            )}
        </div>
    )
}

export default SmartChatInput
