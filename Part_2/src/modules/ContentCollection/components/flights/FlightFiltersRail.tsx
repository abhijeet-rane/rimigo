import React, { useEffect } from 'react'
import { Moon, Sun, Sunset, X } from 'lucide-react'
import type { ExploreFlight } from './FlightExploreView'

export type StopBucket = 0 | 1 | 2 // 2 = 2+ stops
export type DepartureBucket = 'early' | 'morning' | 'noon' | 'evening'
export type DurationBucket = 'under10' | 'between10_13' | 'over13'
export type SortKey = 'best' | 'cheapest' | 'fastest' | 'earliest'

export interface FlightFilterState {
    stops: Set<StopBucket>
    priceMin: number | null
    priceMax: number | null
    departure: Set<DepartureBucket>
    duration: Set<DurationBucket>
    airlines: Set<string>
    bagsChecked: boolean
    /** IATA codes of selected origin airports (first segment's origin).
     *  Empty set = no filter. Populated when the user wants to narrow a
     *  metro-level search (e.g. PAR → CDG only) to specific airports. */
    originAirports: Set<string>
    destinationAirports: Set<string>
}

export const EMPTY_FILTERS: FlightFilterState = {
    stops: new Set(),
    priceMin: null,
    priceMax: null,
    departure: new Set(),
    duration: new Set(),
    airlines: new Set(),
    bagsChecked: false,
    originAirports: new Set(),
    destinationAirports: new Set()
}

export const isFiltersEmpty = (f: FlightFilterState): boolean =>
    f.stops.size === 0 &&
    f.priceMin === null &&
    f.priceMax === null &&
    f.departure.size === 0 &&
    f.duration.size === 0 &&
    f.airlines.size === 0 &&
    !f.bagsChecked &&
    f.originAirports.size === 0 &&
    f.destinationAirports.size === 0

/**
 * Count active filters across all sections — used by the mobile "Filters"
 * pill to show a numeric badge so users can see at a glance how many
 * constraints are currently narrowing the result set.
 */
export const countActiveFilters = (f: FlightFilterState): number => {
    let n = 0
    n += f.stops.size
    if (f.priceMin !== null || f.priceMax !== null) n += 1
    n += f.departure.size
    n += f.duration.size
    n += f.airlines.size
    if (f.bagsChecked) n += 1
    n += f.originAirports.size
    n += f.destinationAirports.size
    return n
}

interface AirlineFacet {
    code: string
    name: string
    minPrice: number
}

interface AirportFacet {
    code: string
    name: string
    cityName: string
    count: number
}

export interface FlightFacets {
    stopCounts: Record<StopBucket, number>
    priceMin: number
    priceMax: number
    airlines: AirlineFacet[]
    durationCounts: Record<DurationBucket, number>
    departureCounts: Record<DepartureBucket, number>
    originAirports: AirportFacet[]
    destinationAirports: AirportFacet[]
}

const departureBucketFor = (iso: string | undefined): DepartureBucket => {
    if (!iso) return 'morning'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return 'morning'
    const h = d.getHours()
    if (h < 6) return 'early'
    if (h < 12) return 'morning'
    if (h < 18) return 'noon'
    return 'evening'
}

const durationBucketFor = (mins: number): DurationBucket => {
    const h = mins / 60
    if (h < 10) return 'under10'
    if (h < 13) return 'between10_13'
    return 'over13'
}

const totalDurationMins = (flight: ExploreFlight): number => {
    const segs = flight.segments || []
    if (segs.length === 0) return 0
    const dep = new Date(segs[0].origin?.departure_time || '').getTime()
    const arr = new Date(segs[segs.length - 1].destination?.arrival_time || '').getTime()
    if (!Number.isFinite(dep) || !Number.isFinite(arr)) return 0
    return Math.max(0, Math.round((arr - dep) / 60000))
}

const flightPrice = (flight: ExploreFlight): number => {
    const offerPrice = Number(flight.best_offer?.price)
    if (Number.isFinite(offerPrice) && offerPrice > 0) return offerPrice
    return Number(flight.total_price) || 0
}

