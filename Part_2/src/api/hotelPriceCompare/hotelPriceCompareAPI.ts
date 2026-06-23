import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { appendAttributionParams } from '@/lib/api/attributionParams'
import { TokenStorage } from '@/lib/api/tokenStorage'

const HOTEL_PRICE_COMPARE_TASK_KEY = 'hotelPriceCompareTaskId'
const SSE_TIMEOUT_MS = 20000 // Only retry if no data on stream within 20s

export interface RoomOccupancy {
    adults: number
    child_ages?: number[]
}

/**
 * Distribute flat adults/children/child_ages across `noOfRooms` into per-room occupancy.
 * Adults and children are spread as evenly as possible; extras go to the lower-indexed rooms.
 * Each room gets at least 1 adult (rooms clamped to min(rooms, adults)).
 */
export function buildRoomsFromFlat(
    adults: number,
    childAges: number[],
    noOfRooms: number,
): RoomOccupancy[] {
    const rooms = Math.max(1, Math.min(noOfRooms, adults))
    const perAdult = Math.floor(adults / rooms)
    const adultRemainder = adults % rooms
    const children = childAges.length
    const perChild = Math.floor(children / rooms)
    const childRemainder = children % rooms
    const result: RoomOccupancy[] = []
    let ageIdx = 0
    for (let i = 0; i < rooms; i++) {
        const roomAdults = perAdult + (i < adultRemainder ? 1 : 0)
        const roomChildCount = perChild + (i < childRemainder ? 1 : 0)
        const roomAges = childAges.slice(ageIdx, ageIdx + roomChildCount)
        ageIdx += roomChildCount
        result.push({ adults: roomAdults, child_ages: roomAges })
    }
    return result
}

/** Default occupancy: one room, two adults, no children. */
export const DEFAULT_ROOMS: RoomOccupancy[] = [{ adults: 2, child_ages: [] }]

export interface HotelPriceCompareRequest {
    zentrum_hub_id: string
    /** Optional: for Kayak stays when zentrum_hub_id isn't available */
    kayak_stay_id?: string
    hotel_name: string
    city: string
    check_in: string
    check_out: string
    currency: string
    trip_id: string
    rimigo_price: boolean
    /** Per-room occupancy. Omit to default to one room / two adults. */
    rooms?: RoomOccupancy[]
}

export interface PlatformPrice {
    platform: string
    price: number
    url: string
    logo_url?: string
    roomName?: string
    hasFreeCancellation?: boolean
    is_cheapest?: boolean
}

// API response types (actual structure from backend)
interface ApiPlatformPrice {
    platform: string
    link: string
    affiliate_link: string
    total_price: string // e.g., "₹14,614"
    before_tax_price?: string | null
    rank: number
    logo?: string | null
    roomName?: string | null
    hasFreeCancellation?: boolean
}

interface ApiHotelPriceCompareResponse {
    hotel_search_request_id: string
    zentrum_hub_id: string
    accommodation_name: string
    check_in: string
    check_out: string
    adults: number
    children: number
    child_ages: number[]
    currency: string
    platform_prices: ApiPlatformPrice[]
    rimigo_price: string | null
    serp_context: {
        search_query: string
        property_token: string
        result_count: number
    }
}

// Helper function to parse price string to number
const parsePriceString = (priceStr: string): number => {
    // Remove currency symbol, commas, and convert to number
    // e.g., "₹14,614" -> 14614
    const cleanPrice = priceStr.replace(/[₹,]/g, '').trim()
    return parseFloat(cleanPrice) || 0
}

/** Transform API platform prices to frontend format.
 *  Price is calculated as per-room-per-night: totalPrice / nights / rooms */
