/**
 * React hook for automated tripboard creation.
 *
 * Wraps the tripboard service in React-friendly state management,
 * prevents double-creation, provides step-level progress, and
 * manages the progress modal visibility.
 */

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
    createTripboard,
    TRIPBOARD_STEPS,
    type TripboardCreationParams,
    type TripboardStep
} from '../services/tripboardService'

export type TripboardStatus = 'idle' | 'creating' | 'completed' | 'error'

export function useTripboardCreation() {
    const [status, setStatus] = useState<TripboardStatus>('idle')
    const [error, setError] = useState<string | null>(null)
    const [identifier, setIdentifier] = useState<string | null>(null)
    const [steps, setSteps] = useState<TripboardStep[]>(() => TRIPBOARD_STEPS.map((s) => ({ ...s })))
    const [showModal, setShowModal] = useState(false)
    const creationRef = useRef(false) // Prevent double-creation

    const handleProgress = useCallback((updatedSteps: TripboardStep[]) => {
        setSteps(updatedSteps)
    }, [])

    const trigger = useCallback(
        async (params: TripboardCreationParams) => {
            if (creationRef.current) return
            creationRef.current = true

            setStatus('creating')
            setError(null)
            setSteps(TRIPBOARD_STEPS.map((s) => ({ ...s }))) // reset steps

            try {
                const id = await createTripboard(params, handleProgress)
                setIdentifier(id)
                setStatus('completed')
                toast.success('Tripboard created!', {
                    description: 'Your trip essentials are ready.'
                })
            } catch (err) {
                setStatus('error')
                const message = err instanceof Error ? err.message : 'Unknown error'
                setError(message)
                console.error('[Tripboard] Creation failed:', err)
            }
        },
        [handleProgress]
    )

    const openModal = useCallback(() => setShowModal(true), [])
    const closeModal = useCallback(() => setShowModal(false), [])

    /** Reset so a new tripboard can be created (e.g. after retry / new itinerary). */
    const reset = useCallback(() => {
        creationRef.current = false
        setStatus('idle')
        setError(null)
        setIdentifier(null)
        setSteps(TRIPBOARD_STEPS.map((s) => ({ ...s })))
        setShowModal(false)
    }, [])

    return { status, error, identifier, steps, showModal, trigger, reset, openModal, closeModal }
}
