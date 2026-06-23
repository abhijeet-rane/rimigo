/**
 * useMultiVoucherSSE — subscribe to the per-voucher SSE stream for a list of
 * voucher IDs, surfacing the latest status payload per voucher.
 *
 * Each voucher gets its own `fetch()` + ReadableStream reader (so streams
 * fan out independently and don't block each other). The hook tears down
 * subscriptions when a voucher reaches a terminal status — or when the
 * caller drops it from the `voucherIds` list — so the network connection
 * count tracks the in-flight set.
 *
 * Returns a map: voucherId → latest event payload. Components read the
 * latest snapshot and re-render the matching card.
 *
 * The backend uses commons.sse, which:
 *   - replays cached state on connect (late-joining the stream after upload),
 *   - emits `event: processing` then `event: completed | failed`,
 *   - publishes `status: 'completed'` with the extracted payload (we map
 *     this back to the voucher-domain `extracted` status on the FE).
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { TokenStorage } from '@/lib/api/tokenStorage'
import {
    voucherStreamPath,
    type Voucher,
    type VoucherCategory,
    type VoucherExtracted,
    type VoucherStatus,
} from '@/api/voucherAPI/voucherAPI'

/** Latest known state of one voucher as reported by the SSE stream. */
export type VoucherStreamSnapshot = {
    voucherId: string
    status: VoucherStatus
    category?: VoucherCategory | null
    extracted?: VoucherExtracted
    confidence?: number | null
    errorCode?: string | null
    errorReason?: string | null
}

/** Maps voucherId → latest SSE snapshot. Only contains streamed ones. */
export type VoucherStreamMap = Record<string, VoucherStreamSnapshot>

/**
 * Subscribe to live status for the given voucher IDs.
 *
 * @param voucherIds Vouchers to watch. Typically: the IDs of all vouchers in
 *   `status ∈ {queued, processing}`. Re-renders are cheap; the hook only
 *   opens/closes streams when the *set* of IDs changes.
 * @param onTerminal Optional callback fired once per voucher when it reaches
 *   a terminal status. Useful for `queryClient.invalidateQueries` to refetch
 *   the list and get the canonical row from the DB.
 */
export function useMultiVoucherSSE(
    voucherIds: string[],
    onTerminal?: (snapshot: VoucherStreamSnapshot) => void,
): VoucherStreamMap {
    const [map, setMap] = useState<VoucherStreamMap>({})
    const onTerminalRef = useRef(onTerminal)
    onTerminalRef.current = onTerminal

    // Stable key — the set of voucher IDs we're currently streaming. Whenever
    // this changes we tear down old subs + spin up new ones. Sorting makes
    // the dep stable across reorderings of the same set.
    const subKey = [...voucherIds].sort().join('|')

    const handleSnapshot = useCallback((snapshot: VoucherStreamSnapshot) => {
        setMap((prev) => ({ ...prev, [snapshot.voucherId]: snapshot }))
        if (snapshot.status === 'extracted' || snapshot.status === 'failed') {
            onTerminalRef.current?.(snapshot)
        }
    }, [])

    useEffect(() => {
        if (!subKey) return

        const ids = subKey.split('|').filter(Boolean)
        const aborts: AbortController[] = []

        for (const id of ids) {
            const ctrl = new AbortController()
            aborts.push(ctrl)
            void streamOne(id, handleSnapshot, ctrl.signal).catch(() => {
                // Network blip / abort — leave the last known state in the map
                // and let the list refetch (TanStack Query) repair on next render.
            })
        }

        return () => {
            for (const c of aborts) c.abort()
        }
    }, [subKey, handleSnapshot])

    return map
}

/** Convenience: project a `Voucher` from list + the latest SSE snapshot. */
export function mergeVoucherWithStream(
    voucher: Voucher,
    snapshot: VoucherStreamSnapshot | undefined,
): Voucher {
    if (!snapshot) return voucher
    if (snapshot.status === 'extracted') {
        return {
            ...voucher,
            status: 'extracted',
            category: snapshot.category ?? voucher.category,
            extracted: snapshot.extracted ?? voucher.extracted,
            confidence: snapshot.confidence ?? voucher.confidence,
        }
    }
    if (snapshot.status === 'failed') {
        return {
            ...voucher,
            status: 'failed',
            error_code: snapshot.errorCode ?? voucher.error_code,
            error_reason: snapshot.errorReason ?? voucher.error_reason,
        }
    }
    return { ...voucher, status: snapshot.status }
}

// ────────────────── stream reader (per-voucher) ──────────────────

async function streamOne(
    voucherId: string,
    onSnapshot: (s: VoucherStreamSnapshot) => void,
    signal: AbortSignal,
): Promise<void> {
    const baseUrl = API_CONFIG.BASE_URL || ''
    const url = `${baseUrl}${voucherStreamPath(voucherId)}`

    const token = await TokenStorage.getAccessToken()
    const headers: HeadersInit = {
        Accept: 'text/event-stream, application/json',
    }
    if (token) headers['Authorization'] = token

    const response = await fetch(url, {
        method: 'GET',
        headers,
        cache: 'no-store',
        signal,
    })

    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    let buffer = ''
    let currentData = ''

    try {
        while (true) {
            if (signal.aborted) {
                reader.cancel()
                return
            }
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                if (line.trim() === '') {
                    if (currentData) {
                        const snapshot = parseSnapshot(voucherId, currentData)
                        if (snapshot) onSnapshot(snapshot)
                    }
                    currentData = ''
                    continue
                }
                if (line.startsWith(':')) continue // heartbeat
                if (line.startsWith('data:')) {
                    currentData += (currentData ? '\n' : '') + line.slice(5).trim()
                }
                // `event:` field is informational; the actual semantics live
                // in the JSON payload's `status` field.
            }
        }
        if (currentData) {
            const snapshot = parseSnapshot(voucherId, currentData)
            if (snapshot) onSnapshot(snapshot)
        }
    } catch {
        // network/abort — handled by caller
    }
}

function parseSnapshot(
    voucherId: string,
    dataStr: string,
): VoucherStreamSnapshot | null {
    let parsed: Record<string, unknown>
    try {
        parsed = JSON.parse(dataStr)
    } catch {
        return null
    }

    const rawStatus = String(parsed.status ?? '')
    // Backend uses `status: 'completed'` to close the stream and carries the
    // voucher-domain status under `voucher_status: 'extracted'`. Map back.
    let status: VoucherStatus
    if (rawStatus === 'completed' || rawStatus === 'complete') {
        status = (parsed.voucher_status as VoucherStatus) ?? 'extracted'
    } else if (rawStatus === 'failed' || rawStatus === 'error') {
        status = 'failed'
    } else if (rawStatus === 'processing') {
        status = 'processing'
    } else if (rawStatus === 'queued') {
        status = 'queued'
    } else {
        return null
    }

    return {
        voucherId,
        status,
        category: (parsed.category as VoucherCategory) ?? null,
        extracted: (parsed.extracted as VoucherExtracted) ?? undefined,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
        errorCode: (parsed.error_code as string) ?? null,
        errorReason: (parsed.error_reason as string) ?? null,
    }
}
