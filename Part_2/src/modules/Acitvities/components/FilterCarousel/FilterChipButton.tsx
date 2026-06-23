import React from 'react'
import { cn } from '@/lib/utils'

interface FilterChipButtonProps {
    id: string
    label: string
    icon?: string
    imageUrl?: string
    isPopular?: boolean
    isSelected: boolean
    onClick: () => void
}

const FilterChipButton: React.FC<FilterChipButtonProps> = ({ label, icon, imageUrl, isPopular, isSelected, onClick }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex items-center gap-[5px] md:gap-2 p-2 md:p-3 rounded-[24px] border transition-colors shrink-0 cursor-pointer',
                isSelected ? 'bg-primary-default-80 border-primary-default text-white' : 'bg-white border-grey-4 text-grey-0 hover:bg-grey-5'
            )}>
            {/* Icon or Image */}
            {(icon || imageUrl) && (
                <div className={cn('w-[14px] h-[14px] flex items-center justify-center shrink-0')}>
                    {icon ? (
                        <img
                            src={icon}
                            alt=""
                            className={cn('w-full h-full object-contain')}
                        />
                    ) : (
                        <img
                            src={imageUrl}
                            alt=""
                            className={cn('w-full h-full object-contain rounded')}
                        />
                    )}
                </div>
            )}

            {/* Label */}
            <span
                className={cn(
                    'text-[12px] md:text-[14px] font-[600] leading-[18px] font-manrope whitespace-nowrap',
                    isSelected ? 'text-grey-0' : 'text-grey-0'
                )}>
                {label}
            </span>

            {/* Popular Badge */}
            {isPopular && <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-600 whitespace-nowrap">POPULAR</span>}
        </button>
    )
}

export default FilterChipButton
