import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AxiosError } from 'axios'
import { Check, Sparkles } from 'lucide-react'
import { fetchInteraction } from '@/api/ataAPI/ataApi'
import { useIsMobile } from '../hooks/ItineraryHook'
import GenericMap, { type MapMarker } from '@/components/shared/Map/GenericMap'
import { useCitiesByIdsForMap } from '@/hooks/useCitiesByIdsForMap'
import GenerationDelayBanner from './GenerationDelayBanner'

// ============================================================================
// TYPES
// ============================================================================

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

interface ProgressDetails {
    current_step: string
    progress: ProgressStep[]
}

/** ui_config shapes per step type (from API) */
interface ScanningUiConfig {
    title?: string
    description?: string
    databaseText?: string
    providersText?: string
    providers?: string[]
    queries?: string[]
    map_data?: unknown
}

// Progressive map payload (from map_update.md)
interface MapDataCity {
    city_name: string
    city_id: string
    days: number
    nights: number
    order: number
    role: string
    lat?: number | null
    lng?: number | null
    image_url?: string | null
    activity_count?: number | null
}

interface MapDataActivity {
    id: string
    name: string
    lat?: number | null
    lng?: number | null
    image_url?: string | null
    category?: string | null
    is_must_do?: boolean
}

interface MapDataCityActivitiesEntry {
    activities: MapDataActivity[]
    activity_count: number
}

interface MapData {
    cities?: MapDataCity[]
    city_activities?: Record<string, MapDataCityActivitiesEntry>
    // Other fields exist (transport_legs, entry_flight, exit_flight, day_trips, summary) but are not required for current map rendering.
}

interface AnalyzingUiConfig {
    title?: string
    description?: string
    criteriaHeading?: string
    chips?: { text?: string; kind?: string; icon?: string }[]
    progressText?: string
}

interface PickingOrFinalizingUiConfig {
    title?: string
    description?: string
    text?: string
    pillIcon?: string
}

interface ProgressStep {
    key: string
    type: 'scanning' | 'db_search' | 'analyzing' | 'picking' | 'finalizing'
    ui_config: ScanningUiConfig | AnalyzingUiConfig | PickingOrFinalizingUiConfig
}

interface Interaction {
    id: string
    output_status: 'queued' | 'in_progress' | 'completed' | 'failed'
    progress_details?: ProgressDetails | null
    created_at?: string
}

export interface LoaderCity {
    name: string
    image: string
    lat: number
    lng: number
    nights?: number
    /** Optional city ID for fetching city icon from location API */
    id?: string
}

interface ItineraryGenerationLoaderProps {
    agentId: string
    threadId: string
    interactionId: string
    onComplete?: (interaction: Interaction) => void
    onError?: (error: Error) => void
    pollingInterval?: number
    cities?: LoaderCity[]
    tripName?: string
    totalDays?: number
    /** When true, skip polling and use mockProgressDetails for UI (dev/dummy data) */
    mockMode?: boolean
    mockProgressDetails?: ProgressDetails | null
    mockOutputStatus?: 'queued' | 'in_progress' | 'completed' | 'failed'
    /** @deprecated Backend now handles tripboard progress step. Kept for backward compatibility. */
    tripboardStatus?: 'in_progress' | 'completed'
    /**
     * Tripboard orchestration only: retry interaction polling on transient network/CORS failures
     * (same behavior as former apiClient retry — max 3 retries).
     */
    retryInteractionOnNetworkError?: boolean
}

function isAxiosNetworkError(err: unknown): boolean {
    const e = err as AxiosError
    return !e.response && (e.message === 'Network Error' || e.code === 'ERR_NETWORK')
}

function reloadOncePerInteraction(agentId: string, threadId: string, interactionId: string): boolean {
    if (typeof window === 'undefined') return false
    const key = `tb_interaction_reload_once__${agentId}__${threadId}__${interactionId}`
    try {
        const alreadyReloaded = window.sessionStorage.getItem(key) === '1'
        if (alreadyReloaded) return false
        window.sessionStorage.setItem(key, '1')
        window.location.reload()
        return true
    } catch {
        // If sessionStorage is blocked/unavailable, don't risk reload loops.
        return false
    }
}

/** Format seconds as M:SS (e.g. 0:00, 1:05, 10:30) */
function formatElapsed(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
}

