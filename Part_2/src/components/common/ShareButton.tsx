import { useCallback, type MouseEvent } from 'react'
import { Share } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'

import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { useIsMobile } from '@/hooks/use-mobile'

export interface ShareButtonProps {
    shareLink: string
    className?: string
    ariaLabel?: string
    location?: string
    trackingData?: Record<string, unknown>
    /** When true, try the native Web Share API first (OS app picker) and fall back to clipboard. */
    useNativeShare?: boolean
}

const ShareButton = ({ shareLink, className, ariaLabel = 'Share', location, trackingData, useNativeShare = false }: ShareButtonProps) => {
    const { trackButtonClick } = usePostHog()
    const isMobile = useIsMobile()

    const handleClick = useCallback(
        async (event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault()
            event.stopPropagation()

            trackButtonClick({
                button_name: 'Share Button',
                location: location ?? 'Unknown',
                extra: {
                    share_link: shareLink,
                    ...trackingData
                }
            })

            if (useNativeShare && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                try {
                    await navigator.share({ url: shareLink })
                    return
                } catch (error) {
                    if ((error as DOMException)?.name === 'AbortError') return
                }
            }

            const copyWithExecCommand = (text: string): boolean => {
                try {
                    const textarea = document.createElement('textarea')
                    textarea.value = text
                    textarea.setAttribute('readonly', '')
                    textarea.style.position = 'fixed'
                    textarea.style.top = '0'
                    textarea.style.left = '0'
                    textarea.style.opacity = '0'
                    document.body.appendChild(textarea)
                    textarea.focus()
                    textarea.select()
                    textarea.setSelectionRange(0, text.length)
                    const ok = document.execCommand('copy')
                    document.body.removeChild(textarea)
                    return ok
                } catch {
                    return false
                }
            }

            if (navigator.clipboard && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(shareLink)
                    toast.success('Link copied to clipboard')
                    return
                } catch {
                    // fall through to legacy
                }
            }

            if (copyWithExecCommand(shareLink)) {
                toast.success('Link copied to clipboard')
            } else {
                toast.error('Failed to copy link')
            }
        },
        [shareLink, location, trackingData, trackButtonClick, useNativeShare]
    )

    if (isMobile) {
        return (
            <button
                type="button"
                aria-label={ariaLabel}
                onClick={handleClick}
                className={clsx(
                    'cursor-pointer rounded-full w-9 h-9 flex items-center justify-center transition-shadow focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 hover:shadow-md border border-grey-4 bg-white',
                    className
                )}>
                <Share className="w-5 h-5 text-grey-0" />
            </button>
        )
    }

    return (
        <button
            type="button"
            aria-label={ariaLabel}
            onClick={handleClick}
            className={clsx(
                'flex items-center gap-2 border border-grey-4 bg-white rounded-[8px] px-3 py-2 transition-colors cursor-pointer',
                className
            )}>
            <Share className="w-4 h-4" />
            <span className="text-sm font-medium font-red-hat-display">SHARE</span>
        </button>
    )
}

export default ShareButton
