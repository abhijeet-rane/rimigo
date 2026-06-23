import React, { useState, useEffect } from 'react'
import Typography from '@/components/shared/Typography'

export interface HotelCardData {
    image: string
    matchPercentage: string
    reviews: Array<{ score: string; count: string; platform?: string; platformIcon?: string }>
    name: string
    location: string
    price: string
}

interface HotelCardProps {
    hotel: HotelCardData
    rotation: number
    position: {
        left?: string
        right?: string
        top?: string
        bottom?: string
    }
    transformOrigin: string
    scale: number
}

const HotelCard: React.FC<HotelCardProps> = ({ hotel, rotation, position, transformOrigin, scale }) => {
    const rotationClass = rotation > 0 ? 'rotate-2' : rotation < 0 ? '-rotate-2' : ''
    const [cardWidth, setCardWidth] = useState('280px')
    const [imageHeight, setImageHeight] = useState('180px')

    useEffect(() => {
        const updateSizes = () => {
            const width = window.innerWidth
            if (width < 1024) {
                setCardWidth('208px')
                setImageHeight('120px')
            } else if (width < 1280) {
                setCardWidth('240px')
                setImageHeight('150px')
            } else if (width < 1536) {
                setCardWidth('280px')
                setImageHeight('180px')
            } else {
                setCardWidth('280px')
                setImageHeight('180px')
            }
        }

        updateSizes()
        window.addEventListener('resize', updateSizes)
        return () => window.removeEventListener('resize', updateSizes)
    }, [])

    return (
        <div
            className={`absolute ${rotationClass} bg-natural-white rounded-[12px] shadow-[0px_2px_8px_rgba(77,29,145,0.16)] overflow-hidden`}
            style={{
                width: cardWidth,
                transform: `scale(${scale})`,
                transformOrigin,
                ...position
            }}>
            {/* Image Section */}
            <div
                className="relative w-full overflow-hidden"
                style={{
                    height: imageHeight
                }}>
                <img
                    src={hotel.image}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=280&h=180&fit=crop'
                    }}
                />
                {/* Match Badge */}
                <div className="absolute top-1.5 left-1.5 lg:top-2 lg:left-2 xl:top-3 xl:left-3 bg-secondary-green px-1 py-0.5 lg:px-1.5 lg:py-0.5 xl:px-2 xl:py-1 rounded-full">
                    <p
                        className="text-white text-[9px] font-bold"
                        style={{ fontSize: 'clamp(8px, 0.7vw, 10px)' }}>
                        {hotel.matchPercentage} match
                    </p>
                </div>
                {/* Heart Icon */}
                <div className="absolute top-1.5 right-1.5 lg:top-2 lg:right-2 xl:top-3 xl:right-3 w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 flex items-center justify-center border border-white rounded-full bg-white/10 backdrop-blur-sm">
                    <svg
                        className="w-2.5 h-2.5 lg:w-3 lg:h-3 xl:w-4 xl:h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </div>

                {/* Review Scores - Overlaid on image at bottom center */}
                {/* <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 lg:bottom-2 xl:bottom-3 flex items-center gap-1 lg:gap-1.5 xl:gap-2">
                    {hotel.reviews.map((review, index) => (
                        <div
                            key={index}
                            className="bg-white px-1.5 py-1 lg:px-2 lg:py-1 xl:px-2.5 xl:py-1.5 rounded-[16px] flex items-center gap-0.5 lg:gap-1 xl:gap-1.5 shadow-sm">
                            {review.platformIcon && (
                                <div className="w-4 h-4 rounded-full">
                                    <img
                                        src={review.platformIcon}
                                        alt={review.platform}
                                        className="w-full h-full object-contain rounded-full"
                                    />
                                </div>
                            )}
                            <div className="flex items-center gap-0.5">
                                <p className="text-grey-2 text-[10px] font-semibold">{review.score}</p>
                                <p className="text-grey-2 text-[9px] font-semibold">({review.count})</p>
                            </div>
                        </div>
                    ))}
                </div> */}
            </div>

            {/* Content Section */}
            <div className="p-2 lg:p-2.5 xl:p-3 flex flex-col gap-1 lg:gap-1.5 border-t border-primary-light/30">
                {/* Hotel Name and Price Row */}
                <div className="flex items-start justify-between gap-1.5 lg:gap-2">
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        {/* Hotel Name */}
                        <Typography
                            size="14"
                            weight="bold"
                            family="redhat"
                            color="grey-0"
                            style={{ fontSize: 'clamp(12px, 1.1vw, 16px)' }}
                            className="line-clamp-1">
                            {hotel.name}
                        </Typography>
                        {/* Location */}
                        <Typography
                            size="11"
                            weight="medium"
                            family="redhat"
                            color="grey-2"
                            style={{ fontSize: 'clamp(10px, 0.9vw, 12px)' }}>
                            {hotel.location}
                        </Typography>
                    </div>
                    {/* Price */}
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <Typography
                            size="12"
                            weight="bold"
                            family="redhat"
                            color="grey-0"
                            style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>
                            {hotel.price}
                        </Typography>
                        <Typography
                            size="10"
                            weight="medium"
                            family="redhat"
                            color="grey-2"
                            style={{ fontSize: 'clamp(9px, 0.8vw, 11px)' }}>
                            price per night
                        </Typography>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HotelCard
