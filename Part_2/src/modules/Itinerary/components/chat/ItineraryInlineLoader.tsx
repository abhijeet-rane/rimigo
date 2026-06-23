import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface ItineraryInlineLoaderProps {
    label?: string
    stepIndex?: number
    totalSteps?: number
}

const ItineraryInlineLoader: React.FC<ItineraryInlineLoaderProps> = ({
    label = 'Thinking',
    stepIndex = 0,
    totalSteps = 4,
}) => {
    const [, setTick] = useState(0)
    useEffect(() => {
        const t = setInterval(() => setTick((p) => p + 1), 500)
        return () => clearInterval(t)
    }, [])

    const progress = totalSteps > 1 ? ((stepIndex + 1) / totalSteps) * 100 : 50

    // Wave dots — 4 dots with staggered bounce
    const waveDots = [0, 1, 2, 3]

    return (
        <div className="flex flex-col gap-2.5 py-2 px-1 w-full max-w-[300px]">
            {/* Top row: wave dots + label */}
            <div className="flex items-center gap-2.5">
                <div className="flex items-end gap-[3px] h-[14px]">
                    {waveDots.map((i) => (
                        <motion.div
                            key={i}
                            className="w-[5px] rounded-full"
                            style={{ backgroundColor: 'var(--color-primary-default)' }}
                            animate={{
                                height: [5, 14, 5],
                                opacity: [0.4, 1, 0.4],
                            }}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: i * 0.15,
                                ease: 'easeInOut',
                            }}
                        />
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.span
                        key={label}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="text-[13px] font-medium text-grey_1 font-manrope leading-none"
                    >
                        {label}
                    </motion.span>
                </AnimatePresence>
            </div>

            {/* Progress bar — thin gradient track with glow */}
            <div className="relative h-[3px] w-full rounded-full overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--color-grey-4) 30%, transparent)' }}>
                <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                        background: 'linear-gradient(90deg, var(--color-primary-default), color-mix(in srgb, var(--color-primary-default) 65%, white))',
                        boxShadow: '0 0 8px color-mix(in srgb, var(--color-primary-default) 40%, transparent)',
                    }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.div
                    className="absolute inset-y-0 w-[40%] rounded-full"
                    style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
                    }}
                    animate={{ left: ['-40%', '100%'] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                />
            </div>

            {/* Step pips */}
            <div className="flex items-center gap-[3px]">
                {Array.from({ length: totalSteps }).map((_, i) => {
                    const done = i < stepIndex
                    const active = i === stepIndex
                    return (
                        <motion.div
                            key={i}
                            className="h-[3px] rounded-full"
                            animate={{
                                flex: active ? 2.5 : 1,
                                backgroundColor: done
                                    ? 'var(--color-secondary-green)'
                                    : active
                                      ? 'var(--color-primary-default)'
                                      : 'color-mix(in srgb, var(--color-grey-4) 40%, transparent)',
                                opacity: done || active ? 1 : 0.6,
                            }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        />
                    )
                })}
            </div>
        </div>
    )
}

export default ItineraryInlineLoader
