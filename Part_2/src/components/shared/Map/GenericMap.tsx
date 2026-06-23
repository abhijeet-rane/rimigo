import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import ReactDOM from 'react-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { ArrowLeftFromLine, ArrowRightFromLine, ChevronDown, ChevronLeft, Hotel, MapPin, SlidersHorizontal, Sparkles, Utensils } from 'lucide-react'
import { calculateCentroid, calculateBounds } from '@/utils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'
import { MAP_CONFIG } from './mapConfig'
import type { DayMapData } from '@/modules/Itinerary/hooks/useItineraryMapData'
import { useBestAreas, type BestAreaOption } from '@/hooks/useBestAreas'
import { useUserInfo } from '@/hooks/useUserInfo'
import { shouldShowAirbnb } from '@/pages/Stays/config/stayCardVisibility'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'

export interface GeoLocation {
    lat: string | number
    long: string | number
}

export interface MapMarker {
    id: string | number
    name: string
    geo_location?: GeoLocation
    image?: string
    images?: string[]
    // For accommodations
    rate_per_night?: number
    overall_rating?: number
    /** Star rating (★★★★). Separate from overall_rating (platform review
     *  score like 4.5/5). Shown on the accommodation popup alongside the
     *  review-score pill. */
    star_rating?: number | string
    zentrum_hub_id?: string
    accommodation_id?: string
    // For experiences
    experience_id?: string
    price?: {
        lower_bound?: number | null
        upper_bound?: number | null
        currency?: string | null
    }
    // Type discriminator
    type: 'accommodation' | 'explore_accommodation' | 'experience' | 'restaurant' | 'city'
    // Additional data for navigation/actions
    onClickData?: Record<string, unknown>
    // Sequence badge (1, 2, 3…) shown on pin top-left
    sequenceNumber?: number
    // Label shown below pin (e.g. "Day 1-3" for city markers)
    sequenceLabel?: string
    is_verified?: boolean
    is_b2b_deal_available?: boolean
    is_available_on_airbnb?: boolean
}

export interface GenericMapProps {
    cityName?: string
    /**
     * Explicit city center (lon/lat) to use as map center.
     * When provided with `centerMode="city"`, the map will center on this instead of fitting to marker bounds.
     */
    cityCenter?: { lon: number; lat: number } | null
    /** Determines how the map chooses its center (default: "markers") */
    centerMode?: 'markers' | 'city'
    markers?: MapMarker[]
    hoveredMarkerId?: string | null
    onMarkerClick?: (markerId: string | number, extras?: { name?: string }) => void
    isExpanded?: boolean
    onExpandChange?: (expanded: boolean) => void
    // Custom renderers for popup content
    renderPopupContent?: (marker: MapMarker) => React.ReactNode
    // Custom marker styling
    getMarkerColor?: (marker: MapMarker) => string
    getMarkerText?: (marker: MapMarker) => string
    expandbtnClassName?: string
    hideExpandButton?: boolean
    height?: string
    className?: string
    // Override min zoom (default from MAP_CONFIG)
    minZoom?: number
    // Override initial pitch (default from MAP_CONFIG)
    initialPitch?: number
    // Zoom level when there are no markers (e.g. zoomed-out overview when no cities selected)
    emptyZoom?: number
    // Route line coordinates (array of [lng, lat] pairs in order)
    routeCoordinates?: [number, number][]
    // Route line styling overrides
    routeLineStyle?: { color?: string; width?: number; opacity?: number; dashArray?: number[] }
    onPopupButtonClick?: (action: 'view_deal' | 'view_details' | 'directions' | 'instagram', marker: MapMarker) => void
    /** Accommodation-popup only: fires the add-to-collection / tripboard
     *  flow. When provided, renders the heart button on the popup image. */
    onMarkerAddToCollection?: (marker: MapMarker) => void
    /** Accommodation-popup only: drives the heart's filled/outline state.
     *  Called per marker when rendering the popup. Default: not shortlisted. */
    getMarkerIsShortlisted?: (marker: MapMarker) => boolean
    // City ID for fetching best areas to stay
    cityId?: string
    // Show filter pills on the map to toggle marker types (Hotels, Activities, Food)
    showMarkerTypeFilters?: boolean
    // Active tab — when provided, auto-selects the matching marker type filter
    activeTab?: string | null
    // Itinerary day map data — when provided, shows "Itinerary" filter with day chips
    itineraryDayMapData?: DayMapData[]
    // Callback to switch back to list view (renders a "List View" button in the map overlay)
    onListViewClick?: () => void
    // City switcher config — renders city pills on the map overlay
    citySwitcherConfig?: {
        cities: Array<{ id: string; name: string }>
        selectedCityId: string | null
        onCityChange: (cityId: string) => void
    }
    /**
     * Optional fetcher invoked on `moveend` (600 ms debounced) to populate
     * additional markers inside the current viewport. Returns lightweight
     * stay data added imperatively via `mapboxgl.Marker` — never triggers
     * a React re-render of the marker-array driven logic.
     * Only invoked when `viewportMarkersEnabled` is true.
     */
    fetchViewportStays?: (bounds: {
        north: number
        south: number
        east: number
        west: number
    }) => Promise<Array<ViewportStay>>
    /**
     * Explicit gate for viewport marker loading. Kept separate from
     * `fetchViewportStays` so the caller can keep the fetcher stable
     * while toggling the feature (e.g. when switching tabs / sub-views).
     * When this flips true → false, all viewport markers are cleared.
     */
    viewportMarkersEnabled?: boolean
    /**
     * Emits current map bounds whenever the user pans/zooms (debounced 600ms).
     * Parents use this to drive a bounds-scoped list query so list + map stay
     * consistent. Independent of `viewportMarkersEnabled` — this is a pure
     * observer, no imperative markers.
     */
    onBoundsChange?: (bounds: {
        north: number
        south: number
        east: number
        west: number
    }) => void
    /**
     * If provided on mount, the map performs an initial `fitBounds` to these
     * coordinates instead of deriving view from markers. Used to frame the
     * map around the set of activity markers for a city.
     */
    initialBounds?: {
        north: number
        south: number
        east: number
        west: number
    } | null
    /**
     * When true, the auto-fit-to-markers camera effect is disabled. Callers
     * that supply `initialBounds` and want a fixed camera (e.g., Stays For
     * You — always frame the selected city center at a fixed zoom) should
     * set this so newly-arriving markers don't override the fixed view.
     */
    disableMarkerFit?: boolean
}

export interface ViewportStay {
    id: string | number
    name: string
    zentrum_hub_id?: string
    geo_location?: GeoLocation
    rate_per_night?: number | null
    overall_rating?: number
    content?: string[]
    banner_img?: string
}

const MARKER_TYPE_FILTER_CONFIG = [
    { type: 'accommodation', label: 'Hotels', Icon: Hotel, color: '#2563eb' },
    { type: 'experience', label: 'Activities', Icon: MapPin, color: '#7011F6' },
    { type: 'restaurant', label: 'Food', Icon: Utensils, color: '#ef4444' },
] as const

const EMPTY_BEST_AREAS_GEOJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: []
}

