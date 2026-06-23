import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { fetchRatesHistogram } from '@/pages/Stays/Services/RatesHistogram'
import { updateTripPartial } from '@/api/trip/tripAPI'
import type { GuestsData } from '@/components/common/SearchBar/modals/GuestsModal'
import { PriceRangeSlider } from '@/pages/Stays/Components/PriceRangeSlider'
import { useIsMobile } from '@/hooks/use-mobile'

export interface BudgetRange {
    min: number
    max: number
}

interface StaysTabFilterModalProps {
    isOpen: boolean
    onClose: () => void
    anchorRef: React.RefObject<HTMLElement | null>
    cityId: string
    checkIn: string
    checkOut: string
    guestsData: GuestsData
    initialRange?: BudgetRange
    onApply: (range: BudgetRange) => void
    /** Trip context for "Save to Trip" — when omitted, button is hidden. */
    tripId?: string
    /** Existing trip-level budget range; merged on save so other cities + top-level min/max are preserved. */
    existingStayBudgetRange?: {
        min: number
        max: number
        city_wise_preferences?: Record<string, BudgetRange>
    }
    /** Called after a successful "Save to Trip" — caller typically clears its in-memory override. */
    onSavedToTrip?: (range: BudgetRange) => void
}

export const StaysTabFilterModal = ({
    isOpen,
    onClose,
    anchorRef,
    cityId,
    checkIn,
    checkOut,
    guestsData,
    initialRange,
    onApply,
    tripId,
    existingStayBudgetRange,
    onSavedToTrip,
}: StaysTabFilterModalProps) => {
    const isMobile = useIsMobile()
    const queryClient = useQueryClient()
    const [draftRange, setDraftRange] = useState<BudgetRange | undefined>(initialRange)
    const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null)
    const modalContentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen) setDraftRange(initialRange)
    }, [isOpen, initialRange])

    // useLayoutEffect (not useEffect) so position is set before the browser paints
    // the first frame — avoids the brief top-left flicker on open.
    useLayoutEffect(() => {
        if (!isOpen || isMobile) {
            // Reset on close so next open starts hidden until repositioned.
            setModalPosition(null)
            return
        }
        if (!anchorRef.current) return
        const rect = anchorRef.current.getBoundingClientRect()
        setModalPosition({
            top: rect.bottom + window.scrollY + 8,
            left: rect.left + window.scrollX,
        })
    }, [isOpen, isMobile, anchorRef])

    // Same query key as StaysExploreSection so React Query dedupes the fetch.
    const ratesQuery = useQuery({
        queryKey: [
            'explore-rates',
            cityId,
            checkIn,
            checkOut,
            guestsData.adults,
            guestsData.children,
            guestsData.infants,
            (guestsData.children_age ?? []).join(','),
        ],
        queryFn: () =>
            fetchRatesHistogram({
                cityId,
                check_in: checkIn,
                check_out: checkOut,
                num_adults: guestsData.adults,
                child_ages: guestsData.children_age,
                num_infants: guestsData.infants,
            }),
        enabled: isOpen && Boolean(cityId && checkIn && checkOut),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 2,
    })

    const saveMutation = useMutation({
        mutationFn: async (range: BudgetRange) => {
            if (!tripId) throw new Error('Missing tripId')
            const merged = {
                min: existingStayBudgetRange?.min ?? 0,
                max: existingStayBudgetRange?.max ?? 0,
                city_wise_preferences: {
                    ...(existingStayBudgetRange?.city_wise_preferences ?? {}),
                    [cityId]: range,
                },
            }
            return updateTripPartial(tripId, { stay_budget_range: merged })
        },
        onSuccess: (_data, range) => {
            queryClient.invalidateQueries({ queryKey: ['travelerTrips'] })
            onSavedToTrip?.(range)
            toast.success('Saved budget for this city')
            onClose()
        },
        onError: () => {
            toast.error('Could not save budget. Please try again.')
        },
    })

    const histogramData = ratesQuery.data?.data
    const isHistogramReady =
        histogramData?.status === 'completed' || histogramData?.status === 'estimated'

    const handleApply = () => {
        if (draftRange) onApply(draftRange)
        onClose()
    }

    const handleSaveToTrip = () => {
        if (!draftRange || !tripId) return
        saveMutation.mutate(draftRange)
    }

    const isSaving = saveMutation.isPending
    const showSaveButton = Boolean(tripId)

    const body = (
        <>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold font-red-hat-display text-header-black">
                    Price per night
                </h3>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close filters"
                    className="p-1.5 rounded-full hover:bg-grey-5 transition-colors cursor-pointer">
                    <X className="w-4 h-4 text-grey-1" />
                </button>
            </div>
            <PriceRangeSlider
                data={isHistogramReady ? (histogramData as any) : undefined}
                loading={!isHistogramReady}
                initialMin={draftRange?.min}
                initialMax={draftRange?.max}
                onPriceChange={(min, max) => setDraftRange({ min, max })}
            />
            <div className="mt-6 flex flex-col gap-2">
                <button
                    type="button"
                    onClick={handleApply}
                    disabled={isSaving}
                    className="w-full py-3 bg-header-black text-white rounded-xl text-sm font-bold font-red-hat-display hover:bg-grey-0 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    Apply
                </button>
                {showSaveButton && (
                    <button
                        type="button"
                        onClick={handleSaveToTrip}
                        disabled={!draftRange || isSaving}
                        className="w-full py-3 bg-white border border-grey-4 text-header-black rounded-xl text-sm font-bold font-red-hat-display hover:bg-grey-5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSaving ? 'Saving…' : 'Save to Trip'}
                    </button>
                )}
            </div>
        </>
    )

    if (typeof document === 'undefined') return null

    // Modal stays mounted; CSS transitions handle enter/exit animation.
    // pointerEvents toggles so the offscreen sheet doesn't intercept clicks when closed.
    const overlayPointer: 'auto' | 'none' = isOpen ? 'auto' : 'none'

    const mobileSheet = (
        <>
            <div
                className="fixed inset-0 bg-black/20 transition-opacity duration-200 ease-out"
                style={{
                    zIndex: 10050,
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: overlayPointer,
                }}
                onClick={onClose}
            />
            <div
                className="fixed left-0 right-0 bottom-0 transition-transform duration-300"
                style={{
                    zIndex: 10051,
                    transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
                    transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
                    pointerEvents: overlayPointer,
                }}>
                <div
                    ref={modalContentRef}
                    className="bg-white border-t border-feature-card-border rounded-t-2xl shadow-lg w-full flex flex-col max-h-[75vh]">
                    <div className="flex justify-center pt-3 pb-1 shrink-0">
                        <div className="w-10 h-1 rounded-full bg-grey-4" />
                    </div>
                    <div className="px-6 pt-3 pb-4 overflow-y-auto flex-1 min-h-0">
                        {body}
                    </div>
                </div>
            </div>
        </>
    )

    const desktopPopover = (
        <>
            <div
                className="fixed inset-0 bg-black/20 transition-opacity duration-150 ease-out"
                style={{
                    zIndex: 10050,
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: overlayPointer,
                }}
                onClick={onClose}
            />
            <div
                className="fixed transition-[opacity,transform] duration-200 ease-out"
                style={{
                    zIndex: 10051,
                    top: modalPosition ? `${modalPosition.top}px` : 0,
                    left: modalPosition ? `${modalPosition.left}px` : 0,
                    // Hide until layout effect computes anchor-relative position to avoid
                    // a one-frame flash at (0, 0) before the position resolves.
                    visibility: isOpen && modalPosition ? 'visible' : 'hidden',
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? 'translateY(0)' : 'translateY(-4px)',
                    pointerEvents: overlayPointer,
                }}>
                <div
                    ref={modalContentRef}
                    className="bg-white border border-feature-card-border rounded-lg shadow-lg w-[420px]">
                    <div className="p-6">{body}</div>
                </div>
            </div>
        </>
    )

    return createPortal(isMobile ? mobileSheet : desktopPopover, document.body)
}

export default StaysTabFilterModal
