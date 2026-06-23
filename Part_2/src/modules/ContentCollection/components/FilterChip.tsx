import React from 'react'
import { cn } from '@/lib/utils'

interface FilterChipProps {
    icon: React.ReactNode
    label: string
    onClick: () => void
    /** When > 0, the chip flips to its active state (purple border, tinted
     *  background) and renders the count as a trailing badge. */
    activeCount?: number
}

const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(({ icon, label, onClick, activeCount = 0 }, ref) => {
    const isActive = activeCount > 0

    return (
        <button
            ref={ref}
            type="button"
            onClick={onClick}
            className={cn(
                'flex items-center gap-2 py-1.5 px-3 rounded-[999px] border transition-colors cursor-pointer',
                isActive
                    ? 'border-primary-default bg-primary-default-80 hover:bg-primary-default-80/80'
                    : 'border-grey-4 bg-white hover:border-grey-3'
            )}>
            {icon}
            <span
                className={cn(
                    'text-sm font-medium leading-[18px] font-manrope whitespace-nowrap',
                    isActive ? 'text-primary-default' : 'text-grey-0'
                )}>
                {label}
            </span>
            {isActive && (
                <span
                    aria-label={`${activeCount} active filter${activeCount === 1 ? '' : 's'}`}
                    className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-default text-natural-white text-[11px] font-semibold font-red-hat-display leading-none">
                    {activeCount}
                </span>
            )}
        </button>
    )
})

FilterChip.displayName = 'FilterChip'

export default FilterChip