function mapApiResponseToPlatforms(response: ApiHotelPriceCompareResponse, rooms: number = 1): PlatformPrice[] {
    const prices = Array.isArray(response?.platform_prices) ? response.platform_prices : []
    const rimigo = response?.rimigo_price as any
    const hasRimigo = !!(rimigo && rimigo.total_price)
    if (prices.length === 0 && !hasRimigo) return []
    const checkIn = response.check_in ?? new Date().toISOString().slice(0, 10)
    const checkOut = response.check_out ?? new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const nights = Math.max(
        1,
        Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    )
    const effectiveRooms = Math.max(1, rooms)
    const platforms = prices.map((platform) => {
        const totalPrice = parsePriceString(platform.total_price)
        const pricePerNight = Math.round(totalPrice / nights / effectiveRooms)
        return {
            platform: platform.platform,
            price: pricePerNight,
            url: platform.affiliate_link || platform.link,
            logo_url: platform.logo || undefined,
            roomName: platform.roomName || undefined,
            hasFreeCancellation: platform.hasFreeCancellation,
            is_cheapest: false
        }
    })

    // Append Rimigo B2B price if available
    if (hasRimigo) {
        const rimigoTotal = typeof rimigo.total_price === 'string' ? parsePriceString(rimigo.total_price) : rimigo.total_price
        const rimigoPerNight = Math.round(rimigoTotal / nights / effectiveRooms)
        platforms.push({
            platform: 'Rimigo',
            price: rimigoPerNight,
            url: '',
            logo_url: undefined,
            roomName: undefined,
            hasFreeCancellation: undefined,
            is_cheapest: false
        })
    }

    return platforms
}

/** Build GET query string from request (and optional task_id for reconnect).
 *  Always appends attribution params (traveler_collection_id + utm_*) so the
 *  BE can mint the right AttributionContext on /compare. */
function buildCompareQueryParams(
    request: HotelPriceCompareRequest,
    taskId?: string | null,
    travelerCollectionId?: string | null
): URLSearchParams {
    const params = new URLSearchParams()
    if (taskId) {
        params.set('task_id', taskId)
        appendAttributionParams(params, travelerCollectionId)
        return params
    }
    params.set('zentrum_hub_id', request.zentrum_hub_id)
    if (request.kayak_stay_id) {
        params.set('kayak_hotel_id', request.kayak_stay_id)
    }
    params.set('hotel_name', request.hotel_name)
    params.set('city', request.city)
    params.set('check_in', request.check_in)
    params.set('check_out', request.check_out)
    params.set('currency', request.currency)
    params.set('trip_id', request.trip_id)
    params.set('rimigo_price', String(request.rimigo_price))
    params.set('rooms', JSON.stringify(request.rooms?.length ? request.rooms : DEFAULT_ROOMS))
    appendAttributionParams(params, travelerCollectionId)
    return params
}

export type HotelPriceCompareResult =
    | { type: 'json'; data: PlatformPrice[] }
    | { type: 'sse_complete'; data: PlatformPrice[] }
    | { type: 'error'; error: unknown }

export type HotelPriceCompareProgressCallback = (progress: number) => void

/**
 * Fetch hotel price compare via GET: returns cached JSON immediately or SSE stream.
 * Use this for handpicked section instead of polling.
 */
export async function fetchHotelPriceCompare(
    request: HotelPriceCompareRequest,
    options?: {
        onProgress?: HotelPriceCompareProgressCallback
        taskId?: string | null
        /** Collection (TravelerCollection or ContentCollection) ObjectId in scope.
         *  Forwarded as `?traveler_collection_id=…` so BE captures the surface
         *  on the minted AttributionContext. */
        travelerCollectionId?: string | null
    }
): Promise<HotelPriceCompareResult> {
    const baseUrl = API_CONFIG.BASE_URL || ''
    const path = '/api/compare/'
    const params = buildCompareQueryParams(
        request,
        options?.taskId ?? null,
        options?.travelerCollectionId ?? null
    )
    const url = `${baseUrl}${path}?${params.toString()}`

    try {
        const token = await TokenStorage.getAccessToken()
        const headers: HeadersInit = {
            Accept: 'application/json, text/event-stream'
        }
        if (token) {
            headers['Authorization'] = token
        }

        const response = await fetch(url, { method: 'GET', headers, cache: 'no-store' })

        const contentType = response.headers.get('content-type') || ''

        if (contentType.includes('application/json')) {
            const raw = await response.json()
            // Cached response may be wrapped: { status, data: { platform_prices, ... } }
            const payload: ApiHotelPriceCompareResponse = raw?.data && Array.isArray(raw.data?.platform_prices)
                ? raw.data
                : raw
            const platforms = mapApiResponseToPlatforms(payload, request.rooms?.length)
            return { type: 'json', data: platforms }
        }

        if (contentType.includes('text/event-stream')) {
            const result = await handleSSEStream(response, options?.onProgress, request)
            return result
        }

        return {
            type: 'error',
            error: new Error(`Unexpected Content-Type: ${contentType}`)
        }
    } catch (err) {
        return { type: 'error', error: err }
    }
}

