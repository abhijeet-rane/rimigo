import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackButtonProps {
    onClick: () => void
    className?: string
}

const BackButton: React.FC<BackButtonProps> = ({ onClick, className }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full border border-grey-4 hover:bg-grey-5 transition-colors shrink-0 cursor-pointer',
                className
            )}>
            <ArrowLeft size={20} className="text-grey-0" />
        </button>
    )
}

export default BackButton

