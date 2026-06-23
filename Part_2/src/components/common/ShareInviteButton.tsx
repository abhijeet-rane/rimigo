import { useRef, useState, useEffect, useCallback } from 'react'
import { Share2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

interface ShareInviteButtonProps {
    shareLink?: string
    hasInvite?: boolean
    onInviteClick?: (anchorRect: DOMRect | null) => void
    /** PostHog tracking label for where this button appears (e.g. "Tripboard Header"). */
    location?: string
    /** Extra PostHog properties sent with the share-click event. */
    trackingData?: Record<string, unknown>
    className?: string
}

const ShareInviteButton = ({
    shareLink,
    hasInvite,
    onInviteClick,
    location,
    trackingData,
    className,
}: ShareInviteButtonProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const { trackButtonClick } = usePostHog()

    useEffect(() => {
        if (!isOpen) return
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [isOpen])

    const handleShare = useCallback(async () => {
        if (!shareLink) return
        trackButtonClick({
            button_name: 'Share Button',
            location: location ?? 'Unknown',
            extra: {
                share_link: shareLink,
                ...trackingData
            }
        })
        try {
            await navigator.clipboard.writeText(shareLink)
            toast.success('Link copied to clipboard')
        } catch {
            toast.error('Failed to copy link')
        }
        setIsOpen(false)
    }, [shareLink, location, trackingData, trackButtonClick])

    const handleInvite = useCallback(() => {
        const rect = ref.current?.getBoundingClientRect() ?? null
        trackButtonClick({
            button_name: 'Invite Button',
            location: location ?? 'Unknown',
            extra: { ...trackingData }
        })
        onInviteClick?.(rect)
        setIsOpen(false)
    }, [onInviteClick, location, trackingData, trackButtonClick])

    // Nothing to show
    if (!shareLink && !hasInvite) return null

    // Only one action — render it directly, no popover
    if (shareLink && !hasInvite) {
        return (
            <button
                type="button"
                onClick={handleShare}
                className={cn(
                    'flex items-center gap-2 border border-grey-4 bg-white rounded-[8px] px-3 h-10 cursor-pointer hover:bg-grey-5 transition-colors text-sm font-medium font-red-hat-display',
                    className
                )}
            >
                <Share2 className="w-4 h-4" />
                <span className="hidden md:inline">Share</span>
            </button>
        )
    }

    if (!shareLink && hasInvite) {
        return (
            <div ref={ref} className={cn('relative', className)}>
                <button
                    type="button"
                    onClick={handleInvite}
                    className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full border border-grey-4 hover:bg-grey-5 transition-colors cursor-pointer',
                        className
                    )}
                    aria-label="Invite"
                >
                    <UserPlus className="w-5 h-5 text-grey-1" />
                </button>
            </div>
        )
    }

    // Both available — combined button + popover
    return (
        <div className={cn('relative', className)} ref={ref}>
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className="flex items-center gap-2 border border-grey-4 bg-white rounded-[8px] px-3 h-10 cursor-pointer hover:bg-grey-5 transition-colors text-sm font-medium font-red-hat-display"
            >
                <Share2 className="w-4 h-4" />
                <span className="hidden md:inline">Share</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-natural-white border border-feature-card-border rounded-xl shadow-lg z-80 overflow-hidden ">
                    {/* Copy link row */}
                    <button
                        type="button"
                        onClick={handleShare}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 cursor-pointer transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-primary-default-08 flex items-center justify-center flex-shrink-0">
                            <Share2 className="w-3.5 h-3.5 text-primary-default" />
                        </div>
                        <div className="text-left">
                            <p className="text-[13px] font-semibold font-red-hat-display text-grey-0 leading-tight">
                                Copy link
                            </p>
                            <p className="text-[11px] font-manrope font-[550] text-grey-2 leading-tight">
                                Share your tripboard
                            </p>
                        </div>
                    </button>

                    <div className="h-px bg-feature-card-border" />

                    {/* Invite row */}
                    <button
                        type="button"
                        onClick={handleInvite}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-grey-5 transition-colors cursor-pointer"
                    >
                        <div className="w-8 h-8 rounded-full bg-primary-default-08 flex items-center justify-center flex-shrink-0">
                            <UserPlus className="w-3.5 h-3.5 text-primary-default" />
                        </div>
                        <div className="text-left">
                            <p className="text-[13px] font-semibold font-red-hat-display text-grey-0 leading-tight">
                                Invite people
                            </p>
                            <p className="text-[11px] font-manrope font-[550] text-grey-2 leading-tight">
                                Collaborate on this trip
                            </p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    )
}

export default ShareInviteButton