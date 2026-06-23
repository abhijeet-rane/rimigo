import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import SectionHeader from '../primitives/SectionHeader'
import ExpandToggle from '../primitives/ExpandToggle'
import { collapseTransition } from '../primitives/animations'

interface CollapsibleSectionProps {
    title: string
    /** Optional icon for the section header */
    icon?: React.ReactNode
    /** Number of items for the toggle label */
    itemCount?: number
    /** Start expanded. Default false (progressive disclosure) */
    defaultExpanded?: boolean
    children: React.ReactNode
    /** Optional summary shown when collapsed */
    summaryWhenCollapsed?: React.ReactNode
    /** Labels for the toggle button */
    showLabel?: string
    hideLabel?: string
    className?: string
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    icon,
    itemCount,
    defaultExpanded = false,
    children,
    summaryWhenCollapsed,
    showLabel = 'Show details',
    hideLabel = 'Hide details',
    className = '',
}) => {
    const [expanded, setExpanded] = useState(defaultExpanded)

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <div className="flex items-center justify-between">
                <SectionHeader icon={icon}>{title}</SectionHeader>
                <ExpandToggle
                    expanded={expanded}
                    onToggle={() => setExpanded(!expanded)}
                    showLabel={showLabel}
                    hideLabel={hideLabel}
                    count={itemCount}
                />
            </div>

            {/* Summary shown when collapsed */}
            {!expanded && summaryWhenCollapsed && (
                <div className="text-sm text-grey_1 font-manrope">
                    {summaryWhenCollapsed}
                </div>
            )}

            {/* Expandable content */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={collapseTransition}
                        className="overflow-hidden"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default CollapsibleSection
