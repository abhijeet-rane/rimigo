import { useCallback, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Heart } from 'lucide-react'

import { useAuth } from '@/lib/auth/providers/AuthProviders'

export interface AddToCollectionButtonProps {
    onAddToCollection?: () => Promise<void> | void
    isLoading?: boolean
    className?: string
    ariaLabel?: string
    /** External disabled signal (e.g. price unavailable). Falls through to the button's disabled state. */
    disabled?: boolean
    /** Tooltip / accessible name override. Defaults to "Add to tripboard". */
    title?: string
    /** When true the heart renders filled (matches ShortlistButton). */
    isShortlisted?: boolean
}

const AddToCollectionButton = ({
    onAddToCollection,
    isLoading = false,
    className,
    ariaLabel = 'Add to collection',
    disabled = false,
    title,
    isShortlisted = false
}: AddToCollectionButtonProps) => {
    const { isAuthenticated } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    const redirectToLogin = useCallback(() => {
        const pathname = location.pathname || '/'
        const search = location.search || ''
        const hash = location.hash || ''
        const redirectPath = `${pathname}${search}${hash}`
        const encodedRedirect = encodeURIComponent(redirectPath || '/')
        navigate(`/login?redirectTo=${encodedRedirect}`)
    }, [location.hash, location.pathname, location.search, navigate])

    const handleClick = useCallback(
        async (event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault()
            event.stopPropagation()

            if (isLoading || disabled) {
                return
            }

            if (!isAuthenticated) {
                redirectToLogin()
                return
            }

            if (!onAddToCollection) {
                return
            }

            await onAddToCollection()
        },
        [isAuthenticated, isLoading, disabled, onAddToCollection, redirectToLogin]
    )

    return (
        <button
            type="button"
            aria-label={ariaLabel}
            title={title || 'Add to tripboard'}
            disabled={isLoading || disabled || !onAddToCollection}
            aria-disabled={isLoading || disabled || !onAddToCollection}
            onClick={handleClick}
            aria-pressed={isShortlisted}
            className={clsx(
                'rounded-full cursor-pointer border border-white p-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                isLoading && 'animate-pulse',
                className,
                isShortlisted ? 'bg-white' : 'bg-transparent'
            )}>
            <Heart className={clsx('h-5 w-5', isShortlisted ? 'text-primary-default fill-primary-default' : 'text-white bg-transparent')} />
        </button>
    )
}

export default AddToCollectionButton
