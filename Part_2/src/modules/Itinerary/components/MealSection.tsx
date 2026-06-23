import { forwardRef, useImperativeHandle, useState, useEffect, useRef, useCallback } from 'react'
import { SlotPayloadProvider } from './SlotPayloadProvider'
import AddSlotLabel from './AddSlotLabel'
import { Search, Loader2, MapPin, ExternalLink, X, Star } from 'lucide-react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { placePhotoProxyUrl } from '@/modules/Itinerary/utils/mealPlaceImage'

/** Mirror of one entry in ``slot_data.photos`` — Google Places v1 shape. */
export interface MealPlacePhoto {
    /** Places v1 resource name, e.g. ``"places/{id}/photos/{token}"``. */
    name: string
    width_px?: number | null
    height_px?: number | null
}

export interface MealPlaceData {
    placeId: string
    name: string
    address: string
    photoUrl: string | null
    googleMapsUrl: string
    latitude: number | null
    longitude: number | null
    /** Optional extras pulled from Places or rehydrated from an
     *  existing slot. Match the canonical backend schema
     *  (``slot_data.primary_type``, ``rating``, ``user_ratings_count``,
     *  ``photos``) so the save payload round-trips losslessly through
     *  save → Mongo → edit. */
    primaryType?: string | null
    rating?: number | null
    userRatingsCount?: number | null
    photos?: MealPlacePhoto[]
}

interface MealFormData {
    title: string
    placeData: MealPlaceData | null
}

export type PlacesSectionVariant = 'meal' | 'place'

interface MealSectionProps {
    initialData?: Partial<MealFormData>
    onChange?: (data: MealFormData) => void
    /**
     * Controls the Places lookup filter, search placeholder, card tint,
     * and backend ``slot.kind``. ``meal`` keeps the restaurant-focused
     * filter and peach accent; ``place`` widens the search to
     * attractions / viewpoints / museums etc. and uses the indigo pale
     * accent. Both emit the same Places-v1 ``slot_data`` shape.
     */
    variant?: PlacesSectionVariant
}

const VARIANT_CONFIG: Record<
    PlacesSectionVariant,
    {
        placeholder: string
        primaryTypes: string[]
        slotKind: string
        cardBg: string
        cardBorder: string
    }
> = {
    meal: {
        placeholder: 'Search a restaurant on Google Places…',
        primaryTypes: ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway'],
        slotKind: 'meal',
        cardBg: '#FDECE5',
        cardBorder: '#F7D2BE',
    },
    place: {
        placeholder: 'Search a beach, mountain, park, street, temple…',
        // Empty filter — a "place" is anything the traveler picks:
        // beach, mountain, hill, jungle, park, street, viewpoint,
        // neighbourhood, museum, market, etc. Google's autocomplete
        // returns matching results across every type, which is what
        // we want.
        primaryTypes: [],
        slotKind: 'place',
        cardBg: '#F5EDFF',
        cardBorder: '#DCC9FF',
    },
}

interface SearchResultItem {
    placeId: string
    name: string
    address: string
    thumbnailUrl: string | null
    _toPlace: () => google.maps.places.Place
}

