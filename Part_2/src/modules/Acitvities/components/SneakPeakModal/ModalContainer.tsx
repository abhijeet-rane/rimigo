import React from 'react'
import { motion } from 'framer-motion'

interface ModalContainerProps {
    children: React.ReactNode
    onBackdropClick?: () => void
    /** Compact sizing for the Watch & Discover tour (smaller card, room for the stepper). */
    compact?: boolean
}

const ModalContainer: React.FC<ModalContainerProps> = ({ children, onBackdropClick, compact = false }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 z-[1310] flex items-center justify-center pointer-events-none">
            {/* `data-overlay-scroll`: marks the modal subtree as a sealed
                scroll context so the global `useHideOnScrollDown` hook
                ignores scrolls bubbling out of it — without this, scrolling
                inside the desktop sneak peek modal collapsed the Tripboard
                sub-header behind the modal. Same root cause as the AI
                assistant scroll-leak patched earlier. */}
            <div
                data-overlay-scroll
                className={`bg-white rounded-2xl shadow-2xl w-full h-full flex flex-col lg:flex-row overflow-hidden pointer-events-auto relative ${
                    compact ? 'max-w-6xl max-h-[84vh]' : 'max-w-7xl max-h-[90vh]'
                }`}
                onClick={(e) => {
                    e.stopPropagation()
                    onBackdropClick?.()
                }}>
                {children}
            </div>
        </motion.div>
    )
}

export default ModalContainer
