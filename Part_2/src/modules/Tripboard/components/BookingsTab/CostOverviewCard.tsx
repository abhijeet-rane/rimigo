import React, { useEffect, useRef, useState } from 'react'
import { RefreshCw, Plane, BedSingle, FerrisWheel, Info, User } from 'lucide-react'
import type { TripBudget } from '../../api/budgetApi'
import type { CategoryBreakdown } from './bookingsUtils'
import { formatCurrency } from './bookingsUtils'
import CustomShimmer from '@/components/shared/Shimmer'

interface CostOverviewCardProps {
    budget: TripBudget
    breakdown: Record<string, CategoryBreakdown>
    totalBookings: number
    onRecalculate?: () => Promise<void>
    isRecalculating?: boolean
    /** Public collections exclude flights (and stays when the itinerary has
     *  none) from the total — drives the "(excluding …)" qualifier. */
    isPublic?: boolean
}

/** Budget summary card (Figma: "TOTAL BUDGET (PER HEAD)"). Shows the
 *  selected/cheapest per-head total, per-category count chips, freshness
 *  stamp and the Refresh link. */
export const CostOverviewCard: React.FC<CostOverviewCardProps> = ({ budget, breakdown, onRecalculate, isRecalculating = false, isPublic = false }) => {
    // Raw server status drives the Refresh affordance directly; the
    // timeout-guarded `isRecalculating` prop gates the louder shimmer so it
    // stops blinking if the backend gets stuck.
    const isRawRecalculating = budget.calculation_status === 'in_progress'
    const isFullRecalc = isRecalculating && budget.recalculation_trigger?.type === 'full_recalculate'

    // "Prices vary" info bubble: hover on desktop, tap-to-toggle on mobile
    // (Radix tooltips don't open reliably on touch). Closes on outside
    // tap / Escape.
    const [pricesTipOpen, setPricesTipOpen] = useState(false)
    const pricesTipRef = useRef<HTMLSpanElement>(null)
    useEffect(() => {
        if (!pricesTipOpen) return
        const onPointerDown = (e: Event) => {
            if (pricesTipRef.current && !pricesTipRef.current.contains(e.target as Node)) setPricesTipOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPricesTipOpen(false)
        }
        document.addEventListener('mousedown', onPointerDown)
        document.addEventListener('touchstart', onPointerDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onPointerDown)
            document.removeEventListener('touchstart', onPointerDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [pricesTipOpen])

    const lastUpdated = budget.calculated_at
        ? (() => {
              const d = new Date(budget.calculated_at)
              const diffMins = Math.floor((Date.now() - d.getTime()) / 60000)
              if (diffMins < 1) return 'updated just now'
              if (diffMins < 60) return `updated ${diffMins}m ago`
              const diffHrs = Math.floor(diffMins / 60)
              if (diffHrs < 24) return `updated ${diffHrs}h ago`
              return `updated ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
          })()
        : null

    // Per-person total — selected/cheapest values (breakdown mins).
    const ppTotal = Object.values(breakdown).reduce((s, c) => s + c.min, 0)

    // "Prices vary" copy — accurate per category: flights & stays move almost
    // daily, tours every ~10-12 days. Flights are mentioned only when present
    // (public collections exclude flights, so budget.flights is empty there).
    const hasFlights = (budget.flights?.length ?? 0) > 0
    const pricesVaryText = hasFlights
        ? 'Flight and stay prices can change almost daily, and tour prices every 10-12 days. Book as soon as you see a good price.'
        : 'Stay prices can change almost daily, and tour prices every 10-12 days. Book as soon as you see a good price.'

    // Public collections exclude flights from the total — and stays too when the
    // itinerary has none. Shown as a small qualifier beside the headline.
    const hasStays = (budget.stays?.length ?? 0) > 0
    const excludingText = isPublic ? (hasStays ? '(excluding flights)' : '(excluding flights & stays)') : null

    const counts = [
        { icon: Plane, count: budget.flights?.length || 0, label: 'flights' },
        { icon: BedSingle, count: budget.stays?.length || 0, label: 'stays' },
        { icon: FerrisWheel, count: budget.days?.reduce((sum: number, d: { items: unknown[] }) => sum + d.items.length, 0) || 0, label: 'activities' }
    ]

    return (
        <div className="bg-white p-5 flex flex-col gap-2 md:rounded-2xl md:shadow-[0px_2px_4px_rgba(13,12,13,0.16)] max-md:border-b max-md:border-border-subtle">
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1 text-grey-1">
                        <p className="font-red-hat-display text-[12px] font-bold tracking-[-0.24px] leading-4 uppercase">Total Budget (per</p>
                        <span className="flex items-center">
                            <User className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-red-hat-display text-[12px] font-bold tracking-[-0.24px] leading-4 uppercase">)</span>
                        </span>
                    </span>
                    {excludingText && (
                        <span className="font-manrope text-[12px] font-semibold leading-4 text-grey-3">{excludingText}</span>
                    )}
                </div>
                {/* Freshness stamp + "Prices vary" with an info bubble — stay
                    and tour prices drift, so the headline is indicative. Hover
                    on desktop, tap the text or the ⓘ to toggle on mobile. */}
                <span
                    ref={pricesTipRef}
                    className="relative flex items-center gap-1 shrink-0"
                    onMouseEnter={() => setPricesTipOpen(true)}
                    onMouseLeave={() => setPricesTipOpen(false)}>
                    <button
                        type="button"
                        aria-label="Why prices vary"
                        aria-expanded={pricesTipOpen}
                        onClick={() => setPricesTipOpen((open) => !open)}
                        className="flex items-center gap-1 text-grey-3 hover:text-grey-1 transition-colors cursor-pointer">
                        <span className="font-manrope text-[12px] font-semibold leading-4">
                            {lastUpdated ? `${lastUpdated} · Prices vary` : 'Prices vary'}
                        </span>
                        <Info className="w-3.5 h-3.5 shrink-0" />
                    </button>
                    {pricesTipOpen && (
                        <div
                            role="tooltip"
                            className="absolute right-0 top-full z-50 mt-2 w-[240px] rounded-[16px] bg-grey-0 px-3.5 py-2.5 font-manrope text-[12px] font-medium leading-snug text-white shadow-[0px_4px_16px_rgba(13,12,13,0.24)]">
                            {/* up-pointing arrow under the ⓘ */}
                            <span className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 rounded-[2px] bg-grey-0" />
                            <span className="relative">{pricesVaryText}</span>
                        </div>
                    )}
                </span>
            </div>

            <div className="mt-3">
                {isFullRecalc ? (
                    <CustomShimmer
                        height={40}
                        radius={6}
                        className="w-44"
                    />
                ) : (
                    <p className="font-red-hat-display text-[32px] font-semibold tracking-[-0.64px] leading-10 text-grey-0">{formatCurrency(ppTotal)}</p>
                )}
            </div>

            <div className="flex items-end justify-between gap-3">
                <div className="flex items-center gap-3">
                    {counts.map(({ icon: Icon, count, label }) => (
                        <span
                            key={label}
                            title={`${count} ${label}`}
                            className="flex items-center gap-0.5 rounded bg-surface-sunken p-1">
                            <Icon className="w-4 h-4 text-grey-0" />
                            <span className="font-red-hat-display text-[14px] font-semibold tracking-[-0.28px] leading-[18px] text-grey-0">
                                {count}
                            </span>
                        </span>
                    ))}
                </div>
                {onRecalculate && (
                    <button
                        onClick={() => !isRawRecalculating && onRecalculate()}
                        disabled={isRawRecalculating}
                        title={isRawRecalculating ? 'Updating prices...' : 'Refresh budget with the latest prices'}
                        className="flex items-center gap-1.5 font-red-hat-display text-[12px] font-bold tracking-[-0.24px] leading-4 text-primary-default cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 hover:underline underline-offset-2 shrink-0">
                        <RefreshCw className={`w-3.5 h-3.5 ${isRawRecalculating ? 'animate-spin' : ''}`} />
                        {isRawRecalculating ? 'Refreshing…' : 'Refresh'}
                    </button>
                )}
            </div>
        </div>
    )
}
