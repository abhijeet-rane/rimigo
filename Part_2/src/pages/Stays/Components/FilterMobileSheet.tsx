import { useRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import Typography from '@/components/shared/Typography'
import { FilterRegistry } from './Filters/registry'
import { FilterConfig } from '@/components/common/SearchHeader'
import { X } from 'lucide-react'
interface FilterMobileSheetProps {
    isOpen: boolean
    onClose: () => void
    config: FilterConfig
}

export const FilterMobileSheet = ({ isOpen, onClose, config }: FilterMobileSheetProps) => {
    const currentResultRef = useRef<any>(null)

    if (!config.enabled || !config.type) return null

    const FilterContent = FilterRegistry[config.type]

    if (!FilterContent) {
        console.error(`Filter type "${config.type}" not found`)
        return null
    }

    const handleChange = (result: any) => {
        currentResultRef.current = result
        config.onChange?.(result)
    }

    const handleApply = () => {
        if (currentResultRef.current) {
            config.onApply?.(currentResultRef.current)
        }
        onClose()
    }
    const noop = () => {}

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose()
            }}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 bg-black/40 z-90" />

                <DialogPrimitive.Content className="fixed bottom-0 left-0 right-0 z-91 max-h-[80vh] bg-natural-white rounded-t-2xl flex flex-col animate-in slide-in-from-bottom">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-grey-4 shadow-md">
                        <Typography
                            size="18"
                            family="redhat"
                            weight="semibold">
                            Filter by
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
                        <FilterContent
                            metadata={config.metadata}
                            initialData={config.initialData}
                            onChange={handleChange}
                            onApply={handleApply}
                            onClear={config.onClear ?? noop}
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center px-5 py-4 pb-8 gap-4 border-t border-grey-4">
                        <button
                            type="button"
                            onClick={() => {
                                config.onClear?.()
                                onClose()
                            }}
                            className="text-sm text-grey-0 font-bold font-red-hat-display py-4 flex-1 justify-center items-center rounded-[12px] border border-grey-0">
                            CLEAR FILTER{' '}
                        </button>

                        <button
                            type="button"
                            onClick={handleApply}
                            className="text-sm text-natural-white font-bold font-red-hat-display py-4 flex-1 justify-center items-center rounded-[12px]  bg-grey-0">
                            APPLY
                        </button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    )
}
