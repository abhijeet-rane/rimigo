import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { SlidersHorizontal } from 'lucide-react'

interface FilterButtonProps {
    /** Label text for the button */
    label?: string
    /** Custom icon URL (if not provided, uses default Filter icon) */
    icon?: string
    /** Whether the button is active/selected */
    isActive?: boolean
    /** Click handler */
    onClick: () => void
    /** Additional CSS classes */
    className?: string
}

/**
 * FilterButton component - A reusable button for triggering filter functionality
 *
 * This button is designed to be placed at the end of the FilterCarousel
 * and can be configured with custom label and icon.
 *
 * @example
 * ```tsx
 * <FilterButton
 *   label="Filter"
 *   onClick={() => setIsFilterOpen(true)}
 *   isActive={hasActiveFilters}
 * />
 * ```
 */
const FilterButton = forwardRef<HTMLButtonElement, FilterButtonProps>(({ label = 'Filter', icon, isActive = false, onClick, className }, ref) => {
    return (
        <button
            ref={ref}
            type="button"
            onClick={onClick}
            className={cn(
                'flex items-center gap-[5px] md:gap-2 md:px-4 px-[30px] py-2 rounded-full border transition-colors shrink-0 cursor-pointer',
                isActive ? 'bg-primary-default-80 border-primary-default text-white' : 'bg-white border-grey-4 text-grey-0 hover:bg-grey-5',
                className
            )}>
            {/* Icon - Use custom icon if provided, otherwise use default Filter icon */}
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {icon ? (
                    <img
                        src={icon}
                        alt=""
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <SlidersHorizontal
                        className={cn('w-4 h-4', isActive ? 'text-primary-default' : 'text-grey-0')}
                        strokeWidth={2}
                    />
                )}
            </div>

            {/* Label */}
            <span className={cn('text-[12px] md:text-sm font-semibold font-manrope whitespace-nowrap', isActive ? 'text-grey-0' : 'text-grey-0')}>
                {label}
            </span>
        </button>
    )
})

FilterButton.displayName = 'FilterButton'

export default FilterButton
