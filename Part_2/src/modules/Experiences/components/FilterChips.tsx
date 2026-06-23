import React from 'react'
import { X } from 'lucide-react'
import { ExperienceFilters } from '../components/ExperienceFilterDialog'
import { CityFilter } from '../types/city'
import {
    CATEGORY_LABELS,
    PRIORITY_LABELS,
    RECOMMENDATION_MODE_LABELS,
    RECOMMENDATION_ICON,
    PRICE_ICON,
    DEFAULT_ICON
} from '../constants/filterConstants'

interface FilterChipsProps {
    cityFilters: CityFilter[]
    appliedFilters: ExperienceFilters
    onCitySelect: (cityId: string) => void
    onRemoveCity?: (cityId: string) => void
    onClearFilter: (filterType: keyof ExperienceFilters, value?: string) => void
    onTogglePriority?: (priorityId: string) => void
    isCitiesLoading: boolean
    experiencePreferences?: Array<{ id: number; labelUi: string; backendValue: string; description: string; imageSrc: string; type: 'day' | 'month' }>
}

const FilterChips: React.FC<FilterChipsProps> = ({
    cityFilters,
    appliedFilters,
    onCitySelect,
    onRemoveCity,
    onClearFilter,
    onTogglePriority,
    isCitiesLoading,
    experiencePreferences
}) => {
    if (isCitiesLoading || cityFilters.length === 0) {
        return null
    }

    // Get all suggestion priorities from PRIORITY_LABELS
    const allSuggestionPriorities = Object.entries(PRIORITY_LABELS).map(([id, data]) => ({
        id,
        label: data.label,
        icon: data.icon
    }))

    // Check if there are any other filters applied (excluding suggestion priorities)
    const selectedCity = cityFilters.find((city) => city.isSelected && city.id !== 'all')
    const hasCategories = appliedFilters.categories.length > 0
    const hasRecommendationMode = appliedFilters.recommendationMode !== 'all'
    const hasPriceRange = !!appliedFilters.priceRange
    const hasOtherFilters = selectedCity || hasCategories || hasRecommendationMode || hasPriceRange

    // Always show filter chips if there are suggestion priorities or other filters
    const shouldShow = allSuggestionPriorities.length > 0 || hasOtherFilters

    if (!shouldShow) {
        return null
    }

    return (
        <div className="sticky top-16 z-30 bg-natural-white border-b border-feature-card-border">
            <div className="container mx-auto px-6 py-3">
                <div className="flex flex-wrap gap-2">
                    {/* Suggestion Priority filter chips - show all as toggleable options */}
                    {allSuggestionPriorities.map((priority) => {
                        const isActive = appliedFilters.priorities.includes(priority.id)
                        const priorityInfo = PRIORITY_LABELS[priority.id]
                            ? {
                                  icon: PRIORITY_LABELS[priority.id].icon,
                                  label: PRIORITY_LABELS[priority.id].label
                              }
                            : null

                        if (!priorityInfo) {
                            return null
                        }

                        return (
                            <button
                                key={`suggestion-priority-${priority.id}`}
                                onClick={() => {
                                    if (onTogglePriority) {
                                        onTogglePriority(priority.id)
                                    }
                                }}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-feature-card-border text-sm transition-colors cursor-pointer ${
                                    isActive
                                        ? 'bg-primary-default-80 text-grey-0 border-primary-default hover:bg-primary-default-80'
                                        : 'bg-natural-white text-header-black hover:bg-grey-grey_5'
                                }`}>
                                <img
                                    src={priorityInfo.icon}
                                    alt={priorityInfo.label}
                                    className="w-5 h-5 object-contain"
                                />
                                <span>{priorityInfo.label}</span>
                            </button>
                        )
                    })}

                    {/* Selected city chips - appear after priority filters */}
                    {cityFilters
                        .filter((city) => city.isSelected && city.id !== 'all')
                        .map((selectedCity) => (
                            <div
                                key={`city-${selectedCity.id}`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-feature-card-border bg-natural-white text-sm text-header-black hover:bg-grey-grey_5">
                                {/* <span className="text-base leading-none">{CITY_ICON}</span> */}
                                <span>{selectedCity.name}</span>
                                <button
                                    onClick={() => {
                                        if (onRemoveCity) {
                                            onRemoveCity(selectedCity.id)
                                        } else {
                                            onCitySelect('all')
                                        }
                                    }}
                                    className="cursor-pointer">
                                    <X className="h-3.5 w-3.5 text-grey-grey_2" />
                                </button>
                            </div>
                        ))}

                    {/* Category filter chips */}
                    {appliedFilters.categories.map((category) => {
                        const info = CATEGORY_LABELS[category] || { label: category, icon: DEFAULT_ICON }
                        return (
                            <div
                                key={`category-${category}`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-feature-card-border bg-natural-white text-sm text-header-black hover:bg-grey-grey_5">
                                <span className="text-base leading-none">{info.icon}</span>
                                <span>{info.label}</span>
                                <button
                                    onClick={() => onClearFilter('categories', category)}
                                    className="cursor-pointer">
                                    <X className="h-3.5 w-3.5 text-grey-grey_2" />
                                </button>
                            </div>
                        )
                    })}

                    {/* Experience preference priorities (from experiencePreferences prop) - shown after suggestion priorities */}
                    {appliedFilters.priorities
                        .filter((priority) => !PRIORITY_LABELS[priority])
                        .map((priority) => {
                            const priorityInfo = experiencePreferences?.find((pref) => pref.backendValue === priority)
                            if (!priorityInfo) {
                                return null
                            }

                            return (
                                <div
                                    key={`exp-preference-${priority}`}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-feature-card-border text-sm hover:opacity-90 transition-opacity">
                                    <img
                                        src={priorityInfo.imageSrc}
                                        alt={priorityInfo.labelUi}
                                        className="w-5 h-5 object-contain"
                                    />
                                    <span>{priorityInfo.labelUi}</span>
                                    <button
                                        onClick={() => onClearFilter('priorities', priority)}
                                        className="cursor-pointer ml-1">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )
                        })}

                    {/* Recommendation mode chip */}
                    {appliedFilters.recommendationMode !== 'all' && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-feature-card-border bg-natural-white text-sm text-header-black hover:bg-grey-grey_5">
                            <span className="text-base leading-none">{RECOMMENDATION_ICON}</span>
                            <span>{RECOMMENDATION_MODE_LABELS[appliedFilters.recommendationMode]}</span>
                            <button
                                onClick={() => onClearFilter('recommendationMode')}
                                className="cursor-pointer">
                                <X className="h-3.5 w-3.5 text-grey-grey_2" />
                            </button>
                        </div>
                    )}

                    {/* Price range chip */}
                    {appliedFilters.priceRange && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-feature-card-border bg-natural-white text-sm text-header-black hover:bg-grey-grey_5">
                            <span className="text-base leading-none">{PRICE_ICON}</span>
                            <span>
                                ₹{appliedFilters.priceRange.min} - ₹{appliedFilters.priceRange.max}
                            </span>
                            <button
                                onClick={() => onClearFilter('priceRange')}
                                className="cursor-pointer">
                                <X className="h-3.5 w-3.5 text-grey-grey_2" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default FilterChips
