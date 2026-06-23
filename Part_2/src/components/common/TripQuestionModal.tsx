import { createPortal } from 'react-dom'
import { ReactNode } from 'react'

interface TripQuestionModalProps {
    isOpen: boolean
    onClose: () => void
    anchorRect?: DOMRect | null
    children: ReactNode
    width?: number
    centered?: boolean
}

const TripQuestionModal = ({ isOpen, onClose, anchorRect, children, width = 390, centered = false }: TripQuestionModalProps) => {
    if (!isOpen) {
        return null
    }

    // Centered mode - display in the center with overlay
    if (centered || !anchorRect) {
        return createPortal(
            <div className="fixed inset-0 z-150">
                {/* Overlay with 12% opacity */}
                <div
                    className="absolute inset-0 bg-black/60"
                    onClick={onClose}
                />
                {/* Centered modal */}
                <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div
                        className="flex max-h-[90vh] flex-col rounded-lg bg-white shadow-2xl overflow-hidden"
                        style={{ width: `${width}px` }}>
                        <div className="flex-1 overflow-y-auto scrollbar-hide">{children}</div>
                    </div>
                </div>
            </div>,
            document.body
        )
    }

    // Anchored mode - display relative to anchor element
    const top = anchorRect.bottom + 12
    const left = anchorRect.left + anchorRect.width / 2 - width / 2
    const clampedLeft = Math.min(Math.max(16, left), window.innerWidth - width - 16)
    const panelHeight = 420
    const maxTop = Math.max(16, window.innerHeight - panelHeight - 16)
    const clampedTop = Math.min(Math.max(16, top), maxTop)

    return createPortal(
        <div className="fixed inset-0 z-150">
            <div
                className="absolute inset-0"
                onClick={onClose}
            />
            <div
                className="absolute flex max-h-[80vh] flex-col rounded-[24px] bg-white shadow-xl"
                style={{ top: clampedTop, left: clampedLeft, width: `${width}px` }}>
                <div className="flex-1 overflow-y-auto">{children}</div>
            </div>
        </div>,
        document.body
    )
}

export default TripQuestionModal
