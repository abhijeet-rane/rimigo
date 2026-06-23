import React from 'react'
import TripUnlockSection, { TripUnlockData } from './TripUnlockSection'

interface RimigoLockedOverlayProps {
    isLocked: boolean
    unlockData?: TripUnlockData | null
    onBuyClick?: () => void
    isProcessingPayment?: boolean
    children?: React.ReactNode
    className?: string
    containerClassName?: string
    enabled?: boolean
    countryId?: string
}

const RimigoLockedOverlay: React.FC<RimigoLockedOverlayProps> = ({
    isLocked,
    unlockData,
    onBuyClick,
    isProcessingPayment = false,
    children,
    className = '',
    containerClassName = '',
    enabled = true,
    countryId
}) => {
    // If not enabled or not locked, just render children
    if (!enabled || !isLocked) {
        return <>{children}</>
    }

    return (
        <div className={`relative w-full ${className}`}>
            {/* Content (blurred/disabled when locked) */}
            <div className={isLocked ? 'opacity-100 pointer-events-none select-none' : ''}>
                {children}
            </div>

            {/* Overlay - FIXED on mobile, ABSOLUTE on desktop */}
            {isLocked && (
                <div 
                    className={`fixed md:absolute inset-0 z-99 flex items-end md:items-center justify-center overflow-hidden ${containerClassName}`}
                    style={{ 
                        touchAction: 'none',
                        overscrollBehavior: 'contain'
                    }}>
                    {/* Gradient background - responsive heights */}
                    <div className="fixed md:absolute inset-x-0 bottom-0 h-[70vh] md:h-[90vh] pointer-events-none [background:linear-gradient(180deg,rgba(171,114,251,0)_0%,rgba(171,114,251,0.2)_60%,rgba(171,114,251,0.3)_100%,rgba(171,114,251,0.7)_90%,#ab72fb_100%)] md:[background:linear-gradient(180deg,rgba(171,114,251,0)_0%,rgba(171,114,251,0.3)_40%,rgba(171,114,251,0.7)_70%,#ab72fb_100%)]">
                        {/* Blur layer - less intense on mobile, full on desktop */}
                        <div 
                            className="absolute inset-x-0 top-0 bottom-0 [backdrop-filter:blur(1px)] md:[backdrop-filter:blur(10px)]"
                            style={{
                                maskImage: 'linear-gradient(180deg, transparent 0%, transparent 20%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.8) 55%, rgba(0,0,0,1) 70%, rgba(0,0,0,1) 100%)',
                                WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, transparent 20%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.8) 55%, rgba(0,0,0,1) 70%, rgba(0,0,0,1) 100%)'
                            }}
                        />
                    </div>
                    
                    {/* TripUnlockSection - responsive positioning and sizing */}
                    <div className="relative w-full max-w-2xl mb-[30px] md:mb-0 px-10 md:px-4 md:pb-6 md:py-8 z-[60] pointer-events-auto overflow-y-auto max-h-[90vh]"
                        style={{ touchAction: 'auto' }}>
                        <TripUnlockSection
                            unlockData={unlockData}
                            onBuyClick={onBuyClick}
                            isProcessingPayment={isProcessingPayment}
                            countryId={countryId}
                            showWhyChooseSection={false}
                            className="bg-white shadow-lg md:shadow-xl rounded-t-2xl md:rounded-2xl pb-10"
                            titleClassName="text-[25px] md:text-[32px]"
                            imageWidthClassName="w-[70px] md:w-[120px]"
                            imageHeightClassName="h-[50px] md:h-[75px]"
                            imageGapClassName="gap-1 md:gap-2"
                        />
                    </div>
                </div>
            )}
   
            {/* Global style injection when locked */}
            {isLocked && (
                <style>{`
                    body {
                        overflow: hidden !important;
                        position: fixed !important;
                        width: 100% !important;
                        height: 100% !important;
                    }
                `}</style>
            )}
        </div>
    )
}

export default RimigoLockedOverlay