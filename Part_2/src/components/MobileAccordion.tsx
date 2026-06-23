// components/MobileAccordion.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Typography from './shared/Typography'

interface MobileAccordionProps {
    title: string
    value?: string
    isOpen: boolean
    onToggle: () => void
    children: React.ReactNode
}

const MobileAccordion: React.FC<MobileAccordionProps> = ({ title, value, isOpen, onToggle, children }) => {
    return (
        <div className="border-b border-grey-4 bg-natural-white">
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full px-3 py-3 flex items-center justify-between bg-grey-5">
                <div className="flex flex-col gap-0.5 ">
                    <Typography
                        size="12"
                        weight="semibold"
                        color="grey-2"
                        family="redhat">
                        {title}
                    </Typography>
                    <Typography
                        size="14"
                        weight="semibold"
                        color="grey-0"
                        family="manrope">
                        {value || 'Select'}
                    </Typography>
                </div>

                <ChevronDown className={`w-6 h-6 transition-transform text-grey-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Animated Content */}
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden">
                        <div className="">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default MobileAccordion
