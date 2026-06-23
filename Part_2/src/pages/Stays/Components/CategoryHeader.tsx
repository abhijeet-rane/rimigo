import React from 'react'
import { Clock } from 'lucide-react'

interface CategoryHeaderProps {
    title: string
    duration?: string
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({ title, duration }) => {
    return (
        <div className="self-stretch flex items-start justify-between gap-5">
            <div className="relative tracking-[-0.01em] font-semibold text-[18px] text-grey_0 font-red-hat-display">{title}</div>
            {duration && (
                <div className="rounded-[8px] bg-white border-gainsboro border-solid border flex items-center py-1 px-2 gap-1 text-sm font-manrope">
                    <Clock className="h-4 w-4 relative text-grey_2" />
                    <div className="relative tracking-[-0.02em] leading-[18px] font-semibold text-grey_0">{duration}</div>
                </div>
            )}
        </div>
    )
}

export default CategoryHeader
