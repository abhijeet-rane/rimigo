/**
 * Details panel for a Transport slot in the Add Slot modal.
 *
 * Flow: user picks the kind via ``TransportModeDropdown`` (~150 iconic
 * modes), then chooses ROUTE TYPE — intra-city (within one city) or
 * inter-city (between cities in the same country). Each tab swaps the
 * From/To inputs:
 *
 *   • Intra-city → Google Places autocomplete; payload uses
 *       ``slot_data.from_venue``/``to_venue`` (+ ``from_location``/
 *       ``to_location`` carrying place_id, lat, lng, address, maps URI).
 *   • Inter-city → debounced global search of the curated city list
 *       (not country-scoped, so cross-border legs work); payload uses
 *       ``slot_data.from_city``/``to_city`` plus
 *       ``from_city_id``/``to_city_id`` from the picked city's id.
 *
 * ``getTransportDirectionsUrl`` (slotDetailShared) prefers the lat/lng
 * inside ``from_location``/``to_location`` over the city string when
 * generating the "View on map" deeplink — picking a real venue upgrades
 * the link from a name search to exact coordinates.
 *
 * Notes / suggestions / attachments are contributed by the universal
 * ``RemarksSection`` + ``AttachFilesSection`` blocks rendered beneath
 * every slot-type canvas in ``AddEventModal``, so this section owns
 * ONLY the transport-specific fields.
 */
