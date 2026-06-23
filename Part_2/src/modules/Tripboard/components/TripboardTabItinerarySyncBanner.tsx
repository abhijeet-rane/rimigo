import { motion } from 'framer-motion'
import { Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TripboardTabItinerarySyncBannerVariant = 'stays' | 'activities'

export interface TripboardTabItinerarySyncBannerProps {
    variant: TripboardTabItinerarySyncBannerVariant
    visible: boolean
    isPending: boolean
    onSync: () => void
    className?: string
}

const copy: Record<
    TripboardTabItinerarySyncBannerVariant,
    { title: string; subtitle: string; cta: string }
> = {
    stays: {
        title: 'Itinerary updated , Refresh your tripboard',
        subtitle: 'Match this list with hotels and dates from your trip itinerary.',
        cta: 'Sync'
    },
    activities: {
        title: 'Itinerary updated , Refresh your tripboard',
        subtitle: 'Pull experiences from your itinerary into this tab.',
        cta: 'Sync'
    }
}

const syncButtonClassName = cn(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl',
    'font-red-hat-display font-semibold text-white transition-colors',
    'bg-gradient-to-r from-[var(--primary-indigo,#7011F6)] to-[var(--primary-dark,#4D1D91)]',
    'hover:opacity-[0.94] disabled:cursor-not-allowed disabled:opacity-55',
    'shadow-sm'
)

/**
 * Inline CTA when the tripboard is stale vs. the linked itinerary (same signal as the header sync control).
 */
const TripboardTabItinerarySyncBanner: React.FC<TripboardTabItinerarySyncBannerProps> = ({
    variant,
    visible,
    isPending,
    onSync,
    className
}) => {
    if (!visible) return null

    const { title, subtitle, cta } = copy[variant]

    return (
        <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
            className={cn(
                'rounded-xl border border-primary-default/20 bg-gradient-to-r from-[rgba(112,17,246,0.06)] via-white to-[rgba(99,102,241,0.05)]',
                'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(112,17,246,0.06)]',
                className
            )}
            role="status"
            aria-live="polite">
            {/*
              Mobile (<sm): CSS grid — [icon] [title] [Sync] on one row, vertically centered.
              Desktop (sm+): unchanged — flex row with (icon + text block) | button.
            */}
            <div
                className={cn(
                    'p-3.5 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4',
                    'max-sm:grid max-sm:grid-cols-[auto_minmax(0,1fr)_auto] max-sm:items-center max-sm:gap-x-2'
                )}>
                <div className="contents sm:flex sm:min-w-0 sm:flex-1 sm:flex-row sm:items-start sm:gap-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-default/15 bg-white">
                        <RefreshCw
                            className={cn('h-4 w-4 text-primary-default', isPending && 'opacity-40')}
                            aria-hidden
                        />
                        {!isPending && (
                            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
                        )}
                    </div>
                    <div className="min-w-0 text-left sm:flex-1 sm:pt-0.5">
                        <p className="font-red-hat-display text-[13px] font-semibold leading-snug text-grey-0 sm:text-[14px]">
                            {title}
                        </p>
                        <p className="mt-0.5 hidden font-manrope text-[12px] font-semibold leading-relaxed text-grey-2 md:block">
                            {subtitle}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onSync}
                    disabled={isPending}
                    className={cn(
                        syncButtonClassName,
                        'gap-1.5 px-3 py-2 text-[12px] sm:gap-2 sm:px-5 sm:py-2.5 sm:text-[13px]'
                    )}>
                    {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin sm:h-4 sm:w-4" aria-hidden />
                    ) : (
                        <RefreshCw className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                    )}
                    <span className="whitespace-nowrap">{isPending ? 'Syncing…' : cta}</span>
                </button>
            </div>
        </motion.div>
    )
}

export default TripboardTabItinerarySyncBanner
