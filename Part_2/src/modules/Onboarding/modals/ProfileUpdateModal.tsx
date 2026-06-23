import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { UserProfileUpdate } from '@/modules/UserProfile/pages/UserProfileUpdatePage'
import { TripboardAccessModalFrame } from '../components/TripboardAccessModalFrame'

interface ProfileUpdateModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    redirectTo?: string
}

export const ProfileUpdateModal = ({ isOpen, onClose, onSuccess, redirectTo }: ProfileUpdateModalProps) => {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    // Handle escape key
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    // Handle success callback
    const handleSuccess = () => {
        onSuccess?.()
        onClose()
    }

    if (!isOpen) return null

    const container = typeof document !== 'undefined' ? document.body : null
    if (!container) return null

    const modalContent = (
        <TripboardAccessModalFrame
            variant="profile"
            onClose={onClose}
            showCloseButton={false}
            title={
                <h2 className="text-[30px] leading-[42px] font-semibold text-grey-0 tracking-[-0.02em]">
                    What&apos;s your <span className="text-[#6C2CF1] italic font-[600]">name</span>?
                </h2>
            }>
            <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-1">
                <UserProfileUpdate
                    redirectToFromModal={redirectTo}
                    onSuccess={handleSuccess}
                    className="w-full shrink-0 px-5 pb-5 pt-0"
                    isInModal={true}
                    showLogo={false}
                    showHeading={false}
                />
            </div>
        </TripboardAccessModalFrame>
    )

    return createPortal(modalContent, container)
}
