import React from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

export type CategoryType = 
    // Content Type
    | 'activities' | 'stays' | 'itinerary' | 'food' | 'transportation' | 'visa' | 'flights'
    // Experience Type
    | 'adventure' | 'culture' | 'nature' | 'shopping' | 'nightlife' | 'wellness' | 'festivals' | 'architecture' | 'photography' | 'business'
    // Budget
    | 'budget' | 'luxury'
    // Traveler Type
    | 'family' | 'solo' | 'couples'

export interface CategoryFilter {
    id: CategoryType
    label: string
    group: 'content' | 'experience' | 'budget' | 'traveler'
}

export const AVAILABLE_CATEGORIES: CategoryFilter[] = [
    // Content Type
    { id: 'activities', label: 'Activities', group: 'content' },
    { id: 'stays', label: 'Stays', group: 'content' },
    { id: 'itinerary', label: 'Itinerary', group: 'content' },
    { id: 'food', label: 'Food', group: 'content' },
    { id: 'transportation', label: 'Transportation', group: 'content' },
    // Experience Type
    { id: 'adventure', label: 'Adventure', group: 'experience' },
    { id: 'culture', label: 'Culture', group: 'experience' },
    { id: 'nature', label: 'Nature', group: 'experience' },
    { id: 'shopping', label: 'Shopping', group: 'experience' },
    { id: 'nightlife', label: 'Nightlife', group: 'experience' },
    { id: 'wellness', label: 'Wellness', group: 'experience' },
    // Budget
    { id: 'budget', label: 'Budget', group: 'budget' },
    { id: 'luxury', label: 'Luxury', group: 'budget' },
    // Traveler Type
    { id: 'family', label: 'Family', group: 'traveler' },
    { id: 'solo', label: 'Solo', group: 'traveler' },
    { id: 'couples', label: 'Couples', group: 'traveler' },
]

interface CategoryFiltersProps {
    selectedCategories: CategoryType[]
    onCategoryToggle: (category: CategoryType) => void
    onClearAll: () => void
}

const CategoryFilters: React.FC<CategoryFiltersProps> = ({
    selectedCategories,
    onCategoryToggle,
    onClearAll
}) => {
    if (AVAILABLE_CATEGORIES.length === 0) return null

    return (
        <div className="w-full">
            {/* Filter Header - Compact */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-header-black font-red-hat-display">
                    Categories
                </h3>
                {selectedCategories.length > 0 && (
                    <button
                        onClick={onClearAll}
                        className="text-xs text-primary-default hover:text-primary-hover font-red-hat-display flex items-center gap-1">
                        <X className="w-3 h-3" />
                        Clear
                    </button>
                )}
            </div>

            {/* Category Chips - Scrollable Horizontal */}
            <div className="flex gap-1.5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                {AVAILABLE_CATEGORIES.map((category) => {
                    const isSelected = selectedCategories.includes(category.id)
                    return (
                        <motion.button
                            key={category.id}
                            onClick={() => onCategoryToggle(category.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all font-red-hat-display whitespace-nowrap flex-shrink-0 ${
                                isSelected
                                    ? 'bg-primary-default text-white shadow-sm'
                                    : 'bg-white border border-feature-card-border text-grey-grey_1 hover:border-primary-default/40 hover:text-header-black'
                            }`}>
                            {category.label}
                        </motion.button>
                    )
                })}
            </div>
        </div>
    )
}

export default CategoryFilters

