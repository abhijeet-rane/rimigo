import { useCallback, type MouseEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { BookmarkPlus } from 'lucide-react'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import AddToCollectionModal from './AddToCollectionModal'

export interface AddToCollectionButtonProps {
    experienceId: string
    experienceName: string
    className?: string
    ariaLabel?: string
}

const AddToCollectionButton = ({
    experienceId,
    experienceName,
    className,
    ariaLabel = 'Add to collection'
}: AddToCollectionButtonProps) => {
    const { isAuthenticated } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [isModalOpen, setIsModalOpen] = useState(false)

    const redirectToLogin = useCallback(() => {
        const pathname = location.pathname || '/'
        const search = location.search || ''
        const hash = location.hash || ''
        const redirectPath = `${pathname}${search}${hash}`
        const encodedRedirect = encodeURIComponent(redirectPath || '/')
        navigate(`/login?redirectTo=${encodedRedirect}`)
    }, [location.hash, location.pathname, location.search, navigate])

    const handleClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault()
            event.stopPropagation()

            if (!isAuthenticated) {
                redirectToLogin()
                return
            }

            setIsModalOpen(true)
        },
        [isAuthenticated, redirectToLogin]
    )

    return (
        <>
            <button
                type="button"
                aria-label={ariaLabel}
                onClick={handleClick}
                className={clsx(
                    'rounded-full cursor-pointer border border-white p-2 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-white/80 hover:bg-white transition-colors',
                    className
                )}>
                <BookmarkPlus className="h-5 w-5 text-primary-default" />
            </button>

            <AddToCollectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                experienceId={experienceId}
                experienceName={experienceName}
            />
        </>
    )
}

export default AddToCollectionButton

