import React from 'react'

interface ImageStackProps {
    images: { caption?: string; link: string }[]
}

const ImageStack: React.FC<ImageStackProps> = ({ images }) => {

    // Only first 3 valid images for stacked preview
    const displayImages = images.slice(0, 3).filter((img) => img.link)

    const tiltClasses = [
        'rotate-[-6deg] translate-x-[-10px] z-0', // left
        'z-10', // middle
        'rotate-[6deg] translate-x-[10px] z-0' // right
    ]

    return (
        <>
            {/* 📸 Image Stack */}
            <div
                className="relative flex items-center justify-center w-[80px] h-[80px] group"
            >
                {displayImages.map((img, idx) => (
                    <img
                        key={idx}
                        src={img.link}
                        alt={img.caption || `room-image-${idx}`}
                        className={`absolute w-[72px] h-[72px] object-cover rounded-[12px] shadow-md border border-grey-3 transition-transform duration-300 ${tiltClasses[idx] || ''}`}
                        style={{
                            left: '50%',
                            transform: `translateX(-50%) ${idx === 0 ? 'rotate(-6deg)' : idx === 1 ? 'rotate(0deg)' : 'rotate(6deg)'}`
                        }}
                    />
                ))}
            </div>
        </>
    )
}

export default ImageStack

