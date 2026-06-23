import React, { useState, useEffect } from 'react'
import GuideTipperModal from '../components/GuideTipperModal'

interface GuideTipperProps {
    children: React.ReactNode
    title?: string
    highlight?: string[]
    subtitle?: string
    closeTitle?: string
    onClose?: () => void
    primaryTitle?: string
    onPrimary?: () => void
    showTriangle?: boolean
    position?: 'top' | 'bottom' | 'left' | 'right'
    isOpen?: boolean
}

const GuideTipper: React.FC<GuideTipperProps> = ({
    children,
    title,
    highlight,
    subtitle,
    closeTitle,
    onClose,
    primaryTitle,
    onPrimary,
    showTriangle = true,
    position = 'top',
    isOpen: isOpenProp
}) => {
    const [internalOpen, setInternalOpen] = useState(false)
    const [delayPassed, setDelayPassed] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const isOpen = isOpenProp ?? internalOpen
    const DISABLE_GUIDE_TIPPER = true
    if (DISABLE_GUIDE_TIPPER) {
        return <>{children}</>
    }
    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Delay showing the guide by 1 second
    useEffect(() => {
        if (!isOpen) {
            setDelayPassed(false)
            return
        }

        const timer = setTimeout(() => {
            setDelayPassed(true)
        }, 1000) // 1 second delay

        return () => clearTimeout(timer)
    }, [isOpen])

    const handleClose = () => {
        if (isOpenProp === undefined) setInternalOpen(false)
        onClose?.()
    }

    // Return children directly for mobile
    if (isMobile) {
        return <>{children}</>
    }

    // Until delay has passed or guide is closed, return children directly
    if (!isOpen || !delayPassed) {
        return <>{children}</>
    }

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-[#10101052] z-[1100] "
                onClick={handleClose}
            />

            <div className="relative w-full">
                {/* Centered wrapper */}
                <div className="relative z-[1200] w-full flex justify-center">
                    <div className="relative w-full justify-center flex">
                        {/* Children */}
                        {children}

                        {/* Tooltip Modal */}
                        <GuideTipperModal
                            title={title}
                            highlight={highlight}
                            subtitle={subtitle}
                            closeTitle={closeTitle}
                            onClose={handleClose}
                            primaryTitle={primaryTitle}
                            onPrimary={onPrimary}
                            showTriangle={showTriangle}
                            position={position}
                        />
                    </div>
                </div>
            </div>
        </>
    )
}

export default GuideTipper
