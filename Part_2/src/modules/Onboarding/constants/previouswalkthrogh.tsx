import React from 'react'
import FloatingImage from '../components/FloatingImage' 
import PriceComparisonCard, { BookingPlatform } from '../components/PriceComparisonCard' 
import HotelCard, { HotelCardData } from '../components/HotelCard' 
import { getPlatformLogoURL } from '@/constants/icons/platformIcons'
import Typography from '@/components/shared/Typography'
import { GEM_ICON } from '@/constants/thiingsIcons'


export interface WalkthroughLayoutProps {
    scale: number
}

interface CategoryChipProps {
    emoji: string
    label: string
    variant: 'popular' | 'offbeat'
    position: {
        left?: string
        right?: string
        top?: string
        bottom?: string
        transform?: string
        rotate?: number
    }
    scale: number
    chipBgColor?: string
}


interface DestinationCardProps {
    image: string
    alt: string
    fallbackImage: string
    title: string
    location: string
    duration: string
    category: {
        icon: string
        label: string
    }
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


const CategoryChip: React.FC<CategoryChipProps> = ({ emoji, label, variant, position, scale, chipBgColor }) => {
    const bgColor = chipBgColor ? chipBgColor : variant === 'popular' ? '#FFE554' : '#20EF82' // Yellow for popular, green for offbeat
    const icon = variant === 'popular' ? '⭐' : '⭐'

    return (
        <div
            className="absolute flex items-center justify-center gap-[10px] px-2 py-1.5 rounded-[16px] shadow-[0px_2px_8px_rgba(16,16,16,0.24)]"
            style={{
                backgroundColor: bgColor,
                transform: position.transform
                    ? `${position.transform} ${position.rotate ? `rotate(${position.rotate}deg)` : ''} scale(${scale})`
                    : `${position.rotate ? `rotate(${position.rotate}deg)` : 'rotate(-2deg)'} scale(${scale})`,
                left: position.left,
                right: position.right,
                top: position.top,
                bottom: position.bottom
            }}>
            <span className="text-sm">{emoji || icon}</span>
            <Typography
                size="14"
                weight="bold"
                family="redhat"
                color="grey-0">
                {label}
            </Typography>
        </div>
    )
}

const DestinationCard: React.FC<DestinationCardProps> = ({
    image,
    alt,
    fallbackImage,
    title,
    location,
    duration,
    category,
    rotation,
    position,
    transformOrigin,
    scale
}) => {
    const rotationClass = rotation > 0 ? 'rotate-2' : rotation < 0 ? '-rotate-2' : ''

    return (
        <div
            className={`absolute ${rotationClass} bg-natural-white rounded-[12px] shadow-[0px_2px_8px_rgba(77,29,145,0.16)] w-[280px] overflow-hidden`}
            style={{
                transform: `scale(${scale})`,
                transformOrigin,
                ...position
            }}>
            {/* Image Section */}
            <div className="relative w-full h-[180px] overflow-hidden">
                <img
                    src={image}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.src = fallbackImage
                    }}
                />
                {/* Hidden Gem Badge */}
                <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded-full flex items-center gap-1">
                    <img
                        src={GEM_ICON}
                        alt="Hidden Gem"
                        className="w-4 h-4 object-contain"
                    />
                    <Typography
                        size="10"
                        weight="bold"
                        family="redhat"
                        color="grey-0">
                        Hidden Gem
                    </Typography>
                </div>
                {/* Heart Icon */}
                <div className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center border border-white rounded-full p-1">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-3 flex flex-col gap-[0.5px]">
                {/* Category Tag */}
                <div className="flex items-center gap-1 bg-grey-5 px-2 py-1 rounded-full w-fit">
                    <span className="text-grey-1 text-xs">{category.icon}</span>
                    <Typography
                        size="10"
                        weight="medium"
                        family="redhat"
                        color="grey-1">
                        {category.label}
                    </Typography>
                </div>

                {/* Location Name */}
                <Typography
                    size="16"
                    weight="semibold"
                    family="redhat"
                    color="grey-0">
                    {title}
                </Typography>

                {/* City, Country */}
                <Typography
                    size="10"
                    weight="medium"
                    family="manrope"
                    color="grey-2">
                    {location}
                </Typography>

                {/* Duration */}
                <Typography
                    size="10"
                    weight="medium"
                    family="manrope"
                    color="grey-2">
                    {duration}
                </Typography>
            </div>
        </div>
    )
}


