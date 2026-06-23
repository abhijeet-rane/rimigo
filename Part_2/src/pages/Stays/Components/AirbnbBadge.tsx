import { PLATFORM_ICONS } from '@/constants/icons/platformIcons'
import clsx from 'clsx'

interface AirbnbBadgeProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const SIZE_CONFIG = {
    sm: { img: 'h-3',   px: 'px-2 py-1',     rounded: 'rounded-md' },
    md: { img: 'h-3.5', px: 'px-2.5 py-1',   rounded: 'rounded-md' },
    lg: { img: 'h-4',   px: 'px-3 py-1.5',   rounded: 'rounded-md' },
}

export const AirbnbBadge: React.FC<AirbnbBadgeProps> = ({ size = 'md', className }) => {
    const cfg = SIZE_CONFIG[size]
    return (
        <span
            className={clsx(
                'inline-flex items-center justify-center bg-white  border border-grey-4',
                cfg.px, cfg.rounded,
                className
            )}
        >
            <img src={PLATFORM_ICONS.AIRBNB_LOGO} alt="Airbnb" className={clsx(cfg.img, 'w-auto shrink-0')} />
        </span>
    )
}