export const computeFacets = (flights: ExploreFlight[]): FlightFacets => {
    const stopCounts: Record<StopBucket, number> = { 0: 0, 1: 0, 2: 0 }
    const departureCounts: Record<DepartureBucket, number> = { early: 0, morning: 0, noon: 0, evening: 0 }
    const durationCounts: Record<DurationBucket, number> = { under10: 0, between10_13: 0, over13: 0 }
    const airlineMap = new Map<string, AirlineFacet>()
    const originMap = new Map<string, AirportFacet>()
    const destinationMap = new Map<string, AirportFacet>()
    let priceMin = Infinity
    let priceMax = -Infinity

    for (const f of flights) {
        const stops = Math.min(2, Math.max(0, Number(f.stop_count ?? Math.max(0, (f.segments || []).length - 1)))) as StopBucket
        stopCounts[stops] = (stopCounts[stops] ?? 0) + 1

        const dep = f.segments?.[0]?.origin?.departure_time
        const depBucket = departureBucketFor(dep)
        departureCounts[depBucket] = (departureCounts[depBucket] ?? 0) + 1

        const dur = totalDurationMins(f)
        const durBucket = durationBucketFor(dur)
        durationCounts[durBucket] = (durationCounts[durBucket] ?? 0) + 1

        const code = f.segments?.[0]?.airline?.code
        const name = f.segments?.[0]?.airline?.name || code || ''
        const price = flightPrice(f)
        if (code) {
            const existing = airlineMap.get(code)
            if (!existing || price < existing.minPrice) {
                airlineMap.set(code, { code, name, minPrice: price })
            }
        }

        const origin = f.segments?.[0]?.origin
        if (origin?.airport_code) {
            const existing = originMap.get(origin.airport_code)
            if (existing) {
                existing.count += 1
            } else {
                originMap.set(origin.airport_code, {
                    code: origin.airport_code,
                    name: origin.airport_name || origin.airport_code,
                    cityName: origin.city_name || '',
                    count: 1
                })
            }
        }

        const lastSeg = f.segments?.[f.segments.length - 1]
        const destination = lastSeg?.destination
        if (destination?.airport_code) {
            const existing = destinationMap.get(destination.airport_code)
            if (existing) {
                existing.count += 1
            } else {
                destinationMap.set(destination.airport_code, {
                    code: destination.airport_code,
                    name: destination.airport_name || destination.airport_code,
                    cityName: destination.city_name || '',
                    count: 1
                })
            }
        }

        if (Number.isFinite(price) && price > 0) {
            priceMin = Math.min(priceMin, price)
            priceMax = Math.max(priceMax, price)
        }
    }

    if (!Number.isFinite(priceMin)) priceMin = 0
    if (!Number.isFinite(priceMax)) priceMax = 0

    // Sort airports by flight count desc, then code asc — most-served airport
    // sits on top so the user's likely pick is closest to the section header.
    const sortAirports = (a: AirportFacet, b: AirportFacet) =>
        b.count - a.count || a.code.localeCompare(b.code)

    return {
        stopCounts,
        priceMin,
        priceMax,
        airlines: Array.from(airlineMap.values()).sort((a, b) => a.minPrice - b.minPrice),
        durationCounts,
        departureCounts,
        originAirports: Array.from(originMap.values()).sort(sortAirports),
        destinationAirports: Array.from(destinationMap.values()).sort(sortAirports)
    }
}

export const applyFilters = (flights: ExploreFlight[], f: FlightFilterState): ExploreFlight[] => {
    return flights.filter((flight) => {
        const stops = Math.min(2, Math.max(0, Number(flight.stop_count ?? 0))) as StopBucket
        if (f.stops.size > 0 && !f.stops.has(stops)) return false

        const price = flightPrice(flight)
        if (f.priceMin !== null && price < f.priceMin) return false
        if (f.priceMax !== null && price > f.priceMax) return false

        if (f.departure.size > 0) {
            const dep = departureBucketFor(flight.segments?.[0]?.origin?.departure_time)
            if (!f.departure.has(dep)) return false
        }

        if (f.duration.size > 0) {
            const dur = totalDurationMins(flight)
            const bucket = durationBucketFor(dur)
            if (!f.duration.has(bucket)) return false
        }

        if (f.airlines.size > 0) {
            const code = flight.segments?.[0]?.airline?.code
            if (!code || !f.airlines.has(code)) return false
        }

        if (f.originAirports.size > 0) {
            const code = flight.segments?.[0]?.origin?.airport_code
            if (!code || !f.originAirports.has(code)) return false
        }

        if (f.destinationAirports.size > 0) {
            const last = flight.segments?.[flight.segments.length - 1]
            const code = last?.destination?.airport_code
            if (!code || !f.destinationAirports.has(code)) return false
        }

        return true
    })
}

