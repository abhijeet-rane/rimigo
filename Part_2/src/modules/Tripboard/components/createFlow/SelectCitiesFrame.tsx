/**
 * Second (final) frame of the Where step. Reached straight after the country
 * picker via "Next: Select Cities & Route".
 *
 *   [search]
 *   YOUR ROUTE             ─── the cities you pick, ordered + nights per city
 *                              (drag to reorder, − N + to set nights) plus an
 *                              "AI Route Optimization" toggle
 *   CITIES IN <COUNTRY 1>  ─── top_cities + other_cities for country 1 (top first, deduped)
 *   CITIES IN <COUNTRY 2>  ─── top_cities + other_cities for country 2 (etc.)
 *
 * The route is built live from the user's city selection (no hardcoded combos):
 * pick a city and it drops into the route. Ordering + nights mirror the legacy
 * itinerary payload (`wizardState.cities`), so the old create pipeline is
 * unchanged.
 *
 * Layout differs by viewport:
 *   • Desktop — search + cities on the left, the live route in a right column.
 *   • Mobile  — this frame shows search + cities only; the route moves to its
 *     own screen (RouteFrame, exported below), reached via the footer's Next
 *     button so the cities list isn't crowded by a long route beneath it.
 */
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useQueries } from '@tanstack/react-query'
import { MapPin, Menu, Sparkles, X } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { RequestCallbackInline } from './RequestCallbackInline'
import { FlagChip } from './FlagChip'
import { WizardBackButton } from './WizardBackButton'
import { SectionError } from './SectionError'
import { useRouteDragReorder } from './useRouteDragReorder'
import { DepartureCityPicker } from './DepartureCityPicker'
import { Stepper } from '@/components/shared/Stepper'
import type { DepartureCityConfig } from './popularDepartureCities'
import { getCountryCities } from '@/api/curation/locationPersonalizationAPI'
import { adaptActivitiesCitiesResponse } from '@/modules/Acitvities/adapters/activitiesCitiesAdapter'
import { LOCATION_PIN } from '@/constants/thiingsIcons'
import type { SelectedCity, SelectedCountry } from './types'

/** Hard width for the search input + every section beneath it. */
const SECTION_MAX_WIDTH_PX = 602

/**
 * Fetches /top-cities for every selected country (in parallel, cached) and
 * derives the per-country chip lists + the cityId→flag map. Shared by the
 * full Select-Cities frame and the mobile-only standalone RouteFrame so both
 * read the same (deduped, React-Query-cached) source. */
function useCountryCitiesData(selectedCountries: SelectedCountry[]) {
    // Fan-out /top-cities calls — one per selected country, in parallel.
    // Mirrors useCountryCities's caching settings so cached responses are
    // reused across the wizard's lifetime.
    const queries = useQueries({
        queries: selectedCountries.map((country) => ({
            queryKey: ['countryCities', country.id],
            queryFn: () => getCountryCities(country.id),
            enabled: !!country.id,
            staleTime: 1000 * 60 * 60,
            gcTime: 1000 * 60 * 60 * 24
        }))
    })

    /** Per-country chip data — drives the multiple "Cities in <country>" chip
     *  rows. Concatenates top_cities + other_cities (top_cities first so
     *  trending picks lead the chip list) and dedupes by id, since a city
     *  shouldn't appear twice within the same country's section. */
    const citiesByCountry = useMemo(() => {
        return queries.map((q, idx) => {
            if (!q.data) {
                return { country: selectedCountries[idx], cities: [] as Array<{ id: string; name?: string }> }
            }
            const { topCities, otherCities } = adaptActivitiesCitiesResponse(q.data)
            const merged: Array<{ id: string; name?: string }> = []
            const seen = new Set<string>()
            for (const c of topCities) {
                if (seen.has(c.cityId)) continue
                seen.add(c.cityId)
                merged.push({ id: c.cityId, name: c.cityName })
            }
            for (const c of otherCities) {
                if (seen.has(c.id)) continue
                seen.add(c.id)
                merged.push({ id: c.id, name: c.name })
            }
            return { country: selectedCountries[idx], cities: merged }
        })
    }, [queries, selectedCountries])

    /** cityId → owning country's flag, so each route stop can show its flag. */
    const cityFlagMap = useMemo(() => {
        const map = new Map<string, string>()
        for (const { country, cities } of citiesByCountry) {
            for (const c of cities) map.set(c.id, country.flag)
        }
        return map
    }, [citiesByCountry])

    return { citiesByCountry, cityFlagMap }
}

