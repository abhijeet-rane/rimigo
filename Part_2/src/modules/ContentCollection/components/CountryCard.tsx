import React from 'react'
import { useNavigate } from 'react-router-dom'
import { RIMIGO_COLLECTION_ROUTE } from '@/routes/routes'

interface CountryCardProps {
    countryId: string
    countryName: string
    iconUrl: string | null
    backgroundColor?: string
    textColor?: string
    ctaText?: string
    ctaBgColor?: string
    ctaColor?: string
}

export const CountryCard: React.FC<CountryCardProps> = ({
    countryName,
    iconUrl,
    backgroundColor = '#FFF',
    textColor = '#101010',
    ctaText = '>',
    ctaBgColor = '#101010',
    ctaColor = '#FFF'
}) => {
    const navigate = useNavigate()

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        // Navigate to collections page with country_name in route
        // Convert country name to URL-friendly format (lowercase, spaces to hyphens)
        const countrySlug = countryName.toLowerCase().replace(/\s+/g, '-')
        navigate(`${RIMIGO_COLLECTION_ROUTE}/${countrySlug}`)
    }

    return (
        <div
            className="relative w-full overflow-hidden aspect-6/2 md:aspect-3/2 cursor-pointer group transition-transform hover:scale-[1.03] shadow-md"
            style={{
                backgroundColor,
                borderRadius: '12px',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: '#E0E0E0',
                position: 'relative',
                zIndex: 1
            }}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            aria-label={countryName}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleClick(e as any)
                }
            }}>
            {/* Content Wrapper */}
            <div className=" md:absolute inset-0 flex flex-row md:flex-col items-center justify-start gap-3 md:block px-3 md:px-0">

                {/* Icon */}
                {iconUrl && (
                    <div className="mt-3 md:mt-0 md:absolute md:top-20 md:left-4 flex items-center">
                        <img
                            src={iconUrl}
                            alt={countryName}
                            className="w-[80px] h-[90px] md:w-[100px] md:h-[110px] object-contain"
                        />
                    </div>
                )}

                {/* Title */}
                <div className="md:absolute md:top-4 md:left-4 mt-5 md:mt-0">
                    <h3
                        className="text-[18px] font-bold font-red-hat-display md:text-[20px] leading-5 m-0"
                        style={{
                            fontFamily: 'Red Hat Display',
                            fontWeight: 550,
                            letterSpacing: '-0.02em',
                            color: textColor
                        }}
                    >
                        {countryName}
                    </h3>
                </div>

            </div>


            {/* CTA Button */}
            <div
                className="absolute bottom-0 right-0 z-10"
                onClick={(e) => e.stopPropagation()}
                style={{ pointerEvents: 'none' }}>
                <div
                    className="flex items-center justify-center group-hover:opacity-90 transition-opacity"
                    style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: ctaBgColor,
                        color: ctaColor,
                        borderTopLeftRadius: '12px',
                        borderBottomRightRadius: '8px',
                        pointerEvents: 'none'
                    }}>
                    <span
                        className="text-s font-semibold"
                        style={{
                            color: ctaColor
                        }}>
                        {ctaText}
                    </span>
                </div>
            </div>
        </div>
    )
}
