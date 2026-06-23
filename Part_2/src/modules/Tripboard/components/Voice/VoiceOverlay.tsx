import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Square } from 'lucide-react'
import VoiceOrb from './VoiceOrb'
import type { VoiceState } from '@/hooks/useVoiceChat'

interface TranscriptEntry {
    role: 'user' | 'assistant'
    text: string
    timestamp: number
}

interface VoiceOverlayProps {
    isOpen: boolean
    voiceState: VoiceState
    transcript: TranscriptEntry[]
    currentTranscript: string
    onClose: () => void
    onCancelResponse: () => void
}

const stateLabels: Record<VoiceState, string> = {
    idle: '',
    connecting: 'Connecting...',
    listening: 'Listening...',
    thinking: 'Thinking...',
    speaking: 'Tap anywhere to interrupt',
}

export default function VoiceOverlay({
    isOpen,
    voiceState,
    transcript,
    currentTranscript,
    onClose,
    onCancelResponse,
}: VoiceOverlayProps) {
    const transcriptEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [transcript, currentTranscript])

    const lastEntry = transcript[transcript.length - 1]
    const showTranscript = currentTranscript || lastEntry

    const overlay = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-x-0 bottom-0 z-[9999] pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    onClick={() => {
                        if (voiceState === 'speaking') onCancelResponse()
                    }}
                >
                    {/* Gradient wash — fades from violet-tinted at bottom to transparent at top */}
                    <div
                        className="w-full pointer-events-auto"
                        style={{
                            background: 'linear-gradient(to top, rgba(245,243,255,1) 0%, rgba(248,247,255,0.97) 35%, rgba(255,255,255,0.85) 65%, transparent 100%)',
                            paddingTop: '80px',
                        }}
                    >
                        {/* Transcript */}
                        {showTranscript && (
                            <div className="px-6 pb-1">
                                <motion.p
                                    key={currentTranscript || lastEntry?.timestamp}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center text-[15px] font-manrope text-violet-700 font-medium leading-[22px] max-w-xl mx-auto line-clamp-3"
                                >
                                    {currentTranscript || lastEntry?.text}
                                </motion.p>
                            </div>
                        )}

                        {/* State label */}
                        {stateLabels[voiceState] && (
                            <p className="text-center text-[12px] font-manrope text-violet-400 font-medium pt-1 pb-3">
                                {stateLabels[voiceState]}
                            </p>
                        )}

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-5 pb-7">
                            <VoiceOrb state={voiceState} size={44} />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onClose()
                                }}
                                className="w-11 h-11 rounded-full bg-grey-0 text-white hover:bg-grey-1 transition-colors flex items-center justify-center shadow-sm"
                                type="button"
                                title="End conversation"
                            >
                                <Square className="w-4 h-4 fill-current" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )

    return createPortal(overlay, document.body)
}
