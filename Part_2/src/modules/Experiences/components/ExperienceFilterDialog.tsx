import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { PRIORITY_LABELS } from '../constants/filterConstants'

export interface ExperienceFilters {
    categories: string[]
    priorities: string[]
    priceRange?: {
        min: number
        max: number
    }
    recommendationMode: string
}

interface ExperienceFilterDialogProps {
    isOpen: boolean
    onClose: () => void
    onApplyFilters: (filters: ExperienceFilters) => void
    initialFilters?: ExperienceFilters
}

const ExperienceFilterDialog: React.FC<ExperienceFilterDialogProps> = ({
    isOpen,
    onClose,
    onApplyFilters,
    initialFilters = {
        categories: [],
        priorities: [],
        recommendationMode: 'all'
    }
}) => {
    const [filters, setFilters] = useState<ExperienceFilters>(initialFilters)

    // Sync internal filters state with initialFilters prop changes
    useEffect(() => {
        setFilters(initialFilters)
    }, [initialFilters])

    // const categories = Object.entries(CATEGORY_LABELS).map(([id, data]) => ({
    //     id,
    //     label: data.label,
    //     icon: data.icon
    // }))

    const priorities = Object.entries(PRIORITY_LABELS).map(([id, data]) => ({
        id,
        label: data.label,
        description:
            id === '0' ? 'Essential experiences' : id === '2' ? 'Highly recommended' : id === '4' ? 'Unique experiences' : 'Authentic experiences'
    }))

    // const recommendationModes = RECOMMENDATION_MODES

    // const handleCategoryToggle = (categoryId: string) => {
    //     setFilters((prev) => ({
    //         ...prev,
    //         categories: prev.categories.includes(categoryId) ? prev.categories.filter((id) => id !== categoryId) : [...prev.categories, categoryId]
    //     }))
    // }

    const handlePriorityToggle = (priorityId: string) => {
        setFilters((prev) => ({
            ...prev,
            priorities: prev.priorities.includes(priorityId) ? prev.priorities.filter((id) => id !== priorityId) : [...prev.priorities, priorityId]
        }))
    }

    // const handleRecommendationModeChange = (mode: string) => {
    //     setFilters((prev) => ({
    //         ...prev,
    //         recommendationMode: mode
    //     }))
    // }

    // const handlePriceRangeChange = (field: 'min' | 'max', value: number) => {
    //     setFilters((prev) => ({
    //         ...prev,
    //         priceRange: {
    //             min: prev.priceRange?.min || 0,
    //             max: prev.priceRange?.max || 10000,
    //             [field]: value
    //         }
    //     }))
    // }

    const handleApplyFilters = () => {
        onApplyFilters(filters)
        onClose()
    }

    const handleClearFilters = () => {
        setFilters({
            categories: [],
            priorities: [],
            recommendationMode: 'all'
        })
    }

    if (!isOpen) return null

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-natural-black_20"
            onClick={onClose}>
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-natural-white border border-feature-card-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg"
                onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-header-black">Filter Experiences</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-grey-grey_5 rounded-full transition-colors">
                        <X className="h-5 w-5 text-grey-grey_2" />
                    </button>
                </div>

                {/* Categories Section */}
                {/* <div className="mb-8">
                    <h3 className="text-lg font-medium text-header-black mb-4">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => handleCategoryToggle(category.id)}
                                className={`px-4 py-2 rounded-full border transition-colors inline-flex items-center gap-2 cursor-pointer ${
                                    filters.categories.includes(category.id)
                                        ? 'border-primary-default bg-primary-default_80'
                                        : 'border-grey-grey_2 hover:border-grey-grey_3 hover:bg-grey-grey_5'
                                }`}>
                                <span className="text-base">{category.icon}</span>
                                <span className="text-sm font-medium text-header-black">{category.label}</span>
                            </button>
                        ))}
                    </div>
                </div> */}

                {/* Priority Section */}
                <div className="mb-8">
                    <h3 className="text-lg font-medium text-header-black mb-4">Experience Type</h3>
                    <div className="flex flex-wrap gap-2">
                        {priorities.map((priority) => (
                            <button
                                key={priority.id}
                                onClick={() => handlePriorityToggle(priority.id)}
                                className={`p-2 px-4 rounded-lg border transition-colors text-left cursor-pointer flex items-center gap-2 ${
                                    filters.priorities.includes(priority.id)
                                        ? 'border-primary-default bg-primary-default-80'
                                        : 'border-grey_4 hover:border-grey-grey_3 hover:bg-grey-grey_5'
                                }`}>
                                <img
                                    src={PRIORITY_LABELS[priority.id].icon}
                                    alt={priority.label}
                                    className="w-5 h-5 object-contain"
                                />
                                <div className="font-medium text-header-black">{priority.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Price Range Section */}
                {/* <div className="mb-8">
                    <h3 className="text-lg font-medium text-header-black mb-4">Price Range</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-sm text-grey-grey_2 mb-2">Min Price</label>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-grey-grey_2" />
                                <input
                                    type="number"
                                    value={filters.priceRange?.min || ''}
                                    onChange={(e) => handlePriceRangeChange('min', Number(e.target.value) || 0)}
                                    className="w-full pl-10 pr-3 py-2 border border-grey-grey_2 rounded-lg focus:border-primary-default focus:outline-none"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm text-grey-grey_2 mb-2">Max Price</label>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-grey-grey_2" />
                                <input
                                    type="number"
                                    value={filters.priceRange?.max || ''}
                                    onChange={(e) => handlePriceRangeChange('max', Number(e.target.value) || 0)}
                                    className="w-full pl-10 pr-3 py-2 border border-grey-grey_2 rounded-lg focus:border-primary-default focus:outline-none"
                                    placeholder="10000"
                                />
                            </div>
                        </div>
                    </div>
                </div> */}

                {/* Recommendation Mode Section */}
                {/* <div className="mb-8">
                    <h3 className="text-lg font-medium text-header-black mb-4">Recommendation Mode</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {recommendationModes.map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => handleRecommendationModeChange(mode.id)}
                                className={`p-3 rounded-lg border transition-colors text-center cursor-pointer ${
                                    filters.recommendationMode === mode.id
                                        ? 'border-primary-default bg-primary-default_80'
                                        : 'border-grey-grey_2 hover:border-grey-grey_3 hover:bg-grey-grey_5'
                                }`}>
                                <span className="text-sm font-medium text-header-black">{mode.label}</span>
                            </button>
                        ))}
                    </div>
                </div> */}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-grey-grey_2">
                    <button
                        onClick={handleClearFilters}
                        className="px-4 py-2 text-sm font-medium text-grey-grey_2 hover:text-header-black transition-colors">
                        Clear All
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-grey-grey_2 rounded-lg text-sm font-medium text-header-black hover:bg-grey-grey_5 transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleApplyFilters}
                            className="px-6 py-2 bg-primary-default text-natural-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors">
                            Apply Filters
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}

export default ExperienceFilterDialog
