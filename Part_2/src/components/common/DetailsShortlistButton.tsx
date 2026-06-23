import { useCallback, type MouseEvent } from 'react'
import clsx from 'clsx'
import { Heart } from 'lucide-react'

import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useLoginModal } from '@/modules/Onboarding/context/LoginModalContext'
import { useIsMobile } from '@/hooks/use-mobile'
import ShortlistButton from './ShortlistButton'

export interface DetailsShortlistButtonProps {
    isShortlisted: boolean
    onShortlist?: () => Promise<void> | void
    isLoading?: boolean
    className?: string
    ariaLabel?: string
    unShortlistClassName?: string
    shortlistClassName?: string
}

const DetailsShortlistButton = ({
    isShortlisted,
    onShortlist,
    isLoading = false,
    className,
    ariaLabel = 'Save to shortlist',
    unShortlistClassName = 'bg-natural-white',
    shortlistClassName = 'bg-primary-default'
}: DetailsShortlistButtonProps) => {
    const { isAuthenticated } = useAuth()
    const { openLoginModal } = useLoginModal()
    const isMobile = useIsMobile()

    const handleShortlist = useCallback(async () => {
        if (isLoading) return

        // Use the shared login modal — keeps the viewer on-page (e.g.
        // experience details) instead of bouncing to /login.
        if (!isAuthenticated) {
            openLoginModal({ redirectAfterLogin: false })
            return
        }

        if (!onShortlist) return

        await onShortlist()
    }, [isAuthenticated, isLoading, onShortlist, openLoginModal])
    const handleClick = useCallback(
        async (event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault()
            event.stopPropagation()
            await handleShortlist()
        },
        [handleShortlist]
    )

    if (isMobile) {
        return (
            <div className="flex items-center gap-2 md:hidden">
                <ShortlistButton
                    ariaLabel="Save to shortlist"
                    isShortlisted={isShortlisted}
                    isLoading={isLoading}
                    onShortlist={handleShortlist}
                />
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2 max-md:hidden">
            <button
                type="button"
                aria-label={ariaLabel}
                aria-pressed={isShortlisted}
                disabled={isLoading || !onShortlist}
                onClick={handleClick}
                className={clsx(
                    'cursor-pointer rounded-md px-4 md:px-6 py-3 transition-shadow focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-2 border border-grey-4',
                    isShortlisted
                        ? ['bg-primary-default text-natural-white hover:shadow-md', shortlistClassName]
                        : ['bg-white text-grey-grey_1 hover:shadow-md', unShortlistClassName],
                    isLoading && 'animate-pulse',
                    className
                )}>
                <Heart className="w-4 h-4" />
                <span className="hidden md:block text-sm font-medium">{isShortlisted ? 'ADDED TO WISHLIST' : 'ADD TO WISHLIST'}</span>
            </button>
        </div>
    )
}

export default DetailsShortlistButton
