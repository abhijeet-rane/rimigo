import React, { useState } from 'react'
import ImageGrid from '../components/ImageGrid'
import PhotoGallery from '../components/PhotoGallery'
import { ShareButtonProps } from '@/components/common/ShareButton'

interface ExperienceDetailsImageGridProps {
    images?: string[]
    isShortlisted: boolean
    onShortlist?: () => Promise<void> | void
    isLoading?: boolean
    onImageClick?: (imageUrl: string, index: number) => void
    shareProps?: ShareButtonProps
}

const ExperienceDetailsImageGrid: React.FC<ExperienceDetailsImageGridProps> = ({
    images = [],
    onImageClick,
    isShortlisted,
    isLoading,
    onShortlist,
    shareProps
}) => {
    const [isGalleryOpen, setIsGalleryOpen] = useState(false)
    const [initialPhotoIndex, setInitialPhotoIndex] = useState<number>(0)

    const handleImageClick = (imageUrl: string, index: number) => {
        setInitialPhotoIndex(index)
        setIsGalleryOpen(true)
        if (onImageClick) {
            onImageClick(imageUrl, index)
        }
    }

    const handleShowAllPhotos = () => {
        setInitialPhotoIndex(0)
        setIsGalleryOpen(true)
    }

    return (
        <>
            <ImageGrid
                shareProps={shareProps}
                isShortlisted={isShortlisted}
                isLoading={isLoading}
                onShortlist={onShortlist}
                images={images}
                onImageClick={handleImageClick}
                onShowAllPhotos={images.length > 3 ? handleShowAllPhotos : undefined}
                className="mb-6"
            />

            {/* Photo Gallery Modal */}
            <PhotoGallery
                images={images}
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                initialIndex={initialPhotoIndex}
            />
        </>
    )
}

export default ExperienceDetailsImageGrid
