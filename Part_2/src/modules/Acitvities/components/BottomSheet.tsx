import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
    /** Whether the bottom sheet is open */
    isOpen: boolean
    /** Handler to close the bottom sheet */
    onClose: () => void
    /** Title displayed in the header */
    title?: string
    /** Children to render inside the bottom sheet */
    children: React.ReactNode
    /** Additional className for the sheet container */
    className?: string
    /** Whether to show the close button in header (default: true) */
    showCloseButton?: boolean
    /** Whether to show the header (default: true) */
    showHeader?: boolean
    /** Max height of the sheet (default: 80vh) */
    maxHeight?: string
    /** Custom header content (overrides title and close button) */
    headerContent?: React.ReactNode
    /** Disable overlay click to close (default: false) */
    disableOverlayClose?: boolean
}

/**
 * BottomSheet - Reusable animated bottom sheet component for mobile interfaces
 *
 * Features:
 * - Slides up from bottom with smooth animation
 * - Locks body scroll when open
 * - Click overlay to close
 * - Customizable header
 * - Scrollable content area
 *
 * @example
 * ```tsx
 * <BottomSheet
 *   isOpen={isOpen}
 *   onClose={closeSheet}
 *   title="Sort by"
 * >
 *   <div>Your content here</div>
 * </BottomSheet>
 * ```
 */
const BottomSheet: React.FC<BottomSheetProps> = ({
    isOpen,
    onClose,
    title,
    children,
    className,
    showCloseButton = true,
    showHeader = true,
    maxHeight = '80vh',
    headerContent,
    disableOverlayClose = false
}) => {
    const sheetRef = useRef<HTMLDivElement>(null)

    // Lock body scroll when sheet is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = ''
            }
        }
    }, [isOpen])

    // Handle overlay click
    const handleOverlayClick = () => {
        if (!disableOverlayClose) {
            onClose()
        }
    }

    if (!isOpen) {
        return null
    }

    return createPortal(
        // z-[200] sits above the FloatingAssistantChip (z-[60] for the
        // dismissed-wand state, z-[120] for the expanded input). Without
        // the bump, opening a sort/filter bottom-sheet would slide it
        // up *under* the floating AI input and the sheet content would
        // be obscured.
        <div className="fixed inset-0 z-[200]">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
                onClick={handleOverlayClick}
            />

            {/* Bottom Sheet */}
            <div
                ref={sheetRef}
                className={cn(
                    'absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden',
                    className
                )}
                style={{ maxHeight }}>
                {/* Header */}
                {showHeader && (
                    <div className="flex items-center justify-between px-4 py-4 border-b border-grey-4 sticky top-0 bg-white z-10">
                        {headerContent ? (
                            headerContent
                        ) : (
                            <>
                                <h3 className="text-lg font-semibold font-manrope text-grey-0">{title}</h3>
                                {showCloseButton && (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-grey-5 hover:bg-grey-4 transition-colors">
                                        <X
                                            className="w-5 h-5 text-grey-0"
                                            strokeWidth={2}
                                        />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Content - Scrollable */}
                <div
                    className="overflow-y-auto"
                    style={{ maxHeight: showHeader ? `calc(${maxHeight} - 64px)` : maxHeight }}>
                    {children}
                </div>

                {/* Bottom spacing for safe area */}
                <div className="h-4" />
            </div>
        </div>,
        document.body
    )
}

export default BottomSheet
