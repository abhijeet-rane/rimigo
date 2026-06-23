import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'
import clsx from 'clsx'

interface ExploreNavButtonProps {
    title: string
    collapsedTitle?: string
    icon: React.ComponentType<{ className?: string }>
    isCollapsed: boolean
    isActive: boolean
    onNavigate: () => void
}

export function ExploreNavButton({
    title,
    icon: Icon,
    isCollapsed,
    isActive,
    onNavigate,
}: ExploreNavButtonProps) {
    const isMobile = useIsMobile()

    const button = (
        <button
            onClick={onNavigate}
            className={clsx(
                'group relative cursor-pointer rounded-xl transition-all duration-200',
                'flex items-center',
                isCollapsed
                    ? 'w-full h-12 justify-center px-3'
                    : 'w-full h-10 md:h-9 flex-row gap-[8px] px-3',
                isActive
                    ? 'bg-primary-pale-purple text-primary-default'
                    : 'text-grey-1 hover:bg-grey-5'
            )}>
            {/* Active indicator bar */}
            {isActive && !isCollapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-default rounded-r-full" />
            )}

            {/* Icon */}
            <div className="w-7 h-7 flex items-center justify-center shrink-0">
                <Icon className={clsx('w-[22px] h-[22px] transition-colors duration-200', isActive ? 'text-primary-default' : 'text-grey-1 group-hover:text-grey-0')} />
            </div>

            {/* Title - only in expanded */}
            {!isCollapsed && (
                <span className={clsx('text-[16px] md:text-sm font-semibold font-red-hat-display leading-[-1%] transition-colors duration-200', isActive ? 'text-primary-default font-semibold' : 'text-grey-1 group-hover:text-grey-0')}>
                    {title}
                </span>
            )}
        </button>
    )

    if (isCollapsed && !isMobile) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="bg-grey-0 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg">
                    {title}
                </TooltipContent>
            </Tooltip>
        )
    }

    return button
}