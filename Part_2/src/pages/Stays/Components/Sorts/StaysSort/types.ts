/**
 * Sort option definition
 */
export interface SortOption {
    id: string
    label: string
    description?: string
    orderBy: Record<string, number>
}

/**
 * Metadata for Stays Sort (available sort options)
 */
export interface StaysSortMetadata {
    sortOptions: SortOption[]
}

/**
 * Initial Data for Stays Sort (currently selected sort)
 */
export interface StaysSortInitialData {
    currentOrderBy: Record<string, number>
}

/**
 * Result of Stays Sort (selected sort order)
 */
export interface StaysSortResult {
    orderBy: Record<string, number>
}
