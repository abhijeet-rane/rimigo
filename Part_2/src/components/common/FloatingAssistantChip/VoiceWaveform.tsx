import { motion } from 'framer-motion'
import type { VoiceUiState } from './types'

interface VoiceWaveformProps {
    state: VoiceUiState
    /** Bar colour — CSS colour string. */
    color?: string
    barCount?: number
    /** Pixel height of the tallest bar. */
    height?: number
    className?: string
}

/**
 * Animated voice waveform — a row of bars that pulse while a voice session is
 * active. Spans the full width of its container (bars spread edge to edge),
 * lively for listening/speaking, a calm shimmer for connecting/thinking.
 */
export default function VoiceWaveform({
    state,
    color = 'var(--color-primary-default)',
    barCount = 44,
    height = 24,
    className = '',
}: VoiceWaveformProps) {
    const lively = state === 'listening' || state === 'speaking'
    const calm = state === 'connecting' || state === 'thinking'
    const mid = (barCount - 1) / 2

    return (
        <div
            className={`flex w-full items-center justify-between ${className}`}
            style={{ height }}
            aria-hidden
        >
            {Array.from({ length: barCount }).map((_, i) => {
                const dist = mid === 0 ? 0 : Math.abs(i - mid) / mid // 0 centre → 1 edge
                const peak = 1 - dist * 0.55 // a touch taller toward the middle
                const animate = lively
                    ? { scaleY: [0.24, peak, 0.4, peak * 0.78, 0.24] }
                    : calm
                        ? { scaleY: [0.2, 0.46 - dist * 0.12, 0.2] }
                        : { scaleY: 0.2 }
                return (
                    <motion.span
                        key={i}
                        className="w-[3px] shrink-0 rounded-full"
                        style={{ height, background: color, transformOrigin: 'center' }}
                        animate={animate}
                        transition={{
                            duration: lively ? 0.6 + (i % 5) * 0.12 : 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.03,
                        }}
                    />
                )
            })}
        </div>
    )
}
