export type ChipState = 'collapsed' | 'expanded' | 'loading'

/**
 * Voice session state mirrored into the chip. 'idle' = no voice session; any
 * other value puts the chip into voice mode. Kept as a local union (rather than
 * importing from the voice hook) so the chip stays presentation-only.
 */
export type VoiceUiState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking'

/** Mirrors BE `attachments_summary` shape; renders chips on the user bubble. */
export interface AttachmentSummary {
    attachment_id: string
    kind: string
    title: string | null
    source_url: string | null
    filename: string | null
}

export type TrackButtonClick = (params: {
    button_name: string
    location: string
    extra: Record<string, unknown>
}) => void

export interface FloatingAssistantChipProps {
    isMobile: boolean
    showWand: boolean

    /** @deprecated — internal state machine controls expansion now. Kept for API compat. */
    showInput?: boolean
    /** @deprecated — kept for API compat. */
    showPlaceholder?: boolean
    /** @deprecated — kept for API compat. */
    isClosing?: boolean

    /** Pre-formatted placeholder string to display in the collapsed pill (include quotes if desired). */
    currentPlaceholder: string
    /** Key for AnimatePresence cycling animation. */
    placeholderIndex: number

    onClick: () => void
    /** Submit handler — forwards query + staged attachments. */
    onSubmit?: (
        query: string,
        attachmentIds?: string[],
        attachmentsSummary?: AttachmentSummary[],
    ) => void
    /** Active trip id — binds chip uploads to this trip. */
    tripId?: string | null
    /** Existing chat thread → strip shows "View chat" affordance. */
    hasExistingThread?: boolean

    /** Quick-question chips shown in expanded state. */
    suggestions?: string[]
    /** Longer prompts that cycle inside the collapsed pill (auto-rotate). */
    pillPrompts?: string[]
    /** Heading pill text shown above the input in expanded state. */
    heading?: string
    /** External loading state (e.g. while query is being sent). */
    isLoading?: boolean

    trackButtonClick?: TrackButtonClick
    ariaLabel?: string
    /** Override the default container positioning class. */
    className?: string
    /** ms before auto-expanding from collapsed → expanded on mount. */
    autoExpandDelayMs?: number
    /** ms of inactivity in expanded state before auto-collapsing. */
    autoCollapseDelayMs?: number

    /** Verb shown in the desktop pill prefix and mobile placeholder. */
    ctaVerb?: string
    /** Override the mobile read-only input placeholder text. */
    mobilePlaceholder?: string
    /**
     * Mobile only: when true (the page is scrolled / chrome collapsed), the
     * chip shrinks from the full input bar to a compact "Continue editing"
     * pill to free up viewing space. Crossfades back when false.
     */
    collapsed?: boolean
    /**
     * When true, force the chip to start in the expanded state on mount and
     * bypass the dismissed-on-existing-thread guard. Used right after a new
     * tripboard is created so the assistant pops open automatically.
     */
    forceExpandOnMount?: boolean

    // ── Voice mode ──────────────────────────────────────────────────────────
    // The chip is presentation-only for voice: the parent owns the voice
    // session (via useVoiceChat) and feeds state + caption down, and the chip
    // calls back when the user starts/stops voice.
    /** Show the mic entry point. Caller gates this (e.g. internal users only). */
    voiceEnabled?: boolean
    /** Current voice session state; 'idle' = not in voice mode. */
    voiceState?: VoiceUiState
    /** Latest transcript line to show inside the voice box. */
    voiceCaption?: string
    /** User tapped the mic — start a voice session. */
    onStartVoice?: () => void
    /** User exited voice (keyboard toggle or close). */
    onStopVoice?: () => void
}
