import React from 'react'
import { CATEGORIES } from './bookingsTypes'

interface FilterBarProps {
    activeCategory: string
    setActiveCategory: (key: string) => void
    availableCategories?: Set<string>
    /** Pixels to drop the sticky bar by, so it parks directly under the
     *  fixed StickyBudgetBar (which shares the top edge) instead of being
     *  overlapped by it on scroll-down. 0 when the budget bar is hidden. */
    topOffsetPx?: number
}

/** Filter chip strip — header of the bookings card (Figma chip styling).
 *  Chips stay category-based until the backend ships urgency/deal data for
 *  the designed "Urgent" / "Special Deals" filters. */
export const FilterBar: React.FC<FilterBarProps> = ({ activeCategory, setActiveCategory, availableCategories, topOffsetPx = 0 }) => {
    const chips: { key: string; label: string }[] = [
        { key: 'all', label: 'All' },
        ...Object.entries(CATEGORIES)
            .filter(([k]) => !availableCategories || availableCategories.has(k))
            .map(([k, v]) => ({ key: k, label: v.label }))
    ]

    return (
        <div
            style={{ top: topOffsetPx }}
            className="sticky z-30 flex items-center gap-3 bg-white px-4 md:px-5 py-3 md:rounded-t-2xl max-md:overflow-x-auto max-md:scrollbar-hide">
            {chips.map((chip) => {
                const isActive = activeCategory === chip.key
                return (
                    <button
                        key={chip.key}
                        onClick={() => setActiveCategory(chip.key)}
                        className={`whitespace-nowrap rounded-full border px-3 py-2 font-manrope text-[12px] font-semibold tracking-[-0.24px] leading-4 transition-colors cursor-pointer outline-none ${
                            isActive ? 'bg-grey-0 text-white border-grey-0' : 'bg-white text-grey-0 border-border-subtle hover:bg-grey-5'
                        }`}>
                        {chip.label}
                    </button>
                )
            })}
        </div>
    )
}
