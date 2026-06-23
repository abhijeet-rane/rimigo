
import React, { useState } from 'react'
import { X, Copy } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import { createPortal } from 'react-dom'
import { POTRAIT_IMAGES } from '@/modules/Premium/constants'

interface RimigoDealModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    description: string
    variant?: 'default' | 'premium'
    ctaText?: string
    onCtaClick?: () => void
    secondText?: string
}

const RimigoDealModal: React.FC<RimigoDealModalProps> = ({ isOpen, onClose, title, description, variant = 'default', ctaText, onCtaClick, secondText }) => {
    const [copied, setCopied] = useState(false)

    if (!isOpen) return null

    const container = typeof document !== 'undefined' ? document.body : null
    if (!container) return null

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Silently fail if clipboard API is not available
        }
    }

    // Overlapping portrait images component
    const OverlappingPortraits = () => {
        const portraits = [
            POTRAIT_IMAGES.PORTRAIT_1,
            POTRAIT_IMAGES.PORTRAIT_2,
            POTRAIT_IMAGES.PORTRAIT_3
        ]

        return (
            <div className="flex items-center justify-center relative" style={{ width: '72px', height: '32px' }}>
                {portraits.map((uri, idx) => (
                    <div
                        key={idx}
                        className="absolute h-8 w-8 rounded-full border-[2px] overflow-hidden"
                        style={{
                            left: `${idx * 20}px`,
                            zIndex: portraits.length - idx,
                            borderColor: 'white'
                        }}>
                        <img
                            src={uri}
                            alt={`portrait-${idx}`}
                            className="h-full w-full object-cover"
                        />
                    </div>
                ))}
            </div>
        )
    }

    // Premium variant (also used for regular users with different text)
    if (variant === 'premium') {
        const modalContent = (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Overlay */}
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                    aria-hidden="true"
                />

                {/* Modal Content */}
                <div
                    className="relative bg-white rounded-lg flex flex-col max-w-sm w-full overflow-hidden border-[2px] border-dashed"
                    style={{ borderColor: 'var(--color-grey-4, #e0e0e0)' }}
                    onClick={(e) => e.stopPropagation()}>
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-grey-5 rounded-full transition-colors shrink-0 z-10 cursor-pointer">
                        <X className="w-5 h-5 text-grey-2" />
                    </button>

                    {/* Overlapping Portrait Images */}
                    <div className="flex items-center justify-center pt-8 pb-4">
                        <OverlappingPortraits />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col items-center px-6 pb-6 gap-3">
                        <Typography
                            size="14"
                            weight="medium"
                            color="grey-0"
                            family="manrope"
                            textAlign="center">
                            {description}
                        </Typography>
                        {secondText && (
                            <Typography
                                size="14"
                                weight="medium"
                                color="grey-0"
                                family="manrope"
                                textAlign="center">
                                {secondText}
                            </Typography>
                        )}
                    </div>

                    {/* CTA Button - Show CTA button if provided, otherwise show Copy Link */}
                    <div className="px-6 pb-6">
                        {ctaText && onCtaClick ? (
                            <button
                                onClick={onCtaClick}
                                className="w-full py-3 px-4 rounded-lg bg-primary-default text-white hover:bg-primary-default/90 transition-colors cursor-pointer">
                                <Typography
                                    size="14"
                                    weight="semibold"
                                    color="white"
                                    family="manrope">
                                    {ctaText}
                                </Typography>
                            </button>
                        ) : (
                            <button
                                onClick={handleCopyLink}
                                className="w-full py-3 px-4 rounded-lg border border-grey-4 bg-white hover:bg-grey-5 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                                <Copy size={16} className="text-grey-0" />
                                <Typography
                                    size="14"
                                    weight="medium"
                                    color="grey-0"
                                    family="manrope">
                                    {copied ? 'Link Copied!' : 'Copy Link'}
                                </Typography>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )
        return createPortal(modalContent, container)
    }

    // Default variant
    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Content */}
            <div
                className="relative bg-white rounded-lg shadow-2xl flex flex-col max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-grey-4">
                    <div className="flex-1">
                        <Typography
                            size="18"
                            weight="semibold"
                            color="grey-0"
                            family="redhat">
                            {title}
                        </Typography>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-4 p-2 hover:bg-grey-5 rounded-full transition-colors shrink-0 cursor-pointer">
                        <X className="w-5 h-5 text-grey-2" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden px-6 py-4">
                    <Typography
                        size="14"
                        weight="medium"
                        color="grey-2"
                        family="manrope">
                        {description}
                    </Typography>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, container)
}

export default RimigoDealModal

