import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { STAR_PRIMARY_DEFAULT } from '@/constants/icons/svgFromCDN'

interface AIPillProps {
    label: ReactNode
    onClick?: () => void
    /** Visual size. `sm` is used in inline CTAs (banners), `md` for stand-alone. */
    size?: 'sm' | 'md'
    /** Disables the button visually + prevents the click. */
    disabled?: boolean
    /** Optional icon override. Defaults to the primary-default sparkle star
     *  image shared with "Help me choose", "For you", etc. */
    icon?: ReactNode
    className?: string
    type?: 'button' | 'submit'
    'aria-label'?: string
}

/**
 * Reusable "AI prompt" pill — same visual language as the Help-me-choose
 * pill and the For-you chip (white pill, primary-default border + label,
 * sparkle star glyph). Use anywhere a CTA hands off to the AI concierge.
 */
const AIPill: React.FC<AIPillProps> = ({
    label,
    onClick,
    size = 'sm',
    disabled = false,
    icon,
    className,
    type = 'button',
    'aria-label': ariaLabel
}) => {
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
    const padding = size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2'
    const text = size === 'sm' ? 'text-[13px]' : 'text-[14px]'

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-primary-default bg-white font-bold font-red-hat-display text-primary-default shrink-0 cursor-pointer hover:bg-primary-default-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                padding,
                text,
                className
            )}>
            {icon ?? (
                <img
                    src={STAR_PRIMARY_DEFAULT}
                    alt=""
                    className={cn(iconSize, 'shrink-0')}
                />
            )}
            <span className="whitespace-nowrap">{label}</span>
        </button>
    )
}

export default AIPill
