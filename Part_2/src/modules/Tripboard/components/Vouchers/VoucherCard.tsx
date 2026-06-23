/**
 * VoucherCard — compact horizontal row that mirrors the Itinerary slot
 * cards (`TransportEventContent`, `RestaurantEvent` stay variant, etc.)
 * so vouchers feel native to the tripboard. Outer shell is constant —
 * file-preview tile on the left, content + actions on the right — but
 * the content column renders category-specific blocks so each kind of
 * voucher surfaces the fields a traveler actually wants to scan:
 *
 *   Flight   → IATA route (DEL → GOI · 3h 25m) + departure time
 *   Hotel    → date range + nights + room type
 *   Activity → duration + language + meeting point
 *   Transfer → pickup → dropoff + vehicle + driver
 *   Visa     → validity dates + entries + visa type
 *   Other    → generic provider · location
 *
 * Colors mirror Itinerary's BaseEventLayout convention: transport = sky
 * blue (flight + transfer), hotel = emerald, activity = orange, visa =
 * rose, other = grey.
 */
import { useState } from 'react'
import {
    Plane,
    Hotel,
    MapPin,
    FileText,
    AlertCircle,
    Loader2,
    Navigation,
    Trash2,
    ArrowUpRight,
    ArrowRight,
    StickyNote,
    Wallet,
    Mail,
    Plug,
    Copy,
    Check,
    Eye,
    Clock,
    Car,
    Coffee,
    Calendar,
    Users,
    Link2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import {
    deleteVoucher,
    type Voucher,
    type VoucherCategory,
    type VoucherCategoryData,
    type VoucherExtracted,
} from '@/api/voucherAPI/voucherAPI'
import { TRIP_VOUCHERS_QUERY_KEY } from '@/hooks/useTripVouchers'
import { isTempVoucherId } from './voucherUtils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'

// Generic translation of an HTTP/axios error into short user copy. Lives
// inline so vouchers don't grow a separate errors module.
function toFriendlyError(err: unknown, fallback: string): string {
    const status = (err as { response?: { status?: number } })?.response?.status
    const message = (err as { message?: string })?.message ?? ''
    if (status === 401 || status === 403) return 'Your session expired — please sign in again.'
    if (status && status >= 500) return "We're having trouble on our side. Please try again in a minute."
    if (/network|timeout|ECONNABORTED|ENOTFOUND/i.test(message)) return 'Network hiccup — check your connection and retry.'
    return fallback
}

// `error_reason` is whatever the backend extractor wrote — often a raw
// provider response (Gemini 429 JSON, axios message, stack trace). Show
// it only if it looks like plain prose; otherwise fall back to a generic
// line. Truncate anything overly long.
function displayExtractionError(rawReason: string | null | undefined): string {
    const reason = (rawReason ?? '').trim()
    if (!reason) return "Couldn't extract details — open the file to view it."
    const looksRaw = /^[\{\[]|^\s*at\s|Traceback|Request failed|^\d{3}\s|RESOURCE_EXHAUSTED|"code"\s*:/i.test(reason)
    if (looksRaw) return "We couldn't read this voucher. Please try again later or re-upload."
    return reason.length <= 140 ? reason : reason.slice(0, 137).trimEnd() + '…'
}

// ────────────────────── category visuals ──────────────────────

const CATEGORY_VISUALS: Record<
    VoucherCategory | 'pending',
    { icon: typeof Plane; bg: string; fg: string; label: string }
> = {
    flight: { icon: Plane, bg: 'bg-sky-50', fg: 'text-sky-700', label: 'Flight' },
    hotel: { icon: Hotel, bg: 'bg-emerald-50', fg: 'text-emerald-700', label: 'Hotel' },
    activity: { icon: MapPin, bg: 'bg-orange-50', fg: 'text-orange-700', label: 'Activity' },
    transfer: { icon: Car, bg: 'bg-sky-50', fg: 'text-sky-700', label: 'Transfer' },
    visa: { icon: StickyNote, bg: 'bg-rose-50', fg: 'text-rose-700', label: 'Visa' },
    other: { icon: FileText, bg: 'bg-grey-5', fg: 'text-grey-1', label: 'Voucher' },
    pending: { icon: FileText, bg: 'bg-grey-5', fg: 'text-grey-2', label: 'Processing' },
}

/** Categories where time-of-day actually drives a decision. */
const TIME_RELEVANT_CATEGORIES = new Set<VoucherCategory>([
    'flight',
    'activity',
    'transfer',
])

// ────────────────────── formatting helpers ──────────────────────

function formatTime(iso?: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Compact human-readable "when". Tuned for the on-trip scanning use case:
 *   future:  "Today" / "Tomorrow" / "In 4 days" / "In 3 weeks" / "16 Aug"
 *   past:    "Yesterday" / "4 days ago" / "16 Aug"
 *
 * Returns "" when the date is unparseable so the chip is omitted cleanly.
 */
function formatRelativeWhen(iso?: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const now = new Date()
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate())
    const diffDays = Math.round(
        (startOfDay(d).getTime() - startOfDay(now).getTime()) / (24 * 60 * 60 * 1000),
    )
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays > 0 && diffDays < 21) return `In ${diffDays} days`
    if (diffDays >= 21 && diffDays < 90) return `In ${Math.round(diffDays / 7)} weeks`
    if (diffDays < 0 && diffDays > -21) return `${-diffDays} days ago`
    if (diffDays < 0 && diffDays >= -90) return `${Math.round(-diffDays / 7)} weeks ago`
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function formatShortDate(iso?: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function formatDuration(minutes?: number | null): string {
    if (!minutes || minutes <= 0) return ''
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
}

function deriveDurationMinutes(
    start?: string | null,
    end?: string | null,
): number | null {
    if (!start || !end) return null
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return null
    return Math.round((e - s) / 60000)
}

function deriveNights(start?: string | null, end?: string | null): number | null {
    if (!start || !end) return null
    const s = new Date(start)
    const e = new Date(end)
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null
    const ms = e.getTime() - s.getTime()
    if (ms <= 0) return null
    return Math.round(ms / (1000 * 60 * 60 * 24))
}

function directionsUrl(
    location?: VoucherExtracted['location'],
    fallbackQuery?: string | null,
): string | null {
    if (location?.lat != null && location?.lng != null) {
        return `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`
    }
    const q = location?.address || location?.name || fallbackQuery
    if (!q) return null
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`
}

// ────────────────────── component ──────────────────────

interface VoucherCardProps {
    voucher: Voucher
}

export default function VoucherCard({ voucher }: VoucherCardProps) {
    const queryClient = useQueryClient()
    const { trackButtonClickCustom } = usePostHog()

    const isPending = voucher.status === 'queued' || voucher.status === 'processing'
    const isFailed = voucher.status === 'failed'
    const isExtracted = voucher.status === 'extracted'

    const visual = isExtracted
        ? CATEGORY_VISUALS[voucher.category ?? 'other']
        : CATEGORY_VISUALS.pending
    const CategoryIcon = visual.icon

    const extracted = voucher.extracted || {}
    const title = extracted.title || voucher.filename || `Voucher · ${voucher.voucher_id.slice(-6)}`
    const startTime =
        voucher.category && TIME_RELEVANT_CATEGORIES.has(voucher.category)
            ? formatTime(extracted.start_datetime)
            : ''
    const relativeWhen = isExtracted ? formatRelativeWhen(extracted.start_datetime) : ''
    const advisory = isExtracted ? extracted.advisory : null

    const handleDelete = async () => {
        trackButtonClickCustom({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'voucher_card_delete_click',
            buttonAction: 'click',
            extra: { trip_id: voucher.trip_id, voucher_id: voucher.voucher_id, status: voucher.status },
        })
        if (isTempVoucherId(voucher.voucher_id)) {
            queryClient.setQueryData<Voucher[]>(
                TRIP_VOUCHERS_QUERY_KEY(voucher.trip_id),
                (old) => (old ?? []).filter((v) => v.voucher_id !== voucher.voucher_id),
            )
            return
        }
        if (!confirm('Remove this voucher? The original file is kept.')) return
        try {
            await deleteVoucher(voucher.voucher_id)
            queryClient.invalidateQueries({
                queryKey: TRIP_VOUCHERS_QUERY_KEY(voucher.trip_id),
            })
            toast.success('Voucher removed')
        } catch (err) {
            toast.error(toFriendlyError(err, "Couldn't remove this voucher. Please try again."))
        }
    }

    const chips: ChipSpec[] = isExtracted ? buildChips(voucher) : []
    const actions: ActionSpec[] = isExtracted ? buildActions(voucher) : []
    const detailGrid: DetailSpec[] | null = isExtracted ? buildDetailGrid(voucher) : null

    const provider = isExtracted ? extracted.provider : null

    const canDelete = isExtracted || isFailed
    const showFooter = actions.length > 0

    return (
        <div
            className={cn(
                'group relative flex flex-col p-3.5 rounded-xl bg-natural-white ring-1 transition-shadow hover:shadow-sm',
                isFailed ? 'ring-rose-200' : 'ring-grey-4/80',
            )}
        >
            {/* Upper section — content column on the left, thumbnail + delete
                stacked vertically on the right. Putting delete under the
                thumb means the footer separator below can span the full
                card width without the delete icon orphaning it. */}
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 flex flex-col">
                    {/* Top row — relative-time label + category badge for
                        extracted, status pill for pending / failed. */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        {isExtracted && relativeWhen && (
                            <span className="text-[10px] font-bold uppercase tracking-wider font-manrope text-grey-2 tabular-nums">
                                {relativeWhen}
                            </span>
                        )}
                        {isPending && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-grey-5 text-grey-1 text-[10px] font-bold uppercase tracking-wider font-manrope">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                {voucher.status === 'queued' ? 'Queued' : 'Reading'}
                            </span>
                        )}
                        {isFailed && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold uppercase tracking-wider font-manrope">
                                <AlertCircle className="w-2.5 h-2.5" />
                                Failed
                            </span>
                        )}
                        {isExtracted && (
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-manrope',
                                    visual.bg,
                                    visual.fg,
                                )}
                            >
                                <CategoryIcon className="w-2.5 h-2.5" />
                                {visual.label}
                            </span>
                        )}
                        {/* Itinerary-sync pill — appears when the voucher has
                            been attached to a slot via `attach_voucher_to_slot`.
                            Tells the traveler "this is already linked to your
                            plan." */}
                        {isExtracted && voucher.synced_slot && (
                            <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary-default/[0.08] text-primary-default text-[10px] font-bold uppercase tracking-wider font-manrope"
                                title={
                                    voucher.synced_slot.slot_title
                                        ? `Synced to Day ${voucher.synced_slot.day} · ${voucher.synced_slot.slot_title}`
                                        : `Synced to Day ${voucher.synced_slot.day}`
                                }
                            >
                                <Link2 className="w-2.5 h-2.5" />
                                Day {voucher.synced_slot.day}
                            </span>
                        )}
                        {/* Time still rendered here only for categories without
                            a detail grid (transfer) — flight/hotel/activity
                            surface time inside their detail boxes. */}
                        {isExtracted && startTime && !detailGrid && (
                            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-manrope text-grey-2 tabular-nums">
                                <Clock className="w-3 h-3" />
                                {startTime}
                            </span>
                        )}
                    </div>

                    {/* Title — full width, bold, no inline icon prefix */}
                    <h3
                        className="text-[15px] font-red-hat-display font-bold text-grey-0 leading-[20px] mt-1.5 line-clamp-2"
                        title={title}
                    >
                        {isPending && !voucher.filename ? (
                            <span className="inline-block h-4 w-2/3 rounded bg-grey-5 animate-pulse align-middle" />
                        ) : (
                            title
                        )}
                    </h3>

                    {/* Provider — universal subline. */}
                    {provider && (
                        <p
                            className="text-[12px] font-manrope text-grey-1 mt-0.5 truncate"
                            title={provider}
                        >
                            {provider}
                        </p>
                    )}

                    {/* Pending filename. */}
                    {isPending && voucher.filename && (
                        <p
                            className="text-[11px] font-manrope text-grey-2 mt-1 truncate"
                            title={voucher.filename}
                        >
                            {voucher.filename}
                        </p>
                    )}

                    {/* Failed reason — sanitised so raw provider errors
                        (e.g. Gemini 429 quota JSON) never leak into the UI. */}
                    {isFailed && (
                        <p
                            className="text-[12px] font-manrope text-grey-1 mt-1 line-clamp-2"
                            title={displayExtractionError(voucher.error_reason)}
                        >
                            {displayExtractionError(voucher.error_reason)}
                        </p>
                    )}

                    {/* Category-specific meta block. */}
                    {isExtracted && <CategoryDetails voucher={voucher} />}

                    {/* Advisory pill — AI-generated tip. */}
                    {advisory && (
                        <div className="mt-2">
                            <span
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium font-manrope text-primary-default bg-primary-default/[0.06] max-w-full"
                                title={advisory}
                            >
                                <Plug className="w-3 h-3 shrink-0" />
                                <span className="line-clamp-2">{advisory}</span>
                            </span>
                        </div>
                    )}

                    {/* Segmented detail boxes. */}
                    {detailGrid && detailGrid.length > 0 && (
                        <div className="flex items-stretch gap-1.5 mt-2.5">
                            {detailGrid.map((d) => (
                                <DetailBox key={d.key} spec={d} />
                            ))}
                        </div>
                    )}

                    {/* Copy chips. */}
                    {chips.length > 0 && (
                        <div className="flex items-center flex-wrap gap-1 mt-2">
                            {chips.map((chip) => (
                                <CopyChip key={chip.key} chip={chip} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Right column — thumbnail + delete underneath. Delete sits
                    here so the footer below can dedicate itself to actions
                    (or stay hidden when there are none) and the separator
                    line spans the full card. */}
                <div className="shrink-0 flex flex-col items-center gap-2">
                    <FilePreview
                        fileUrl={voucher.file_url ?? null}
                        filename={voucher.filename ?? null}
                        mimeType={voucher.mime_type ?? null}
                    />
                    {canDelete && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="p-1.5 rounded-md text-grey-3 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            aria-label="Remove voucher"
                            title="Remove voucher"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Footer — actions row. Spans full card width via the parent
                column, so the border-top reads as a real divider. Hidden
                entirely when there are no actions; the card just ends after
                the chips row in that case. */}
            {showFooter && (
                <div className="flex items-center gap-0.5 mt-3 pt-2.5 border-t border-grey-4">
                    {actions.map((a) => (
                        <ActionLink
                            key={a.key}
                            href={a.href}
                            icon={a.icon}
                            label={a.label}
                            accent={a.accent}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// ────────────────────── category-specific content ──────────────────────

/** The 1–2 metadata lines that sit between the title row and the chip row.
 *  Each category surfaces what a traveler actually scans for, mirroring how
 *  Itinerary's BaseEventLayout renders kind-specific content. */
function CategoryDetails({ voucher }: { voucher: Voucher }) {
    const e = voucher.extracted || {}
    const cd: VoucherCategoryData = e.category_data || {}

    switch (voucher.category) {
        case 'flight':
            return <FlightDetails extracted={e} cd={cd} />
        case 'hotel':
            return <HotelDetails extracted={e} cd={cd} />
        case 'activity':
            return <ActivityDetails extracted={e} cd={cd} />
        case 'transfer':
            return <TransferDetails extracted={e} cd={cd} />
        case 'visa':
            return <VisaDetails extracted={e} cd={cd} />
        default:
            return <GenericDetails extracted={e} />
    }
}

interface DetailsProps {
    extracted: VoucherExtracted
    cd: VoucherCategoryData
}

function FlightDetails({ extracted, cd }: DetailsProps) {
    const fromCode = cd.departure_airport_code
    const toCode = cd.arrival_airport_code
    const fromCity = cd.departure_city
    const toCity = cd.arrival_city
    const duration = formatDuration(
        cd.duration_minutes ?? deriveDurationMinutes(extracted.start_datetime, extracted.end_datetime),
    )
    const departTime = formatTime(extracted.start_datetime)
    const arriveTime = formatTime(extracted.end_datetime)
    const hasRoute = !!(fromCode || fromCity) && !!(toCode || toCity)

    if (!hasRoute) return null
    return (
        <div className="mt-2 flex items-center gap-1.5 text-[12px] font-manrope text-grey-0">
            <RouteSegment code={fromCode} city={fromCity} time={departTime} />
            <ArrowRight className="w-3 h-3 text-grey-3 shrink-0" />
            <RouteSegment code={toCode} city={toCity} time={arriveTime} align="right" />
            {duration && (
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-grey-2 tabular-nums shrink-0">
                    <Clock className="w-3 h-3" />
                    {duration}
                </span>
            )}
        </div>
    )
}

function RouteSegment({
    code,
    city,
    time,
    align = 'left',
}: {
    code?: string | null
    city?: string | null
    time?: string
    align?: 'left' | 'right'
}) {
    if (!code && !city) return null
    return (
        <div className={cn('flex flex-col min-w-0', align === 'right' && 'items-end')}>
            <span className="font-semibold text-grey-0 truncate tabular-nums">
                {code || city}
            </span>
            {(city && code) || time ? (
                <span className="text-[10px] text-grey-2 font-manrope truncate">
                    {city && code ? city : ''}
                    {city && code && time ? ' · ' : ''}
                    {time}
                </span>
            ) : null}
        </div>
    )
}

function HotelDetails({ extracted, cd }: DetailsProps) {
    const roomType = cd.room_type
    const locationName = extracted.location?.name || extracted.location?.address
    const meta: React.ReactNode[] = []
    if (roomType) {
        meta.push(
            <span key="room" className="truncate">{roomType}</span>,
        )
    }
    if (cd.breakfast_included) {
        meta.push(
            <span key="brk" className="inline-flex items-center gap-0.5 text-emerald-700">
                <Coffee className="w-3 h-3" /> Breakfast
            </span>,
        )
    }

    return (
        <div className="mt-2 space-y-1">
            {meta.length > 0 && (
                <p className="text-[12px] font-manrope text-grey-1 flex items-center gap-2 flex-wrap truncate">
                    {meta}
                </p>
            )}
            {locationName && (
                <p
                    className="text-[12px] font-manrope text-grey-1 flex items-center gap-1.5 truncate"
                    title={locationName}
                >
                    <MapPin className="w-3 h-3 text-grey-3 shrink-0" />
                    {locationName}
                </p>
            )}
        </div>
    )
}

function ActivityDetails({ extracted, cd }: DetailsProps) {
    const meetingPoint = cd.meeting_point
    const locationName = extracted.location?.name || extracted.location?.address
    const ticketType = cd.ticket_type
    const guests = cd.guests

    return (
        <div className="mt-2 space-y-1">
            {(ticketType || guests != null) && (
                <p className="text-[12px] font-manrope text-grey-1 flex items-center gap-2 flex-wrap">
                    {ticketType && <span className="truncate">{ticketType}</span>}
                    {guests != null && (
                        <span className="inline-flex items-center gap-1">
                            <Users className="w-3 h-3 text-grey-3" />
                            {guests} {guests === 1 ? 'guest' : 'guests'}
                        </span>
                    )}
                </p>
            )}
            {(meetingPoint || locationName) && (
                <p
                    className="text-[12px] font-manrope text-grey-1 flex items-center gap-1.5 truncate"
                    title={meetingPoint || locationName || ''}
                >
                    <MapPin className="w-3 h-3 text-grey-3 shrink-0" />
                    {meetingPoint || locationName}
                </p>
            )}
        </div>
    )
}

function TransferDetails({ cd }: DetailsProps) {
    const pickup = cd.pickup_location
    const dropoff = cd.dropoff_location
    const vehicle = [cd.vehicle_type, cd.vehicle_number].filter(Boolean).join(' · ')

    return (
        <div className="mt-2 space-y-1">
            {(pickup || dropoff) && (
                <p
                    className="text-[12px] font-manrope text-grey-0 flex items-center gap-1.5 truncate"
                    title={`${pickup ?? ''} → ${dropoff ?? ''}`}
                >
                    <MapPin className="w-3 h-3 text-grey-3 shrink-0" />
                    {pickup && <span className="truncate">{pickup}</span>}
                    {pickup && dropoff && <ArrowRight className="w-3 h-3 text-grey-3 shrink-0" />}
                    {dropoff && <span className="truncate">{dropoff}</span>}
                </p>
            )}
            {vehicle && (
                <p
                    className="text-[12px] font-manrope text-grey-1 flex items-center gap-1.5 truncate"
                    title={vehicle}
                >
                    <Car className="w-3 h-3 text-grey-3 shrink-0" />
                    {vehicle}
                </p>
            )}
        </div>
    )
}

function VisaDetails({ extracted, cd }: DetailsProps) {
    const visaType = cd.visa_type
    const validFrom = formatShortDate(cd.valid_from ?? extracted.start_datetime)
    const validUntil = formatShortDate(cd.valid_until ?? extracted.end_datetime)
    const entries = cd.entries
    const country = cd.country
    const summary = [visaType, country].filter(Boolean).join(' · ')

    return (
        <div className="mt-2 space-y-1">
            {summary && (
                <p className="text-[12px] font-manrope text-grey-1 truncate" title={summary}>
                    {summary}
                </p>
            )}
            {(validFrom || entries) && (
                <p className="text-[12px] font-manrope text-grey-0 flex items-center gap-1.5 truncate">
                    <Calendar className="w-3 h-3 text-grey-3 shrink-0" />
                    {validFrom && <span className="tabular-nums">{validFrom}</span>}
                    {validFrom && validUntil && (
                        <ArrowRight className="w-3 h-3 text-grey-3" />
                    )}
                    {validUntil && <span className="tabular-nums">{validUntil}</span>}
                    {entries && <span className="text-grey-2">· {entries}</span>}
                </p>
            )}
        </div>
    )
}

function GenericDetails({ extracted }: { extracted: VoucherExtracted }) {
    const locationName = extracted.location?.name || extracted.location?.address
    if (!locationName) return null
    return (
        <p
            className="text-[12px] font-manrope text-grey-1 flex items-center gap-1.5 mt-2 truncate"
            title={locationName}
        >
            <MapPin className="w-3 h-3 text-grey-3 shrink-0" />
            {locationName}
        </p>
    )
}

// ────────────────────── file preview (left tile) ──────────────────────

function detectKind(
    mime: string | null,
    filename: string | null,
): 'image' | 'pdf' | 'pkpass' | 'eml' | 'other' {
    const m = (mime || '').toLowerCase()
    const f = (filename || '').toLowerCase()
    if (m.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(f)) return 'image'
    if (m === 'application/pdf' || f.endsWith('.pdf')) return 'pdf'
    if (m === 'application/vnd.apple.pkpass' || f.endsWith('.pkpass')) return 'pkpass'
    if (m === 'message/rfc822' || f.endsWith('.eml')) return 'eml'
    return 'other'
}

interface FilePreviewProps {
    fileUrl: string | null
    filename: string | null
    mimeType: string | null
}

function FilePreview({ fileUrl, filename, mimeType }: FilePreviewProps) {
    const kind = detectKind(mimeType, filename)
    // Compact 64×64 square pinned to the top-right of the card. Doesn't
    // stretch with card height, doesn't dominate; reads as a thumbnail.
    const wrapperClass =
        'shrink-0 w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-lg border border-grey-4 bg-grey-5/60 flex items-center justify-center overflow-hidden'

    if (!fileUrl) {
        return (
            <div className={cn(wrapperClass, 'opacity-60')} aria-hidden>
                <FileText className="w-5 h-5 text-grey-3" />
            </div>
        )
    }

    const link = (children: React.ReactNode) => (
        <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={filename ?? 'Open file'}
            className={cn(
                wrapperClass,
                'group/preview cursor-pointer hover:bg-grey-5 hover:border-primary-default/40 transition-colors',
            )}
        >
            {children}
        </a>
    )

    if (kind === 'image') {
        return link(
            <div className="relative w-full h-full">
                <img
                    src={fileUrl}
                    alt={filename ?? 'Voucher preview'}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-grey-0/0 group-hover/preview:bg-grey-0/30 transition-colors flex items-center justify-center opacity-0 group-hover/preview:opacity-100">
                    <Eye className="w-4 h-4 text-white drop-shadow" />
                </div>
            </div>,
        )
    }

    const visual = formatVisual(kind)
    return link(
        <div className="flex flex-col items-center justify-center gap-0.5">
            <div className={cn('w-7 h-7 rounded-md flex items-center justify-center', visual.bg)}>
                <visual.Icon className={cn('w-3.5 h-3.5', visual.fg)} />
            </div>
            <span className={cn('text-[9px] font-bold uppercase tracking-wider font-manrope', visual.pill)}>
                {visual.label}
            </span>
        </div>,
    )
}

function formatVisual(kind: 'pdf' | 'pkpass' | 'eml' | 'other') {
    if (kind === 'pdf') {
        return { Icon: FileText, label: 'PDF', bg: 'bg-rose-50', fg: 'text-rose-600', pill: 'text-rose-700' }
    }
    if (kind === 'pkpass') {
        return { Icon: Wallet, label: 'Pass', bg: 'bg-indigo-50', fg: 'text-indigo-600', pill: 'text-indigo-700' }
    }
    if (kind === 'eml') {
        return { Icon: Mail, label: 'Email', bg: 'bg-amber-50', fg: 'text-amber-700', pill: 'text-amber-700' }
    }
    return { Icon: FileText, label: 'File', bg: 'bg-grey-4/60', fg: 'text-grey-1', pill: 'text-grey-1' }
}

// ────────────────────── copy chips ──────────────────────

interface ChipSpec {
    key: string
    label: string
    value: string
    accent?: 'sky'
}

function buildChips(voucher: Voucher): ChipSpec[] {
    const e = voucher.extracted || {}
    const cd: VoucherCategoryData = e.category_data || {}
    const out: ChipSpec[] = []

    if (voucher.category === 'flight') {
        // Primary (PNR, Seat) live in the segmented detail boxes above.
        // Chip row carries secondary IDs only.
        if (cd.flight_number) out.push({ key: 'flight', label: 'Flight', value: cd.flight_number, accent: 'sky' })
        if (cd.gate) out.push({ key: 'gate', label: 'Gate', value: cd.gate, accent: 'sky' })
        if (cd.terminal) out.push({ key: 'terminal', label: 'Terminal', value: cd.terminal, accent: 'sky' })
    } else if (voucher.category === 'hotel') {
        // Primary (Check-in / Check-out / Nights) live in the grid.
        if (e.booking_ref) out.push({ key: 'ref', label: 'Confirmation', value: String(e.booking_ref) })
        if (cd.room_no) out.push({ key: 'room', label: 'Room', value: cd.room_no })
    } else if (voucher.category === 'activity') {
        if (e.booking_ref) out.push({ key: 'ref', label: 'Booking', value: String(e.booking_ref) })
    } else if (voucher.category === 'transfer') {
        if (e.booking_ref) out.push({ key: 'ref', label: 'Booking', value: String(e.booking_ref) })
        if (cd.driver_phone) out.push({ key: 'phone', label: 'Driver', value: cd.driver_phone })
        if (cd.vehicle_number) out.push({ key: 'plate', label: 'Plate', value: cd.vehicle_number })
    } else if (voucher.category === 'visa') {
        if (cd.visa_number) out.push({ key: 'visa', label: 'Visa', value: cd.visa_number })
        else if (e.booking_ref) out.push({ key: 'ref', label: 'Ref', value: String(e.booking_ref) })
    } else {
        if (e.booking_ref) {
            out.push({ key: 'ref', label: refLabelFor(voucher.category), value: String(e.booking_ref) })
        } else if (e.pnr) {
            out.push({ key: 'pnr', label: 'Ref', value: String(e.pnr) })
        }
    }

    return out
}

// ────────────────────── segmented detail boxes ──────────────────────

interface DetailSpec {
    key: string
    label: string
    value: string
    /** Optional second line under the value — e.g. date below time. */
    sub?: string
    /** When set, clicking the box copies this string to the clipboard. */
    copyValue?: string
    /** Sky tint for flight-related boxes; default is neutral grey. */
    accent?: 'sky'
}

/**
 * Picks the 3 most-scanned values for the voucher category and packs
 * them into segmented boxes. Returns null for categories where chip
 * soup is still the right call (transfer / visa / other).
 */
function buildDetailGrid(voucher: Voucher): DetailSpec[] | null {
    const e = voucher.extracted || {}
    const cd: VoucherCategoryData = e.category_data || {}

    if (voucher.category === 'flight') {
        const grid: DetailSpec[] = []
        const dep = formatTime(e.start_datetime)
        if (dep) {
            grid.push({
                key: 'depart',
                label: 'Departs at',
                value: dep,
                sub: formatShortDate(e.start_datetime) || undefined,
            })
        }
        if (e.pnr) {
            grid.push({
                key: 'pnr',
                label: 'PNR',
                value: String(e.pnr),
                copyValue: String(e.pnr),
                accent: 'sky',
            })
        }
        if (cd.seat) {
            grid.push({
                key: 'seat',
                label: 'Seat',
                value: cd.seat,
                sub: cd.fare_class ?? undefined,
                copyValue: cd.seat,
                accent: 'sky',
            })
        }
        return grid.length > 0 ? grid : null
    }

    if (voucher.category === 'hotel') {
        const grid: DetailSpec[] = []
        const ci = cd.check_in_time || formatTime(e.start_datetime)
        if (ci || e.start_datetime) {
            grid.push({
                key: 'checkin',
                label: 'Check-in',
                value: ci || formatShortDate(e.start_datetime) || '—',
                sub: ci ? formatShortDate(e.start_datetime) || undefined : undefined,
            })
        }
        const co = cd.check_out_time || formatTime(e.end_datetime)
        if (co || e.end_datetime) {
            grid.push({
                key: 'checkout',
                label: 'Check-out',
                value: co || formatShortDate(e.end_datetime) || '—',
                sub: co ? formatShortDate(e.end_datetime) || undefined : undefined,
            })
        }
        const nights = cd.nights ?? deriveNights(e.start_datetime, e.end_datetime)
        if (nights != null) {
            grid.push({
                key: 'nights',
                label: 'Nights',
                value: String(nights),
            })
        }
        return grid.length > 0 ? grid : null
    }

    if (voucher.category === 'activity') {
        const grid: DetailSpec[] = []
        const startsAt = formatTime(e.start_datetime)
        if (startsAt) {
            grid.push({
                key: 'starts',
                label: 'Starts at',
                value: startsAt,
                sub: formatShortDate(e.start_datetime) || undefined,
            })
        }
        if (cd.duration) {
            grid.push({
                key: 'duration',
                label: 'Duration',
                value: cd.duration,
            })
        }
        if (cd.language) {
            grid.push({
                key: 'language',
                label: 'Language',
                value: cd.language,
            })
        } else if (cd.guests != null) {
            grid.push({
                key: 'guests',
                label: 'Guests',
                value: String(cd.guests),
            })
        }
        return grid.length > 0 ? grid : null
    }

    return null
}

function DetailBox({ spec }: { spec: DetailSpec }) {
    const [copied, setCopied] = useState(false)

    const handleClick = async () => {
        if (!spec.copyValue) return
        try {
            await navigator.clipboard.writeText(spec.copyValue)
            setCopied(true)
            toast.success(`${spec.label} ${spec.copyValue} copied`, { duration: 1500 })
            window.setTimeout(() => setCopied(false), 1500)
        } catch {
            toast.error("Couldn't copy — please copy manually")
        }
    }

    const isClickable = !!spec.copyValue
    const accentClass =
        spec.accent === 'sky'
            ? 'bg-sky-50/70 hover:bg-sky-50'
            : 'bg-grey-5/60 hover:bg-grey-5'
    const Tag = isClickable ? 'button' : 'div'

    return (
        <Tag
            type={isClickable ? 'button' : undefined}
            onClick={isClickable ? handleClick : undefined}
            title={isClickable ? `Copy ${spec.label} ${spec.copyValue}` : undefined}
            className={cn(
                // `min-w-0` lets the value truncate; `max-w-[160px]` keeps a
                // 2-box row from stretching to fill the whole content width;
                // `flex-1` distributes available space evenly among visible
                // boxes up to that cap.
                'flex-1 min-w-0 max-w-[160px] px-2.5 py-1.5 rounded-md text-left transition-colors flex flex-col gap-0',
                isClickable ? `${accentClass} cursor-pointer` : accentClass.replace(/hover:[^\s]+/g, ''),
            )}
        >
            <span className="text-[9px] font-bold uppercase tracking-wider font-manrope text-grey-2 leading-tight">
                {spec.label}
            </span>
            <span className="flex items-center gap-1 min-w-0">
                <span
                    className={cn(
                        'text-[13px] font-semibold font-manrope text-grey-0 tabular-nums truncate',
                        spec.accent === 'sky' && 'text-sky-800',
                    )}
                >
                    {spec.value}
                </span>
                {isClickable && (copied ? (
                    <Check className="w-3 h-3 text-emerald-600 shrink-0" aria-label="Copied" />
                ) : (
                    <Copy className="w-3 h-3 opacity-40 shrink-0" aria-hidden />
                ))}
            </span>
            {spec.sub && (
                <span
                    className="text-[10px] font-manrope text-grey-2 leading-tight truncate"
                    title={spec.sub}
                >
                    {spec.sub}
                </span>
            )}
        </Tag>
    )
}

function refLabelFor(category: VoucherCategory | null): string {
    switch (category) {
        case 'hotel':
            return 'Confirmation'
        case 'activity':
            return 'Booking'
        case 'transfer':
            return 'Booking'
        case 'visa':
            return 'Visa'
        default:
            return 'Ref'
    }
}

function CopyChip({ chip }: { chip: ChipSpec }) {
    const [copied, setCopied] = useState(false)

    const handleClick = async () => {
        try {
            await navigator.clipboard.writeText(chip.value)
            setCopied(true)
            toast.success(`${chip.label} ${chip.value} copied`, { duration: 1500 })
            window.setTimeout(() => setCopied(false), 1500)
        } catch {
            toast.error("Couldn't copy — please copy manually")
        }
    }

    const accentClass =
        chip.accent === 'sky'
            ? 'bg-sky-50 hover:bg-sky-100 text-sky-700'
            : 'bg-grey-5 hover:bg-grey-4/60 text-grey-0'

    return (
        <button
            type="button"
            onClick={handleClick}
            title={`Copy ${chip.label} ${chip.value}`}
            className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-manrope transition-colors',
                accentClass,
            )}
        >
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                {chip.label}
            </span>
            <span className="font-semibold tabular-nums">{chip.value}</span>
            {copied ? (
                <Check className="w-3 h-3 text-emerald-600" aria-label="Copied" />
            ) : (
                <Copy className="w-3 h-3 opacity-60" aria-hidden />
            )}
        </button>
    )
}

// ────────────────────── action links ──────────────────────

interface ActionSpec {
    key: string
    href: string
    icon: typeof Plug
    label: string
    accent?: 'sky'
}

function buildActions(voucher: Voucher): ActionSpec[] {
    const e = voucher.extracted || {}
    const cd: VoucherCategoryData = e.category_data || {}
    const out: ActionSpec[] = []

    if (voucher.category === 'flight' && cd.webcheckin_url) {
        out.push({ key: 'checkin', href: cd.webcheckin_url, icon: Plug, label: 'Web check-in', accent: 'sky' })
    }
    if (voucher.category === 'hotel' || voucher.category === 'activity' || voucher.category === 'transfer') {
        const fallback =
            voucher.category === 'transfer' ? cd.dropoff_location ?? cd.pickup_location : null
        const dir = directionsUrl(e.location, fallback)
        if (dir) {
            out.push({ key: 'dir', href: dir, icon: Navigation, label: 'Directions' })
        }
    }
    if (cd.confirmation_url) {
        out.push({ key: 'conf', href: cd.confirmation_url, icon: ArrowUpRight, label: 'Confirmation' })
    }
    return out
}

interface ActionLinkProps {
    href: string
    icon: typeof Plug
    label: string
    accent?: 'sky'
}

function ActionLink({ href, icon: Icon, label, accent }: ActionLinkProps) {
    const accentClass =
        accent === 'sky'
            ? 'text-sky-700 hover:bg-sky-50'
            : 'text-grey-1 hover:text-grey-0 hover:bg-grey-5'
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium font-manrope transition-colors',
                accentClass,
            )}
        >
            <Icon className="w-3 h-3" />
            {label}
        </a>
    )
}
