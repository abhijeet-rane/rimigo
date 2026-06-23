import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useIsMobile } from '@/hooks/use-mobile'
import { X, Plus, Loader2, History, Trash2, RotateCcw, Eye, AlertCircle, ChevronRight, Calendar, MapPin, BedDouble, Sparkles, BookmarkCheck, Pin, PinOff } from 'lucide-react'
import { toast } from 'sonner'
import {
    listTripboardVersions,
    saveTripboardVersion,
    restoreTripboardVersion,
    deleteTripboardVersion,
    pinTripboardVersion,
    type TripboardVersion,
} from '@/api/tripboardVersionsApi'
import SaveVersionModal from './SaveVersionModal'
import RestoreVersionDialog from './RestoreVersionDialog'
// Preview now lives at /tripboard/:tripId/versions/:versionId/preview as a
// dedicated full-screen page (VersionPreviewPage) — see routes.tsx. The
// modal-based preview was retired after user testing showed a full page
// gives the necessary real estate for day-by-day review without compromise.
//
// VersionDiffModal is also kept on disk but intentionally unwired from the
// UI — early user testing showed "Compare versions" was hard to understand.
// Can be re-enabled in a future iteration with a clearer entry point.
import {
    formatVersionTime,
    formatVersionTimestamp,
    formatTripDates,
    groupVersionsByDay,
    isAutoVersion,
    shouldShowNote,
} from './versionUtils'

interface VersionsPanelProps {
    isOpen: boolean
    tripId: string
    canDelete?: boolean
    onClose: () => void
    /** Called when a preview is requested. Parent decides how to render preview mode. */
    onPreview?: (version: TripboardVersion) => void
}

