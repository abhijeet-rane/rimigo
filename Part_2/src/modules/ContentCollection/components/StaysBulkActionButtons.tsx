import { CheckSquare, Trash2 } from 'lucide-react'

interface StaysBulkActionButtonsProps {
    show: boolean
    bulkSelectMode: boolean
    selectedSectionIds?: Set<string>
    bulkVisibleStaySectionIds: string[]
    onToggleBulkSelectMode?: () => void
    onBulkSelectAll?: (sectionIds: string[]) => void
    onBulkDeleteSelected?: () => void | Promise<void>
}

const StaysBulkActionButtons: React.FC<StaysBulkActionButtonsProps> = ({
    show,
    bulkSelectMode,
    selectedSectionIds,
    bulkVisibleStaySectionIds,
    onToggleBulkSelectMode,
    onBulkSelectAll,
    onBulkDeleteSelected,
}) => {
    if (!show) return null

    const allVisibleStaySectionsSelected =
        bulkVisibleStaySectionIds.length > 0 &&
        bulkVisibleStaySectionIds.every((id) => selectedSectionIds?.has(id))

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={onToggleBulkSelectMode}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-grey-4 bg-white hover:bg-grey-5 transition-colors text-grey-0 font-red-hat-display font-semibold text-sm">
                <CheckSquare className="w-4 h-4" />
                {bulkSelectMode ? 'Cancel' : 'Select'}
            </button>
            {bulkSelectMode && onBulkSelectAll && (
                <button
                    type="button"
                    onClick={() => onBulkSelectAll(bulkVisibleStaySectionIds)}
                    disabled={bulkVisibleStaySectionIds.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-grey-4 bg-white hover:bg-grey-5 transition-colors text-grey-0 font-red-hat-display font-semibold text-sm disabled:opacity-50">
                    {allVisibleStaySectionsSelected ? 'Deselect all' : 'Select all'}
                </button>
            )}
            {bulkSelectMode && (
                <button
                    type="button"
                    onClick={() => void onBulkDeleteSelected?.()}
                    disabled={!selectedSectionIds || selectedSectionIds.size === 0}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors font-red-hat-display font-semibold text-sm disabled:opacity-50">
                    <Trash2 className="w-4 h-4" />
                    Delete ({selectedSectionIds?.size ?? 0})
                </button>
            )}
        </div>
    )
}

export default StaysBulkActionButtons
