import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { formatKanbanTimeLabel } from './kanbanPlacementUtils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

export type ChooseStartTimeSurface = 'kanban_desktop' | 'map_sidebar' | 'mobile_list'

type ChooseStartTimeStripProps = {
    anchorUtcMs: number
    durationMs: number
    targetDayDate: Date
    onPick: (startUtcMs: number) => void
    onCustom: () => void
    onDismiss: () => void
    /** Where the strip is shown (for PostHog funnels) */
    analyticsSurface?: ChooseStartTimeSurface
}

/** Post-drop: choose start time (shared by Kanban and Map sidebar) */
export const ChooseStartTimeStrip = ({
    anchorUtcMs,
    durationMs,
    targetDayDate,
    onPick,
    onCustom,
    onDismiss,
    analyticsSurface = 'kanban_desktop'
}: ChooseStartTimeStripProps) => {
    const { trackButtonClickCustom } = usePostHog()

    const dayY = targetDayDate.getUTCFullYear()
    const dayM = targetDayDate.getUTCMonth()
    const dayD = targetDayDate.getUTCDate()
    const dayStart = Date.UTC(dayY, dayM, dayD, 0, 0, 0, 0)
    const dayEnd = Date.UTC(dayY, dayM, dayD + 1, 0, 0, 0, 0)

    const clampToDay = (ms: number) => {
        const endLimit = dayEnd - durationMs - 60 * 1000
        if (ms < dayStart) return dayStart
        if (ms > endLimit) return Math.max(dayStart, endLimit)
        return ms
    }

    const timeChoices = useMemo(() => {
        const beforeMs = clampToDay(anchorUtcMs - 30 * 60 * 1000)
        const currentMs = clampToDay(anchorUtcMs)
        const afterMs = clampToDay(anchorUtcMs + 30 * 60 * 1000)
        return [
            { key: 'before' as const, ms: beforeMs, label: formatKanbanTimeLabel(new Date(beforeMs).toISOString()) },
            { key: 'current' as const, ms: currentMs, label: formatKanbanTimeLabel(new Date(currentMs).toISOString()) },
            { key: 'after' as const, ms: afterMs, label: formatKanbanTimeLabel(new Date(afterMs).toISOString()) }
        ]
    }, [anchorUtcMs, durationMs, dayStart, dayEnd])

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="origin-top overflow-hidden">
            <div className="rounded-b-xl border-b border-l border-r border-grey-4 bg-[#e8e8ea] px-3 pb-3 pt-2.5">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="font-manrope text-[10px] font-semibold uppercase tracking-[0.14em] text-grey-1">
                        Choose start time
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            trackButtonClickCustom({
                                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_PLACEMENT_CANCEL_CLICK,
                                buttonAction: POSTHOG_ACTIONS.CLICK,
                                extra: { surface: analyticsSurface }
                            })
                            onDismiss()
                        }}
                        className="cursor-pointer font-manrope text-[11px] font-medium text-grey-3 hover:text-grey-0">
                        Cancel
                    </button>
                </div>
                <div className="grid w-full min-w-0 grid-cols-4 gap-1">
                    {timeChoices.map((o) => (
                        <button
                            key={o.key}
                            type="button"
                            onClick={() => {
                                trackButtonClickCustom({
                                    buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                    buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_PLACEMENT_TIME_PRESET_PICK,
                                    buttonAction: POSTHOG_ACTIONS.CLICK,
                                    extra: { preset: o.key, surface: analyticsSurface }
                                })
                                onPick(o.ms)
                            }}
                            className={
                                o.key === 'current'
                                    ? 'min-w-0 cursor-pointer rounded-lg bg-grey-0 px-1 py-1.5 text-center font-manrope text-[11px] font-semibold leading-tight text-white shadow-sm transition-transform active:scale-[0.98] sm:text-[12px]'
                                    : 'min-w-0 cursor-pointer rounded-lg px-1 py-1.5 text-center font-manrope text-[11px] font-semibold leading-tight text-grey-0 transition-colors hover:bg-white/70 sm:text-[12px]'
                            }>
                            {o.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => {
                            trackButtonClickCustom({
                                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                                buttonName: POSTHOG_EVENTS.ITINERARY_KANBAN_PLACEMENT_CUSTOM_TIME_CLICK,
                                buttonAction: POSTHOG_ACTIONS.CLICK,
                                extra: { surface: analyticsSurface }
                            })
                            onCustom()
                        }}
                        className="min-w-0 cursor-pointer rounded-lg px-1 py-1.5 text-center font-manrope text-[11px] font-semibold leading-tight text-grey-0 transition-colors hover:bg-white/70 sm:text-[12px]">
                        Custom
                    </button>
                </div>
            </div>
        </motion.div>
    )
}
