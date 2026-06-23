import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortContentProps } from '../types'
import type { StaysSortMetadata, StaysSortInitialData, StaysSortResult, SortOption } from './types'

// Default sort options for Stays
const DEFAULT_SORT_OPTIONS: SortOption[] = [
    {
        id: 'relevance',
        label: 'Relevance',
        description: 'Best match for your search',
        orderBy: { relevance: -1 }
    },
    {
        id: 'price_low',
        label: 'Price: Low to High',
        description: 'Lowest price first',
        orderBy: { rate: 1 }
    },
    {
        id: 'price_high',
        label: 'Price: High to Low',
        description: 'Highest price first',
        orderBy: { rate: -1 }
    }
]

export const StaysSortContent = ({
    metadata,
    initialData,
    onChange,
    onApply
}: SortContentProps<StaysSortMetadata, StaysSortInitialData, StaysSortResult>) => {
    const sortOptions = metadata?.sortOptions || DEFAULT_SORT_OPTIONS
    const currentOrderBy = initialData?.currentOrderBy || { relevance: -1 }

    // Helper to check if a sort option is currently selected
    const isSelected = (orderBy: Record<string, number>) => {
        return JSON.stringify(orderBy) === JSON.stringify(currentOrderBy)
    }

    // Handle sort selection
    const handleSortSelect = (orderBy: Record<string, number>) => {
        const result: StaysSortResult = { orderBy }

        // Call onChange for real-time updates
        onChange(result)

        // Call onApply to commit the change (and close the modal)
        onApply(result)
    }

    return (
        <div className="py-2">
            {sortOptions.map((option) => {
                const selected = isSelected(option.orderBy)

                return (
                    <button
                        key={option.id}
                        onClick={() => handleSortSelect(option.orderBy)}
                        className={cn(
                            'w-full px-4 py-3 flex items-center justify-between hover:bg-grey-grey_5 transition-colors cursor-pointer',
                            selected && 'bg-grey-grey_5'
                        )}>
                        <div className="flex flex-col items-start">
                            <span
                                className={cn(
                                    'text-[16px] font-red-hat-display font-medium',
                                    selected ? 'text-primary-default' : 'text-header-black'
                                )}>
                                {option.label}
                            </span>
                            {option.description && <span className="text-[12px] text-grey-2 mt-0.5">{option.description}</span>}
                        </div>
                        {selected && <Check className="h-5 w-5 text-primary-default shrink-0" />}
                    </button>
                )
            })}
        </div>
    )
}
