import { motion } from 'framer-motion'
import { MessageCircle, Mic, Wand2 } from 'lucide-react'
import { GRADIENT_ANIM, GRADIENT_STYLE, SHADOW } from './constants'

interface Props {
    ariaLabel: string
    /** Show the mic entry point on the collapsed pill. */
    voiceEnabled?: boolean
    /** Tap the pill / "View chat" → open the assistant. */
    onOpen: () => void
    /** Mic tapped — start a voice session. */
    onStartVoice?: () => void
}

/**
 * Mobile collapsed-on-scroll pill. Mirrors the desktop "Continue editing your
 * itinerary with AI / View chat" strip: a centred pill rounded on top only,
 * sitting FLUSH on a full-width bottom anchor line (no floating gap / white
 * space beneath it), so the list keeps every pixel of viewing space.
 */
const MobileCollapsed: React.FC<Props> = ({ ariaLabel, voiceEnabled = false, onOpen, onStartVoice }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none relative flex w-full flex-col items-center">
        {/* Pill — rounded top only, square bottom so it reads as anchored to
            the line below it. */}
        <div
            onClick={onOpen}
            role="button"
            tabIndex={0}
            aria-label={ariaLabel}
            className="pointer-events-auto relative z-10 flex h-[32px] w-fit max-w-[92vw] items-center gap-2.5 overflow-hidden rounded-t-2xl rounded-b-none pl-3.5 pr-1.5 text-white cursor-pointer"
            style={{ boxShadow: `0 -8px 24px ${SHADOW.dark}, 0 0 26px ${SHADOW.defaultSoft}` }}>
            <motion.span
                className="absolute inset-0"
                style={GRADIENT_STYLE}
                {...GRADIENT_ANIM}
            />

            <div className="relative z-10 flex min-w-0 items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate font-red-hat-display text-[12px] font-semibold tracking-[-0.1px]">Edit your itinerary using Rimigo AI</span>
            </div>

            <div className="relative z-10 flex shrink-0 items-center gap-1.5">
                {voiceEnabled && (
                    <button
                        type="button"
                        aria-label="Talk to your trip"
                        onClick={(e) => {
                            e.stopPropagation()
                            onStartVoice?.()
                        }}
                        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-white/25 text-white transition-colors hover:bg-white/40 cursor-pointer">
                        <Mic className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                )}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onOpen()
                    }}
                    aria-label="Chat"
                    className="flex h-[24px] shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 font-manrope text-[11px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/30 cursor-pointer">
                    <MessageCircle className="h-3 w-3" />
                    <span>Chat</span>
                </button>
            </div>
        </div>

        {/* Full-width bottom anchor line — the pill sits flush on it. Extends
            through the safe-area inset so the gradient reaches the very bottom
            edge with no white gap. */}
        <div
            className="w-full"
            style={{ height: 'calc(5px + env(safe-area-inset-bottom))', ...GRADIENT_STYLE }}
        />
    </motion.div>
)

export default MobileCollapsed
