import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Loader2, Search, Instagram, Utensils, MapPin, ExternalLink, CheckCircle2 } from 'lucide-react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { ENTITY_TYPE_RESTAURANT } from '../lib/collectionConfig'
import { toast } from 'sonner'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'
import { placePhotoProxyUrl } from '@/modules/Itinerary/utils/mealPlaceImage'

type CollectionApi = {
    addSection: (
        collectionIdentifier: string,
        payload: {
            id: string
            section_type: string
            title: string
            description?: string | null
            sections_order: number
            blocks: unknown[]
            metadata?: Record<string, unknown>
        }
    ) => Promise<unknown>
}

interface AddFoodItemModalProps {
    isOpen: boolean
    onClose: () => void
    collectionIdentifier: string
    onSuccess?: () => void
    api?: CollectionApi
    availableCities?: { id: string; name: string }[]
    isRimigoInternal?: boolean
}

interface PlaceResult {
    placeId: string
    name: string
    address: string
    photoUrl: string | null
    googleMapsUrl: string
    latitude: number | null
    longitude: number | null
}

interface SearchResultItem {
    placeId: string
    name: string
    address: string
    thumbnailUrl: string | null
    _toPlace: () => google.maps.places.Place
}

const AddFoodItemModal: React.FC<AddFoodItemModalProps> = ({
    isOpen,
    onClose,
    collectionIdentifier,
    onSuccess,
    api = contentCollectionApi,
    availableCities = [],
    isRimigoInternal = false
}) => {
    const { trackButtonClickCustom } = usePostHog()
    const [query, setQuery] = useState('')
    const [instagramUrl, setInstagramUrl] = useState('')
    const [selectedCityId, setSelectedCityId] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Google Places
    const [results, setResults] = useState<SearchResultItem[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)
    const [placesReady, setPlacesReady] = useState(false)

    const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

    // Initialize Google Places (client-only - setOptions accesses window, would break SSR)
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
        if (isOpen) {
            setQuery('')
            setInstagramUrl('')
            setSelectedCityId('')
            setResults([])
            setSelectedPlace(null)
            setIsSearching(false)
            setIsLoadingDetails(false)
            if (placesReady) {
                sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
            }
        }
    }, [isOpen, placesReady])

    // Search triggered explicitly (Enter key or button click)
    const handleSearch = useCallback(async () => {
        if (!query.trim() || !placesReady || isSearching) return

        trackButtonClickCustom?.({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'food_spot_search',
            buttonAction: 'search',
            extra: { query: query.trim(), city_id: selectedCityId }
        })
        setSelectedPlace(null)
        setIsSearching(true)

        try {
            const { suggestions } = await google.maps.places.AutocompleteSuggestion
                .fetchAutocompleteSuggestions({
                    input: query.trim(),
                    includedPrimaryTypes: ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway'],
                    sessionToken: sessionTokenRef.current!,
                })

            const items: SearchResultItem[] = suggestions
                .filter(s => s.placePrediction)
                .map(s => {
                    const pred = s.placePrediction!
                    return {
                        placeId: pred.placeId,
                        name: pred.mainText?.text || '',
                        address: pred.secondaryText?.text || '',
                        // Thumbnail via the backend photo proxy keyed on
                        // place_id — no per-suggestion Place Details / Photo
                        // Media calls. The proxy caches across users.
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

    // Fetch place details on selection
    const handleSelectPlace = useCallback(async (item: SearchResultItem) => {
        trackButtonClickCustom?.({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'food_spot_place_select',
            buttonAction: 'select',
            extra: { place_name: item.name, place_id: item.placeId }
        })
        setResults([])
        setIsLoadingDetails(true)

        try {
            const place = item._toPlace()
            // ``photos`` omitted — the preview and stored photo come from the
            // place_id photo proxy (stable, cached), not a Photo Media call.
            await place.fetchFields({
                fields: ['displayName', 'id', 'formattedAddress', 'googleMapsURI', 'location'],
            })

            const photoUrl = place.id ? placePhotoProxyUrl(place.id, 800) : null
            const lat = place.location?.lat() ?? null
            const lng = place.location?.lng() ?? null
            setSelectedPlace({
                placeId: place.id!,
                name: place.displayName || item.name,
                address: place.formattedAddress || '',
                photoUrl,
                googleMapsUrl: place.googleMapsURI || '',
                latitude: lat,
                longitude: lng,
            })
            setQuery(place.displayName || item.name)
        } catch (e) {
            console.error('Failed to fetch place details:', e)
            toast.error('Failed to load place details')
        } finally {
            setIsLoadingDetails(false)
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
        }
    }, [])

    const generateRandomId = (): string => {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }

    const generateRandomOrder = (): number => {
        return Math.floor(Math.random() * 1000) + 1
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPlace) {
            toast.error('Please select a place from the search results')
            return
        }

        setIsSubmitting(true)
        try {
            const value: Record<string, unknown> = {}
            if (selectedPlace.googleMapsUrl) value.maps_url = selectedPlace.googleMapsUrl
            if (instagramUrl.trim()) value.instagram_url = instagramUrl.trim()
            value.place_id = selectedPlace.placeId
            if (selectedPlace.photoUrl) value.photo_url = selectedPlace.photoUrl
            if (selectedPlace.address) value.address = selectedPlace.address
            if (selectedPlace.latitude != null) value.latitude = selectedPlace.latitude
            if (selectedPlace.longitude != null) value.longitude = selectedPlace.longitude

            const selectedCity = availableCities.find((c) => c.id === selectedCityId)
            const payload: {
                id: string
                section_type: string
                title: string
                description: null
                sections_order: number
                blocks: unknown[]
                entity_type?: string
                metadata?: Record<string, unknown>
            } = {
                id: generateRandomId(),
                section_type: 'restaurant',
                title: selectedPlace.name,
                description: null,
                sections_order: generateRandomOrder(),
                entity_type: ENTITY_TYPE_RESTAURANT,
                blocks: [
                    {
                        block_type: 'links',
                        value
                    }
                ]
            }
            if (selectedCity) {
                payload.metadata = {
                    city_id: selectedCity.id,
                    city_name: selectedCity.name,
                    ...(selectedPlace.photoUrl ? { photo_url: selectedPlace.photoUrl } : {}),
                    ...(selectedPlace.latitude != null && selectedPlace.longitude != null
                        ? {
                              location: {
                                  latitude: selectedPlace.latitude,
                                  longitude: selectedPlace.longitude,
                                  address: selectedPlace.address || undefined
                              }
                          }
                        : {})
                }
            } else {
                payload.metadata = {
                    ...(selectedPlace.photoUrl ? { photo_url: selectedPlace.photoUrl } : {}),
                    ...(selectedPlace.latitude != null && selectedPlace.longitude != null
                        ? {
                              location: {
                                  latitude: selectedPlace.latitude,
                                  longitude: selectedPlace.longitude,
                                  address: selectedPlace.address || undefined
                              }
                          }
                        : {})
                }
            }

            await api.addSection(collectionIdentifier, payload)
            trackButtonClickCustom?.({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: 'food_spot_added',
                buttonAction: 'submit',
                extra: {
                    place_name: selectedPlace.name,
                    place_id: selectedPlace.placeId,
                    city_id: selectedCityId,
                    city_name: selectedCity?.name,
                    has_instagram: !!instagramUrl.trim()
                }
            })
            toast.success('Food item added successfully')
            setQuery('')
            setInstagramUrl('')
            setSelectedPlace(null)
            setResults([])
            onSuccess?.()
            onClose()
        } catch (error) {
            console.error('Error adding food item:', error)
            toast.error('Failed to add food item. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        if (!isSubmitting) onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} aria-hidden />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 z-10 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-5 pb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-default/10">
                        <Utensils className="w-5 h-5 text-primary-default" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-medium font-red-hat-display text-grey-0">Add food spot</h2>
                        <p className="text-sm text-grey-2 font-manrope font-medium">Search for a restaurant or cafe</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="p-2 hover:bg-grey-5 rounded-xl transition-colors disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4 text-grey-2" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col">
                    {/* Search input with button */}
                    <div className="px-5 pb-2 relative">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-2" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isSubmitting}
                                    placeholder="Search restaurants, cafes..."
                                    className="w-full pl-10 pr-4 py-3 border border-grey-4 rounded-xl bg-grey-5/50 text-grey-0 font-manrope text-base focus:outline-none focus:ring-2 focus:ring-primary-default focus:bg-white focus:border-primary-default disabled:opacity-50 transition-all input-placeholder"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSearch}
                                disabled={isSubmitting || isSearching || !query.trim()}
                                className="px-3.5 py-3 rounded-xl bg-primary-default text-white hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center justify-center shrink-0 font-medium"
                                aria-label="Search"
                            >
                                {isSearching ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        {/* Search results dropdown */}
                        {results.length > 0 && !selectedPlace && (
                            <div className="absolute left-5 right-5 top-full mt-1 bg-white border border-grey-4 rounded-xl shadow-lg z-20 max-h-[280px] overflow-y-auto">
                                {results.map((item) => (
                                    <button
                                        key={item.placeId}
                                        type="button"
                                        onClick={() => handleSelectPlace(item)}
                                        className="w-full text-left px-3 py-2.5 hover:bg-grey-5 transition-colors first:rounded-t-xl last:rounded-b-xl flex items-center gap-3"
                                    >
                                        {item.thumbnailUrl ? (
                                            <img
                                                src={item.thumbnailUrl}
                                                alt=""
                                                className="w-12 h-12 rounded object-cover shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded bg-grey-5 flex items-center justify-center shrink-0">
                                                <MapPin className="w-5 h-5 text-grey-3" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-base font-semibold text-grey-0 font-red-hat-display truncate">
                                                {item.name}
                                            </p>
                                            <p className="text-sm text-grey-2 font-manrope truncate">
                                                {item.address}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Loading details */}
                    {isLoadingDetails && (
                        <div className="mx-5 my-3 flex items-center justify-center h-[200px] rounded-2xl bg-gradient-to-br from-grey-5 to-grey-4/30">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
                                    <Loader2 className="w-5 h-5 text-primary-default animate-spin" />
                                </div>
                                <span className="text-sm text-grey-2 font-manrope">Finding place details...</span>
                            </div>
                        </div>
                    )}

                    {/* Selected place card */}
                    {selectedPlace && !isLoadingDetails && (
                        <div className="mx-5 my-3 rounded-2xl overflow-hidden shadow-sm border border-grey-4/50">
                            {selectedPlace.photoUrl ? (
                                <div className="relative">
                                    <img
                                        src={selectedPlace.photoUrl}
                                        alt={selectedPlace.name}
                                        className="w-full h-[200px] object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                                    <div className="absolute top-3 right-3">
                                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                            <span className="text-xs font-semibold text-grey-0 font-manrope">Matched</span>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-4">
                                        <p className="text-lg font-semibold text-white font-red-hat-display drop-shadow-md leading-tight">
                                            {selectedPlace.name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-white/80 shrink-0" />
                                            <span className="text-sm text-white/80 font-manrope truncate drop-shadow-sm">
                                                {selectedPlace.address}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="px-4 py-5 bg-gradient-to-br from-grey-5/80 to-grey-5/30">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <span className="text-xs font-semibold text-green-700 font-manrope">Matched</span>
                                    </div>
                                    <p className="text-lg font-semibold text-grey-0 font-red-hat-display leading-tight">
                                        {selectedPlace.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-grey-2 shrink-0" />
                                        <span className="text-sm text-grey-2 font-manrope truncate">
                                            {selectedPlace.address}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {selectedPlace.googleMapsUrl && (
                                <a
                                    href={selectedPlace.googleMapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-grey-5/40 hover:bg-grey-5 border-t border-grey-4/50 transition-colors group"
                                >
                                    <MapPin className="w-4 h-4 text-grey-2 group-hover:text-primary-default transition-colors" />
                                    <span className="text-sm font-medium text-grey-1 font-manrope group-hover:text-primary-default transition-colors">
                                        View on Google Maps
                                    </span>
                                    <ExternalLink className="w-3.5 h-3.5 text-grey-3 group-hover:text-primary-default transition-colors" />
                                </a>
                            )}
                        </div>
                    )}

                    {/* City dropdown */}
                    {availableCities.length > 0 && (
                        <div className="px-5 pb-2 pt-1">
                            <select
                                value={selectedCityId}
                                onChange={(e) => setSelectedCityId(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full px-4 py-3 border border-grey-4 rounded-xl bg-grey-5/50 text-grey-0 font-manrope text-base focus:outline-none focus:ring-2 focus:ring-primary-default focus:bg-white focus:border-primary-default disabled:opacity-50 transition-all appearance-none"
                            >
                                <option value="">Select city</option>
                                {availableCities.map((city) => (
                                    <option key={city.id} value={city.id}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Optional fields — only for internal users */}
                    {isRimigoInternal && (
                        <>
                            <div className="border-t border-grey-4" />
                            <div className="px-5 pt-4 pb-2">
                                <p className="text-sm font-semibold text-grey-2 font-red-hat-display uppercase tracking-wider mb-3">Optional</p>
                                <div className="relative">
                                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-2" />
                                    <input
                                        type="url"
                                        value={instagramUrl}
                                        onChange={(e) => setInstagramUrl(e.target.value)}
                                        disabled={isSubmitting}
                                        placeholder="Instagram profile URL"
                                        className="w-full pl-10 pr-4 py-3 border border-grey-4 rounded-xl bg-grey-5/50 text-grey-0 font-manrope text-base focus:outline-none focus:ring-2 focus:ring-primary-default focus:bg-white focus:border-primary-default disabled:opacity-50 transition-all"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-3 p-5 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 rounded-xl border border-grey-4 text-grey-1 font-semibold font-red-hat-display text-base hover:bg-grey-5 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedPlace}
                            className="flex-1 px-4 py-3 rounded-xl bg-primary-default text-white font-semibold font-red-hat-display text-base hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                'Add spot'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddFoodItemModal
