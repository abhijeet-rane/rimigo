import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import Typography from '@/components/shared/Typography'

interface DeleteConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title?: string
    message?: string
    isDeleting?: boolean
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Delete Item',
    message = 'Are you sure you want to delete this item? This action cannot be undone.',
    isDeleting = false
}) => {
    if (!isOpen) return null

    const modalContent = (
        <div className="fixed inset-0 z-501 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
            <div
                className="relative bg-white rounded-lg shadow-2xl flex flex-col w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-grey-4">
                    <Typography size="18" weight="semibold" color="grey-0">
                        {title}
                    </Typography>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-grey-5 rounded-full transition-colors"
                        aria-label="Close"
                        disabled={isDeleting}
                    >
                        <X className="w-5 h-5 text-grey-2" />
                    </button>
                </div>

                <div className="flex flex-col flex-1 overflow-y-auto px-6 py-4 gap-4">
                    <Typography size="14" weight="normal" color="grey-1">
                        {message}
                    </Typography>
                </div>

                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-grey-4 bg-grey-5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-lg border border-grey-4 bg-white text-grey-0 font-semibold text-sm hover:bg-grey-5 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    )

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null
}

export default DeleteConfirmationModal
