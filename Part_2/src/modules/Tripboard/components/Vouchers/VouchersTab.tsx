/**
 * VouchersTab — root component for the Vouchers tab inside Tripboard.
 *
 * Layout (mirrors Itinerary / Stays / Activities visual language):
 *   ┌─────────────────────────────────────────────┐
 *   │ Booking vouchers                [Add more] │  ← header
 *   │ N vouchers · sorted chronologically         │
 *   ├─────────────────────────────────────────────┤
 *   │ ◄ [Unsched 1] [16 Aug 2] [17 Aug 3] ... ►  │  ← sticky day-strip
 *   ├─────────────────────────────────────────────┤
 *   │ [voucher card] [voucher card] …             │  ← only the
 *   │                                             │     selected
 *   │                                             │     day
 *   └─────────────────────────────────────────────┘
 *
 * The day-strip pills mirror the Itinerary `MobileItineraryView` design:
 * `bg-grey-0 text-white` active, white-bordered inactive, horizontal scroll.
 * Date label ("16 Aug") is used instead of "Day N" since vouchers are
 * keyed off real timestamps, not itinerary positions.
 *
 * Live status is driven by `useMultiVoucherSSE` subscribing to every
 * pending voucher's `/stream/` endpoint. When a voucher terminates we
 * invalidate the list query so the next render uses the canonical DB row.
 */
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import { useTripVouchers, TRIP_VOUCHERS_QUERY_KEY } from '@/hooks/useTripVouchers'
import {
    useMultiVoucherSSE,
    mergeVoucherWithStream,
} from '@/hooks/useMultiVoucherSSE'
import type { Voucher } from '@/api/voucherAPI/voucherAPI'
import { cn } from '@/lib/utils'

import VoucherUploader from './VoucherUploader'
import VoucherCard from './VoucherCard'
import { isTempVoucherId } from './voucherUtils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'

interface VouchersTabProps {
    tripId: string
    isActive: boolean
    /** Whether the current viewer can upload vouchers. False for read-only
     *  / shared-link viewers — the tab is hidden entirely in TripboardPage
     *  for that case, but this flag is a belt-and-suspenders guard for the
     *  upload affordances if the tab ever does render for a read-only user. */
    canEdit?: boolean
}

const UNSCHEDULED_KEY = 'unscheduled'