export default function VersionsPanel({
    isOpen,
    tripId,
    canDelete = false,
    onClose,
    onPreview,
}: VersionsPanelProps) {
    const queryClient = useQueryClient()
    const isMobile = useIsMobile()
    const [isSaveOpen, setIsSaveOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [restoreTarget, setRestoreTarget] = useState<TripboardVersion | null>(null)
    const [isRestoring, setIsRestoring] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [pinningId, setPinningId] = useState<string | null>(null)
    const navigate = useNavigate()
    const location = useLocation()

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['tripboard-versions', tripId],
        queryFn: () => listTripboardVersions(tripId),
        enabled: isOpen && !!tripId,
        staleTime: 10_000,
    })

    // Lock background scroll while panel is open
    useEffect(() => {
        if (isOpen) {
            const prev = document.body.style.overflow
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = prev
            }
        }
    }, [isOpen])

    const handleSave = async (params: { name: string; note: string }) => {
        setIsSaving(true)
        try {
            await saveTripboardVersion(tripId, params)
            await refetch()
            toast.success('Version saved')
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to save version'
            toast.error(msg)
            throw err
        } finally {
            setIsSaving(false)
        }
    }

    const handleRestoreConfirm = async () => {
        if (!restoreTarget) return
        setIsRestoring(true)
        try {
            await restoreTripboardVersion(tripId, restoreTarget.id)
            // Invalidate everything tripboard-related so the UI shows restored state
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['tripboard-versions', tripId] }),
                queryClient.invalidateQueries({ queryKey: ['itineraryCompleted'] }),
                queryClient.invalidateQueries({ queryKey: ['itinerary'] }),
                queryClient.invalidateQueries({ queryKey: ['traveler-collection'] }),
                queryClient.invalidateQueries({ queryKey: ['tripboard-collection'] }),
                queryClient.invalidateQueries({ queryKey: ['shortlistedByTrip', tripId] }),
                queryClient.invalidateQueries({ queryKey: ['trip', tripId] }),
            ])
            toast.success(
                isAutoVersion(restoreTarget)
                    ? 'Undone — your earlier state is back'
                    : `Restored "${restoreTarget.name}"`,
            )
            setRestoreTarget(null)
            onClose()
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to restore version'
            toast.error(msg)
        } finally {
            setIsRestoring(false)
        }
    }

    const handleDelete = async (version: TripboardVersion) => {
        if (!confirm(`Delete "${version.name}"? This can't be undone.`)) return
        setDeletingId(version.id)
        try {
            await deleteTripboardVersion(tripId, version.id)
            await refetch()
            toast.success('Version deleted')
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete version'
            toast.error(msg)
        } finally {
            setDeletingId(null)
        }
    }

    const handleTogglePin = async (version: TripboardVersion) => {
        const next = !version.is_pinned
        setPinningId(version.id)
        try {
            await pinTripboardVersion(tripId, version.id, next)
            await refetch()
            toast.success(next ? 'Pinned' : 'Unpinned')
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to update pin'
            toast.error(msg)
        } finally {
            setPinningId(null)
        }
    }

    if (!isOpen) return null

    const versions = data?.versions || []
    const manualCount = versions.filter((v) => !isAutoVersion(v)).length
    const autoCount = versions.length - manualCount

    const versionCountLabel = (() => {
        if (versions.length === 0) return 'No versions yet'
        if (autoCount === 0) {
            return `${manualCount} ${manualCount === 1 ? 'saved version' : 'saved versions'}`
        }
        if (manualCount === 0) {
            return `${autoCount} auto-saved`
        }
        return `${manualCount} saved · ${autoCount} auto-saved`
    })()

    const panel = (
        <AnimatePresence>
            <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/40 z-[150]"
            />
            <motion.aside
                key="panel"
                /* Mobile = bottom sheet (slide up from bottom, capped at 90vh,
                   rounded top corners, drag handle).  Desktop = right-side
                   slide-over (420px wide, full height). */
                initial={isMobile ? { y: '100%' } : { x: '100%' }}
                animate={isMobile ? { y: 0 } : { x: 0 }}
                exit={isMobile ? { y: '100%' } : { x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                drag={isMobile ? 'y' : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.4 }}
                onDragEnd={(_, info) => {
                    if (isMobile && (info.offset.y > 120 || info.velocity.y > 500)) {
                        onClose()
                    }
                }}
                className={
                    isMobile
                        ? 'fixed left-0 right-0 bottom-0 z-[151] max-h-[90vh] h-[85vh] bg-natural-white shadow-2xl flex flex-col rounded-t-2xl'
                        : 'fixed top-0 right-0 bottom-0 z-[151] w-full sm:w-[420px] bg-natural-white shadow-2xl flex flex-col'
                }
            >
                {/* Mobile drag handle — visual cue that the sheet is dismissable */}
                {isMobile && (
                    <div className="pt-2 pb-1 flex justify-center shrink-0">
                        <div className="w-10 h-1 rounded-full bg-grey-4" aria-hidden />
                    </div>
                )}

                {/* Header */}
                <div className="px-5 py-4 border-b border-feature-card-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary-default/10 flex items-center justify-center shrink-0">
                            <History className="w-4 h-4 text-primary-default" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-[16px] font-semibold font-manrope text-grey-0 truncate">
                                Version history
                            </h2>
                            <p className="text-[12px] text-grey-1 font-manrope">
                                {versionCountLabel}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-grey-5 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4 text-grey-1" />
                    </button>
                </div>

                {/* Save bar */}
                <div className="px-5 py-3 border-b border-feature-card-border">
                    <button
                        onClick={() => setIsSaveOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-semibold font-manrope text-natural-white bg-primary-default hover:bg-primary-default/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Save current version
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-5 h-5 animate-spin text-grey-1" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
                            <p className="text-[14px] text-grey-0 font-manrope">Couldn't load versions</p>
                            <button
                                onClick={() => refetch()}
                                className="mt-3 text-[13px] text-primary-default font-medium font-manrope hover:underline"
                            >
                                Try again
                            </button>
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                            <History className="w-10 h-10 text-grey-3 mb-3" />
                            <p className="text-[14px] font-semibold text-grey-0 font-manrope">No versions yet</p>
                            <p className="text-[13px] text-grey-1 mt-1 font-manrope max-w-[260px]">
                                Save a version to capture your current tripboard. You can return to it anytime.
                            </p>
                        </div>
                    ) : (
                        <div className="px-3 py-3">
                            {groupVersionsByDay(versions).map((group) => {
                                // Within each day group: pinned first, then by recency.
                                // Stable sort preserves backend ordering for ties.
                                const sorted = [...group.versions].sort((a, b) => {
                                    const ap = a.is_pinned ? 1 : 0
                                    const bp = b.is_pinned ? 1 : 0
                                    return bp - ap
                                })
                                return (
                                    <section key={group.label} className="mb-4 last:mb-2">
                                        <h3 className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-grey-2 font-manrope">
                                            {group.label}
                                        </h3>
                                        <ol className="space-y-1.5">
                                            {sorted.map((v) => {
                                                const idx = versions.indexOf(v)
                                                return (
                                                    <VersionCard
                                                        key={v.id}
                                                        version={v}
                                                        isFirst={idx === 0}
                                                        canDelete={canDelete}
                                                        isDeleting={deletingId === v.id}
                                                        isPinning={pinningId === v.id}
                                                        onPreview={() => {
                                                            onPreview?.(v)
                                                            // Capture the current location so the preview
                                                            // page can return the user exactly here when
                                                            // they hit "Back to tripboard".
                                                            const returnPath = `${location.pathname}${location.search}`
                                                            navigate(
                                                                `/tripboard/${tripId}/versions/${v.id}/preview?return=${encodeURIComponent(returnPath)}`,
                                                            )
                                                        }}
                                                        onRestore={() => setRestoreTarget(v)}
                                                        onDelete={() => handleDelete(v)}
                                                        onTogglePin={() => handleTogglePin(v)}
                                                    />
                                                )
                                            })}
                                        </ol>
                                    </section>
                                )
                            })}
                        </div>
                    )}
                </div>
            </motion.aside>

            {/* Save modal */}
            <SaveVersionModal
                key="save"
                isOpen={isSaveOpen}
                onClose={() => setIsSaveOpen(false)}
                onSave={handleSave}
                isSaving={isSaving}
            />

            {/* Restore confirmation */}
            <RestoreVersionDialog
                key="restore"
                isOpen={!!restoreTarget}
                version={restoreTarget}
                onConfirm={handleRestoreConfirm}
                onClose={() => !isRestoring && setRestoreTarget(null)}
                isRestoring={isRestoring}
            />

            {/* Preview navigation handled inline above — opens
                /tripboard/:tripId/versions/:versionId/preview as a full page. */}
        </AnimatePresence>
    )

    return createPortal(panel, document.body)
}

