import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'

interface VoiceTriggerButtonProps {
    onClick: () => void
    isActive: boolean
    className?: string
}

export default function VoiceTriggerButton({ onClick, isActive, className = '' }: VoiceTriggerButtonProps) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            className={`
                relative flex items-center justify-center
                w-[52px] h-[52px] rounded-2xl
                bg-gradient-to-br from-violet-500 to-indigo-600
                text-white shadow-lg shadow-violet-500/25
                hover:shadow-violet-500/40 hover:shadow-xl
                active:scale-95
                transition-shadow duration-200 shrink-0
                ${isActive ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-white' : ''}
                ${className}
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isActive ? 'Voice active' : 'Talk to your trip'}
        >
            {/* Pulse */}
            {!isActive && (
                <motion.div
                    className="absolute inset-0 rounded-2xl bg-violet-400/20"
                    animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.3, 0, 0.3],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            )}

            <Mic className="w-5 h-5 relative z-10" />
        </motion.button>
    )
}
