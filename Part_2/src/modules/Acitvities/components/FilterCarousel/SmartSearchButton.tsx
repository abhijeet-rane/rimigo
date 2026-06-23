import React from 'react'
import { cn } from '@/lib/utils'
import { PURPLE_STAR_ICON_WITHOUT_PADDING } from '@/constants/icons/svgFromCDN'

interface SmartSearchButtonProps {
    onClick: () => void
    className?: string
}

const SmartSearchButton: React.FC<SmartSearchButtonProps> = ({ onClick, className }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex items-center p-2 md:p-3 rounded-[24px] border transition-colors shrink-0 cursor-pointer gap-[5px]',
                'bg-white border-primary-default text-primary-default hover:bg-grey-5',
                className
            )}>
            <img
                src={PURPLE_STAR_ICON_WITHOUT_PADDING}
                alt="Smart search"
                className="w-3 h-3"
            />
            <span className="text-[12px] md:text-[14px] font-[600] leading-[18px] font-manrope whitespace-nowrap text-grey-0">Smart search</span>
        </button>
    )
}

export default SmartSearchButton