/** Parse SSE stream from fetch Response; supports task_id, progress, completed, error */
function handleSSEStream(
    response: Response,
    onProgress: HotelPriceCompareProgressCallback | undefined,
    request: HotelPriceCompareRequest
): Promise<HotelPriceCompareResult> {
    return new Promise((resolve, reject) => {
        const reader = response.body?.getReader()
        if (!reader) {
            resolve({ type: 'error', error: new Error('No response body') })
            return
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let taskId: string | null = null
        let timeoutId: ReturnType<typeof setTimeout> | null = null
        let settled = false

        const clearTimeoutTimer = () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
                timeoutId = null
            }
        }

        const restartTimeout = () => {
            clearTimeoutTimer()
            timeoutId = setTimeout(() => {
                clearTimeoutTimer()
                if (!settled) {
                    settled = true
                    reject(new Error('Timeout: No progress in 20 seconds'))
                }
            }, SSE_TIMEOUT_MS)
        }

        restartTimeout()

        const processLine = (line: string) => {
            if (!line.startsWith('data:')) return
            const jsonStr = line.slice(5).trim()
            if (jsonStr === '[DONE]' || !jsonStr) return
            try {
                const data = JSON.parse(jsonStr) as {
                    task_id?: string
                    status?: string
                    progress?: number
                    data?: ApiHotelPriceCompareResponse
                    error?: string
                }
                clearTimeoutTimer()
                restartTimeout()

                if (data.task_id && !taskId) {
                    taskId = data.task_id
                    try {
                        localStorage.setItem(HOTEL_PRICE_COMPARE_TASK_KEY, data.task_id)
                    } catch {
                        // ignore storage errors
                    }
                }

                if (data.status === 'in_progress' && typeof data.progress === 'number') {
                    onProgress?.(data.progress)
                } else if (data.status === 'completed') {
                    // Backend may send full response in data.data or platform_prices at top level
                    const raw = data.data ?? data
                    const hasPlatformPrices =
                        raw &&
                        typeof raw === 'object' &&
                        Array.isArray((raw as { platform_prices?: unknown }).platform_prices)
                    const arr = hasPlatformPrices
                        ? (raw as { platform_prices: ApiHotelPriceCompareResponse['platform_prices']; check_in?: string; check_out?: string }).platform_prices
                        : []
                    const hasRimigo = !!(raw as { rimigo_price?: { total_price?: unknown } } | undefined)?.rimigo_price?.total_price
                    if (!arr?.length && !hasRimigo) {
                        if (!settled) {
                            settled = true
                            try {
                                localStorage.removeItem(HOTEL_PRICE_COMPARE_TASK_KEY)
                            } catch {
                                // ignore
                            }
                            resolve({ type: 'sse_complete', data: [] })
                        }
                        return
                    }
                    if (settled) return
                    settled = true
                    try {
                        localStorage.removeItem(HOTEL_PRICE_COMPARE_TASK_KEY)
                    } catch {
                        // ignore
                    }
                    const full = raw as Partial<ApiHotelPriceCompareResponse>
                    const payload: ApiHotelPriceCompareResponse = {
                        hotel_search_request_id: full.hotel_search_request_id ?? '',
                        zentrum_hub_id: full.zentrum_hub_id ?? '',
                        accommodation_name: full.accommodation_name ?? '',
                        check_in: full.check_in ?? new Date().toISOString().slice(0, 10),
                        check_out: full.check_out ?? new Date(Date.now() + 86400000).toISOString().slice(0, 10),
                        adults: full.adults ?? 1,
                        children: full.children ?? 0,
                        child_ages: full.child_ages ?? [],
                        currency: full.currency ?? 'INR',
                        platform_prices: arr,
                        rimigo_price: full.rimigo_price ?? null,
                        serp_context: full.serp_context ?? { search_query: '', property_token: '', result_count: 0 }
                    }
                    const platforms = mapApiResponseToPlatforms(payload, request.rooms?.length)
                    resolve({ type: 'sse_complete', data: platforms })
                } else if (data.error) {
                    if (settled) return
                    settled = true
                    try {
                        localStorage.removeItem(HOTEL_PRICE_COMPARE_TASK_KEY)
                    } catch {
                        // ignore
                    }
                    reject(new Error(data.error))
                }
            } catch {
                // ignore malformed JSON
            }
        }

        const readStream = async (): Promise<void> => {
            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    if (settled) break
                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''
                    for (const line of lines) {
                        processLine(line)
                    }
                }
                if (buffer.trim()) processLine(buffer)
                clearTimeoutTimer()
                if (!settled) {
                    settled = true
                    resolve({
                        type: 'error',
                        error: new Error('Stream ended without completion')
                    })
                }
            } catch (err) {
                clearTimeoutTimer()
                if (!settled) {
                    settled = true
                    reject(err)
                }
            }
        }

        readStream().catch((err) => {
            clearTimeoutTimer()
            if (!settled) {
                settled = true
                reject(err)
            }
        })
    })
}

