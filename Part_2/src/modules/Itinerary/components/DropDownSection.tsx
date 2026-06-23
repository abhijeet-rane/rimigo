import Typography from '@/components/shared/Typography'
import { ChevronDown } from 'lucide-react'
import React, { ReactNode, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
    title: string
    children: ReactNode
    defaultOpen?: boolean
    selectedContent?: ReactNode
    onOpenChange?: (open: boolean) => void
    errorContent?: ReactNode
}

const DropdownSection: React.FC<Props> = ({ title, children, defaultOpen = false, selectedContent, onOpenChange, errorContent }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    // ✅ Sync when defaultOpen changes (important for edit mode)
    useEffect(() => {
        setIsOpen(defaultOpen)
    }, [defaultOpen])

    const toggle = () => {
        setIsOpen((prev) => {
            const next = !prev
            onOpenChange?.(next)
            return next
        })
    }

    return (
        <div className="flex flex-col gap-3">
            {/* HEADER */}
            <button
                type="button"
                onClick={toggle}
                className="w-full flex items-center justify-between cursor-pointer bg-natural-white">
                <div className="flex flex-col gap-1 text-left">
                    <Typography
                        size="14"
                        weight="medium"
                        family="manrope">
                        {title}
                    </Typography>

                    {selectedContent && !isOpen && <div className="text-sm text-grey-2">{selectedContent}</div>}
                    {errorContent}
                </div>

                <ChevronDown
                    size={18}
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* CONTENT */}
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden">
                        <div>{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default DropdownSection
