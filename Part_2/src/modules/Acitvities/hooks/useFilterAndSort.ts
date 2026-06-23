import { useState, useCallback } from 'react'

/**
 * Configuration for Filter button
 */
export interface FilterConfig<TMetadata = unknown, TInitialData = unknown, TResult = unknown> {
    /** Whether the filter button is enabled */
    enabled: boolean
    /** Filter type identifier (e.g., 'activities', 'experiences') */
    type?: string
    /** Metadata for filter options (available filters, structure, etc.) */
    metadata?: TMetadata
    /** Initial filter state (currently selected filters) */
    initialData?: TInitialData
    /** Callback when filter changes (real-time preview) */
    onChange?: (result: TResult) => void
    /** Callback when filter is applied (commits changes) */
    onApply?: (result: TResult) => void
    /** Callback when filter is cleared */
    onClear?: () => void
    /** Custom label for the filter button */
    label?: string
    /** Custom icon for the filter button */
    icon?: string
}

/**
 * Configuration for Sort button
 */
export interface SortConfig<TMetadata = unknown, TInitialData = unknown, TResult = unknown> {
    /** Whether the sort button is enabled */
    enabled: boolean
    /** Sort type identifier (e.g., 'activities', 'experiences') */
    type?: string
    /** Metadata for sort options (available sort orders) */
    metadata?: TMetadata
    /** Initial sort state (currently selected sort) */
    initialData?: TInitialData
    /** Callback when sort changes (real-time preview) */
    onChange?: (result: TResult) => void
    /** Callback when sort is applied (commits changes) */
    onApply?: (result: TResult) => void
    /** Custom label for the sort button */
    label?: string
    /** Custom icon for the sort button */
    icon?: string
}

/**
 * Return type for useFilterAndSort hook
 */
export interface UseFilterAndSortReturn<TFilterMetadata, TFilterInitialData, TFilterResult, TSortMetadata, TSortInitialData, TSortResult> {
    /** Whether filter modal is open */
    isFilterOpen: boolean
    /** Whether sort modal is open */
    isSortOpen: boolean
    /** Handler to open filter modal */
    openFilter: () => void
    /** Handler to close filter modal */
    closeFilter: () => void
    /** Handler to open sort modal */
    openSort: () => void
    /** Handler to close sort modal */
    closeSort: () => void
    /** Filter configuration */
    filterConfig: FilterConfig<TFilterMetadata, TFilterInitialData, TFilterResult>
    /** Sort configuration */
    sortConfig: SortConfig<TSortMetadata, TSortInitialData, TSortResult>
}

/**
 * Hook to manage filter and sort state and handlers
 *
 * This hook provides a generic way to manage filter and sort functionality
 * that can be reused across different pages (Activities, Experiences, etc.)
 *
 * @param filterConfig - Configuration for filter functionality
 * @param sortConfig - Configuration for sort functionality
 * @returns Object containing state and handlers for filter and sort
 *
 * @example
 * ```tsx
 * const { isFilterOpen, isSortOpen, openFilter, openSort, filterConfig, sortConfig } = useFilterAndSort({
 *   filterConfig: {
 *     enabled: true,
 *     type: 'activities',
 *     metadata: { priorities, preferences },
 *     initialData: { selectedPriorities, selectedPreferences },
 *     onApply: (result) => { /* commit to URL *\/ }
 *   },
 *   sortConfig: {
 *     enabled: true,
 *     type: 'activities',
 *     metadata: { sortOptions },
 *     initialData: { currentOrderBy },
 *     onApply: (result) => { /* commit to URL *\/ }
 *   }
 * })
 * ```
 */
export function useFilterAndSort<
    TFilterMetadata = unknown,
    TFilterInitialData = unknown,
    TFilterResult = unknown,
    TSortMetadata = unknown,
    TSortInitialData = unknown,
    TSortResult = unknown
>({
    filterConfig,
    sortConfig
}: {
    filterConfig?: FilterConfig<TFilterMetadata, TFilterInitialData, TFilterResult>
    sortConfig?: SortConfig<TSortMetadata, TSortInitialData, TSortResult>
}): UseFilterAndSortReturn<TFilterMetadata, TFilterInitialData, TFilterResult, TSortMetadata, TSortInitialData, TSortResult> {
    // State for modal visibility
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [isSortOpen, setIsSortOpen] = useState(false)

    // Handlers for filter modal
    const openFilter = useCallback(() => {
        if (filterConfig?.enabled) {
            setIsFilterOpen(true)
        }
    }, [filterConfig?.enabled])

    const closeFilter = useCallback(() => {
        setIsFilterOpen(false)
    }, [])

    // Handlers for sort modal
    const openSort = useCallback(() => {
        if (sortConfig?.enabled) {
            setIsSortOpen(true)
        }
    }, [sortConfig?.enabled])

    const closeSort = useCallback(() => {
        setIsSortOpen(false)
    }, [])

    // Default configurations with enabled flag
    const defaultFilterConfig: FilterConfig<TFilterMetadata, TFilterInitialData, TFilterResult> = {
        enabled: false,
        label: 'Filter',
        ...filterConfig
    }

    const defaultSortConfig: SortConfig<TSortMetadata, TSortInitialData, TSortResult> = {
        enabled: false,
        label: 'Sort',
        ...sortConfig
    }

    return {
        isFilterOpen,
        isSortOpen,
        openFilter,
        closeFilter,
        openSort,
        closeSort,
        filterConfig: defaultFilterConfig,
        sortConfig: defaultSortConfig
    }
}
