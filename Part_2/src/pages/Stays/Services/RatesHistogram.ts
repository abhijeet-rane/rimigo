import { toast } from 'sonner'
import { getRatesHistogram, getRatesHistogramSSE } from '../Apis/staysAPI'
import type {
    GetRatesHistogramParams,
    RatesHistogramData,
    RatesHistogramResponse,
    RatesHistogramSSEResult,
} from '../Types'
import type { SSEEvent } from '@/lib/api/sseClient'

// ── SSE-based fetch (preferred) ──────────────────────────────────────────────

/**
 * Fetch rates histogram via SSE stream.
 * Single connection — no polling. The backend streams progress events and
 * delivers the completed histogram data in the final event.
 *
 * Returns a RatesHistogramResponse shaped for drop-in compat with callers
 * that still expect the old polling response shape.
 */
export const fetchRatesHistogram = async (
    params: GetRatesHistogramParams,
    options?: {
        onProgress?: (event: SSEEvent<RatesHistogramData>) => void
        signal?: AbortSignal
    }
): Promise<RatesHistogramResponse> => {
    try {
        const result: RatesHistogramSSEResult = await getRatesHistogramSSE(params, {
            onEvent: options?.onProgress,
            signal: options?.signal,
        })

        if (result.status === 'completed') {
            return {
                message: 'Success',
                response_code: 'SS0200',
                data: result.data,
            }
        }

        if (result.status === 'timeout') {
            return {
                message: 'Timeout',
                response_code: 'SS0408',
                data: {
                    bucket_size: 0,
                    buckets: [],
                    total_hotels: 0,
                    min_rate: 0,
                    max_rate: 0,
                    check_in_date: params.check_in,
                    check_out_date: params.check_out,
                    status: 'timeout',
                },
            }
        }

        // failed or aborted
        const msg = result.status === 'failed' ? result.message : 'Request cancelled'
        throw new Error(msg)
    } catch (error) {
        toast.error('Failed to fetch rates. Please try again.')
        throw error
    }
}

// ── Polling-based fetch (fallback) ───────────────────────────────────────────

const POLLING_INTERVALS = [8, 4, 3, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2]
const MAX_POLL_DURATION_MS = 40_000

const sleep = (seconds: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, seconds * 1000))

/**
 * Fallback: fetch rates histogram with polling for 202 responses.
 * Use fetchRatesHistogram (SSE) instead when possible.
 */
export const fetchRatesHistogramPolling = async (
    params: GetRatesHistogramParams
): Promise<RatesHistogramResponse> => {
    try {
        let response = await getRatesHistogram(params)
        const pollingStartedAt = Date.now()

        if (response.data.status === 'completed') {
            return response
        }

        for (let i = 0; i < POLLING_INTERVALS.length; i++) {
            const interval = POLLING_INTERVALS[i]

            if (Date.now() - pollingStartedAt >= MAX_POLL_DURATION_MS) {
                return withTimeoutStatus(response)
            }

            await sleep(interval)

            if (Date.now() - pollingStartedAt >= MAX_POLL_DURATION_MS) {
                return withTimeoutStatus(response)
            }

            response = await getRatesHistogram(params)

            if (response.data.status === 'completed') {
                return response
            }
        }

        return withTimeoutStatus(response)
    } catch (error) {
        toast.error('Failed to fetch rates. Please try again.')
        throw error
    }
}

const withTimeoutStatus = (response: RatesHistogramResponse): RatesHistogramResponse => {
    if (response.data.status === 'completed') return response
    return {
        ...response,
        data: { ...response.data, status: 'timeout' as RatesHistogramData['status'] },
    }
}

// Export types for convenience
export type { GetRatesHistogramParams, RatesHistogramResponse }
