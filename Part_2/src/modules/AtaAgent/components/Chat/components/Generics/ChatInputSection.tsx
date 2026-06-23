import React, { useEffect, useRef, useState } from 'react'
import { ArrowUp, Wand2, Square, Loader2 } from 'lucide-react'
import AttachToggleIcon from '@/modules/AtaAgent/components/Chat/components/Attachments/AttachToggleIcon'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'

import { TypingAnimation } from '@/components/ui/typing-animation'

import { AttachmentChips } from '@/modules/AtaAgent/components/Chat/components/Attachments/AttachmentChips'
import type { AttachmentDraft } from '@/modules/AtaAgent/types/Attachments'

type ChatTextareaRef = React.RefObject<HTMLTextAreaElement> | React.RefObject<HTMLTextAreaElement | null> | null

const CHAR_LIMIT = 12000
const COUNTER_VISIBLE_AT = Math.floor(CHAR_LIMIT * 0.8) // 9600
const COUNTER_AMBER_AT = Math.floor(CHAR_LIMIT * 0.9) // 10800

interface ChatInputSectionProps {
    inputText: string
    setInputText: (value: string) => void
    handleSend: () => void
    isSearching: boolean
    isNewMessageLoading: boolean
    placeholder: string
    inputRef?: ChatTextareaRef
    variant?: 'default' | 'experience' | 'floating'
    placeholderCycle?: string[]
    disclaimerText?: string
    onContainerClick?: () => void
    readOnly?: boolean
    onInputFocus?: () => void
    /** When true, the send button becomes a stop button, textarea is
     *  disabled with its current value preserved, and Enter does nothing.
     *  Used by the itinerary concierge to give a Claude-web-style "stop
     *  generating" affordance in place of the send control. */
    isStreaming?: boolean
    /** Called when the user clicks the stop button (only when
     *  ``isStreaming`` is true). */
    onStop?: () => void

    // ---- Tripboard AI Assistant attachments support (optional) ----
    /** Pending attachments to render as chips above the textarea. */
    attachments?: AttachmentDraft[]
    /** Open the attachment picker. When provided, a `+` button appears. */
    onOpenAttachmentMenu?: (anchorRect: DOMRect) => void
    /** Remove an attachment chip. */
    onRemoveAttachment?: (localId: string) => void
    /** When false, send is gated even though `inputText` is non-empty
     *  (e.g. an attachment is still uploading/processing). */
    sendBlockedByAttachments?: boolean
    /** Drives the +/× rotation on the attach button. */
    attachmentMenuOpen?: boolean
}

const FLOATING_PLACEHOLDER_INTERVAL_MS = 2700

const sanitizePastedText = (current: string, incoming: string): string => {
    const projected = current + incoming
    if (projected.length <= CHAR_LIMIT) return projected
    toast.message(`Trimmed to ${CHAR_LIMIT.toLocaleString()} characters.`)
    return projected.slice(0, CHAR_LIMIT)
}

const CharCounter: React.FC<{ length: number }> = ({ length }) => {
    if (length < COUNTER_VISIBLE_AT) return null
    const colour =
        length >= CHAR_LIMIT
            ? 'text-red-600'
            : length >= COUNTER_AMBER_AT
                ? 'text-amber-600'
                : 'text-grey_2'
    return (
        <span className={`text-[11px] tabular-nums ${colour}`}>
            {length.toLocaleString()}/{CHAR_LIMIT.toLocaleString()}
        </span>
    )
}

