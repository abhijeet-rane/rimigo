import React from 'react'
import SectionHeader from '../primitives/SectionHeader'
import StatusBadge, { type BadgeVariant } from '../primitives/StatusBadge'

interface CardHeaderProps {
    /** Lucide icon element */
    icon?: React.ReactNode
    title: string
    badge?: {
        text: string
        variant: BadgeVariant
    }
    className?: string
}

const CardHeader: React.FC<CardHeaderProps> = ({ icon, title, badge, className }) => (
    <SectionHeader
        icon={icon}
        trailing={badge ? <StatusBadge variant={badge.variant} size="md">{badge.text}</StatusBadge> : undefined}
        className={className}
    >
        {title}
    </SectionHeader>
)

export default CardHeader