const GenericMap = ({
    cityName,
    cityCenter = null,
    centerMode = 'markers',
    markers = [],
    hoveredMarkerId,
    onMarkerClick,
    isExpanded = false,
    onExpandChange,
    renderPopupContent,
    getMarkerColor,
    getMarkerText,
    expandbtnClassName,
    hideExpandButton = false,
    height = 'calc(100vh)',
    className = '',
    minZoom: minZoomProp,
    initialPitch: initialPitchProp,
    emptyZoom: emptyZoomProp,
    routeCoordinates,
    routeLineStyle,
    cityId,
    showMarkerTypeFilters = false,
    activeTab = null,
    onPopupButtonClick,
    onMarkerAddToCollection,
    getMarkerIsShortlisted,
    itineraryDayMapData,
    onListViewClick,
    citySwitcherConfig,
    fetchViewportStays,
    viewportMarkersEnabled = false,
    onBoundsChange,
    initialBounds = null,
    disableMarkerFit = false,
}: GenericMapProps) => {
    const { trackButtonClickCustom } = usePostHog()
    const [coords, setCoords] = useState<{ lon: number; lat: number } | null>(null)
    const mapRef = useRef<HTMLDivElement | null>(null)
    const mapInstanceRef = useRef<mapboxgl.Map | null>(null)
    const markersRef = useRef<Map<string | number, mapboxgl.Marker>>(new Map())
    const markerElementsRef = useRef<Map<string | number, HTMLElement>>(new Map())
    // Tracks the image URL each marker pin was rendered with, so a later-arriving
    // image (e.g. async city-thumbnail fetch) rebuilds the pin instead of being
    // skipped by the existing-marker early-return.
    const markerImageRef = useRef<Map<string | number, string>>(new Map())
    const popupCardRef = useRef<HTMLElement | null>(null)
    const popupCardCoordinatesRef = useRef<{ lat: number; lng: number; markerId: string | number } | null>(null)
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const showPopupCardRef = useRef<((markerData: MapMarker, lat: number, lng: number) => void) | null>(null)
    const FOCUS_EVENT_NAME = 'collection:focusMarker'
    const hoveredMarkerIdRef = useRef(hoveredMarkerId)
    hoveredMarkerIdRef.current = hoveredMarkerId
    const routeLineStyleRef = useRef(routeLineStyle)
    routeLineStyleRef.current = routeLineStyle

    const { isRimigoInternal } = useUserInfo()

    // Best areas (TanStack Query)
    const { options: bestAreasOptions, geoJson: bestAreasGeoJson } = useBestAreas(cityId)
    const [selectedBestAreaId, setSelectedBestAreaId] = useState<string>('')
    const [bestAreasCollapsed, setBestAreasCollapsed] = useState(true)
    const [areaDetailsExpanded, setAreaDetailsExpanded] = useState(false)
    const bestAreasOptionsRef = useRef<BestAreaOption[]>([])
    const bestAreasGeoJsonRef = useRef<GeoJSON.FeatureCollection | null>(null)
    const bestAreasChipRef = useRef<HTMLDivElement>(null)
    const bestAreasModalRef = useRef<HTMLDivElement>(null)

    // Unified "Filters" dropdown — owns marker-type toggles + itinerary day
    // selection (best-areas stays as its own chip). Same portal-render pattern
    // as best-areas to avoid overflow clipping inside the map overlay.
    const [filtersOpen, setFiltersOpen] = useState(false)
    const filtersChipRef = useRef<HTMLDivElement>(null)
    const filtersModalRef = useRef<HTMLDivElement>(null)

    // Close best areas dropdown and detail popover on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                bestAreasChipRef.current && !bestAreasChipRef.current.contains(target) &&
                (!bestAreasModalRef.current || !bestAreasModalRef.current.contains(target))
            ) {
                setBestAreasCollapsed(true)
                setAreaDetailsExpanded(false)
            }
            if (
                filtersChipRef.current && !filtersChipRef.current.contains(target) &&
                (!filtersModalRef.current || !filtersModalRef.current.contains(target))
            ) {
                setFiltersOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Marker type filter state
    const [activeMarkerTypes, setActiveMarkerTypes] = useState<Set<string>>(() => new Set(['accommodation', 'explore_accommodation', 'experience', 'restaurant']))

    // ── Itinerary day filter state (shown under Activities filter) ──
    // null = "All" (show collection activities), number = specific itinerary day
    const [selectedItineraryDay, setSelectedItineraryDay] = useState<number | null>(null)
    const hasItineraryData = !!itineraryDayMapData && itineraryDayMapData.length > 0
    const activitiesFilterActive = activeMarkerTypes.has('experience')

    // When a specific day is selected, derive markers from itinerary data
    const itineraryMarkers = useMemo(() => {
        if (selectedItineraryDay === null || !itineraryDayMapData) return []
        const day = itineraryDayMapData[selectedItineraryDay]
        if (!day) return []
        return day.slots
            .filter(s => s.marker && s.kind === 'experience')
            .map((s, i) => ({ ...s.marker!, sequenceNumber: i + 1 }))
    }, [selectedItineraryDay, itineraryDayMapData])

    // Deactivate itinerary filter when tab changes
    // Sync marker type filters with active tab.
    // Stays (incl. Recommended / For-You) defaults with activity pins OFF so
    // the map stays focused on accommodations; users can opt-in via the
    // Activities filter pill.
    useEffect(() => {
        if (!showMarkerTypeFilters) return
        const TAB_TO_MARKER_TYPE: Record<string, string[]> = {
            stays: ['accommodation', 'explore_accommodation'],
            experience: ['experience'],
            restaurant: ['restaurant'],
        }
        const types = activeTab && TAB_TO_MARKER_TYPE[activeTab]
        setActiveMarkerTypes(new Set(types ?? ['accommodation', 'experience', 'restaurant']))
        setSelectedItineraryDay(null)
    }, [activeTab, showMarkerTypeFilters])

    const availableMarkerTypes = useMemo(() => {
        const types = new Set(markers.map((m) => m.type))
        return MARKER_TYPE_FILTER_CONFIG.filter((f) => types.has(f.type))
    }, [markers])

    const filteredMarkers = useMemo(() => {
        if (!showMarkerTypeFilters) return markers
        // When a specific itinerary day is selected under Activities, show only that day's pins
        if (selectedItineraryDay !== null && activitiesFilterActive) return itineraryMarkers
        return markers.filter((m) => activeMarkerTypes.has(m.type))
    }, [markers, activeMarkerTypes, showMarkerTypeFilters, selectedItineraryDay, activitiesFilterActive, itineraryMarkers])

    const toggleMarkerType = useCallback((type: string) => {
        setActiveMarkerTypes((prev) => {
            const next = new Set(prev)
            const willBeEnabled = !next.has(type)
            if (next.has(type)) {
                next.delete(type)
            } else {
                next.add(type)
            }
            trackButtonClickCustom?.({ buttonPage: TRIPBOARD_V1_BUTTON_PAGE, buttonName: 'map_marker_filter_toggle', buttonAction: 'click', extra: { marker_type: type, enabled: willBeEnabled } })
            return next
        })
    }, [trackButtonClickCustom])

    const cityQuery = useMemo(() => (cityName ? cityName : ''), [cityName])

    // Get marker color based on type and rating
    const getMarkerColorDefault = useCallback(
        (marker: MapMarker): string => {
            if (getMarkerColor) {
                return getMarkerColor(marker)
            }

            if (marker.type === 'experience' || marker.type === 'restaurant' || marker.type === 'city') {
                return MAP_CONFIG.marker.experience.defaultColor
            }

            // For accommodations, use rating-based colors
            if ((marker.type === 'accommodation' || marker.type === 'explore_accommodation') && marker.overall_rating) {
                const rating = marker.overall_rating
                const percentage = (rating / 10) * 100

                if (percentage > MAP_CONFIG.ratingColors.excellent.threshold) {
                    return MAP_CONFIG.ratingColors.excellent.color
                } else if (percentage > MAP_CONFIG.ratingColors.great.threshold) {
                    return MAP_CONFIG.ratingColors.great.color
                } else if (percentage > MAP_CONFIG.ratingColors.good.threshold) {
                    return MAP_CONFIG.ratingColors.good.color
                } else if (percentage > MAP_CONFIG.ratingColors.average.threshold) {
                    return MAP_CONFIG.ratingColors.average.color
                } else {
                    return MAP_CONFIG.ratingColors.poor.color
                }
            }

            return MAP_CONFIG.marker.accommodation.defaultColor
        },
        [getMarkerColor]
    )

    // Get marker text based on type
    const getMarkerTextDefault = useCallback(
        (marker: MapMarker): string => {
            if (getMarkerText) {
                return getMarkerText(marker)
            }

            if (marker.type === 'accommodation' || marker.type === 'explore_accommodation') {
                return marker.rate_per_night ? `₹ ${Math.round(marker.rate_per_night).toLocaleString()}` : '—'
            }

            if (marker.type === 'experience') {
                // Show experience name (truncated) or price
                if (marker.price?.lower_bound) {
                    const currency = marker.price.currency || '₹'
                    return `${currency} ${Math.round(marker.price.lower_bound).toLocaleString()}`
                }
                return marker.name.length > 10 ? marker.name.substring(0, 10) + '...' : marker.name
            }

            if (marker.type === 'restaurant') {
                return marker.name.length > 10 ? marker.name.substring(0, 10) + '...' : marker.name
            }

            return '—'
        },
        [getMarkerText]
    )

    // Calculate centroid and bounds from visible markers (and route coordinates for bounds)
    // Use stable calculation to prevent unnecessary recalculations when switching tabs
    const { centroid, bounds } = useMemo(() => {
        // `calculateCentroid/calculateBounds` expect `{ lat: string; long: string }[]`.
        // Normalize here because our markers may provide numbers too.
        const geoLocations: Array<{ lat: string; long: string }> = filteredMarkers
            .filter((marker) => marker.geo_location?.lat != null && marker.geo_location?.long != null)
            .map((marker) => ({
                lat: String(marker.geo_location!.lat),
                long: String(marker.geo_location!.long)
            }))

        // Include route coordinates in bounds calculation so the map zooms out
        // enough to show the entire route, not just the markers.
        // Centroid stays based on markers only (we want to center on markers).
        const boundsLocations = [...geoLocations]
        if (routeCoordinates && routeCoordinates.length >= 2) {
            for (const coord of routeCoordinates) {
                boundsLocations.push({
                    lat: String(coord[1]),  // routeCoordinates are [lng, lat]
                    long: String(coord[0])
                })
            }
        }

        // Create stable key from marker IDs to prevent recalculation when array reference changes but content is same
        const markerKey = filteredMarkers
            .map((m) => `${m.id}-${m.geo_location?.lat}-${m.geo_location?.long}`)
            .sort()
            .join('|')

        return {
            centroid: calculateCentroid(geoLocations),
            bounds: calculateBounds(boundsLocations),
            _markerKey: markerKey // Internal key for stability
        }
    }, [filteredMarkers, routeCoordinates])

    // Use centroid if available, otherwise use city coords
    const mapCenter = useMemo(() => {
        if (centerMode === 'city' && cityCenter) {
            return cityCenter
        }
        if (centroid) {
            return { lon: centroid.lng, lat: centroid.lat }
        }
        return coords
    }, [centerMode, cityCenter, centroid, coords])

    // If we already have any marker coordinates, avoid geocoding cityName (prevents unnecessary Mapbox calls)
    const hasMarkerGeo = useMemo(() => {
        return markers.some((m) => m.geo_location?.lat != null && m.geo_location?.long != null)
    }, [markers])

    // Fetch city coordinates
    useEffect(() => {
        if (!MAP_CONFIG.token || !cityQuery) {
            return
        }
        if (centerMode === 'city' && cityCenter) {
            return
        }
        if (hasMarkerGeo) {
            return
        }
        let ignore = false
        const fetchGeo = async () => {
            try {
                const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityQuery)}.json?limit=1&access_token=${MAP_CONFIG.token}`
                const res = await fetch(url)
                if (!res.ok) {
                    const text = await res.text()
                    console.error('Mapbox geocode failed', res.status, text)
                    return
                }
                const data: unknown = await res.json()
                const feature0: unknown =
                    typeof data === 'object' && data !== null && 'features' in data && Array.isArray((data as { features?: unknown }).features)
                        ? (data as { features: unknown[] }).features[0]
                        : undefined

                const center: unknown =
                    typeof feature0 === 'object' && feature0 !== null && 'center' in feature0 ? (feature0 as { center?: unknown }).center : undefined

                if (!ignore && Array.isArray(center) && center.length >= 2) {
                    const lon = typeof center[0] === 'number' ? center[0] : Number(center[0])
                    const lat = typeof center[1] === 'number' ? center[1] : Number(center[1])
                    if (Number.isFinite(lon) && Number.isFinite(lat)) {
                        setCoords({ lon, lat })
                    }
                }
            } catch (err) {
                console.error('Mapbox geocode error', err)
            }
        }
        fetchGeo()
        return () => {
            ignore = true
        }
    }, [cityQuery, hasMarkerGeo, centerMode, cityCenter])

    // Keep best areas refs in sync; clear selection if current area not in new options; update map source
    useEffect(() => {
        bestAreasOptionsRef.current = bestAreasOptions
        bestAreasGeoJsonRef.current = bestAreasGeoJson
        if (selectedBestAreaId && bestAreasOptions.length > 0 && !bestAreasOptions.some((a) => a.id === selectedBestAreaId)) {
            setSelectedBestAreaId('')
        }
        // Update map source
        const map = mapInstanceRef.current
        const source = map?.getSource?.('best-areas')
        if (map && source && source.type === 'geojson') {
            ;(source as mapboxgl.GeoJSONSource).setData((bestAreasGeoJson ?? EMPTY_BEST_AREAS_GEOJSON) as GeoJSON.FeatureCollection)
        }
    }, [bestAreasOptions, bestAreasGeoJson, selectedBestAreaId])

    // When user selects a best area: fly map to that area and highlight it
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map || !map.getLayer('best-areas-highlighted')) return

        const options = bestAreasOptionsRef.current
        if (selectedBestAreaId) {
            const area = options.find((a) => a.id === selectedBestAreaId)
            if (area) {
                const [west, south, east, north] = area.bbox
                map.fitBounds(
                    [
                        [west, south],
                        [east, north]
                    ],
                    { padding: 80, duration: 800, maxZoom: 14 }
                )
                map.setFilter('best-areas-highlighted', ['==', ['get', 'id'], selectedBestAreaId])
            }
        } else {
            map.setFilter('best-areas-highlighted', ['in', ['get', 'id'], ['literal', []]])
        }
    }, [selectedBestAreaId, bestAreasOptions])

    // Track if map has been initialized
    const hasInitializedMapRef = useRef<boolean>(false)
    const initialCenterRef = useRef<{ lon: number; lat: number } | null>(null)

    // Initialize map ONCE only - never destroy on state changes
    useEffect(() => {
        if (!mapRef.current) return
        if (!MAP_CONFIG.token) return
        if (mapInstanceRef.current) return
        if (hasInitializedMapRef.current) return

        // Use mapCenter if available, otherwise use default
        const initialCenter = mapCenter || { lon: 0, lat: 0 }
        initialCenterRef.current = initialCenter

        mapboxgl.accessToken = MAP_CONFIG.token

        const map = new mapboxgl.Map({
            container: mapRef.current,
            style: MAP_CONFIG.style,
            center: [initialCenter.lon, initialCenter.lat],
            zoom: MAP_CONFIG.initialZoom,
            pitch: initialPitchProp ?? MAP_CONFIG.initialPitch,
            bearing: MAP_CONFIG.initialBearing,
            minZoom: minZoomProp ?? MAP_CONFIG.minZoom,
            maxZoom: MAP_CONFIG.maxZoom
        })

        map.on('style.load', () => {
            try {
                map.setConfigProperty('basemap', 'lightPreset', 'standard')
            } catch {
                // ignore: setConfigProperty may not be available for some styles
            }

            // Add route line source + layers (glow + main line, renders below HTML markers)
            try {
                if (!map.getSource(MAP_CONFIG.routeLine.sourceId)) {
                    map.addSource(MAP_CONFIG.routeLine.sourceId, {
                        type: 'geojson',
                        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} }
                    })

                    // Glow / shadow layer (wide, blurred, low-opacity) — rendered first so it sits beneath
                    map.addLayer({
                        id: MAP_CONFIG.routeLine.glowLayerId,
                        type: 'line',
                        source: MAP_CONFIG.routeLine.sourceId,
                        paint: {
                            'line-color': routeLineStyleRef.current?.color || MAP_CONFIG.routeLine.glow.color,
                            'line-width': MAP_CONFIG.routeLine.glow.width,
                            'line-opacity': MAP_CONFIG.routeLine.glow.opacity,
                            'line-blur': MAP_CONFIG.routeLine.glow.blur
                        },
                        layout: {
                            'line-cap': 'round',
                            'line-join': 'round'
                        }
                    })

                    // Main route line (dashed, on top of glow)
                    map.addLayer({
                        id: MAP_CONFIG.routeLine.layerId,
                        type: 'line',
                        source: MAP_CONFIG.routeLine.sourceId,
                        paint: {
                            'line-color': routeLineStyleRef.current?.color || MAP_CONFIG.routeLine.overview.color,
                            'line-width': routeLineStyleRef.current?.width || MAP_CONFIG.routeLine.overview.width,
                            'line-opacity': routeLineStyleRef.current?.opacity || MAP_CONFIG.routeLine.overview.opacity,
                            'line-dasharray': routeLineStyleRef.current?.dashArray || [...MAP_CONFIG.routeLine.overview.dashArray]
                        },
                        layout: {
                            'line-cap': 'round',
                            'line-join': 'round'
                        }
                    })
                }
            } catch {
                // ignore: layer may already exist
            }

            // Run best-areas setup only once (style.load can fire again when we add source)
            if (!(map as any)._genericBestAreasSetup) {
                ;(map as any)._genericBestAreasSetup = true

                if (!map.getSource('best-areas')) {
                    const initialData = bestAreasGeoJsonRef.current ?? EMPTY_BEST_AREAS_GEOJSON
                    map.addSource('best-areas', {
                        type: 'geojson',
                        data: initialData as GeoJSON.FeatureCollection
                    })
                } else {
                    const source = map.getSource('best-areas') as mapboxgl.GeoJSONSource
                    if (source && source.setData) {
                        const data = bestAreasGeoJsonRef.current ?? EMPTY_BEST_AREAS_GEOJSON
                        source.setData(data as GeoJSON.FeatureCollection)
                    }
                }
                if (!map.getLayer('best-areas')) {
                    map.addLayer({
                        id: 'best-areas',
                        type: 'fill',
                        source: 'best-areas',
                        paint: {
                            'fill-outline-color': 'rgba(113, 17, 246, 0.4)',
                            'fill-color': 'rgba(113, 17, 246, 0.12)'
                        },
                        minzoom: 8
                    })
                }
                if (!map.getLayer('best-areas-highlighted')) {
                    map.addLayer({
                        id: 'best-areas-highlighted',
                        type: 'fill',
                        source: 'best-areas',
                        paint: {
                            'fill-outline-color': '#7011F6',
                            'fill-color': '#7011F6',
                            'fill-opacity': 0.35
                        },
                        filter: ['in', ['get', 'id'], ['literal', []]],
                        minzoom: 8
                    })
                }

                // Ensure canvas is behind all other container children so markers stay visible
                const container = map.getContainer()
                if (container) {
                    const canvasContainer = map.getCanvasContainer()
                    if (canvasContainer) (canvasContainer as HTMLElement).style.zIndex = '0'
                    Array.from(container.children).forEach((child) => {
                        if (child !== canvasContainer && child instanceof HTMLElement) {
                            child.style.zIndex = '10'
                        }
                    })
                }

                const tooltipPopup = new mapboxgl.Popup({
                    closeButton: false,
                    closeOnClick: false,
                    offset: 12,
                    className: 'best-area-tooltip'
                })
                const onBestAreasMouseMove = (e: mapboxgl.MapMouseEvent) => {
                    const features = map.queryRenderedFeatures(e.point, {
                        layers: ['best-areas-highlighted', 'best-areas']
                    })
                    map.getCanvas().style.cursor = features.length ? 'pointer' : ''
                    if (!features.length) {
                        map.setFilter('best-areas-highlighted', ['in', ['get', 'id'], ['literal', []]])
                        tooltipPopup.remove()
                        return
                    }
                    const props = features[0].properties as { id?: string }
                    const areaId = props?.id ?? ''
                    const area = bestAreasOptionsRef.current.find((a) => a.id === areaId)
                    if (area) {
                        map.setFilter('best-areas-highlighted', ['==', ['get', 'id'], areaId])
                        tooltipPopup.setLngLat(e.lngLat).setText(`${area.name} area`)
                        if (!tooltipPopup.isOpen()) tooltipPopup.addTo(map)
                    }
                }
                const onBestAreasClick = (e: mapboxgl.MapMouseEvent) => {
                    const features = map.queryRenderedFeatures(e.point, {
                        layers: ['best-areas-highlighted', 'best-areas']
                    })
                    if (!features.length) return
                    const props = features[0].properties as { id?: string }
                    const areaId = props?.id ?? ''
                    if (bestAreasOptionsRef.current.some((a) => a.id === areaId)) {
                        setSelectedBestAreaId(areaId)
                        setBestAreasCollapsed(true)
                        setAreaDetailsExpanded(true)
                        tooltipPopup.remove()
                    }
                }
                map.on('mousemove', onBestAreasMouseMove)
                map.on('click', onBestAreasClick)

                ;(map as any)._genericBestAreasCleanup = () => {
                    map.off('mousemove', onBestAreasMouseMove)
                    map.off('click', onBestAreasClick)
                    tooltipPopup.remove()
                }
            }
        })

        map.on('error', (e) => {
            // eslint-disable-next-line no-console
            console.warn('Mapbox error', e?.error || e)
        })

        mapInstanceRef.current = map
        hasInitializedMapRef.current = true
        const resize = () => map.resize()
        window.addEventListener('resize', resize)

        let resizeObserver: ResizeObserver | null = null
        if (mapRef.current && 'ResizeObserver' in window) {
            resizeObserver = new ResizeObserver(() => {
                map.resize()
            })
            resizeObserver.observe(mapRef.current)
        }

        const id = setTimeout(resize, 150)
        return () => {
            // Cleanup ONLY on component unmount
            clearTimeout(id)
            window.removeEventListener('resize', resize)
            if (resizeObserver) {
                resizeObserver.disconnect()
            }
            if (mapInstanceRef.current) {
                const bestAreasCleanup = (mapInstanceRef.current as any)._genericBestAreasCleanup
                if (typeof bestAreasCleanup === 'function') bestAreasCleanup()
                markersRef.current.forEach((marker) => marker.remove())
                markersRef.current.clear()
                markerElementsRef.current.clear()
                markerImageRef.current.clear()
                if (popupCardRef.current) {
                    popupCardRef.current.remove()
                    popupCardRef.current = null
                }
                popupCardCoordinatesRef.current = null
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
                hasInitializedMapRef.current = false
                initialCenterRef.current = null
            }
        }
    }, []) // Empty dependency array - initialize once only

    // Handle mapCenter changes separately - update center without destroying map
    // Preserve pitch and bearing to keep map angle constant
    // Skip once bounds have been initialized (prevents snapping back after hover flyTo)
    useEffect(() => {
        if (!mapInstanceRef.current || !mapCenter) return
        if (hasInitializedBoundsRef.current) return

        const currentPitch = mapInstanceRef.current.getPitch()
        const currentBearing = mapInstanceRef.current.getBearing()

        mapInstanceRef.current.easeTo({
            center: [mapCenter.lon, mapCenter.lat],
            pitch: currentPitch,
            bearing: currentBearing,
            duration: 0
        })
    }, [mapCenter])

    // Fit bounds to markers - center on centroid (where most markers are) and preserve pitch/bearing
    const fitBoundsToMarkers = useCallback(() => {
        if (!mapInstanceRef.current || !bounds || markers.length === 0) return

        // Preserve current pitch and bearing to keep map angle constant
        const currentPitch = mapInstanceRef.current.getPitch()
        const currentBearing = mapInstanceRef.current.getBearing()

        const paddingFactor = MAP_CONFIG.boundsPaddingFactor
        const lngRange = bounds.maxLng - bounds.minLng
        const latRange = bounds.maxLat - bounds.minLat

        // Ensure minimum range to prevent zooming in too much on single points
        const minLngRange = 0.01
        const minLatRange = 0.01
        const effectiveLngRange = Math.max(lngRange, minLngRange)
        const effectiveLatRange = Math.max(latRange, minLatRange)

        const expandedBounds: [[number, number], [number, number]] = [
            [bounds.minLng - effectiveLngRange * paddingFactor, bounds.minLat - effectiveLatRange * paddingFactor],
            [bounds.maxLng + effectiveLngRange * paddingFactor, bounds.maxLat + effectiveLatRange * paddingFactor]
        ]

        // If we have a centroid (center of all markers), center on it
        // Otherwise use fitBounds which will center automatically
        if (centroid) {
            // Create bounds object
            const tempBounds = new mapboxgl.LngLatBounds(expandedBounds[0], expandedBounds[1])

            // Temporarily fit bounds to calculate the zoom level
            // We'll do this instantly (duration: 0) to get the zoom, then adjust center
            // Fit bounds to get appropriate zoom level
            mapInstanceRef.current.fitBounds(tempBounds, {
                padding: MAP_CONFIG.fitBoundsPadding,
                duration: 0, // Instant to calculate zoom
                maxZoom: MAP_CONFIG.fitBoundsMaxZoom,
                linear: false,
                pitch: currentPitch,
                bearing: currentBearing
            })

            // Get the zoom level that fitBounds calculated
            const targetZoom = mapInstanceRef.current.getZoom()

            // Now center on centroid (where most markers are) with the calculated zoom
            mapInstanceRef.current.easeTo({
                center: [centroid.lng, centroid.lat],
                zoom: targetZoom,
                pitch: currentPitch,
                bearing: currentBearing,
                duration: MAP_CONFIG.animation.fitBoundsDuration
            })
        } else {
            // Fallback to regular fitBounds if no centroid
            mapInstanceRef.current.fitBounds(expandedBounds, {
                padding: MAP_CONFIG.fitBoundsPadding,
                duration: MAP_CONFIG.animation.fitBoundsDuration,
                maxZoom: MAP_CONFIG.fitBoundsMaxZoom,
                linear: false,
                pitch: currentPitch,
                bearing: currentBearing
            })
        }
    }, [bounds, markers.length, centroid])

    // Fit bounds only on initial load or city change
    // Track marker IDs to prevent refitting when switching tabs (markers are stable)
    const hasInitializedBoundsRef = useRef<boolean>(false)
    const lastCityQueryRef = useRef<string>('')
    const lastMarkerIdsRef = useRef<string>('')

    useEffect(() => {
        if (!mapInstanceRef.current) return
        // Caller manages camera manually via `initialBounds` — skip the
        // marker-derived fit so late-arriving marker updates don't override
        // the fixed camera position.
        if (disableMarkerFit) return

        // When there are no markers, reset bounds init so we re-apply center + emptyZoom (e.g. zoomed-out view)
        if (markers.length === 0) {
            hasInitializedBoundsRef.current = false
        }

        // Check if city changed
        const cityChanged = lastCityQueryRef.current !== cityQuery
        if (cityChanged) {
            lastCityQueryRef.current = cityQuery
            hasInitializedBoundsRef.current = false
            lastMarkerIdsRef.current = ''
        }

        // Create stable key from marker IDs to detect actual marker changes (not just array reference)
        const markerIdsKey = markers
            .map((m) => `${m.id}-${m.geo_location?.lat}-${m.geo_location?.long}`)
            .sort()
            .join('|')
        const markersChanged = lastMarkerIdsRef.current !== markerIdsKey

        // Only fit bounds if not yet initialized, city changed, or markers actually changed
        // This prevents refitting when switching tabs (markers are stable, so no refit needed)
        if (hasInitializedBoundsRef.current && !cityChanged && !markersChanged) {
            // Bounds recalculated but markers are the same - don't refit
            return
        }

        if (markersChanged && markerIdsKey) {
            lastMarkerIdsRef.current = markerIdsKey
        }

        // In city-center mode: center on the densest cluster of markers
        // Falls back to cityCenter only when no markers exist
        if (centerMode === 'city' && (!hasInitializedBoundsRef.current || cityChanged || markersChanged)) {
            if (markers.length > 0 && bounds) {
                fitBoundsToMarkers()
            } else if (cityCenter) {
                const currentPitch = mapInstanceRef.current.getPitch()
                const currentBearing = mapInstanceRef.current.getBearing()
                const zoomWhenCityCentered = emptyZoomProp ?? 12
                mapInstanceRef.current.easeTo({
                    center: [cityCenter.lon, cityCenter.lat],
                    zoom: zoomWhenCityCentered,
                    pitch: currentPitch,
                    bearing: currentBearing,
                    duration: 400
                })
            }
            hasInitializedBoundsRef.current = true
            return
        }

        // If we have bounds from markers, fit to bounds (only on first load or actual marker changes)
        if (bounds && markers.length > 0 && (!hasInitializedBoundsRef.current || markersChanged)) {
            // Small delay to ensure markers are rendered
            setTimeout(() => {
                if (mapInstanceRef.current && bounds && markers.length > 0) {
                    fitBoundsToMarkers()
                    hasInitializedBoundsRef.current = true
                }
            }, 500)
        }
        // Otherwise use center - preserve pitch and bearing (e.g. no markers: use emptyZoom for zoomed-out view)
        else if (mapCenter && !hasInitializedBoundsRef.current && hasInitializedMapRef.current) {
            const currentPitch = mapInstanceRef.current.getPitch()
            const currentBearing = mapInstanceRef.current.getBearing()
            const zoomWhenEmpty = emptyZoomProp ?? 12
            mapInstanceRef.current.easeTo({
                center: [mapCenter.lon, mapCenter.lat],
                zoom: zoomWhenEmpty,
                pitch: currentPitch,
                bearing: currentBearing,
                duration: markers.length === 0 ? 400 : 0
            })
            hasInitializedBoundsRef.current = true
        }
    }, [bounds, markers, mapCenter, cityQuery, fitBoundsToMarkers, emptyZoomProp, markers.length, disableMarkerFit])

    // Fly to itinerary day markers when selectedItineraryDay changes
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map || selectedItineraryDay === null || itineraryMarkers.length === 0) return

        // Compute centroid of itinerary markers for the selected day
        let sumLat = 0, sumLng = 0, count = 0
        for (const m of itineraryMarkers) {
            if (m.geo_location?.lat != null && m.geo_location?.long != null) {
                sumLat += Number(m.geo_location.lat)
                sumLng += Number(m.geo_location.long)
                count++
            }
        }
        if (count === 0) return

        map.flyTo({
            center: [sumLng / count, sumLat / count],
            zoom: map.getZoom(),
            duration: MAP_CONFIG.animation.flyToDuration,
            padding: MAP_CONFIG.animation.flyToPadding
        })
    }, [selectedItineraryDay, itineraryMarkers])

    // Dynamically update minZoom when prop changes (avoids needing to re-init the whole map)
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return
        map.setMinZoom(minZoomProp ?? MAP_CONFIG.minZoom)
    }, [minZoomProp])

    // Update route line data when routeCoordinates change
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return

        const updateRouteData = () => {
            try {
                const source = map.getSource(MAP_CONFIG.routeLine.sourceId) as mapboxgl.GeoJSONSource | undefined
                if (source) {
                    const coords = routeCoordinates && routeCoordinates.length >= 2 ? routeCoordinates : []
                    source.setData({
                        type: 'Feature',
                        geometry: { type: 'LineString', coordinates: coords },
                        properties: {}
                    })

                    // Update paint properties if style overrides provided
                    if (routeLineStyle && map.getLayer(MAP_CONFIG.routeLine.layerId)) {
                        map.setPaintProperty(MAP_CONFIG.routeLine.layerId, 'line-color', routeLineStyle.color || MAP_CONFIG.routeLine.overview.color)
                        map.setPaintProperty(MAP_CONFIG.routeLine.layerId, 'line-width', routeLineStyle.width || MAP_CONFIG.routeLine.overview.width)
                        map.setPaintProperty(MAP_CONFIG.routeLine.layerId, 'line-opacity', routeLineStyle.opacity || MAP_CONFIG.routeLine.overview.opacity)
                        map.setPaintProperty(MAP_CONFIG.routeLine.layerId, 'line-dasharray', routeLineStyle.dashArray || [...MAP_CONFIG.routeLine.overview.dashArray])
                    }
                    // Keep glow layer colour in sync with main line
                    if (map.getLayer(MAP_CONFIG.routeLine.glowLayerId)) {
                        map.setPaintProperty(MAP_CONFIG.routeLine.glowLayerId, 'line-color', routeLineStyle?.color || MAP_CONFIG.routeLine.glow.color)
                    }
                }
            } catch {
                // Source may not be ready yet
            }
        }

        if (map.isStyleLoaded()) {
            updateRouteData()
        } else {
            map.once('style.load', updateRouteData)
        }
    }, [routeCoordinates, routeLineStyle])

    // Update markers
    useEffect(() => {
        if (!mapInstanceRef.current) return

        // Listen for external focus requests
        const onFocus = (e: Event) => {
            const ce = e as CustomEvent<{ id: string | number }>
            const markerId = ce.detail?.id
            if (markerId == null) return
            const el = markerElementsRef.current.get(String(markerId))
            if (el) {
                el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
            }
        }
        window.addEventListener(FOCUS_EVENT_NAME, onFocus as EventListener)

        // Protect against transient empty markers (loading state)
        // But allow clearing when user has intentionally deselected all marker type filters
        const allFiltersOff = showMarkerTypeFilters && markers.length > 0 && activeMarkerTypes.size === 0
        if (filteredMarkers.length === 0 && markersRef.current.size > 0 && markers.length > 0 && !allFiltersOff) {
            // Do nothing - probably loading state, keep existing markers
            return
        }

        const currentMarkerIds = new Set(filteredMarkers.map((marker) => String(marker.id)))
        const existingMarkerIds = new Set(markersRef.current.keys())

        // Helper to update popup position
        const updatePopupPosition = () => {
            if (!mapInstanceRef.current || !mapRef.current || !popupCardRef.current || !popupCardCoordinatesRef.current) return

            const { lat, lng } = popupCardCoordinatesRef.current
            const point = mapInstanceRef.current.project([lng, lat])
            const mapRect = mapRef.current.getBoundingClientRect()

            const popupWidth = MAP_CONFIG.popup.width.replace('px', '')
            const popupHeight = 200 // Approximate height
            const markerOffsetY = MAP_CONFIG.popup.markerOffsetY

            const left = point.x - Number(popupWidth) / 2
            const top = point.y - popupHeight - markerOffsetY

            const boundedLeft = Math.max(10, Math.min(left, mapRect.width - Number(popupWidth) - 10))
            const boundedTop = Math.max(10, Math.min(top, mapRect.height - popupHeight - 10))

            if (popupCardRef.current) {
                popupCardRef.current.style.left = `${boundedLeft}px`
                popupCardRef.current.style.top = `${boundedTop}px`
            }
        }

        const updatePopupOnMapMove = () => {
            updatePopupPosition()
        }

        if (mapInstanceRef.current) {
            mapInstanceRef.current.on('move', updatePopupOnMapMove)
            mapInstanceRef.current.on('zoom', updatePopupOnMapMove)
        }

        // Remove markers that are no longer in list
        existingMarkerIds.forEach((id) => {
            if (!currentMarkerIds.has(String(id))) {
                const marker = markersRef.current.get(id)
                if (marker) {
                    marker.remove()
                    markersRef.current.delete(id)
                    markerElementsRef.current.delete(id)
                    markerImageRef.current.delete(id)
                    if (popupCardCoordinatesRef.current?.markerId === id) {
                        if (popupCardRef.current) {
                            popupCardRef.current.remove()
                            popupCardRef.current = null
                        }
                        popupCardCoordinatesRef.current = null
                    }
                }
            }
        })

        // Add or update markers
        filteredMarkers.forEach((marker) => {
            if (!marker.geo_location?.lat || !marker.geo_location?.long) return

            // Parse coordinates
            let lat = typeof marker.geo_location.lat === 'string' ? parseFloat(marker.geo_location.lat) : marker.geo_location.lat
            let lng = typeof marker.geo_location.long === 'string' ? parseFloat(marker.geo_location.long) : marker.geo_location.long

            if (isNaN(lat) || isNaN(lng)) return

            // Swap if coordinates are out of valid ranges
            const shouldSwap = Math.abs(lat) > MAP_CONFIG.coordinate.maxValidLat || Math.abs(lng) > MAP_CONFIG.coordinate.maxValidLng

            if (shouldSwap) {
                ;[lat, lng] = [lng, lat]
            }

            // Clamp to valid ranges
            const finalLat = Math.max(MAP_CONFIG.coordinate.minLat, Math.min(MAP_CONFIG.coordinate.maxLat, lat))
            const finalLng = Math.max(MAP_CONFIG.coordinate.minLng, Math.min(MAP_CONFIG.coordinate.maxLng, lng))

            const markerKey = String(marker.id)
            const markerImageUrl = marker.image || marker.images?.[0] || ''
            let existingMarker = markersRef.current.get(markerKey)
            let existingElement = markerElementsRef.current.get(markerKey)

            // Image changed since this pin was drawn (e.g. async thumbnail
            // arrived after the letter-fallback was rendered) → drop the old
            // marker so it gets rebuilt below with the new image.
            if (existingMarker && markerImageRef.current.get(markerKey) !== markerImageUrl) {
                existingMarker.remove()
                markersRef.current.delete(markerKey)
                markerElementsRef.current.delete(markerKey)
                markerImageRef.current.delete(markerKey)
                existingMarker = undefined
                existingElement = undefined
            }

            // Get marker config based on type
            const markerConfig = (marker.type === 'experience' || marker.type === 'restaurant' || marker.type === 'city') ? MAP_CONFIG.marker.experience : MAP_CONFIG.marker.accommodation

            // Badge SVG icons per type
            const BADGE_ICONS: Record<string, { svg: string; bg: string }> = {
                restaurant: {
                    bg: '#ef4444',
                    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`
                },
                experience: {
                    bg: '#7011F6',
                    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M12 2v4"/><path d="m6.8 15-3.5 2"/><path d="m20.7 7-3.5 2"/><path d="M6.8 9 3.3 7"/><path d="m20.7 17-3.5-2"/><path d="m9 22 3-8 3 8"/><circle cx="12" cy="12" r="10"/></svg>`
                },
                accommodation: {
                    bg: '#2563eb',
                    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`
                },
                explore_accommodation: {
                    bg: '#2563eb',
                    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`
                },
                city: {
                    bg: '#7011F6',
                    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`
                }
            }

            const PIN_SIZE = 56 // 48px + ~15%
            const BORDER_COLOR = markerConfig.defaultBorderColor // #747474
            const BORDER_RADIUS = '10px'

            // If marker exists, just update position (hover styling handled by separate effect)
            if (existingMarker && existingElement) {
                existingMarker.setLngLat([finalLng, finalLat])
                return
            }

            // Create new marker — all types use square pin with arrow
            const isHovered = hoveredMarkerIdRef.current != null && String(hoveredMarkerIdRef.current) === markerKey
            const imageUrl = markerImageUrl

            const el = document.createElement('div')
            el.className = `map-marker map-marker-${marker.type}`

            // Wrapper: pin + arrow, offset so arrow tip is at coordinates
            el.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                cursor: pointer;
                transform: translateY(-${PIN_SIZE + 8}px);
                z-index: ${isHovered ? markerConfig.zIndex.hovered : markerConfig.zIndex.default};
            `

            // Square pin
            const pin = document.createElement('div')
            pin.style.cssText = `
                height: ${PIN_SIZE}px;
                width: ${PIN_SIZE}px;
                background-color: white;
                border: 2.5px solid ${isHovered ? markerConfig.hoverBorderColor : BORDER_COLOR};
                border-radius: ${BORDER_RADIUS};
                box-shadow: ${isHovered ? '0 4px 12px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.25)'};
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2px;
                box-sizing: border-box;
                position: relative;
                transition: border-color 0.2s, box-shadow 0.2s;
            `

            const buildLetterFallback = () => {
                const fallback = document.createElement('span')
                fallback.textContent = marker.name.charAt(0).toUpperCase()
                fallback.style.cssText = `
                    font-size: 18px;
                    font-weight: 700;
                    font-family: 'Red Hat Display', sans-serif;
                    color: ${BADGE_ICONS[marker.type]?.bg || '#747474'};
                `
                return fallback
            }

            if (imageUrl) {
                const imgWrapper = document.createElement('div')
                imgWrapper.style.cssText = `
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    border-radius: 6px;
                `
                const img = document.createElement('img')
                img.src = imageUrl
                img.alt = marker.name
                img.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                `
                // Broken URL → swap to first-letter fallback so pin never
                // shows a broken-image glyph.
                img.onerror = () => {
                    if (imgWrapper.parentNode === pin) {
                        pin.replaceChild(buildLetterFallback(), imgWrapper)
                    }
                }
                imgWrapper.appendChild(img)
                pin.appendChild(imgWrapper)
            } else {
                pin.appendChild(buildLetterFallback())
            }

            // Badge icon (bottom-right)
            const badgeInfo = BADGE_ICONS[marker.type]
            if (badgeInfo) {
                const badge = document.createElement('div')
                badge.style.cssText = `
                    position: absolute;
                    bottom: 0px;
                    right: 0px;
                    width: 22px;
                    height: 22px;
                    background-color: ${badgeInfo.bg};
                    border-radius: ${BORDER_RADIUS};
                    border: 2px solid white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                `
                badge.innerHTML = badgeInfo.svg
                pin.appendChild(badge)
            }

            // Sequence number badge (top-left) — shows 1, 2, 3…
            if (marker.sequenceNumber != null) {
                const seqBadge = document.createElement('div')
                seqBadge.style.cssText = `
                    position: absolute;
                    top: -6px;
                    left: -6px;
                    min-width: 20px;
                    height: 20px;
                    padding: 0 4px;
                    background-color: #7011F6;
                    border-radius: 10px;
                    border: 2px solid white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 700;
                    color: white;
                    font-family: 'Red Hat Display', sans-serif;
                    z-index: 2;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.25);
                    line-height: 1;
                    box-sizing: border-box;
                `
                seqBadge.textContent = String(marker.sequenceNumber)
                pin.appendChild(seqBadge)
            }

            // Verification badge (top-right):
            // - Verified only: green circle with checkmark
            // - B2B only: purple circle with zap
            // - Both: green circle with checkmark (verified) + small purple tick dot overlapping top-right
            if ((marker.type === 'accommodation' || marker.type === 'explore_accommodation') && (marker.is_verified || marker.is_b2b_deal_available)) {
                const checkSvg = '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                const zapSvg = '<svg width="7" height="7" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'
                const primaryBadge = document.createElement('div')
                const bgColor = marker.is_verified ? '#10b981' : '#7c3aed'
                const shadowColor = marker.is_verified ? 'rgba(16,185,129,0.35)' : 'rgba(124,58,237,0.35)'
                primaryBadge.style.cssText = `
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    width: 18px;
                    height: 18px;
                    background-color: ${bgColor};
                    border-radius: 50%;
                    border: 2px solid white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 3;
                    box-shadow: 0 2px 4px ${shadowColor};
                `
                primaryBadge.innerHTML = marker.is_verified ? checkSvg : zapSvg
                pin.appendChild(primaryBadge)
                // If both: add small purple dot on top-right of the green badge
                if (marker.is_verified && marker.is_b2b_deal_available) {
                    const b2bDot = document.createElement('div')
                    b2bDot.style.cssText = `
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        width: 10px;
                        height: 10px;
                        background-color: #7c3aed;
                        border-radius: 50%;
                        border: 1.5px solid white;
                        z-index: 4;
                        box-shadow: 0 1px 2px rgba(124,58,237,0.4);
                    `
                    pin.appendChild(b2bDot)
                }
            }

            // Arrow pointing down
            const arrow = document.createElement('div')
            arrow.style.cssText = `
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 8px solid ${isHovered ? markerConfig.hoverBorderColor : BORDER_COLOR};
                margin-top: -1px;
                transition: border-top-color 0.2s;
            `

            el.appendChild(pin)
            el.appendChild(arrow)

            // Subtle text below marker
            // City markers: show "Day 1-3" label; Day markers: show experience name
            const subtitleLine1 = marker.sequenceLabel || marker.name || ''
            const subtitleLine2 = marker.sequenceLabel ? marker.name : '' // city name on 2nd line for city markers

            if (subtitleLine1) {
                const subtitleWrap = document.createElement('div')
                subtitleWrap.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-top: 1px;
                    pointer-events: none;
                `

                const isRestaurantMarker = marker.type === 'restaurant'
                const line1 = document.createElement('div')
                line1.style.cssText = `
                    font-size: 10px;
                    font-weight: 600;
                    color: #374151;
                    text-align: center;
                    white-space: nowrap;
                    ${isRestaurantMarker ? '' : 'max-width: 90px;'}
                    overflow: hidden;
                    text-overflow: ellipsis;
                    font-family: 'Red Hat Display', sans-serif;
                    text-shadow: 0 0 4px white, 0 0 4px white, 0 0 4px white;
                    line-height: 1.3;
                `
                line1.textContent = subtitleLine1

                const isVerifiedMarker = (marker.type === 'accommodation' || marker.type === 'explore_accommodation') && marker.is_verified
                const isAirbnbMarker = (marker.type === 'accommodation' || marker.type === 'explore_accommodation') && shouldShowAirbnb(isRimigoInternal, !!marker.is_available_on_airbnb)
                if (isVerifiedMarker || isAirbnbMarker) {
                    const nameWithBadge = document.createElement('div')
                    nameWithBadge.style.cssText = 'display:flex;align-items:center;gap:2px;justify-content:center;'
                    nameWithBadge.appendChild(line1)
                    if (isVerifiedMarker) {
                        const badgeImg = document.createElement('img')
                        badgeImg.src = 'https://media.rimigo.com/1776327515732_verified_badge.svg'
                        badgeImg.alt = 'Verified'
                        badgeImg.style.cssText = 'width:10px;height:10px;flex-shrink:0;'
                        nameWithBadge.appendChild(badgeImg)
                    }
                    if (isAirbnbMarker) {
                        const airbnbImg = document.createElement('img')
                        airbnbImg.src = 'https://cdn.brandfetch.io/idkuvXnjOH/theme/dark/symbol.svg'
                        airbnbImg.alt = 'Airbnb'
                        airbnbImg.style.cssText = 'width:8px;height:8px;flex-shrink:0;'
                        nameWithBadge.appendChild(airbnbImg)
                    }
                    subtitleWrap.appendChild(nameWithBadge)
                } else {
                    subtitleWrap.appendChild(line1)
                }

                if (subtitleLine2) {
                    const line2 = document.createElement('div')
                    line2.style.cssText = `
                        font-size: 9px;
                        font-weight: 500;
                        color: #6B7280;
                        text-align: center;
                        white-space: nowrap;
                        max-width: 90px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        font-family: 'Red Hat Display', sans-serif;
                        text-shadow: 0 0 4px white, 0 0 4px white, 0 0 4px white;
                        line-height: 1.3;
                    `
                    line2.textContent = subtitleLine2
                    subtitleWrap.appendChild(line2)
                }

                el.appendChild(subtitleWrap)
            }

            // Show popup card with type-specific UI
            const showPopupCard = (markerData: MapMarker, lat: number, lng: number) => {
                if (!mapRef.current || !mapInstanceRef.current) return

                if (popupCardRef.current) {
                    popupCardRef.current.remove()
                    popupCardRef.current = null
                }

                const imageUrl = markerData.image || markerData.images?.[0] || ''
                const isStayMarker = markerData.type === 'accommodation' || markerData.type === 'explore_accommodation'

                // Create popup container
                const popupCard = document.createElement('div')
                popupCard.className = 'map-popup-card'
                popupCard.style.cssText = `
                    position: absolute;
                    width: ${MAP_CONFIG.popup.width};
                    background: white;
                    border-radius: ${MAP_CONFIG.popup.borderRadius};
                    box-shadow: ${MAP_CONFIG.popup.boxShadow};
                    overflow: hidden;
                    z-index: ${MAP_CONFIG.popup.zIndex};
                    pointer-events: auto;
                    font-family: 'Red Hat Display', sans-serif;
                `

                // Image section
                const imageSection = document.createElement('div')
                imageSection.style.cssText = `
                    position: relative;
                    width: 100%;
                    height: ${MAP_CONFIG.popup.imageHeight};
                    overflow: hidden;
                    background: #f5f5f5;
                `

                // Stay markers get the full StaysMap-style carousel (up to 5
                // images, dots, hover/mobile arrows) — richer than the single-
                // image treatment used for experiences/restaurants/cities.
                const allImages = (markerData.images && markerData.images.length > 0
                    ? markerData.images
                    : imageUrl ? [imageUrl] : []).slice(0, 5)
                if (isStayMarker && allImages.length > 1) {
                    const popupWidthPx = parseInt(String(MAP_CONFIG.popup.width).replace(/px$/, ''), 10) || 240
                    let imgIdx = 0
                    const track = document.createElement('div')
                    track.style.cssText = 'display:flex;height:100%;transition:transform 0.3s ease;'
                    allImages.forEach((url, i) => {
                        const img = document.createElement('img')
                        img.src = url
                        img.alt = `${markerData.name} ${i + 1}`
                        img.style.cssText = `width:${popupWidthPx}px;height:100%;object-fit:cover;flex-shrink:0;`
                        img.loading = i === 0 ? 'eager' : 'lazy'
                        img.onerror = () => { img.style.display = 'none' }
                        track.appendChild(img)
                    })
                    imageSection.appendChild(track)

                    const dotsRow = document.createElement('div')
                    dotsRow.style.cssText = 'position:absolute;bottom:6px;left:50%;transform:translateX(-50%);display:flex;gap:3px;z-index:2;'
                    const dots: HTMLElement[] = []
                    allImages.forEach((_, i) => {
                        const dot = document.createElement('span')
                        dot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${i === 0 ? 'white' : 'rgba(255,255,255,0.5)'};transition:background 0.2s;`
                        dots.push(dot)
                        dotsRow.appendChild(dot)
                    })
                    imageSection.appendChild(dotsRow)

                    const updateCarousel = () => {
                        track.style.transform = `translateX(-${imgIdx * popupWidthPx}px)`
                        dots.forEach((d, i) => { d.style.background = i === imgIdx ? 'white' : 'rgba(255,255,255,0.5)' })
                    }

                    const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
                    const initialOpacity = isMobileViewport ? '1' : '0'
                    const arrStyle = `position:absolute;top:50%;transform:translateY(-50%);width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.85);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:${initialOpacity};transition:opacity 0.2s;z-index:3;`
                    const leftArr = document.createElement('button')
                    leftArr.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>'
                    leftArr.style.cssText = arrStyle + 'left:6px;'
                    leftArr.onclick = (e) => { e.stopPropagation(); if (imgIdx > 0) { imgIdx--; updateCarousel() } }
                    const rightArr = document.createElement('button')
                    rightArr.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>'
                    rightArr.style.cssText = arrStyle + 'right:6px;'
                    rightArr.onclick = (e) => { e.stopPropagation(); if (imgIdx < allImages.length - 1) { imgIdx++; updateCarousel() } }
                    imageSection.appendChild(leftArr)
                    imageSection.appendChild(rightArr)
                    if (!isMobileViewport) {
                        imageSection.onmouseenter = () => { leftArr.style.opacity = '1'; rightArr.style.opacity = '1' }
                        imageSection.onmouseleave = () => { leftArr.style.opacity = '0'; rightArr.style.opacity = '0' }
                    }
                } else if (imageUrl) {
                    const buildRestaurantIconFallback = () => {
                        const iconWrap = document.createElement('div')
                        iconWrap.style.cssText =
                            'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #fef2f2, #fee2e2);'
                        iconWrap.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`
                        return iconWrap
                    }
                    const img = document.createElement('img')
                    img.src = imageUrl
                    img.alt = markerData.name
                    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;'
                    img.onerror = () => {
                        if (markerData.type === 'restaurant' && img.parentNode === imageSection) {
                            imageSection.replaceChild(buildRestaurantIconFallback(), img)
                        } else if (img.parentNode === imageSection) {
                            imageSection.removeChild(img)
                        }
                    }
                    imageSection.appendChild(img)
                } else if (markerData.type === 'restaurant') {
                    const iconWrap = document.createElement('div')
                    iconWrap.style.cssText =
                        'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #fef2f2, #fee2e2);'
                    iconWrap.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`
                    imageSection.appendChild(iconWrap)
                }

                // Stay markers: heart button top-left (add-to-tripboard).
                // Fills purple when the caller marks the marker as already
                // shortlisted via `getMarkerIsShortlisted`. Matches the
                // StaysMap popup behaviour 1:1.
                if (isStayMarker && onMarkerAddToCollection) {
                    const isShortlisted = getMarkerIsShortlisted?.(markerData) ?? false
                    const heartBtn = document.createElement('button')
                    const fill = isShortlisted ? '#7011F6' : 'none'
                    const stroke = isShortlisted ? '#7011F6' : 'white'
                    heartBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
                    heartBtn.title = 'Add to tripboard'
                    heartBtn.style.cssText = `position:absolute;top:8px;left:8px;width:28px;height:28px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.8);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;padding:0;z-index:2;background:${isShortlisted ? 'white' : 'rgba(0,0,0,0.45)'};`
                    heartBtn.onmouseover = () => { if (!isShortlisted) heartBtn.style.background = 'rgba(0,0,0,0.7)' }
                    heartBtn.onmouseout = () => { if (!isShortlisted) heartBtn.style.background = 'rgba(0,0,0,0.45)' }
                    heartBtn.onclick = (e) => { e.stopPropagation(); onMarkerAddToCollection(markerData) }
                    imageSection.appendChild(heartBtn)
                } else if ((markerData.type === 'accommodation' || markerData.type === 'explore_accommodation') && markerData.overall_rating && !onMarkerAddToCollection) {
                    // Fallback: if no add-to-collection callback is wired, keep
                    // the original overall_rating badge top-left so the popup
                    // still shows *something* useful at that corner.
                    const ratingBadge = document.createElement('div')
                    ratingBadge.style.cssText = `
                        position: absolute; top: 8px; left: 8px;
                        padding: 2px 8px; border-radius: 6px;
                        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
                        color: white; font-size: 12px; font-weight: 700;
                        display: flex; align-items: center; gap: 3px;
                    `
                    ratingBadge.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${markerData.overall_rating.toFixed(1)}`
                    imageSection.appendChild(ratingBadge)
                }

                // Close button
                const closeBtn = document.createElement('button')
                closeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M13 1L1 13M1 1L13 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
                closeBtn.style.cssText = `
                    position: absolute;
                    top: ${MAP_CONFIG.popup.closeButtonTop};
                    right: ${MAP_CONFIG.popup.closeButtonRight};
                    width: ${MAP_CONFIG.popup.closeButtonSize};
                    height: ${MAP_CONFIG.popup.closeButtonSize};
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.5);
                    border: none; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: background 0.2s;
                `
                closeBtn.onmouseover = () => {
                    closeBtn.style.background = 'rgba(0, 0, 0, 0.7)'
                }
                closeBtn.onmouseout = () => {
                    closeBtn.style.background = 'rgba(0, 0, 0, 0.5)'
                }
                closeBtn.onclick = (e) => {
                    e.stopPropagation()
                    hidePopupCard()
                }
                imageSection.appendChild(closeBtn)

                // Content section
                const contentSection = document.createElement('div')
                contentSection.style.cssText = `padding: ${MAP_CONFIG.popup.padding};`

                // Name (common)
                const nameEl = document.createElement('h3')
                nameEl.textContent = markerData.name
                nameEl.style.cssText = `
                    margin: 0; font-size: ${MAP_CONFIG.popup.nameFontSize}; font-weight: ${MAP_CONFIG.popup.nameFontWeight};
                    color: #101010; font-family: 'Red Hat Display', sans-serif; line-height: 1.3;
                    overflow: hidden; text-overflow: ellipsis;
                    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
                `
                const isVerifiedPopup = (markerData.type === 'accommodation' || markerData.type === 'explore_accommodation') && markerData.is_verified === true
                if (isVerifiedPopup) {
                    const nameWrap = document.createElement('div')
                    nameWrap.style.cssText = 'display:flex;align-items:flex-start;gap:4px;margin-bottom:2px;'
                    nameWrap.appendChild(nameEl)
                    const badgeImg = document.createElement('img')
                    badgeImg.src = 'https://media.rimigo.com/1776327515732_verified_badge.svg'
                    badgeImg.alt = 'Verified'
                    badgeImg.style.cssText = 'width:14px;height:14px;flex-shrink:0;margin-top:2px;'
                    nameWrap.appendChild(badgeImg)
                    contentSection.appendChild(nameWrap)
                } else {
                    contentSection.appendChild(nameEl)
                }

                // City marker: show lat/long used for the marker below the name
                if (markerData.type === 'city' && Number.isFinite(lat) && Number.isFinite(lng)) {
                    const coordsEl = document.createElement('div')
                    coordsEl.style.cssText = 'margin-top: 4px; font-size: 11px; color: #6b7280; font-weight: 500; font-family: Manrope, sans-serif;'
                    coordsEl.textContent = `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`
                    contentSection.appendChild(coordsEl)
                }

                // Airbnb availability (accommodation only)
                if ((markerData.type === 'accommodation' || markerData.type === 'explore_accommodation') && shouldShowAirbnb(isRimigoInternal, !!markerData.is_available_on_airbnb)) {
                    const airbnbRow = document.createElement('div')
                    airbnbRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:4px;'
                    airbnbRow.innerHTML = `<span style="font-size:11px;font-weight:500;color:#6b7280;font-family:Manrope,sans-serif;">Available on</span><img src="https://cdn.brandfetch.io/idkuvXnjOH/theme/dark/symbol.svg" alt="Airbnb" style="width:10px;height:10px;flex-shrink:0;" /><span style="font-size:11px;font-weight:700;color:#FF385C;font-family:'Red Hat Display',sans-serif;letter-spacing:0.02em;">AIRBNB</span>`
                    contentSection.appendChild(airbnbRow)
                }

                // --- Type-specific content ---
                if (markerData.type === 'accommodation' || markerData.type === 'explore_accommodation') {
                    // Ratings row: ★ star rating + platform-review pill
                    // (e.g. "4.5"). Same arrangement as StaysMap's popup so
                    // stays look identical whichever map renders them.
                    const starRaw = markerData.star_rating
                    const starNum = typeof starRaw === 'number' ? starRaw : (starRaw ? parseFloat(String(starRaw)) : NaN)
                    const hasStars = Number.isFinite(starNum) && starNum > 0
                    const hasReviewScore = typeof markerData.overall_rating === 'number' && markerData.overall_rating > 0
                    if (hasStars || hasReviewScore) {
                        const ratingsRow = document.createElement('div')
                        ratingsRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:6px;'
                        if (hasStars) {
                            const stars = document.createElement('span')
                            stars.textContent = '★'.repeat(Math.min(5, Math.round(starNum)))
                            stars.style.cssText = 'font-size:12px;color:#f59e0b;'
                            ratingsRow.appendChild(stars)
                        }
                        if (hasReviewScore) {
                            const badge = document.createElement('span')
                            badge.textContent = (markerData.overall_rating as number).toFixed(1)
                            badge.style.cssText = 'font-size:11px;font-weight:600;color:#059669;background:#ecfdf5;padding:2px 6px;border-radius:4px;'
                            ratingsRow.appendChild(badge)
                        }
                        contentSection.appendChild(ratingsRow)
                    }

                    // Price per night
                    if (markerData.rate_per_night) {
                        const priceEl = document.createElement('div')
                        priceEl.style.cssText = 'margin-top: 6px; display: flex; align-items: baseline; gap: 4px;'
                        priceEl.innerHTML = `<span style="font-size: 16px; font-weight: 700; color: #101010;">₹ ${Math.round(markerData.rate_per_night).toLocaleString()}</span><span style="font-size: 11px; color: #6b7280; font-weight: 500;">/night</span>`
                        contentSection.appendChild(priceEl)
                    }
                    // View deal button
                    const btnRow = document.createElement('div')
                    btnRow.style.cssText = 'margin-top: 8px;'
                    const viewBtn = document.createElement('button')
                    viewBtn.textContent = 'View deal'
                    viewBtn.style.cssText = `width: 100%; padding: 8px 16px; background: linear-gradient(90deg, #7011F6 0%, #4D1D91 100%); color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 645; font-family: 'Red Hat Display', sans-serif; cursor: pointer; transition: opacity 0.2s;`
                    viewBtn.onmouseover = () => {
                        viewBtn.style.opacity = '0.9'
                    }
                    viewBtn.onmouseout = () => {
                        viewBtn.style.opacity = '1'
                    }
                    viewBtn.onclick = (e) => {
                        e.stopPropagation()
                        trackButtonClickCustom({
                            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                            buttonName: 'map_popup_action',
                            buttonAction: 'click',
                            extra: { action: 'view_deal', entity_id: markerData.id, entity_type: markerData.type }
                        })
                        onPopupButtonClick?.('view_deal', markerData)
                        onMarkerClick?.(markerData.id, { name: markerData.name })
                    }
                    btnRow.appendChild(viewBtn)
                    contentSection.appendChild(btnRow)
                } else if (markerData.type === 'experience') {
                    // Price range
                    if (markerData.price?.lower_bound) {
                        const currency = markerData.price.currency || '₹'
                        const priceEl = document.createElement('div')
                        priceEl.style.cssText = 'margin-top: 6px; display: flex; align-items: baseline; gap: 4px;'
                        let html = `<span style="font-size: 16px; font-weight: 700; color: #101010;">${currency} ${Math.round(markerData.price.lower_bound).toLocaleString()}</span>`
                        if (markerData.price.upper_bound && markerData.price.upper_bound !== markerData.price.lower_bound) {
                            html += `<span style="font-size: 11px; color: #6b7280; font-weight: 500;">– ${currency} ${Math.round(markerData.price.upper_bound).toLocaleString()}</span>`
                        }
                        priceEl.innerHTML = html
                        contentSection.appendChild(priceEl)
                    }
                    // View Details button
                    const btnRow = document.createElement('div')
                    btnRow.style.cssText = 'margin-top: 8px;'
                    const viewBtn = document.createElement('button')
                    viewBtn.textContent = 'View Details'
                    viewBtn.style.cssText = `width: 100%; padding: 8px 16px; background: linear-gradient(90deg, #7011F6 0%, #4D1D91 100%); color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 645; font-family: 'Red Hat Display', sans-serif; cursor: pointer; transition: opacity 0.2s;`
                    viewBtn.onmouseover = () => {
                        viewBtn.style.opacity = '0.9'
                    }
                    viewBtn.onmouseout = () => {
                        viewBtn.style.opacity = '1'
                    }
                    viewBtn.onclick = (e) => {
                        e.stopPropagation()
                        trackButtonClickCustom({
                            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                            buttonName: 'map_popup_action',
                            buttonAction: 'click',
                            extra: { action: 'view_details', entity_id: markerData.id, entity_type: markerData.type }
                        })
                        onPopupButtonClick?.('view_details', markerData)
                        onMarkerClick?.(markerData.id, { name: markerData.name })
                    }
                    btnRow.appendChild(viewBtn)
                    contentSection.appendChild(btnRow)
                } else if (markerData.type === 'restaurant') {
                    // Address
                    const address = markerData.onClickData?.address as string | undefined
                    if (address) {
                        const addressEl = document.createElement('div')
                        addressEl.style.cssText = 'margin-top: 4px; display: flex; align-items: flex-start; gap: 4px;'
                        addressEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px; flex-shrink: 0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span style="font-size: 11px; color: #6b7280; font-weight: 500; font-family: 'Manrope', sans-serif; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${address}</span>`
                        contentSection.appendChild(addressEl)
                    }
                    // Buttons row: Directions + Instagram
                    const btnRow = document.createElement('div')
                    btnRow.style.cssText = 'margin-top: 8px; display: flex; gap: 6px;'
                    const mapsUrl = markerData.onClickData?.maps_url as string | undefined
                    if (mapsUrl) {
                        const dirBtn = document.createElement('a')
                        dirBtn.href = mapsUrl
                        dirBtn.target = '_blank'
                        dirBtn.rel = 'noopener noreferrer'
                        dirBtn.style.cssText = `flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 645; font-family: 'Red Hat Display', sans-serif; cursor: pointer; transition: opacity 0.2s; text-decoration: none;`
                        dirBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> Directions`
                        dirBtn.onmouseover = () => {
                            dirBtn.style.opacity = '0.9'
                        }
                        dirBtn.onmouseout = () => {
                            dirBtn.style.opacity = '1'
                        }
                        dirBtn.onclick = (e) => {
                            e.stopPropagation()
                            trackButtonClickCustom({
                                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                buttonName: 'map_popup_action',
                                buttonAction: 'click',
                                extra: { action: 'directions', entity_id: markerData.id, entity_type: markerData.type }
                            })
                            onPopupButtonClick?.('directions', markerData)
                        }
                        btnRow.appendChild(dirBtn)
                    }
                    const igUrl = markerData.onClickData?.instagram_url as string | undefined
                    if (igUrl) {
                        const igBtn = document.createElement('a')
                        igBtn.href = igUrl
                        igBtn.target = '_blank'
                        igBtn.rel = 'noopener noreferrer'
                        igBtn.style.cssText = `width: 36px; height: 36px; border-radius: 8px; background: #f3f4f6; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.2s; text-decoration: none;`
                        igBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`
                        igBtn.onmouseover = () => {
                            igBtn.style.background = '#e5e7eb'
                        }
                        igBtn.onmouseout = () => {
                            igBtn.style.background = '#f3f4f6'
                        }
                        igBtn.onclick = (e) => {
                            e.stopPropagation()
                            trackButtonClickCustom({
                                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                buttonName: 'map_popup_action',
                                buttonAction: 'click',
                                extra: { action: 'instagram', entity_id: markerData.id, entity_type: markerData.type }
                            })
                            onPopupButtonClick?.('instagram', markerData)
                        }
                        btnRow.appendChild(igBtn)
                    }
                    if (btnRow.children.length > 0) {
                        contentSection.appendChild(btnRow)
                    }
                }

                popupCard.appendChild(imageSection)
                popupCard.appendChild(contentSection)

                mapRef.current.appendChild(popupCard)
                popupCardRef.current = popupCard
                popupCardCoordinatesRef.current = { lat, lng, markerId: markerData.id }

                updatePopupPosition()

                const hideOnOutsideClick = (event: MouseEvent) => {
                    if (popupCard && !popupCard.contains(event.target as Node) && !el.contains(event.target as Node)) {
                        hidePopupCard()
                        document.removeEventListener('click', hideOnOutsideClick)
                    }
                }
                setTimeout(() => {
                    document.addEventListener('click', hideOnOutsideClick)
                }, 100)
            }

            const hidePopupCard = () => {
                if (popupCardRef.current) {
                    popupCardRef.current.remove()
                    popupCardRef.current = null
                }
                popupCardCoordinatesRef.current = null
            }

            // Expose showPopupCard for viewport markers
            showPopupCardRef.current = showPopupCard

            // Click handler
            el.addEventListener('click', (e) => {
                e.stopPropagation()

                if (popupCardCoordinatesRef.current?.markerId === marker.id && popupCardRef.current) {
                    hidePopupCard()
                } else {
                    showPopupCard(marker, finalLat, finalLng)

                    if (mapInstanceRef.current) {
                        const currentPitch = mapInstanceRef.current.getPitch()
                        const currentBearing = mapInstanceRef.current.getBearing()
                        mapInstanceRef.current.flyTo({
                            center: [finalLng, finalLat],
                            zoom: MAP_CONFIG.animation.flyToZoom,
                            pitch: currentPitch,
                            bearing: currentBearing,
                            duration: MAP_CONFIG.animation.flyToDuration,
                            essential: true,
                            padding: MAP_CONFIG.animation.flyToPadding
                        })
                    }
                }
            })

            // Create Mapbox marker
            const mapboxMarker = new mapboxgl.Marker({
                element: el,
                anchor: 'center'
            })
                .setLngLat([finalLng, finalLat])
                .addTo(mapInstanceRef.current!)

            markersRef.current.set(markerKey, mapboxMarker)
            markerElementsRef.current.set(markerKey, el)
            markerImageRef.current.set(markerKey, markerImageUrl)
        })

        return () => {
            window.removeEventListener(FOCUS_EVENT_NAME, onFocus as EventListener)
            const mapInstance = mapInstanceRef.current
            if (mapInstance) {
                mapInstance.off('move', updatePopupOnMapMove)
                mapInstance.off('zoom', updatePopupOnMapMove)
            }
            // Don't remove popup card here - let it persist during navigation
            // Only remove on marker changes or component unmount
        }
    }, [filteredMarkers, markers, onMarkerClick, getMarkerColorDefault, getMarkerTextDefault, renderPopupContent, showMarkerTypeFilters, activeMarkerTypes])

    // Update marker hover styles (separate from marker creation to avoid side effects)
    useEffect(() => {
        filteredMarkers.forEach((marker) => {
            const el = markerElementsRef.current.get(String(marker.id))
            if (!el) return
            const isHovered = hoveredMarkerId != null && String(hoveredMarkerId) === String(marker.id)
            const markerConfig =
                (marker.type === 'experience' || marker.type === 'restaurant' || marker.type === 'city') ? MAP_CONFIG.marker.experience : MAP_CONFIG.marker.accommodation
            const BORDER_COLOR = markerConfig.defaultBorderColor

            el.style.zIndex = isHovered ? markerConfig.zIndex.hovered : markerConfig.zIndex.default
            const pinEl = el.children[0] as HTMLDivElement | undefined
            if (pinEl) {
                pinEl.style.borderColor = isHovered ? markerConfig.hoverBorderColor : BORDER_COLOR
                pinEl.style.boxShadow = isHovered ? '0 4px 12px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.25)'
            }
            const arrowEl = el.children[1] as HTMLDivElement | undefined
            if (arrowEl) {
                arrowEl.style.borderTopColor = isHovered ? markerConfig.hoverBorderColor : BORDER_COLOR
            }
        })
    }, [hoveredMarkerId, filteredMarkers])

    // Pan map to hovered marker (only on hover, not on un-hover)
    useEffect(() => {
        if (!mapInstanceRef.current || !hoveredMarkerId) return
        const marker = markers.find((m) => String(m.id) === String(hoveredMarkerId))
        if (!marker?.geo_location?.lat || !marker?.geo_location?.long) return
        const lat = parseFloat(String(marker.geo_location.lat))
        const lng = parseFloat(String(marker.geo_location.long))
        if (isNaN(lat) || isNaN(lng)) return
        mapInstanceRef.current.flyTo({
            center: [lng, lat],
            zoom: Math.max(mapInstanceRef.current.getZoom(), 14),
            duration: 800
        })
    }, [hoveredMarkerId, markers])

    // ── Viewport pan/zoom marker loader (opt-in) ─────────────────────────────
    // When `viewportMarkersEnabled` is true and `fetchViewportStays` is provided,
    // each `moveend` (600 ms debounced) fetches additional stays inside the
    // current bounds and adds them imperatively via `mapboxgl.Marker`. These
    // ephemeral markers are tracked in `viewportMarkersRef` + `viewportSeenIdsRef`
    // and cleared whenever `viewportMarkersEnabled` flips false (e.g. user
    // switches to a different sub-view / tab).
    const viewportMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
    const viewportSeenIdsRef = useRef<Set<string>>(new Set())
    const viewportFetchControllerRef = useRef<AbortController | null>(null)

    // Clear all viewport markers + refs. Safe to call multiple times.
    const clearViewportMarkers = useCallback(() => {
        viewportMarkersRef.current.forEach((marker) => marker.remove())
        viewportMarkersRef.current.clear()
        viewportSeenIdsRef.current.clear()
        if (viewportFetchControllerRef.current) {
            viewportFetchControllerRef.current.abort()
            viewportFetchControllerRef.current = null
        }
    }, [])

    // When disabled, drop any existing viewport markers and bail out.
    useEffect(() => {
        if (!viewportMarkersEnabled) {
            clearViewportMarkers()
        }
    }, [viewportMarkersEnabled, clearViewportMarkers])

    // Attach `moveend` handler whenever viewport loading is active.
    useEffect(() => {
        if (!viewportMarkersEnabled || !fetchViewportStays) return
        const map = mapInstanceRef.current
        if (!map) return

        let debounceTimer: ReturnType<typeof setTimeout> | null = null
        let cancelled = false

        const onMoveEnd = () => {
            if (debounceTimer) clearTimeout(debounceTimer)
            debounceTimer = setTimeout(async () => {
                if (cancelled) return
                const mapBounds = map.getBounds()
                if (!mapBounds) return
                const viewport = {
                    north: mapBounds.getNorth(),
                    south: mapBounds.getSouth(),
                    east: mapBounds.getEast(),
                    west: mapBounds.getWest(),
                }
                // Skip when zoomed out too far (≈80 km lat/lng span)
                if (Math.abs(viewport.north - viewport.south) > 0.72) return
                if (Math.abs(viewport.east - viewport.west) > 0.72) return

                if (viewportFetchControllerRef.current) {
                    viewportFetchControllerRef.current.abort()
                }
                const controller = new AbortController()
                viewportFetchControllerRef.current = controller

                try {
                    const stays = await fetchViewportStays(viewport)
                    if (controller.signal.aborted || cancelled) return

                    stays.forEach((stay) => {
                        const hubKey = String(stay.zentrum_hub_id || stay.id || '')
                        if (!hubKey) return
                        // Skip if this stay is already a prop-driven marker or a
                        // previous viewport marker — prevents duplicates on pan.
                        if (markersRef.current.has(hubKey)) return
                        if (viewportMarkersRef.current.has(hubKey)) return
                        if (viewportSeenIdsRef.current.has(hubKey)) return
                        viewportSeenIdsRef.current.add(hubKey)

                        const geo = stay.geo_location
                        if (!geo) return
                        const rawLat = geo.lat
                        const rawLng = geo.long
                        const lat = typeof rawLat === 'number' ? rawLat : parseFloat(String(rawLat))
                        const lng = typeof rawLng === 'number' ? rawLng : parseFloat(String(rawLng))
                        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
                        // Defensive: drop (0,0) / single-axis-zero bad backend data
                        if (lat === 0 || lng === 0) return

                        // Minimal pill marker (price + short name) — deliberately
                        // simpler than the prop-driven markers so it's obvious at a
                        // glance these came from the viewport API.
                        const el = document.createElement('div')
                        el.className = 'viewport-marker'
                        const rate = stay.rate_per_night
                        const rateWithTax = rate && rate > 0 ? rate + rate * 0.07 : null
                        const priceText = rateWithTax != null ? `₹ ${Math.round(rateWithTax).toLocaleString()}` : ''
                        const isVpAirbnb = shouldShowAirbnb(isRimigoInternal, (stay as { is_available_on_airbnb?: boolean }).is_available_on_airbnb === true)
                        el.style.cssText = `
                            padding:4px 8px;background:#FFFFFF;border:${isVpAirbnb ? '2px' : '1px'} solid ${isVpAirbnb ? '#FF385C' : '#747474'};
                            border-radius:8px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.2);
                            font-family:'Red Hat Display',sans-serif;font-size:10px;font-weight:600;
                            color:#101010;white-space:nowrap;display:flex;flex-direction:column;
                            align-items:center;line-height:1.2;
                        `
                        if (priceText) {
                            const priceLine = document.createElement('div')
                            priceLine.style.cssText = 'font-weight:700;'
                            priceLine.textContent = priceText
                            el.appendChild(priceLine)
                        }
                        const nameLine = document.createElement('div')
                        nameLine.style.cssText = 'font-size:8px;font-weight:500;color:#6b7280;max-width:72px;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:2px;'
                        if (isVpAirbnb) {
                            const airbnbLogoVp = document.createElement('img')
                            airbnbLogoVp.src = 'https://cdn.brandfetch.io/idkuvXnjOH/theme/dark/symbol.svg'
                            airbnbLogoVp.style.cssText = 'width:8px;height:8px;flex-shrink:0;'
                            nameLine.appendChild(airbnbLogoVp)
                        }
                        const nameText = document.createElement('span')
                        nameText.textContent = (stay.name || 'Hotel').slice(0, 14)
                        nameLine.appendChild(nameText)
                        el.appendChild(nameLine)

                        el.addEventListener('click', (e) => {
                            e.stopPropagation()
                            // Forward the rich fields from the viewport
                            // payload (content array, ratings) so the popup
                            // renders the image carousel + stars + review
                            // pill. Previously these were dropped which is
                            // why clicking a pill showed an empty popup.
                            const content = (stay as { content?: unknown }).content
                            const contentImages = Array.isArray(content)
                                ? (content as unknown[]).filter((u): u is string => typeof u === 'string')
                                : []
                            const overallRatingRaw = (stay as { overall_rating?: number | null }).overall_rating
                            const starRatingRaw = (stay as { star_rating?: number | string | null }).star_rating
                            const viewportMarker: MapMarker = {
                                id: hubKey,
                                name: stay.name || 'Hotel',
                                type: 'explore_accommodation',
                                geo_location: { lat: String(lat), long: String(lng) },
                                rate_per_night: rateWithTax ?? undefined,
                                zentrum_hub_id: hubKey,
                                accommodation_id: hubKey,
                                image: contentImages[0],
                                images: contentImages.slice(0, 5),
                                overall_rating: typeof overallRatingRaw === 'number' ? overallRatingRaw : undefined,
                                star_rating: starRatingRaw == null ? undefined : starRatingRaw,
                                is_available_on_airbnb: (stay as { is_available_on_airbnb?: boolean }).is_available_on_airbnb || false,
                            }
                            if (showPopupCardRef.current) {
                                showPopupCardRef.current(viewportMarker, lat, lng)
                                mapInstanceRef.current?.flyTo({
                                    center: [lng, lat],
                                    zoom: Math.max(mapInstanceRef.current.getZoom(), 14),
                                    duration: 400,
                                    essential: true,
                                })
                            } else {
                                onMarkerClick?.(hubKey, { name: stay.name })
                            }
                        })

                        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
                            .setLngLat([lng, lat])
                            .addTo(map)
                        viewportMarkersRef.current.set(hubKey, marker)
                    })
                } catch {
                    // Swallow abort + network errors — viewport loading is best-effort.
                }
            }, 600)
        }

        map.on('moveend', onMoveEnd)
        return () => {
            cancelled = true
            if (debounceTimer) clearTimeout(debounceTimer)
            map.off('moveend', onMoveEnd)
            if (viewportFetchControllerRef.current) {
                viewportFetchControllerRef.current.abort()
                viewportFetchControllerRef.current = null
            }
        }
    }, [viewportMarkersEnabled, fetchViewportStays, onMarkerClick])

    // ── Bounds observer: emit current bounds on debounced moveend ────────────
    // Independent of `viewportMarkersEnabled` — parents use this to drive a
    // bounds-scoped list query keeping the list + map in sync.
    useEffect(() => {
        if (!onBoundsChange) return
        const map = mapInstanceRef.current
        if (!map) return

        let debounceTimer: ReturnType<typeof setTimeout> | null = null
        const handler = () => {
            if (debounceTimer) clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => {
                const b = map.getBounds()
                if (!b) return
                onBoundsChange({
                    north: b.getNorth(),
                    south: b.getSouth(),
                    east: b.getEast(),
                    west: b.getWest(),
                })
            }, 600)
        }
        map.on('moveend', handler)
        return () => {
            map.off('moveend', handler)
            if (debounceTimer) clearTimeout(debounceTimer)
        }
    }, [onBoundsChange])

    // ── Initial bounds fit (caller-provided) ────────────────────────────────
    // When `initialBounds` changes (on mount or city switch), center the map
    // on the bbox centroid at a fixed zoom. Using a fixed zoom instead of
    // `fitBounds` gives consistent neighborhood-scale framing regardless of
    // how tight the bbox is — same perceived scale across all cities.
    const FIXED_INITIAL_ZOOM = 13
    const lastAppliedInitialBoundsRef = useRef<string>('')
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map || !initialBounds) return
        const key = `${initialBounds.north}-${initialBounds.south}-${initialBounds.east}-${initialBounds.west}`
        if (lastAppliedInitialBoundsRef.current === key) return
        lastAppliedInitialBoundsRef.current = key
        try {
            const centerLat = (initialBounds.north + initialBounds.south) / 2
            const centerLng = (initialBounds.east + initialBounds.west) / 2
            if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) return
            map.easeTo({
                center: [centerLng, centerLat],
                zoom: FIXED_INITIAL_ZOOM,
                duration: 500,
            })
        } catch {
            // ignore malformed bounds
        }
    }, [initialBounds])

    const handleExpandClick = useCallback(() => {
        onExpandChange?.(!isExpanded)
    }, [isExpanded, onExpandChange])

    // Resize map when expansion state changes
    useEffect(() => {
        if (mapInstanceRef.current && mapRef.current) {
            mapInstanceRef.current.resize()

            const intervals = [50, 100, 150, 200, 250, 300, 350]
            const timeouts: NodeJS.Timeout[] = []

            intervals.forEach((delay) => {
                const timeoutId = setTimeout(() => {
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.resize()
                    }
                }, delay)
                timeouts.push(timeoutId)
            })

            const finalTimeout = setTimeout(() => {
                if (mapInstanceRef.current) {
                    requestAnimationFrame(() => {
                        if (mapInstanceRef.current) {
                            mapInstanceRef.current.resize()
                        }
                    })
                }
            }, 350)
            timeouts.push(finalTimeout)

            return () => {
                timeouts.forEach(clearTimeout)
            }
        }
    }, [isExpanded])

    return (
        <div
            ref={mapContainerRef}
            className={`overflow-hidden bg-natural-white relative transition-all duration-300 ease-in-out w-full ${className}`}
            style={{
                height: height,
                willChange: 'width',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)'
            }}>
            {/* Expand/Collapse Button */}
            {!hideExpandButton && (
            <button
                onClick={handleExpandClick}
                className={`${expandbtnClassName} cursor-pointer absolute top-3 left-3 flex items-center justify-center w-8 h-8 rounded-md bg-white/90 backdrop-blur-sm border border-gray-200/60 shadow-sm hover:bg-white hover:shadow-md transition-all duration-200 group`}
                aria-label={isExpanded ? 'Collapse map' : 'Expand map'}
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 1000
                }}>
                {isExpanded ? (
                    <ArrowRightFromLine
                        size={14}
                        className="text-gray-700 transition-transform duration-300"
                    />
                ) : (
                    <ArrowLeftFromLine
                        size={14}
                        className="text-gray-700 transition-transform duration-300"
                    />
                )}
            </button>
            )}

            {/* Map filter chips row — list view + city switcher + best areas + marker type filters */}
            {(showMarkerTypeFilters || (cityId && bestAreasOptions.length > 0) || onListViewClick || citySwitcherConfig) && (
                <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2">
                {/* List View button + City switcher row */}
                {(onListViewClick || citySwitcherConfig) && (
                    <div className="flex items-center gap-2">
                        {onListViewClick && (
                            <button
                                type="button"
                                onClick={onListViewClick}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium font-manrope bg-white shadow-md border border-primary-default cursor-pointer transition-colors shrink-0 md:hidden">
                                <ChevronLeft size={14} className="text-primary-default" />
                                <span className="text-primary-default">List View</span>
                            </button>
                        )}
                        {citySwitcherConfig && citySwitcherConfig.cities.length > 1 && (
                            <GenericCarousel
                                className="flex-1 min-w-0"
                                gap={6}
                                gradientStartColor="transparent"
                                gradientEndColor="transparent"
                                gradientLeftStartColor="transparent"
                                gradientLeftEndColor="transparent">
                                {citySwitcherConfig.cities.map((city) => (
                                    <button
                                        key={city.id}
                                        type="button"
                                        onClick={() => citySwitcherConfig.onCityChange(city.id)}
                                        className={`flex items-center px-3 py-2 rounded-md text-[12px] font-medium font-manrope transition-all cursor-pointer whitespace-nowrap shadow-md border shrink-0 ${
                                            citySwitcherConfig.selectedCityId === city.id
                                                ? 'bg-white text-grey-0 border-primary-default'
                                                : 'bg-white/60 text-grey-2 border-gray-200/80'
                                        }`}>
                                        {city.name}
                                    </button>
                                ))}
                            </GenericCarousel>
                        )}
                    </div>
                )}
                <GenericCarousel
                    className="w-full"
                    gap={8}
                    gradientStartColor="transparent"
                    gradientEndColor="transparent"
                    gradientLeftStartColor="transparent"
                    gradientLeftEndColor="transparent"
                    scrollControls={{
                        rightScrollBtn: '!h-7 !w-7 !right-0 !rounded-full max-md:!flex',
                        rightScrollArrow: '!h-3.5 !w-3.5',
                        leftScrollBtn: '!h-7 !w-7 !left-0 !rounded-full max-md:!flex',
                        leftArrowBtn: '!h-3.5 !w-3.5'
                    }}>
                    {/* Best areas chip + dropdown — only show when areas exist */}
                    {cityId && bestAreasOptions.length > 0 && (
                        <div ref={bestAreasChipRef} className="relative shrink-0">
                            <button
                                type="button"
                                onClick={() => setBestAreasCollapsed(!bestAreasCollapsed)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium font-manrope transition-all cursor-pointer whitespace-nowrap shadow-md border ${
                                    selectedBestAreaId
                                        ? 'bg-white text-grey-0 border-[#10b981]/50'
                                        : 'bg-white text-grey-0 border-gray-200/80'
                                }`}
                                aria-expanded={!bestAreasCollapsed}>
                                <MapPin className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                                {selectedBestAreaId && bestAreasOptions.length > 0
                                    ? bestAreasOptions.find((a) => a.id === selectedBestAreaId)?.name ?? 'Best areas'
                                    : 'Best areas'}
                                <ChevronDown size={14} className={`shrink-0 text-grey-2 transition-transform ${!bestAreasCollapsed ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Best areas modal — rendered via portal to avoid overflow clipping */}
                            {!bestAreasCollapsed && ReactDOM.createPortal(
                                <>
                                    {/* Backdrop */}
                                    <div
                                        className="fixed inset-0 z-[1050]"
                                        onClick={() => {
                                            setBestAreasCollapsed(true)
                                            setAreaDetailsExpanded(false)
                                        }}
                                    />
                                    {/* Modal panel — positioned below the chip */}
                                    <div
                                        ref={bestAreasModalRef}
                                        className="fixed min-w-[260px] max-w-[320px] rounded-xl bg-white shadow-xl border border-gray-200/80 overflow-hidden z-[1060]"
                                        style={(() => {
                                            const rect = bestAreasChipRef.current?.getBoundingClientRect()
                                            return rect ? { top: rect.bottom + 6, left: rect.left } : {}
                                        })()}>
                                        <div className="px-3.5 py-2.5 border-b border-grey-4">
                                            <span className="text-[13px] font-semibold text-grey-0 font-red-hat-display">Select Best Area</span>
                                        </div>
                                        <div className="flex flex-col py-1 max-h-[280px] overflow-y-auto">
                                            {bestAreasOptions.map((area) => (
                                                <button
                                                    key={area.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedBestAreaId(area.id === selectedBestAreaId ? '' : area.id)
                                                        setBestAreasCollapsed(true)
                                                        setAreaDetailsExpanded(false)
                                                        trackButtonClickCustom?.({ buttonPage: TRIPBOARD_V1_BUTTON_PAGE, buttonName: 'map_best_area_select', buttonAction: 'click', extra: { area_id: area.id, area_name: area.name } })
                                                    }}
                                                    className={`flex items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors cursor-pointer ${
                                                        area.id === selectedBestAreaId
                                                            ? 'bg-[#10b981]/10 text-[#10b981]'
                                                            : 'text-grey-0 hover:bg-grey-5'
                                                    }`}>
                                                    <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: area.id === selectedBestAreaId ? '#10b981' : '#9CA3AF' }} />
                                                    {area.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>,
                                document.body
                            )}

                        </div>
                    )}

                    {/* Unified Filters chip — combines marker types + itinerary days
                        into a single dropdown. Best areas (above) stays separate. */}
                    {showMarkerTypeFilters && availableMarkerTypes.length > 1 && (() => {
                        // Count departures from the default (all types on, "All" days).
                        // Surface as a small badge so the user sees at a glance
                        // whether filters are customized.
                        const hiddenCount = availableMarkerTypes.reduce(
                            (acc, { type }) => acc + (activeMarkerTypes.has(type) ? 0 : 1),
                            0
                        )
                        const daySelected = activitiesFilterActive && hasItineraryData && selectedItineraryDay !== null
                        const activeBadgeCount = hiddenCount + (daySelected ? 1 : 0)
                        const hasCustomization = activeBadgeCount > 0

                        return (
                            <div ref={filtersChipRef} className="relative shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setFiltersOpen((v) => !v)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium font-manrope transition-all cursor-pointer whitespace-nowrap shadow-md border ${
                                        hasCustomization
                                            ? 'bg-white text-grey-0 border-primary-default/50'
                                            : 'bg-white text-grey-0 border-gray-200/80'
                                    }`}
                                    aria-expanded={filtersOpen}
                                    aria-label="Filters">
                                    <SlidersHorizontal
                                        className="w-3.5 h-3.5"
                                        style={{ color: hasCustomization ? '#10b981' : undefined }}
                                    />
                                    Filters
                                    {hasCustomization && (
                                        <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-primary-default text-white text-[10px] font-semibold leading-none font-red-hat-display">
                                            {activeBadgeCount}
                                        </span>
                                    )}
                                    <ChevronDown
                                        size={14}
                                        className={`shrink-0 text-grey-2 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {filtersOpen && ReactDOM.createPortal(
                                    <>
                                        <div
                                            className="fixed inset-0 z-[1050]"
                                            onClick={() => setFiltersOpen(false)}
                                        />
                                        <div
                                            ref={filtersModalRef}
                                            className="fixed min-w-[264px] max-w-[320px] rounded-xl bg-white shadow-xl border border-gray-200/80 overflow-hidden z-[1060]"
                                            style={(() => {
                                                const rect = filtersChipRef.current?.getBoundingClientRect()
                                                return rect ? { top: rect.bottom + 6, left: rect.left } : {}
                                            })()}>
                                            {/* Section: Show on map */}
                                            <div className="px-3.5 pt-3 pb-2 flex items-center justify-between">
                                                <span className="text-[12px] font-semibold tracking-[0.04em] uppercase text-grey-2 font-red-hat-display">
                                                    Show on map
                                                </span>
                                                {hasCustomization && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            // Reset: turn every marker type back on,
                                                            // clear itinerary day selection.
                                                            setActiveMarkerTypes(
                                                                new Set(availableMarkerTypes.map((m) => m.type))
                                                            )
                                                            setSelectedItineraryDay(null)
                                                        }}
                                                        className="text-[11px] font-medium text-primary-default hover:text-[#059669] transition-colors cursor-pointer font-manrope">
                                                        Reset
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex flex-col px-1.5 pb-1.5">
                                                {availableMarkerTypes.map(({ type, label, Icon, color }) => {
                                                    const isActive = activeMarkerTypes.has(type)
                                                    return (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedItineraryDay(null)
                                                                toggleMarkerType(type)
                                                            }}
                                                            className={`flex items-center justify-between gap-3 px-2 py-2 rounded-md text-left transition-colors cursor-pointer font-manrope ${
                                                                isActive
                                                                    ? 'text-grey-0 hover:bg-grey-5'
                                                                    : 'text-grey-2 hover:bg-grey-5'
                                                            }`}>
                                                            <span className="flex items-center gap-2.5 min-w-0">
                                                                <span
                                                                    className="flex items-center justify-center w-6 h-6 rounded-md shrink-0"
                                                                    style={{
                                                                        backgroundColor: isActive ? `${color}1A` : '#F3F4F6',
                                                                    }}>
                                                                    <Icon
                                                                        className="w-3.5 h-3.5"
                                                                        style={{ color: isActive ? color : '#9CA3AF' }}
                                                                    />
                                                                </span>
                                                                <span className="text-[13px] font-medium truncate">{label}</span>
                                                            </span>
                                                            {/* Toggle switch */}
                                                            <span
                                                                className="relative inline-flex shrink-0 w-8 h-[18px] rounded-full transition-colors duration-200"
                                                                style={{
                                                                    backgroundColor: isActive ? color : '#E5E7EB',
                                                                }}>
                                                                <span
                                                                    className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-200"
                                                                    style={{
                                                                        transform: isActive ? 'translateX(14px)' : 'translateX(0)',
                                                                    }}
                                                                />
                                                            </span>
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            {/* Section: Activity days (only when relevant) */}
                                            {activitiesFilterActive && hasItineraryData && (
                                                <>
                                                    <div className="h-px bg-grey-4" />
                                                    <div className="px-3.5 pt-3 pb-2">
                                                        <span className="text-[12px] font-semibold tracking-[0.04em] uppercase text-grey-2 font-red-hat-display">
                                                            Activity days
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedItineraryDay(null)
                                                                trackButtonClickCustom?.({
                                                                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                                                    buttonName: 'map_day_filter',
                                                                    buttonAction: 'click',
                                                                    extra: { day: null }
                                                                })
                                                            }}
                                                            className={`px-2.5 py-1 rounded-md text-[12px] font-medium font-manrope transition-all cursor-pointer whitespace-nowrap border ${
                                                                selectedItineraryDay === null
                                                                    ? 'bg-primary-default text-white border-primary-default'
                                                                    : 'bg-white text-grey-2 border-gray-200/80 hover:border-primary-default/50'
                                                            }`}>
                                                            All
                                                        </button>
                                                        {itineraryDayMapData!.map((_, i) => (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedItineraryDay(i)
                                                                    trackButtonClickCustom?.({
                                                                        buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                                                        buttonName: 'map_day_filter',
                                                                        buttonAction: 'click',
                                                                        extra: { day: i + 1 }
                                                                    })
                                                                }}
                                                                className={`px-2.5 py-1 rounded-md text-[12px] font-medium font-manrope transition-all cursor-pointer whitespace-nowrap border ${
                                                                    selectedItineraryDay === i
                                                                        ? 'bg-primary-default text-white border-primary-default'
                                                                        : 'bg-white text-grey-2 border-gray-200/80 hover:border-primary-default/50'
                                                                }`}>
                                                                Day {i + 1}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </>,
                                    document.body
                                )}
                            </div>
                        )
                    })()}
                </GenericCarousel>

                {/* Sub-row: "Why area?" chip — expanded description renders on the map below. */}
                {selectedBestAreaId && bestAreasOptions.length > 0 && !areaDetailsExpanded && (
                    <div className="flex items-start gap-1.5 min-w-0 overflow-hidden">
                        {(() => {
                            const area = bestAreasOptions.find((a) => a.id === selectedBestAreaId)
                            if (!area) return null
                            return (
                                <button
                                    type="button"
                                    onClick={() => setAreaDetailsExpanded(true)}
                                    className="rounded-md bg-white border border-grey-4 shadow-sm px-3 py-1.5 text-[12px] font-medium font-manrope text-grey-0 hover:border-primary-default hover:text-primary-default transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0">
                                    <Sparkles className="w-3 h-3 text-primary-default shrink-0" />
                                    Why {area.name}?
                                </button>
                            )
                        })()}
                    </div>
                )}
                </div>
            )}

            {/* On-map description card for the selected Best Area. */}
            {selectedBestAreaId && bestAreasOptions.length > 0 && areaDetailsExpanded && (() => {
                const area = bestAreasOptions.find((a) => a.id === selectedBestAreaId)
                if (!area) return null
                return (
                    <div className="absolute top-14 left-3 z-[1010] min-w-[240px] max-w-[300px] rounded-xl bg-white shadow-lg border border-gray-200/80 overflow-hidden p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] font-semibold text-grey-0">{area.name}</span>
                            <button
                                type="button"
                                onClick={() => setAreaDetailsExpanded(false)}
                                className="text-xs font-medium text-primary-default hover:text-[#059669] transition-colors shrink-0 cursor-pointer">
                                Hide
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 leading-snug font-medium">{area.whyRecommended}</p>
                        {area.highlights.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {area.highlights.map((h, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex font-medium items-center gap-1.5 px-2.5 py-1 rounded-full border border-feature-card-border bg-natural-white text-xs font-medium text-header-black">
                                        {h.icon != null && h.icon !== '' && (
                                            <span className="shrink-0 font-medium" aria-hidden>{h.icon}</span>
                                        )}
                                        {h.label}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* Always render the map div so the init effect can create the map instance.
                Overlay a placeholder on top while loading. */}
            <div
                ref={mapRef}
                className="w-full h-full"
                style={{
                    willChange: 'transform',
                    backfaceVisibility: 'hidden',
                    transform: 'translateZ(0)'
                }}
            />
            {!mapCenter && !mapInstanceRef.current && (
                <div className="absolute inset-0 w-full h-full bg-grey-grey_4 animate-pulse pointer-events-none" />
            )}

            {/* Zoom controls */}
            <div className="absolute bottom-10 right-1 z-[1000] flex flex-col rounded-lg bg-white shadow-md border border-gray-200/80 overflow-hidden">
                <button
                    type="button"
                    onClick={() => mapInstanceRef.current?.zoomIn()}
                    className="flex items-center justify-center w-9 h-9 text-grey-0 hover:bg-grey-5 transition-colors cursor-pointer border-b border-gray-200/80"
                    aria-label="Zoom in">
                    <span className="text-lg font-medium leading-none">+</span>
                </button>
                <button
                    type="button"
                    onClick={() => mapInstanceRef.current?.zoomOut()}
                    className="flex items-center justify-center w-9 h-9 text-grey-0 hover:bg-grey-5 transition-colors cursor-pointer"
                    aria-label="Zoom out">
                    <span className="text-lg font-medium leading-none">−</span>
                </button>
            </div>
        </div>
    )
}

// Memoize with simple comparison - let React handle marker updates
export default memo(GenericMap, (prevProps, nextProps) => {
    // Only re-render if these props actually change
    if (prevProps.cityName !== nextProps.cityName) return false
    if (prevProps.hoveredMarkerId !== nextProps.hoveredMarkerId) return false
    if (prevProps.isExpanded !== nextProps.isExpanded) return false
    if (prevProps.onMarkerClick !== nextProps.onMarkerClick) return false
    if (prevProps.minZoom !== nextProps.minZoom) return false

    // Simple reference check for markers - let the marker update effect handle diffing
    // This prevents over-aggressive memoization that hides necessary updates
    if (prevProps.markers !== nextProps.markers) return false

    // City / best areas changes
    if (prevProps.cityId !== nextProps.cityId) return false
    if (prevProps.cityCenter !== nextProps.cityCenter) return false

    // Marker type filters
    if (prevProps.showMarkerTypeFilters !== nextProps.showMarkerTypeFilters) return false
    if (prevProps.activeTab !== nextProps.activeTab) return false

    // Route line changes
    if (prevProps.routeCoordinates !== nextProps.routeCoordinates) return false
    if (prevProps.routeLineStyle !== nextProps.routeLineStyle) return false

    // List view / city switcher
    if (prevProps.onListViewClick !== nextProps.onListViewClick) return false
    if (prevProps.citySwitcherConfig !== nextProps.citySwitcherConfig) return false

    // Viewport marker loader — prop identity matters since the effect
    // re-binds `moveend` only when these change.
    if (prevProps.viewportMarkersEnabled !== nextProps.viewportMarkersEnabled) return false
    if (prevProps.fetchViewportStays !== nextProps.fetchViewportStays) return false

    // Bounds observer / initial bounds — re-render needed so effects rebind.
    if (prevProps.onBoundsChange !== nextProps.onBoundsChange) return false
    if (prevProps.initialBounds !== nextProps.initialBounds) return false
    if (prevProps.disableMarkerFit !== nextProps.disableMarkerFit) return false

    // Props are equal, skip re-render
    return true
})
