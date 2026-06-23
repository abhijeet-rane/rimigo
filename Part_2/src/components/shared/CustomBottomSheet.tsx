import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

interface CustomBottomSheetProps {
    open: boolean
    onClose: () => void
    children: React.ReactNode
    height?: string
    className?: string
    showHandle?: boolean
    /** Override the root container's z-index class — needed when opened from inside a high-z-index modal. */
    containerClassName?: string
}

export const CustomBottomSheet: React.FC<CustomBottomSheetProps> = ({
    open,
    onClose,
    children,
    height = '85vh',
    className,
    showHandle = true,
    containerClassName = 'z-[100]'
}) => {
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = prevOverflow
        }
    }, [open, onClose])

    if (typeof document === 'undefined') return null

    return createPortal(
        <div
            aria-hidden={!open}
            className={clsx(
                'fixed inset-0',
                containerClassName,
                open ? 'pointer-events-auto' : 'pointer-events-none'
            )}>
            <div
                onClick={onClose}
                className={clsx(
                    'absolute inset-0 bg-black/50 transition-opacity duration-200',
                    open ? 'opacity-100' : 'opacity-0'
                )}
            />
            <div
                role="dialog"
                aria-modal="true"
                style={{ height }}
                className={clsx(
                    'absolute inset-x-0 bottom-0 bg-natural-white rounded-t-[16px] shadow-[var(--shadow-feature-card)]',
                    'flex flex-col overflow-hidden',
                    'transition-transform duration-300 ease-out',
                    open ? 'translate-y-0' : 'translate-y-full',
                    className
                )}>
                {showHandle && (
                    <div className="flex justify-center pt-2 pb-1 shrink-0">
                        <div className="h-1.5 w-12 rounded-full bg-grey-4" />
                    </div>
                )}
                <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
            </div>
        </div>,
        document.body
    )
}
