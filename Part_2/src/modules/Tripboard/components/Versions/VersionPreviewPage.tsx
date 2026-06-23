/**
 * VersionPreviewPage
 *
 * Full-screen, read-only preview of a saved tripboard version. Reuses the
 * exact same `KanbanEventCard` rendering from the desktop map sidebar so the
 * snapshot's days/slots show up with the same visual fidelity as the live
 * itinerary (flight pills, meal thumbnails, experience hero photos, etc.).
 *
 * Why a page (not a modal):
 *   - Full real estate for day-by-day review and a sticky day quick-nav strip
 *   - Browser back / shareable URL
 *   - Mobile renders identically to the live tripboard list, no compromise
 *
 * Route: /tripboard/:tripId/versions/:versionId/preview
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
    AlertCircle, ArrowLeft, BedDouble, Calendar, ChevronLeft, Loader2,
    MapPin, RotateCcw, Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import {
    getTripboardVersion,
    restoreTripboardVersion,
} from '@/api/tripboardVersionsApi'
import { transformItineraryToEvents } from '@/modules/Itinerary/components/RenderCalenderEventmobile'
import { KanbanEventCard } from '@/modules/Itinerary/components/DesktopKanbanView'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatTripDates, formatVersionTime } from './versionUtils'

// ── Helpers ─────────────────────────────────────────────────────────────

/** Strip our snapshot's `__date__` / `__oid__` markers recursively so the
 *  shape matches what live components expect (plain strings / dates). */
function unmarkObject(value: unknown): unknown {
    if (value === null || value === undefined) return value
    if (Array.isArray(value)) return value.map(unmarkObject)
    if (typeof value === 'object') {
        const obj = value as Record<string, unknown>
        if (typeof obj.__date__ === 'string') return obj.__date__
        if (typeof obj.__oid__ === 'string') return obj.__oid__
        const out: Record<string, unknown> = {}
        for (const k of Object.keys(obj)) out[k] = unmarkObject(obj[k])
        return out
    }
    return value
}

function formatFullDate(iso: string | null | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    })
}

const NOOP = () => {}
const EMPTY_SET = new Set<string>()

// ── Component ───────────────────────────────────────────────────────────