export const sortFlights = (flights: ExploreFlight[], key: SortKey): ExploreFlight[] => {
    const arr = [...flights]
    if (key === 'cheapest') {
        return arr.sort((a, b) => flightPrice(a) - flightPrice(b))
    }
    if (key === 'fastest') {
        return arr.sort((a, b) => totalDurationMins(a) - totalDurationMins(b))
    }
    if (key === 'earliest') {
        return arr.sort((a, b) => {
            const aDep = new Date(a.segments?.[0]?.origin?.departure_time || '').getTime()
            const bDep = new Date(b.segments?.[0]?.origin?.departure_time || '').getTime()
            return (Number.isFinite(aDep) ? aDep : Infinity) - (Number.isFinite(bDep) ? bDep : Infinity)
        })
    }
    // 'best' — keep server's incoming order (Kayak already ranked by bestValue
    // when our backend returns top_flights).
    return arr
}

const formatINR = (value: number): string => `₹${Math.round(value).toLocaleString('en-IN')}`

interface FlightFiltersRailProps {
    facets: FlightFacets
    filters: FlightFilterState
    onChange: (next: FlightFilterState) => void
    onReset: () => void
    /** Position class for the desktop aside. Defaults to TripBoard's
     *  `self-start sticky top-[206px]` (anchored under the LegStrip +
     *  ViewToggle bar). Pages with different header heights pass their
     *  own offset, e.g. `'self-start sticky top-2'` for /flights. */
    positionClassName?: string
}

const STOP_LABELS: Record<StopBucket, string> = { 0: 'Direct', 1: '1 stop', 2: '2+ stops' }
const DURATION_LABELS: Record<DurationBucket, string> = {
    under10: 'Under 10h',
    between10_13: '10h – 13h',
    over13: '13h+'
}
const DEPARTURE_BUCKETS: Array<{ key: DepartureBucket; label: string; sub: string; icon: React.ReactNode }> = [
    { key: 'early', label: 'Early', sub: '12am–6am', icon: <Moon className="w-3 h-3" /> },
    { key: 'morning', label: 'Morning', sub: '6am–12pm', icon: <Sun className="w-3 h-3" /> },
    { key: 'noon', label: 'Noon', sub: '12pm–6pm', icon: <Sun className="w-3 h-3" /> },
    { key: 'evening', label: 'Evening', sub: '6pm–12am', icon: <Sunset className="w-3 h-3" /> }
]

/** Inner body of the filters panel — shared by the desktop sticky aside
 *  and the mobile bottom-sheet so the two render identical controls. */
