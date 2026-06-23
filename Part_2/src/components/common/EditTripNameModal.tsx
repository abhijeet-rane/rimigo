import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { TravelerTrip } from '@/pages/Landing/api/travelerTrips'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'

interface EditTripNameModalProps {
    isOpen: boolean
    onClose: () => void
    trip?: TravelerTrip
    anchorRect?: DOMRect | null
}

const EditTripNameModal = ({ isOpen, onClose, trip, anchorRect }: EditTripNameModalProps) => {
    const container = typeof document !== 'undefined' ? document.body : null
    const travelerTripsContext = useOptionalTravelerTrips()
    const [name, setName] = useState(trip?.name ?? '')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (isOpen) setName(trip?.name ?? '')
    }, [isOpen, trip?.name])

    if (!isOpen || !container || !trip) return null

    const trimmed = name.trim()
    const originalName = (trip.name ?? '').trim()
    const isUnchanged = trimmed === originalName
    const isEmpty = trimmed.length === 0
    const confirmDisabled = isEmpty || isUnchanged || isSaving

    const handleConfirm = async () => {
        if (confirmDisabled || !travelerTripsContext?.updateTripName) return
        setIsSaving(true)
        try {
            await travelerTripsContext.updateTripName(trimmed, trip.trip_id)
            toast.success('Trip name updated')
            onClose()
        } catch (error) {
            console.error('Failed to update trip name:', error)
            toast.error('Failed to update trip name. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    const top = anchorRect ? anchorRect.bottom + 12 : window.innerHeight / 2 - 120
    const left = anchorRect ? anchorRect.left + anchorRect.width / 2 - 195 : window.innerWidth / 2 - 195
    const clampedLeft = Math.min(Math.max(16, left), window.innerWidth - 390 - 16)
    const panelHeight = 240
    const maxTop = Math.max(16, window.innerHeight - panelHeight - 16)
    const clampedTop = Math.min(Math.max(16, top), maxTop)

    const modalContent = (
        <div
            className="fixed inset-0 z-[200] shadow-sm"
            // Stop mousedown from reaching `document`. Otherwise, dropdowns
            // (e.g. TripDropdown) that listen for outside-clicks via a
            // document-level `mousedown` handler will treat any click inside
            // this portal as outside, unmount themselves, and tear this modal
            // down with them.
            onMouseDown={(e) => e.stopPropagation()}>
            <div className="absolute inset-0" onClick={onClose} />
            <div
                className="absolute flex w-[390px] flex-col overflow-hidden rounded-[24px] bg-white shadow-xl"
                style={{ top: clampedTop, left: clampedLeft }}>
                <div className="flex items-start justify-between p-6 pb-2 bg-grey-5">
                    <h2 className="text-[14px] font-semibold text-grey-1">Edit Trip Name</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer p-1 text-grey-2/80 hover:text-grey-1"
                        aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="border-t border-grey-4/80" />
                <div className="px-6 py-5 flex flex-col gap-4">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !confirmDisabled) handleConfirm()
                        }}
                        maxLength={255}
                        placeholder="Enter trip name"
                        autoFocus
                        className="w-full px-4 py-3 text-[14px] font-medium font-red-hat-display text-grey-0 border border-grey-4 rounded-xl focus:outline-none focus:border-primary-default"
                    />
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2 text-[13px] font-medium font-red-hat-display text-grey-0 rounded-full border border-grey-4 hover:bg-grey-5 cursor-pointer disabled:opacity-50">
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={confirmDisabled}
                            className="px-4 py-2 text-[13px] font-medium font-red-hat-display text-white rounded-full bg-primary-default hover:bg-primary-default/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, container)
}

export default EditTripNameModal