export const Walkthrough1Layout: React.FC<WalkthroughLayoutProps> = ({ scale }) => {
    return (
        <div
            className="relative w-[400px] h-[400px] flex items-center justify-center"
            style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
        >
            <div className="absolute border-[4px] border-natural-white opacity-[0.08] rounded-[16px] w-[320px] h-[320px]" />

            {/* Question bubble */}
            <div
                className="absolute -rotate-2 bg-primary-pale-purple border border-primary-light shadow-[0px_2px_8px_rgba(112,17,246,0.16)] px-3 py-2 rounded-[12px] left-[-20%] top-4 w-[250px]"
                style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
            >
                <p className="text-[16px] font-bold text-grey-0">
                    "Which is the best Burj Khalifa ticket to buy for couples?"
                </p>
            </div>

            {/* Response card */}
            <div
                className="absolute rotate-2 bg-natural-white border border-grey-4 rounded-[12px] shadow-[0px_2px_8px_rgba(77,29,145,0.16)] w-[315px] h-[300px] right-[-40%] top-[25%] overflow-hidden flex flex-col"
                style={{ transform: `scale(${scale})`, transformOrigin: 'top right' }}
            >
                <div className="bg-primary-pale-purple px-3 py-2 flex items-center gap-1.5">
                    <span className="text-primary-default text-sm">⚡</span>
                    <p className="text-[12px] text-primary-default font-medium">
                        Perfect for seasoned travelers and couples
                    </p>
                </div>

                <div className="w-full h-[150px] overflow-hidden shrink-0 rounded-[12px] p-4">
                    <img
                        src="https://media.rimigo.com/1762869055212_796dc534dac5564994078260f62d6717.png"
                        alt="Burj Khalifa sunset view"
                        className="w-full h-full object-cover rounded-[12px]"
                    />
                </div>

                <div className="px-2 py-2 pb-3 flex flex-col gap-2 flex-1 bg-grey-5 mx-3 rounded-[12px]">
                    <p className="text-[14px] font-bold text-grey-0">
                        Sunset/Prime Hours (4:00 PM - 7:00 PM)
                    </p>

                    {[
                        'Golden hour with stunning sunset colors',
                        'Rooftop garden access',
                        'Ideal for romantic evenings'
                    ].map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <span className="text-[#ffd800] text-sm">★</span>
                            <p className="text-[12px] text-grey-1">{feature}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export const Walkthrough2Layout: React.FC<WalkthroughLayoutProps> = ({ scale }) => {
    return (
        <div
            className="relative w-[400px] h-[400px] flex items-center justify-center"
            style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
        >
            <div className="absolute border-[4px] border-natural-white opacity-[0.08] rounded-[16px] w-[320px] h-[320px]" />

            <DestinationCard
                image="https://media.rimigo.com/1764682475759_765c5e11c4335121952532b493f681c3.png"
                alt="SaveTheWall Studio"
                fallbackImage="https://media.rimigo.com/1764682475759_765c5e11c4335121952532b493f681c3.png"
                title="SaveTheWall Studio"
                location="Como, Italy"
                duration="Visitors typically spend 4-5 hours"
                category={{ icon: '🏛️', label: 'Museums' }}
                rotation={-2}
                position={{ left: '-35%', top: '-6%' }}
                transformOrigin="bottom right"
                scale={scale}
            />

            <DestinationCard
                image="https://media.rimigo.com/1764682407937_537149aba16255bc8e22218ae705684f.png"
                alt="Montmartre"
                fallbackImage="https://media.rimigo.com/1764682407937_537149aba16255bc8e22218ae705684f.png"
                title="Montmartre"
                location="Paris, France"
                duration="Visitors typically spend 2-3 hours"
                category={{ icon: '🏘️', label: 'Neighbourhood' }}
                rotation={2}
                position={{ right: '-35%', bottom: '0%' }}
                transformOrigin="top left"
                scale={scale}
            />

            <CategoryChip
                emoji="🤩"
                label="Popular"
                variant="popular"
                position={{ left: '65%', top: '5%', transform: 'translateX(-50%)' }}
                scale={scale}
            />

            <CategoryChip
                emoji="✨"
                label="Offbeat"
                variant="offbeat"
                position={{ left: '30%', bottom: '5%', transform: 'translateX(-50%)' }}
                scale={scale}
            />
        </div>
    )
}

export const Walkthrough3Layout: React.FC<WalkthroughLayoutProps> = ({ scale }) => {
    const bookingPlatforms: BookingPlatform[] = [
        {
            name: 'Agoda',
            logo: getPlatformLogoURL('AGODA') ?? '',
            price: '₹4,700',
            isCheapest: true
        },
        {
            name: 'Booking.com',
            logo: getPlatformLogoURL('BOOKING_COM') ?? '',
            price: '₹4,950',
            isCheapest: false
        },
        {
            name: 'MakeMyTrip',
            logo: getPlatformLogoURL('MAKE_MY_TRIP') ?? '',
            price: '₹4,999',
            isCheapest: false
        },
        {
            name: 'Goibibo',
            logo: getPlatformLogoURL('GOIBIBO') ?? '',
            price: '₹5,500',
            isCheapest: false
        },
        {
            name: 'Cleartrip',
            logo: getPlatformLogoURL('CLEARTIP') ?? '',
            price: '₹5,200',
            isCheapest: false
        },
        {
            name: 'Expedia',
            logo: getPlatformLogoURL('EXPEDIA') ?? '',
            price: '₹5,000',
            isCheapest: false
        }
    ]

    const offset = 40 * scale

    return (
        <div
            className="relative w-[400px] h-[400px] flex items-center justify-center"
            style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
        >
            <div className="absolute border-[4px] border-natural-white opacity-[0.08] rounded-[16px] w-[320px] h-[320px]" />

            <FloatingImage
                src="https://media.rimigo.com/1764684002598_d34b7fee1a6851a78964ad1880aa11fb.png"
                alt="hotel room"
                width="180px"
                height="140px"
                rotation={-2}
                position={{
                    left: `${-offset * 2}px`,
                    top: `${offset * 0.6}px`
                }}
                transformOrigin="top left"
                scale={scale}
            />

            <PriceComparisonCard
                platforms={bookingPlatforms}
                rotation={2}
                style={{ bottom: -5, right: -100 }}
            />
        </div>
    )
}



export const Walkthrough4Layout: React.FC<WalkthroughLayoutProps> = ({ scale }) => {
    const hotels: HotelCardData[] = [
        {
            image: 'https://media.rimigo.com/1764683146169_09594f032b97569a992ee46d3c69d9c6.png',
            matchPercentage: '90%',
            reviews: [
                { score: '8.4', count: '2.9k reviews' },
                { score: '8.7', count: '2.8k reviews', platform: 'Booking.com', platformIcon: getPlatformLogoURL('BOOKING_COM') ?? '' }
            ],
            name: 'Grand Hyatt Tokyo',
            location: 'Tokyo',
            price: '₹25,941'
        },
        {
            image: 'https://media.rimigo.com/1764683177424_6e9ce9902fc654f5b3810bccc6f17857.png',
            matchPercentage: '96%',
            reviews: [
                { score: '9.2', count: '1.3k reviews' },
                { score: '8.9', count: '5.7k reviews', platform: 'Trip.com', platformIcon: getPlatformLogoURL('TRIP_COM') ?? '' }
            ],
            name: 'Casa Celeste',
            location: 'Rome',
            price: '₹5,730'
        }
    ]

    return (
        <div
            className="relative w-[400px] h-[400px] flex items-center justify-center"
            style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
        >
            <div className="absolute border-[4px] border-natural-white opacity-[0.08] rounded-[16px] w-[320px] h-[320px]" />

            <HotelCard
                hotel={hotels[0]}
                rotation={-2}
                position={{ left: '-30%', top: '-3%' }}
                transformOrigin="top left"
                scale={scale}
            />

            <HotelCard
                hotel={hotels[1]}
                rotation={2}
                position={{ right: '-30%', bottom: '1%' }}
                transformOrigin="bottom right"
                scale={scale}
            />

            <CategoryChip
                emoji="👶"
                label="Perfect for children"
                variant="popular"
                position={{ left: '15%', bottom: '20%', transform: 'translateX(-50%)' }}
                scale={scale}
                chipBgColor="#FFF"
            />

            <CategoryChip
                emoji="❤️"
                label="For couples on honeymoon"
                variant="offbeat"
                position={{ right: '15%', top: '15%', transform: 'translateX(50%)' }}
                scale={scale}
                chipBgColor="#FFF"
            />
        </div>
    )
}

export const WALKTHROUGH_LAYOUTS = [
    Walkthrough1Layout,
    Walkthrough2Layout,
    Walkthrough3Layout,
    Walkthrough4Layout
]
