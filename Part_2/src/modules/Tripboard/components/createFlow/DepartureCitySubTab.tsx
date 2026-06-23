import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { CityRow } from './CityRow'
import { POPULAR_DEPARTURE_CITIES, type DepartureCityConfig } from './popularDepartureCities'
import { searchAirports, type Airport } from '@/api/flights/airportSearchAPI'
import { useDebounce } from '@/hooks/useDebounce'
import { LOCATION_PIN } from '@/constants/thiingsIcons'

export interface DepartureCitySubTabProps {
    /** IATA of the currently-selected departure city, or null. */
    selectedIata: string | null
    /** Fires when a city row is tapped. Pass a config so the parent can persist
     *  city_name / country_name / iata. */
    onSelect: (city: DepartureCityConfig) => void
}

/** Convert an Airport from the search API into the same shape the picker uses
 *  for curated cities. Keeps the row component agnostic about the source. */
function airportToCity(a: Airport): DepartureCityConfig {
    return {
        city_name: a.city_name || a.name,
        country_name: a.country_name,
        iata: a.code,
    }
}

export function DepartureCitySubTab({ selectedIata, onSelect }: DepartureCitySubTabProps) {
    const [query, setQuery] = useState('')
    const debouncedQuery = useDebounce(query.trim(), 300)
    const isSearching = debouncedQuery.length >= 2

    /* Live airport search backed by the existing /api/airports/search/
       endpoint (Kayak autocomplete on the BE). Stays disabled until the
       debounced query has at least 2 chars so we don't burn API calls on
       single keystrokes. */
    const { data, isFetching, isError } = useQuery({
        queryKey: ['departure-airport-search', debouncedQuery],
        queryFn: () => searchAirports(debouncedQuery, 8),
        enabled: isSearching,
        staleTime: 60_000,
    })

    const searchResults: DepartureCityConfig[] = isSearching
        ? (data?.data?.airports ?? []).map(airportToCity)
        : []

    const rows = isSearching ? searchResults : POPULAR_DEPARTURE_CITIES

    return (
        <div className="mx-auto flex w-full max-w-[690px] flex-col gap-8 py-8 md:gap-10">
            <header className="flex flex-col gap-1">
                <h2 className="wf-heading-m" style={{ color: 'var(--text-primary)' }}>
                    Which city are you flying from?
                </h2>
                <p className="wf-body-s" style={{ color: 'var(--text-tertiary)' }}>
                    Your trip will start from here
                </p>
            </header>

            <div className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-grey-4)] bg-white px-4 py-3">
                <img src={LOCATION_PIN} alt="" aria-hidden className="h-5 w-5 shrink-0" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search departure city"
                    className="wf-body-m flex-1 border-0 bg-transparent outline-none placeholder:text-[var(--text-placeholder)]"
                />
                {isSearching && isFetching && (
                    <Loader2 size={16} className="animate-spin text-[var(--text-placeholder)]" />
                )}
            </div>

            <div className="h-px w-full bg-[var(--border-subtle)]" />

            {isSearching && isError ? (
                <p className="wf-body-s text-center" style={{ color: 'var(--text-tertiary)' }}>
                    Couldn't search airports. Try again in a moment.
                </p>
            ) : isSearching && !isFetching && rows.length === 0 ? (
                <p className="wf-body-s text-center" style={{ color: 'var(--text-tertiary)' }}>
                    No cities match "{debouncedQuery}"
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {rows.map((c) => (
                        <CityRow
                            key={c.iata}
                            city_name={c.city_name}
                            country_name={c.country_name}
                            iata={c.iata}
                            selected={selectedIata === c.iata}
                            onSelect={() => onSelect(c)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
