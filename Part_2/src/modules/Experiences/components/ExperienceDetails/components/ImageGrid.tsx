import React, { useRef, useState } from 'react'
import ViewGalleryButton from './ViewGalleryButton'
import ShareButton, { ShareButtonProps } from '@/components/common/ShareButton'
import DetailsShortlistButton from '@/components/common/DetailsShortlistButton'

interface ImageGridProps {
    isShortlisted: boolean
    onShortlist?: () => Promise<void> | void
    isLoading?: boolean
    images: string[]
    onImageClick?: (imageUrl: string, index: number) => void
    onShowAllPhotos?: () => void
    className?: string
    shareProps?: ShareButtonProps
    showShortlistButton?: boolean
}

const ImageGrid: React.FC<ImageGridProps> = ({
    images,
    onImageClick,
    onShowAllPhotos,
    className = '',
    isShortlisted,
    onShortlist,
    isLoading,
    shareProps,
    showShortlistButton = true
}) => {
    const totalImages = images.length
    const sliderRef = useRef<HTMLDivElement>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    // Common classes used by all images
    const commonImageClasses = 'object-cover cursor-pointer'

    const handleImageClick = (imageUrl: string, index: number) => {
        if (onImageClick) {
            onImageClick(imageUrl, index)
        }
    }

    if (totalImages === 0) {
        return (
            <div className={`w-full grid grid-cols-1 ${className}`}>
                <div className="w-full h-[500px] bg-gray-200 rounded-2xl flex items-center justify-center">
                    <span className="text-gray-500">No images available</span>
                </div>
            </div>
        )
    }

    // ---- 1 IMAGE ----
    if (totalImages === 1) {
        return (
            <div className={`w-full grid grid-cols-1 overflow-hidden rounded-2xl ${className}`}>
                <img
                    src={images[0]}
                    alt=""
                    className={`w-full h-[500px] ${commonImageClasses}`}
                    onClick={() => handleImageClick(images[0], 0)}
                />
            </div>
        )
    }

    // ---- 2 IMAGES ----
    if (totalImages === 2) {
        return (
            <div className={`w-full grid grid-cols-2 gap-2 rounded-2xl overflow-hidden ${className}`}>
                {images.map((img, i) => {
                    const cornerClasses = i === 0 ? 'rounded-tl-2xl rounded-bl-2xl' : 'rounded-tr-2xl rounded-br-2xl'
                    return (
                        <img
                            key={i}
                            src={img}
                            alt=""
                            className={`w-full h-[400px] ${commonImageClasses} ${cornerClasses}`}
                            onClick={() => handleImageClick(img, i)}
                        />
                    )
                })}
            </div>
        )
    }

    // ---- 3 IMAGES ----
    if (totalImages === 3) {
        return (
            <div className={`grid grid-cols-3 grid-rows-2 gap-2 rounded-2xl overflow-hidden ${className}`}>
                {/* Main image — tall, takes 2 rows */}
                <img
                    src={images[0]}
                    alt=""
                    className={`col-span-2 row-span-2 h-full ${commonImageClasses} rounded-tl-2xl rounded-bl-2xl`}
                    onClick={() => handleImageClick(images[0], 0)}
                />

                {/* Two smaller images stacked on the right */}
                <img
                    src={images[1]}
                    alt=""
                    className={`col-span-1 row-span-1 h-full ${commonImageClasses} rounded-tr-2xl`}
                    onClick={() => handleImageClick(images[1], 1)}
                />
                <img
                    src={images[2]}
                    alt=""
                    className={`col-span-1 row-span-1 h-full ${commonImageClasses} rounded-br-2xl`}
                    onClick={() => handleImageClick(images[2], 2)}
                />
            </div>
        )
    }
    const handleScroll = () => {
        if (!sliderRef.current) return

        const scrollLeft = sliderRef.current.scrollLeft
        const slideWidth = sliderRef.current.offsetWidth

        const index = Math.round(scrollLeft / slideWidth)
        setActiveIndex(index)
    }

    // ---- 4 OR MORE IMAGES ---- (match HotelDetailPage grid)
    const isExactlyFour = totalImages === 4
    const topFiveImages = isExactlyFour ? [...images, 'dummy'] : images.slice(0, 5)

    // Create composite dummy image for 4 images case
    const renderDummyImage = () => {
        if (!isExactlyFour) return null

        return (
            <div
                onClick={() => onShowAllPhotos?.()}
                className="relative w-full h-full overflow-hidden block cursor-pointer hover:opacity-90 transition-opacity rounded-br-2xl">
                {/* Background with first image */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url(${images[0]})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(20px)',
                        transform: 'scale(1.1)'
                    }}
                />
                {/* Overlay with all 4 images in a grid */}
                <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1">
                    {images.map((img, idx) => (
                        <div
                            key={idx}
                            className="overflow-hidden rounded-sm"
                            style={{
                                backgroundImage: `url(${img})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                filter: 'blur(8px)',
                                opacity: 0.7
                            }}
                        />
                    ))}
                </div>
                {/* Semi-transparent overlay for better visibility */}
                <div className="absolute inset-0 bg-black/30" />
            </div>
        )
    }

    return (
        <>
            <div className="md:hidden -mx-4 relative ">
                {/* Slider */}
                <div className="absolute top-4 right-6 flex gap-2">
                    {shareProps && <ShareButton {...shareProps} />}

                    {showShortlistButton && onShortlist && (
                        !isLoading ? (
                            <DetailsShortlistButton
                                isShortlisted={isShortlisted}
                                isLoading={isLoading}
                                onShortlist={onShortlist}
                            />
                        ) : (
                            <div className="h-10 w-10 rounded-full border border-grey-4 bg-grey-4/50 animate-pulse" />
                        )
                    )}
                </div>
                <div
                    ref={sliderRef}
                    onScroll={handleScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar">
                    {images.map((img, index) => (
                        <div
                            key={index}
                            className="snap-center shrink-0 w-full px-4"
                            onClick={() => handleImageClick(img, index)}>
                            <img
                                src={img}
                                alt=""
                                className="w-full h-[320px] object-cover "
                            />
                        </div>
                    ))}
                </div>

                {/* Dots */}
                <div className="absolute bottom-3 left-6 flex gap-1.5">
                    {images.map((_, index) => (
                        <span
                            key={index}
                            className={`w-2 h-2 rounded-full transition-opacity ${
                                activeIndex === index ? 'bg-white opacity-100' : 'bg-white opacity-40'
                            }`}
                        />
                    ))}
                </div>
                <div className="absolute bottom-3 right-3 ">
                    <ViewGalleryButton onClick={onShowAllPhotos} />
                </div>
            </div>

            <div className={`relative ${className} max-md:hidden`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[58vh] rounded-2xl overflow-hidden">
                    {/* Large image on left */}
                    {topFiveImages[0] && topFiveImages[0] !== 'dummy' && (
                        <div
                            onClick={() => handleImageClick(topFiveImages[0], 0)}
                            className="md:col-span-2 overflow-hidden block rounded-l-2xl cursor-pointer hover:opacity-90 transition-opacity">
                            <img
                                src={topFiveImages[0]}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* Right grid 2x2 */}
                    <div className="grid grid-cols-2 gap-4">
                        {topFiveImages.slice(1, 5).map((img, index) => {
                            // Handle dummy image for 4 images case (should be at index 3, bottom-right)
                            if (img === 'dummy' && index === 3) {
                                return (
                                    <div
                                        key={index}
                                        className="w-full h-full">
                                        {renderDummyImage()}
                                    </div>
                                )
                            }

                            // Skip rendering if this is the dummy but not at the right position
                            if (img === 'dummy') {
                                return null
                            }

                            return (
                                <div
                                    key={index}
                                    onClick={() => handleImageClick(img, index + 1)}
                                    className={`overflow-hidden block cursor-pointer hover:opacity-90 transition-opacity ${
                                        index === 1 ? 'rounded-tr-2xl' : index === 3 ? 'rounded-br-2xl' : ''
                                    }`}>
                                    <img
                                        src={img}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* View gallery button */}
                <ViewGalleryButton onClick={onShowAllPhotos} />
            </div>
        </>
    )
}

export default ImageGrid
