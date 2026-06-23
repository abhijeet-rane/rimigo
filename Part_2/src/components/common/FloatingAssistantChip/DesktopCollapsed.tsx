import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, Mic, Wand2 } from 'lucide-react'
import { GRADIENT_ANIM, GRADIENT_STYLE, SHADOW } from './constants'

interface Props {
    ariaLabel: string
    cycledPlaceholder: string
    cyclePlaceholderKey: string
    /** Switches from cycling attention pill to quieter "tap to chat" pill. */
    dismissed: boolean
    /** A saved conversation thread exists for this surface. */
    hasExistingThread: boolean
    /** Verb shown before the cycling prompt, e.g. "Edit:" or "Ask:". */
    ctaVerb?: string
    onClick: () => void
    onMouseEnter: () => void
    onMouseLeave: () => void
    /** Show the mic entry point on the collapsed pill. */
    voiceEnabled?: boolean
    /** Mic tapped — start a voice session. */
    onStartVoice?: () => void
}

/** Small round mic button embedded in the collapsed pill / strip. */
const CollapsedMic: React.FC<{ onStartVoice?: () => void }> = ({ onStartVoice }) => (
    <button
        type="button"
        aria-label="Talk to your trip"
        title="Talk to your trip"
        onClick={(e) => {
            e.stopPropagation()
            onStartVoice?.()
        }}
        className="relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-white/25 text-white transition-colors hover:bg-white/40 cursor-pointer"
    >
        <Mic className="h-3 w-3" strokeWidth={2.5} />
    </button>
)

const DesktopCollapsed: React.FC<Props> = ({
    ariaLabel,
    cycledPlaceholder,
    cyclePlaceholderKey,
    dismissed,
    hasExistingThread,
    ctaVerb = 'Edit',
    onClick,
    onMouseEnter,
    onMouseLeave,
    voiceEnabled = false,
    onStartVoice,
}) => {
    // Dismissed + thread → wide "Continue editing" strip with View chat pill.
    if (dismissed && hasExistingThread) {
        return (
            <motion.div
                key="collapsed-thread"
                // Delay until popup's exit clears to avoid View-chat flicker.
                initial={{ opacity: 0, y: 6, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 6, x: '-50%' }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: 0.45 }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onClick={onClick}
                role="button"
                tabIndex={0}
                aria-label={ariaLabel}
                className="pointer-events-auto absolute bottom-[5px] left-1/2 flex h-[38px] w-fit max-w-[92vw] items-center gap-3 overflow-hidden rounded-t-full rounded-b-none pl-3.5 pr-1 text-white cursor-pointer"
                style={{
                    boxShadow: `0 -10px 28px ${SHADOW.dark}, 0 0 30px ${SHADOW.defaultSoft}`,
                    transformOrigin: 'bottom center',
                }}>
                <motion.span
                    className="absolute inset-0"
                    style={GRADIENT_STYLE}
                    {...GRADIENT_ANIM}
                />

                <div className="relative z-10 flex min-w-0 items-center gap-1.5">
                    <Wand2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate font-red-hat-display text-[13px] font-semibold tracking-[-0.1px]">
                        Continue editing your itinerary with AI
                    </span>
                </div>

                <div className="relative z-10 mr-2 flex shrink-0 items-center gap-2">
                    {voiceEnabled && <CollapsedMic onStartVoice={onStartVoice} />}
                    {/* Same "View chat" pill as the popup banner. */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onClick()
                        }}
                        aria-label="View chat"
                        className="flex h-[26px] shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 font-manrope text-[12px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/30 cursor-pointer">
                        <span>View chat</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                </div>
            </motion.div>
        )
    }

    // First-time pill: cycling prompts + shimmer; hover expands.
    // A div (not button) so the mic can nest as its own real button.
    return (
        <motion.div
            key="collapsed"
            role="button"
            tabIndex={0}
            // Anchored bottom-center at bottom:5px so the pill sits FLUSH on top
            // of the 5px anchor line (no visible gap). transform-origin bottom so
            // the scale animation feels like the pill grows/shrinks from its base.
            initial={{ opacity: 0, y: 18, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 6, scale: 0.88, x: '-50%' }}
            transition={{
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
                opacity: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
            }}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onClick()
                }
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            aria-label={ariaLabel}
            className={`pointer-events-auto absolute bottom-[5px] left-1/2 flex h-[30px] ${voiceEnabled ? 'w-[330px]' : 'w-[300px]'} max-w-full items-center justify-center gap-1.5 overflow-hidden rounded-t-full rounded-b-none px-4 text-white cursor-pointer`}
            style={{
                boxShadow: `0 -10px 28px ${SHADOW.dark}, 0 0 30px ${SHADOW.defaultSoft}`,
                transformOrigin: 'bottom center',
            }}
        >
            {/* Animated gradient backdrop */}
            <motion.span className="absolute inset-0" style={GRADIENT_STYLE} {...GRADIENT_ANIM} />

            {/* Shimmer sweep */}
            <motion.span
                className="absolute -left-[60%] top-0 h-full w-[55%] bg-white/25 blur-sm"
                animate={{ x: ['0%', '320%'] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.6 }}
            />

            <Wand2 className="relative z-10 h-3.5 w-3.5 shrink-0" />
            <span className="relative z-10 font-red-hat-display text-[13px] font-semibold tracking-[-0.1px]">{ctaVerb}:</span>

            {/* Cycling placeholder — fixed width area so the pill doesn't resize */}
            <div className={`relative z-10 h-[20px] ${voiceEnabled ? 'w-[200px]' : 'w-[300px]'} overflow-hidden`}>
                <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                        key={cyclePlaceholderKey}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 flex items-center truncate font-red-hat-display text-[13px] font-medium italic text-white/95"
                    >
                        {cycledPlaceholder}
                    </motion.span>
                </AnimatePresence>
            </div>

            {/* Mic — starts a voice session (internal users only). */}
            {voiceEnabled && <CollapsedMic onStartVoice={onStartVoice} />}
        </motion.div>
    )
}

export default DesktopCollapsed
