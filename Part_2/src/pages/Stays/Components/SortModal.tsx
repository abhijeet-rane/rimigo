import { useRef } from 'react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { SortRegistry, type SortType } from './Sorts/registry'

interface SortModalProps<TMetadata = any, TInitialData = any, TResult = any> {
    isOpen: boolean
    onClose: () => void
    type: SortType
    metadata?: TMetadata
    initialData?: TInitialData
    onChange: (result: TResult) => void
    onApply: (result: TResult) => void
    containerClass?:string
}

export const SortModal = <TMetadata, TInitialData, TResult>({
    isOpen,
    onClose,
    type,
    metadata,
    initialData,
    onChange,
    onApply,
    containerClass
}: SortModalProps<TMetadata, TInitialData, TResult>) => {
    // Track current sort result for Apply
    const currentResultRef = useRef<TResult | null>(null)

    // Get content component from registry
    const SortContent = SortRegistry[type]

    if (!SortContent) {
        console.error(`Sort type "${type}" not found in registry`)
        return null
    }

    // Handle sort changes (real-time)
    const handleChange = (result: TResult) => {
        currentResultRef.current = result
        onChange(result)
    }

    // Handle apply (commit and close)
    const handleApply = (result: TResult) => {
        onApply(result)
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
                        'fixed right-100 top-[120px] z-500 w-[320px] bg-white border border-feature-card-border rounded-lg shadow-lg',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',`${containerClass}`
                    )}>
                    {/* Dynamic Content from Registry */}
                    <SortContent
                        metadata={metadata}
                        initialData={initialData}
                        onChange={handleChange}
                        onApply={handleApply}
                    />
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    )
}