const ChatInputSection: React.FC<ChatInputSectionProps> = ({
    inputText,
    setInputText,
    handleSend,
    isSearching,
    isNewMessageLoading,
    placeholder,
    inputRef,
    variant = 'default',
    placeholderCycle,
    disclaimerText,
    onContainerClick,
    readOnly = false,
    onInputFocus,
    isStreaming = false,
    onStop,
    attachments = [],
    onOpenAttachmentMenu,
    onRemoveAttachment,
    sendBlockedByAttachments = false,
    attachmentMenuOpen = false,
}) => {
    const canSend =
        Boolean(inputText.trim()) &&
        !isSearching &&
        !isNewMessageLoading &&
        !isStreaming &&
        !sendBlockedByAttachments
    const effectiveReadOnly = readOnly || isStreaming
    // When streaming, clicking the action button aborts the turn instead
    // of sending a new one; pressing Enter is a no-op (input disabled).
    const handlePrimaryAction = isStreaming ? (onStop ?? (() => undefined)) : handleSend
    const textareaRef = (inputRef ?? undefined) as React.RefObject<HTMLTextAreaElement>
    const plusBtnRef = useRef<HTMLButtonElement>(null)
    const defaultPlaceholderWords = [
        '“Can I bring my dog along?”',
        '“What time should I arrive for sunset?”',
        '“Is there a fast-track option?”',
        '“Do they allow wheelchairs?”'
    ]

    const placeholderWords = placeholderCycle && placeholderCycle.length > 0 ? placeholderCycle : defaultPlaceholderWords

    const [floatingPlaceholderIndex, setFloatingPlaceholderIndex] = useState(0)

    useEffect(() => {
        if (variant !== 'floating' || inputText.trim()) return
        const id = window.setInterval(() => {
            setFloatingPlaceholderIndex((i) => (i + 1) % placeholderWords.length)
        }, FLOATING_PLACEHOLDER_INTERVAL_MS)
        return () => clearInterval(id)
    }, [variant, inputText, placeholderWords.length])

    // Initialise textarea height from content so the first keystroke
    // doesn't trigger a sudden visual jump from the browser default
    // (rows=1) up to the auto-resize ``scrollHeight``.
    const maxHeight = variant === 'experience' || variant === 'floating' ? 120 : 60
    useEffect(() => {
        const ta = textareaRef?.current
        if (!ta) return
        ta.style.height = 'auto'
        ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`
    }, [inputText, maxHeight, textareaRef])

    const showPlus = typeof onOpenAttachmentMenu === 'function'
    const onPlusClick = () => {
        if (!plusBtnRef.current || !onOpenAttachmentMenu) return
        onOpenAttachmentMenu(plusBtnRef.current.getBoundingClientRect())
    }

    if (variant === 'experience' || variant === 'floating') {
        const isFloating = variant === 'floating'

        const innerInput = (
            <div
                className={`relative flex-1 ${
                    isFloating
                        ? 'z-[1] rounded-[14px] min-h-[52px] px-4 py-3 pr-14 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]'
                        : 'bg-white border border-violet-200/50 rounded-[14px] min-h-[56px] px-4 py-3 pr-15'
                }`}>
                <Wand2
                    className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${
                        isFloating ? 'left-4 w-4 h-4 text-primary-default/70' : 'left-3 w-5 text-violet-400 font-medium'
                    }`}
                />

                <textarea
                    ref={textareaRef}
                    className={`relative z-10 w-full font-medium bg-transparent outline-none resize-none ${
                        isFloating ? 'pl-7 pr-11 text-[16px] text-left text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis' : 'pl-7 pr-2 text-[16px] text-grey_0'
                    } ${isStreaming ? 'opacity-60' : ''}`}
                    placeholder=""
                    value={inputText}
                    onChange={(e) => {
                        if (isStreaming) return
                        setInputText(e.target.value)
                        e.target.style.height = 'auto'
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                    }}
                    onPaste={(e) => {
                        const pasted = e.clipboardData.getData('text')
                        if (!pasted) return
                        const merged = sanitizePastedText(inputText, pasted)
                        if (merged !== inputText + pasted) {
                            e.preventDefault()
                            setInputText(merged)
                        }
                    }}
                    onFocus={onInputFocus}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            if (isStreaming) return
                            handleSend()
                        }
                    }}
                    readOnly={effectiveReadOnly}
                    maxLength={CHAR_LIMIT}
                    rows={1}
                    style={{ minHeight: '20px', maxHeight: '120px' }}
                />

                {!isFloating && !inputText.trim() && (
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 text-base italic text-grey-2 pointer-events-none tracking-[-0.02em] leading-5 font-medium font-manrope">
                        <TypingAnimation
                            words={placeholderWords}
                            loop
                            className="inline"
                        />
                    </span>
                )}

                {isFloating && !inputText.trim() && (
                    <span
                        className="pointer-events-none absolute left-11 right-14 top-0 bottom-0 z-[5] flex items-center overflow-hidden"
                        aria-hidden>
                        <AnimatePresence
                            mode="wait"
                            initial={false}>
                            <motion.span
                                key={floatingPlaceholderIndex}
                                initial={{ y: 8, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -8, opacity: 0 }}
                                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                                className="absolute left-0 right-0 top-1/2 block -translate-y-1/2 truncate text-left text-[14px] font-medium italic text-grey-2 font-manrope">
                                {placeholderWords[floatingPlaceholderIndex]}
                            </motion.span>
                        </AnimatePresence>
                    </span>
                )}

                <button
                    type="button"
                    aria-label={isStreaming ? 'Stop generating' : 'Send message'}
                    // Stop state = inverse of send's colour so the two
                    // states are unambiguous but still feel native to the
                    // theme. Floating send is primary → stop flips to
                    // grey_0. Experience send is grey_0 → stop flips to
                    // primary-default.
                    className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-200 ${
                        isFloating
                            ? `right-2 h-8 w-8 rounded-lg ${
                                  isStreaming
                                      ? 'bg-grey-0 text-white hover:bg-grey-1'
                                      : canSend
                                          ? 'bg-primary-default text-white hover:opacity-90'
                                          : 'bg-primary-default-12 text-primary-default/35'
                              }`
                            : `right-3 h-[42px] w-[42px] rounded-xl ${
                                  isStreaming
                                      ? 'bg-primary-default text-white hover:opacity-90'
                                      : canSend
                                          ? 'bg-grey-0 text-white hover:bg-grey-1'
                                          : 'bg-grey-4 text-white'
                              }`
                    }`}
                    onClick={handlePrimaryAction}
                    disabled={isStreaming ? !onStop : !canSend}>
                    {isStreaming ? (
                        <Square className={isFloating ? 'h-3 w-3' : 'h-3.5 w-3.5'} fill="currentColor" strokeWidth={0} />
                    ) : (
                        <ArrowUp className={isFloating ? 'h-4 w-4' : 'h-5 w-5'} />
                    )}
                </button>
            </div>
        )

        return (
            <div
                className={`${isFloating ? '' : 'py-3 px-3 flex flex-col gap-3'}`}
                onClick={onContainerClick}
                style={
                    !isFloating
                        ? {
                              background:
                                  'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(99,102,241,0.03) 50%, rgba(168,85,247,0.05) 100%)',
                              boxShadow: '0 0 14px 3px rgba(139,92,246,0.08), 0 0 28px 6px rgba(99,102,241,0.04)',
                              borderRadius: '16px'
                          }
                        : undefined
                }>
                {showPlus && attachments.length > 0 && (
                    <AttachmentChips
                        attachments={attachments}
                        onRemove={onRemoveAttachment ?? (() => undefined)}
                    />
                )}
                <div className={`flex items-center gap-2 ${isFloating ? 'w-full' : ''}`}>
                    {showPlus && (
                        <button
                            ref={plusBtnRef}
                            type="button"
                            data-attachment-trigger
                            aria-label="Add attachment"
                            onClick={onPlusClick}
                            className={
                                isFloating
                                    ? 'shrink-0 h-9 w-9 rounded-xl bg-white border border-grey_4 hover:bg-grey_5 hover:border-primary-default/30 text-grey_1 hover:text-primary-default flex items-center justify-center transition-all shadow-[0_1px_3px_rgba(15,23,42,0.06)]'
                                    : 'shrink-0 h-[42px] w-[42px] rounded-xl bg-white/80 hover:bg-white border border-violet-200/60 hover:border-violet-400 text-violet-500 flex items-center justify-center transition-colors'
                            }
                        >
                            <AttachToggleIcon open={attachmentMenuOpen} size={isFloating ? 16 : 18} strokeWidth={2.25} />
                        </button>
                    )}
                    {isFloating ? (
                        <div className="itinerary-floating-input-animated-border flex min-w-0 flex-1 rounded-2xl">
                            {innerInput}
                        </div>
                    ) : (
                        innerInput
                    )}
                </div>

                {!isFloating && (
                    <div className="flex items-center justify-center gap-3">
                        <p className="text-center text-xs text-grey-1 tracking-[-0.02em] leading-[18px] font-semibold font-manrope">
                            {disclaimerText ?? 'This AI may make mistakes, please verify key details.'}
                        </p>
                        <CharCounter length={inputText.length} />
                    </div>
                )}
            </div>
        )
    }
    return (
        <div className="z-10">
            {showPlus && attachments.length > 0 && (
                <AttachmentChips
                    attachments={attachments}
                    onRemove={onRemoveAttachment ?? (() => undefined)}
                />
            )}
            <div className="px-4 pt-2 pb-0.5">
                <div
                    className={`flex flex-col gap-2.5 rounded-[16px] border bg-white px-3.5 pt-3 pb-2.5 transition-colors ${
                        isStreaming ? 'border-primary-default/40' : 'border-primary-default'
                    }`}
                    onClick={onContainerClick}
                >
                    {/* Row 1 — full-width textarea */}
                    <textarea
                        ref={textareaRef}
                        // Mobile 16px / desktop 14px — matches the chat message
                        // text. 16px on mobile also sidesteps iOS Safari's
                        // focus-zoom on inputs whose font-size is < 16px.
                        className={`w-full bg-transparent text-[16px] md:text-[14px] font-[400] font-manrope text-grey_0 placeholder:text-grey-2 outline-none resize-none px-1 ${
                            isStreaming ? 'opacity-60' : ''
                        }`}
                        placeholder={isStreaming ? 'Responding…' : placeholder}
                        value={inputText}
                        onChange={(e) => {
                            if (isStreaming) return
                            setInputText(e.target.value)
                            e.target.style.height = 'auto'
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                        }}
                        onPaste={(e) => {
                            const pasted = e.clipboardData.getData('text')
                            if (!pasted) return
                            const merged = sanitizePastedText(inputText, pasted)
                            if (merged !== inputText + pasted) {
                                e.preventDefault()
                                setInputText(merged)
                            }
                        }}
                        onFocus={onInputFocus}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                if (isStreaming) return
                                handleSend()
                            }
                        }}
                        readOnly={effectiveReadOnly}
                        maxLength={CHAR_LIMIT}
                        rows={1}
                        style={{ minHeight: '24px', maxHeight: '120px' }}
                    />

                    {/* Row 2 — control row */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            {showPlus && (
                                <button
                                    ref={plusBtnRef}
                                    type="button"
                                    data-attachment-trigger
                                    aria-label="Add attachment"
                                    onClick={onPlusClick}
                                    className="h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-[12px] flex items-center justify-center border border-grey-4 bg-white text-grey-1 hover:bg-grey_5 hover:text-primary-default active:scale-95 transition-all duration-150"
                                >
                                    <AttachToggleIcon open={attachmentMenuOpen} size={16} strokeWidth={2.25} />
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            aria-label={isStreaming ? 'Stop generating' : 'Send message'}
                            className={`h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-[12px] flex items-center justify-center transition-colors ${
                                isStreaming
                                    ? 'bg-primary-default text-white hover:opacity-90'
                                    : canSend
                                        ? 'bg-primary-default text-white hover:opacity-90'
                                        : 'bg-grey-4 text-white cursor-default'
                            }`}
                            onClick={handlePrimaryAction}
                            disabled={isStreaming ? !onStop : !canSend}
                        >
                            {isStreaming ? (
                                <Square size={12} fill="currentColor" strokeWidth={0} />
                            ) : isNewMessageLoading || isSearching ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <ArrowUp className="h-4 w-4 md:h-[18px] md:w-[18px]" strokeWidth={2.5} />
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer — subtle AI disclaimer centered beneath the composer,
                    with the char counter floated right so it never crowds the
                    caption (the counter only surfaces near the limit). */}
                <div className="relative flex items-center justify-center py-0.5">
                    <p className="px-2 text-center text-[8px] font-[400] leading-[15px] tracking-[-0.01em] text-grey-2 font-manrope">
                        {disclaimerText ?? 'Rimigo is AI and can make mistakes. Please double-check responses.'}
                    </p>
                    <div className="absolute right-1 top-0.5">
                        <CharCounter length={inputText.length} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ChatInputSection
