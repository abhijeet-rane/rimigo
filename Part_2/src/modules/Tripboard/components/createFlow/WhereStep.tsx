import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useCountries } from '@/hooks/useCountries'
import type { LocationResponse } from '@/modules/Onboarding/api/onboardingAPI'
import { liveCountryToLocationResponse } from '@/modules/Onboarding/adapters/getPrioritizedCountriesAdapter'
import { getPopularCountriesRanked, type PopularCountryResponse } from '@/api/curation/locationPersonalizationAPI'
import { DestinationPicker } from './DestinationPicker'
import { SelectCitiesFrame, RouteFrame } from './SelectCitiesFrame'
import type { SelectedCity, SelectedCountry, WhereSubTab } from './types'
import type { DepartureCityConfig } from './popularDepartureCities'

/** Slide variants for sub-tab transitions inside the Where step. Mirrors
 *  the parent step-to-step slide so a sub-tab change feels identical to a
 *  Next-button advance. Kept inline so the consumer doesn't have to thread
 *  the parent's variants down. */
const SUBTAB_SLIDE = {
    enter: (dir: 'forward' | 'back') => ({ x: dir === 'forward' ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: 'forward' | 'back') => ({ x: dir === 'forward' ? -80 : 80, opacity: 0 })
}
const SUBTAB_TRANSITION = { duration: 0.3, ease: 'easeInOut' } as const

export interface WhereStepProps {
    currentSubTab: WhereSubTab
    /** Slide direction owned by the parent wizard — set to 'forward' on
     *  Next/auto-advance and 'back' on Back. Used by the inner AnimatePresence
     *  to pick the matching slide variant. */
    direction: 'forward' | 'back'
    selectedIds: Set<string>
    onToggle: (country: LocationResponse, source: 'popular' | 'regional' | 'search') => void
    /** Full list of selected countries — passed through to the Select-Cities frame
     *  so each country can render its own /top-cities section. */
    selectedCountries: SelectedCountry[]
    /** Ids of cities the user has picked on the Select-Cities frame. */
    selectedCityIds: Set<string>
    /** Toggles a city in the selection. */
    onToggleCity: (cityId: string, cityName: string) => void
    /** Picked cities in route order — drives the Select-Cities route panel. */
    selectedCities: SelectedCity[]
    /** Departure (nodal) city name — the route's start/end endpoint. */
    departureName: string
    /** Selected departure city — drives the route panel's Start/End Edit pickers. */
    departureCity: DepartureCityConfig | null
    /** Fires when the user picks a departure city from a route-row Edit link. */
    onSelectDeparture: (city: DepartureCityConfig) => void
    /** Route stepper — bump a city's nights by a delta. */
    onAdjustNights: (cityId: string, delta: number) => void
    /** Route drag reorder. */
    onReorder: (fromIndex: number, toIndex: number) => void
    /** Remove a city from the route (and the selection). */
    onRemoveCity: (cityId: string) => void
    /** AI route-order optimization toggle. */
    aiRouteOptimize: boolean
    onToggleAiOptimize: () => void
    /** Total nights from the picked dates (for the route's assigned hint). */
    totalTripNights: number | null
    /** Mobile step-back — forwarded to whichever sub-frame's heading is shown. */
    onBack?: () => void
    /** Validation flags forwarded to the destination / cities sub-frames. */
    destInvalid?: { nonce: number } | null
    citiesInvalid?: { section: 'cities' | 'departure'; nonce: number } | null
}

export function WhereStep({
    currentSubTab,
    direction,
    selectedIds,
    onToggle,
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
    destInvalid,
    citiesInvalid
}: WhereStepProps) {
    // Source: /curation/location-personalization/live-countries/ — only live
    // (bookable) countries. Adapted to the prioritized `LocationResponse` shape
    // so DestinationPicker and its children don't need to fork on data source.
    const { allCountries: liveCountriesRaw, isLoading, isError } = useCountries({ shouldUsePrioritized: false })
    const allCountries = useMemo<LocationResponse[]>(() => liveCountriesRaw.map(liveCountryToLocationResponse), [liveCountriesRaw])

    // Source: /curation/location-personalization/popular-countries/ — ranked
    // top 10 by traveler-collection interest. We only need the ordered IDs;
    // display data is taken from `allCountries` (live-countries) so popular
    // cards stay visually consistent with the rest of the picker.
    //
    // No client-side caching: response-level caching lives in Sancus, and the
    // ranking is meant to reflect live signal — refetching on mount keeps the
    // first paint honest.
    const { data: popularCountriesRanked } = useQuery<PopularCountryResponse[]>({
        queryKey: ['popularCountries'],
        queryFn: getPopularCountriesRanked,
        staleTime: 0,
        gcTime: 0
    })
    const popularCountryIds = useMemo<string[]>(() => (popularCountriesRanked ?? []).map((c) => c.country_id), [popularCountriesRanked])

    // Banner image per country, sourced from the popular-countries response's
    // `banner_img_url` (the live-countries join doesn't reliably carry it).
    // Keyed by country_id so PopularDestinations can use the popular banner
    // for the card photo instead of the small flag/icon.
    const popularBannerById = useMemo<Record<string, string>>(() => {
        const map: Record<string, string> = {}
        for (const c of popularCountriesRanked ?? []) {
            if (c.banner_img_url) map[c.country_id] = c.banner_img_url
        }
        return map
    }, [popularCountriesRanked])

    /** Renders the body for the current sub-tab. Wrapped by AnimatePresence
     *  below so each switch slides like a step-to-step transition. */
    const renderSubTab = () => {
        // Mobile-only route screen — a separate frame reached from the cities
        // screen's Next button. (Desktop never lands here; its route lives in
        // the Select-Cities frame's right column.)
        if (currentSubTab === 'select-route')
            return (
                <RouteFrame
                    onBack={onBack}
                    selectedCountries={selectedCountries}
                    selectedCities={selectedCities}
                    departureName={departureName}
                    departureCity={departureCity}
                    onSelectDeparture={onSelectDeparture}
                    onAdjustNights={onAdjustNights}
                    onReorder={onReorder}
                    onRemoveCity={onRemoveCity}
                    aiRouteOptimize={aiRouteOptimize}
                    onToggleAiOptimize={onToggleAiOptimize}
                    totalTripNights={totalTripNights}
                />
            )

        if (currentSubTab === 'select-cities')
            return (
                <SelectCitiesFrame
                    onBack={onBack}
                    invalidSection={citiesInvalid}
                    selectedCountries={selectedCountries}
                    selectedCityIds={selectedCityIds}
                    onToggleCity={onToggleCity}
                    selectedCities={selectedCities}
                    departureName={departureName}
                    departureCity={departureCity}
                    onSelectDeparture={onSelectDeparture}
                    onAdjustNights={onAdjustNights}
                    onReorder={onReorder}
                    onRemoveCity={onRemoveCity}
                    aiRouteOptimize={aiRouteOptimize}
                    onToggleAiOptimize={onToggleAiOptimize}
                    totalTripNights={totalTripNights}
                />
            )

        if (isLoading) {
            return (
                <div className="mx-auto w-full max-w-[690px] py-8">
                    <div className="h-8 w-2/3 animate-pulse rounded bg-[var(--border-subtle)]" />
                    <div className="mt-4 h-12 w-full animate-pulse rounded-xl bg-[var(--border-subtle)]" />
                    <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="aspect-square animate-pulse rounded-2xl bg-[var(--border-subtle)]"
                            />
                        ))}
                    </div>
                </div>
            )
        }

        if (isError) {
            return (
                <div className="mx-auto w-full max-w-[690px] py-12 text-center">
                    <p
                        className="wf-body-s"
                        style={{ color: 'var(--text-tertiary)' }}>
                        We couldn't load destinations. Please refresh and try again.
                    </p>
                </div>
            )
        }

        return (
            <DestinationPicker
                onBack={onBack}
                invalidSection={destInvalid}
                countries={allCountries}
                popularCountryIds={popularCountryIds}
                popularBannerById={popularBannerById}
                selectedIds={selectedIds}
                onToggle={onToggle}
            />
        )
    }

    // The key collapses the loading/error/destination branches into a single
    // 'destination' frame so the slide doesn't fire when DestinationPicker
    // resolves from skeleton → data. 'select-cities' and 'select-route' each
    // get their own key so the mobile cities→route transition slides.
    const motionKey: WhereSubTab =
        currentSubTab === 'select-cities' ? 'select-cities' : currentSubTab === 'select-route' ? 'select-route' : 'destination'

    return (
        <AnimatePresence
            mode="wait"
            custom={direction}>
            <motion.div
                key={motionKey}
                custom={direction}
                variants={SUBTAB_SLIDE}
                initial="enter"
                animate="center"
                exit="exit"
                transition={SUBTAB_TRANSITION}>
                {renderSubTab()}
            </motion.div>
        </AnimatePresence>
    )
}
