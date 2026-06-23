import React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface ExpandToggleProps {
    expanded: boolean
    onToggle: () => void
    /** Label when collapsed, e.g., "Show details" */
    showLabel: string
    /** Label when expanded, e.g., "Hide details" */
    hideLabel: string
    /** Item count to display, e.g., "Show all 5 items" */
    count?: number
}

const ExpandToggle: React.FC<ExpandToggleProps> = ({
    expanded,
    onToggle,
    showLabel,
    hideLabel,
    count,
}) => {
    const label = expanded
        ? hideLabel
        : count != null
            ? `${showLabel} (${count})`
            : showLabel

    return (
        <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-default font-manrope hover:text-primary-dark transition-colors cursor-pointer"
        >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {label}
        </button>
    )
}

export default ExpandToggle
