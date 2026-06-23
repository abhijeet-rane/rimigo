import React from 'react'
import Typography from '@/components/shared/Typography'
import { ArrowRight } from 'lucide-react'

export interface BookingPlatform {
    name: string
    logo: string
    price: string
    isCheapest: boolean
}

interface PriceComparisonCardProps {
    platforms: BookingPlatform[]
    rotation?: number
    className?: string
    style?: React.CSSProperties
}

const PriceComparisonCard: React.FC<PriceComparisonCardProps> = ({ platforms, rotation = 2, className = '', style }) => {
    const rotationClass = rotation > 0 ? 'rotate-2' : rotation < 0 ? '-rotate-2' : ''

    return (
        <div
            className={`absolute ${rotationClass} bg-natural-white rounded-[24px] shadow-[0px_2px_8px_rgba(77,29,145,0.16)] w-[280px] overflow-hidden ${className}`}
            style={{ ...style }}>
            {platforms.map((platform, index) => (
                <div
                    key={index}
                    className={`flex items-center justify-between px-5 py-1 h-[48px] border-t border-grey-4 ${
                        index === 0 ? 'bg-grey-5 rounded-t-[24px]' : ''
                    } ${index === platforms.length - 1 ? 'rounded-b-[24px]' : ''}`}>
                    {/* Left side - Logo and name */}
                    <div className="flex items-center gap-2 justify-center">
                        <img
                            src={platform.logo}
                            alt={platform.name}
                            className="w-6 h-6 object-contain rounded-full"
                            onError={(e) => {
                                e.currentTarget.src = '/onBoarding/walkthrough/b_icon.jpg'
                            }}
                        />
                        <Typography
                            size="12"
                            weight="semibold"
                            family="redhat"
                            color="grey-0">
                            {platform.name}
                        </Typography>
                        {platform.isCheapest && (
                            <div className="bg-secondary-green px-1.5 py-0.5 rounded-[20px]">
                                <p className="text-white text-[9px] font-extrabold">CHEAPEST</p>
                            </div>
                        )}
                    </div>

                    {/* Right side - Price and arrow */}
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <Typography
                                size="9"
                                weight="semibold"
                                family="manrope"
                                color="grey-2">
                                starts from
                            </Typography>
                            <Typography
                                size="14"
                                weight="semibold"
                                family="manrope"
                                color="grey-0">
                                {platform.price}
                            </Typography>
                        </div>
                        <div className="w-[20px] h-[20px] rounded-full border border-primary-default flex items-center justify-center cursor-pointer hover:bg-primary-default/10 transition">
                            <ArrowRight
                                size={16}
                                // transform at 45 degrees
                                className="text-primary-default transform rotate-[-45deg] transition-transform duration-300 scale-110"
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default PriceComparisonCard
