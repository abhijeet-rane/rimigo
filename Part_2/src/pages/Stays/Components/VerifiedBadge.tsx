import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface VerifiedBadgeProps {
    /** 'icon' = just the SVG + tooltip; 'pill' = bg pill with "Verified" label + tooltip */
    variant?: 'icon' | 'pill'
    size?: 'sm' | 'md' | 'lg'
}

const iconSizeMap = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' }
const pillIconSizeMap = { sm: 'w-3 h-3', md: 'w-3.5 h-3.5', lg: 'w-4 h-4' }
const pillTextSizeMap = { sm: 'text-[0.625rem]', md: 'text-[0.6875rem]', lg: 'text-xs' }
const pillPaddingMap = { sm: 'px-2 py-0.5', md: 'px-2.5 py-1', lg: 'px-3 py-1.5' }

const BADGE_URL = 'https://media.rimigo.com/1776327515732_verified_badge.svg'

const tooltipContentClass =
    'bg-[#101010] text-white text-xs font-manrope font-medium tracking-[-0.015em] px-2.5 py-2.5 rounded-[8px] shadow-[0px_1px_4px_0px_#e0e0e0] border-0'

export function VerifiedBadge({ variant = 'icon', size = 'md' }: VerifiedBadgeProps) {
    const trigger =
        variant === 'pill' ? (
            <div
                className={`inline-flex items-center gap-1 ${pillPaddingMap[size]} rounded bg-white backdrop-blur-sm shadow-md shadow-indigo-600/25 cursor-default`}
            >
                <img src={BADGE_URL} alt="Verified" className={`${pillIconSizeMap[size]} shrink-0`} />
                <span className={`${pillTextSizeMap[size]} font-red-hat-display font-bold text-grey-0 tracking-wide`}>
                    Verified
                </span>
            </div>
        ) : (
            <img src={BADGE_URL} alt="Verified" className={`${iconSizeMap[size]} shrink-0 cursor-default`} />
        )

    return (
        <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent
                sideOffset={6}
                arrowClassName="fill-[#101010]"
                className={tooltipContentClass}
            >
                Verified by Rimigo
            </TooltipContent>
        </Tooltip>
    )
}
