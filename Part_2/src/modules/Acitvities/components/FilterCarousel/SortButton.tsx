import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { ArrowUpDown } from 'lucide-react'

interface SortButtonProps {
    /** Label text for the button */
    label?: string
    /** Custom icon URL (if not provided, uses default Sort icon) */
    icon?: string
    /** Whether the button is active/selected */
    isActive?: boolean
    /** Click handler */
    onClick: () => void
    /** Additional CSS classes */
    className?: string
}

/**
 * SortButton component - A reusable button for triggering sort functionality
 *
 * This button is designed to be placed at the end of the FilterCarousel
 * and can be configured with custom label and icon.
 *
 * @example
 * ```tsx
 * <SortButton
 *   label="Sort"
 *   onClick={() => setIsSortOpen(true)}
 *   isActive={hasActiveSort}
 * />
 * ```
 */
const SortButton = forwardRef<HTMLButtonElement, SortButtonProps>(({ label = 'Sort', icon, isActive = false, onClick, className }, ref) => {
    return (
        <button
            ref={ref}
            type="button"
            onClick={onClick}
            className={cn(
                'flex items-center gap-[5px]  p-2 max-md:px-[30px] md:p-3 rounded-full border transition-colors shrink-0 cursor-pointer',
                isActive ? 'bg-primary-default-80 border-primary-default text-white' : 'border-grey-4 text-grey-0 bg-natural-white md:bg-grey-5',
                className
            )}>
            {/* Icon - Use custom icon if provided, otherwise use default Sort icon */}
            <div className="w-[14px] h-[14px] flex items-center justify-center shrink-0">
                {icon ? (
                    <img
                        src={icon}
                        alt=""
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <ArrowUpDown
                        className={cn('w-[14px] h-[14px]', isActive ? 'text-grey-0' : 'text-grey-0')}
                        strokeWidth={2}
                    />
                )}
            </div>

            {/* Label */}
            <span
                className={cn(
                    'text-[12px] md:text-[14px] font-[600] leading-[18px] font-manrope whitespace-nowrap',
                    isActive ? 'text-grey-0' : 'text-grey-0'
                )}>
                {label}
            </span>
        </button>
    )
})

SortButton.displayName = 'SortButton'

export default SortButton
