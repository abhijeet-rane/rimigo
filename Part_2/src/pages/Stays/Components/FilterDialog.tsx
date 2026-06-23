import { useRef } from 'react'
import { Dialog, DialogPortal, DialogOverlay, DialogDescription } from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { FilterRegistry, type FilterType } from './Filters/registry'

interface FilterDialogProps<TMetadata = any, TInitialData = any, TResult = any> {
    isOpen: boolean
    onClose: () => void
    type: FilterType
    metadata?: TMetadata
    initialData?: TInitialData
    onChange: (result: TResult) => void
    onApply: (result: TResult) => void
    onClear: () => void
    containerClass?:string
}

export const FilterDialog = <TMetadata, TInitialData, TResult>({
    isOpen,
    onClose,
    type,
    metadata,
    initialData,
    onChange,
    onApply,
    onClear,
    containerClass
}: FilterDialogProps<TMetadata, TInitialData, TResult>) => {
    // Track current filter result for Apply button
    const currentResultRef = useRef<TResult | null>(null)

    // Get content component from registry
    const FilterContent = FilterRegistry[type]

    if (!FilterContent) {
        console.error(`Filter type "${type}" not found in registry`)
        return null
    }

    // Handle filter changes (real-time)
    const handleChange = (result: TResult) => {
        currentResultRef.current = result
        onChange(result)
    }

    // Handle apply button click
    const handleApply = () => {
        if (currentResultRef.current) {
            onApply(currentResultRef.current)
        }
        onClose()
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={onClose}>
            <DialogPortal>
                <DialogOverlay />
                <DialogPrimitive.Content
                    className={cn(
                        'fixed left-[50%] top-[50%] z-500 w-full max-w-[560px] max-h-[75vh] translate-x-[-50%] translate-y-[-50%] border bg-natural-white shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg overflow-hidden p-0',`${containerClass}`
                    )}>
                    {/* Custom Header with rounded top corners */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-feature-card-border rounded-t-lg">
                        <h2 className="text-xl font-semibold text-grey-grey_0">Filters</h2>
                        <button
                            onClick={onClose}
                            className="cursor-pointer p-2 hover:bg-grey-grey_4 rounded-full transition-colors">
                            <svg
                                className="w-5 h-5 text-grey-grey_1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    <DialogDescription className="sr-only">Filter your search results</DialogDescription>

                    {/* Dynamic Content from Registry */}
                    <div className="overflow-y-auto max-h-[calc(75vh-140px)]">
                        <FilterContent
                            metadata={metadata}
                            initialData={initialData}
                            onChange={handleChange}
                            onApply={handleApply}
                            onClear={onClear}
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-feature-card-border">
                        <button
                            onClick={() => {
                                onClear()
                            }}
                            className="cursor-pointer text-sm font-medium text-grey-grey_1 hover:text-grey-grey_0 transition-colors">
                            Clear all
                        </button>
                        <button
                            onClick={handleApply}
                            className="cursor-pointer bg-primary-default text-natural-white px-6 py-3 rounded-full text-sm font-medium hover:bg-primary-default_80 transition-colors">
                            Apply filters
                        </button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    )
}
