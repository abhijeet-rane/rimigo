import React, { useMemo } from 'react'
import { ImageShowCase } from '@/pages/Landing/Components/ImageShowCase'
import { useImageShowCase } from '@/pages/Landing/hooks/useImageShowCase'
import WhyChooseSection from './WhyChooseSection'

export interface TripUnlockData {
    previewImages?: string[]
    price?: string | null
    rating?: number
    reviewCount?: number
    /** Backend-driven (collection.metadata.loved_count). Falls back to DEFAULT below if missing. */
    lovedCount?: number
}

interface TripUnlockSectionProps {
    unlockData?: TripUnlockData | null
    countryId?: string
    onBuyClick?: () => void
    isProcessingPayment?: boolean
    className?: string
    showWhyChooseSection?: boolean
    titleClassName?: string
    imageWidthClassName?: string
    imageHeightClassName?: string
    imageGapClassName?: string
}

// Default dummy unlock data
const DEFAULT_UNLOCK_DATA: TripUnlockData = {
    previewImages: [
        'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=200&h=150&fit=crop',
        'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=200&h=150&fit=crop',
        'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=200&h=150&fit=crop',
        'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=200&h=150&fit=crop'
    ],
    price: null,
    rating: 4.2,
    reviewCount: 300,
    lovedCount: 328
}

const TripUnlockSection: React.FC<TripUnlockSectionProps> = ({ 
    unlockData, 
    countryId,
    onBuyClick, 
    isProcessingPayment = false,
    className = 'bg-primary-default-12', 
    showWhyChooseSection = true,
    titleClassName = 'text-[28px] md:text-[32px]',
    imageWidthClassName = 'w-[85px] md:w-[120px]',
    imageHeightClassName = 'h-[65px] md:h-[75px]',
    imageGapClassName = 'gap-1.5 md:gap-2',
}) => {
    // Fetch country images
    const { images: countryImages, isLoading } = useImageShowCase({
        countryId: countryId || undefined,
        enabled: !!countryId,
        limit: 4 
    })

    const experienceImages = useMemo(() => {
        return countryImages?.experiences?.slice(0, 4) || []
    }, [countryImages])

    // Merge unlockData with default data, but exclude price from defaults
    const displayData: TripUnlockData = {
        // Use country images if available, otherwise use unlockData images, otherwise empty array
        previewImages: experienceImages.length > 0
            ? experienceImages
            : (unlockData?.previewImages || []),
        price: unlockData?.price ?? undefined,
        rating: unlockData?.rating ?? DEFAULT_UNLOCK_DATA.rating,
        reviewCount: unlockData?.reviewCount ?? DEFAULT_UNLOCK_DATA.reviewCount,
        lovedCount: unlockData?.lovedCount ?? DEFAULT_UNLOCK_DATA.lovedCount
    }

    // Show images only if we have them and not loading
    const showImages = !isLoading && displayData.previewImages && displayData.previewImages.length > 0

    return (
        <div className={`w-full md:h-auto relative rounded-2xl flex flex-col items-center justify-center gap-6 md:gap-8 p-4 pt-10  md:p-6 ${className}`}>
            {/* Preview Images - Only show if images exist and not loading */}
            {showImages && (
                <div className="flex items-center justify-center w-full px-3 md:pt-3">
                    <ImageShowCase
                        images={displayData.previewImages!}
                        aspectRatio="landscape"
                        maxImages={4}
                        showBorder={true}
                        showShadow={true}
                        gap={imageGapClassName}
                        imageWidthPortraitCustom={imageWidthClassName}
                        imageHeightPortraitCustom={imageHeightClassName}
                    />
                </div>
            )}
            {/* Loading state for images */}
            {isLoading && (
                <div className="flex items-center justify-center w-full h-[70px] md:h-[94px]">
                    <div className="animate-pulse flex gap-2">
                        {[...Array(4)].map((_, i) => (
                            <div 
                                key={i} 
                                className="w-[70px] md:w-[94.8px] h-[52px] md:h-[70px] bg-grey-4 rounded-lg"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Unlock Text */}
            <div className={`${titleClassName} mt-2 md:mt-0 font-[550] text-grey-0 md:font-semibold font-red-hat-display tracking-[-0.04em] text-center leading-tight px-8 md:px-2`}>
                Access our complete trip plan
            </div>

            {/* Buy Button and Stats */}
            <div className="flex flex-col mt-4 md:mt-3 items-center gap-3 md:gap-5 text-center w-full">
                {/* Buy Button */}
                {displayData.price && (
                    <button
                        type="button"
                        onClick={onBuyClick}
                        disabled={isProcessingPayment}
                        className="shadow-[0px_2px_16px_rgba(112,_17,_246,_0.32)] rounded-sm cursor-pointer bg-gradient-to-r from-primary-default to-primary-dark flex items-center justify-center py-2.5 md:py-3 px-4 md:px-5 hover:opacity-90 transition-opacity max-w-[280px] disabled:opacity-70 disabled:cursor-not-allowed">
                        {isProcessingPayment ? (
                            <span className="text-[16px] md:text-[18px] font-red-hat-display font-bold text-white tracking-[-0.01em]">
                                Processing…
                            </span>
                        ) : (
                            <span className="text-[16px] md:text-[18px] font-red-hat-display font-bold text-white tracking-[-0.01em]">
                                UNLOCK FOR {displayData.price}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {showWhyChooseSection && <WhyChooseSection />}

        </div>
    )
}

export default TripUnlockSection