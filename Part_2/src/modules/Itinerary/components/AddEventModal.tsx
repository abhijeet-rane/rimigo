/**
 * Add to Itinerary composer.
 *
 * Redesigned per ``rimigo-design-system/project/Add to Itinerary.html``:
 * 880×640 landscape modal, two-column body (slot-type rail + canvas),
 * pinned bottom time strip, gradient-CTA footer. Replaces the previous
 * 680×940 five-accordion portrait layout.
 *
 * Workflow + data contract preserved end-to-end:
 *   - SelectSlotType     → ``SlotTypeRail`` (always-visible pills)
 *   - TypeSectionModalWrapper dispatches to the type-specific section
 *     (ActivitySection / TransportSection / MealSection / CustomSection)
 *   - TimePickerSection  → ``ComposerTimeStrip`` (pinned strip)
 *   - AttachFilesSection + RemarksSection live inside the canvas for
 *     every slot type (user request — notes / suggestions /
 *     attachments are universal).
 */
import { Plane, X } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { SlotType } from '../types/slotTypes'
import AttachFilesSection, { AttachFilesRef } from './AttachFilesSection'
import TypeSectionModalWrapper, { type TypeSectionHandle } from './TypeSectionModalWrapper'
import { SlotPayloadProvider } from './SlotPayloadProvider'
import { resolveSlotType, useAddSlot, useUpdateSlot } from '../hooks/ItineraryEventHook'
import { SlotPayload } from '../api/ItineraryApi'
import { toast } from 'sonner'
import { ShortlistedByTripExperienceResponse } from '@/modules/Experiences/api/experienceShortlistAPI'
import { RemarksSection } from './RemarkSection'
import { addRestaurantToFoodTab, type SlotPlaceData } from '../services/mealSlotFoodTabService'
import SlotTypeRail from './SlotTypeRail'
import ComposerTimeStrip from './ComposerTimeStrip'

interface Props {
    isOpen: boolean
    onClose: () => void
    tripId: string
    start?: Date
    shortlistedExpercience: ShortlistedByTripExperienceResponse | undefined
    itineraryId: string
    end?: Date
    slot?: any
    baseCity?: {
        id: string
        name: string
        country: string
    }
    /** After a successful edit save (e.g. Kanban "Custom" time) — not called for add flow */
    onEditSaveSuccess?: (payload: { slotId: string; start_time: string; end_time: string }) => void
}

