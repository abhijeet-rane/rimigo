import { useState, useCallback, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { travelerCollectionApi } from '../api/travelerCollectionApi'
import { pollTripboardStatus } from '@/api/tripboardApi'
import { toast } from 'sonner'

const POLL_INTERVAL_MS = 3000

/**
 * Hook that triggers an async sync of a tripboard with its linked itinerary.
 * The backend enqueues a Celery task and returns a task_id.
 * This hook polls for completion and shows a toast with the result.
 */
export function useTripboardSync(
    collectionIdentifier: string | undefined,
    collectionType: 'content' | 'traveler'
) {
    const queryClient = useQueryClient()
    const api = collectionType === 'content' ? contentCollectionApi : travelerCollectionApi
    const [isPending, setIsPending] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current)
                pollRef.current = null
            }
        }
    }, [])

    const invalidateQueries = useCallback(() => {
        const prefix = collectionType === 'content' ? 'content-collection' : 'traveler-collection'
        queryClient.invalidateQueries({ queryKey: [prefix, collectionIdentifier] })
        queryClient.invalidateQueries({ queryKey: [`${prefix}-section-types`, collectionIdentifier] })
        queryClient.invalidateQueries({ queryKey: [`${prefix}-itinerary`, collectionIdentifier] })
        queryClient.invalidateQueries({ queryKey: ['content-collection-metadata'] })
    }, [queryClient, collectionType, collectionIdentifier])

    const sync = useCallback(async () => {
        if (!collectionIdentifier || isPending) return

        setIsPending(true)
        setIsSuccess(false)
        setError(null)

        try {
            const response = await api.syncFromItinerary(collectionIdentifier)
            const taskId = response.data?.task_id

            if (!taskId) {
                throw new Error('No task_id returned from sync endpoint')
            }

            // Start polling for task completion
            pollRef.current = setInterval(async () => {
                try {
                    const status = await pollTripboardStatus(taskId)

                    if (status.status === 'completed') {
                        if (pollRef.current) {
                            clearInterval(pollRef.current)
                            pollRef.current = null
                        }

                        setIsPending(false)
                        setIsSuccess(true)

                        // Build summary from result
                        const result = status.data as Record<string, number> | undefined
                        const parts: string[] = []
                        if (result) {
                            if (result.experiences_added > 0) parts.push(`Added ${result.experiences_added} experience${result.experiences_added > 1 ? 's' : ''}`)
                            if (result.stays_added > 0) parts.push(`Added ${result.stays_added} stay${result.stays_added > 1 ? 's' : ''}`)
                            if (result.restaurants_added > 0) parts.push(`Added ${result.restaurants_added} restaurant${result.restaurants_added > 1 ? 's' : ''}`)
                        }
                        if (parts.length > 0) {
                            toast.success(`Tripboard updated: ${parts.join(', ')}`)
                        } else {
                            toast.success('Tripboard synced with itinerary')
                        }

                        invalidateQueries()
                    } else if (status.status === 'failed') {
                        if (pollRef.current) {
                            clearInterval(pollRef.current)
                            pollRef.current = null
                        }

                        setIsPending(false)
                        const err = new Error(status.error || 'Sync failed')
                        setError(err)
                        toast.error('Failed to update tripboard. Please try again.')
                    }
                    // pending/in_progress — keep polling
                } catch (pollError) {
                    console.error('Tripboard sync poll error:', pollError)
                    // Don't stop polling on transient network errors
                }
            }, POLL_INTERVAL_MS)
        } catch (err) {
            setIsPending(false)
            const error = err instanceof Error ? err : new Error('Failed to start sync')
            setError(error)
            console.error('Tripboard sync failed:', err)
            toast.error('Failed to update tripboard. Please try again.')
        }
    }, [collectionIdentifier, isPending, api, invalidateQueries])

    return {
        sync,
        isPending,
        isSuccess,
        error
    }
}