export default function VersionPreviewPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const isMobile = useIsMobile()
    const { tripId = '', versionId = '' } = useParams<{ tripId: string; versionId: string }>()
    const [searchParams] = useSearchParams()
    const returnTo = searchParams.get('return') || `/tripboard/${tripId}`

    const [isRestoring, setIsRestoring] = useState(false)
    const [activeDayIndex, setActiveDayIndex] = useState(0)
    const dayRefs = useRef<Array<HTMLLIElement | null>>([])
    const scrollRootRef = useRef<HTMLDivElement | null>(null)

    const { data, isLoading, error } = useQuery({
        queryKey: ['tripboard-version-preview', tripId, versionId],
        queryFn: () => getTripboardVersion(tripId, versionId),
        enabled: !!tripId && !!versionId,
        staleTime: 60_000,
    })

    const version = data?.version ?? null

    /** Unwrap snapshot markers and hydrate per-day base_city so the
     *  days array matches what live components expect.
     *
     *  City names live in a parallel `_meta.per_day_cities` array (FE-only
     *  metadata, not on the embedded ItineraryDay document) so the same
     *  snapshot can be restored cleanly via the strict MongoEngine schema.
     *
     *  Older snapshots may still have a `_resolved_city` field directly on
     *  each day — we read either source so previews keep working through
     *  the migration window.
     */
    const liveShapedDays = useMemo(() => {
        const snapshot = version?.snapshot as
            | {
                  itinerary?: {
                      days?: Array<Record<string, unknown>>
                      _meta?: { per_day_cities?: Array<{ name?: string; id?: string | null }> }
                  }
              }
            | undefined
        const rawDays = snapshot?.itinerary?.days || []
        const perDayCities = snapshot?.itinerary?._meta?.per_day_cities || []
        return rawDays.map((rawDay, idx) => {
            const day = unmarkObject(rawDay) as Record<string, unknown>
            const fromMeta = perDayCities[idx]
            const fromDayLevel = day._resolved_city as
                | { name?: string; id?: string | null }
                | undefined
            const resolved = fromMeta?.name ? fromMeta : fromDayLevel
            if (resolved?.name) {
                day.base_city = { id: resolved.id || null, name: resolved.name }
            } else if (typeof day.base_city === 'string') {
                day.base_city = { id: day.base_city, name: '' }
            }
            // Drop the legacy field so it never leaks into anything that
            // expects the live ItineraryDay shape.
            delete day._resolved_city
            return day
        })
    }, [version])

    const events = useMemo(
        () => transformItineraryToEvents(liveShapedDays, undefined),
        [liveShapedDays],
    )

    const eventsByDay = useMemo(() => {
        const map = new Map<number, ReturnType<typeof transformItineraryToEvents>>()
        events.forEach((ev) => {
            const di = (ev.dayIndex as number) ?? 0
            if (!map.has(di)) map.set(di, [])
            map.get(di)!.push(ev)
        })
        return map
    }, [events])

    // ── Scroll-spy: track the day in view so the quick-nav highlights it ──
    useEffect(() => {
        if (!scrollRootRef.current) return
        const root = scrollRootRef.current
        const observer = new IntersectionObserver(
            (entries) => {
                // Pick the entry closest to the top of the viewport
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
                if (visible[0]) {
                    const idx = Number(
                        (visible[0].target as HTMLElement).dataset.dayIndex,
                    )
                    if (!isNaN(idx)) setActiveDayIndex(idx)
                }
            },
            { root, threshold: 0.1, rootMargin: '-80px 0px -50% 0px' },
        )
        dayRefs.current.forEach((el) => el && observer.observe(el))
        return () => observer.disconnect()
    }, [liveShapedDays.length])

    const scrollToDay = useCallback((idx: number) => {
        const el = dayRefs.current[idx]
        if (!el || !scrollRootRef.current) return
        const root = scrollRootRef.current
        const headerOffset = 8 // breathing room below sticky day-nav
        const elTop = el.offsetTop - headerOffset
        root.scrollTo({ top: elTop, behavior: 'smooth' })
    }, [])

    const handleExit = useCallback(() => {
        navigate(returnTo)
    }, [navigate, returnTo])

    const handleRestore = useCallback(async () => {
        if (!version) return
        const confirmed = confirm(
            `Restore "${version.name}"? Your current tripboard will be replaced. ` +
            `We'll save a backup of the current state first, so you can come back.`,
        )
        if (!confirmed) return
        setIsRestoring(true)
        try {
            await restoreTripboardVersion(tripId, version.id)
            // Invalidate everything tripboard-related so the live view shows
            // the restored state when the user navigates back.
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['tripboard-versions', tripId] }),
                queryClient.invalidateQueries({ queryKey: ['itineraryCompleted'] }),
                queryClient.invalidateQueries({ queryKey: ['itinerary'] }),
                queryClient.invalidateQueries({ queryKey: ['traveler-collection'] }),
                queryClient.invalidateQueries({ queryKey: ['tripboard-collection'] }),
                queryClient.invalidateQueries({ queryKey: ['shortlistedByTrip', tripId] }),
                queryClient.invalidateQueries({ queryKey: ['trip', tripId] }),
            ])
            toast.success(`Restored "${version.name}"`)
            navigate(returnTo)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to restore version')
        } finally {
            setIsRestoring(false)
        }
    }, [version, tripId, navigate, returnTo, queryClient])

    // ── Render ─────────────────────────────────────────────────────────

    if (!tripId || !versionId) {
        return <ErrorState message="Invalid preview URL" onExit={handleExit} />
    }

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-grey-7 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-grey-1" />
            </div>
        )
    }

    if (error || !version) {
        return (
            <ErrorState
                message="Couldn't load this version"
                onExit={handleExit}
            />
        )
    }

    const dateRange = formatTripDates(version.summary?.start_date, version.summary?.end_date)
    const dayCount = version.summary?.day_count || 0
    const cities = version.summary?.cities || []
    const country = version.summary?.country || null
    const stayCount = version.summary?.stay_count || 0
    const activityCount = version.summary?.activity_count || 0

    return (
        <div className="fixed inset-0 bg-grey-7 flex flex-col z-50">
            {/* ── Sticky preview banner ── */}
            <div className="bg-amber-50 border-b border-amber-200 shrink-0">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <div className="min-w-0 flex-1 flex items-baseline gap-2 flex-wrap">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-amber-900 font-manrope">
                            Preview mode
                        </span>
                        <span className="text-[12px] text-amber-700 font-manrope hidden sm:inline">
                            · Nothing here is changing on your live tripboard.
                        </span>
                    </div>
                    <button
                        onClick={handleExit}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold font-manrope text-amber-900 hover:bg-amber-100 transition-colors"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Back to tripboard
                    </button>
                </div>
            </div>

            {/* ── Page header ── */}
            <header className="bg-natural-white border-b border-feature-card-border shrink-0">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-start gap-3">
                        <button
                            onClick={handleExit}
                            className="shrink-0 mt-1 p-1.5 rounded-full hover:bg-grey-5 transition-colors md:hidden"
                            aria-label="Back"
                        >
                            <ArrowLeft className="w-4 h-4 text-grey-0" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-[20px] font-bold font-manrope text-grey-0 line-clamp-2">
                                {version.name}
                            </h1>
                            <p className="text-[13px] text-grey-1 mt-0.5 font-manrope">
                                {version.author?.name ? `By ${version.author.name} · ` : ''}
                                {formatVersionTime(version.created_at)}
                            </p>
                        </div>
                    </div>

                    {/* Trip-shape pills */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {dateRange && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-[12px] font-medium font-manrope">
                                <Calendar className="w-3.5 h-3.5" />
                                {dateRange}
                                {dayCount ? <span className="text-amber-600/80">· {dayCount}d</span> : null}
                            </span>
                        )}
                        {stayCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 text-[12px] font-medium font-manrope">
                                <BedDouble className="w-3.5 h-3.5" />
                                {stayCount} {stayCount === 1 ? 'stay' : 'stays'}
                            </span>
                        )}
                        {activityCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[12px] font-medium font-manrope">
                                <Sparkles className="w-3.5 h-3.5" />
                                {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
                            </span>
                        )}
                        {cities.length > 0 && (
                            <CityPill cities={cities} country={country} />
                        )}
                    </div>
                </div>

                {/* Day quick-nav — horizontal scroll, sticky when day list scrolls */}
                {liveShapedDays.length > 0 && (
                    <nav
                        aria-label="Day navigation"
                        className="border-t border-feature-card-border/60 bg-natural-white"
                    >
                        <div className="max-w-5xl mx-auto px-4 sm:px-6">
                            <ul className="flex items-center gap-2 overflow-x-auto py-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {liveShapedDays.map((_, idx) => (
                                    <li key={idx} className="shrink-0">
                                        <button
                                            onClick={() => scrollToDay(idx)}
                                            className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold font-manrope transition-colors ${
                                                activeDayIndex === idx
                                                    ? 'bg-grey-0 text-natural-white'
                                                    : 'bg-grey-6 text-grey-0 hover:bg-grey-5'
                                            }`}
                                        >
                                            Day {idx + 1}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </nav>
                )}
            </header>

            {/* ── Day list (scrollable) ── */}
            <main
                ref={scrollRootRef}
                className="flex-1 overflow-y-auto"
                style={{ overscrollBehavior: 'contain' }}
            >
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                    {liveShapedDays.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <ol className="space-y-6">
                            {liveShapedDays.map((day, idx) => {
                                const dayDate = day.date as string | null
                                const cityName =
                                    (day.base_city as { name?: string } | null)?.name || ''
                                const dayEvents = eventsByDay.get(idx) || []
                                return (
                                    <li
                                        key={idx}
                                        ref={(el) => {
                                            dayRefs.current[idx] = el
                                        }}
                                        data-day-index={idx}
                                    >
                                        {/* Date header — same family as the live itinerary day strip */}
                                        <div className="mb-3 flex items-baseline gap-3 flex-wrap">
                                            <h2 className="text-[18px] font-bold font-manrope text-grey-0">
                                                {formatFullDate(dayDate) || `Day ${idx + 1}`}
                                            </h2>
                                            {cityName && (
                                                <span className="inline-flex items-center gap-1 text-[13px] font-medium font-manrope text-grey-2">
                                                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                                    {cityName}
                                                </span>
                                            )}
                                        </div>

                                        {/* Slot stack */}
                                        {dayEvents.length === 0 ? (
                                            <div className="bg-natural-white border border-feature-card-border rounded-xl px-4 py-5 text-[13px] text-grey-2 font-manrope italic">
                                                No activities planned
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {dayEvents.map((event, i) => (
                                                    <div
                                                        key={
                                                            (event.slot_id as string) ||
                                                            (event.id as string) ||
                                                            i
                                                        }
                                                    >
                                                        <KanbanEventCard
                                                            event={event}
                                                            onEdit={NOOP}
                                                            onDelete={NOOP}
                                                            canEdit={false}
                                                            shortlistedExperienceIds={EMPTY_SET}
                                                            suppressHoverPopup
                                                            suppressHoverAiSuggestions
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </li>
                                )
                            })}
                        </ol>
                    )}
                </div>
            </main>

            {/* ── Sticky footer with primary action ── */}
            <footer className="bg-natural-white border-t border-feature-card-border shrink-0">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2">
                    <button
                        onClick={handleExit}
                        disabled={isRestoring}
                        className="px-4 py-2 rounded-lg text-[14px] font-medium font-manrope text-grey-0 hover:bg-grey-5 transition-colors disabled:opacity-60"
                    >
                        {isMobile ? 'Back' : 'Back to tripboard'}
                    </button>
                    <button
                        onClick={handleRestore}
                        disabled={isRestoring}
                        className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-semibold font-manrope text-natural-white bg-primary-default hover:bg-primary-default/90 transition-colors disabled:opacity-60"
                    >
                        {isRestoring ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RotateCcw className="w-4 h-4" />
                        )}
                        {isRestoring ? 'Restoring…' : 'Restore this version'}
                    </button>
                </div>
            </footer>
        </div>
    )
}

// ── Subcomponents ───────────────────────────────────────────────────────

function CityPill({ cities, country }: { cities: string[]; country?: string | null }) {
    const visible = cities.slice(0, 3)
    const overflow = cities.length - visible.length
    const isSingle = cities.length === 1
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-[12px] font-medium font-manrope">
            <MapPin className="w-3.5 h-3.5" />
            {visible.join(' › ')}
            {isSingle && country ? `, ${country}` : ''}
            {overflow > 0 ? ` +${overflow} more` : ''}
        </span>
    )
}

function ErrorState({ message, onExit }: { message: string; onExit: () => void }) {
    return (
        <div className="fixed inset-0 bg-natural-white flex flex-col items-center justify-center px-6 z-50">
            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
            <p className="text-[15px] font-semibold text-grey-0 font-manrope">{message}</p>
            <button
                onClick={onExit}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-medium font-manrope text-grey-0 bg-grey-6 hover:bg-grey-5 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                Go back
            </button>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="bg-natural-white rounded-xl border border-feature-card-border px-6 py-16 text-center">
            <p className="text-[15px] font-semibold text-grey-0 font-manrope">
                No itinerary in this version
            </p>
            <p className="text-[13px] text-grey-1 mt-1 font-manrope">
                The trip was empty when this version was saved.
            </p>
        </div>
    )
}
