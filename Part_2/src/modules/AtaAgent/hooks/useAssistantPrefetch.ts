/**
 * Pre-warm the AI Assistant's threads + first-thread interactions in the
 * React Query cache so the lazy-mounted ``<AIAssistantWindow>`` opens
 * with content already populated — no spinner, no layout swap from
 * "empty initial-content" to "chat conversation" the user can see.
 *
 * Mount this hook once at the tripboard surface (alongside the floating
 * chip), gated on ``hasAssistantWindowConfig``. The actual window then
 * reads the cached data via ``queryClient.getQueryData`` in its
 * ``useState`` initializers and uses ``queryClient.fetchQuery`` for
 * subsequent fetches so cache hits are sub-millisecond.
 */
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { fetchThreads, fetchInteractions } from '@/api/ataAPI/ataApi'

// One minute is generous enough that the user reopening the assistant
// after a quick detour (back to itinerary, then back) hits cache, but
// short enough that data won't go stale across long browsing sessions.
const STALE_TIME_MS = 60_000

export const ataThreadsQueryKey = (
    ataId: string,
    entityId?: string | null,
    entityType?: string | null,
    tripId?: string | null,
) =>
    [
        'ata',
        'threads',
        ataId,
        entityId ?? null,
        entityType ?? null,
        tripId ?? null,
    ] as const

export const ataInteractionsQueryKey = (ataId: string, threadId: string) =>
    ['ata', 'interactions', ataId, threadId] as const

export interface AssistantPrefetchInput {
    enabled: boolean
    ataId?: string
    tripId?: string | null
    entityId?: string | null
    entityType?: string | null
}

export function useAssistantPrefetch(input: AssistantPrefetchInput): void {
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!input.enabled || !input.ataId) return
        const ataId = input.ataId
        let cancelled = false

        const run = async () => {
            try {
                const threadsKey = ataThreadsQueryKey(
                    ataId,
                    input.entityId,
                    input.entityType,
                    input.tripId,
                )
                const threadsResp = await queryClient.fetchQuery({
                    queryKey: threadsKey,
                    queryFn: () =>
                        fetchThreads(
                            ataId,
                            10,
                            input.entityId ?? undefined,
                            input.entityType ?? undefined,
                            input.tripId ?? undefined,
                        ),
                    staleTime: STALE_TIME_MS,
                })
                if (cancelled) return

                const firstThreadId = threadsResp?.data?.data?.[0]?.id
                if (!firstThreadId) return

                await queryClient.fetchQuery({
                    queryKey: ataInteractionsQueryKey(ataId, firstThreadId),
                    queryFn: () => fetchInteractions(ataId, firstThreadId),
                    staleTime: STALE_TIME_MS,
                })
            } catch (err) {
                // eslint-disable-next-line no-console
                console.warn('[ata-prefetch] failed', err)
            }
        }
        run()

        return () => {
            cancelled = true
        }
    }, [
        input.enabled,
        input.ataId,
        input.entityId,
        input.entityType,
        input.tripId,
        queryClient,
    ])
}
