import React from 'react'
import { Play } from 'lucide-react'

interface ImageShowCaseProps {
    images: string[]
    aspectRatio: 'portrait' | 'landscape'
    showPlayButton?: boolean
    isHovered?: boolean
    enableTiltOnHover?: boolean
    maxImages?: number
    imageWidthPortraitCustom?: string
    imageHeightPortraitCustom?: string
    showBorder?: boolean
    showShadow?: boolean
    gap?: string
    className?: string
}

export const ImageShowCase: React.FC<ImageShowCaseProps> = ({
    images,
    aspectRatio,
    className,
    showPlayButton = false,
    isHovered = false,
    enableTiltOnHover = true,
    maxImages = 4,
    imageWidthPortraitCustom = 'w-20',
    imageHeightPortraitCustom = 'h-16',
    showBorder = true,
    showShadow = false,
    gap = 'none'
}) => {
    const safeImages = (images?.length ? images : ['/images/hero/placeholder.png']).slice(0, maxImages)

    const isPortrait = aspectRatio === 'portrait'
    const imageWidth = isPortrait ? 'w-14' : imageWidthPortraitCustom
    const imageHeight = isPortrait ? 'h-19' : imageHeightPortraitCustom

    return (
        <div className={`flex -space-x-4 ${gap}`}>
            {safeImages.map((img, idx) => {
                // Default: even indices rotate left, odd rotate right
                // On hover: reverse the rotation (if enabled)
                const shouldTilt = enableTiltOnHover && isHovered
                const baseRotation = isPortrait ? 2 : 4
                        const direction = idx % 2 === 0 ? 1 : -1
                        const finalRotation = shouldTilt
                            ? -direction * baseRotation
                            : direction * baseRotation

                // const rotation = `rotate-[${finalRotation}deg]`
                return (
                    <div
                        key={`hero-image-${idx}`}
                        className={`relative  ${className} ${imageWidth} ${imageHeight} rounded-xl shadow-md overflow-hidden bg-grey-100  transition-transform duration-300 ease-in-out`}
                        style={{
                            transform: `rotate(${finalRotation}deg)`,
                            backgroundImage: `url(${img})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: showBorder && !isPortrait ? '3px solid white' : 'none',
                            boxSizing: 'border-box',
                            boxShadow: showShadow ? '0px 2px 12px #aeaeae' : 'none'
                        }}>
                        {/* Play button overlay for portrait images */}
                        {showPlayButton && isPortrait && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
