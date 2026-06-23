import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, Check, Link2, Share2 } from 'lucide-react'
import { toast } from 'sonner'

interface ShareItineraryModalProps {
    isOpen: boolean
    onClose: () => void
    itineraryId: string
    anchorRect?: DOMRect | null
}

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])
    return isMobile
}

const ShareItineraryModal = ({ isOpen, onClose, itineraryId, anchorRect }: ShareItineraryModalProps) => {
    const [copied, setCopied] = useState(false)
    const [animateIn, setAnimateIn] = useState(false)
    const isMobile = useIsMobile()

    // Animate in on open
    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => setAnimateIn(true))
        } else {
            setAnimateIn(false)
        }
    }, [isOpen])

    // On mobile — try native share immediately when modal opens
    useEffect(() => {
        if (!isOpen || !isMobile) return
        const shareLink = `${window.location.origin}/itinerary/${itineraryId}`

        if (navigator.share) {
            navigator.share({
                title: 'Check out this itinerary!',
                url: shareLink
            }).then(() => {
                onClose()
            }).catch((err) => {
                // User cancelled or error — keep modal open as fallback
                if (err.name === 'AbortError') {
                    onClose()
                }
                // For other errors, the bottom-sheet fallback will show
            })
        }
    }, [isOpen, isMobile, itineraryId, onClose])

    const shareLink = `${window.location.origin}/itinerary/${itineraryId}`

    const handleCopyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(shareLink)
            setCopied(true)
            toast.success('Link copied!')
            setTimeout(() => {
                setCopied(false)
                onClose()
            }, 600)
        } catch {
            toast.error('Failed to copy link')
        }
    }, [shareLink, onClose])

    const handleNativeShare = useCallback(async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Check out this itinerary!',
                    url: shareLink
                })
                onClose()
            } catch {
                // User cancelled — do nothing
            }
        }
    }, [shareLink, onClose])

    const handleClose = useCallback(() => {
        setAnimateIn(false)
        setTimeout(() => {
            setCopied(false)
            onClose()
        }, 200)
    }, [onClose])

    if (!isOpen) return null

    const container = typeof document !== 'undefined' ? document.body : null
    if (!container) return null

    // ── Mobile: Bottom sheet ──
    if (isMobile) {
        return createPortal(
            <div className="fixed inset-0 z-[9999]">
                {/* Backdrop */}
                <div
                    className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
                        animateIn ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={handleClose}
                />

                {/* Bottom sheet */}
                <div
                    className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] transition-transform duration-300 ease-out ${
                        animateIn ? 'translate-y-0' : 'translate-y-full'
                    }`}
                    style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
                >
                    {/* Drag handle */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 rounded-full bg-grey-3/40" />
                    </div>

                    {/* Header */}
                    <div className="px-5 pt-2 pb-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[17px] font-bold font-manrope text-grey-0">
                                Share Itinerary
                            </h2>
                            <button
                                onClick={handleClose}
                                className="w-8 h-8 rounded-full bg-grey-5 flex items-center justify-center cursor-pointer">
                                <X size={16} className="text-grey-1" />
                            </button>
                        </div>
                    </div>

                    {/* Link preview */}
                    <div className="px-5 pb-4">
                        <div className="flex items-center gap-3 bg-grey-5 rounded-xl p-3">
                            <div className="w-9 h-9 rounded-lg bg-primary-default/10 flex items-center justify-center shrink-0">
                                <Link2 size={16} className="text-primary-default" />
                            </div>
                            <p className="text-[13px] font-medium font-manrope text-grey-1 truncate flex-1">
                                {shareLink}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="px-5 pb-5 flex gap-3">
                        <button
                            onClick={handleCopyLink}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-manrope font-semibold text-[14px] transition-all cursor-pointer ${
                                copied
                                    ? 'bg-green-50 text-green-600 border border-green-200'
                                    : 'bg-grey-5 text-grey-0 border border-grey-4 active:scale-[0.97]'
                            }`}>
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'Copied!' : 'Copy Link'}
                        </button>

                        {typeof navigator !== 'undefined' && 'share' in navigator && (
                            <button
                                onClick={handleNativeShare}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-manrope font-semibold text-[14px] bg-primary-default text-white cursor-pointer active:scale-[0.97] transition-transform">
                                <Share2 size={16} />
                                Share
                            </button>
                        )}
                    </div>
                </div>
            </div>,
            container
        )
    }

    // ── Desktop: Positioned popover (always keep full modal + share button in viewport) ──
    const modalWidth = 390
    const estimatedModalHeight = 200
    const padding = 16
    let top = anchorRect ? anchorRect.bottom + 12 : window.innerHeight / 2 - estimatedModalHeight / 2
    const left = anchorRect ? anchorRect.left + anchorRect.width / 2 - modalWidth / 2 : window.innerWidth / 2 - modalWidth / 2
    const clampedLeft = Math.min(Math.max(padding, left), window.innerWidth - modalWidth - padding)
    // Ensure modal doesn't go below viewport so the share/copy button is always visible
    let clampedTop = Math.max(padding, Math.min(top, window.innerHeight - estimatedModalHeight - padding))
    if (clampedTop + estimatedModalHeight > window.innerHeight - padding) {
        clampedTop = window.innerHeight - estimatedModalHeight - padding
    }

    return createPortal(
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0" onClick={handleClose} />
            <div
                className={`absolute flex w-[390px] max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-grey-4/50 transition-all duration-200 ${
                    animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
                style={{ top: clampedTop, left: clampedLeft, transformOrigin: 'top center' }}>

                {/* Accent line */}
                <div className="h-[3px] bg-gradient-to-r from-primary-default via-purple-400 to-primary-default/40 rounded-t-2xl shrink-0" />

                {/* Header */}
                <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary-default/10 flex items-center justify-center">
                            <Share2 size={14} className="text-primary-default" />
                        </div>
                        <h2 className="text-[15px] font-bold font-manrope text-grey-0">Share Itinerary</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-7 h-7 rounded-lg hover:bg-grey-5 flex items-center justify-center cursor-pointer transition-colors">
                        <X size={15} className="text-grey-2" />
                    </button>
                </div>

                {/* Link row (scrollable if needed) */}
                <div className="px-5 pb-3 min-h-0 flex-1 overflow-auto">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 flex items-center gap-2.5 bg-grey-5 rounded-xl px-3.5 py-2.5 border border-grey-4">
                            <Link2 size={14} className="text-grey-2 shrink-0" />
                            <p className="text-[13px] font-medium font-manrope text-grey-1 truncate">
                                {shareLink}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Copy / Share button row — always visible at bottom of modal */}
                <div className="px-5 pb-4 pt-1 shrink-0 border-t border-grey-4/50">
                    <button
                        onClick={handleCopyLink}
                        className={`w-full h-11 rounded-xl font-manrope font-semibold text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            copied
                                ? 'bg-green-50 text-green-600 border border-green-200'
                                : 'bg-primary-default text-white hover:bg-primary-default/90 active:scale-[0.98]'
                        }`}>
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        {copied ? 'Copied!' : 'Copy link'}
                    </button>
                </div>
            </div>
        </div>,
        container
    )
}

export default ShareItineraryModal
