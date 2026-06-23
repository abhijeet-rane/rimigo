import React from 'react'

interface FloatingImageProps {
    src: string
    alt: string
    width: string
    height: string
    rotation: number
    position: {
        left?: string
        right?: string
        top?: string
        bottom?: string
    }
    transformOrigin: string
    scale: number
    className?: string
}

const FloatingImage: React.FC<FloatingImageProps> = ({ src, alt, width, height, rotation, position, transformOrigin, scale, className = '' }) => {
    const rotationClass = rotation > 0 ? 'rotate-2' : rotation < 0 ? '-rotate-2' : ''

    return (
        <div
            className={`absolute ${rotationClass} bg-grey-4 rounded-[15px] ${className}`}
            style={{
                width,
                height,
                transform: `scale(${scale})`,
                transformOrigin,
                boxShadow: '0px 2px 8px rgba(77, 29, 145, 0.16)',
                ...position
            }}>
            <img
                src={src}
                style={{
                    boxShadow: '0px 2px 8px rgba(77, 29, 145, 0.16)'
                }}
                className="w-full h-full object-cover rounded-[15px]"
                alt={alt}
                onError={(e) => {
                    e.currentTarget.style.display = 'none'
                }}
            />
        </div>
    )
}

export default FloatingImage
