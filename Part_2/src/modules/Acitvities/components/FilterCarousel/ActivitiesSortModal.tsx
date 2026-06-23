import React, { useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortMetadata, SortInitialData, SortResult, SortOption } from '../../types/filterAndSortTypes'
import BottomSheet from '../BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

interface ActivitiesSortModalProps {
    /** Whether the modal is open */
    isOpen: boolean
    /** Handler to close the modal */
    onClose: () => void
    /** Button element to position modal below */
    anchorElement: HTMLElement | null
    /** Sort metadata - available sort options */
    metadata?: SortMetadata
    /** Initial sort data - currently selected sort */
    initialData?: SortInitialData
    /** Handler when sort option is selected (applies immediately) */
    onApply: (result: SortResult) => void
}

/**
 * ActivitiesSortModal - Responsive modal for sorting activities/experiences
 *
 * Desktop: Displays a dropdown modal below the sort button
 * Mobile: Displays a bottom sheet that slides up from the bottom
 */
const ActivitiesSortModal: React.FC<ActivitiesSortModalProps> = ({ isOpen, onClose, metadata, initialData, onApply }) => {
    const modalRef = useRef<HTMLDivElement>(null)
    const isMobile = useIsMobile()

    // Get selected sort option
    const selectedSortId = initialData?.selectedSortId
    const sortOptions = metadata?.options || []

    // Handle sort option selection
    const handleSortSelect = (option: SortOption) => {
        const result: SortResult = {
            sortId: option.id,
            sortValue: option.value
        }
        onApply(result)
        onClose()
    }

    if (!isOpen) {
        return null
    }

    // Sort Options Content (shared between mobile and desktop)
    const SortOptionsContent = () => (
        <div className="py-2">
            {sortOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-grey-2">No sort options available</div>
            ) : (
                sortOptions.map((option, index) => {
                    const isSelected = option.id === selectedSortId || option.isSelected

                    return (
                        <React.Fragment key={option.id}>
                            {index > 0 && <div className="h-px bg-grey-4 mx-4" />}
                            <button
                                type="button"
                                onClick={() => handleSortSelect(option)}
                                className={cn(
                                    'w-full flex items-center justify-between px-4 py-3 text-left hover:bg-grey-5 transition-colors',
                                    isSelected && 'bg-primary-default-10'
                                )}>
                                <span
                                    className={cn(
                                        'text-[14px] font-manrope',
                                        isSelected ? 'text-primary-default font-semibold' : 'text-grey-0 font-medium'
                                    )}>
                                    {option.label}
                                </span>
                                {isSelected && (
                                    <Check
                                        className="w-5 h-5 text-primary-default"
                                        strokeWidth={2}
                                    />
                                )}
                            </button>
                        </React.Fragment>
                    )
                })
            )}
        </div>
    )

    // Mobile Bottom Sheet - Using reusable component
    if (isMobile) {
        return (
            <BottomSheet
                isOpen={isOpen}
                onClose={onClose}
                title="Sort by">
                <SortOptionsContent />
            </BottomSheet>
        )
    }

    // Desktop Modal - centered in viewport
    return createPortal(
        <div className="fixed inset-0 z-50 hidden lg:block">
            <div
                className="absolute inset-0 bg-black/20"
                onClick={onClose}
            />

            <div
                ref={modalRef}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-feature-card-border rounded-lg shadow-lg w-[320px]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-grey-4">
                    <h3 className="text-base font-semibold font-manrope text-grey-0">Sort by</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-grey-5 hover:bg-grey-4 transition-colors">
                        <X
                            className="w-4 h-4 text-grey-0"
                            strokeWidth={2}
                        />
                    </button>
                </div>

                <SortOptionsContent />
            </div>
        </div>,
        document.body
    )
}

export default ActivitiesSortModal