interface VersionCardProps {
    version: TripboardVersion
    isFirst: boolean
    canDelete: boolean
    isDeleting: boolean
    isPinning: boolean
    onPreview: () => void
    onRestore: () => void
    onDelete: () => void
    onTogglePin: () => void
}

function VersionCard(props: VersionCardProps) {
    return isAutoVersion(props.version) ? (
        <AutoVersionRow {...props} />
    ) : (
        <ManualVersionCard {...props} />
    )
}

/**
 * Manual save — the prominent, decision-making card. Shows time, author,
 * route (city → city → city), date range, day count, and a clear CTA.
 */
function ManualVersionCard({
    version,
    isFirst,
    canDelete,
    isDeleting,
    isPinning,
    onPreview,
    onRestore,
    onDelete,
    onTogglePin,
}: VersionCardProps) {
    const time = formatVersionTime(version.created_at)
    const ts = formatVersionTimestamp(version.created_at)
    const dateRange = formatTripDates(version.summary?.start_date, version.summary?.end_date)
    const dayCount = version.summary?.day_count
    const cities = version.summary?.cities || []
    const segments = version.summary?.city_segments || []
    const country = version.summary?.country || null
    const showNote = shouldShowNote(version)
    const stayCount = version.summary?.stay_count || 0
    const activityCount = version.summary?.activity_count || 0

    return (
        <li>
            <div
                className={`relative rounded-xl border bg-natural-white overflow-hidden transition-all ${
                    isFirst
                        ? 'border-primary-default/30 shadow-[0_2px_12px_rgba(99,72,255,0.08)]'
                        : 'border-feature-card-border hover:border-primary-default/30'
                }`}
            >
                {/* Top accent bar — brand-coloured strip identifies a manual save at a glance.
                    "Latest" gets a fuller gradient; older saves get a thinner one-shade bar. */}
                {isFirst ? (
                    <div className="h-1 bg-gradient-to-r from-primary-default via-violet-500 to-indigo-400" />
                ) : (
                    <div className="h-0.5 bg-primary-default/20" />
                )}

                {/* Header strip — bookmark icon, time, author, latest badge */}
                <div
                    className={`px-3.5 py-2.5 flex items-center gap-2 border-b border-feature-card-border/60 ${
                        isFirst ? 'bg-primary-default/[0.04]' : 'bg-grey-6/20'
                    }`}
                >
                    <BookmarkCheck
                        className={`w-3.5 h-3.5 shrink-0 ${
                            isFirst ? 'text-primary-default' : 'text-grey-2'
                        }`}
                        aria-hidden
                    />
                    <span
                        className="text-[13px] font-semibold font-manrope text-grey-0 tabular-nums"
                        title={ts.absolute}
                    >
                        {time}
                    </span>
                    {version.author?.name && (
                        <>
                            <span className="text-grey-3 text-[12px]">·</span>
                            <span className="text-[12px] text-grey-1 font-manrope truncate">
                                {version.author.name}
                            </span>
                        </>
                    )}
                    {isFirst && (
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary-default bg-primary-default/10 px-2 py-0.5 rounded-full font-manrope">
                            Latest
                        </span>
                    )}
                    {version.is_pinned && !isFirst && (
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-manrope inline-flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5" />
                            Pinned
                        </span>
                    )}
                    {/* Pin/unpin toggle — pinned versions show solid pin always; unpinned show outline icon on hover.
                        Sits before Delete because pinned items can't be deleted. */}
                    <button
                        onClick={onTogglePin}
                        disabled={isPinning}
                        className={`${
                            isFirst || version.is_pinned ? '' : 'ml-auto'
                        } shrink-0 p-1 rounded-md transition-colors disabled:opacity-60 ${
                            version.is_pinned
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-grey-2 hover:text-amber-600 hover:bg-amber-50'
                        }`}
                        aria-label={version.is_pinned ? 'Unpin version' : 'Pin version'}
                        title={version.is_pinned ? 'Unpin' : 'Pin this milestone'}
                    >
                        {isPinning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : version.is_pinned ? (
                            <Pin className="w-3.5 h-3.5 fill-amber-500" />
                        ) : (
                            <Pin className="w-3.5 h-3.5" />
                        )}
                    </button>
                    {canDelete && !version.is_pinned && (
                        <button
                            onClick={onDelete}
                            disabled={isDeleting}
                            className="shrink-0 p-1 rounded-md hover:bg-red-50 text-grey-2 hover:text-red-500 transition-colors disabled:opacity-60"
                            aria-label="Delete version"
                            title="Delete version"
                        >
                            {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                            )}
                        </button>
                    )}
                </div>

                {/* Body — three information pillars in priority order:
                    (1) Trip dates + day count   ← when the trip happens
                    (2) City route with nights   ← shape of the trip
                    (3) Stays / activities       ← what's curated inside           */}
                <div className="px-3.5 py-3 space-y-2.5">
                    {/* Title (user's name for the version) */}
                    <h3 className="text-[14px] font-semibold font-manrope text-grey-0 line-clamp-2">
                        {version.name}
                    </h3>

                    {/* Note (italic, smaller) */}
                    {showNote && (
                        <p className="text-[13px] text-grey-1 font-manrope line-clamp-2 italic">
                            "{version.note}"
                        </p>
                    )}

                    {/* (1) Trip dates — prominent because users navigate by "the trip in May" */}
                    {dateRange && (
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="text-[13px] font-semibold font-manrope text-grey-0">
                                {dateRange}
                            </span>
                            {dayCount ? (
                                <span className="text-[12px] text-grey-1 font-manrope">
                                    · {dayCount} {dayCount === 1 ? 'day' : 'days'}
                                </span>
                            ) : null}
                        </div>
                    )}

                    {/* (2) City route — CityRouteBar-inspired layout with nights per segment.
                            Falls back to the simple chip when only unique-city names exist. */}
                    {segments.length > 0 ? (
                        <CitySegmentRoute segments={segments} country={country} />
                    ) : cities.length > 0 ? (
                        <div className="px-2 py-1.5 rounded-md bg-rose-50/60">
                            <CityRoute cities={cities} country={country} />
                        </div>
                    ) : null}

                    {/* (3) Curated counts — only stays + activities. The raw slot
                        count is intentionally omitted: it just measures how many
                        time-blocks the day has, which doesn't help users decide
                        whether to restore a version. */}
                    {(stayCount > 0 || activityCount > 0) && (
                        <div className="flex flex-wrap gap-1.5">
                            {stayCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-sky-50 text-sky-700 text-[11px] font-medium font-manrope">
                                    <BedDouble className="w-3 h-3" />
                                    {stayCount} {stayCount === 1 ? 'stay' : 'stays'}
                                </span>
                            )}
                            {activityCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium font-manrope">
                                    <Sparkles className="w-3 h-3" />
                                    {activityCount}{' '}
                                    {activityCount === 1 ? 'activity' : 'activities'}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions footer */}
                <div className="px-3.5 py-2 border-t border-feature-card-border/60 bg-grey-6/30 flex items-center gap-1">
                    <button
                        onClick={onPreview}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium font-manrope text-grey-0 hover:bg-grey-5 rounded-md transition-colors"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                    </button>
                    <button
                        onClick={onRestore}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold font-manrope text-natural-white bg-primary-default hover:bg-primary-default/90 rounded-md transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                    </button>
                </div>
            </div>
        </li>
    )
}

