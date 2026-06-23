import { useEffect, useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'

// Chip that compares the flight price the user is seeing now against the
// first price we saw for this section within the last 24h (stored in
// localStorage). Fires only on meaningful movement (≥ 2%), so routine
// noise doesn't train users to ignore it. Copy is action-oriented in both
// directions: a drop is "go book", a surge is "lock in before it worsens".

type Direction = 'up' | 'down'

type PriceChange = {
    direction: Direction
    pct: number
    ageMs: number
}

type Baseline = { price: number; ts: number }

const BASELINE_TTL_MS = 24 * 60 * 60 * 1000
const MIN_CHANGE_PCT = 2

const STORAGE_KEY_PREFIX = 'flight_price_baseline_'

function storageKey(sectionId: string) {
    return `${STORAGE_KEY_PREFIX}${sectionId}`
}

// Module-level guard — only sweep once per page load. The Flights tab can
// mount multiple times (tab switches, re-renders) but a single GC pass
// per session is enough.
let didPurgeStaleBaselines = false

/**
 * Sweep localStorage for ``flight_price_baseline_*`` keys whose stored
 * timestamp is older than ``BASELINE_TTL_MS``. Removes orphaned baselines
 * (sections that have since been deleted, trips no longer active, etc.)
 * so localStorage doesn't grow unbounded over time.
 *
 * Idempotent within a session via the ``didPurgeStaleBaselines`` guard —
 * call it as many times as you want; it only does the work once.
 *
 * Safe to call before any flight sections render. No-op when localStorage
 * is unavailable.
 */
export function purgeStaleFlightPriceBaselines(): void {
    if (didPurgeStaleBaselines) return
    didPurgeStaleBaselines = true
    try {
        if (typeof window === 'undefined' || !window.localStorage) return
        const now = Date.now()
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i)
            if (!key || !key.startsWith(STORAGE_KEY_PREFIX)) continue
            const raw = localStorage.getItem(key)
            if (!raw) {
                keysToRemove.push(key)
                continue
            }
            try {
                const parsed = JSON.parse(raw)
                const ts = typeof parsed?.ts === 'number' ? parsed.ts : 0
                if (!ts || now - ts > BASELINE_TTL_MS) {
                    keysToRemove.push(key)
                }
            } catch {
                // Malformed entry — drop it.
                keysToRemove.push(key)
            }
        }
        for (const key of keysToRemove) {
            try {
                localStorage.removeItem(key)
            } catch {
                // ignore
            }
        }
    } catch {
        // localStorage disabled / quota error — bail.
    }
}

function readBaseline(sectionId: string): Baseline | null {
    try {
        const raw = localStorage.getItem(storageKey(sectionId))
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (typeof parsed?.price !== 'number' || typeof parsed?.ts !== 'number') return null
        return parsed as Baseline
    } catch {
        return null
    }
}

function writeBaseline(sectionId: string, baseline: Baseline) {
    try {
        localStorage.setItem(storageKey(sectionId), JSON.stringify(baseline))
    } catch {
        // storage disabled / quota — silently no-op
    }
}

function formatAge(ms: number): string {
    const mins = Math.floor(ms / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
}

interface Props {
    sectionId: string
    currentPrice: number | null | undefined
}

export default function FlightPriceChangePill({ sectionId, currentPrice }: Props) {
    const [change, setChange] = useState<PriceChange | null>(null)

    useEffect(() => {
        if (!sectionId || !currentPrice || currentPrice <= 0) return
        const now = Date.now()
        const baseline = readBaseline(sectionId)

        // First sighting in this window → seed baseline, no chip yet.
        if (!baseline || now - baseline.ts > BASELINE_TTL_MS) {
            writeBaseline(sectionId, { price: currentPrice, ts: now })
            setChange(null)
            return
        }

        // Same price → nothing to surface.
        if (baseline.price === currentPrice) {
            setChange(null)
            return
        }

        const delta = currentPrice - baseline.price
        const pct = Math.abs((delta / baseline.price) * 100)
        if (pct < MIN_CHANGE_PCT) {
            setChange(null)
            return
        }

        setChange({
            direction: delta > 0 ? 'up' : 'down',
            pct,
            ageMs: now - baseline.ts,
        })
    }, [sectionId, currentPrice])

    if (!change) return null

    const isDrop = change.direction === 'down'
    const age = formatAge(change.ageMs)
    const pctText = change.pct >= 10 ? `${Math.round(change.pct)}%` : `${change.pct.toFixed(1)}%`

    return (
        <div
            role="status"
            className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                isDrop
                    ? 'bg-secondary-green/10 text-secondary-green'
                    : 'bg-amber-50 text-amber-700'
            }`}>
            {isDrop ? <TrendingDown className="w-3 h-3 shrink-0" /> : <TrendingUp className="w-3 h-3 shrink-0" />}
            <span className="font-manrope text-[10px] font-bold leading-none">
                {isDrop ? `Dropped ${pctText} in ${age}` : `Up ${pctText} in ${age}`}
                <span className="opacity-80 font-medium">
                    {' · '}
                    {isDrop ? 'Good time to book' : 'Climbing, book soon'}
                </span>
            </span>
        </div>
    )
}
