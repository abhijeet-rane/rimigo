import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * Inline red helper line shown beneath a required-but-unfilled section when the
 * user taps Next/Plan-my-trip. Expands/collapses smoothly and — when it appears
 * (or re-fires via a new `nonce`) — scrolls ITSELF to the centre of the viewport
 * so it's never left hidden behind the fixed footer.
 */
export function SectionError({ show, message, nonce }: { show: boolean; message: string; nonce?: number }) {
    const ref = useRef<HTMLParagraphElement>(null)
    useEffect(() => {
        if (!show) return
        // Wait for the expand animation to lay out, then centre the message.
        const t = window.setTimeout(() => {
            ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 180)
        return () => window.clearTimeout(t)
    }, [show, nonce])

    return (
        <AnimatePresence initial={false}>
            {show && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden">
                    <p
                        ref={ref}
                        className="pt-2 font-manrope"
                        style={{
                            color: '#E11D48',
                            fontSize: '13px',
                            fontWeight: 500,
                            lineHeight: '18px',
                            letterSpacing: '-0.26px'
                        }}>
                        {message}
                    </p>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
