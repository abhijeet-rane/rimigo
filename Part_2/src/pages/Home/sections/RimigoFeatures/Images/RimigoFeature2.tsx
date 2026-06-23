import React from 'react'
import { DUMMY_USER_IMAGES } from '@/modules/Premium/constants'

const CU_CHI_IMAGE = 'https://images.unsplash.com/photo-1528127269322-539801943592?w=200&q=80'
const TASTE_SAIGON_IMAGE = 'https://images.unsplash.com/photo-1524429656589-6633a470097c?w=200&q=80'
const WAR_REMNANTS_IMAGE = 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=200&q=80'

type NameChipProps = {
    name: string
    color: string
    imageUrl: string
    position: { left?: string; right?: string; top?: string; bottom?: string }
    className?: string
}

const NameChip = ({ name, color, imageUrl, position, className = '' }: NameChipProps) => (
    <div
        className={`absolute z-40 flex items-center gap-2.5 rounded-[20px] px-3 py-2 text-base font-semibold text-white font-red-hat-display shadow-[0px_2px_8px_rgba(16,_16,_16,_0.5)] border-[2px] border-grey-0 ${className}`}
        style={{
            backgroundColor: color,
            ...position
        }}>
        <img
            src={imageUrl}
            alt={name}
            className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
        <span>{name}</span>
    </div>
)

type EventCardProps = {
    image: string
    alt: string
    title: string
    subtitle: string
    icon?: React.ReactNode
    tip?: string
    className?: string
}

const EventCard = ({ image, alt, title, subtitle, icon, tip, className = '' }: EventCardProps) => (
    <div
        className={`w-full relative rounded-xl bg-white border-grey-4 border-[1px] box-border flex flex-col items-start justify-center p-2 gap-2 text-left text-sm text-gray font-manrope ${className}`}>
        <div className="flex items-center gap-2 shrink-0 w-full">
            <img
                src={image}
                alt={alt}
                className="w-12 h-12 relative shrink-0 object-cover rounded-[8px]"
            />
            <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                <div className="self-stretch relative tracking-[-0.01em] leading-[18px] font-semibold text-gray-900">{title}</div>
                <div className="self-stretch relative text-xs tracking-[-0.01em] text-gray-500">{subtitle}</div>
            </div>
            {icon && <div className="shrink-0 opacity-60">{icon}</div>}
        </div>
        {tip && (
            <div className="w-full rounded bg-gainsboro flex items-center py-0.5 px-2 box-border shrink-0 text-[11px] text-darkslategray">
                <div className="relative tracking-[-0.01em] leading-4 font-medium">{tip}</div>
            </div>
        )}
    </div>
)

const GroupIcon = ({ className }: { className?: string }) => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={className}>
        <path
            d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <circle
            cx="9"
            cy="7"
            r="4"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M23 21v-2a4 4 0 0 0-3-3.87"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M16 3.13a4 4 0 0 1 0 7.75"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const WineIcon = ({ className }: { className?: string }) => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={className}>
        <path
            d="M8 22h8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M7 10h10v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10z"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M12 15v7"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M12 15a5 5 0 0 0 5-5c0-2-2-3-2-6H9c0 3-2 4-2 6a5 5 0 0 0 5 5z"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const BuildingIcon = ({ className }: { className?: string }) => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={className}>
        <path
            d="M3 21h18"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M9 8h1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M9 12h1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M9 16h1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M14 8h1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M14 12h1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M14 16h1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const HILTON_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100&q=80'

const RimigoFeatureCard2 = () => {
    return (
        <div className="relative flex min-h-[350px] w-full items-center justify-center ">
            {/* Main card with green border - contains all 4 event cards */}
            <div className="relative w-[300px] h-full rounded-xl p-3 bg-grey-5 ">
                {/* Event card 1 - Cu Chi Tunnels (blur) */}
                <div className="relative z-20 -rotate-1 opacity-70 blur-[2px]">
                    <EventCard
                        image={CU_CHI_IMAGE}
                        alt="Cu Chi Tunnels"
                        title="Cu Chi Tunnels"
                        subtitle="2:00pm - 3:00pm"
                        icon={<GroupIcon className="text-orange-400" />}
                    />
                </div>

                {/* Event card 2 - A Taste Of Saigon */}
                <div className="relative z-20 mt-1.5 translate-x-10 rotate-1 opacity-50">
                    <EventCard
                        image={TASTE_SAIGON_IMAGE}
                        alt="A Taste Of Saigon"
                        title="A Taste Of Saigon"
                        subtitle="24 hours"
                        icon={<WineIcon className="text-emerald-500" />}
                    />
                </div>

                {/* Event card 3 - War Remnants Museum */}
                <div className="relative z-20 mt-1.5 -translate-x-6 -rotate-1 opacity-50">
                    <EventCard
                        image={WAR_REMNANTS_IMAGE}
                        alt="War Remnants Museum"
                        title="War Remnants Museum"
                        subtitle="10:00am - 11:00am"
                    />
                </div>

                {/* Event card 4 - Check-in at the Hilton (blur) */}
                <div className="relative z-20 mt-1.5 rotate-1 opacity-70 blur-[2px]">
                    <EventCard
                        image={HILTON_IMAGE}
                        alt="Check-in at the Hilton"
                        title="Check-in at the Hilton"
                        subtitle="2:00pm"
                        icon={<BuildingIcon className="text-blue-400" />}
                    />
                </div>

                {/* Name chips - overlay on event cards */}
                <NameChip
                    name="Sameer"
                    color="#22c55e"
                    imageUrl={DUMMY_USER_IMAGES.POTRAIT_1}
                    position={{ left: '-12px', top: '12%' }}
                    className="rounded-tl-[32px] rounded-tr-3xl rounded-br rounded-bl-[32px]"
                />
                <NameChip
                    name="Rajni"
                    color="#3b82f6"
                    imageUrl={DUMMY_USER_IMAGES.POTRAIT_2}
                    position={{ right: '-12px', top: '20%' }}
                    className="rounded-tl-3xl rounded-tr-[32px] rounded-br-[32px] rounded-bl"
                />
                <NameChip
                    name="Rita"
                    color="#ec4899"
                    imageUrl={DUMMY_USER_IMAGES.POTRAIT_3}
                    position={{ left: '4px', bottom: '28%' }}
                    className="rounded-tl-[32px] rounded-tr rounded-br-3xl rounded-bl-[32px] "
                />
                <NameChip
                    name="Virat"
                    color="#ef4444"
                    imageUrl={DUMMY_USER_IMAGES.POTRAIT_4}
                    position={{ right: '4px', bottom: '12%' }}
                    className="rounded-tl rounded-tr-[32px] rounded-br-[32px] rounded-bl-3xl "
                />
            </div>
        </div>
    )
}

export default RimigoFeatureCard2
