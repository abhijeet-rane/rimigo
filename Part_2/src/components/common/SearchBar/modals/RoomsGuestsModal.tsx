import { Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { RoomsGuestsContent } from './RoomsGuestsContent'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { OccupanciesConfig } from '@/types/occupancy'
import { DEFAULT_OCCUPANCIES, MAX_ROOMS, MAX_ADULTS_PER_ROOM, MAX_CHILDREN_PER_ROOM, DEFAULT_CHILD_AGE, flattenOccupancies } from '@/types/occupancy'
import { updateTripPartial } from '@/api/trip/tripAPI'
import { useIsMobile } from '@/hooks/use-mobile'

interface RoomsGuestsModalProps {
    isOpen: boolean
    onClose: () => void
    initialOccupancies?: OccupanciesConfig
    onApply: (data: OccupanciesConfig) => void
    anchorRef?: React.RefObject<HTMLElement | null>
    usePortal?: boolean
    positionOffset?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-center' | 'top-center'
    allowScrollBehind?: boolean
    /** When provided, Apply also persists to trip.group_setup via PATCH. */
    tripId?: string
    /** Existing group_setup — preserved on save so we don't clobber infants. */
    existingGroupSetup?: { adults?: number; children?: number; infants?: number; children_age?: number[] } | null
    /** Optional callback fired after a successful save. */
    onSavedToTrip?: (data: OccupanciesConfig) => void
    /** Renders only the content card with no backdrop or positioning wrapper (for embedding inside another modal). */
    embedded?: boolean
}

export const RoomsGuestsModal = ({
    isOpen,
    onClose,
    initialOccupancies,
    onApply,
    anchorRef,
    usePortal = false,
    positionOffset = 'bottom-center',
    allowScrollBehind = false,
    tripId,
    existingGroupSetup,
    onSavedToTrip,
    embedded = false,
}: RoomsGuestsModalProps) => {
    const queryClient = useQueryClient()
    const isMobile = useIsMobile()
    const [rooms, setRooms] = useState<OccupanciesConfig>(initialOccupancies || DEFAULT_OCCUPANCIES)
    const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null)
    const modalContentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!isOpen || !allowScrollBehind) return
        const handlePointerDown = (e: PointerEvent) => {
            if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('pointerdown', handlePointerDown)
        return () => document.removeEventListener('pointerdown', handlePointerDown)
    }, [isOpen, allowScrollBehind, onClose])

    useEffect(() => {
        if (initialOccupancies && initialOccupancies.length > 0) {
            setRooms(initialOccupancies)
        }
    }, [initialOccupancies])

    useEffect(() => {
        if (!isOpen || !anchorRef?.current || !usePortal) return
        const rect = anchorRef.current.getBoundingClientRect()
        const isTop = positionOffset?.startsWith('top')
        const top = isTop ? rect.top + window.scrollY - 8 : rect.bottom + window.scrollY + 8
        let left = rect.left + rect.width / 2
        if (positionOffset === 'bottom-right' || positionOffset === 'top-right') left = rect.right
        else if (positionOffset === 'bottom-left' || positionOffset === 'top-left') left = rect.left
        setModalPosition({ top, left })
    }, [isOpen, anchorRef, usePortal, positionOffset])

    const saveMutation = useMutation({
        mutationFn: async (next: OccupanciesConfig) => {
            if (!tripId) throw new Error('Missing tripId')
            const flat = flattenOccupancies(next)
            const roomsBreakdown = next.map((room) => ({
                adults: room.numOfAdults,
                children: room.childAges.length,
                child_ages: [...room.childAges],
            }))
            return updateTripPartial(tripId, {
                group_setup: {
                    adults: flat.adults,
                    children: flat.children,
                    infants: existingGroupSetup?.infants ?? 0,
                    children_age: flat.childAges,
                    rooms: roomsBreakdown,
                },
            })
        },
        onSuccess: (_data, next) => {
            queryClient.invalidateQueries({ queryKey: ['travelerTrips'] })
            onApply(next)
            onSavedToTrip?.(next)
            toast.success('Saved guests for this trip')
            onClose()
        },
        onError: () => {
            toast.error('Could not save guests. Please try again.')
        },
    })

    // Stay mounted on mobile so the bottom-sheet close animation can play
    if (!isOpen && !isMobile) return null

    const updateRoom = (index: number, field: 'numOfAdults' | 'childAges', value: number | number[]) => {
        setRooms((prev) => prev.map((room, i) => (i === index ? { ...room, [field]: value } : room)))
    }

    const addRoom = () => {
        if (rooms.length >= MAX_ROOMS) return
        setRooms((prev) => [...prev, { numOfAdults: 2, childAges: [] }])
    }

    const removeRoom = (index: number) => {
        if (rooms.length <= 1) return
        setRooms((prev) => prev.filter((_, i) => i !== index))
    }

    const setAdults = (index: number, count: number) => {
        updateRoom(index, 'numOfAdults', Math.max(1, Math.min(MAX_ADULTS_PER_ROOM, count)))
    }

    const setChildren = (index: number, count: number) => {
        const clamped = Math.max(0, Math.min(MAX_CHILDREN_PER_ROOM, count))
        setRooms((prev) =>
            prev.map((room, i) => {
                if (i !== index) return room
                const ages = [...room.childAges]
                while (ages.length < clamped) ages.push(DEFAULT_CHILD_AGE)
                return { ...room, childAges: ages.slice(0, clamped) }
            })
        )
    }

    const setChildAge = (roomIndex: number, childIndex: number, age: number) => {
        setRooms((prev) =>
            prev.map((room, i) => {
                if (i !== roomIndex) return room
                const ages = [...room.childAges]
                ages[childIndex] = age
                return { ...room, childAges: ages }
            })
        )
    }

    const handleApply = () => {
        if (tripId) {
            saveMutation.mutate(rooms)
        } else {
            onApply(rooms)
            onClose()
        }
    }

    const isSaving = saveMutation.isPending

    const CounterBtn = ({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-9 h-9 flex items-center justify-center transition-colors ${
                disabled
                    ? 'rounded-full border border-grey-grey_4 bg-grey-grey_5 cursor-not-allowed opacity-40'
                    : 'rounded-full border border-primary-default bg-natural-white text-primary-default hover:bg-primary-default-80 cursor-pointer'
            }`}>
            <span className="text-lg font-medium">{label}</span>
        </button>
    )

    if (embedded) {
        return (
            <RoomsGuestsContent
                initialOccupancies={initialOccupancies}
                onApply={onApply}
                onClose={onClose}
            />
        )
    }

    // Shared scrollable content + action button
    const cardInner = (
        <>
            <div className="p-6 max-md:pt-3 max-md:px-6 overflow-y-auto flex-1 min-h-0">
                {rooms.map((room, roomIdx) => (
                    <div key={roomIdx} className={roomIdx > 0 ? 'mt-5 pt-5 border-t border-grey-4' : ''}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-['Red_Hat_Display'] text-[16px] font-bold leading-[20px] tracking-[-0.32px]" style={{ color: '#101010' }}>
                                Room {roomIdx + 1}
                            </h3>
                            {roomIdx > 0 && (
                                <button onClick={() => removeRoom(roomIdx)} className="p-1.5 rounded-full hover:bg-red-50 transition-colors cursor-pointer">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="font-['Red_Hat_Display'] text-[14px] font-[550] leading-[18px] tracking-[-0.28px]" style={{ color: '#363636' }}>Adult</p>
                                <p className="font-['Manrope'] text-[11px] font-semibold tracking-[-0.22px]" style={{ color: '#747474' }}>Age 18+</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <CounterBtn onClick={() => setAdults(roomIdx, room.numOfAdults - 1)} disabled={room.numOfAdults <= 1} label="−" />
                                <span className="text-base font-semibold text-header-black w-6 text-center">{room.numOfAdults}</span>
                                <CounterBtn onClick={() => setAdults(roomIdx, room.numOfAdults + 1)} disabled={room.numOfAdults >= MAX_ADULTS_PER_ROOM} label="+" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="font-['Red_Hat_Display'] text-[14px] font-[550] leading-[18px] tracking-[-0.28px]" style={{ color: '#363636' }}>Children</p>
                                <p className="font-['Manrope'] text-[11px] font-semibold tracking-[-0.22px]" style={{ color: '#747474' }}>Age 17 or younger</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <CounterBtn onClick={() => setChildren(roomIdx, room.childAges.length - 1)} disabled={room.childAges.length <= 0} label="−" />
                                <span className="text-base font-semibold text-header-black w-6 text-center">{room.childAges.length}</span>
                                <CounterBtn onClick={() => setChildren(roomIdx, room.childAges.length + 1)} disabled={room.childAges.length >= MAX_CHILDREN_PER_ROOM} label="+" />
                            </div>
                        </div>
                        {room.childAges.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {room.childAges.map((age, childIdx) => (
                                    <select key={childIdx} value={age} onChange={(e) => setChildAge(roomIdx, childIdx, parseInt(e.target.value, 10))}
                                        className="px-3 py-2 border border-grey-4 rounded-lg text-sm font-['Manrope'] text-grey-0 bg-white cursor-pointer focus:outline-none focus:border-primary-default">
                                        {Array.from({ length: 18 }, (_, i) => (
                                            <option key={i} value={i}>Child {childIdx + 1}: Age {i}</option>
                                        ))}
                                    </select>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {rooms.length < MAX_ROOMS && (
                    <button onClick={addRoom} className="mt-5 w-full py-3 border border-dashed border-grey-3 rounded-xl text-sm font-semibold font-['Red_Hat_Display'] text-grey-1 hover:border-primary-default hover:text-primary-default transition-colors cursor-pointer">
                        Add Room
                    </button>
                )}
            </div>
            <div className="px-6 pb-6 pt-3 border-t border-grey-4/60 shrink-0">
                <button onClick={handleApply} disabled={isSaving}
                    className="w-full py-3 bg-header-black text-white rounded-xl text-sm font-bold font-['Red_Hat_Display'] hover:bg-grey-0 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSaving ? 'Saving…' : 'Apply'}
                </button>
            </div>
        </>
    )

    // Mobile: always-mounted bottom sheet with CSS slide transition
    if (isMobile && typeof document !== 'undefined') {
        const overlayPointer: 'auto' | 'none' = isOpen ? 'auto' : 'none'
        return createPortal(
            <>
                <div
                    className="fixed inset-0 bg-black/20 transition-opacity duration-200 ease-out"
                    style={{ zIndex: 10050, opacity: isOpen ? 1 : 0, pointerEvents: overlayPointer }}
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
                    <div ref={modalContentRef} className="bg-white border-t border-feature-card-border rounded-t-2xl shadow-lg w-full flex flex-col max-h-[75vh]">
                        <div className="flex justify-center pt-3 pb-1 shrink-0">
                            <div className="w-10 h-1 rounded-full bg-grey-4" />
                        </div>
                        {cardInner}
                    </div>
                </div>
            </>,
            document.body
        )
    }

    // Desktop: anchored popover
    const modalContent = (
        <>
            {!allowScrollBehind && (
                <div className="fixed inset-0 bg-black/20" style={{ zIndex: 10050 }} onClick={onClose} />
            )}
            <div
                className={`${usePortal ? 'fixed' : 'absolute left-1/2 -translate-x-1/2'}`}
                style={{
                    zIndex: 10051,
                    ...(usePortal && modalPosition
                        ? {
                              top: `${modalPosition.top}px`,
                              left: `${modalPosition.left}px`,
                              transform:
                                  positionOffset === 'bottom-right' || positionOffset === 'top-right'
                                      ? 'translateX(-100%)'
                                      : positionOffset === 'bottom-left' || positionOffset === 'top-left'
                                        ? 'translateX(0)'
                                        : 'translateX(-50%)',
                          }
                        : { top: '100%' }),
                }}>
                <div ref={modalContentRef} className="bg-white border border-feature-card-border rounded-lg shadow-lg w-[340px] flex flex-col max-h-[540px]">
                    {cardInner}
                </div>
            </div>
        </>
    )

    if (usePortal && typeof document !== 'undefined') {
        return createPortal(modalContent, document.body)
    }
    return modalContent
}

export default RoomsGuestsModal
