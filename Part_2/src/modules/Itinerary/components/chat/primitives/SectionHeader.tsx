import React from 'react'

interface SectionHeaderProps {
    children: React.ReactNode
    /** Optional Lucide icon element to the left */
    icon?: React.ReactNode
    /** Optional trailing element (badge, count, etc.) */
    trailing?: React.ReactNode
    className?: string
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
    children,
    icon,
    trailing,
    className = '',
}) => (
    <div className={`flex items-center gap-2 ${className}`}>
        {icon && <span className="flex-shrink-0 text-primary-default">{icon}</span>}
        <p className="text-xs font-semibold text-grey_1 font-manrope uppercase tracking-wide">
            {children}
        </p>
        {trailing && <span className="ml-auto flex-shrink-0">{trailing}</span>}
    </div>
)

export default SectionHeader
