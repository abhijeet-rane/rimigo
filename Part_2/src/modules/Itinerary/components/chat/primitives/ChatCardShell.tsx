import React from 'react'
import { motion } from 'motion/react'
import { cardEntry } from './animations'

const INTENT_STYLES = {
    neutral: 'bg-gradient-to-b from-primary-default/[0.03] to-transparent border-t-primary-default/20',
    success: 'bg-gradient-to-b from-emerald-500/[0.04] to-transparent border-t-emerald-400/30',
    warning: 'bg-gradient-to-b from-amber-500/[0.04] to-transparent border-t-amber-400/30',
    error: 'bg-gradient-to-b from-red-500/[0.04] to-transparent border-t-red-400/30',
    info: 'bg-gradient-to-b from-blue-500/[0.04] to-transparent border-t-blue-400/30',
} as const

export type CardIntent = keyof typeof INTENT_STYLES

interface ChatCardShellProps {
    children: React.ReactNode
    /** Visual intent — controls the gradient tint and top accent border */
    intent?: CardIntent
    /** a11y role */
    role?: 'status' | 'alert' | 'region'
    /** aria-label for screen readers */
    ariaLabel?: string
    /** Skip entry animation (e.g., for messages loaded from history) */
    skipAnimation?: boolean
    className?: string
}

const ChatCardShell: React.FC<ChatCardShellProps> = ({
    children,
    intent = 'neutral',
    role,
    ariaLabel,
    skipAnimation = false,
    className = '',
}) => {
    const intentClasses = INTENT_STYLES[intent]

    if (skipAnimation) {
        return (
            <div
                className={`w-full flex flex-col gap-3 px-4 py-4 rounded-[20px] border-t-2 ${intentClasses} ${className}`}
                role={role}
                aria-label={ariaLabel}
            >
                {children}
            </div>
        )
    }

    return (
        <motion.div
            variants={cardEntry}
            initial="hidden"
            animate="visible"
            className={`w-full flex flex-col gap-3 px-4 py-4 rounded-[20px] border-t-2 ${intentClasses} ${className}`}
            role={role}
            aria-label={ariaLabel}
        >
            {children}
        </motion.div>
    )
}

export default ChatCardShell
