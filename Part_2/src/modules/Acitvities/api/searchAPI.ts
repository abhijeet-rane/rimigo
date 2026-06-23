import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import type { SearchResponse, SearchData } from '../types/searchTypes'

/**
 * Short-TTL promise cache so concurrent callers (city search + each dimension
 * search inside SearchBar/WhereSection) for the same query share one HTTP
 * call — even when their debounced timers fire in different ticks.
 *
 * Lifecycle:
 *  - First caller for `q` kicks off the fetch and stores the promise.
 *  - Any caller that arrives while the fetch is pending awaits the same promise.
 *  - After the fetch resolves, the resolved promise stays in the cache for
 *    {@link STALE_TTL_MS}. Subsequent callers in that window re-use the cached
 *    value (zero network).
 *  - After the TTL, the entry is evicted; the next call for the same string
 *    fetches afresh.
 */
const CACHE_TTL_MS = 1200
const cache: Map<string, { promise: Promise<SearchData>; expiresAt: number }> = new Map()

const emptyResult = (q: string): SearchData => ({ query: q, count: 0, results: [] })

const doFetch = async (query: string): Promise<SearchData> => {
    try {
        const response = await apiClient.get<SearchResponse>(`${API_CONFIG.BASE_URL}/curation/search/`, {
            params: { q: query }
        })
        // Response structure: { message, response_code, data: { query, count, results } }
        return response.data.data || emptyResult(query)
    } catch (error) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { status?: number; data?: { error?: string; message?: string } } }
            if (axiosError.response?.status === 400) {
                throw new Error(axiosError.response.data?.error || axiosError.response.data?.message || 'Invalid search query')
            }
            throw new Error(axiosError.response?.data?.error || axiosError.response?.data?.message || 'Search failed')
        }
        throw new Error('Search failed')
    }
}

/**
 * Search across experiences, countries, and cities. Concurrent calls for the
 * same query (within a {@link CACHE_TTL_MS} window) share one network request.
 */
export const globalSearch = async (query: string): Promise<SearchData> => {
    if (!query || !query.trim()) {
        return emptyResult('')
    }
    const q = query.trim()
    const now = Date.now()
    const entry = cache.get(q)
    if (entry && entry.expiresAt > now) {
        return entry.promise
    }
    const promise = doFetch(q)
    cache.set(q, { promise, expiresAt: now + CACHE_TTL_MS })
    // On failure we drop the cached entry immediately so a retry doesn't keep
    // serving the same error.
    promise.catch(() => {
        const current = cache.get(q)
        if (current && current.promise === promise) cache.delete(q)
    })
    return promise
}
