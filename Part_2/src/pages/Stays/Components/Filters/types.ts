import React from 'react'

/**
 * Generic Filter Content Props
 *
 * @template TMetadata - UI structure data (options, buckets, etc.)
 * @template TInitialData - Preselected/prefilled values
 * @template TResult - Filter result/output
 */
export interface FilterContentProps<TMetadata = any, TInitialData = any, TResult = any> {
    /** UI structure data (e.g., price buckets, property type options, amenity list) */
    metadata?: TMetadata

    /** Preselected/prefilled values (e.g., selected price range, selected types) */
    initialData?: TInitialData

    /** Called when filter values change (real-time) */
    onChange: (result: TResult) => void

    /** Called when "Apply filters" button is clicked */
    onApply: (result: TResult) => void

    /** Called when filters are cleared */
    onClear: () => void
}

/**
 * Filter Content Component Type
 */
export interface FilterContentComponent<TMetadata = any, TInitialData = any, TResult = any> {
    (props: FilterContentProps<TMetadata, TInitialData, TResult>): React.JSX.Element
}
