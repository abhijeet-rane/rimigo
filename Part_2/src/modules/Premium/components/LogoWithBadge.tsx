import React from 'react'
import Badge from '../shared/Badge' 

interface LogoWithBadgeProps {
    logoSrc: string
    altText?: string
    badgeText?: string

    // ✅ support old + new
    badgeColorClass?: string
    badgeClassName?: string

    className?: string
}

const LogoWithBadge: React.FC<LogoWithBadgeProps> = ({
    logoSrc,
    altText = 'Logo',
    badgeText,
    badgeColorClass,
    badgeClassName,
    className = '',
}) => {
    return (
        <div className={`relative z-10 flex items-center justify-center gap-2 ${className}`}>
            <img
                src={logoSrc}
                alt={altText}
                className="h-12 w-auto object-contain"
            />

            {badgeText && (
                <Badge
                    text={badgeText}
                    className={badgeClassName ?? badgeColorClass}
                />
            )}
        </div>
    )
}

export default LogoWithBadge
