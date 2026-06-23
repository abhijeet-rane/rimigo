import { AmenityToIconMap } from '../../Utils/iconMapping'
import { getLucideIcon } from '@/constants/lucideIconMap'

interface AmenitiesSectionProps {
    amenities: string[]
}

export const AmenitiesSection = ({ amenities }: AmenitiesSectionProps) => {
    if (!Array.isArray(amenities) || amenities.length === 0) return null

    return (
        <div
            id="amenitiesSection"
            className="mt-8 md:mt-10 max-md:border max-md:border-grey-4 max-md:p-4 max-md:rounded-2xl">
            <div
                style={{
                    color: '#000',
                    fontFamily: 'Red Hat Display',
                    fontSize: 24,
                    fontStyle: 'normal',
                    fontWeight: 550 as any,
                    lineHeight: 'normal'
                }}>
                All amenities
            </div>
            <div
                className="mb-4"
                style={{
                    color: 'var(--grey-2, #747474)',
                    fontFamily: 'Manrope',
                    fontSize: 14,
                    fontStyle: 'normal',
                    fontWeight: 500 as any,
                    lineHeight: 'normal',
                    letterSpacing: '-0.28px'
                }}>
                Here’s everything this stay has to offer
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 md:gap-x-8 gap-y-4 pt-[22px]">
                {amenities.map((amenity) => {
                    const key = amenity as keyof typeof AmenityToIconMap
                    const iconName = AmenityToIconMap[key]
                    const IconEl = iconName ? getLucideIcon(iconName, 18, 18) : null
                    return (
                        <div
                            key={amenity}
                            className="flex items-center gap-2 h-8">
                            {IconEl && <span className="flex-shrink-0">{IconEl}</span>}
                            <span
                                className="truncate"
                                style={{
                                    textTransform: 'capitalize',
                                    color: '#000',
                                    fontFamily: 'Red Hat Display',
                                    fontSize: 16,
                                    fontStyle: 'normal',
                                    fontWeight: 467 as any,
                                    lineHeight: '20px',
                                    letterSpacing: '-0.16px'
                                }}>
                                {amenity.split('_').join(' ')}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
