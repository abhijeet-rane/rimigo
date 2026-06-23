import React, { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { ImageShowCase } from './ImageShowCase'

interface TileProps {
    title: string
    subtitle: string
    images: string[]
    imageType: 'portrait' | 'landscape'
    showOverlay?: boolean
    onClick: () => void
}

export const Tile: React.FC<TileProps> = ({ title, subtitle, images, showOverlay, imageType, onClick }) => {
    const [isHovered, setIsHovered] = useState(false)

    return (
        <div
            className="relative rounded-[15px] p-[2px] w-full h-full"
            style={{
                background: 'linear-gradient(to right, var(--color-primary-default, #7011F6), var(--color-primary-default-light, #AB72FB)) '
            }}>
            <button
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="w-full h-full  rounded-[13px] px-4 py-4 md:px-6 md:py-5 flex flex-col justify-between text-left hover:shadow-lg transition-all duration-300 cursor-pointer"
                style={{
                    backgroundColor: isHovered ? '#F7F5FF' : '#FFFFFF'
                }}>
                <div className="pr-12 md:pr-0 flex-shrink-0 ">
                    <p className="text-xl  md:text-xl text-header-black red-hat-display font-semibold font-red-hat-display leading-tight flex items-center gap-2 flex-wrap justify-between">
                        {title}
                    </p>
                    <p className="hidden md:block text-base md:text-sm text-grey-1 mt-1 manrope font-medium leading-tight">{subtitle}</p>
                </div>

                <div className="mt-4 md:mt-6 flex items-end justify-between pr-12 md:pr-16 flex-shrink-0 max-h-[100px] md:max-h-[120px]">
                    <div className="flex-shrink-0">
                        <ImageShowCase
                            images={images}
                            aspectRatio={imageType}
                            showPlayButton={imageType === 'portrait' && showOverlay === true}
                            isHovered={isHovered}
                            enableTiltOnHover={true}
                        />
                    </div>
                </div>
            </button>

            {/* CTA redirect element fixed to bottom-right touching the border */}
            <div
                className="absolute bottom-[2px] right-[2px] cursor-pointer"
                onClick={onClick}>
                <div className="w-9 h-9 rounded-tl-xl rounded-br-xl bg-primary-dark flex items-center justify-center shadow-md">
                    <ChevronRight className="w-5 h-5 text-white" />
                </div>
            </div>
        </div>
    )
}