export interface SelectCitiesFrameProps {
    selectedCountries: SelectedCountry[]
    selectedCityIds: Set<string>
    onToggleCity: (cityId: string, cityName: string) => void
    /** Cities the user has picked, in route order. Drives the route panel. */
    selectedCities: SelectedCity[]
    /** Departure (nodal) city name — the route's start/end endpoint. */
    departureName: string
    /** Selected departure city object — drives the inline Edit pickers on the
     *  Start/End city rows. Null until the user picks one. */
    departureCity: DepartureCityConfig | null
    /** Fires when the user picks a departure city from a route-row Edit link. */
    onSelectDeparture: (city: DepartureCityConfig) => void
    /** Bump a city's nights by a delta (route stepper). */
    onAdjustNights: (cityId: string, delta: number) => void
    /** Reorder the route (drag handle). */
    onReorder: (fromIndex: number, toIndex: number) => void
    /** Remove a city from the route (and the selection). */
    onRemoveCity: (cityId: string) => void
    /** AI route-order optimization toggle. */
    aiRouteOptimize: boolean
    onToggleAiOptimize: () => void
    /** Total nights available from the picked dates — used for the assigned /
     *  over-assigned hint. `null` when dates aren't set. */
    totalTripNights: number | null
    /** Mobile step-back (inline in the heading). Omitted → no arrow. */
    onBack?: () => void
    /** Parent flags a missing city / departure on Next → scroll to + red helper.
     *  'cities' shows below the list; 'departure' shows at the top (the departure
     *  picker lives in the header strip above this frame). */
    invalidSection?: { section: 'cities' | 'departure'; nonce: number } | null
}

