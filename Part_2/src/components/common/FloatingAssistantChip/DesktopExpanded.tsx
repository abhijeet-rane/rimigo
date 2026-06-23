import { FormEvent, RefObject } from 'react'
import { motion } from 'framer-motion'
import { ArrowUp, ExternalLink, Keyboard, Loader2, Mic, Minimize2, Sparkles, Wand2, X } from 'lucide-react'
import AttachToggleIcon from '@/modules/AtaAgent/components/Chat/components/Attachments/AttachToggleIcon'
import { cn } from '@/lib/utils'
import { GRADIENT_ANIM, GRADIENT_STYLE, SHADOW, VOICE_STATE_LABEL } from './constants'
import SuggestionChips from './SuggestionChips'
import VoiceWaveform from './VoiceWaveform'
import VoiceCaption from './VoiceCaption'
import { AttachmentChips } from '@/modules/AtaAgent/components/Chat/components/Attachments/AttachmentChips'
import type { AttachmentDraft } from '@/modules/AtaAgent/types/Attachments'
import type { VoiceUiState } from './types'

interface Props {
    heading: string
    suggestions: string[]
    query: string
    isFocused: boolean
    isLoadingView: boolean
    inputRef: RefObject<HTMLInputElement | null>
    attachments: AttachmentDraft[]
    hasInFlightAttachments: boolean
    onRemoveAttachment: (id: string) => void
    onAttachClick: () => void
    attachBtnRef: RefObject<HTMLButtonElement | null>
    attachmentMenuOpen?: boolean
    onMouseEnter: () => void
    onMouseLeave: () => void
    onClose: (e: React.MouseEvent) => void
    onOpenAssistant: () => void
    onChipClick: (chip: string) => void
    onSubmit: (e?: FormEvent) => void
    onQueryChange: (value: string) => void
    onFocus: () => void
    onBlur: () => void
    // Voice
    voiceEnabled: boolean
    voiceState: VoiceUiState
    voiceCaption: string
    onStartVoice: () => void
    onVoiceKeyboard: () => void
    onVoiceClose: () => void
}

