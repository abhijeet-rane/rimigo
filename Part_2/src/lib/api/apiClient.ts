/**
 * MOCK API CLIENT — standalone Itinerary-Skeleton build.
 *
 * The real rimigo_web app routes every backend call through this `apiClient`
 * (an axios instance). For this interview/demo repo there is NO backend: this
 * module reimplements the same surface (`get/post/put/patch/delete`, default
 * export) but resolves everything locally from in-memory fixtures. No network
 * request is ever made.
 *
 * The Itinerary view only needs two GET endpoints to render:
 *   • GET /api/trip-itineraries/{id}/complete/      → the full itinerary
 *   • GET /api/trip-itineraries/{id}/route_summary/ → the derived city/route strip
 * Every other endpoint resolves to a benign empty payload so the surrounding
 * panels (wishlist, search, agent, flights, …) degrade to empty states instead
 * of throwing.
 */
import type { AxiosRequestConfig } from 'axios'
import { ITINERARY_FIXTURE, ROUTE_SUMMARY_FIXTURE } from '@/mocks/itineraryFixture'

type MockResponse<T = unknown> = {
    data: T
    status: number
    statusText: string
    headers: Record<string, unknown>
    config: AxiosRequestConfig
}

const LATENCY_MS = 250

const wrap = <T>(data: T, config: AxiosRequestConfig = {}): MockResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config
})

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// A permissive empty payload: safe whether the caller reads `.results`,
// `.data`, `.items`, treats it as an object, or spreads it. Keeps unrelated
// side-panel queries from crashing the page on mount.
const emptyPayload = (): Record<string, unknown> => ({
    results: [],
    data: [],
    items: [],
    threads: [],
    interactions: [],
    count: 0,
    next: null,
    previous: null
})

const norm = (url = '') => url.split('?')[0].replace(/\/+$/, '')

const resolveGet = (url = ''): unknown => {
    const u = norm(url)
    if (/\/api\/trip-itineraries\/[^/]+\/complete$/.test(u)) return ITINERARY_FIXTURE
    if (/\/api\/trip-itineraries\/[^/]+\/route[-_]summary$/.test(u)) return ROUTE_SUMMARY_FIXTURE
    return emptyPayload()
}

// Writes (slot/day mutations etc.) echo back a TripItinerary-shaped object so
// the optimistic-update hooks (which read `data.trip.id`) keep working against
// the in-memory fixture.
const resolveWrite = (): unknown => ITINERARY_FIXTURE

async function get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<MockResponse<T>> {
    await delay(LATENCY_MS)
    return wrap(resolveGet(url) as T, config)
}
async function post<T = unknown>(_url: string, _body?: unknown, config?: AxiosRequestConfig): Promise<MockResponse<T>> {
    await delay(LATENCY_MS)
    return wrap(resolveWrite() as T, config)
}
async function put<T = unknown>(_url: string, _body?: unknown, config?: AxiosRequestConfig): Promise<MockResponse<T>> {
    await delay(LATENCY_MS)
    return wrap(resolveWrite() as T, config)
}
async function patch<T = unknown>(_url: string, _body?: unknown, config?: AxiosRequestConfig): Promise<MockResponse<T>> {
    await delay(LATENCY_MS)
    return wrap(resolveWrite() as T, config)
}
async function del<T = unknown>(_url: string, config?: AxiosRequestConfig): Promise<MockResponse<T>> {
    await delay(LATENCY_MS)
    return wrap(emptyPayload() as T, config)
}

// Callable like `apiClient(config)` (the real axios instance supports this),
// plus the verb methods used across the codebase.
const apiClient = Object.assign(
    async (config: AxiosRequestConfig = {}) => get(config.url ?? '', config),
    {
        get,
        post,
        put,
        patch,
        delete: del,
        defaults: { headers: { common: {} as Record<string, string> } },
        interceptors: {
            request: { use: () => 0 },
            response: { use: () => 0 }
        }
    }
)

export default apiClient
