// Rates Histogram Types

export interface RatesHistogramBucket {
    min: number
    max: number
    count: number
}

export interface RatesHistogramData {
    bucket_size: number
    buckets: RatesHistogramBucket[]
    total_hotels: number
    min_rate: number
    max_rate: number
    check_in_date: string
    check_out_date: string
    status: 'processing' | 'in_progress' | 'completed' | 'estimated' | 'timeout'
}

/** JSON response from the non-SSE path (StupaResponse wrapper). */
export interface RatesHistogramResponse {
    message: string
    response_code: string
    data: RatesHistogramData
}

export interface GetRatesHistogramParams {
    cityId: string
    check_in: string // Format: YYYY-MM-DD
    check_out: string // Format: YYYY-MM-DD
    num_adults?: number
    child_ages?: number[]
    num_infants?: number
}

/** SSE result after the stream resolves (used by the SSE path). */
export type RatesHistogramSSEResult =
    | { status: 'completed'; data: RatesHistogramData }
    | { status: 'failed'; message: string }
    | { status: 'aborted' }
    | { status: 'timeout' }