const AddEventModal: React.FC<Props> = ({
    isOpen,
    onClose,
    tripId,
    start,
    end,
    baseCity,
    itineraryId,
    slot,
    shortlistedExpercience,
    onEditSaveSuccess
}) => {
    const [slotType, setSlotType] = useState<SlotType>(() => resolveSlotType(slot?.kind))
    const [validationError, setValidationError] = useState<string>('')
    const remarksRef = useRef<SlotPayloadProvider>(null)

    useEffect(() => {
        if (slot?.kind) {
            setSlotType(resolveSlotType(slot.kind))
        }
    }, [slot])

    const isEditMode = Boolean(slot?.slot_id)

    const [timeRange, setTimeRange] = useState(() => {
        if (slot?.start_time && slot?.end_time) {
            return {
                start: new Date(slot.start_time),
                end: new Date(slot.end_time)
            }
        }
        if (start && end) {
            return { start, end }
        }
        const startDate = new Date()
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
        return { start: startDate, end: endDate }
    })

    useEffect(() => {
        if (slot?.start_time && slot?.end_time) {
            setTimeRange({
                start: new Date(slot.start_time),
                end: new Date(slot.end_time)
            })
        } else if (start && end) {
            setTimeRange({ start, end })
        }
    }, [slot, start, end])

    // Clear validation error when slot type changes
    useEffect(() => {
        setValidationError('')
    }, [slotType])

    const slotProviderRef = useRef<TypeSectionHandle>(null)
    const attachFilesRef = useRef<AttachFilesRef>(null)
    const canvasRef = useRef<HTMLDivElement>(null)

    const [, setSearchParams] = useSearchParams()

    // True while a commercial flight (kind === 'flight') is the picked
    // transport mode — flips the primary CTA to "Search flights" (handoff)
    // instead of "Add to itinerary" (manual create). Reset when the slot
    // type leaves transport so a stale flag can't survive a type switch.
    const [isFlightSearchMode, setIsFlightSearchMode] = useState(false)
    useEffect(() => {
        if (slotType.value !== 'transport') setIsFlightSearchMode(false)
    }, [slotType])

    // When a validation error appears, scroll the canvas to the top
    useEffect(() => {
        if (!validationError) return
        canvasRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }, [validationError])

    const { mutate: addSlotMutate, isPending: isAdding } = useAddSlot(tripId, itineraryId)
    const { mutate: updateSlotMutate, isPending: isUpdating } = useUpdateSlot(tripId, itineraryId)

    const buildPayload = (): SlotPayload | null => {
        const typePayload = slotProviderRef.current?.getPayload()

        if (!typePayload) {
            setValidationError('Please complete slot details')
            return null
        }

        if (!timeRange.start || !timeRange.end) {
            toast.error('Start and End time must be defined')
            return null
        }

        const attachments = attachFilesRef.current?.getAttachments() || []
        const remarksPayload = remarksRef.current?.getPayload() || {}
        const suggestion_reasons = remarksPayload.suggestions || []

        setValidationError('')

        return {
            start_time: timeRange.start.toISOString(),
            end_time: timeRange.end.toISOString(),
            kind: slotType.value,
            ...typePayload,
            attachments,
            notes: remarksPayload.notes,
            suggestion_reasons
        }
    }

    // Slot day as ``YYYY-MM-DD`` (UTC) — seeds the flight-search date field
    // and the ephemeral leg handed to the Flights tab.
    const slotDate = timeRange.start.toISOString().slice(0, 10)

    // Commercial-flight handoff: don't create a slot. Switch to the Flights
    // tab and pass the ephemeral search leg via URL params; FlightsTab reads
    // them, runs the search, then clears them so nothing is persisted.
    const handleSearchFlights = () => {
        const search = slotProviderRef.current?.getFlightSearch()
        if (!search) {
            setValidationError('Pick a From airport, a To airport, and a date')
            return
        }
        setValidationError('')
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                next.set('tab', 'flights')
                next.set('flsearch_from', search.from)
                next.set('flsearch_to', search.to)
                next.set('flsearch_date', search.date)
                next.delete('itineraryDay')
                next.delete('itineraryMap')
                next.delete('itineraryBoard')
                return next
            },
            { replace: false }
        )
        onClose()
    }

    const handlePrimaryAction = () => {
        // Reroute only on the ADD flow for a commercial flight; editing an
        // existing slot always saves.
        if (isFlightSearchMode && !isEditMode) {
            handleSearchFlights()
            return
        }
        handleSaveSlot()
    }

    const handleSaveSlot = () => {
        const payload = buildPayload()
        if (!payload) return

        if (isEditMode) {
            updateSlotMutate(
                { slotId: slot.slot_id, payload },
                {
                    onSuccess: () => {
                        setValidationError('')
                        onEditSaveSuccess?.({
                            slotId: slot.slot_id,
                            start_time: payload.start_time as string,
                            end_time: payload.end_time as string
                        })
                        onClose()
                    },
                    onError: (err) => console.error('Failed to update slot', err)
                }
            )
        } else {
            addSlotMutate(payload, {
                onSuccess: () => {
                    setValidationError('')
                    if (payload.kind === 'meal' && payload.slot_data?.place_id) {
                        addRestaurantToFoodTab(tripId, payload.slot_data as SlotPlaceData, baseCity).catch(() => {})
                    }
                    onClose()
                },
                onError: (err) => console.error('Failed to add slot', err)
            })
        }
    }

    // ⌘↩ keyboard shortcut to save — lifted into the composer chrome.
    useEffect(() => {
        if (!isOpen) return
        const onKey = (ev: KeyboardEvent) => {
            if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
                ev.preventDefault()
                handlePrimaryAction()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, slotType, timeRange, isFlightSearchMode, isEditMode])

    const isSaving = isAdding || isUpdating

    // Commercial-flight reroute only applies to the ADD flow — editing an
    // existing (legacy/manual) flight slot keeps the normal save path.
    const showFlightSearchCta = isFlightSearchMode && !isEditMode

    // ── Composer header ─────────────────────────────────────────────
    const dayDate = timeRange.start.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
    })

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-[2px]"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onClose()
                    }}>
                    <motion.div
                        // Slide up from the bottom (mobile) / fade in via Y-spring (desktop).
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }}
                        className="bg-white flex flex-col overflow-hidden w-full md:w-[min(968px,94vw)] h-[80dvh] md:h-[min(704px,92vh)] rounded-t-[20px] md:rounded-[20px]"
                        style={{
                            boxShadow: '0 32px 64px -12px rgba(20, 8, 60, 0.28), 0 1px 2px rgba(0,0,0,0.08)'
                        }}>
                        {/* ── Header ────────────────────────────────────────── */}
                        <div
                            className="px-4 md:px-5 py-3 md:py-3.5 flex items-center justify-between border-b border-grey-4 shrink-0"
                            style={{
                                background: 'linear-gradient(180deg, rgba(243,239,255,0.25) 0%, transparent 100%)'
                            }}>
                            <div className="flex items-center gap-[14px] min-w-0">
                                <div className="flex flex-col leading-[1.15] min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[10px] font-redhat font-bold uppercase tracking-[0.12em] text-primary-default whitespace-nowrap">
                                            Itinerary composer
                                        </span>
                                        {baseCity?.name && (
                                            <>
                                                <span className="w-[3px] h-[3px] rounded-full bg-grey-3 shrink-0" />
                                                <span className="text-[11px] font-manrope font-medium text-grey-2 truncate">
                                                    {baseCity.name} · {dayDate}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <div className="text-[15px] font-redhat font-semibold text-grey-0 leading-[20px] mt-0.5">
                                        {isEditMode ? 'Edit slot' : 'Add to itinerary'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {/* ⌘↩ pill is desktop-only — mobile has no physical keyboard. */}
                                <div className="hidden md:flex px-2.5 py-1 rounded-full bg-grey-5 border border-grey-4 text-[11px] font-manrope font-semibold text-grey-2 items-center gap-1">
                                    <span
                                        className="text-grey-1"
                                        style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
                                        ⌘↩
                                    </span>
                                    to save
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Close"
                                    className="w-9 h-9 md:w-8 md:h-8 rounded-[10px] grid place-items-center bg-grey-5 text-grey-1 hover:bg-grey-4 transition-colors cursor-pointer">
                                    <X
                                        size={18}
                                        className="md:!w-4 md:!h-4"
                                    />
                                </button>
                            </div>
                        </div>

                        {/* ── Body: type rail + canvas ──────────────────────── */}
                        {/* Desktop: horizontal layout with left vertical rail. */}
                        {/* Mobile: vertical stack — horizontal pill row sits above the canvas. */}
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                            <SlotTypeRail
                                selected={slotType}
                                onChange={setSlotType}
                            />

                            <div
                                ref={canvasRef}
                                className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4 md:py-6 flex flex-col gap-4 md:gap-5"
                                style={{ scrollbarWidth: 'thin' }}>
                                {/* Type-specific section (Activity / Transport / Meal / Custom) */}
                                <TypeSectionModalWrapper
                                    shortlistedExpercience={shortlistedExpercience}
                                    ref={slotProviderRef}
                                    slotType={slotType}
                                    baseCity={baseCity}
                                    slot={slot}
                                    slotDate={slotDate}
                                    onFlightModeChange={setIsFlightSearchMode}
                                    defaultOpen
                                    validationError={validationError}
                                    onErrorClear={() => setValidationError('')}
                                />

                                {/* Notes & Suggestions — universal */}
                                <RemarksSection
                                    ref={remarksRef}
                                    initialData={{
                                        notes: slot?.notes,
                                        suggestions: slot?.suggestion_reasons
                                    }}
                                    defaultOpen
                                />

                                {/* Attachments — universal */}
                                <AttachFilesSection
                                    ref={attachFilesRef}
                                    defaultOpen
                                    initialAttachments={slot?.attachments}
                                />
                            </div>
                        </div>

                        {/* ── Pinned time strip ─────────────────────────────── */}
                        <ComposerTimeStrip
                            start={timeRange.start}
                            end={timeRange.end}
                            onChange={setTimeRange}
                        />

                        {/* ── Footer ────────────────────────────────────────── */}
                        <div className="px-4 md:px-5 py-3 border-t border-grey-4 bg-grey-5 flex items-center justify-between shrink-0 gap-2.5">
                            {/* Desktop shows the timeline hint; mobile drops it for space. */}
                            <span className="hidden md:block text-[11px] font-manrope font-medium text-grey-2 leading-[16px] truncate">
                                Times adjust automatically if you drag this slot on the timeline later.
                            </span>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSaving}
                                    className="h-10 md:h-9 px-4 md:px-3.5 rounded-[10px] border border-grey-4 bg-white text-grey-1 text-[13px] md:text-[12px] font-manrope font-semibold hover:bg-grey-5 transition-colors cursor-pointer disabled:opacity-50 shrink-0">
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrimaryAction}
                                    disabled={isSaving}
                                    className="h-10 md:h-9 px-4 rounded-[10px] text-white text-[13px] md:text-[12px] font-redhat font-bold cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2 flex-1 md:flex-none"
                                    style={{
                                        background: 'linear-gradient(90deg, #7011F6 0%, #4D1D91 100%)',
                                        letterSpacing: '-0.01em',
                                        boxShadow: '0 2px 8px 0 rgba(112, 17, 246, 0.24)'
                                    }}>
                                    {showFlightSearchCta ? (
                                        <>
                                            <Plane className="w-4 h-4" />
                                            Search flights
                                        </>
                                    ) : isEditMode ? (
                                        isUpdating ? (
                                            'Saving…'
                                        ) : (
                                            'Save changes'
                                        )
                                    ) : isAdding ? (
                                        'Adding…'
                                    ) : (
                                        'Add to itinerary'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default AddEventModal
