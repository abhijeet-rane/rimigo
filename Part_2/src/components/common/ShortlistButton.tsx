import { useCallback, type MouseEvent } from 'react'
import clsx from 'clsx'
import { Heart } from 'lucide-react'

import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useLoginModal } from '@/modules/Onboarding/context/LoginModalContext'

export interface ShortlistButtonProps {
    isShortlisted: boolean
    onShortlist?: () => Promise<void> | void
    isLoading?: boolean
    className?: string
    ariaLabel?: string
    /** `overlay` (default): white heart for image backgrounds.
     *  `surface`: grey-bordered purple heart for white surfaces (e.g. wishlist rows). */
    variant?: 'overlay' | 'surface'
}

const ShortlistButton = ({
    isShortlisted,
    onShortlist,
    isLoading = false,
    className,
    ariaLabel = 'Save to shortlist',
    variant = 'overlay'
}: ShortlistButtonProps) => {
    const isSurface = variant === 'surface'
    const { isAuthenticated } = useAuth()
    const { openLoginModal } = useLoginModal()

    const handleClick = useCallback(
        async (event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault()
            event.stopPropagation()

            if (isLoading) {
                return
            }

            // Open the existing login modal instead of redirecting to
            // /login. Keeps unauthenticated viewers on the page (e.g.
            // a shared tripboard link) so they can continue browsing
            // after dismissing the modal.
            if (!isAuthenticated) {
                openLoginModal({ redirectAfterLogin: false })
                return
            }

            if (!onShortlist) {
                return
            }

            await onShortlist()
        },
        [isAuthenticated, isLoading, onShortlist, openLoginModal]
    )

    return (
        <button
            type="button"
            aria-label={ariaLabel}
            title="Shortlist in trip"
            aria-pressed={isShortlisted}
            disabled={isLoading || !onShortlist}
            onClick={handleClick}
            className={clsx(
                'rounded-full cursor-pointer border p-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                isLoading && 'animate-pulse',
                isSurface
                    ? 'border-grey-4 bg-white hover:bg-primary-default-08 transition-colors'
                    : clsx('border-white', isShortlisted ? 'bg-white' : 'bg-transparent'),
                className
            )}>
            <Heart
                className={clsx(
                    'h-5 w-5',
                    isSurface
                        ? clsx('text-primary-default', isShortlisted && 'fill-primary-default')
                        : isShortlisted
                          ? 'text-primary-default fill-primary-default'
                          : 'text-white bg-transparent'
                )}
            />
        </button>
    )
}

export default ShortlistButton
