import React from 'react'
import { cn } from '@/lib/utils'

interface DiamondIconProps {
    className?: string
    size?: 'sm' | 'md'
}

const DiamondIcon: React.FC<DiamondIconProps> = ({ className, size = 'sm' }) => {
    const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-4 h-4'

    return (
        <div className={cn('w-4 h-4 flex items-center justify-center shrink-0', className)}>
            <div className={cn('bg-primary-default rotate-45', sizeClass)}></div>
        </div>
    )
}

export default DiamondIcon