/** Format budget number for display (INR with commas, e.g. 800000 → ₹8,00,000) */
function formatBudgetInr(num: number): string {
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

/** Ordinal suffix for day of month (1st, 2nd, 3rd, 31st, etc.) */
function getOrdinalSuffix(n: number): string {
    if (n >= 11 && n <= 13) return 'th'
    switch (n % 10) {
        case 1:
            return 'st'
        case 2:
            return 'nd'
        case 3:
            return 'rd'
        default:
            return 'th'
    }
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/**
 * Format chip text for display: budget as ₹X,XX,XXX; "X days from YYYY-MM-DD" as "X days from 31st of October"; otherwise return as-is.
 */
function formatChipDisplayText(text: string | undefined): string {
    if (!text || typeof text !== 'string') return ''
    const t = text.replace(/\$/g, '').trim()

    // "800000 budget" → "₹8,00,000 budget"
    const budgetMatch = t.match(/^(\d+)\s*budget$/i)
    if (budgetMatch) {
        const num = parseInt(budgetMatch[1], 10)
        return `${formatBudgetInr(num)} budget`
    }

    // "30 days from 2026-10-31" → "30 days from 31st of October"
    const daysFromMatch = t.match(/^(\d+)\s+days?\s+from\s+(\d{4})-(\d{2})-(\d{2})$/i)
    if (daysFromMatch) {
        const [, days, month, day] = daysFromMatch
        const monthNum = parseInt(month, 10)
        const dayNum = parseInt(day, 10)
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
            const monthName = MONTH_NAMES[monthNum - 1]
            const ordinal = `${dayNum}${getOrdinalSuffix(dayNum)}`
            return `${days} days from ${ordinal} of ${monthName}`
        }
    }

    return t
}

/** Max characters to show in a chip before truncating; longer text gets "..." appended */
const CHIP_TEXT_MAX_LENGTH = 32

function truncateChipText(text: string, maxLength: number = CHIP_TEXT_MAX_LENGTH): string {
    if (!text || text.length <= maxLength) return text
    return `${text.slice(0, maxLength).trim()}…`
}

function isNonNullObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

async function geocodeCityFallback(cityName: string): Promise<{ lat: number; lng: number } | null> {
    if (!MAPBOX_TOKEN || !cityName) return null
    try {
        const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityName)}.json?access_token=${MAPBOX_TOKEN}&types=place&limit=1`
        )
        const data = await res.json()
        const feature = data?.features?.[0]
        if (feature?.center) {
            return { lat: feature.center[1], lng: feature.center[0] }
        }
    } catch {
        // fallback geocoding failed — silently ignore
    }
    return null
}

// ============================================================================
// CITY HERO CARDS STRIP
// ============================================================================

const CityHeroStrip: React.FC<{ cities: LoaderCity[]; isMobile: boolean }> = ({ cities, isMobile }) => {
    if (cities.length === 0) return null

    const cardW = isMobile ? 'w-[120px]' : 'w-[160px]'
    const cardH = isMobile ? 'h-[80px]' : 'h-[100px]'

    return (
        <div className="relative w-full">
            {/* Fade edges */}
            {cities.length > 2 && (
                <>
                    <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
                </>
            )}
            <div className={`flex gap-3 px-4 py-2 justify-center ${cities.length > 1 ? 'overflow-x-auto snap-x snap-mandatory scrollbar-hide' : ''}`}>
                {cities.map((city, idx) => (
                    <div
                        key={`${city.name}-${idx}`}
                        className={`relative ${cardW} ${cardH} rounded-xl overflow-hidden shrink-0 snap-start`}>
                        {city.image && city.image.trim() ? (
                            <img
                                src={city.image}
                                alt={city.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary-default/30 to-primary-default/60 flex items-center justify-center">
                                <span className="text-2xl font-bold text-white/90 font-manrope">{city.name.charAt(0).toUpperCase()}</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        <div className="absolute bottom-2 left-2.5 right-2">
                            <p className="text-[13px] font-semibold text-white font-manrope leading-tight drop-shadow-lg truncate">{city.name}</p>
                            {city.nights !== undefined && city.nights > 0 && (
                                <p className="text-[11px] text-white/60 font-manrope mt-0.5">
                                    {city.nights} {city.nights === 1 ? 'night' : 'nights'}
                                </p>
                            )}
                        </div>
                        {/* Sequence badge */}
                        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary-default flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">{idx + 1}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ============================================================================
// MAP PLACEHOLDER (when no geo data)
// ============================================================================

const MapPlaceholder: React.FC<{ height: string }> = ({ height }) => (
    <div
        className="bg-gradient-to-br from-grey-5 to-grey-4/50 rounded-xl flex flex-col items-center justify-center gap-3"
        style={{ height }}>
        <img
            src="/icons/compass.png"
            className="w-8 h-8 animate-compass"
            alt=""
        />
        <span className="text-sm text-grey-2 font-manrope font-medium">Mapping your route…</span>
    </div>
)

// ============================================================================
// PROGRESS CARD (backend-driven step timeline)
// ============================================================================

const ProgressCard: React.FC<{
    progressDetails: ProgressDetails | null
    outputStatus: string
}> = ({ progressDetails, outputStatus }) => {
    if (!progressDetails?.progress?.length) {
        return (
            <div className="bg-white rounded-2xl border border-grey-4/50 shadow-sm p-6">
                <div className="flex items-center gap-3">
                    <img
                        src="/icons/compass.png"
                        className="w-5 h-5 animate-compass"
                        alt=""
                    />
                    <span className="text-sm text-grey-2 font-manrope font-medium">Preparing your itinerary…</span>
                </div>
            </div>
        )
    }

    const { current_step, progress } = progressDetails
    const currentStepIndex = progress.findIndex((s) => s.key === current_step)

    return (
        <div className="bg-white rounded-2xl border border-grey-4/50 shadow-[0_2px_20px_rgba(112,17,246,0.06)] p-5">
            {/* Overall progress bar */}
            <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-semibold font-manrope text-grey-1">
                        Step {Math.min(currentStepIndex + 1, progress.length)} of {progress.length}
                    </span>
                    <span className="text-[12px] font-medium font-manrope text-grey-3">
                        {Math.round(((currentStepIndex + (outputStatus === 'completed' ? 1 : 0.5)) / progress.length) * 100)}%
                    </span>
                </div>
                <div className="h-1.5 bg-grey-5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary-default to-primary-light rounded-full transition-all duration-1000 ease-out"
                        style={{
                            width: `${((currentStepIndex + (outputStatus === 'completed' ? 1 : 0.5)) / progress.length) * 100}%`
                        }}
                    />
                </div>
            </div>

            {/* Steps list */}
            <div className="flex flex-col">
                {progress.map((step, index) => {
                    const isActive = index === currentStepIndex && (outputStatus === 'in_progress' || outputStatus === 'queued')
                    const isCompleted = index < currentStepIndex || outputStatus === 'completed'
                    const isFuture = index > currentStepIndex
                    const isLast = index === progress.length - 1
                    const config = step.ui_config

                    return (
                        <div
                            key={step.key}
                            className="flex items-stretch">
                            {/* Timeline connector */}
                            <div className="flex flex-col items-center mr-3.5 mt-0.5 shrink-0">
                                <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 overflow-hidden ${
                                        isActive
                                            ? 'bg-primary-default-80 shadow-[0_0_0_4px_rgba(112,17,246,0.12)]'
                                            : isCompleted
                                              ? 'bg-secondary-green'
                                              : 'bg-grey-4'
                                    }`}>
                                    {isActive ? (
                                        <img
                                            src="https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/logos/compass_logo/compass_logo_purple_transparent.png"
                                            alt=""
                                            className="w-4.5 h-4.5 object-contain animate-compass"
                                        />
                                    ) : isCompleted ? (
                                        <Check
                                            size={11}
                                            className="text-white"
                                            strokeWidth={3}
                                        />
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-grey-3" />
                                    )}
                                </div>

                                {!isLast && (
                                    <div
                                        className={`w-0.5 flex-1 min-h-[28px] transition-all duration-500 ${
                                            isCompleted ? 'bg-secondary-green' : 'bg-grey-4'
                                        } ${isActive ? 'min-h-[80px]' : ''}`}
                                    />
                                )}
                            </div>

                            {/* Step content */}
                            <div className={`flex-1 pb-2 transition-all duration-300 ${isFuture ? 'opacity-40' : 'opacity-100'}`}>
                                <h4
                                    className={`text-[14px] font-semibold font-red-hat-display leading-tight ${
                                        isActive ? 'text-primary-default' : 'text-grey-0'
                                    }`}>
                                    {'title' in config ? config.title : ''}
                                </h4>

                                {isActive && 'description' in config && config.description && (
                                    <p className="text-[12px] font-medium text-grey-2 font-manrope mt-0.5 mb-2">{config.description}</p>
                                )}

                                {/* Active: scanning — databaseText, providers, queries */}
                                {isActive && step.type === 'scanning' && (
                                    <div className="space-y-1.5 mt-1">
                                        {'databaseText' in config && config.databaseText && (
                                            <div className="flex items-center gap-2 bg-grey-5 rounded-lg px-3 py-2">
                                                <div className="w-4 h-4 rounded-full bg-primary-default/10 flex items-center justify-center shrink-0">
                                                    <Sparkles
                                                        size={9}
                                                        className="text-primary-default"
                                                    />
                                                </div>
                                                <span className="text-[12px] font-medium text-grey-1 font-manrope">{config.databaseText}</span>
                                            </div>
                                        )}
                                        {'providersText' in config && config.providersText && (
                                            <div className="flex items-center gap-2 bg-grey-5 rounded-lg px-3 py-2">
                                                {'providers' in config && config.providers && config.providers.length > 0 && (
                                                    <div className="flex -space-x-1.5">
                                                        {config.providers.slice(0, 3).map((src, i) => (
                                                            <img
                                                                key={i}
                                                                src={src}
                                                                alt=""
                                                                className="w-4 h-4 rounded-full border border-white"
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                <span className="text-[12px] font-medium text-grey-1 font-manrope">{config.providersText}</span>
                                            </div>
                                        )}
                                        {'queries' in config && config.queries && config.queries.length > 0 && (
                                            <div className="space-y-1.5">
                                                {config.queries.map((query, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center gap-2 bg-grey-5 rounded-lg px-3 py-2">
                                                        <Sparkles
                                                            size={9}
                                                            className="text-primary-default shrink-0"
                                                        />
                                                        <span className="text-[12px] font-medium text-grey-1 font-manrope">{query}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Active: db_search — queries only */}
                                {isActive && step.type === 'db_search' && 'queries' in config && config.queries && config.queries.length > 0 && (
                                    <div className="space-y-1.5 mt-1">
                                        {config.queries.map((query, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2 bg-grey-5 rounded-lg px-3 py-2">
                                                <Sparkles
                                                    size={9}
                                                    className="text-primary-default shrink-0"
                                                />
                                                <span className="text-[12px] font-medium text-grey-1 font-manrope">{query}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Active: analyzing — chips + progressText */}
                                {isActive && step.type === 'analyzing' && (
                                    <>
                                        {'chips' in config && config.chips && config.chips.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {config.chips.map((chip, idx) => {
                                                    const rawText = chip.text?.replace(/\$/g, '') ?? ''
                                                    const displayText = truncateChipText(formatChipDisplayText(chip.text))
                                                    return (
                                                        <span
                                                            key={idx}
                                                            title={rawText}
                                                            className={`inline-flex items-center text-[10px] font-medium font-manrope px-2.5 py-1 rounded-full max-w-[200px] min-w-0 ${
                                                                chip.kind === 'success'
                                                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                                                    : 'bg-grey-5 text-grey-1 border border-grey-4'
                                                            }`}>
                                                            <span className="block min-w-0 truncate">{displayText}</span>
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        )}
                                        {'progressText' in config && config.progressText && (
                                            <p className="text-[12px] font-medium text-grey-2 font-manrope mt-1.5">{config.progressText}</p>
                                        )}
                                    </>
                                )}

                                {/* Active: picking or finalizing — text + pillIcon */}
                                {isActive && (step.type === 'picking' || step.type === 'finalizing') && 'text' in config && config.text && (
                                    <div className="flex items-center gap-2 bg-grey-5 rounded-lg px-3 py-2 mt-1">
                                        {'pillIcon' in config && config.pillIcon && (
                                            <img
                                                src={config.pillIcon}
                                                alt=""
                                                className="w-4 h-4"
                                            />
                                        )}
                                        <span className="text-[11px] font-medium text-grey-1 font-manrope">{config.text}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ItineraryGenerationLoader: React.FC<ItineraryGenerationLoaderProps> = ({
    agentId,
    threadId,
    interactionId,
    onComplete,
    onError,
    pollingInterval = 5000,
    cities = [],
    mockMode = false,
    mockProgressDetails = null,
    mockOutputStatus = 'in_progress',
    retryInteractionOnNetworkError = false,
}) => {
    const isMobile = useIsMobile()
    const [interaction, setInteraction] = useState<Interaction | null>(null)
    const [error, setError] = useState<Error | null>(null)
    const [isPolling, setIsPolling] = useState(!mockMode)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [nowTick, setNowTick] = useState(() => Date.now())

    // Stable refs for callbacks — prevents fetchData from being recreated on every render
    // when parent passes inline arrow functions as onComplete/onError
    const onCompleteRef = useRef(onComplete)
    onCompleteRef.current = onComplete
    const onErrorRef = useRef(onError)
    onErrorRef.current = onError

    // Stable created_at for mock (set once so timer doesn't reset each render)
    const [mockCreatedAt] = useState(() => new Date().toISOString())

    // When mockMode: use mock data for display; otherwise use polled interaction
    const displayInteraction: Interaction | null = mockMode
        ? {
              id: '',
              output_status: mockOutputStatus,
              progress_details: mockProgressDetails ?? null,
              created_at: mockCreatedAt
          }
        : interaction

    // Progress details come directly from backend (includes tripboard step when applicable)
    const augmentedProgressDetails: ProgressDetails | null = useMemo(() => {
        return displayInteraction?.progress_details ?? null
    }, [displayInteraction?.progress_details])

    const effectiveOutputStatus: Interaction['output_status'] = displayInteraction?.output_status ?? 'queued'

    // Elapsed: from interaction created_at when present, otherwise local counter
    const createdAtMs = displayInteraction?.created_at ? new Date(displayInteraction.created_at).getTime() : null
    const elapsedForDisplay = createdAtMs != null ? Math.max(0, Math.floor((nowTick - createdAtMs) / 1000)) : elapsedSeconds

    // Tick every second when using created_at so timer updates
    useEffect(() => {
        if (createdAtMs == null) return
        const tick = setInterval(() => setNowTick(Date.now()), 1000)
        return () => clearInterval(tick)
    }, [createdAtMs])

    // Elapsed timer (local counter when no created_at): starts at 0:00, stops when generation completes or errors
    useEffect(() => {
        if (!isPolling) return
        const tick = setInterval(() => {
            setElapsedSeconds((s) => s + 1)
        }, 1000)
        return () => clearInterval(tick)
    }, [isPolling])

    // In mock mode (no API created_at), also run elapsed timer so UI shows time
    useEffect(() => {
        if (!mockMode || createdAtMs != null) return
        const tick = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
        return () => clearInterval(tick)
    }, [mockMode, createdAtMs])

    // Polling (skipped when mockMode)
    const fetchData = useCallback(async () => {
        const MAX_NETWORK_RETRIES = 3

        try {
            let data: Awaited<ReturnType<typeof fetchInteraction>>
            let attempt = 0

            while (true) {
                try {
                    data = await fetchInteraction(agentId, threadId, interactionId)
                    break
                } catch (err) {
                    const canRetry =
                        retryInteractionOnNetworkError &&
                        attempt < MAX_NETWORK_RETRIES &&
                        isAxiosNetworkError(err)
                    if (!canRetry) throw err
                    attempt += 1
                    await new Promise((r) => setTimeout(r, 1000 * attempt))
                }
            }

            setInteraction(data as Interaction)
            setError(null)
            if (data.output_status === 'completed' || data.output_status === 'failed') {
                setIsPolling(false)
                if (data.output_status === 'completed') {
                    onCompleteRef.current?.(data as Interaction)
                }
            }
        } catch (err) {
            if (retryInteractionOnNetworkError && isAxiosNetworkError(err)) {
                const didReload = reloadOncePerInteraction(agentId, threadId, interactionId)
                if (didReload) return
            }
            const e = err instanceof Error ? err : new Error('Failed to fetch interaction')
            setError(e)
            onErrorRef.current?.(e)
            setIsPolling(false)
        }
    }, [agentId, threadId, interactionId, retryInteractionOnNetworkError])

    useEffect(() => {
        if (mockMode || !isPolling) return
        fetchData()
        const timer = setInterval(fetchData, pollingInterval)
        return () => clearInterval(timer)
    }, [mockMode, isPolling, pollingInterval, fetchData])

    // Extract progressive map_data from progress_details (researching/scanning step)
    const progressiveMapData: MapData | null = useMemo(() => {
        const pd = displayInteraction?.progress_details
        if (!pd?.progress?.length) return null

        const researchingStep = pd.progress.find((s) => s.key === 'researching')
        const scanningStepWithMap = pd.progress.find((s) => s.type === 'scanning' && isNonNullObject(s.ui_config) && 'map_data' in s.ui_config)

        const candidate =
            (researchingStep?.ui_config as ScanningUiConfig | undefined)?.map_data ??
            (scanningStepWithMap?.ui_config as ScanningUiConfig | undefined)?.map_data

        return isNonNullObject(candidate) ? (candidate as MapData) : null
    }, [displayInteraction?.progress_details])

    // Geocode progressive cities if loader didn't provide lat/lng yet (fallback only)
    const [progressiveCityGeoById, setProgressiveCityGeoById] = useState<Record<string, { lat: number; lng: number }>>({})

    const mapDataCitiesSorted = useMemo(() => {
        const list = progressiveMapData?.cities ?? []
        return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    }, [progressiveMapData])

    useEffect(() => {
        if (!MAPBOX_TOKEN) return
        if (!mapDataCitiesSorted.length) return

        let cancelled = false
        const run = async () => {
            const missing = mapDataCitiesSorted.filter((c) => {
                if (!c.city_id) return false
                const hasDirect = Number.isFinite(c.lat) && Number.isFinite(c.lng)
                const hasCached = !!progressiveCityGeoById[c.city_id]
                return !hasDirect && !hasCached
            })
            if (!missing.length) return

            const results: Record<string, { lat: number; lng: number }> = {}
            for (const c of missing) {
                const geo = await geocodeCityFallback(c.city_name)
                if (geo && c.city_id) {
                    results[c.city_id] = geo
                }
            }

            if (!cancelled && Object.keys(results).length) {
                setProgressiveCityGeoById((prev) => ({ ...prev, ...results }))
            }
        }
        run()

        return () => {
            cancelled = true
        }
    }, [mapDataCitiesSorted, progressiveCityGeoById])

    const mapDataCitiesWithGeo = useMemo(() => {
        return mapDataCitiesSorted
            .map((c) => {
                const directOk = Number.isFinite(c.lat) && Number.isFinite(c.lng)
                const cached = c.city_id ? progressiveCityGeoById[c.city_id] : undefined
                const lat = directOk ? (c.lat as number) : cached?.lat
                const lng = directOk ? (c.lng as number) : cached?.lng
                return { ...c, lat, lng }
            })
            .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
    }, [mapDataCitiesSorted, progressiveCityGeoById])

    // Collect city IDs for location API (city icons)
    const cityIdsForLocationApi = useMemo(() => {
        const fromProgressive = (progressiveMapData?.cities ?? []).map((c) => c.city_id).filter((id): id is string => !!id)
        const fromWizard = cities.map((c) => c.id).filter((id): id is string => !!id)
        return [...new Set([...fromProgressive, ...fromWizard])]
    }, [progressiveMapData?.cities, cities])

    const { data: citiesFromMapApi } = useCitiesByIdsForMap(cityIdsForLocationApi)

    const cityThumbnailById = useMemo(() => {
        const m: Record<string, string> = {}
        ;(citiesFromMapApi ?? []).forEach((c) => {
            if (c.city_thumbnail_url) m[c.city_id] = c.city_thumbnail_url
        })
        return m
    }, [citiesFromMapApi])

    const progressiveImageByCityId = useMemo(() => {
        const m: Record<string, string> = {}
        ;(progressiveMapData?.cities ?? []).forEach((c) => {
            if (c.city_id && c.image_url && String(c.image_url).trim()) m[c.city_id] = c.image_url
        })
        return m
    }, [progressiveMapData?.cities])

    // Hero strip cities enriched with the same image resolution the map markers
    // use: wizard image → progressive image_url → location-personalization thumbnail.
    const heroCities = useMemo<LoaderCity[]>(
        () =>
            cities.map((c) => {
                const resolved =
                    (c.image && c.image.trim() ? c.image : '') ||
                    (c.id ? progressiveImageByCityId[c.id] : '') ||
                    (c.id ? cityThumbnailById[c.id] : '') ||
                    ''
                return resolved === c.image ? c : { ...c, image: resolved }
            }),
        [cities, progressiveImageByCityId, cityThumbnailById]
    )

    // Fallback: cities passed from the wizard, enriched with map API geo data when wizard coords are missing
    // (wizard cities may have lat=0/lng=0 when geoLocation was not available at selection time)
    const fallbackCitiesWithGeo = useMemo(() => {
        const geoById: Record<string, { lat: number; lng: number }> = {}
        ;(citiesFromMapApi ?? []).forEach((c) => {
            if (c.latitude != null && c.longitude != null) {
                geoById[c.city_id] = { lat: c.latitude, lng: c.longitude }
            }
        })

        return cities
            .map((c) => {
                const hasValidGeo = Number.isFinite(c.lat) && Number.isFinite(c.lng) && (c.lat !== 0 || c.lng !== 0)
                if (hasValidGeo) return c
                // Try map API geo data
                const apiGeo = c.id ? geoById[c.id] : undefined
                if (apiGeo) return { ...c, lat: apiGeo.lat, lng: apiGeo.lng }
                return c
            })
            .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng) && (c.lat !== 0 || c.lng !== 0))
    }, [cities, citiesFromMapApi])

    // City markers from progressive map data (image: progressive image_url first, else location-personalization map API)
    const mapDataCityMarkers: MapMarker[] = useMemo(() => {
        let dayCursor = 1
        return mapDataCitiesWithGeo.map((c) => {
            const startDay = dayCursor
            const endDay = dayCursor + Math.max(1, c.days || 1) - 1
            dayCursor = endDay + 1

            const dayLabel = startDay === endDay ? `Day ${startDay}` : `Day ${startDay}-${endDay}`
            const labelWithCount = c.activity_count != null && Number.isFinite(c.activity_count) ? `${dayLabel} • ${c.activity_count}` : dayLabel

            // Prefer image_url from progressive loader; fallback to location-personalization map API
            const image =
                c.image_url && String(c.image_url).trim()
                    ? c.image_url
                    : c.city_id && cityThumbnailById[c.city_id]
                      ? cityThumbnailById[c.city_id]
                      : undefined

            return {
                id: c.city_id || c.city_name,
                name: c.city_name,
                geo_location: { lat: c.lat as number, long: c.lng as number },
                image,
                type: 'city' as const,
                sequenceNumber: c.order,
                sequenceLabel: labelWithCount
            }
        })
    }, [mapDataCitiesWithGeo, cityThumbnailById])

    // Experience/activity markers from progressive map data (Phase 2)
    const mapDataActivityMarkers: MapMarker[] = useMemo(() => {
        const cityActivities = progressiveMapData?.city_activities
        if (!cityActivities) return []

        const markers: MapMarker[] = []
        Object.values(cityActivities).forEach((entry) => {
            entry?.activities?.forEach((a) => {
                if (!Number.isFinite(a.lat) || !Number.isFinite(a.lng)) return
                markers.push({
                    id: a.id,
                    name: a.name,
                    geo_location: { lat: a.lat as number, long: a.lng as number },
                    image: a.image_url ?? undefined,
                    type: 'experience' as const,
                    experience_id: a.id
                })
            })
        })
        return markers
    }, [progressiveMapData])

    // Fallback city markers (wizard cities; use location API city icon when available)
    const fallbackCityMarkers: MapMarker[] = useMemo(
        () =>
            fallbackCitiesWithGeo.map((c, idx) => {
                const image = c.id && cityThumbnailById[c.id] ? cityThumbnailById[c.id] : c.image
                return {
                    id: `loader-city-${idx}`,
                    name: c.name,
                    geo_location: { lat: c.lat, long: c.lng },
                    image,
                    type: 'city' as const,
                    sequenceNumber: idx + 1,
                    sequenceLabel: c.nights ? `${c.nights} nights` : undefined
                }
            }),
        [fallbackCitiesWithGeo, cityThumbnailById]
    )

    // Route coordinates [lng, lat] in order (progressive preferred; fallback otherwise)
    const mapDataRouteCoordinates: [number, number][] = useMemo(
        () => mapDataCitiesWithGeo.map((c) => [c.lng as number, c.lat as number]),
        [mapDataCitiesWithGeo]
    )

    const fallbackRouteCoordinates: [number, number][] = useMemo(() => fallbackCitiesWithGeo.map((c) => [c.lng, c.lat]), [fallbackCitiesWithGeo])

    const hasProgressiveCities = (progressiveMapData?.cities?.length ?? 0) > 0
    const hasProgressiveGeo = mapDataCityMarkers.length > 0 || mapDataActivityMarkers.length > 0

    // Prefer loader map data as soon as it exists; fall back to wizard markers until we have geo
    const markersForMap = hasProgressiveCities && hasProgressiveGeo ? [...mapDataCityMarkers, ...mapDataActivityMarkers] : fallbackCityMarkers

    // Route can be formed once we have >=2 city points from loader (after fallback geocoding if needed)
    const routeCoordinates = hasProgressiveCities && mapDataRouteCoordinates.length >= 2 ? mapDataRouteCoordinates : fallbackRouteCoordinates

    const hasGeoData = useMemo(() => markersForMap.some((m) => m.geo_location?.lat != null && m.geo_location?.long != null), [markersForMap])

    /* ─── Error state ─── */
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-md w-full text-center">
                    <p className="font-semibold text-red-600 font-manrope">Something went wrong</p>
                    <p className="text-sm mt-2 text-grey-2 font-manrope">{error.message}</p>
                </div>
            </div>
        )
    }

    /* ─── MOBILE LAYOUT ─── */
    if (isMobile) {
        return (
            <div className="min-h-screen w-full bg-white flex flex-col">
                {/* Header */}
                <div className="pt-4 pb-1 px-4 shrink-0" />

                {/* Progress card + timer and text just below */}
                <div className="px-4 flex-1 mt-4 flex flex-col">
                    <ProgressCard
                        progressDetails={augmentedProgressDetails}
                        outputStatus={effectiveOutputStatus}
                    />
                    {/* Footer hint (same styling as desktop) */}
                    <div className="flex flex-col items-center justify-center gap-2 mt-4">
                        <span className="text-sm bg-primary-default-80 px-2 py-1 rounded-sm font-medium font-manrope text-primary-default tabular-nums">
                            {formatElapsed(elapsedForDisplay)}
                        </span>
                        {/* <span className="text-sm font-medium font-manrope text-grey-2 text-center w-3/4">
                            · This might take up to 5 minutes. <br /> You can come back later.{' '}
                        </span> */}
                        <GenerationDelayBanner />
                    </div>
                </div>
            </div>
        )
    }

    /* ─── DESKTOP LAYOUT ─── */
    const desktopContentHeight = 'calc(100vh - 340px)'
    return (
        <div className="min-h-screen w-full bg-white flex flex-col">
            {/* Spacer */}
            <div className="pt-4 pb-1 px-4 shrink-0" />
            {/* Center loader + map in the viewport */}
            <div className="flex-1 flex items-center justify-center px-6 py-4">
                <div className="w-full max-w-6xl flex gap-6 items-stretch min-h-[calc(100vh-340px)]">
                    {/* Left: Progress card (aligned with map) */}
                    <div className="w-[380px] shrink-0 flex flex-col">
                        <ProgressCard
                            progressDetails={augmentedProgressDetails}
                            outputStatus={effectiveOutputStatus}
                        />

                        {/* Footer hint below progress */}
                        <div className="flex flex-col items-center justify-center gap-2 mt-4">
                            <span className="text-sm bg-primary-default-80 px-2 py-1 rounded-sm font-medium font-manrope text-primary-default tabular-nums">
                                {formatElapsed(elapsedForDisplay)}
                            </span>
                            {/* · */}
                            {/* <span className="text-sm font-medium font-manrope text-grey-2 text-center w-3/4">
                                This might take up to 5 minutes. <br /> You can come back later.{' '}
                            </span> */}
                            <GenerationDelayBanner />
                        </div>

                        {/* come back later text */}
                        {/* <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-white border border-purple-200/50 rounded-xl py-2 px-3 mt-2">
                            <div className="w-8 h-8 rounded-lg bg-primary-default/10 flex items-center justify-center shrink-0">
                                <Sparkles
                                    size={16}
                                    className="text-primary-default"
                                />
                            </div>
                            <div className="flex-1">
                                <p className="itinerary-heading font-semibold">You can come back later to see your itinerary.</p>
                                <p className="itinerary-subheading">Good things take time!</p>
                            </div>
                            
                        </div> */}
                    </div>

                    {/* Right: Map (same height as left column) */}
                    <div className="flex-1 min-w-0 flex flex-col">
                        {hasGeoData ? (
                            <div className="rounded-xl overflow-hidden flex-1 min-h-0">
                                <GenericMap
                                    markers={markersForMap}
                                    routeCoordinates={routeCoordinates.length >= 2 ? routeCoordinates : undefined}
                                    height={desktopContentHeight}
                                    className="rounded-xl w-full h-full"
                                    initialPitch={0}
                                    minZoom={3}
                                    hideExpandButton
                                />
                            </div>
                        ) : (
                            <MapPlaceholder height={desktopContentHeight} />
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom: City hero cards strip */}
            {cities.length > 0 && (
                <div className="w-full max-w-6xl mx-auto pb-6">
                    <CityHeroStrip
                        cities={heroCities}
                        isMobile={false}
                    />
                </div>
            )}
        </div>
    )
}

export default ItineraryGenerationLoader