export default function VouchersTab({ tripId, isActive, canEdit = true }: VouchersTabProps) {
    const queryClient = useQueryClient()
    const { trackButtonClickCustom } = usePostHog()
    const { vouchers: serverVouchers, isLoading } = useTripVouchers(tripId, isActive)

    // SSE-watch every voucher still extracting; tear down on terminal.
    // Skip optimistic temp rows — they don't exist server-side yet, so a
    // subscription would 404. They'll be replaced by canonical rows once
    // their bulk-create call returns.
    const pendingIds = useMemo(
        () =>
            serverVouchers
                .filter(
                    (v) =>
                        (v.status === 'queued' || v.status === 'processing')
                        && !isTempVoucherId(v.voucher_id),
                )
                .map((v) => v.voucher_id),
        [serverVouchers],
    )

    const liveByVoucher = useMultiVoucherSSE(pendingIds, () => {
        queryClient.invalidateQueries({
            queryKey: TRIP_VOUCHERS_QUERY_KEY(tripId),
        })
    })

    // Merge SSE snapshots into rows so cards flip immediately rather than
    // waiting for the refetch race.
    const vouchers = useMemo(
        () =>
            serverVouchers.map((v) =>
                mergeVoucherWithStream(v, liveByVoucher[v.voucher_id]),
            ),
        [serverVouchers, liveByVoucher],
    )

    const groups = useMemo(() => groupByDay(vouchers), [vouchers])

    // Selected day pill. Default to the first dated group when available
    // (the most useful "what's coming up" view); falls back to Unscheduled
    // when there are only pending vouchers. Sticky across renders so
    // background extraction doesn't shift the user's selection.
    const [selectedKey, setSelectedKey] = useState<string | null>(null)
    useEffect(() => {
        if (groups.length === 0) {
            setSelectedKey(null)
            return
        }
        // Keep the user's selection if still valid.
        if (selectedKey && groups.some((g) => g.key === selectedKey)) return

        // Prefer the first dated group; if none, fall back to Unscheduled.
        const firstDated = groups.find((g) => g.key !== UNSCHEDULED_KEY)
        setSelectedKey((firstDated ?? groups[0]).key)
    }, [groups, selectedKey])

    // Empty state — uploader only, no header / strip noise. Read-only
    // viewers (shared link) shouldn't see the uploader at all; the tab
    // should be hidden by TripboardPage in that case, but if it ever
    // renders here we fall back to a minimal "nothing to show" panel.
    if (!isLoading && vouchers.length === 0) {
        if (!canEdit) {
            return (
                <div className="mx-auto w-full max-w-[820px] py-10 px-4 text-center text-[13px] font-manrope text-grey-2">
                    No vouchers on this trip.
                </div>
            )
        }
        return (
            <div className="mx-auto w-full max-w-[820px] py-10 px-4">
                <VoucherUploader tripId={tripId} variant="empty-state" />
            </div>
        )
    }

    const selectedGroup = groups.find((g) => g.key === selectedKey) ?? groups[0]
    const showDayStrip = groups.length > 1

    return (
        <div className="mx-auto w-full max-w-[820px] px-2 sm:px-3 pt-1 sm:pt-3 pb-6">
            {/* Header */}
            <div className="px-1 sm:px-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-[18px] sm:text-[20px] font-red-hat-display font-[600] text-grey-0">
                            Booking vouchers
                        </h2>
                        <p className="text-[12px] sm:text-[13px] text-grey-2 font-manrope mt-0.5">
                            {vouchers.length}
                            {vouchers.length === 1 ? ' voucher' : ' vouchers'}
                            <span className="text-grey-3"> · </span>
                            Details extracted with AI — may make mistakes
                        </p>
                    </div>
                    {/* Desktop / tablet: inline pill in the header.
                        Mobile gets the floating action button instead — see
                        the `fab` render at the bottom of this component.
                        Hidden entirely for read-only viewers. */}
                    {canEdit && (
                        <div className="hidden sm:block">
                            <VoucherUploader tripId={tripId} variant="compact" />
                        </div>
                    )}
                </div>
                {/* Divider — separates the section header from the day strip
                    and content below. */}
                <div className="border-t border-grey-4 mt-3 sm:mt-4" />
            </div>

            {/* Day-strip — sticks to the top of the scroll area like the
                Itinerary day-tabs do. Hidden when there's only one group. */}
            {showDayStrip && (
                <div className="sticky top-0 z-10 -mx-2 sm:-mx-3 px-2 sm:px-3 py-2 mb-3 bg-natural-white border-b border-grey-4">
                    <div className="overflow-x-auto scrollbar-hide">
                        <div className="flex items-center gap-2 w-max">
                            {groups.map((group) => (
                                <DayPill
                                    key={group.key}
                                    group={group}
                                    isActive={group.key === selectedGroup?.key}
                                    onClick={() => {
                                        trackButtonClickCustom({
                                            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                            buttonName: 'vouchers_tab_day_pill_click',
                                            buttonAction: 'click',
                                            extra: { trip_id: tripId, day_key: group.key, count: group.vouchers.length },
                                        })
                                        setSelectedKey(group.key)
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Selected day's vouchers */}
            {isLoading && vouchers.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-5 h-5 animate-spin text-grey-2" />
                </div>
            ) : selectedGroup ? (
                <div className="flex flex-col gap-2.5">
                    {selectedGroup.vouchers.map((v) => (
                        <VoucherCard key={v.voucher_id} voucher={v} />
                    ))}
                </div>
            ) : null}

            {/* Mobile floating action button — thumb-reachable add-vouchers
                CTA. The compact header button is hidden on mobile, so this
                is the only way to add more there. Hidden for read-only
                viewers (no upload affordance at all). */}
            {canEdit && (
                <div className="sm:hidden">
                    <VoucherUploader tripId={tripId} variant="fab" />
                </div>
            )}
        </div>
    )
}

// ────────────────────────── day-strip pill ──────────────────────────

interface DayPillProps {
    group: DayGroupT
    isActive: boolean
    onClick: () => void
}

function DayPill({ group, isActive, onClick }: DayPillProps) {
    const isUnscheduled = group.key === UNSCHEDULED_KEY
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold font-manrope transition-colors',
                isActive
                    ? 'bg-grey-0 text-white'
                    : 'bg-natural-white text-grey-0 border border-grey-4 hover:bg-grey-5',
                isUnscheduled && !isActive && 'text-grey-1',
            )}
        >
            <span>{group.shortLabel}</span>
            <span
                className={cn(
                    'inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-semibold tabular-nums',
                    isActive ? 'bg-white/20 text-white' : 'bg-grey-5 text-grey-1',
                )}
            >
                {group.vouchers.length}
            </span>
        </button>
    )
}

// ────────────────────────── grouping helpers ──────────────────────────

interface DayGroupT {
    key: string
    /** Full label for headings — "Wednesday, 16 Aug". */
    label: string
    /** Compact label for the day-strip pill — "16 Aug" / "Unscheduled". */
    shortLabel: string
    /** Order key — 0 for unscheduled so it sorts to the top, else day ms. */
    sortOrder: number
    vouchers: Voucher[]
}

function groupByDay(vouchers: Voucher[]): DayGroupT[] {
    const buckets = new Map<string, DayGroupT>()

    for (const v of vouchers) {
        const start = v.status === 'extracted' ? v.extracted?.start_datetime : null
        const dayKey = start ? toDayKey(start) : UNSCHEDULED_KEY

        const existing = buckets.get(dayKey)
        if (existing) {
            existing.vouchers.push(v)
            continue
        }

        if (dayKey === UNSCHEDULED_KEY) {
            buckets.set(dayKey, {
                key: UNSCHEDULED_KEY,
                label: 'Unscheduled',
                shortLabel: 'Unscheduled',
                sortOrder: 0,
                vouchers: [v],
            })
        } else {
            const d = new Date(start as string)
            buckets.set(dayKey, {
                key: dayKey,
                label: d.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'short',
                }),
                shortLabel: d.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                }),
                sortOrder: d.getTime(),
                vouchers: [v],
            })
        }
    }

    // Within each group: chronological by start_datetime; pending rows last.
    for (const group of buckets.values()) {
        group.vouchers.sort((a, b) => {
            const aStart = a.extracted?.start_datetime
            const bStart = b.extracted?.start_datetime
            if (aStart && bStart) return aStart.localeCompare(bStart)
            if (aStart) return -1
            if (bStart) return 1
            return a.created_at.localeCompare(b.created_at)
        })
    }

    return [...buckets.values()].sort((a, b) => a.sortOrder - b.sortOrder)
}

function toDayKey(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return UNSCHEDULED_KEY
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}
