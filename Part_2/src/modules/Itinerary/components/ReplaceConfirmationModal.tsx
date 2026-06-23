import React, { useState } from 'react'
import { X, Replace } from 'lucide-react'
import Typography from '@/components/shared/Typography'

interface ReplaceConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
}

const ReplaceConfirmationModal: React.FC<ReplaceConfirmationModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [confirmText, setConfirmText] = useState('')

    if (!isOpen) return null

    const handleConfirm = () => {
        if (confirmText.toLowerCase() === 'replace') {
            onConfirm()
        }
    }

    const handleClose = () => {
        setConfirmText('')
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
            <div
                className="bg-white rounded-lg border border-feature-card-border shadow-lg w-full max-w-md"
                onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-feature-card-border">
                    <Typography
                        size="18"
                        weight="semibold"
                        family="manrope"
                        color="grey-0">
                        Replace Existing Itinerary
                    </Typography>
                    <button
                        onClick={handleClose}
                        className="p-1 hover:bg-grey-5 rounded transition-colors">
                        <X className="h-5 w-5 text-grey-2" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <Typography
                        size="14"
                        weight="medium"
                        family="manrope"
                        color="grey-0">
                        This action cannot be undone. This will replace your existing itinerary.
                    </Typography>
                    <Typography
                        size="12"
                        weight="medium"
                        family="manrope"
                        color="grey-2"
                        className="mb-2">
                        Type <span className="font-semibold text-grey-0">replace</span> to confirm:
                    </Typography>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Type 'replace' to confirm"
                        className="w-full rounded-xl bg-white font-medium outline-none p-[16px] text-size-16 transition-all text-grey-0 border border-grey-4"
                        style={{
                            fontFamily: "'Manrope', sans-serif",
                            color: 'var(--color-grey-0)',
                            lineHeight: '100%',
                            letterSpacing: '-1%'
                        }}
                        autoFocus
                    />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-feature-card-border">
                    <button
                        onClick={handleClose}
                        className="h-10 px-4 flex items-center justify-center rounded-md border border-grey-4 hover:bg-grey-5 transition-colors cursor-pointer">
                        <div
                            className="font-red-hat-display text-grey-1"
                            style={{ fontWeight: 550, fontSize: '14px' }}>
                            Cancel
                        </div>
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={confirmText.toLowerCase() !== 'replace'}
                        className={`h-10 px-4 flex items-center justify-center gap-2 rounded-md transition-all duration-400 ${
                            confirmText.toLowerCase() === 'replace'
                                ? 'bg-primary-default text-natural-white hover:bg-primary-light cursor-pointer'
                                : 'bg-grey-4 text-grey-2 cursor-not-allowed'
                        }`}>
                        <Replace className="h-4 w-4" />
                        <div
                            className="font-red-hat-display"
                            style={{
                                fontWeight: 550,
                                fontSize: '14px',
                                color: confirmText.toLowerCase() === 'replace' ? 'var(--color-natural-white)' : 'var(--color-grey-2)'
                            }}>
                            Replace
                        </div>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ReplaceConfirmationModal
