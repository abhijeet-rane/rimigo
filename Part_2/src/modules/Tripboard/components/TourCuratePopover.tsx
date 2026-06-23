import { useEffect, useState } from 'react'
import { AlertTriangle, Globe, Loader2, Sparkles, User } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogTitle, DialogDescription, DialogPortal } from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useTourRecommendationMutation, useTourPriceOverrideMutation, useTourPriceOverride, useTripOwnerName } from '@/modules/Tripboard/context/TripCollectionRecommendationsContext'
import { updateMapping, type MappingPatchResponse } from '@/modules/Experiences/api/tourMappingApi'
import type { AdaptedTourResponseType, ToursResponseType } from '@/modules/Experiences/types/toursResponseTypes'

interface TourCuratePopoverProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    tour: AdaptedTourResponseType
    experienceId: string
    /** null when not on a collection page — hides the per-tripboard section. */
    collectionIdentifier: string | null
    /** Optional: forwarded to the tours query cache key so the cache update lands on the same row. */
    checkIn?: string | null
}

interface ToggleRowProps {
    label: string
    checked: boolean
    disabled?: boolean
    onChange: (next: boolean) => void
    description?: string
    ariaLabel?: string
}

// Compact one-row toggle: label on left, switch right-aligned. Optional accent tints the ON state.
type ToggleAccent = 'primary' | 'sky' | 'emerald'
const accentBg: Record<ToggleAccent, string> = {
    primary: 'bg-primary-default',
    sky: 'bg-sky-500',
    emerald: 'bg-emerald-500'
}
const ToggleRow = ({
    label,
    checked,
    disabled,
    onChange,
    ariaLabel,
    accent = 'primary'
}: ToggleRowProps & { accent?: ToggleAccent }) => {
    // A locked-on row (disabled + checked) reads as "intentionally on, not editable" —
    // keep it at full opacity so the active accent pill stays visible. Disabled-and-off
    // still fades to signal the row can't be flipped.
    const isLockedOn = disabled && checked
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel ?? label}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`w-full flex items-center justify-between gap-3 py-1.5 text-left ${
                disabled ? (isLockedOn ? 'cursor-not-allowed' : 'opacity-50 cursor-not-allowed') : 'cursor-pointer'
            }`}>
            <span className="font-red-hat-display text-[12.5px] font-semibold text-grey-0 leading-tight">{label}</span>
            <span
                className={`relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full transition-colors ${
                    checked ? accentBg[accent] : 'bg-grey-3'
                }`}>
                <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        checked ? 'translate-x-[15px]' : 'translate-x-[2px]'
                    }`}
                />
            </span>
        </button>
    )
}

const TourCuratePopover = ({ open, onOpenChange, tour, experienceId, collectionIdentifier, checkIn }: TourCuratePopoverProps) => {
    const queryClient = useQueryClient()
    const recommendationMutation = useTourRecommendationMutation()
    const priceMutation = useTourPriceOverrideMutation()
    const existingOverride = useTourPriceOverride(experienceId, tour.id)
    const tripOwnerName = useTripOwnerName()
    const ownerLabel = tripOwnerName || 'Traveler'

    // Currency the override inherits from the tour's live price; null falls back to the budget's
    // existing per-experience currency server-side.
    const currentCurrency = tour.price?.currency ?? null

    // Local pending state for the per-collection toggle (the underlying mutation already manages
    // optimistic cache updates; we just track the user's intent for the toggle's visual state).
    const [forYouChecked, setForYouChecked] = useState(!!tour.is_personally_recommended)
    const [priceInput, setPriceInput] = useState<string>(existingOverride ? String(existingOverride.price) : '')

    // Every tour returned by the /experience/{id}/tours/ endpoint is published
    // by construction (server-side filter on visibility_info.is_published_on_rimigo),
    // so we initialise published=true and the toggle off-flip cascades is_recommended=false.
    const initialRecommended = !!tour.is_recommended

    const [recommended, setRecommended] = useState(initialRecommended)
    const [published, setPublished] = useState(true)

    // Confirmation dialogs.
    const [confirmGlobalOpen, setConfirmGlobalOpen] = useState(false)
    /** Direction of the pending global Recommend toggle — drives both the modal copy and the
     *  action that fires on confirm. `null` when no confirm is open. */
    const [pendingRecommendNext, setPendingRecommendNext] = useState<boolean | null>(null)
    const [confirmUnpublishOpen, setConfirmUnpublishOpen] = useState(false)
    const [promotePromptOpen, setPromotePromptOpen] = useState(false)

    // Reset local state whenever the popover opens for a different tour or after a successful save.
    useEffect(() => {
        if (open) {
            setForYouChecked(!!tour.is_personally_recommended)
            setRecommended(!!tour.is_recommended)
            setPublished(true)
            setPriceInput(existingOverride ? String(existingOverride.price) : '')
        }
    }, [open, tour.id, tour.is_personally_recommended, tour.is_recommended, existingOverride?.price])

    // Every tour visible on this surface comes from a published mapping —
    // the /tours endpoint attaches the mapping id directly, so we can PATCH
    // straight against it. No lazy lookup, no upsert.
    const mappingId = tour.mapping_id ?? null
    const canMutateGlobal = !!mappingId

    // PATCH mutation — flips ``recommendation_info.is_recommended`` and/or
    // ``visibility_info.is_published_on_rimigo``. Unpublishing also clears
    // is_recommended in the same call (backend invariant: recommended ⇒ published).
    const patchMutation = useMutation<
        MappingPatchResponse,
        unknown,
        {
            recommendation_info?: { is_recommended: boolean; description?: string | null }
            visibility_info?: { is_published_on_rimigo: boolean; description?: string | null }
        }
    >({
        mutationFn: async (payload) => {
            if (!mappingId) throw new Error('Missing mapping_id')
            return updateMapping(mappingId, payload)
        },
        onSuccess: (data) => {
            const isPub = data.visibility_info.is_published_on_rimigo
            const isRec = data.recommendation_info.is_recommended
            // Once unpublished, the tour stops surfacing on /tours — drop it from
            // the cache so the parent list re-renders without it. Otherwise just
            // update the is_recommended boolean inline.
            const toursKey = ['tours', experienceId, checkIn] as const
            queryClient.setQueryData<ToursResponseType | undefined>(toursKey, (cached) => {
                if (!cached) return cached
                if (!isPub) {
                    return { ...cached, tours: cached.tours.filter((t) => t.id !== tour.id) }
                }
                const nextTours = cached.tours.map((t) => {
                    if (t.id !== tour.id) return t
                    return { ...t, is_recommended: isRec }
                })
                return { ...cached, tours: nextTours }
            })

            setRecommended(isRec)
            setPublished(isPub)
            toast.success('Curation saved')
            if (!isPub) onOpenChange(false)
        },
        onError: () => {
            toast.error('Could not save curation. Please try again.')
            setRecommended(initialRecommended)
            setPublished(true)
        }
    })

    // ─── Per-tripboard handler ───────────────────────────────────────────────
    const handleForYouToggle = (next: boolean) => {
        setForYouChecked(next)
        recommendationMutation.toggle({
            experienceId,
            tourId: tour.id,
            isCurrentlyRecommended: !next, // we want next; the helper inverts
            mappingId: tour.mapping_id ?? null
        })
        // Upsell prompt: if turning ON for this trip and not already globally recommended, ask if
        // they'd like to promote it to all travelers.
        if (next && canMutateGlobal && !recommended) {
            setPromotePromptOpen(true)
        }
    }

    // ─── Per-tripboard price override handlers ───────────────────────────────
    const handleSavePrice = () => {
        const trimmed = priceInput.trim()
        if (trimmed === '') return
        const parsed = Number(trimmed)
        if (!Number.isFinite(parsed) || parsed < 0) return
        priceMutation.setPrice({ experienceId, tourId: tour.id, price: parsed, currency: currentCurrency })
    }

    const handleClearPrice = () => {
        setPriceInput('')
        priceMutation.clearPrice({ experienceId, tourId: tour.id })
    }

    // ─── Global toggle handlers ───────────────────────────────────────────────
    const runRecommendedOn = () => {
        setRecommended(true)
        patchMutation.mutate({ recommendation_info: { is_recommended: true } })
    }

    const runRecommendedOff = () => {
        setRecommended(false)
        patchMutation.mutate({ recommendation_info: { is_recommended: false } })
    }

    const handleRecommendedToggle = (next: boolean) => {
        if (!canMutateGlobal) return
        // Both ON and OFF are confirmed — this is high-stakes (affects every tripboard).
        setPendingRecommendNext(next)
        setConfirmGlobalOpen(true)
    }

    // Unpublishing removes the tour from /tours for everyone. Cascade
    // is_recommended → false in the same PATCH (recommended ⇒ published).
    // Re-publishing isn't reachable from here (unpublished tours don't surface).
    const runUnpublish = () => {
        setPublished(false)
        setRecommended(false)
        patchMutation.mutate({
            visibility_info: { is_published_on_rimigo: false },
            recommendation_info: { is_recommended: false },
        })
    }

    const handlePublishedToggle = (next: boolean) => {
        if (!canMutateGlobal) return
        if (next) return // unreachable on this surface — guard anyway
        setConfirmUnpublishOpen(true)
    }

    const showForThisTrip = !!collectionIdentifier
    const isGlobalBusy = patchMutation.isPending

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}>
            {/* Portal + explicit z-[1410] so the popover stacks above the SneakPeek modal (z-[1310]).
                The default DialogContent sits at z-50/z-71 and would render behind. */}
            <DialogPortal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-[1400] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[1410] flex flex-col gap-0 w-full max-w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-lg overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                <DialogTitle className="sr-only">Curate this tour</DialogTitle>

                {/* Header — flat, single row */}
                <div className="px-3.5 pt-2.5 pb-2 border-b border-grey-4 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-primary-default shrink-0" />
                        <span className="font-red-hat-display text-[12px] font-bold text-grey-0 uppercase tracking-[0.06em]">Curate</span>
                    </div>
                    <div
                        className="mt-0.5 font-manrope text-[11px] text-grey-1 truncate"
                        title={tour.name ?? undefined}>
                        {tour.name ?? 'Tour'}
                    </div>
                </div>

                {/* ─── FOR THIS TRIP — sky accent stripe on the left. */}
                {showForThisTrip && (
                    <div className="px-3.5 py-2 border-l-[3px] border-sky-400 bg-sky-50/40 border-b border-grey-4 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5 min-w-0">
                            <User className="w-2.5 h-2.5 text-sky-700 shrink-0" />
                            <span className="font-manrope text-[9.5px] font-bold uppercase tracking-[0.1em] text-sky-700 truncate">For this trip</span>
                        </div>
                        <ToggleRow
                            label={`Recommend for ${ownerLabel}`}
                            ariaLabel="Recommend for this tripboard"
                            checked={forYouChecked}
                            disabled={recommendationMutation.isPending}
                            onChange={handleForYouToggle}
                            accent="sky"
                        />

                        {/* Per-trip price override — re-prices the selected tour on the budget tab. */}
                        <div className="mt-1 pt-1.5 border-t border-grey-4/40">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-red-hat-display text-[12.5px] font-semibold text-grey-0 leading-tight">{`Price for ${ownerLabel}`}</span>
                                {existingOverride && (
                                    <button
                                        type="button"
                                        onClick={handleClearPrice}
                                        disabled={priceMutation.isPending}
                                        className="font-manrope text-[10px] font-semibold text-sky-700 hover:underline disabled:opacity-50 cursor-pointer">
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                                <div className="flex flex-1 items-center gap-1 rounded border border-grey-4 px-1.5 py-1 focus-within:border-sky-400">
                                    {currentCurrency && <span className="font-manrope text-[11px] text-grey-2 shrink-0">{currentCurrency}</span>}
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        value={priceInput}
                                        onChange={(e) => setPriceInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSavePrice()
                                        }}
                                        placeholder={tour.price?.min_price != null ? String(tour.price.min_price) : 'Set price'}
                                        aria-label="Price for this trip"
                                        className="w-full bg-transparent font-manrope text-[12px] text-grey-0 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSavePrice}
                                    disabled={priceMutation.isPending || priceInput.trim() === ''}
                                    className="rounded bg-sky-500 px-2.5 py-1 font-manrope text-[11px] font-semibold text-white hover:bg-sky-600 transition-colors disabled:opacity-50 cursor-pointer">
                                    Save
                                </button>
                            </div>
                            <div className="mt-1 font-manrope text-[9.5px] text-grey-2 leading-snug">
                                Overrides the budget price for this tour when it's the one shown on this trip.
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── FOR ALL OF RIMIGO — amber accent stripe + inline warning. */}
                <div className="px-3.5 py-2 border-l-[3px] border-amber-400 bg-amber-50/40 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 mb-0.5 min-w-0">
                        <div className="flex items-center gap-1 min-w-0">
                            <Globe className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                            <span className="font-manrope text-[9.5px] font-bold uppercase tracking-[0.1em] text-amber-700 truncate">For all of Rimigo</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                            <span className="font-manrope text-[9.5px] text-amber-700">Affects all</span>
                            {isGlobalBusy && <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-700 ml-1" />}
                        </div>
                    </div>
                    <ToggleRow
                        label="Recommend for everyone"
                        ariaLabel="Recommend for everyone"
                        checked={recommended}
                        disabled={!canMutateGlobal || isGlobalBusy}
                        onChange={handleRecommendedToggle}
                        accent="primary"
                    />
                    <div className="border-t border-grey-4/40" />
                    {/* Unpublishing pulls the tour off /tours for every traveler — confirmed.
                        Re-publishing here can't happen because an unpublished tour wouldn't
                        be on this surface to begin with. */}
                    <ToggleRow
                        label="Published on Rimigo"
                        ariaLabel="Published on Rimigo"
                        checked={published}
                        disabled={!canMutateGlobal || isGlobalBusy}
                        onChange={handlePublishedToggle}
                        accent="emerald"
                    />
                </div>
                </DialogPrimitive.Content>
            </DialogPortal>

            {/* Confirm dialogs — compact iOS-style action sheet: one-line title, terse body,
                horizontally split action footer. No overlay (parent popover already darkens). */}
            <Dialog
                open={confirmGlobalOpen}
                onOpenChange={(open) => {
                    setConfirmGlobalOpen(open)
                    if (!open) setPendingRecommendNext(null)
                }}>
                <DialogPortal>
                    <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[1500] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-md bg-white shadow-xl overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                        <div
                            className={`h-0.5 ${pendingRecommendNext === false ? 'bg-secondary-red' : 'bg-primary-default'}`}
                        />
                        <div className="px-3.5 pt-3 pb-2.5 text-center">
                            <DialogTitle className="font-red-hat-display text-[13px] font-bold text-grey-0 leading-tight">
                                {pendingRecommendNext === false ? 'Remove from everyone?' : 'Recommend for everyone?'}
                            </DialogTitle>
                            <DialogDescription className="mt-1 font-manrope text-[11px] text-grey-2 leading-snug">
                                {pendingRecommendNext === false
                                    ? 'Removes the Recommended tag from every Rimigo tripboard.'
                                    : 'Shows the Recommended tag on every Rimigo tripboard.'}
                            </DialogDescription>
                        </div>
                        <div className="flex border-t border-grey-4 divide-x divide-grey-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setConfirmGlobalOpen(false)
                                    setPendingRecommendNext(null)
                                }}
                                className="flex-1 py-2 font-manrope text-[12px] font-medium text-grey-1 hover:bg-grey-5/60 cursor-pointer transition-colors">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const direction = pendingRecommendNext
                                    setConfirmGlobalOpen(false)
                                    setPendingRecommendNext(null)
                                    if (direction === false) runRecommendedOff()
                                    else runRecommendedOn()
                                }}
                                className={`flex-1 py-2 font-manrope text-[12px] font-semibold cursor-pointer transition-colors ${
                                    pendingRecommendNext === false
                                        ? 'text-secondary-red hover:bg-secondary-red/5'
                                        : 'text-primary-default hover:bg-primary-pale-purple/40'
                                }`}>
                                {pendingRecommendNext === false ? 'Remove' : 'Recommend'}
                            </button>
                        </div>
                    </DialogPrimitive.Content>
                </DialogPortal>
            </Dialog>

            {/* Unpublish confirm — high-stakes: pulls the tour off /tours for every traveler. */}
            <Dialog
                open={confirmUnpublishOpen}
                onOpenChange={setConfirmUnpublishOpen}>
                <DialogPortal>
                    <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[1500] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-md bg-white shadow-xl overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                        <div className="h-0.5 bg-secondary-red" />
                        <div className="px-3.5 pt-3 pb-2.5 text-center">
                            <DialogTitle className="font-red-hat-display text-[13px] font-bold text-grey-0 leading-tight">
                                Unpublish from Rimigo?
                            </DialogTitle>
                            <DialogDescription className="mt-1 font-manrope text-[11px] text-grey-2 leading-snug">
                                Hides this tour from every Rimigo tripboard. Any "Recommended" tag is also cleared.
                            </DialogDescription>
                        </div>
                        <div className="flex border-t border-grey-4 divide-x divide-grey-4">
                            <button
                                type="button"
                                onClick={() => setConfirmUnpublishOpen(false)}
                                className="flex-1 py-2 font-manrope text-[12px] font-medium text-grey-1 hover:bg-grey-5/60 cursor-pointer transition-colors">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setConfirmUnpublishOpen(false)
                                    runUnpublish()
                                }}
                                className="flex-1 py-2 font-manrope text-[12px] font-semibold text-secondary-red hover:bg-secondary-red/5 cursor-pointer transition-colors">
                                Unpublish
                            </button>
                        </div>
                    </DialogPrimitive.Content>
                </DialogPortal>
            </Dialog>

            {/* Upsell after recommending for the trip's traveler. */}
            <Dialog
                open={promotePromptOpen}
                onOpenChange={setPromotePromptOpen}>
                <DialogPortal>
                    <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[1500] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-md bg-white shadow-xl overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                        <div className="h-0.5 bg-sky-400" />
                        <div className="px-3.5 pt-3 pb-2.5 text-center">
                            <DialogTitle className="font-red-hat-display text-[13px] font-bold text-grey-0 leading-tight">
                                Recommend for everyone too?
                            </DialogTitle>
                            <DialogDescription className="mt-1 font-manrope text-[11px] text-grey-2 leading-snug">
                                Mark this tour as recommended across all Rimigo tripboards.
                            </DialogDescription>
                        </div>
                        <div className="flex border-t border-grey-4 divide-x divide-grey-4">
                            <button
                                type="button"
                                onClick={() => setPromotePromptOpen(false)}
                                className="flex-1 py-2 font-manrope text-[12px] font-medium text-grey-1 hover:bg-grey-5/60 cursor-pointer transition-colors">
                                Just this trip
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPromotePromptOpen(false)
                                    runRecommendedOn()
                                }}
                                className="flex-1 py-2 font-manrope text-[12px] font-semibold text-primary-default hover:bg-primary-pale-purple/40 cursor-pointer transition-colors">
                                Yes, recommend
                            </button>
                        </div>
                    </DialogPrimitive.Content>
                </DialogPortal>
            </Dialog>
        </Dialog>
    )
}

export default TourCuratePopover