import { forwardRef, useImperativeHandle, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { Check, MapPin, Search, Building2 } from 'lucide-react'
import { SlotPayloadProvider } from './SlotPayloadProvider'
import AddSlotLabel from './AddSlotLabel'
import AirportAutocompleteField from './AirportAutocompleteField'
import TransportModeDropdown from './TransportModeDropdown'
import { TransportMode, findTransportMode } from '../constants/transportModes'
import { searchCities, type CountryCitySearchResult } from '@/api/locationApi'
import { searchAirports } from '@/api/flights/airportSearchAPI'

/**
 * Ephemeral flight-search handoff. Commercial flights (``mode.kind ===
 * 'flight'``) don't write a manual slot — the composer instead routes
 * the user to the Flights tab with this {from, to, date} so the real
 * search runs there. Both ends are IATA codes; ``date`` is ``YYYY-MM-DD``.
 */
export interface FlightSearchRequest {
    from: string
    to: string
    date: string
}

interface TransportPlace {
    place_id: string
    latitude: number
    longitude: number
    address: string
    google_maps_url: string
}

type RouteType = 'intra' | 'inter'

interface TransportFormData {
    mode: TransportMode | null
    routeType: RouteType
    // ``fromCity`` / ``toCity`` carry the currently-active text in EITHER
    // tab — the venue name in intra mode, the city name in inter mode —
    // so the wrapper's "has valid endpoints?" check stays mode-agnostic.
    fromCity: string
    toCity: string
    fromLocation: TransportPlace | null
    toLocation: TransportPlace | null
    fromCityId: string | null
    toCityId: string | null
    title: string
    estimatedCost: string
    currency: string
    // Commercial-flight branch only. Display text + captured IATA code per
    // end, plus the departure date (``YYYY-MM-DD``). Untouched by every
    // non-flight mode, which keep the manual create path verbatim.
    fromAirport: string
    toAirport: string
    fromIata: string | null
    toIata: string | null
    flightDate: string
}

interface TransportSectionProps {
    initialData?: Partial<Omit<TransportFormData, 'mode'>> & {
        modeLabel?: string | null
    }
    onChange?: (data: TransportFormData) => void
    baseCity?: { id: string; name: string; country: string }
    /** Slot's day (``YYYY-MM-DD``) — seeds the flight-search date field. */
    slotDate?: string
    /** Fires whenever the picked mode's commercial-flight status flips,
     *  so the composer footer can swap "Add to itinerary" ⇄ "Search flights". */
    onFlightModeChange?: (isFlight: boolean) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Places autocomplete plumbing (intra-city)
// ─────────────────────────────────────────────────────────────────────────────

let placesLoadPromise: Promise<boolean> | null = null

const ensurePlacesLoaded = (): Promise<boolean> => {
    if (typeof window === 'undefined') return Promise.resolve(false)
    if (placesLoadPromise) return placesLoadPromise
    const key = (import.meta as unknown as { env?: { VITE_GOOGLE_MAPS_API_KEY?: string } }).env?.VITE_GOOGLE_MAPS_API_KEY
    if (!key) {
        placesLoadPromise = Promise.resolve(false)
        return placesLoadPromise
    }
    setOptions({ key, v: 'weekly' })
    placesLoadPromise = importLibrary('places')
        .then(() => true)
        .catch(() => false)
    return placesLoadPromise
}

interface SuggestionItem {
    placeId: string
    primary: string
    secondary: string
    toPlace: () => google.maps.places.Place
}

/**
 * Place-aware text input. Autosuggest dropdown follows Google Maps' own
 * directions-input behaviour (no type filter) so the user can pick an
 * address, station, airport, or city. Selecting a result captures
 * place_id + coords + formatted address + googleMapsURI.
 *
 * Free-text without selection keeps working — the form falls back to
 * the bare string in `value` so the modal can still submit. The map
 * link path then degrades to encoded city-name lookup, same as today.
 */
const PlaceAutocompleteField = ({
    label,
    isRequired,
    value,
    placeSelected,
    onValueChange,
    onPlaceSelect,
    placeholder
}: {
    label: string
    isRequired?: boolean
    value: string
    placeSelected: boolean
    onValueChange: (v: string) => void
    onPlaceSelect: (place: TransportPlace | null) => void
    placeholder: string
}) => {
    const [placesReady, setPlacesReady] = useState(false)
    const [placesLoadFailed, setPlacesLoadFailed] = useState(false)
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
    const [isFocused, setIsFocused] = useState(false)
    const [isFetching, setIsFetching] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
    const debounceRef = useRef<number | null>(null)

    useEffect(() => {
        ensurePlacesLoaded().then((ok) => {
            if (!ok) {
                setPlacesLoadFailed(true)
                return
            }
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
            setPlacesReady(true)
        })
    }, [])

    const fetchSuggestions = useCallback(
        async (input: string) => {
            if (!placesReady || !input.trim()) {
                setSuggestions([])
                setIsFetching(false)
                return
            }
            setIsFetching(true)
            try {
                const { suggestions: raw } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                    input: input.trim(),
                    sessionToken: sessionTokenRef.current!
                })
                const items: SuggestionItem[] = raw
                    .filter((s) => s.placePrediction)
                    .map((s) => {
                        const p = s.placePrediction!
                        return {
                            placeId: p.placeId,
                            primary: p.mainText?.text || '',
                            secondary: p.secondaryText?.text || '',
                            toPlace: () => p.toPlace()
                        }
                    })
                setSuggestions(items)
            } catch {
                setSuggestions([])
            } finally {
                setIsFetching(false)
                setHasSearched(true)
            }
        },
        [placesReady]
    )

    const handleInputChange = (next: string) => {
        onValueChange(next)
        // Typing invalidates a previous selection — drop the place_id so
        // we don't ship a stale (place_id, freetext) pair on submit.
        onPlaceSelect(null)
        setHasSearched(false)
        if (debounceRef.current) window.clearTimeout(debounceRef.current)
        debounceRef.current = window.setTimeout(() => {
            void fetchSuggestions(next)
        }, 220)
    }

    const handleSelect = async (item: SuggestionItem) => {
        setIsFocused(false)
        try {
            const place = item.toPlace()
            await place.fetchFields({
                fields: ['displayName', 'id', 'formattedAddress', 'googleMapsURI', 'location']
            })
            const lat = place.location?.lat() ?? null
            const lng = place.location?.lng() ?? null
            const displayName = place.displayName || item.primary
            onValueChange(displayName)
            if (lat != null && lng != null && place.id) {
                onPlaceSelect({
                    place_id: place.id,
                    latitude: lat,
                    longitude: lng,
                    address: place.formattedAddress || `${item.primary} ${item.secondary}`.trim(),
                    google_maps_url: place.googleMapsURI || ''
                })
            } else {
                onPlaceSelect(null)
            }
        } catch {
            onPlaceSelect(null)
        } finally {
            // Per Places billing guidance: rotate the session token after a
            // selection so the autocomplete + details pair gets billed once.
            if (placesReady) {
                sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
            }
        }
    }

    const trimmedValue = value.trim()
    const showDropdown = isFocused && !placesLoadFailed
    const showSearching = showDropdown && isFetching
    const showNoResults = showDropdown && hasSearched && !isFetching && suggestions.length === 0 && trimmedValue.length > 0
    const showHint = showDropdown && !isFetching && !hasSearched && trimmedValue.length === 0

    return (
        <div className="flex flex-col gap-2 relative">
            <AddSlotLabel
                text={label}
                isRequired={isRequired}
            />
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-3 pointer-events-none" />
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
                {placeSelected && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-green pointer-events-none" />}
            </div>
            {showDropdown && (suggestions.length > 0 || showSearching || showNoResults || showHint) && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-grey-4 rounded-[12px] shadow-lg max-h-60 overflow-y-auto">
                    {showSearching && <div className="px-4 py-2 text-xs text-grey-2 font-manrope">Searching places…</div>}
                    {showHint && <div className="px-4 py-2 text-xs text-grey-2 font-manrope">Type to search Google Places</div>}
                    {showNoResults && <div className="px-4 py-2 text-xs text-grey-2 font-manrope">No matches</div>}
                    {!showSearching &&
                        suggestions.map((s) => (
                            <button
                                key={s.placeId}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSelect(s)}
                                className="w-full text-left px-3 py-2 hover:bg-grey-5 transition-colors flex items-start gap-2">
                                <MapPin className="w-3.5 h-3.5 text-grey-2 mt-0.5 shrink-0" />
                                <span className="flex flex-col min-w-0">
                                    <span className="text-sm font-manrope text-grey-0 truncate">{s.primary}</span>
                                    {s.secondary && <span className="text-xs font-manrope text-grey-2 truncate">{s.secondary}</span>}
                                </span>
                            </button>
                        ))}
                </div>
            )}
            {placesLoadFailed && (
                <p className="text-[11px] text-amber-600 font-manrope">Place search unavailable — saving will use the typed text only.</p>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Country-scoped city autocomplete (inter-city)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Global city picker. Debounced (~220ms) hits to
 * ``/curation/cities/?search=…`` (no country scoping) so cross-border
 * legs can be searched directly; in-flight requests are aborted on each
 * keystroke so a slow earlier response can't overwrite a faster later one.
 *
 * On selection we capture ``{ id, name }`` so the payload can ship
 * both ``from_city`` (display) and ``from_city_id`` (canonical ref).
 * Free-text without a selection is allowed — the city ID just won't
 * ship — matching the Places field's "degrade gracefully" stance.
 */
const CityAutocompleteField = ({
    label,
    isRequired,
    value,
    citySelected,
    onValueChange,
    onCitySelect,
    placeholder
}: {
    label: string
    isRequired?: boolean
    value: string
    citySelected: boolean
    onValueChange: (v: string) => void
    onCitySelect: (city: CountryCitySearchResult | null) => void
    placeholder: string
}) => {
    const [results, setResults] = useState<CountryCitySearchResult[]>([])
    const [isFocused, setIsFocused] = useState(false)
    const [isFetching, setIsFetching] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const debounceRef = useRef<number | null>(null)
    const abortRef = useRef<AbortController | null>(null)

    const runSearch = useCallback(
        async (input: string) => {
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
                const cities = await searchCities(input.trim(), controller.signal)
                if (!controller.signal.aborted) {
                    setResults(cities)
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
        },
        []
    )

    const handleInputChange = (next: string) => {
        onValueChange(next)
        // Typing invalidates a previous selection — drop the city_id so
        // we don't ship a stale (city_id, freetext) pair on submit.
        onCitySelect(null)
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

    const handleSelect = (city: CountryCitySearchResult) => {
        setIsFocused(false)
        onValueChange(city.name)
        onCitySelect(city)
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
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-3 pointer-events-none" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        window.setTimeout(() => setIsFocused(false), 150)
                    }}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="w-full h-10 pl-9 pr-9 border border-grey-4 rounded-[12px] outline-none focus:border-primary-default transition-colors text-sm font-manrope placeholder:text-grey-3 disabled:bg-grey-5 disabled:cursor-not-allowed"
                />
                {citySelected && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-green pointer-events-none" />}
            </div>
            {showDropdown && (results.length > 0 || showSearching || showNoResults || showHint) && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-grey-4 rounded-[12px] shadow-lg max-h-60 overflow-y-auto">
                    {showSearching && <div className="px-4 py-2 text-xs text-grey-2 font-manrope">Searching cities…</div>}
                    {showHint && <div className="px-4 py-2 text-xs text-grey-2 font-manrope">Type to search cities</div>}
                    {showNoResults && <div className="px-4 py-2 text-xs text-grey-2 font-manrope">No matching cities</div>}
                    {!showSearching &&
                        results.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSelect(c)}
                                className="w-full text-left px-3 py-2 hover:bg-grey-5 transition-colors flex items-start gap-2">
                                <Building2 className="w-3.5 h-3.5 text-grey-2 mt-0.5 shrink-0" />
                                <span className="flex flex-col min-w-0">
                                    <span className="text-sm font-manrope text-grey-0 truncate">{c.name}</span>
                                </span>
                            </button>
                        ))}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Segmented control (intra ⇄ inter)
// ─────────────────────────────────────────────────────────────────────────────

const RouteTypeTabs = ({ value, onChange }: { value: RouteType; onChange: (next: RouteType) => void }) => {
    const tabs: Array<{ id: RouteType; label: string; hint: string }> = [
        { id: 'intra', label: 'Intra-city', hint: 'Within one city' },
        { id: 'inter', label: 'Inter-city', hint: 'Between cities' }
    ]
    return (
        <div
            role="tablist"
            aria-label="Transport route type"
            className="flex items-stretch gap-1 p-1 rounded-[12px] bg-grey-5">
            {tabs.map((t) => {
                const active = value === t.id
                return (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(t.id)}
                        className={[
                            'flex-1 h-9 rounded-[8px] text-sm font-manrope transition-all duration-150 px-3',
                            'flex items-center justify-center gap-1.5',
                            active ? 'bg-white text-grey-0 font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-grey-2 hover:text-grey-0'
                        ].join(' ')}>
                        <span>{t.label}</span>
                        <span className={['text-[11px] font-normal hidden sm:inline', active ? 'text-grey-2' : 'text-grey-3'].join(' ')}>
                            · {t.hint}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section
// ─────────────────────────────────────────────────────────────────────────────

// Flight-search ref surface — extends the standard payload provider so the
// composer can pull the {from, to, date} for a commercial flight without
// going through getPayload (which returns a manual-slot payload).
export interface TransportSectionHandle extends SlotPayloadProvider {
    /** Non-null only when a commercial flight is fully specified. */
    getFlightSearch: () => FlightSearchRequest | null
}

const TransportSection = forwardRef<TransportSectionHandle, TransportSectionProps>(
    ({ initialData, onChange, baseCity, slotDate, onFlightModeChange }, ref) => {
        const initialRouteType: RouteType = useMemo(() => {
            if (initialData?.routeType) return initialData.routeType
            // Fall back to inter when a city_id was previously persisted.
            if (initialData?.fromCityId || initialData?.toCityId) return 'inter'
            return 'intra'
        }, [initialData?.routeType, initialData?.fromCityId, initialData?.toCityId])

        const [formData, setFormData] = useState<TransportFormData>({
            mode: initialData?.modeLabel ? (findTransportMode(initialData.modeLabel) ?? null) : null,
            routeType: initialRouteType,
            fromCity: initialData?.fromCity || '',
            toCity: initialData?.toCity || '',
            fromLocation: initialData?.fromLocation ?? null,
            toLocation: initialData?.toLocation ?? null,
            fromCityId: initialData?.fromCityId ?? null,
            toCityId: initialData?.toCityId ?? null,
            title: initialData?.title || '',
            estimatedCost: initialData?.estimatedCost || '',
            currency: initialData?.currency || 'INR',
            fromAirport: '',
            toAirport: '',
            fromIata: null,
            toIata: null,
            flightDate: slotDate || ''
        })

        const isFlight = formData.mode?.kind === 'flight'

        // Notify the composer whenever the commercial-flight status flips so
        // it can swap the footer CTA between "Add to itinerary" and
        // "Search flights".
        useEffect(() => {
            onFlightModeChange?.(isFlight)
        }, [isFlight, onFlightModeChange])

        // Keep the flight date defaulted to the slot's day until the user
        // edits it. Once they do (flightDate diverges from slotDate), respect it.
        const userEditedDate = useRef(false)
        useEffect(() => {
            if (!slotDate || userEditedDate.current) return
            setFormData((prev) => (prev.flightDate === slotDate ? prev : { ...prev, flightDate: slotDate }))
        }, [slotDate])

        // Pre-seed the From airport from the day's base city the first time a
        // commercial flight is selected — the user usually just confirms it.
        // Best-effort: top airport-search hit for the city name. Never blocks.
        const seededFromRef = useRef(false)
        useEffect(() => {
            if (!isFlight || seededFromRef.current) return
            if (formData.fromIata || formData.fromAirport.trim()) return
            const cityName = baseCity?.name?.trim()
            if (!cityName) return
            seededFromRef.current = true
            let cancelled = false
            void searchAirports(cityName)
                .then((res) => {
                    const top = res.data?.airports?.[0]
                    if (cancelled || !top) return
                    setFormData((prev) =>
                        prev.fromIata || prev.fromAirport.trim()
                            ? prev
                            : {
                                  ...prev,
                                  fromAirport: `${top.city_name} (${top.code}) — ${top.name}`,
                                  fromIata: top.code
                              }
                    )
                })
                .catch(() => {})
            return () => {
                cancelled = true
            }
        }, [isFlight, baseCity?.name, formData.fromIata, formData.fromAirport])

        // Track if the user has manually edited the title — once they
        // have, we stop overwriting it from the mode/city auto-suggestion.
        const userEditedTitle = useRef(Boolean(initialData?.title))

        const generateTitle = (mode: TransportMode | null, from: string, to: string) => {
            if (!mode) return ''
            const modeLabel = mode.label
            // Strict title format expected by the route-summary parser:
            //   ``<Mode>: <Service Name>: from: <From> to: <To>``
            // The dropdown provides both the mode family (Bus/Train/…)
            // and the specific service (Shinkansen, Tuk-tuk, …) — we
            // split from the label's first token as a pragmatic hint.
            if (!from && !to) return ''
            if (!from) return `${modeLabel} to ${to}`
            if (!to) return `${modeLabel} from ${from}`
            return `${modeLabel} from ${from} to ${to}`
        }

        const isInter = formData.routeType === 'inter'
        const fromPlaceholder = isInter
            ? baseCity?.name
                ? `e.g., ${baseCity.name}`
                : 'e.g., From city'
            : baseCity?.name
              ? `e.g., ${baseCity.name} Airport`
              : 'e.g., Pickup point or station'
        const toPlaceholder = isInter
            ? 'e.g., To city'
            : 'e.g., Drop-off point or station'
        const titlePlaceholder = formData.mode
            ? `e.g., ${formData.mode.label} from ${baseCity?.name || 'A'} to B`
            : 'Pick a transport mode to auto-fill'

        useEffect(() => {
            if (!userEditedTitle.current) {
                const autoTitle = generateTitle(formData.mode, formData.fromCity, formData.toCity)
                setFormData((prev) => (prev.title === autoTitle ? prev : { ...prev, title: autoTitle }))
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [formData.mode, formData.fromCity, formData.toCity])

        useEffect(() => {
            onChange?.(formData)
        }, [formData, onChange])

        useImperativeHandle(
            ref,
            () => ({
                getFlightSearch(): FlightSearchRequest | null {
                    if (formData.mode?.kind !== 'flight') return null
                    if (!formData.fromIata || !formData.toIata || !formData.flightDate) return null
                    return { from: formData.fromIata, to: formData.toIata, date: formData.flightDate }
                },
                getPayload() {
                    // Commercial flights never write a manual slot — they hand
                    // off to the Flights tab via getFlightSearch instead.
                    if (formData.mode?.kind === 'flight') return null
                    if (!formData.mode || !formData.fromCity || !formData.toCity) {
                        return null
                    }

                    const slotData: Record<string, unknown> = {
                        mode: formData.mode.label
                    }

                    if (formData.routeType === 'inter') {
                        // Inter-city → curated city ID + display name on both ends.
                        slotData.from_city = formData.fromCity
                        slotData.to_city = formData.toCity
                        if (formData.fromCityId) slotData.from_city_id = formData.fromCityId
                        if (formData.toCityId) slotData.to_city_id = formData.toCityId
                    } else {
                        // Intra-city → Google Places venue strings + optional coords.
                        slotData.from_venue = formData.fromCity
                        slotData.to_venue = formData.toCity
                        if (formData.fromLocation) slotData.from_location = formData.fromLocation
                        if (formData.toLocation) slotData.to_location = formData.toLocation
                    }

                    const payload: any = {
                        // slot.kind is overridden here so the outer
                        // modal's ``kind: slotType.value`` (which would
                        // be the generic ``transport``) gets replaced
                        // by the specific backend kind that matches the
                        // picked mode (train, metro, ferry, tuk-tuk, …).
                        kind: formData.mode.kind,
                        slot_data: slotData
                    }

                    if (formData.title.trim()) {
                        payload.title = formData.title
                    }

                    if (formData.estimatedCost && !isNaN(parseFloat(formData.estimatedCost))) {
                        payload.estimated_cost = parseFloat(formData.estimatedCost)
                        payload.currency = formData.currency
                    }

                    return payload
                }
            }),
            [formData]
        )

        const handleModeChange = (mode: TransportMode | null) => {
            setFormData((prev) => ({ ...prev, mode }))
        }

        const handleTitleChange = (value: string) => {
            userEditedTitle.current = true
            setFormData((prev) => ({ ...prev, title: value }))
        }

        const handleRouteTypeChange = (next: RouteType) => {
            // Switching tabs preserves the typed text on both sides but
            // drops the captured place/city refs that don't apply to the
            // other tab — so submit can't ship a Google place_id on an
            // inter-city payload, or a curated city_id on an intra one.
            setFormData((prev) =>
                prev.routeType === next
                    ? prev
                    : {
                          ...prev,
                          routeType: next,
                          fromLocation: next === 'intra' ? prev.fromLocation : null,
                          toLocation: next === 'intra' ? prev.toLocation : null,
                          fromCityId: next === 'inter' ? prev.fromCityId : null,
                          toCityId: next === 'inter' ? prev.toCityId : null
                      }
            )
        }

        return (
            <div className="flex flex-col gap-4">
                {/* Transport mode (searchable dropdown) */}
                <div className="flex flex-col gap-2">
                    <AddSlotLabel
                        text="Transport Mode"
                        isRequired
                    />
                    <TransportModeDropdown
                        value={formData.mode}
                        onChange={handleModeChange}
                        initialLabel={initialData?.modeLabel ?? null}
                    />
                </div>

                {isFlight ? (
                    <>
                        {/* Commercial flight → airport (IATA) search + date.
                            No slot is written here; "Search flights" hands off
                            to the Flights tab for real results. */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AirportAutocompleteField
                                label="From"
                                isRequired
                                value={formData.fromAirport}
                                codeSelected={!!formData.fromIata}
                                onValueChange={(v) => setFormData((prev) => ({ ...prev, fromAirport: v }))}
                                onSelect={(a) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        fromIata: a?.code ?? null,
                                        fromAirport: a ? `${a.city_name} (${a.code}) — ${a.name}` : prev.fromAirport
                                    }))
                                }
                                placeholder={baseCity?.name ? `e.g., ${baseCity.name}` : 'Departure city or airport'}
                            />
                            <AirportAutocompleteField
                                label="To"
                                isRequired
                                value={formData.toAirport}
                                codeSelected={!!formData.toIata}
                                onValueChange={(v) => setFormData((prev) => ({ ...prev, toAirport: v }))}
                                onSelect={(a) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        toIata: a?.code ?? null,
                                        toAirport: a ? `${a.city_name} (${a.code}) — ${a.name}` : prev.toAirport
                                    }))
                                }
                                placeholder="Destination city or airport"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <AddSlotLabel
                                text="Departure date"
                                isRequired
                            />
                            <input
                                type="date"
                                value={formData.flightDate}
                                onChange={(e) => {
                                    userEditedDate.current = true
                                    setFormData((prev) => ({ ...prev, flightDate: e.target.value }))
                                }}
                                className="w-full h-10 px-4 border border-grey-4 rounded-[12px] outline-none focus:border-primary-default transition-colors text-sm font-manrope text-grey-0"
                            />
                        </div>
                        <p className="text-xs text-grey-2 font-manrope leading-[16px]">
                            We'll search live fares on the Flights tab. Pick one there to add it to your itinerary.
                        </p>
                    </>
                ) : (
                    <>
                        {/* Route type segmented control */}
                        <div className="flex flex-col gap-2">
                            <AddSlotLabel
                                text="Route Type"
                                isRequired
                            />
                            <RouteTypeTabs
                                value={formData.routeType}
                                onChange={handleRouteTypeChange}
                            />
                        </div>

                        {/* From / To — fields swap per active tab */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {isInter ? (
                                <>
                                    <CityAutocompleteField
                                        label="From City"
                                        isRequired
                                        value={formData.fromCity}
                                        citySelected={!!formData.fromCityId}
                                        onValueChange={(v) => setFormData((prev) => ({ ...prev, fromCity: v }))}
                                        onCitySelect={(c) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                fromCityId: c?.id ?? null,
                                                fromCity: c?.name ?? prev.fromCity
                                            }))
                                        }
                                        placeholder={fromPlaceholder}
                                    />
                                    <CityAutocompleteField
                                        label="To City"
                                        isRequired
                                        value={formData.toCity}
                                        citySelected={!!formData.toCityId}
                                        onValueChange={(v) => setFormData((prev) => ({ ...prev, toCity: v }))}
                                        onCitySelect={(c) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                toCityId: c?.id ?? null,
                                                toCity: c?.name ?? prev.toCity
                                            }))
                                        }
                                        placeholder={toPlaceholder}
                                    />
                                </>
                            ) : (
                                <>
                                    <PlaceAutocompleteField
                                        label="From"
                                        isRequired
                                        value={formData.fromCity}
                                        placeSelected={!!formData.fromLocation}
                                        onValueChange={(v) => setFormData((prev) => ({ ...prev, fromCity: v }))}
                                        onPlaceSelect={(p) => setFormData((prev) => ({ ...prev, fromLocation: p }))}
                                        placeholder={fromPlaceholder}
                                    />
                                    <PlaceAutocompleteField
                                        label="To"
                                        isRequired
                                        value={formData.toCity}
                                        placeSelected={!!formData.toLocation}
                                        onValueChange={(v) => setFormData((prev) => ({ ...prev, toCity: v }))}
                                        onPlaceSelect={(p) => setFormData((prev) => ({ ...prev, toLocation: p }))}
                                        placeholder={toPlaceholder}
                                    />
                                </>
                            )}
                        </div>

                        {/* Title */}
                        <div className="flex flex-col gap-2">
                            <AddSlotLabel text="Title" />
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                placeholder={titlePlaceholder}
                                className="w-full h-10 px-4 border border-grey-4 rounded-[12px] outline-none focus:border-primary-default transition-colors text-sm font-manrope placeholder:text-grey-3"
                            />
                        </div>

                        {/* Cost */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-2 md:col-span-3">
                                <AddSlotLabel text="Estimated Cost" />
                                <input
                                    type="number"
                                    value={formData.estimatedCost}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, estimatedCost: e.target.value }))}
                                    placeholder="e.g., 5000"
                                    step="0.01"
                                    min="0"
                                    className="w-full h-10 px-4 border border-grey-4 rounded-[12px] outline-none focus:border-primary-default transition-colors text-sm font-manrope placeholder:text-grey-3"
                                />
                            </div>
                        </div>
                    </>
                )}

                <div className="text-xs text-grey-2">
                    <span className="text-red-500">*</span> Required fields
                </div>
            </div>
        )
    }
)

TransportSection.displayName = 'TransportSection'

export default TransportSection
