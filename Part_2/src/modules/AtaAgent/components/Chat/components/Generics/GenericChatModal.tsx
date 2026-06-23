import React, { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface GenericChatModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    description?: string
    children: ReactNode
    width?: number | string
    showOverlay?: boolean
}

const GenericChatModal: React.FC<GenericChatModalProps> = ({ isOpen, onClose, title, description, children, width = 500, showOverlay = true }) => {
    if (!isOpen) return null

    const container = typeof document !== 'undefined' ? document.body : null
    if (!container) return null

    const modalContent = (
        <div className="fixed inset-0 z-500 flex items-center justify-center p-4">
            {/* Overlay */}
            {showOverlay && (
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Modal Content */}
            <div
                className="relative bg-white rounded-lg shadow-2xl flex flex-col max-h-[90vh] min-h-[60vh] overflow-hidden"
                style={{ width: typeof width === 'number' ? `${width}px` : width }}
                onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-grey_4">
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold text-grey_0 font-red-hat-display mb-1">{title}</h2>
                        {description && <p className="text-sm text-grey_2 font-manrope">{description}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-4 p-2 hover:bg-grey_5 rounded-full transition-colors shrink-0">
                        <X className="w-5 h-5 text-grey_2" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden px-6 py-4">{children}</div>
            </div>
        </div>
    )

    return createPortal(modalContent, container)
}

export default GenericChatModal
