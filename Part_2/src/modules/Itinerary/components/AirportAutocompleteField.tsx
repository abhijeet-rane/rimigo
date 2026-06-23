/**
 * Airport (IATA) autocomplete field used by the commercial-flight branch
 * of ``TransportSection``. Debounced (~220ms) hits to ``searchAirports``
 * (``/api/airports/search/``); in-flight requests are aborted on each
 * keystroke so a slow earlier response can't overwrite a faster later one.
 *
 * Selecting a result yields the IATA ``code`` to the caller via
 * ``onSelect``; the visible text shows "{city_name} ({code}) — {name}".
 * Free-text without a selection leaves the captured code null — the
 * "Search flights" CTA stays disabled until both ends resolve to a code.
 *
 * Mirrors ``CityAutocompleteField`` (same file family) in layout, debounce,
 * and abort behaviour so it reads as native to the composer.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Plane } from 'lucide-react'
import AddSlotLabel from './AddSlotLabel'
import { searchAirports, type Airport } from '@/api/flights/airportSearchAPI'

const airportLabel = (a: Airport): string => `${a.city_name} (${a.code}) — ${a.name}`

const AirportAutocompleteField = ({
    label,
    isRequired,
    value,
    codeSelected,
    onValueChange,
    onSelect,
    placeholder
}: {
    label: string
    isRequired?: boolean
    /** Display text in the input (city/airport label or free text). */
    value: string
    /** True once a result was picked — drives the confirmation tick. */
    codeSelected: boolean
    onValueChange: (v: string) => void
    /** Fires with the picked airport (IATA in ``code``) or null on clear. */
    onSelect: (airport: Airport | null) => void
    placeholder: string
}) => {
    const [results, setResults] = useState<Airport[]>([])
    const [isFocused, setIsFocused] = useState(false)
    const [isFetching, setIsFetching] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const debounceRef = useRef<number | null>(null)
    const abortRef = useRef<AbortController | null>(null)

    const runSearch = useCallback(async (input: string) => {
        if (!input.trim()) {
            setResults([])
            setIsFetching(false)
            return
        }
        if (abortRef.current) abortRef.current.abort()
        const controller = new AbortController()
        abortRef.current = controller
        setIsFetching(true)
        try {
            const res = await searchAirports(input.trim())
            if (!controller.signal.aborted) {
                setResults(res.data?.airports ?? [])
                setHasSearched(true)
            }
        } catch {
            // Aborts are expected on rapid typing — only clear on real failures.
            if (!controller.signal.aborted) {
                setResults([])
                setHasSearched(true)
            }
        } finally {
            if (!controller.signal.aborted) setIsFetching(false)
        }
    }, [])

    const handleInputChange = (next: string) => {
        onValueChange(next)
        // Typing invalidates a previous selection — drop the code so we
        // don't ship a stale (code, freetext) pair on search.
        onSelect(null)
        setHasSearched(false)
        if (debounceRef.current) window.clearTimeout(debounceRef.current)
        debounceRef.current = window.setTimeout(() => {
            void runSearch(next)
        }, 220)
    }

    useEffect(
        () => () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current)
            if (abortRef.current) abortRef.current.abort()
        },
        []
    )

    const handleSelect = (airport: Airport) => {
        setIsFocused(false)
        onValueChange(airportLabel(airport))
        onSelect(airport)
    }

    const trimmedValue = value.trim()
    const showDropdown = isFocused
    const showSearching = showDropdown && isFetching
    const showNoResults = showDropdown && hasSearched && !isFetching && results.length === 0 && trimmedValue.length > 0
    const showHint = showDropdown && !isFetching && !hasSearched && trimmedValue.length === 0

    return (
        <div className="flex flex-col gap-2 relative">
            <AddSlotLabel
                text={label}
                isRequired={isRequired}
            />
            <div className="relative">
                <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-3 pointer-events-none" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        // Delay so onMouseDown on a suggestion can fire first.
                        window.setTimeout(() => setIsFocused(false), 150)
                    }}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="w-full h-10 pl-9 pr-9 border border-grey-4 rounded-[12px] outline-none focus:border-primary-default transition-colors text-sm font-manrope placeholder:text-grey-3"
                />
                {codeSelected && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-green pointer-events-none" />}
            </div>
            {showDropdown && (results.length > 0 || showSearching || showNoResults || showHint) && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-grey-4 rounded-[12px] shadow-lg max-h-60 overflow-y-auto">
                    {showSearching && <div className="px-4 py-2 text-xs text-grey-2 font-manrope">Searching airports…</div>}
                    {showHint && <div className="px-4 py-2 text-xs text-grey-2 font-manrope">Type a city or airport</div>}
                    {showNoResults && <div className="px-4 py-2 text-xs text-grey-2 font-manrope">No matching airports</div>}
                    {!showSearching &&
                        results.map((a) => (
                            <button
                                key={a.code}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSelect(a)}
                                className="w-full text-left px-3 py-2 hover:bg-grey-5 transition-colors flex items-start gap-2">
                                <span className="w-9 shrink-0 text-xs font-semibold font-manrope text-grey-0 tabular-nums mt-0.5">{a.code}</span>
                                <span className="flex flex-col min-w-0">
                                    <span className="text-sm font-manrope text-grey-0 truncate">{a.city_name}</span>
                                    <span className="text-xs font-manrope text-grey-2 truncate">
                                        {a.name}
                                        {a.country_name ? ` · ${a.country_name}` : ''}
                                    </span>
                                </span>
                            </button>
                        ))}
                </div>
            )}
        </div>
    )
}

export default AirportAutocompleteField
