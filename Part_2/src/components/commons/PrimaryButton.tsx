import React from 'react'
import { Button } from '@/components/ui/button' // shadcn button
import { cn } from '@/lib/utils' // utility to merge class names

interface PrimaryButtonProps {
    onPress: () => void
    text: string
    disabled?: boolean
    className?: string // custom tailwind class
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({ onPress, text, disabled = false, className }) => {
    return (
        <Button
            onClick={onPress}
            disabled={disabled}
            className={cn(
                'w-full px-4 py-3 rounded-lg text-white font-semibold shadow-md',
                'bg-gradient-to-r from-purple-700 to-purple-900',
                disabled && 'bg-gray-400 cursor-not-allowed shadow-none',
                className
            )}>
            {text}
        </Button>
    )
}