const FlightFiltersBody: React.FC<FlightFiltersRailProps> = ({ facets, filters, onChange, onReset }) => {
    const toggleStop = (s: StopBucket) => {
        const next = new Set(filters.stops)
        if (next.has(s)) next.delete(s)
        else next.add(s)
        onChange({ ...filters, stops: next })
    }
    const toggleDeparture = (d: DepartureBucket) => {
        const next = new Set(filters.departure)
        if (next.has(d)) next.delete(d)
        else next.add(d)
        onChange({ ...filters, departure: next })
    }
    const toggleDuration = (d: DurationBucket) => {
        const next = new Set(filters.duration)
        if (next.has(d)) next.delete(d)
        else next.add(d)
        onChange({ ...filters, duration: next })
    }
    const toggleAirline = (code: string) => {
        const next = new Set(filters.airlines)
        if (next.has(code)) next.delete(code)
        else next.add(code)
        onChange({ ...filters, airlines: next })
    }
    const toggleOriginAirport = (code: string) => {
        const next = new Set(filters.originAirports)
        if (next.has(code)) next.delete(code)
        else next.add(code)
        onChange({ ...filters, originAirports: next })
    }
    const toggleDestinationAirport = (code: string) => {
        const next = new Set(filters.destinationAirports)
        if (next.has(code)) next.delete(code)
        else next.add(code)
        onChange({ ...filters, destinationAirports: next })
    }
    const toggleBagsChecked = () => onChange({ ...filters, bagsChecked: !filters.bagsChecked })

    // Show airport sections only when there's actually a choice — a single
    // origin / destination airport is just noise.
    const showOriginSection = facets.originAirports.length > 1
    const showDestinationSection = facets.destinationAirports.length > 1
    const buildAirportLabel = (a: AirportFacet) => {
        if (!a.name) return a.code
        // Drop city name when it's already in the airport name to avoid
        // "CDG · Paris Charles de Gaulle, Paris" — pick the more specific.
        if (a.cityName && a.name.toLowerCase().includes(a.cityName.toLowerCase())) {
            return `${a.code} · ${a.name}`
        }
        if (a.cityName) return `${a.code} · ${a.cityName} ${a.name}`
        return `${a.code} · ${a.name}`
    }

    const priceLow = filters.priceMin ?? facets.priceMin
    const priceHigh = filters.priceMax ?? facets.priceMax
    const priceRangeLabel = facets.priceMin === facets.priceMax
        ? formatINR(facets.priceMin)
        : `${formatINR(facets.priceMin)} – ${formatINR(facets.priceMax)}`

    return (
        <>
            <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold font-red-hat-display text-grey-0 tracking-[-0.3px]">Filters</span>
                <button
                    type="button"
                    onClick={onReset}
                    className="font-manrope text-[12px] text-primary-default hover:text-primary-deep cursor-pointer">
                    Reset
                </button>
            </div>

            {showOriginSection && (
                <Section title="From airport">
                    {facets.originAirports.map((a) => (
                        <CheckRow
                            key={a.code}
                            label={buildAirportLabel(a)}
                            count={a.count}
                            checked={filters.originAirports.has(a.code)}
                            onToggle={() => toggleOriginAirport(a.code)}
                        />
                    ))}
                </Section>
            )}

            {showDestinationSection && (
                <Section title="To airport">
                    {facets.destinationAirports.map((a) => (
                        <CheckRow
                            key={a.code}
                            label={buildAirportLabel(a)}
                            count={a.count}
                            checked={filters.destinationAirports.has(a.code)}
                            onToggle={() => toggleDestinationAirport(a.code)}
                        />
                    ))}
                </Section>
            )}

            <Section title="Stops">
                {([0, 1, 2] as StopBucket[]).map((s) => (
                    <CheckRow
                        key={s}
                        label={STOP_LABELS[s]}
                        count={facets.stopCounts[s]}
                        checked={filters.stops.has(s)}
                        onToggle={() => toggleStop(s)}
                        disabled={(facets.stopCounts[s] ?? 0) === 0}
                    />
                ))}
            </Section>

            <Section title={`Price · ${priceRangeLabel}`}>
                {/* Inset by 8px (half the native thumb's 16px width) so the
                    slider thumbs at min/max sit flush inside the section edges
                    instead of bleeding past, and so the price labels line up
                    with the thumb centers at the extremes. */}
                <div className="px-2">
                    <DualRangeSlider
                        min={facets.priceMin}
                        max={facets.priceMax}
                        valueMin={priceLow}
                        valueMax={priceHigh}
                        onChange={(lo, hi) => {
                            const isFullRange = lo <= facets.priceMin && hi >= facets.priceMax
                            onChange({
                                ...filters,
                                priceMin: isFullRange ? null : lo,
                                priceMax: isFullRange ? null : hi
                            })
                        }}
                    />
                    <div className="flex justify-between font-manrope text-[11px] text-grey-2 mt-2">
                        <span>{formatINR(priceLow)}</span>
                        <span>{formatINR(priceHigh)}</span>
                    </div>
                </div>
            </Section>

            <Section title="Departure">
                <div className="grid grid-cols-2 gap-1.5">
                    {DEPARTURE_BUCKETS.map((b) => {
                        const active = filters.departure.has(b.key)
                        const count = facets.departureCounts[b.key] ?? 0
                        const disabled = count === 0
                        return (
                            <button
                                key={b.key}
                                type="button"
                                disabled={disabled}
                                onClick={() => toggleDeparture(b.key)}
                                className={`text-left rounded-lg px-2 py-1.5 border transition-colors ${
                                    active
                                        ? 'border-primary-default bg-primary-pale-purple'
                                        : 'border-grey-4 bg-white hover:border-primary-default/40'
                                } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                                <div className="flex items-center gap-1">
                                    <span className={active ? 'text-primary-default' : 'text-grey-2'}>{b.icon}</span>
                                    <span className="font-red-hat-display text-[12px] font-bold tracking-[-0.24px] text-grey-0">
                                        {b.label}
                                    </span>
                                </div>
                                <div className="font-manrope text-[10px] text-grey-2 mt-0.5">
                                    {b.sub} · {count}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </Section>

            <Section title="Duration">
                {(Object.keys(DURATION_LABELS) as DurationBucket[]).map((d) => (
                    <CheckRow
                        key={d}
                        label={DURATION_LABELS[d]}
                        count={facets.durationCounts[d]}
                        checked={filters.duration.has(d)}
                        onToggle={() => toggleDuration(d)}
                        disabled={(facets.durationCounts[d] ?? 0) === 0}
                    />
                ))}
            </Section>

            <Section title="Airlines">
                {facets.airlines.map((a) => (
                    <CheckRow
                        key={a.code}
                        label={a.name}
                        count={formatINR(a.minPrice)}
                        checked={filters.airlines.has(a.code)}
                        onToggle={() => toggleAirline(a.code)}
                    />
                ))}
                {facets.airlines.length === 0 && (
                    <span className="font-manrope text-[12px] text-grey-3">No airlines yet</span>
                )}
            </Section>

            <Section title="Bags & cabin">
                <CheckRow
                    label="Checked bag included"
                    count=""
                    checked={filters.bagsChecked}
                    onToggle={toggleBagsChecked}
                />
            </Section>
        </>
    )
}

const FlightFiltersRail: React.FC<FlightFiltersRailProps> = (props) => {
    const positionClass = props.positionClassName ?? 'self-start sticky top-[206px]'
    // Cap the rail at viewport height minus the sticky top offset (and a
    // small bottom breather) so when the airline list grows past the
    // viewport (e.g. 10+ carriers like the BLR → KUL search) the rail
    // scrolls independently of the page instead of clipping the bottom
    // entries. The aside itself becomes the scroll container.
    return (
        <aside
            className={`w-60 shrink-0 hidden lg:flex flex-col gap-5 px-4 py-5 bg-white border border-[#dfdde0] rounded-2xl shadow-[0px_2px_8px_0px_#dfdde0] max-h-[calc(100vh-220px)] overflow-y-auto overscroll-contain [scrollbar-width:thin] ${positionClass}`}>
            <FlightFiltersBody {...props} />
        </aside>
    )
}

interface MobileFiltersSheetProps extends FlightFiltersRailProps {
    open: boolean
    onClose: () => void
    /** Number of options after filters apply — surfaced in the apply CTA. */
    resultCount: number
}

/**
 * Bottom sheet for the same filters body on mobile widths.
 * Anchored above the navbar via fixed positioning, with a tinted scrim
 * behind. Clicking a control updates state immediately (consistent with
 * the desktop rail); the footer CTA closes the sheet and a separate
 * "Reset" link clears all filter selections.
 */
export const MobileFiltersSheet: React.FC<MobileFiltersSheetProps> = ({
    open,
    onClose,
    resultCount,
    ...filtersProps
}) => {
    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [open])

    if (!open) return null

    return (
        <div className="lg:hidden fixed inset-0 z-[100] flex flex-col justify-end">
            <button
                type="button"
                aria-label="Close filters"
                onClick={onClose}
                className="absolute inset-0 bg-black/40 cursor-pointer"
            />
            <div className="relative bg-white rounded-t-2xl shadow-[0_-8px_24px_rgba(16,16,16,0.16)] flex flex-col max-h-[88vh]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-grey-4 shrink-0">
                    <span className="text-[15px] font-bold font-red-hat-display text-grey-0 tracking-[-0.3px]">
                        Filters
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close filters"
                        className="grid place-items-center w-7 h-7 rounded-full hover:bg-grey-6 cursor-pointer">
                        <X className="w-4 h-4 text-grey-1" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
                    <FlightFiltersBody {...filtersProps} />
                </div>
                <div className="border-t border-grey-4 px-4 py-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full bg-primary-default text-white font-red-hat-display font-bold text-[14px] tracking-[-0.28px] leading-[18px] py-3 rounded-xl hover:bg-primary-dark transition-colors cursor-pointer">
                        Show {resultCount} flight{resultCount === 1 ? '' : 's'}
                    </button>
                </div>
            </div>
        </div>
    )
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <div className="font-red-hat-display text-[10px] font-extrabold uppercase tracking-[0.06em] text-grey-2 mb-2">
            {title}
        </div>
        <div className="flex flex-col gap-1">{children}</div>
    </div>
)

interface CheckRowProps {
    label: string
    count: number | string
    checked: boolean
    onToggle: () => void
    disabled?: boolean
}

const CheckRow: React.FC<CheckRowProps> = ({ label, count, checked, onToggle, disabled }) => (
    <label
        className={`flex items-center gap-2.5 py-1 cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
        <span
            onClick={(e) => {
                if (disabled) return
                e.preventDefault()
                onToggle()
            }}
            className={`grid place-items-center w-4 h-4 rounded border transition-colors ${
                checked ? 'bg-primary-default border-primary-default' : 'border-[#dfdde0] bg-white'
            }`}>
            {checked && (
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </span>
        <span className="font-manrope text-[13px] font-medium text-grey-1 flex-1 truncate">{label}</span>
        {count !== '' && (
            <span className="font-manrope text-[11px] text-grey-3 shrink-0">{count}</span>
        )}
    </label>
)

interface DualRangeSliderProps {
    min: number
    max: number
    valueMin: number
    valueMax: number
    onChange: (low: number, high: number) => void
    /** Pixel gap to keep between the two handles so they don't overlap exactly. */
    minGap?: number
}

/**
 * Two-handle range slider built from two overlapping native range inputs.
 * The colored fill in between is a positioned div under the inputs;
 * pointer-events on the inputs are routed to the thumbs only via CSS so
 * the fill never steals clicks. No external library.
 */
const DualRangeSlider: React.FC<DualRangeSliderProps> = ({ min, max, valueMin, valueMax, onChange, minGap = 0 }) => {
    if (max <= min) {
        // Single point — nothing to drag.
        return <div className="h-1 bg-[#E0E0E0] rounded-full" />
    }
    const span = max - min
    const lowPct = Math.max(0, Math.min(100, ((valueMin - min) / span) * 100))
    const highPct = Math.max(0, Math.min(100, ((valueMax - min) / span) * 100))

    const handleLow = (next: number) => {
        const clamped = Math.min(next, valueMax - minGap)
        onChange(Math.max(min, clamped), valueMax)
    }
    const handleHigh = (next: number) => {
        const clamped = Math.max(next, valueMin + minGap)
        onChange(valueMin, Math.min(max, clamped))
    }

    return (
        <div className="relative h-7 select-none">
            <style>{`
                .rim-dualrange-input {
                    -webkit-appearance: none;
                    appearance: none;
                    background: transparent;
                    pointer-events: none;
                    position: absolute;
                    inset: 0;
                    height: 28px;
                    margin: 0;
                    width: 100%;
                }
                .rim-dualrange-input::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    pointer-events: auto;
                    width: 16px;
                    height: 16px;
                    border-radius: 999px;
                    background: #FFFFFF;
                    border: 2px solid #7011F6;
                    box-shadow: 0 1px 3px rgba(16,16,16,0.18);
                    cursor: grab;
                    margin-top: -6px;
                }
                .rim-dualrange-input::-webkit-slider-thumb:active { cursor: grabbing; }
                .rim-dualrange-input::-moz-range-thumb {
                    pointer-events: auto;
                    width: 16px;
                    height: 16px;
                    border-radius: 999px;
                    background: #FFFFFF;
                    border: 2px solid #7011F6;
                    box-shadow: 0 1px 3px rgba(16,16,16,0.18);
                    cursor: grab;
                }
                .rim-dualrange-input::-webkit-slider-runnable-track,
                .rim-dualrange-input::-moz-range-track {
                    background: transparent;
                    height: 4px;
                }
            `}</style>
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-[#E0E0E0]" />
            <div
                className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-primary-default"
                style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }}
            />
            <input
                type="range"
                min={min}
                max={max}
                value={valueMin}
                onChange={(e) => handleLow(Number(e.target.value))}
                className="rim-dualrange-input"
                aria-label="Minimum price"
                style={{ zIndex: lowPct > 90 ? 4 : 3 }}
            />
            <input
                type="range"
                min={min}
                max={max}
                value={valueMax}
                onChange={(e) => handleHigh(Number(e.target.value))}
                className="rim-dualrange-input"
                aria-label="Maximum price"
                style={{ zIndex: 4 }}
            />
        </div>
    )
}

export default FlightFiltersRail
