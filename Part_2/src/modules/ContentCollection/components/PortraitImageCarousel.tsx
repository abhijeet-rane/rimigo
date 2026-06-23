import React from 'react'
import CustomShimmer from '@/components/shared/Shimmer'
import ShowAllPhotosButton from './ShowAllPhotosButton'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel' 

interface PortraitImageCarouselProps {
    images: string[]
    isLoading?: boolean
    onImageClick?: (imageUrl: string, index: number) => void
    onShowAllPhotos?: () => void
    className?: string
}

const PortraitImageCarousel: React.FC<PortraitImageCarouselProps> = ({
    images,
    isLoading = false,
    onImageClick,
    onShowAllPhotos,
    className = ''
}) => {
    // Show shimmer while loading
    if (isLoading) {
        return (
            <div className={`relative ${className}`}>
                <div className="flex gap-5 overflow-hidden">
                    {[1, 2, 3].map((index) => (
                        <div key={index} className="shrink-0">
                            <CustomShimmer
                                height={350}
                                radius={16}
                                className="w-[312px]"
                            />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Don't render if no images
    if (!images || images.length === 0) {
        return null
    }

    const handleImageClick = (imageUrl: string, index: number) => {
        if (onImageClick) {
            onImageClick(imageUrl, index)
        }
    }

    return (
        <div className={`relative ${className}`}>
            <GenericCarousel
                gap={8}
                scrollAmount={332} // 312px (card width) + 20px (gap)
                containerClassName="pb-4"
                gradientStartColor="rgba(255, 255, 255, 1)"
                gradientEndColor="rgba(255, 255, 255, 0)"
                gradientLeftStartColor="rgba(255, 255, 255, 1)"
                gradientLeftEndColor="rgba(255, 255, 255, 0)"
            >
                {images.map((imageUrl, index) => (
                    <div
                        key={index}
                        className="shrink-0 snap-center relative group cursor-pointer"
                        onClick={() => handleImageClick(imageUrl, index)}>
                        {/* Image card - similar to CityCard size */}
                        <div className="h-87.5 w-full max-w-[312px] ml-[16px] md:ml-0 relative overflow-hidden rounded-2xl">
                            <img
                                src={imageUrl}
                                alt={`Image ${index + 1}`}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                    </div>
                ))}
            </GenericCarousel>

            {/* Show all photos button - positioned absolutely at bottom right of container */}
            {onShowAllPhotos && images.length > 0 && (
                <ShowAllPhotosButton
                    onClick={() => onShowAllPhotos()}
                    photoCount={images.length}
                />
            )}
        </div>
    )
}

export default PortraitImageCarousel