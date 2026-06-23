import React from 'react'

interface EmptyStateProps {
    title: string
    description: string
    className?: string
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, className = '' }) => {
    return (
        <div className={`flex flex-col items-center justify-center text-center p-8 gap-3 ${className}`}>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-white/70 max-w-xs">{description}</p>
        </div>
    )
}

export default EmptyState
