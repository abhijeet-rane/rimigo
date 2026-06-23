import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageCarouselProps {
    image?: string
    images?: string[]
    alt: string
    className?: string
    onImageClick?: (index: number) => void
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ image, images, alt, className, onImageClick }) => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const allImages = images && images.length > 0 ? images : image ? [image] : []
    // Limit to first 5 images for carousel display
    const carouselImages = allImages.slice(0, 5)
    const imageList = carouselImages
    const hasMultipleImages = imageList.length > 1
    const containerRef = useRef<HTMLDivElement>(null)
    const isFirstImage = currentIndex === 0
    const isLastImage = currentIndex === imageList.length - 1

    // Reset to first image when images change
    useEffect(() => {
        setCurrentIndex(0)
    }, [images])

    const goToPrevious = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (hasMultipleImages && !isFirstImage) {
            setCurrentIndex((prev) => prev - 1)
        }
    }

    const goToNext = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (hasMultipleImages && !isLastImage) {
            setCurrentIndex((prev) => prev + 1)
        }
    }

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onImageClick) {
            onImageClick(currentIndex)
        }
    }

    if (imageList.length === 0) {
        return null
    }

    return (
        <div
            className={cn('relative w-full h-full overflow-hidden', className)}
            ref={containerRef}>
            {/* Single image or carousel */}
            {hasMultipleImages ? (
                <>
                    {/* Image container with transition */}
                    <div className="relative w-full h-full">
                        <div
                            className="relative w-full h-full cursor-pointer"
                            onClick={handleImageClick}>
                            {imageList.map((img, index) => (
                                <img
                                    key={index}
                                    src={img}
                                    alt={`${alt} ${index + 1}`}
                                    className={cn(
                                        'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
                                        index === currentIndex ? 'opacity-100' : 'opacity-0'
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Previous button - only show if not on first image */}
                    {!isFirstImage && (
                        <button
                            type="button"
                            onClick={goToPrevious}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm cursor-pointer shadow-md flex items-center justify-center transition-all hover:bg-white hover:shadow-lg"
                            aria-label="Previous image">
                            <ChevronLeft className="h-4 w-4 text-grey-0" />
                        </button>
                    )}

                    {/* Next button - only show if not on last image */}
                    {!isLastImage && (
                        <button
                            type="button"
                            onClick={goToNext}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm cursor-pointer shadow-md flex items-center justify-center transition-all hover:bg-white hover:shadow-lg"
                            aria-label="Next image">
                            <ChevronRight className="h-4 w-4 text-grey-0" />
                        </button>
                    )}

                    {/* Image indicators */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                        {imageList.map((_, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setCurrentIndex(index)
                                }}
                                className={cn(
                                    'h-1.5 rounded-full transition-all',
                                    index === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/75'
                                )}
                                aria-label={`Go to image ${index + 1}`}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <img
                    src={imageList[0]}
                    alt={alt}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={handleImageClick}
                />
            )}
        </div>
    )
}

export default ImageCarousel
