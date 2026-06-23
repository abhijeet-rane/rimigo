import { Plus, Check, Loader2 } from 'lucide-react'

interface StayAddBadgeProps {
    isSaved: boolean
    isAdding: boolean
    onAdd: () => void
}

const StayAddBadge: React.FC<StayAddBadgeProps> = ({ isSaved, isAdding, onAdd }) => {
    if (isSaved) {
        return (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 font-semibold text-xs">
                <Check className="w-3.5 h-3.5" />
                Saved
            </div>
        )
    }
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation()
                onAdd()
            }}
            disabled={isAdding}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-grey-4 hover:bg-grey-5 text-grey-0 font-semibold text-xs shadow-sm transition-colors disabled:opacity-50 cursor-pointer">
            {isAdding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
                <Plus className="w-3.5 h-3.5" />
            )}
            {isAdding ? 'Adding...' : 'Add'}
        </button>
    )
}

export default StayAddBadge
