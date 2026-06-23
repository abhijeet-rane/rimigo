import React from 'react'
import { cn } from '@/lib/utils'
import DiamondIcon from './DiamondIcon'

interface FloatingPromptProps {
    text: string
    onClick?: () => void
    className?: string
}

const FloatingPrompt: React.FC<FloatingPromptProps> = ({ text, onClick, className }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full border border-grey-4 bg-white text-sm font-semibold font-manrope text-grey-0 shrink-0 cursor-pointer hover:bg-grey-5 transition-colors',
                className
            )}>
            <DiamondIcon />
            <span>{text}</span>
        </button>
    )
}

export default FloatingPrompt

