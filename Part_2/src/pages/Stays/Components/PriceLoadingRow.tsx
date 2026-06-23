import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { COMPASS_LOGO_PURPLE_TRANSPARENT_BG } from '@/constants/rimigo'

const PRICE_LOADING_MESSAGES = [
    'Searching best deals…',
    'Comparing prices across providers…',
    'Almost there…',
] as const

export const PriceLoadingRow = () => {
    const [messageIndex, setMessageIndex] = useState(0)

    useEffect(() => {
        const intervalId = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % PRICE_LOADING_MESSAGES.length)
        }, 1800)
        return () => clearInterval(intervalId)
    }, [])

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label="Searching for the best price"
            className="flex items-center justify-between bg-white rounded-[8px] px-3 py-2 gap-3 overflow-hidden">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <motion.img
                    aria-hidden
                    src={COMPASS_LOGO_PURPLE_TRANSPARENT_BG}
                    alt=""
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3.2, ease: 'linear', repeat: Infinity }}
                    className="shrink-0 w-5 h-5 object-contain select-none"
                    draggable={false}
                />
                <div className="relative h-[18px] flex items-center overflow-hidden min-w-0">
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={PRICE_LOADING_MESSAGES[messageIndex]}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                            className="text-[13px] font-semibold font-red-hat-display text-grey-0 tracking-[-0.26px] leading-[18px] whitespace-nowrap truncate">
                            {PRICE_LOADING_MESSAGES[messageIndex]}
                        </motion.span>
                    </AnimatePresence>
                </div>
            </div>
            <div
                aria-hidden
                className="flex items-center gap-1 shrink-0 px-2.5 h-[30px] rounded bg-primary-default/10">
                {[0, 1, 2].map((i) => (
                    <motion.span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary-default"
                        animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1, 0.8] }}
                        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                    />
                ))}
            </div>
        </div>
    )
}
