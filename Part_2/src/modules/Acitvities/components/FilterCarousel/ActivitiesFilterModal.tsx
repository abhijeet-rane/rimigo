import React from 'react'
import type { FilterMetadata, FilterInitialData, FilterResult } from '../../types/filterAndSortTypes'

interface ActivitiesFilterModalProps {
    /** Whether the modal is open */
    isOpen: boolean
    /** Handler to close the modal */
    onClose: () => void
    /** Button element to position modal below */
    anchorElement: HTMLElement | null
    /** Filter metadata - available filter options (from API) */
    metadata?: FilterMetadata
    /** Initial filter data - currently selected filters */
    initialData?: FilterInitialData
    /** Handler when filters are applied */
    onApply: (result: FilterResult) => void
    /** Handler when filters are cleared */
    onClear: () => void
}

/**
 * ActivitiesFilterModal - Modal for filtering activities/experiences
 *
 * Currently disabled/placeholder. Will be implemented when filter API is ready.
 *
 * @example
 * ```tsx
 * <ActivitiesFilterModal
 *   isOpen={isFilterOpen}
 *   onClose={closeFilter}
 *   anchorElement={filterButtonRef.current}
 *   metadata={filterMetadata}
 *   initialData={filterInitialData}
 *   onApply={(result) => handleFilterApply(result)}
 *   onClear={handleFilterClear}
 * />
 * ```
 */
const ActivitiesFilterModal: React.FC<ActivitiesFilterModalProps> = () => {
    // TODO: Implement filter modal UI when filter API is ready
    // For now, this is a placeholder that doesn't render anything
    return null
}

export default ActivitiesFilterModal
