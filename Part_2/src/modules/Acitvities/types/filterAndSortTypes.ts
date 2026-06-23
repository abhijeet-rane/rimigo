/**
 * Sort option data structure
 * Used to define available sort options in the sort modal
 */
export interface SortOption {
    /** Unique identifier for the sort option */
    id: string
    /** Display label for the sort option */
    label: string
    /** Optional description or subtitle */
    description?: string
    /** Sort order value (e.g., 'price_asc', 'price_desc', 'popularity') */
    value: string
    /** Whether this option is currently selected */
    isSelected?: boolean
}

/**
 * Sort metadata - defines available sort options
 * This will be populated from the filter API
 */
export interface SortMetadata {
    /** Array of available sort options */
    options: SortOption[]
}

/**
 * Sort initial data - current sort state
 */
export interface SortInitialData {
    /** Currently selected sort option ID */
    selectedSortId?: string
}

/**
 * Sort result - what the user selected
 */
export interface SortResult {
    /** Selected sort option ID */
    sortId: string
    /** Selected sort option value */
    sortValue: string
}

/**
 * Filter option data structure
 * Used to define available filter options (for future use)
 */
export interface FilterOption {
    /** Unique identifier for the filter option */
    id: string
    /** Display label for the filter option */
    label: string
    /** Filter type (e.g., 'price_range', 'category', 'rating') */
    type: string
    /** Filter value(s) */
    value: unknown
}

/**
 * Filter metadata - defines available filter options
 * This will be populated from the filter API
 */
export interface FilterMetadata {
    /** Array of available filter options */
    options: FilterOption[]
    /** Filter categories/groups */
    categories?: Array<{
        id: string
        label: string
        options: FilterOption[]
    }>
}

/**
 * Filter initial data - current filter state
 */
export interface FilterInitialData {
    /** Currently selected filter option IDs */
    selectedFilterIds?: string[]
    /** Additional filter values (e.g., price range) */
    values?: Record<string, unknown>
}

/**
 * Filter result - what the user selected
 */
export interface FilterResult {
    /** Selected filter option IDs */
    filterIds: string[]
    /** Additional filter values */
    values?: Record<string, unknown>
}
