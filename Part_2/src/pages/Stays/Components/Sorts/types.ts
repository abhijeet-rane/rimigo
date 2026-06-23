import React from 'react'

/**
 * Generic Sort Content Props
 *
 * @template TMetadata - Available sort options/structure
 * @template TInitialData - Currently selected sort
 * @template TResult - Sort result/output
 */
export interface SortContentProps<TMetadata = any, TInitialData = any, TResult = any> {
    /** Available sort options (e.g., list of sort types: relevance, price, rating) */
    metadata?: TMetadata

    /** Currently selected sort option */
    initialData?: TInitialData

    /** Called when sort selection changes */
    onChange: (result: TResult) => void

    /** Called when a sort option is selected (commits the change) */
    onApply: (result: TResult) => void
}

/**
 * Sort Content Component Type
 */
export interface SortContentComponent<TMetadata = any, TInitialData = any, TResult = any> {
    (props: SortContentProps<TMetadata, TInitialData, TResult>): React.JSX.Element
}