/**
 * Auto-save — Google-Sheets-style minimal row. Just a timestamp; click reveals
 * the actions. No icon, no description text. The day-header above tells the
 * user what day it's from; that's enough context for an auto-save.
 */
function AutoVersionRow({
    version,
    canDelete,
    isDeleting,
    isPinning,
    onPreview,
    onRestore,
    onDelete,
    onTogglePin,
}: VersionCardProps) {
    const time = formatVersionTime(version.created_at)
    const ts = formatVersionTimestamp(version.created_at)

    return (
        <li>
            <div
                className={`pl-4 pr-2 py-1.5 rounded-md flex items-center gap-2 group/auto transition-colors ${
                    version.is_pinned ? 'bg-amber-50/60' : 'hover:bg-grey-6/60'
                }`}
                title={ts.absolute}
            >
                {/* Tiny dot — visual marker that this is a timestamp entry */}
                {version.is_pinned ? (
                    <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" aria-hidden />
                ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-grey-3 shrink-0" aria-hidden />
                )}

                <span className="text-[12px] text-grey-1 font-manrope tabular-nums">
                    {time}
                </span>

                {/* Actions appear on hover (or always when pinned) */}
                <div
                    className={`ml-auto flex items-center gap-0.5 transition-opacity ${
                        version.is_pinned ? 'opacity-100' : 'opacity-0 group-hover/auto:opacity-100'
                    }`}
                >
                    <button
                        onClick={onTogglePin}
                        disabled={isPinning}
                        className={`p-1 rounded transition-colors disabled:opacity-60 ${
                            version.is_pinned
                                ? 'text-amber-600 hover:bg-amber-100'
                                : 'text-grey-2 hover:text-amber-600 hover:bg-amber-50'
                        }`}
                        aria-label={version.is_pinned ? 'Unpin' : 'Pin'}
                        title={version.is_pinned ? 'Unpin' : 'Pin this backup'}
                    >
                        {isPinning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : version.is_pinned ? (
                            <PinOff className="w-3.5 h-3.5" />
                        ) : (
                            <Pin className="w-3.5 h-3.5" />
                        )}
                    </button>
                    <button
                        onClick={onPreview}
                        className="p-1 rounded text-grey-2 hover:text-grey-0 hover:bg-grey-5 transition-colors"
                        aria-label="Preview"
                        title="Preview"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onRestore}
                        className="p-1 rounded text-grey-2 hover:text-grey-0 hover:bg-grey-5 transition-colors"
                        aria-label="Undo to here"
                        title="Undo to here"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    {canDelete && !version.is_pinned && (
                        <button
                            onClick={onDelete}
                            disabled={isDeleting}
                            className="p-1 rounded text-grey-2 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
                            aria-label="Delete"
                            title="Delete"
                        >
                            {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                            )}
                        </button>
                    )}
                </div>
            </div>
        </li>
    )
}

