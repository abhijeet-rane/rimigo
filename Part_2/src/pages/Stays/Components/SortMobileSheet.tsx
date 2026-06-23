import { useRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import Typography from '@/components/shared/Typography'
import { SortRegistry, type SortType } from './Sorts/registry'
import { X } from 'lucide-react'

interface SortMobileSheetProps<TMetadata = any, TInitialData = any, TResult = any> {
    isOpen: boolean
    onClose: () => void
    type: SortType
    metadata?: TMetadata
    initialData?: TInitialData
    onChange: (result: TResult) => void
    onApply: (result: TResult) => void
}

export const SortMobileSheet = <TMetadata, TInitialData, TResult>({
    isOpen,
    onClose,
    type,
    metadata,
    initialData,
    onChange,
    onApply
}: SortMobileSheetProps<TMetadata, TInitialData, TResult>) => {
    const currentResultRef = useRef<TResult | null>(null)

    const SortContent = SortRegistry[type]

    if (!SortContent) {
        console.error(`Sort type "${type}" not found in registry`)
        return null
    }

    const handleChange = (result: TResult) => {
        currentResultRef.current = result
        onChange(result)
    }

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
                <DialogOverlay className="fixed inset-0 bg-black/40 z-90" />

                <DialogPrimitive.Content
                    className={cn(
                        'fixed bottom-0 left-0 right-0 z-91',
                        'max-h-[90vh] bg-white',
                        'rounded-t-2xl',
                        'flex flex-col',
                        'animate-in slide-in-from-bottom duration-300'
                    )}>
                    {/* Drag Handle */}

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-grey-4 shadow-md">
                        <Typography
                            size="18"
                            family="redhat"
                            weight="semibold">
                            Sort by
                        </Typography>
                        <button
                            onClick={onClose}
                            className=" flex items-center justify-center w-10 h-10 rounded-full bg-grey-4 ">
                            <X
                                size={24}
                                className="text-grey-0"
                            />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        <SortContent
                            metadata={metadata}
                            initialData={initialData}
                            onChange={handleChange}
                            onApply={handleApply}
                        />
                    </div>

                    {/* Footer (optional, if SortContent doesn’t auto-apply) */}
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    )
}
