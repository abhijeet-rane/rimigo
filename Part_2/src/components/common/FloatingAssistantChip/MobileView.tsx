import { FormEvent, RefObject } from 'react'
import { motion } from 'framer-motion'
import { ArrowUp, ChevronRight, Keyboard, Loader2, Mic, Wand2, X } from 'lucide-react'
import AttachToggleIcon from '@/modules/AtaAgent/components/Chat/components/Attachments/AttachToggleIcon'
import { GRADIENT_ANIM, GRADIENT_STYLE, PURPLE_GRADIENT, SHADOW, VOICE_STATE_LABEL } from './constants'
import { cn } from '@/lib/utils'
import VoiceWaveform from './VoiceWaveform'
import VoiceCaption from './VoiceCaption'
import { AttachmentChips } from '@/modules/AtaAgent/components/Chat/components/Attachments/AttachmentChips'
import type { AttachmentDraft } from '@/modules/AtaAgent/types/Attachments'
import type { VoiceUiState } from './types'

interface Props {
    ariaLabel: string
    heading: string
    /** Override the launcher label text. */
    placeholder?: string
    query: string
    isFocused: boolean
    isLoadingView: boolean
    attachments: AttachmentDraft[]
    hasInFlightAttachments: boolean
    onRemoveAttachment: (id: string) => void
    onAttachClick: () => void
    attachBtnRef: RefObject<HTMLButtonElement | null>
    attachmentMenuOpen?: boolean
    /** Tap on input → opens the full assistant sheet (no inline typing on mobile). */
    onOpenAssistant: () => void
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

const MobileView: React.FC<Props> = ({
    ariaLabel,
    isLoadingView,
    attachments,
    onRemoveAttachment,
    onAttachClick,
    attachBtnRef,
    attachmentMenuOpen = false,
    onOpenAssistant,
    onSubmit,
    placeholder,
    voiceEnabled,
    voiceState,
    voiceCaption,
    onStartVoice,
    onVoiceKeyboard,
    onVoiceClose,
}) => {
    const isVoiceActive = voiceState !== 'idle'

    // ── Voice mode: full-width purple panel ──
    if (isVoiceActive) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto relative w-full overflow-hidden px-4 pb-4 pt-3.5"
                style={{ boxShadow: `0 -10px 30px ${SHADOW.darkMed}` }}
            >
                <motion.span className="absolute inset-0" style={GRADIENT_STYLE} {...GRADIENT_ANIM} />

                <div className="relative z-10 flex items-center gap-3">
                    {/* End voice */}
                    <button
                        type="button"
                        onClick={onVoiceClose}
                        aria-label="End voice"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-grey-0 active:scale-95 transition-transform"
                    >
                        <X className="h-5 w-5" strokeWidth={2.5} />
                    </button>

                    {/* State + caption + waveform */}
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                        <span className="font-red-hat-display text-[14px] font-semibold text-white">
                            {VOICE_STATE_LABEL[voiceState]}
                        </span>
                        {voiceCaption && (
                            <VoiceCaption
                                text={voiceCaption}
                                className="w-full text-center font-manrope text-[12px] font-medium leading-[16px] text-white/80"
                            />
                        )}
                        <VoiceWaveform state={voiceState} color="#ffffff" height={20} />
                    </div>

                    {/* Switch to typing */}
                    <button
                        type="button"
                        onClick={onVoiceKeyboard}
                        aria-label="Switch to keyboard"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm active:scale-95 transition-transform"
                    >
                        <Keyboard className="h-5 w-5" strokeWidth={2.25} />
                    </button>
                </div>
            </motion.div>
        )
    }

    // ── Text mode: read-only input bar (tap → opens assistant sheet) ──
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto w-full bg-white px-3 pb-3 pt-3"
            style={{ boxShadow: `0 -10px 30px ${SHADOW.darkSoft}` }}>

            {attachments.length > 0 && (
                <div className="-mx-3 mb-2">
                    <AttachmentChips attachments={attachments} onRemove={onRemoveAttachment} />
                </div>
            )}

            <form
                onSubmit={onSubmit}
                className="flex w-full items-center gap-2">

                {/* Launcher — NOT a text field. Tap → opens the chat sheet.
                    Rendered as a button (with a trailing chevron) so it reads
                    as "tap to open", not "type here". */}
                <div className="relative min-w-0 flex-1">
                    <motion.span
                        aria-hidden
                        className="absolute inset-0 rounded-full"
                        style={GRADIENT_STYLE}
                        {...GRADIENT_ANIM}
                    />
                    <button
                        type="button"
                        onClick={onOpenAssistant}
                        aria-label={ariaLabel}
                        className="relative m-[1.5px] flex min-h-[44px] w-[calc(100%-3px)] items-center gap-2 rounded-full bg-white px-4 py-2.5 text-left cursor-pointer"
                    >
                        <Wand2
                            className="h-4 w-4 shrink-0 text-primary-default"
                            strokeWidth={2.25}
                        />
                        <span className="min-w-0 flex-1 truncate font-manrope text-[13px] font-medium text-grey-2">
                            {isLoadingView ? 'Loading' : (placeholder || 'Edit anything in your itinerary')}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-grey-3" strokeWidth={2.25} />
                    </button>
                </div>

                {/* Attach (left of arrow). */}
                <button
                    ref={attachBtnRef}
                    type="button"
                    data-attachment-trigger
                    aria-label="Attach a reel, video, or document"
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onAttachClick()
                    }}
                    className={cn(
                        'shrink-0 h-10 w-10 rounded-full flex items-center justify-center',
                        'border border-grey-4 bg-white text-grey-1',
                        'active:scale-95 active:bg-primary-light/15 transition-all duration-150',
                    )}>
                    <AttachToggleIcon open={attachmentMenuOpen} size={16} strokeWidth={2.25} />
                </button>

                {/* Right-hand action: a branded voice button for voice-enabled
                    users (distinct from the text field so it reads as "talk to
                    the assistant", not dictation), else the open-assistant arrow. */}
                {voiceEnabled ? (
                    <button
                        type="button"
                        onClick={onStartVoice}
                        aria-label="Talk to your trip"
                        className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-white active:scale-95 transition-transform"
                        style={{ backgroundImage: PURPLE_GRADIENT }}
                    >
                        {/* Soft pulse ring — signals a live voice affordance. */}
                        <motion.span
                            aria-hidden
                            className="absolute inset-0 rounded-full bg-white/30"
                            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <Mic className="relative h-[18px] w-[18px]" strokeWidth={2.25} />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onOpenAssistant}
                        aria-label="Open assistant"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-default text-white transition-colors">
                        {isLoadingView ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <ArrowUp
                                className="h-4 w-4"
                                strokeWidth={2.5}
                            />
                        )}
                    </button>
                )}
            </form>
        </motion.div>
    )
}

export default MobileView