/**
 * Resume a previous compare by task_id (e.g. after page refresh or connection drop).
 * Call with the saved taskId; backend should return SSE for that task.
 */
export async function resumeHotelPriceCompare(
    taskId: string,
    onProgress?: HotelPriceCompareProgressCallback,
    travelerCollectionId?: string | null
): Promise<HotelPriceCompareResult> {
    const baseUrl = API_CONFIG.BASE_URL || ''
    const path = '/api/compare/'
    const params = new URLSearchParams({ task_id: taskId })
    appendAttributionParams(params, travelerCollectionId)
    const url = `${baseUrl}${path}?${params.toString()}`

    try {
        const token = await TokenStorage.getAccessToken()
        const headers: HeadersInit = { Accept: 'application/json, text/event-stream' }
        if (token) headers['Authorization'] = token

        const response = await fetch(url, { method: 'GET', headers, cache: 'no-store' })
        const contentType = response.headers.get('content-type') || ''

        if (contentType.includes('application/json')) {
            const data: ApiHotelPriceCompareResponse = await response.json()
            const platforms = mapApiResponseToPlatforms(data)
            try {
                localStorage.removeItem(HOTEL_PRICE_COMPARE_TASK_KEY)
            } catch {
                // ignore
            }
            return { type: 'json', data: platforms }
        }

        if (contentType.includes('text/event-stream')) {
            return handleSSEStream(response, onProgress, {} as HotelPriceCompareRequest)
        }

        return { type: 'error', error: new Error(`Unexpected Content-Type: ${contentType}`) }
    } catch (err) {
        return { type: 'error', error: err }
    }
}

/** Get saved task_id for resume (e.g. on page load) */
export function getSavedHotelPriceCompareTaskId(): string | null {
    try {
        return localStorage.getItem(HOTEL_PRICE_COMPARE_TASK_KEY)
    } catch {
        return null
    }
}

export const compareHotelPrices = async (
    request: HotelPriceCompareRequest
): Promise<PlatformPrice[]> => {
    try {
        const response = await apiClient.post<ApiHotelPriceCompareResponse>(
            '/api/compare/',
            request
        )

        // Calculate number of nights
        const checkInDate = new Date(response.data.check_in)
        const checkOutDate = new Date(response.data.check_out)
        const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)))

        // Transform API response to our frontend format
        const platforms: PlatformPrice[] = response.data.platform_prices.map((platform) => {
            const totalPrice = parsePriceString(platform.total_price)
            // Calculate price per night
            const pricePerNight = Math.round(totalPrice / nights)

            return {
                platform: platform.platform,
                price: pricePerNight,
                url: platform.affiliate_link || platform.link,
                logo_url: platform.logo || undefined,
                roomName: platform.roomName || undefined,
                is_cheapest: false
            }
        })

        return platforms
    } catch (error) {
        console.error('Error comparing hotel prices:', error)
        throw error
    }
}

