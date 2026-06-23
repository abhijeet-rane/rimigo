import { motion } from 'framer-motion'
import type { VoiceState } from '@/hooks/useVoiceChat'

interface VoiceOrbProps {
    state: VoiceState
    size?: number
}

export default function VoiceOrb({ state, size = 44 }: VoiceOrbProps) {
    const dotSize = size * 0.55

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Pulse ring */}
            {state !== 'idle' && (
                <motion.div
                    className="absolute rounded-full bg-violet-400/20"
                    style={{ width: size, height: size }}
                    animate={state === 'listening' ? {
                        scale: [1, 1.6, 1],
                        opacity: [0.3, 0, 0.3],
                    } : state === 'speaking' ? {
                        scale: [1, 1.4, 1.1, 1.5, 1],
                        opacity: [0.25, 0.05, 0.2, 0, 0.25],
                    } : {
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.05, 0.2],
                    }}
                    transition={{
                        duration: state === 'speaking' ? 0.6 : state === 'listening' ? 1.4 : 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            )}

            {/* Dot */}
            <motion.div
                className="rounded-full bg-gradient-to-br from-violet-500 to-violet-600"
                style={{
                    width: dotSize,
                    height: dotSize,
                    boxShadow: '0 0 12px rgba(139,92,246,0.3)',
                }}
                animate={state === 'listening' ? {
                    scale: [1, 1.15, 1],
                } : state === 'thinking' ? {
                    scale: [1, 1.05, 1],
                    opacity: [1, 0.6, 1],
                } : state === 'speaking' ? {
                    scale: [1, 1.2, 0.9, 1.15, 1],
                } : state === 'connecting' ? {
                    scale: [1, 1.08, 1],
                    opacity: [0.6, 1, 0.6],
                } : {}}
                transition={{
                    duration: state === 'speaking' ? 0.5 : state === 'thinking' ? 1.5 : 1.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </div>
    )
}