/**
 * CityRouteBar-style segment row — "Ubud · 4 nights → Seminyak · 3 nights".
 * Mirrors the visual language of the Itinerary tab so users instantly
 * recognise the trip's shape from the version card.
 */
function CitySegmentRoute({
    segments,
    country,
}: {
    segments: { name: string; nights: number }[]
    country?: string | null
}) {
    const visible = segments.slice(0, 3)
    const overflow = segments.length - visible.length
    const isSingleStay = segments.length === 1

    return (
        <div className="px-2.5 py-2 rounded-md bg-rose-50/60 flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex items-center gap-1 min-w-0 flex-wrap text-[12px] font-manrope">
                {visible.map((seg, i) => {
                    const nightsLabel = `${seg.nights} ${seg.nights === 1 ? 'night' : 'nights'}`
                    return (
                        <span key={`${seg.name}-${i}`} className="inline-flex items-center gap-1">
                            <span className="font-semibold text-rose-700">{seg.name}</span>
                            <span className="text-rose-500/80">· {nightsLabel}</span>
                            {i < visible.length - 1 && (
                                <ChevronRight className="w-3.5 h-3.5 text-rose-400 mx-0.5" />
                            )}
                        </span>
                    )
                })}
                {isSingleStay && country && (
                    <span className="text-rose-500/80">in {country}</span>
                )}
                {overflow > 0 && (
                    <span className="ml-1 text-rose-500/80">+{overflow} more</span>
                )}
            </div>
        </div>
    )
}

/**
 * Compact horizontal route — "Mumbai › Goa › Bangalore" with overflow handling.
 * Single-city trips render as "Ubud, Indonesia" so the chip carries a sense
 * of place even when there's no route to draw.
 */
function CityRoute({ cities, country }: { cities: string[]; country?: string | null }) {
    const visible = cities.slice(0, 4)
    const overflow = cities.length - visible.length
    const isSingleCity = cities.length === 1

    return (
        <div className="flex items-center gap-1.5 text-[12px] font-manrope">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <div className="flex items-center gap-0.5 min-w-0 flex-wrap">
                {visible.map((city, i) => (
                    <span key={`${city}-${i}`} className="inline-flex items-center gap-0.5">
                        <span className="font-semibold text-rose-700">{city}</span>
                        {i < visible.length - 1 && (
                            <ChevronRight className="w-3 h-3 text-rose-400" />
                        )}
                    </span>
                ))}
                {/* For single-city trips, show the country inline ("Ubud, Indonesia") */}
                {isSingleCity && country && (
                    <span className="ml-0.5 text-rose-500/80">, {country}</span>
                )}
                {overflow > 0 && (
                    <span className="ml-1 text-rose-500/80">+{overflow} more</span>
                )}
            </div>
        </div>
    )
}
