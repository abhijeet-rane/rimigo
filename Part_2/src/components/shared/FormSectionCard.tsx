import React, { forwardRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface FormSectionCardProps {
    children: React.ReactNode
    error?: string | null
    className?: string
}

/**
 * Consistent card wrapper for form sections with error state.
 * Shows a red border + inline error message when `error` is set.
 */
const FormSectionCard = forwardRef<HTMLDivElement, FormSectionCardProps>(({ children, error, className = '' }, ref) => {
    return (
        <div
            ref={ref}
            className={`bg-white rounded-2xl border shadow-sm p-5 sm:p-6 transition-colors duration-300 ${
                error ? 'border-red-300' : 'border-grey-4/50'
            } ${className}`}
        >
            {children}
            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="text-[13px] text-red-500 font-manrope font-medium mt-3"
                    >
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    )
})

FormSectionCard.displayName = 'FormSectionCard'

export default FormSectionCard