const MealSection = forwardRef<SlotPayloadProvider, MealSectionProps>(({ initialData, onChange, variant = 'meal' }, ref) => {
    const config = VARIANT_CONFIG[variant]
    const [formData, setFormData] = useState<MealFormData>({
        title: initialData?.title || '',
        placeData: initialData?.placeData || null
    })
    const [query, setQuery] = useState(initialData?.title || '')
    const [results, setResults] = useState<SearchResultItem[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)
    const [placesReady, setPlacesReady] = useState(false)
    const [useCustomName, setUseCustomName] = useState(false)

    const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

    // Initialize Google Places
    useEffect(() => {
        setOptions({
            key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
            v: 'weekly'
        })
        importLibrary('places').then(() => {
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
            setPlacesReady(true)
        })
    }, [])

    useEffect(() => {
        onChange?.(formData)
    }, [formData, onChange])

    useImperativeHandle(
        ref,
        () => ({
            getPayload() {
                const trimmedTitle = formData.title.trim()
                if (!trimmedTitle) return null

                if (formData.placeData) {
                    const p = formData.placeData
                    // Canonical meal-slot ``slot_data`` shape expected by
                    // the backend (matches the concierge enricher's
                    // Places-v1 payload — ``formatted_address``, nested
                    // ``location``, ``primary_type``, ``rating``,
                    // ``user_ratings_count``, ``google_maps_uri``).
                    // Photos are NOT sent: the backend resolves them on
                    // demand from ``place_id`` via the photo proxy, so we
                    // never persist a short-lived Google photo URL that
                    // would render a broken image days later.
                    const slotData: Record<string, unknown> = {
                        place_id: p.placeId,
                        name: p.name,
                        formatted_address: p.address,
                        location: {
                            latitude: p.latitude,
                            longitude: p.longitude,
                        },
                        google_maps_uri: p.googleMapsUrl,
                    }
                    if (p.primaryType) slotData.primary_type = p.primaryType
                    if (typeof p.rating === 'number') slotData.rating = p.rating
                    if (typeof p.userRatingsCount === 'number') {
                        slotData.user_ratings_count = p.userRatingsCount
                    }
                    return {
                        title: trimmedTitle,
                        // ``kind`` only asserted for the ``place``
                        // variant — meal uses the modal's default.
                        ...(variant === 'place' ? { kind: config.slotKind } : {}),
                        slot_data: slotData,
                        location: {
                            latitude: p.latitude,
                            longitude: p.longitude,
                        },
                    }
                }

                return variant === 'place'
                    ? { title: trimmedTitle, kind: config.slotKind }
                    : { title: trimmedTitle }
            }
        }),
        [formData]
    )

    const handleSearch = useCallback(async () => {
        if (!query.trim() || !placesReady || isSearching) return

        setIsSearching(true)
        setFormData(prev => ({ ...prev, placeData: null }))

        try {
            // Omit ``includedPrimaryTypes`` entirely when empty so the
            // ``place`` variant returns any Google Place the traveler
            // types (beach, mountain, park, street, viewpoint, etc.)
            // rather than a restricted list.
            const autocompleteParams: google.maps.places.AutocompleteRequest = {
                input: query.trim(),
                sessionToken: sessionTokenRef.current!,
            }
            if (config.primaryTypes.length > 0) {
                autocompleteParams.includedPrimaryTypes = config.primaryTypes
            }
            const { suggestions } = await google.maps.places.AutocompleteSuggestion
                .fetchAutocompleteSuggestions(autocompleteParams)

            const items: SearchResultItem[] = suggestions
                .filter(s => s.placePrediction)
                .map(s => {
                    const pred = s.placePrediction!
                    return {
                        placeId: pred.placeId,
                        name: pred.mainText?.text || '',
                        address: pred.secondaryText?.text || '',
                        // Thumbnail comes from the backend photo proxy keyed on
                        // place_id — no per-suggestion Google Place Details /
                        // Photo Media calls. The proxy caches across users, so a
                        // popular place's thumbnail is fetched once for everyone.
                        thumbnailUrl: placePhotoProxyUrl(pred.placeId, 200),
                        _toPlace: () => pred.toPlace(),
                    }
                })

            setResults(items)
            setIsSearching(false)
        } catch {
            setIsSearching(false)
            setResults([])
        }
    }, [query, placesReady, isSearching])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSearch()
        }
    }

    const handleSelectPlace = useCallback(async (item: SearchResultItem) => {
        setResults([])
        setIsLoadingDetails(true)

        try {
            const place = item._toPlace()
            // ``photos`` is intentionally NOT requested here — dropping it
            // keeps this terminating Place Details call out of the photo
            // SKU tier, and the preview thumbnail comes from the proxy
            // (keyed on place_id) instead of a per-selection Photo Media call.
            await place.fetchFields({
                fields: [
                    'displayName',
                    'id',
                    'formattedAddress',
                    'googleMapsURI',
                    'location',
                    'primaryType',
                    'rating',
                    'userRatingCount',
                ],
            })

            const lat = place.location?.lat() ?? null
            const lng = place.location?.lng() ?? null
            const anyPlace = place as unknown as {
                primaryType?: string | null
                rating?: number | null
                userRatingCount?: number | null
            }
            const placeData: MealPlaceData = {
                placeId: place.id!,
                name: place.displayName || item.name,
                address: place.formattedAddress || '',
                // Preview thumbnail via the proxy — stable, no Google call.
                photoUrl: place.id ? placePhotoProxyUrl(place.id, 800) : null,
                googleMapsUrl: place.googleMapsURI || '',
                latitude: lat,
                longitude: lng,
                primaryType: anyPlace.primaryType ?? null,
                rating: typeof anyPlace.rating === 'number' ? anyPlace.rating : null,
                userRatingsCount:
                    typeof anyPlace.userRatingCount === 'number' ? anyPlace.userRatingCount : null,
            }
            setFormData((prev) => ({
                // ``place`` variant keeps any user-authored title —
                // the dedicated Title input above the search is the
                // primary title field, the Place card is supporting
                // context. Only fall back to the Google display name
                // when the traveler hasn't typed anything yet.
                title:
                    variant === 'place'
                        ? prev.title.trim() || placeData.name
                        : placeData.name,
                placeData,
            }))
            setQuery(placeData.name)
            setUseCustomName(false)
        } catch (e) {
            console.error('Failed to fetch place details:', e)
        } finally {
            setIsLoadingDetails(false)
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
        }
    }, [variant])

    const handleClearPlace = () => {
        setFormData({ title: '', placeData: null })
        setQuery('')
        setResults([])
        setUseCustomName(false)
    }

    const handleUseCustomName = () => {
        setUseCustomName(true)
        setResults([])
        setFormData({ title: query.trim(), placeData: null })
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Place variant has a dedicated Title input above the
                Google search so travelers can label the slot with
                their own words ("Morning hike", "Beach sunset") even
                when they've picked a specific Google Place as the
                supporting location. Meal variant keeps the auto-set
                restaurant name as the title. */}
            {variant === 'place' && (
                <div className="flex flex-col gap-2">
                    <AddSlotLabel isRequired text="Title" />
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                            setFormData((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="e.g., Morning hike, Beach sunset, Temple visit"
                        className="w-full h-10 px-3 border border-grey-4 rounded-[12px] bg-white text-grey-0 font-manrope text-sm focus:outline-none focus:border-primary-default transition-colors placeholder:text-grey-3"
                    />
                </div>
            )}

            {/* Search / Title input */}
            <div className="flex flex-col gap-2">
                <AddSlotLabel
                    isRequired={variant !== 'place'}
                    text={variant === 'place' ? 'Location' : 'Restaurant or Meal'}
                />

                {!useCustomName && !formData.placeData && (
                    <>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-2" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value)
                                        setFormData(prev => ({ ...prev, title: e.target.value }))
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder={config.placeholder}
                                    className="w-full h-10 pl-10 pr-4 border border-grey-4 rounded-[12px] bg-white text-grey-0 font-manrope text-sm focus:outline-none focus:border-primary-default transition-colors placeholder:text-grey-3"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSearch}
                                disabled={isSearching || !query.trim()}
                                className="h-10 px-4 rounded-[12px] bg-primary-default text-white hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center justify-center shrink-0"
                            >
                                {isSearching ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        {/* Search results dropdown */}
                        {results.length > 0 && (
                            <div className="bg-white border border-grey-4 rounded-lg shadow-lg max-h-[220px] overflow-y-auto">
                                {results.map((item) => (
                                    <button
                                        key={item.placeId}
                                        type="button"
                                        onClick={() => handleSelectPlace(item)}
                                        className="w-full text-left px-3 py-2.5 hover:bg-grey-5 transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center gap-3"
                                    >
                                        {item.thumbnailUrl ? (
                                            <img
                                                src={item.thumbnailUrl}
                                                alt=""
                                                className="w-10 h-10 rounded object-cover shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded bg-grey-5 flex items-center justify-center shrink-0">
                                                <MapPin className="w-4 h-4 text-grey-3" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-grey-0 font-red-hat-display truncate">
                                                {item.name}
                                            </p>
                                            <p className="text-xs text-grey-2 font-manrope truncate">
                                                {item.address}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Custom name fallback — meal variant only.
                            Place variant already has a dedicated Title
                            input above, so there's no need for a
                            separate custom-name mode. */}
                        {variant !== 'place' &&
                            query.trim() &&
                            !isSearching &&
                            results.length === 0 &&
                            !isLoadingDetails && (
                                <button
                                    type="button"
                                    onClick={handleUseCustomName}
                                    className="text-left text-sm text-primary-default font-manrope font-medium hover:underline cursor-pointer"
                                >
                                    Use &quot;{query.trim()}&quot; as custom name
                                </button>
                            )}
                        {variant !== 'place' && query.trim() && results.length > 0 && (
                            <button
                                type="button"
                                onClick={handleUseCustomName}
                                className="text-left text-xs text-grey-2 font-manrope hover:text-primary-default cursor-pointer"
                            >
                                Not finding it? Use &quot;{query.trim()}&quot; as custom name
                            </button>
                        )}
                    </>
                )}

                {/* Loading details */}
                {isLoadingDetails && (
                    <div className="flex items-center justify-center h-[80px] rounded-lg bg-grey-5/50">
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-primary-default animate-spin" />
                            <span className="text-sm text-grey-2 font-manrope">Loading place details...</span>
                        </div>
                    </div>
                )}

                {/* Selected place card — compact peach layout from
                    ``rimigo-design-system/project/Add to Itinerary.html``
                    (MealCanvas): thumbnail on the left, name + address +
                    rating on the right, cream/orange tinted surface to
                    match the Meal accent colour. */}
                {formData.placeData && !isLoadingDetails && (
                    <div
                        className="flex items-start gap-3 p-3 rounded-[14px]"
                        style={{
                            background: config.cardBg,
                            border: `1px solid ${config.cardBorder}`,
                        }}>
                        {/* Thumbnail */}
                        {formData.placeData.photoUrl ? (
                            <img
                                src={formData.placeData.photoUrl}
                                alt={formData.placeData.name}
                                className="w-[60px] h-[60px] rounded-[10px] object-cover bg-white shrink-0"
                            />
                        ) : (
                            <div
                                className="w-[60px] h-[60px] rounded-[10px] bg-white flex items-center justify-center shrink-0"
                                aria-hidden>
                                <MapPin className="w-5 h-5 text-grey-3" />
                            </div>
                        )}

                        {/* Body */}
                        <div className="flex-1 min-w-0">
                            <div
                                className="text-[15px] text-grey-0 truncate"
                                style={{
                                    fontFamily: "'Red Hat Display', sans-serif",
                                    fontWeight: 700,
                                }}>
                                {formData.placeData.name}
                            </div>
                            <div
                                className="text-[12px] text-grey-2 mt-[2px] truncate"
                                style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 500 }}>
                                {formData.placeData.address}
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {formData.placeData.googleMapsUrl && (
                                    <a
                                        href={formData.placeData.googleMapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-2 py-[3px] rounded-full bg-white text-[10px] text-grey-1 hover:text-primary-default transition-colors"
                                        style={{
                                            fontFamily: "'Manrope', sans-serif",
                                            fontWeight: 600,
                                        }}>
                                        <MapPin className="w-3 h-3" />
                                        Maps
                                        <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                )}
                                {typeof formData.placeData.rating === 'number' && (
                                    <div
                                        className="flex items-center gap-1 px-2 py-[3px] rounded-full bg-white"
                                        style={{
                                            fontFamily: "'Manrope', sans-serif",
                                            fontWeight: 700,
                                        }}>
                                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                        <span className="text-[11px] text-grey-0">
                                            {formData.placeData.rating.toFixed(1)}
                                        </span>
                                        {typeof formData.placeData.userRatingsCount === 'number' && (
                                            <span className="text-[10px] text-grey-2 font-normal">
                                                ({formData.placeData.userRatingsCount.toLocaleString()})
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Clear */}
                        <button
                            type="button"
                            onClick={handleClearPlace}
                            aria-label="Clear selection"
                            className="p-1 rounded-full hover:bg-white/70 transition-colors cursor-pointer shrink-0">
                            <X className="w-4 h-4 text-grey-1" />
                        </button>
                    </div>
                )}

                {/* Custom name mode */}
                {useCustomName && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ title: e.target.value, placeData: null })}
                                placeholder="e.g., Hotel breakfast, Street food"
                                className="flex-1 h-10 px-4 border border-grey-4 rounded-[12px] outline-none focus:border-primary-default transition-colors font-manrope text-sm placeholder:text-grey-3"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setUseCustomName(false)
                                setQuery(formData.title)
                            }}
                            className="text-left text-xs text-primary-default font-manrope hover:underline cursor-pointer"
                        >
                            Search on Google instead
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
})

MealSection.displayName = 'MealSection'

/**
 * Thin wrapper around ``MealSection`` with ``variant='place'`` — same
 * Google Places lookup, same canonical ``slot_data`` schema
 * (place_id / name / formatted_address / location / photo_url / photos
 * / rating / user_ratings_count / primary_type / google_maps_uri),
 * but no type filter so any Place surfaces (beach, mountain, park,
 * street, viewpoint, temple, neighbourhood, etc.). Payload sets
 * ``kind: "place"`` which the backend already validates
 * (``SLOT_KIND_PLACE`` in ``trip/constants/itinerary_slot_constants.py``).
 */
export const PlaceSection = forwardRef<SlotPayloadProvider, Omit<React.ComponentProps<typeof MealSection>, 'variant'>>(
    (props, ref) => <MealSection {...props} variant="place" ref={ref} />,
)
PlaceSection.displayName = 'PlaceSection'

export default MealSection
