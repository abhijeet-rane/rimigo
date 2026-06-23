import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface ContextLoaderProps {
    label?: string
    stepIndex?: number
    totalSteps?: number
}

const STEP_NAMES = ['Understanding', 'Planning', 'Applying', 'Responding']

const ContextLoader: React.FC<ContextLoaderProps> = ({
    label = 'Thinking',
    stepIndex = 0,
    totalSteps = 4,
}) => {
    const steps = STEP_NAMES.slice(0, totalSteps)

    return (
        <div className="flex flex-col gap-2 py-1.5">
            {/* Shimmer bar */}
            <div className="relative h-1 w-full rounded-full bg-grey_6/30 overflow-hidden">
                <motion.div
                    className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-primary-default/60 to-transparent"
                    animate={{ x: ['-100%', '400%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
            </div>

            {/* Step dots */}
            <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                            i <= stepIndex ? 'bg-primary-default' : 'bg-grey_6/40'
                        }`}
                    />
                ))}
            </div>

            {/* Label with crossfade */}
            <AnimatePresence mode="wait">
                <motion.span
                    key={label}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-grey_2 font-red-hat-display leading-none"
                >
                    {label}...
                </motion.span>
            </AnimatePresence>
        </div>
    )
}

export default ContextLoader
