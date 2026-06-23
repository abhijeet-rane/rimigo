import { Loader2 } from 'lucide-react'

interface LeaveTripModalProps {
    isOpen: boolean
    isLeaving: boolean
    tripName?: string | null
    onCancel: () => void
    onConfirm: () => void
}

const LeaveTripModal = ({ isOpen, isLeaving, tripName, onCancel, onConfirm }: LeaveTripModalProps) => {
    if (!isOpen) return null
    const title = tripName ? `Leave ${tripName}?` : 'Leave this trip?'

    return (
        <div
            className="fixed inset-0 bg-black/40 z-[110] flex items-center justify-center px-4"
            onClick={() => { if (!isLeaving) onCancel() }}
        >
            <div className="bg-natural-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <h2 className="font-red-hat-display font-bold text-[18px] text-grey-0 mb-2 truncate">{title}</h2>
                <p className="font-red-hat-display font-medium text-[14px] text-grey-2 mb-5">
                    You'll lose access to this trip. Other travelers won't be affected, and you can be re-invited later.
                </p>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLeaving}
                        className="px-4 py-2 rounded-lg border border-grey-4 text-grey-0 font-red-hat-display font-[550] text-[14px] hover:bg-grey-5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLeaving}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-red-hat-display font-[550] text-[14px] hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                        {isLeaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Leave trip
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LeaveTripModal
