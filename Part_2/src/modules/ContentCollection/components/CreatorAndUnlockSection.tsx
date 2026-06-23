import React from 'react'
import AboutCreatorSection, { type CreatorData } from './AboutCreatorSection'
import TripUnlockSection, { type TripUnlockData } from './TripUnlockSection'

interface CreatorAndUnlockSectionProps {
    creatorData?: CreatorData | null
    unlockData?: TripUnlockData | null
    publisherId?: string | null
    publisherType?: string | null
    onBuyClick?: () => void
    countryId?: string
    isProcessingPayment?: boolean
}

const CreatorAndUnlockSection: React.FC<CreatorAndUnlockSectionProps> = ({
    creatorData,
    unlockData,
    publisherId,
    publisherType,
    onBuyClick,
    countryId,
    isProcessingPayment
}) => {
    // Always show unlock section (with dummy data if needed)
    // Show creator section only if creator data or publisher ID exists
    const showCreatorSection = !!creatorData || !!publisherId

    return (
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-10 md:items-stretch">
            {/* Left: About Creator - Smaller (only if data exists) */}
            {showCreatorSection && (
                <div className="md:col-span-4 h-full flex">
                    <AboutCreatorSection creatorData={creatorData} publisherId={publisherId} publisherType={publisherType} />
                </div>
            )}

            {/* Right: Trip Unlock - Larger (always shown) */}
            <div className={`${showCreatorSection ? 'md:col-span-8' : 'md:col-span-12'} h-full flex`}>
                <TripUnlockSection 
                    countryId={countryId} 
                    unlockData={unlockData} 
                    onBuyClick={onBuyClick}
                    isProcessingPayment={isProcessingPayment}
                />
            </div>
        </div>
    )
}

export default CreatorAndUnlockSection
