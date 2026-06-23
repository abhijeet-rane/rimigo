import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLoginModal } from '../context/LoginModalContext'
import LoginPage from '../pages/LoginPage'
import { ProfileUpdateModal } from './ProfileUpdateModal'
import { TripboardAccessModalFrame } from '../components/TripboardAccessModalFrame'

const LoginModal = () => {
    const {
        isOpen,
        params,
        closeLoginModal,
        isProfileUpdateModalOpen,
        profileUpdateModalParams,
        closeProfileUpdateModal
    } = useLoginModal()

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
                closeLoginModal()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, closeLoginModal])

    // Get redirectTo: use params if provided, otherwise use current browser URL
    // This captures the URL from where the modal was opened
    const redirectTo = params?.redirectTo

    // Check if we should redirect after login (defaults to true if not specified)
    const shouldRedirectAfterLogin = params?.redirectAfterLogin !== false

    // Handle login success: close modal and call parent's callback if provided
    const handleLoginSuccess = () => {
        closeLoginModal()
        // Call parent's callback if provided (e.g., to refresh page, redirect, etc.)
        params?.onLoginSuccess?.()
    }

    const container = typeof document !== 'undefined' ? document.body : null
    if (!container) {
        // Still render ProfileUpdateModal even if container is not available yet
        return (
            <>
                {isProfileUpdateModalOpen && (
                    <ProfileUpdateModal
                        isOpen={isProfileUpdateModalOpen}
                        onClose={closeProfileUpdateModal}
                        onSuccess={profileUpdateModalParams?.onSuccess}
                        redirectTo={profileUpdateModalParams?.redirectTo}
                    />
                )}
            </>
        )
    }

    const modalContent = isOpen ? (
        <TripboardAccessModalFrame
            variant="login"
            onClose={closeLoginModal}
            title={
                <h2 className="text-[30px] leading-[42px] font-semibold text-grey-0 tracking-[-0.02em]">
                    Access your <span className="text-[#6C2CF1] italic font-[600]">Tripboard</span>
                </h2>
            }>
            <div className="w-full px-1 pb-1">
                <LoginPage
                    redirectToFromModal={redirectTo}
                    onLoginSuccess={handleLoginSuccess}
                    redirectAfterLogin={shouldRedirectAfterLogin}
                    buttonPage={params?.buttonPage}
                    showLoginHeading={false}
                    compactLayout
                    subheading="Please enter your phone number"
                    childContainerClassName="!justify-start"
                    className="flex h-auto min-h-0 w-full flex-col pt-0 pb-0"
                />
            </div>
        </TripboardAccessModalFrame>
    ) : null

    return (
        <>
            {modalContent && createPortal(modalContent, container)}
            {/* Profile Update Modal - rendered separately so it can show even when login modal is closed */}
            <ProfileUpdateModal
                isOpen={isProfileUpdateModalOpen}
                onClose={closeProfileUpdateModal}
                onSuccess={profileUpdateModalParams?.onSuccess}
                redirectTo={profileUpdateModalParams?.redirectTo}
            />
        </>
    )
}

export default LoginModal