/** Expanded typing card: banner + chips + [input] [paperclip] [arrow]. */
const DesktopExpanded: React.FC<Props> = ({
    heading,
    suggestions,
    query,
    isFocused,
    isLoadingView,
    inputRef,
    attachments,
    hasInFlightAttachments,
    onRemoveAttachment,
    onAttachClick,
    attachBtnRef,
    attachmentMenuOpen = false,
    onMouseEnter,
    onMouseLeave,
    onClose,
    onOpenAssistant,
    onChipClick,
    onSubmit,
    onQueryChange,
    onFocus,
    onBlur,
    voiceEnabled,
    voiceState,
    voiceCaption,
    onStartVoice,
    onVoiceKeyboard,
    onVoiceClose,
}) => {
    const hasQuery = query.trim().length > 0
    const sendDisabled = !hasQuery || isLoadingView || hasInFlightAttachments
    const isVoiceActive = voiceState !== 'idle'

    return (
        <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 30, scale: 0.4, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 24, scale: 0.5, x: '-50%' }}
            transition={{
                duration: 0.85,
                ease: [0.16, 1, 0.3, 1],
                scale: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
                y: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="pointer-events-auto absolute bottom-[10px] left-1/2 w-[min(560px,100%)] overflow-visible rounded-[20px]"
            style={{
                boxShadow: `0 24px 60px ${SHADOW.darkHeavy}, 0 10px 24px ${SHADOW.darkSoft}`,
                transformOrigin: 'bottom center',
            }}
        >
            <div className="relative overflow-hidden rounded-[20px]">
                {/* Outer purple gradient frame */}
                <motion.span className="absolute inset-0" style={GRADIENT_STYLE} {...GRADIENT_ANIM} />

                {/* Top banner: [Close]   heading   [View chat] */}
                <div className="relative z-10 flex items-center justify-between gap-2 px-2 pt-2 pb-2">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-7 shrink-0 items-center gap-1 rounded-md bg-white/15 px-2.5 font-manrope text-[12px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25 cursor-pointer"
                    >
                        <Minimize2 className="h-3.5 w-3.5" />
                        <span>Close</span>
                    </button>

                    <div className="flex items-center gap-1.5 text-white">
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                        <span className="whitespace-nowrap font-red-hat-display text-[13px] font-semibold italic tracking-[-0.1px]">
                            {heading}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={onOpenAssistant}
                        aria-label="View chat"
                        className="flex h-7 shrink-0 items-center gap-1 rounded-md bg-white/15 px-2.5 font-manrope text-[12px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25 cursor-pointer"
                    >
                        <span>View chat</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Inner white card */}
                <div className="relative z-10 mx-[4px] mb-[4px] rounded-[18px] bg-white px-3 pb-3 pt-3">
                    <SuggestionChips suggestions={suggestions} visible={!isLoadingView} onChipClick={onChipClick} />

                    {/* Staged attachments. Reset AttachmentChips' baked-in padding. */}
                    {!isVoiceActive && attachments.length > 0 && (
                        <div className="mt-2 mb-2 [&>div]:!px-0 [&>div]:!pt-0 [&>div]:gap-1.5">
                            <AttachmentChips attachments={attachments} onRemove={onRemoveAttachment} />
                        </div>
                    )}

                    {isVoiceActive ? (
                        /* ── Voice mode: caption + waveform + controls ── */
                        <div className="flex items-center gap-2">
                            <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-[16px] bg-primary-light/15 px-4 py-2.5">
                                <div className="flex items-center gap-1.5">
                                    <motion.span
                                        className="h-1.5 w-1.5 rounded-full bg-primary-default"
                                        animate={{ opacity: [1, 0.3, 1] }}
                                        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                                    />
                                    <span className="font-manrope text-[11px] font-bold uppercase tracking-[0.08em] text-primary-default">
                                        {VOICE_STATE_LABEL[voiceState]}
                                    </span>
                                </div>
                                <VoiceCaption
                                    text={voiceCaption}
                                    placeholder="Say something about your trip…"
                                    className="min-h-[18px] font-manrope text-[13px] font-medium leading-[18px] text-grey-1"
                                />
                                <VoiceWaveform state={voiceState} height={22} className="mt-1" />
                            </div>

                            {/* Switch back to typing */}
                            <button
                                type="button"
                                onClick={onVoiceKeyboard}
                                aria-label="Switch to keyboard"
                                title="Type instead"
                                className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center border border-grey-4 bg-white text-grey-1 hover:text-primary-default hover:border-primary-default/40 hover:bg-primary-light/15 active:scale-95 transition-all duration-150"
                            >
                                <Keyboard className="h-4 w-4" strokeWidth={2.25} />
                            </button>

                            {/* End voice */}
                            <button
                                type="button"
                                onClick={onVoiceClose}
                                aria-label="End voice"
                                title="End voice"
                                className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-grey-0 text-white hover:bg-grey-1 active:scale-95 transition-all duration-150"
                            >
                                <X className="h-4 w-4" strokeWidth={2.5} />
                            </button>
                        </div>
                    ) : (
                        /* ── Text mode: [input pill] [paperclip] [send-arrow] ── */
                        <form onSubmit={onSubmit} className="flex items-center gap-2">
                            <div
                                className={cn(
                                    'flex flex-1 items-center gap-2 rounded-full border bg-white py-2 pl-4',
                                    voiceEnabled ? 'pr-1.5' : 'pr-4',
                                    isFocused && !isLoadingView ? 'border-primary-default' : 'border-grey-4'
                                )}
                            >
                                {isLoadingView ? (
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary-default" />
                                ) : (
                                    <Wand2 className="h-4 w-4 shrink-0 text-primary-default" />
                                )}
                                {!isLoadingView && !hasQuery && (
                                    <motion.span
                                        aria-hidden
                                        className="inline-block h-4 w-[2px] shrink-0 rounded-sm bg-primary-default"
                                        animate={{ opacity: [1, 1, 0, 0] }}
                                        transition={{ duration: 1.1, repeat: Infinity, ease: 'linear', times: [0, 0.5, 0.5, 1] }}
                                    />
                                )}
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={isLoadingView ? '' : query}
                                    onChange={(e) => onQueryChange(e.target.value)}
                                    onFocus={onFocus}
                                    onBlur={onBlur}
                                    placeholder={isLoadingView ? 'Loading' : 'Ask anything about your itinerary'}
                                    disabled={isLoadingView}
                                    className="flex-1 bg-transparent font-manrope text-[14px] font-medium text-grey-0 placeholder:text-grey-3 placeholder:font-normal focus:outline-none disabled:cursor-wait"
                                />
                                {/* Mic — starts a voice session (internal users only). */}
                                {voiceEnabled && (
                                    <button
                                        type="button"
                                        onClick={onStartVoice}
                                        disabled={isLoadingView}
                                        aria-label="Talk to your trip"
                                        title="Talk to your trip"
                                        className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-primary-light/20 text-primary-default hover:bg-primary-light/35 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Mic className="h-4 w-4" strokeWidth={2.25} />
                                    </button>
                                )}
                            </div>

                            {/* Attach (outside the input). */}
                            <button
                                ref={attachBtnRef}
                                type="button"
                                data-attachment-trigger
                                aria-label="Attach a reel, video, or document"
                                disabled={isLoadingView}
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onAttachClick()
                                }}
                                title="Add a reel, video, PDF, or spreadsheet"
                                className={cn(
                                    'shrink-0 h-10 w-10 rounded-full flex items-center justify-center',
                                    'border border-grey-4 bg-white text-grey-1',
                                    'hover:text-primary-default hover:border-primary-default/40 hover:bg-primary-light/15',
                                    'active:scale-95 transition-all duration-150',
                                    'disabled:opacity-40 disabled:cursor-not-allowed',
                                )}
                            >
                                <AttachToggleIcon open={attachmentMenuOpen} size={16} strokeWidth={2.25} />
                            </button>

                            {/* Send arrow (replaces "Ask" pill). */}
                            <button
                                type="submit"
                                aria-label="Send query"
                                disabled={sendDisabled}
                                className={cn(
                                    'shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-colors',
                                    sendDisabled
                                        ? 'bg-grey-4 text-grey-2 cursor-default'
                                        : 'bg-primary-default text-white hover:bg-primary-dark cursor-pointer',
                                )}
                                style={!sendDisabled ? { boxShadow: `0 6px 14px ${SHADOW.defaultSoft}` } : undefined}
                            >
                                {isLoadingView ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

export default DesktopExpanded