export function SelectCitiesFrame({
    selectedCountries,
    selectedCityIds,
    onToggleCity,
    selectedCities,
    departureName,
    departureCity,
    onSelectDeparture,
    onAdjustNights,
    onReorder,
    onRemoveCity,
    aiRouteOptimize,
    onToggleAiOptimize,
    totalTripNights,
    onBack,
    invalidSection
}: SelectCitiesFrameProps) {
    const [searchTerm, setSearchTerm] = useState('')
    // The cities error scrolls itself into view (SectionError); the departure
    // error lives in the sticky header, so neither needs a frame-level scroll.
    const citiesError = invalidSection?.section === 'cities' && selectedCityIds.size === 0

    const { citiesByCountry, cityFlagMap } = useCountryCitiesData(selectedCountries)

    const normalizedQuery = searchTerm.trim().toLowerCase()

    return (
        <div className="w-full pb-6 pt-8">
            {/* Outer column is the page-level scroll area; the inner wrapper
                packs left content (602) + gap (48) + right rail (414) = 1064px
                and centers that whole block on the page so the heading lines
                up with the search bar / row content beneath it. */}
            <div className="mx-auto w-full max-w-[1064px]">
                <div className="mb-4 flex items-start gap-1.5">
                    <WizardBackButton onBack={onBack} />
                    <h2
                        className="flex flex-wrap items-center gap-2 text-left"
                        style={{
                            color: 'var(--text-primary, #0D0C0D)',
                            fontFamily: 'var(--font-family-title, "Red Hat Display")',
                            fontSize: 'var(--font-size-20, 20px)',
                            fontWeight: 550,
                            lineHeight: '28px',
                            letterSpacing: '-0.4px'
                        }}>
                        <span>
                            Select cities in{' '}
                            {selectedCountries
                                .slice(0, 2)
                                .map((c) => c.name)
                                .join(', ')}
                            {selectedCountries.length > 2 ? ` +${selectedCountries.length - 2}` : ''}
                        </span>
                    </h2>
                </div>
                {/* At least one city required. (Departure-missing just scrolls to
                    the top, where the departure picker already shows its red `*`.) */}
                <SectionError show={citiesError} nonce={invalidSection?.nonce} message="Select at least one city to continue" />
                {/* Desktop: a 2-col grid — Search top-LEFT and the city listing
                    bottom-LEFT (wider column), the live ROUTE on the RIGHT
                    (spanning both rows, smaller column). The route and cities
                    columns each scroll INDEPENDENTLY (their own overflow), so the
                    page itself doesn't move — only the hovered section scrolls.
                    Mobile: a simple stacked column (search → cities → route),
                    page-scrolled as before (the md: overflow/height only apply
                    on desktop). */}
                <div
                    className="flex flex-col gap-6 md:grid md:h-[calc(100vh-300px)] md:min-h-[400px] md:gap-x-8 md:gap-y-4"
                    style={{
                        gridTemplateColumns: 'minmax(0, 1fr) 480px',
                        gridTemplateRows: 'auto minmax(0, 1fr)'
                    }}>
                    {/* SEARCH — top of the left column on desktop, first on mobile. */}
                    <div
                        className="relative w-full max-md:order-1 md:col-start-1 md:row-start-1"
                        style={{ maxWidth: `${SECTION_MAX_WIDTH_PX}px` }}>
                        <MapPin
                            size={16}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
                            style={{ color: '#E11D48' }}
                        />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search for cities"
                            className="w-full rounded-xl border bg-white py-4 pl-[42px] pr-4 placeholder:text-[var(--text-placeholder,#ACAAAE)] focus:outline-none focus:ring-2 focus:ring-[var(--border-brand)]"
                            style={{
                                borderColor: 'var(--color-grey-4, #E0E0E0)',
                                fontFamily: 'var(--font-family-body, Manrope)',
                                fontSize: 'var(--font-size-16, 16px)',
                                fontWeight: 500,
                                lineHeight: '20px',
                                letterSpacing: '-0.32px',
                                color: 'var(--text-primary, #0D0C0D)'
                            }}
                        />
                    </div>

                    {/* ROUTE — right column on desktop, spans both rows, scrolls on
                        its own. Hidden on mobile: there the route lives on its own
                        screen (RouteFrame), reached via the footer's Next button
                        after cities are picked — so the cities list isn't crowded
                        by a long route beneath it. */}
                    <motion.div
                        layout="position"
                        transition={{ layout: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
                        className="w-full md:col-start-2 md:row-start-1 md:row-span-2 md:min-h-0 md:overflow-y-auto md:pr-1 [&::-webkit-scrollbar]:hidden max-md:hidden"
                        style={{ scrollbarWidth: 'none' }}>
                        <RoutePanel
                            departureName={departureName}
                            departureCity={departureCity}
                            onSelectDeparture={onSelectDeparture}
                            cities={selectedCities}
                            cityFlagMap={cityFlagMap}
                            totalTripNights={totalTripNights}
                            aiRouteOptimize={aiRouteOptimize}
                            onToggleAiOptimize={onToggleAiOptimize}
                            onAdjustNights={onAdjustNights}
                            onReorder={onReorder}
                            onRemoveCity={onRemoveCity}
                        />
                    </motion.div>

                    {/* CITIES — bottom-left on desktop; scrolls on its own. On
                        mobile it sits right under the search box (order-2). */}
                    <motion.div
                        layout="position"
                        transition={{ layout: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
                        className="w-full min-w-0 md:col-start-1 md:row-start-2 md:min-h-0 md:overflow-y-auto md:pr-1 [&::-webkit-scrollbar]:hidden max-md:order-2"
                        style={{ scrollbarWidth: 'none' }}>
                        {citiesByCountry.map(({ country, cities }) => {
                            const filtered = normalizedQuery ? cities.filter((c) => (c.name ?? '').toLowerCase().includes(normalizedQuery)) : cities
                            if (filtered.length === 0) return null
                            return (
                                <div
                                    key={country.id}
                                    className="mb-8 w-full">
                                    <SectionHeader label={`Cities in ${country.name}`} />
                                    <div className="flex flex-wrap gap-3">
                                        {filtered.map((c) => {
                                            const isSelected = selectedCityIds.has(c.id)
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    aria-pressed={isSelected}
                                                    onClick={() => onToggleCity(c.id, c.name ?? '')}
                                                    className="inline-flex items-center gap-2 transition-colors"
                                                    style={{
                                                        padding: '8px 12px',
                                                        borderRadius: '999px',
                                                        border: '1px solid var(--border-subtle, #DFDDE0)',
                                                        background: isSelected ? '#0D0C0D' : 'var(--surface-raised, #FFF)',
                                                        color: isSelected ? '#FFF' : 'var(--text-primary, #0D0C0D)',
                                                        fontFamily: 'var(--font-family-body, Manrope)',
                                                        fontSize: 'var(--font-size-16, 16px)',
                                                        fontWeight: 600,
                                                        lineHeight: '20px',
                                                        letterSpacing: '-0.32px'
                                                    }}>
                                                    <img
                                                        src={LOCATION_PIN}
                                                        alt=""
                                                        aria-hidden
                                                        className="h-5 w-5 shrink-0"
                                                        style={{ aspectRatio: '1 / 1' }}
                                                    />
                                                    {c.name}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}

                        {/* While searching, always offer a callback (the team can
                            match on tags, not just exact city names). */}
                        {normalizedQuery && (
                            <RequestCallbackInline
                                prompt="Can't find your city?"
                                queryText={searchTerm}
                            />
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

/**
 * Mobile-only standalone route screen. Reached from the cities screen via the
 * footer's Next button (the route panel is hidden on the cities screen on
 * mobile — see SelectCitiesFrame). Renders the same live RoutePanel the desktop
 * frame shows in its right column, with its own heading + inline back button.
 */
export interface RouteFrameProps {
    /** Selected countries — used to re-derive the cityId→flag map (the
     *  underlying /top-cities queries are React-Query-cached, so this is free). */
    selectedCountries: SelectedCountry[]
    selectedCities: SelectedCity[]
    departureName: string
    departureCity: DepartureCityConfig | null
    onSelectDeparture: (city: DepartureCityConfig) => void
    onAdjustNights: (cityId: string, delta: number) => void
    onReorder: (fromIndex: number, toIndex: number) => void
    onRemoveCity: (cityId: string) => void
    aiRouteOptimize: boolean
    onToggleAiOptimize: () => void
    totalTripNights: number | null
    /** Mobile step-back (inline in the heading). */
    onBack?: () => void
}

export function RouteFrame({
    selectedCountries,
    selectedCities,
    departureName,
    departureCity,
    onSelectDeparture,
    onAdjustNights,
    onReorder,
    onRemoveCity,
    aiRouteOptimize,
    onToggleAiOptimize,
    totalTripNights,
    onBack
}: RouteFrameProps) {
    const { cityFlagMap } = useCountryCitiesData(selectedCountries)
    return (
        <div className="w-full pb-6 pt-8">
            <div className="mx-auto w-full max-w-[602px]">
                {/* Frame heading — matches the other steps' title (Red Hat
                    Display 20/550) and sits inline with the back button. The
                    departure picker lives in the JourneyStrip header above. */}
                <div className="mb-4 flex items-start gap-1.5">
                    <WizardBackButton onBack={onBack} />
                    <h2
                        className="text-left"
                        style={{
                            color: 'var(--text-primary, #0D0C0D)',
                            fontFamily: 'var(--font-family-title, "Red Hat Display")',
                            fontSize: 'var(--font-size-20, 20px)',
                            fontWeight: 550,
                            lineHeight: '28px',
                            letterSpacing: '-0.4px'
                        }}>
                        Finalise your route
                    </h2>
                </div>
                {/* Panel renders without its own "Your route" header — the frame
                    heading above owns it. */}
                <RoutePanel
                    hideHeader
                    departureName={departureName}
                    departureCity={departureCity}
                    onSelectDeparture={onSelectDeparture}
                    cities={selectedCities}
                    cityFlagMap={cityFlagMap}
                    totalTripNights={totalTripNights}
                    aiRouteOptimize={aiRouteOptimize}
                    onToggleAiOptimize={onToggleAiOptimize}
                    onAdjustNights={onAdjustNights}
                    onReorder={onReorder}
                    onRemoveCity={onRemoveCity}
                />
            </div>
        </div>
    )
}

interface RoutePanelProps {
    departureName: string
    departureCity: DepartureCityConfig | null
    onSelectDeparture: (city: DepartureCityConfig) => void
    cities: SelectedCity[]
    cityFlagMap: Map<string, string>
    totalTripNights: number | null
    aiRouteOptimize: boolean
    onToggleAiOptimize: () => void
    onAdjustNights: (cityId: string, delta: number) => void
    onReorder: (fromIndex: number, toIndex: number) => void
    onRemoveCity: (cityId: string) => void
    /** Suppress the panel's own "Your route" SectionHeader — used by the mobile
     *  RouteFrame, which renders the title as a frame heading (matching the
     *  other steps) inline with the back button. */
    hideHeader?: boolean
}

/**
 * The live route built from the user's city selection — replaces the old
 * "Recommended Combos" column. Labelled Start/End city endpoints top + bottom
 * (each with an inline Edit picker for the departure city), an editable row
 * per selected city (drag to reorder, − N + nights, ✕ to remove), and the AI
 * Route Optimization toggle beneath.
 */
function RoutePanel({
    departureName,
    departureCity,
    onSelectDeparture,
    cities,
    cityFlagMap,
    totalTripNights,
    aiRouteOptimize,
    onToggleAiOptimize,
    onAdjustNights,
    onReorder,
    onRemoveCity,
    hideHeader
}: RoutePanelProps) {
    const { srcIndex, getRowStyle, onHandlePointerDown, registerRowEl } = useRouteDragReorder({
        rowCount: cities.length,
        onReorder
    })

    const assignedNights = cities.reduce((sum, c) => sum + (c.nights ?? 0), 0)
    const overAssigned = totalTripNights != null && assignedNights > totalTripNights

    if (cities.length === 0) {
        return (
            <div className="w-full">
                {!hideHeader && <SectionHeader label="Finalise your route" />}
                <div
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center"
                    style={{ borderColor: 'var(--border-subtle, #DFDDE0)' }}>
                    <MapPin
                        size={22}
                        strokeWidth={1.75}
                        style={{ color: 'var(--text-tertiary, #4F4F50)' }}
                    />
                    <p
                        style={{
                            color: 'var(--text-tertiary, #4F4F50)',
                            fontFamily: 'var(--font-family-body, Manrope)',
                            fontSize: 'var(--font-size-14, 14px)',
                            fontWeight: 500,
                            lineHeight: '18px',
                            letterSpacing: '-0.28px'
                        }}>
                        Pick cities on the right and they'll appear here as your route.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full">
            {!hideHeader && (
                <div className="mb-1 flex items-center justify-between gap-2">
                    <SectionHeader label="Finalise your route" />
                </div>
            )}

            {/* Route list on a soft lavender panel (mirrors the original route
                screen's brand-subtle background). `relative` anchors the dashed
                connector that threads through every dot from the first
                (departure) to the last (departure). */}
            <div
                className="rounded-xl px-3.5 py-4"
                style={{ background: '#F3ECFE' }}>
            <div className="relative flex flex-col items-stretch gap-[18px]">
                <span
                    aria-hidden
                    className="pointer-events-none absolute"
                    style={{
                        left: '34px',
                        top: '11px',
                        bottom: '11px',
                        width: 0,
                        borderLeft: '1px dashed var(--border-focus, #7011F6)',
                        opacity: 0.5
                    }}
                />

                <DepartureRow
                    label="Start city"
                    cityName={departureName}
                    departureCity={departureCity}
                    onSelectDeparture={onSelectDeparture}
                />

                {cities.map((stop, index) => (
                    <StopRow
                        key={stop.id}
                        index={index}
                        stop={stop}
                        flag={cityFlagMap.get(stop.id)}
                        isDragging={srcIndex === index}
                        rowStyle={getRowStyle(index)}
                        registerEl={registerRowEl(index)}
                        onHandlePointerDown={onHandlePointerDown(index)}
                        onAdjustNights={onAdjustNights}
                        onRemove={onRemoveCity}
                    />
                ))}

                <DepartureRow
                    label="End city"
                    cityName={departureName}
                    departureCity={departureCity}
                    onSelectDeparture={onSelectDeparture}
                />
            </div>
            </div>

            {/* Nights-assigned hint — mirrors the legacy route summary. */}
            {totalTripNights != null && (
                <p
                    className="mt-3"
                    style={{
                        color: overAssigned ? '#E11D48' : 'var(--text-tertiary, #4F4F50)',
                        fontFamily: 'var(--font-family-body, Manrope)',
                        fontSize: 'var(--font-size-12, 12px)',
                        fontWeight: 500,
                        lineHeight: '16px',
                        letterSpacing: '-0.24px'
                    }}>
                    {overAssigned
                        ? `Your nights (${assignedNights}) exceed your ${totalTripNights}-night trip`
                        : `${assignedNights}/${totalTripNights} nights assigned`}
                </p>
            )}

            {/* AI Route Optimization toggle — shown once there are ≥2 cities to
                reorder. Sets the legacy `wizardState.aiRouteOptimize` flag. */}
            {cities.length >= 2 && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-purple-200/50 bg-gradient-to-r from-purple-50 to-white p-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-default/10">
                        <Sparkles
                            size={16}
                            className="text-primary-default"
                        />
                    </div>
                    <div className="flex-1">
                        <p
                            style={{
                                color: 'var(--text-primary, #0D0C0D)',
                                fontFamily: 'var(--font-family-title, "Red Hat Display")',
                                fontSize: '14px',
                                fontWeight: 645,
                                lineHeight: '18px',
                                letterSpacing: '-0.28px'
                            }}>
                            AI Route Optimization
                        </p>
                        <p
                            style={{
                                color: 'var(--text-tertiary, #4F4F50)',
                                fontFamily: 'var(--font-family-body, Manrope)',
                                fontSize: '12px',
                                fontWeight: 500,
                                lineHeight: '16px',
                                letterSpacing: '-0.24px'
                            }}>
                            Let AI find the best route order
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-pressed={aiRouteOptimize}
                        onClick={onToggleAiOptimize}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
                            aiRouteOptimize ? 'bg-primary-default' : 'bg-grey-4'
                        }`}>
                        <div
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                                aiRouteOptimize ? 'translate-x-5.5' : 'translate-x-0.5'
                            }`}
                        />
                    </button>
                </div>
            )}
        </div>
    )
}

interface DepartureRowProps {
    /** "Start city" / "End city" — names the endpoint so the route reads
     *  unambiguously (both endpoints are the same departure city). */
    label: string
    cityName: string
    departureCity: DepartureCityConfig | null
    onSelectDeparture: (city: DepartureCityConfig) => void
}

function DepartureRow({ label, cityName, departureCity, onSelectDeparture }: DepartureRowProps) {
    return (
        <div className="flex items-center gap-2">
            {/* Placeholder matching the stop rows' drag-handle slot so the dot
                column stays aligned. */}
            <span
                className="block w-5 shrink-0"
                aria-hidden
            />
            <span
                aria-hidden
                className="relative block shrink-0 rounded-full"
                style={{
                    width: '14px',
                    height: '14px',
                    background: 'var(--icon-brand, #430A94)',
                    zIndex: 1
                }}
            />
            <span className="flex min-w-0 flex-1 flex-col">
                <span
                    style={{
                        color: 'var(--text-tertiary, #4F4F50)',
                        fontFamily: 'var(--font-family-body, Manrope)',
                        fontSize: 'var(--font-size-12, 12px)',
                        fontWeight: 600,
                        lineHeight: '16px',
                        letterSpacing: '-0.24px'
                    }}>
                    {label}
                </span>
                <span
                    className="truncate"
                    style={{
                        color: 'var(--color-grey-0, #101010)',
                        fontFamily: 'var(--font-family-title, "Red Hat Display")',
                        fontSize: 'var(--font-size-14, 14px)',
                        fontWeight: 645,
                        lineHeight: '18px',
                        letterSpacing: '-0.28px'
                    }}>
                    {cityName}
                </span>
            </span>
            {/* Inline Edit → opens the same searchable departure-city dropdown
                as the journey strip, so the city can be changed right here. */}
            <DepartureCityPicker
                value={departureCity}
                onSelect={onSelectDeparture}
                variant="edit-link"
            />
        </div>
    )
}

interface StopRowProps {
    index: number
    stop: SelectedCity
    flag?: string
    isDragging: boolean
    rowStyle: React.CSSProperties
    registerEl: (el: HTMLElement | null) => void
    onHandlePointerDown: (e: React.PointerEvent<HTMLElement>) => void
    onAdjustNights: (cityId: string, delta: number) => void
    onRemove: (cityId: string) => void
}

function StopRow({ index, stop, flag, isDragging, rowStyle, registerEl, onHandlePointerDown, onAdjustNights, onRemove }: StopRowProps) {
    const nights = stop.nights ?? 0
    const atZero = nights <= 0
    return (
        <div
            ref={registerEl}
            data-route-row={index}
            className="flex w-full items-center gap-2"
            style={{ borderRadius: '8px', cursor: isDragging ? 'grabbing' : 'default', ...rowStyle }}>
            <span
                onPointerDown={onHandlePointerDown}
                className="flex shrink-0 items-center"
                style={{
                    cursor: isDragging ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    padding: 0,
                    pointerEvents: 'auto'
                }}
                aria-label={`Drag handle for ${stop.name}`}
                role="button">
                <Menu
                    size={20}
                    strokeWidth={1.5}
                    aria-hidden
                    style={{ color: 'var(--text-tertiary, #4F4F50)' }}
                />
            </span>
            {/* Hollow brand dot — sits above the dashed connector. */}
            <span
                aria-hidden
                className="relative block shrink-0 rounded-full"
                style={{
                    width: '14px',
                    height: '14px',
                    background: 'var(--fill-neutral, #FFF)',
                    border: '2px solid var(--border-focus, #7011F6)',
                    zIndex: 1
                }}
            />
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span
                    className="truncate"
                    style={{
                        color: 'var(--color-grey-0, #101010)',
                        fontFamily: 'var(--font-family-title, "Red Hat Display")',
                        fontSize: 'var(--font-size-14, 14px)',
                        fontWeight: 550,
                        lineHeight: '18px',
                        letterSpacing: '-0.28px'
                    }}>
                    {stop.name}
                </span>
                {flag && (
                    <FlagChip
                        flag={flag}
                        imgClassName="h-[14px] w-[14px] shrink-0 rounded-full object-cover"
                        emojiClassName="shrink-0 leading-none"
                        emojiStyle={{ fontSize: '13px' }}
                    />
                )}
            </span>
            <Stepper
                label={`nights for ${stop.name}`}
                onDecrement={() => onAdjustNights(stop.id, -1)}
                onIncrement={() => onAdjustNights(stop.id, 1)}
                decrementDisabled={atZero}
                size={28}
                borderWidth={1.5}
                borderColor="var(--border-focus, #7011F6)"
                iconColor="var(--icon-brand, #430A94)"
                iconSize={14}
                gap={8}
            >
                <span
                    className="min-w-[28px] text-center"
                    style={{
                        color: 'var(--text-tertiary, #4F4F50)',
                        fontFamily: 'var(--font-family-body, Manrope)',
                        fontSize: 'var(--font-size-14, 14px)',
                        fontWeight: 600,
                        lineHeight: '18px',
                        letterSpacing: '-0.28px'
                    }}>
                    {atZero ? '-' : `${nights}N`}
                </span>
            </Stepper>
            {/* Remove this city — always visible. */}
            <button
                type="button"
                aria-label={`Remove ${stop.name} from route`}
                onClick={() => onRemove(stop.id)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#FEE2E2]">
                <X
                    size={16}
                    strokeWidth={1.8}
                    style={{ color: '#E11D48' }}
                />
            </button>
        </div>
    )
}
