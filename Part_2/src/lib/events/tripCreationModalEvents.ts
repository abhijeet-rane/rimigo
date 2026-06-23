export const OPEN_TRIP_CREATION_MODAL_EVENT = 'openTripCreationModal'

export interface OpenTripCreationModalDetail {
    source?: string
    metadata?: Record<string, unknown>
}

export type OpenTripCreationModalEvent = CustomEvent<OpenTripCreationModalDetail>

export const dispatchOpenTripCreationModal = (detail?: OpenTripCreationModalDetail) => {
    if (typeof window === 'undefined') {
        return
    }

    const event: OpenTripCreationModalEvent = new CustomEvent(OPEN_TRIP_CREATION_MODAL_EVENT, {
        detail
    })

    window.dispatchEvent(event)
}

export const addOpenTripCreationModalListener = (listener: (event: OpenTripCreationModalEvent) => void): (() => void) => {
    if (typeof window === 'undefined') {
        return () => {}
    }

    window.addEventListener(OPEN_TRIP_CREATION_MODAL_EVENT, listener as EventListener)

    return () => {
        window.removeEventListener(OPEN_TRIP_CREATION_MODAL_EVENT, listener as EventListener)
    }
}
