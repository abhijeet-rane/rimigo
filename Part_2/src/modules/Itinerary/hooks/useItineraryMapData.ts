/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useCallback } from 'react'
import { MapMarker, GeoLocation } from '@/components/shared/Map/GenericMap'
import { MAP_CONFIG } from '@/components/shared/Map/mapConfig'
import { useCitiesByIdsForMap } from '@/hooks/useCitiesByIdsForMap'

// ─── Types ───────────────────────────────────────────────────────

export interface SlotLocation {
    slotId: string
    entityId: string
    latitude: number
    longitude: number
    address: string
    locationSummary: string
}

export interface TransportBetweenCities {
    mode: string   // 'flights' | 'train' | 'bus' | 'car' | etc.
    title: string  // e.g. "Flight from Bangalore to Dubai"
    fromCity: string
    toCity: string
}

export interface CitySegment {
    cityName: string
    cityId: string
    country: string
    nights: number
    firstDayIndex: number
    lastDayIndex: number
    dateRange: string // e.g. "May 24 - May 28"
    latitude?: number
    longitude?: number
    transportToNext?: TransportBetweenCities // transport from this city to the next
}

export interface DayMapData {
    dayIndex: number
    dayNumber: number
    date: string
    cityName: string
    cityId: string
    slots: SlotMapItem[]
}

export interface SlotMapItem {
    slotId: string
    kind: string
    title: string
    entityId?: string
    entityModel?: string
    startTime?: string
    endTime?: string
    image?: string
    latitude?: number
    longitude?: number
    address?: string
    locationSummary?: string
    order?: number
    marker?: MapMarker
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatCityDateRange(start: Date, end: Date): string {
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    if (start.getTime() === end.getTime()) return fmt(start)
    return `${fmt(start)} - ${fmt(end)}`
}

// ─── Compute centroid from experience markers in a day range ─────
// Uses the actual experience coordinates from dayMapData instead of external geocoding

function computeSegmentCentroid(
    dayMapData: DayMapData[],
    firstDayIndex: number,
    lastDayIndex: number
): { lat: number; lon: number } | null {
    const lats: number[] = []
    const lons: number[] = []

    for (let d = firstDayIndex; d <= lastDayIndex; d++) {
        const day = dayMapData[d]
        if (!day) continue
        for (const slot of day.slots) {
            if (slot.latitude && slot.longitude) {
                lats.push(slot.latitude)
                lons.push(slot.longitude)
            }
        }
    }

    if (lats.length === 0) return null

    // Return centroid (average of all marker coordinates)
    const avgLat = lats.reduce((sum, v) => sum + v, 0) / lats.length
    const avgLon = lons.reduce((sum, v) => sum + v, 0) / lons.length
    return { lat: avgLat, lon: avgLon }
}

// ─── Great circle arc interpolation (zero-dependency) ────────────

function interpolateGreatCircle(
    start: [number, number],
    end: [number, number],
    numPoints: number
): [number, number][] {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const toDeg = (rad: number) => (rad * 180) / Math.PI

    const [lng1, lat1] = [toRad(start[0]), toRad(start[1])]
    const [lng2, lat2] = [toRad(end[0]), toRad(end[1])]

    const d = 2 * Math.asin(
        Math.sqrt(
            Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng2 - lng1) / 2), 2)
        )
    )

    if (d < 1e-10) return [start, end] // Points are essentially the same

    const points: [number, number][] = []
    for (let i = 0; i <= numPoints; i++) {
        const f = i / numPoints
        const A = Math.sin((1 - f) * d) / Math.sin(d)
        const B = Math.sin(f * d) / Math.sin(d)

        const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2)
        const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2)
        const z = A * Math.sin(lat1) + B * Math.sin(lat2)

        const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
        const lng = Math.atan2(y, x)

        points.push([toDeg(lng), toDeg(lat)])
    }
    return points
}

// ─── Catmull-Rom spline interpolation for smooth curves ──────────
// Generates a smooth curve that passes through all given waypoints.
// Uses centripetal parameterization (alpha = 0.5) for natural-looking arcs
// that avoid cusps and self-intersections.

function catmullRomSpline(
    waypoints: [number, number][],
    pointsPerSegment: number
): [number, number][] {
    if (waypoints.length < 2) return waypoints
    if (waypoints.length === 2) {
        // For two points, generate a gentle arc rather than a straight line
        return interpolateWithArc(waypoints[0], waypoints[1], pointsPerSegment)
    }

    const result: [number, number][] = []

    // Extend control points: mirror first and last for open curve ends
    const pts: [number, number][] = [
        [2 * waypoints[0][0] - waypoints[1][0], 2 * waypoints[0][1] - waypoints[1][1]],
        ...waypoints,
        [
            2 * waypoints[waypoints.length - 1][0] - waypoints[waypoints.length - 2][0],
            2 * waypoints[waypoints.length - 1][1] - waypoints[waypoints.length - 2][1]
        ]
    ]

    // Alpha = 0.5 for centripetal parameterization
    const alpha = 0.5

    for (let i = 1; i < pts.length - 2; i++) {
        const p0 = pts[i - 1]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[i + 2]

        // Knot intervals based on distance (centripetal)
        const d01 = Math.pow(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), alpha) || 1e-6
        const d12 = Math.pow(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), alpha) || 1e-6
        const d23 = Math.pow(Math.hypot(p3[0] - p2[0], p3[1] - p2[1]), alpha) || 1e-6

        // Centripetal Catmull-Rom tangents at p1 and p2
        const t1x = ((p1[0] - p0[0]) / d01 - (p2[0] - p0[0]) / (d01 + d12) + (p2[0] - p1[0]) / d12) * d12
        const t1y = ((p1[1] - p0[1]) / d01 - (p2[1] - p0[1]) / (d01 + d12) + (p2[1] - p1[1]) / d12) * d12
        const t2x = ((p2[0] - p1[0]) / d12 - (p3[0] - p1[0]) / (d12 + d23) + (p3[0] - p2[0]) / d23) * d12
        const t2y = ((p2[1] - p1[1]) / d12 - (p3[1] - p1[1]) / (d12 + d23) + (p3[1] - p2[1]) / d23) * d12

        const numPts = i === pts.length - 3 ? pointsPerSegment : pointsPerSegment - 1
        for (let j = 0; j <= numPts; j++) {
            // Skip first point of subsequent segments to avoid duplicates
            if (i > 1 && j === 0) continue

            const t = j / pointsPerSegment
            const t2 = t * t
            const t3 = t2 * t

            // Hermite basis functions
            const h00 = 2 * t3 - 3 * t2 + 1
            const h10 = t3 - 2 * t2 + t
            const h01 = -2 * t3 + 3 * t2
            const h11 = t3 - t2

            const x = h00 * p1[0] + h10 * t1x + h01 * p2[0] + h11 * t2x
            const y = h00 * p1[1] + h10 * t1y + h01 * p2[1] + h11 * t2y

            result.push([x, y])
        }
    }

    return result
}

// Generate a gentle arc between two points (for the 2-point case).
// Creates a slight perpendicular offset to avoid a boring straight line.
function interpolateWithArc(
    start: [number, number],
    end: [number, number],
    numPoints: number
): [number, number][] {
    const midX = (start[0] + end[0]) / 2
    const midY = (start[1] + end[1]) / 2
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    const dist = Math.hypot(dx, dy)

    // Perpendicular offset — 8% of segment length, curved to the right of travel direction
    const offsetMagnitude = dist * 0.08
    const perpX = -dy / (dist || 1) * offsetMagnitude
    const perpY = dx / (dist || 1) * offsetMagnitude

    const controlX = midX + perpX
    const controlY = midY + perpY

    const points: [number, number][] = []
    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints
        // Quadratic Bezier through start, control, end
        const x = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * controlX + t * t * end[0]
        const y = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * controlY + t * t * end[1]
        points.push([x, y])
    }
    return points
}

// ─── Hook ────────────────────────────────────────────────────────

export function useItineraryMapData(days: any[], stays?: any[]) {
    // Build day-wise map data (location and image from itinerary response: slot.location, slot.slot_data.display_props)
    const dayMapData: DayMapData[] = useMemo(() => {
        if (!days?.length) return []

        return days.map((day: any, index: number) => {
            const cityName = day.base_city?.name || day.destination_city?.name || 'Unknown'
            const cityId = day.base_city?.id || day.destination_city?.id || ''

            const slots: SlotMapItem[] = (day.slots || []).map((slot: any) => {
                // Location from slot.location or slot.slot_data.location (itinerary response)
                // Check for actual coordinates, not just an empty {} object
                const rawLoc = slot.location
                const loc = (rawLoc?.latitude != null && rawLoc?.longitude != null)
                    ? rawLoc
                    : slot.slot_data?.location
                const lat = loc?.latitude
                const lng = loc?.longitude
                // Image from slot.slot_data.display_props.landscape_image (itinerary response)
                const image =
                    slot.slot_data?.display_props?.landscape_image ||
                    slot.slot_data?.display_props?.portrait_image ||
                    slot.slot_data?.verified_photos?.[0]?.url ||
                    ''

                const slotItem: SlotMapItem = {
                    slotId: slot.slot_id || slot.id || `${index}-${slot.order}`,
                    kind: slot.kind,
                    title: slot.title || '',
                    entityId: slot.entity_id,
                    entityModel: slot.entity_model,
                    startTime: slot.start_time,
                    endTime: slot.end_time,
                    image,
                    latitude: lat,
                    longitude: lng,
                    address: loc?.address,
                    locationSummary: loc?.location_summary,
                    order: slot.order
                }

                // Build MapMarker if we have coordinates (exclude 0,0)
                if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
                    slotItem.marker = {
                        id: slotItem.slotId,
                        name: slotItem.title,
                        geo_location: {
                            lat,
                            long: lng
                        } as GeoLocation,
                        image,
                        type: slot.kind === 'meal' || slot.kind === 'restaurant' ? 'restaurant' : 'experience',
                        experience_id: slot.entity_id,
                        price: slot.slot_data?.price,
                        onClickData: {
                            dayIndex: index,
                            slotId: slotItem.slotId,
                            kind: slot.kind,
                            entityId: slot.entity_id
                        }
                    }
                }

                return slotItem
            })

            return {
                dayIndex: index,
                dayNumber: index + 1,
                date: day.date,
                cityName,
                cityId,
                slots
            }
        })
    }, [days])

    // Get all markers across all days
    // Build hotel markers from stays with lat/long
    const stayMarkersByDayIndex = useMemo(() => {
        const map = new Map<number, MapMarker>()
        if (!stays?.length || !days?.length) return map
        // Build a city→dayIndices lookup
        const cityDayIndices = new Map<string, number[]>()
        days.forEach((day: any, idx: number) => {
            const cid = day.base_city?.id ? String(day.base_city.id) : null
            if (!cid) return
            const list = cityDayIndices.get(cid) || []
            list.push(idx)
            cityDayIndices.set(cid, list)
        })
        // Also build city_id → city_name lookup from days
        const cityIdToName = new Map<string, string>()
        days.forEach((day: any) => {
            const cid = day.base_city?.id ? String(day.base_city.id) : null
            const cname = day.base_city?.name
            if (cid && cname) cityIdToName.set(cid, cname)
        })

        for (const stay of stays) {
            if (!stay.latitude || !stay.longitude || !stay.city_id) continue
            const dayIndices = cityDayIndices.get(stay.city_id) || []
            // Mark the first day of the city block that this stay covers
            if (dayIndices.length > 0) {
                const marker: MapMarker = {
                    id: `stay-${stay.stay_id}`,
                    name: stay.hotel_name || 'Hotel',
                    geo_location: {
                        lat: stay.latitude,
                        long: stay.longitude
                    } as GeoLocation,
                    image: stay.hotel_image_url || undefined,
                    type: 'accommodation',
                    zentrum_hub_id: stay.zentrum_hub_id || undefined,
                    accommodation_id: stay.accommodation_id || undefined,
                    onClickData: {
                        cityId: stay.city_id || undefined,
                        cityName: cityIdToName.get(stay.city_id) || undefined,
                        checkIn: stay.check_in_date?.split('T')[0] || undefined,
                        checkOut: stay.check_out_date?.split('T')[0] || undefined
                    }
                }
                // Put marker on every day this stay covers
                for (const idx of dayIndices) {
                    map.set(idx, marker)
                }
            }
        }
        return map
    }, [stays, days])

    const allMarkers: MapMarker[] = useMemo(() => {
        const slotMarkers = dayMapData.flatMap(day =>
            day.slots.filter(s => s.marker).map(s => s.marker!)
        )
        // Deduplicate hotel markers (same marker is on every day of the city)
        const seen = new Set<string | number>()
        const hotelMarkers: MapMarker[] = []
        for (const m of stayMarkersByDayIndex.values()) {
            if (!seen.has(m.id)) {
                seen.add(m.id)
                hotelMarkers.push(m)
            }
        }
        return [...slotMarkers, ...hotelMarkers]
    }, [dayMapData, stayMarkersByDayIndex])

    // Get markers for a specific day (with sequence numbers 1, 2, 3…)
    const getMarkersForDay = useCallback((dayIndex: number): MapMarker[] => {
        const day = dayMapData[dayIndex]
        if (!day) return []
        const slotMarkers = day.slots.filter(s => s.marker).map((s, i) => ({
            ...s.marker!,
            sequenceNumber: i + 1
        }))
        // Add hotel marker for this day if present
        const hotelMarker = stayMarkersByDayIndex.get(dayIndex)
        if (hotelMarker) {
            slotMarkers.unshift({ ...hotelMarker, sequenceNumber: 0 })
        }
        return slotMarkers
    }, [dayMapData, stayMarkersByDayIndex])

    // Get the primary city name for the map
    const primaryCityName = useMemo(() => {
        if (!days?.length) return ''
        // Find the city with the most days
        const cityCounts: Record<string, number> = {}
        days.forEach((day: any) => {
            const name = day.base_city?.name || day.destination_city?.name || ''
            if (name) cityCounts[name] = (cityCounts[name] || 0) + 1
        })
        return Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    }, [days])

    // Unique city IDs from itinerary days (for bulk city location API). Normalize to string so lookup matches.
    const cityIdsFromDays = useMemo(() => {
        if (!days?.length) return []
        const ids = new Set<string>()
        days.forEach((day: any) => {
            const id = day.base_city?.id ?? day.destination_city?.id
            if (id != null && id !== '') ids.add(String(id))
        })
        return Array.from(ids)
    }, [days])

    // Fetch city lat/long in bulk from location-personalization map API (shared hook + query key)
    const { data: citiesWithLocation = [] } = useCitiesByIdsForMap(cityIdsFromDays)

    // Lookup: cityId -> { lat, lng } for segment/marker coordinates (keys normalized to string for consistent lookup)
    const cityIdToLocation = useMemo(() => {
        const map = new Map<string, { lat: number; lng: number }>()
        citiesWithLocation.forEach((c) => {
            if (c.latitude != null && c.longitude != null && Number.isFinite(c.latitude) && Number.isFinite(c.longitude) && !(c.latitude === 0 && c.longitude === 0)) {
                map.set(String(c.city_id), { lat: c.latitude, lng: c.longitude })
            }
        })
        return map
    }, [citiesWithLocation])

    // Lookup: cityId -> city_thumbnail_url for city marker images (from location-personalization map API)
    const cityIdToThumbnail = useMemo(() => {
        const map = new Map<string, string>()
        citiesWithLocation.forEach((c) => {
            if (c.city_thumbnail_url) map.set(String(c.city_id), c.city_thumbnail_url)
        })
        return map
    }, [citiesWithLocation])

    // ─── City segments (for route overview) ──────────────────────

    // Compute city segments (group consecutive days by city)
    // Coordinates from location-personalization API when available; else centroid from experience markers
    const citySegments: CitySegment[] = useMemo(() => {
        if (!days?.length) return []

        const segments: CitySegment[] = []
        let currentCity: string | null = null
        let currentCityId: string | null = null
        let currentCountry = ''
        let nightCount = 0
        let firstDayIndex = 0

        days.forEach((day: any, index: number) => {
            const cityName = day.base_city?.name || day.destination_city?.name || 'Unknown'
            const cityId = day.base_city?.id ?? day.destination_city?.id ?? ''
            const cityIdStr = cityId !== '' && cityId != null ? String(cityId) : ''
            const country = day.base_city?.country || day.destination_city?.country || ''

            if (cityName === currentCity) {
                nightCount++
            } else {
                if (currentCity) {
                    const firstDate = new Date(days[firstDayIndex].date)
                    const lastDate = new Date(days[index - 1].date)
                    const apiLoc = cityIdToLocation.get(String(currentCityId!))
                    const centroid = computeSegmentCentroid(dayMapData, firstDayIndex, index - 1)
                    const lat = apiLoc?.lat ?? centroid?.lat
                    const lon = apiLoc?.lng ?? centroid?.lon
                    segments.push({
                        cityName: currentCity,
                        cityId: String(currentCityId!),
                        country: currentCountry,
                        nights: nightCount,
                        firstDayIndex,
                        lastDayIndex: index - 1,
                        dateRange: formatCityDateRange(firstDate, lastDate),
                        latitude: lat,
                        longitude: lon
                    })
                }
                currentCity = cityName
                currentCityId = cityIdStr
                currentCountry = country
                nightCount = 1
                firstDayIndex = index
            }
        })

        // Push last segment
        if (currentCity) {
            const firstDate = new Date(days[firstDayIndex].date)
            const lastDate = new Date(days[days.length - 1].date)
            const apiLoc = cityIdToLocation.get(String(currentCityId!))
            const centroid = computeSegmentCentroid(dayMapData, firstDayIndex, days.length - 1)
            const lat = apiLoc?.lat ?? centroid?.lat
            const lon = apiLoc?.lng ?? centroid?.lon
            segments.push({
                cityName: currentCity,
                cityId: String(currentCityId!),
                country: currentCountry,
                nights: nightCount,
                firstDayIndex,
                lastDayIndex: days.length - 1,
                dateRange: formatCityDateRange(firstDate, lastDate),
                latitude: lat,
                longitude: lon
            })
        }

        // Second pass: find transport between consecutive city segments
        const transportKinds = new Set(['flight', 'transport', 'transfer', 'bus', 'train', 'car', 'taxi', 'shuttle', 'boat', 'ferry'])
        for (let i = 0; i < segments.length - 1; i++) {
            const seg = segments[i]
            const nextSeg = segments[i + 1]
            // Look in last day of current segment and first day of next segment
            const searchDays = [seg.lastDayIndex, nextSeg.firstDayIndex]
            for (const dayIdx of searchDays) {
                const day = days[dayIdx]
                if (!day?.slots) continue
                const transportSlot = day.slots.find((s: any) => transportKinds.has(s.kind))
                if (transportSlot) {
                    seg.transportToNext = {
                        mode: transportSlot.slot_data?.mode || transportSlot.kind || 'transport',
                        title: transportSlot.title || '',
                        fromCity: transportSlot.slot_data?.from_city || seg.cityName,
                        toCity: transportSlot.slot_data?.to_city || nextSeg.cityName
                    }
                    break
                }
            }
        }

        return segments
    }, [days, dayMapData, cityIdToLocation])

    // Build city markers for overview map
    const cityMarkers: MapMarker[] = useMemo(() => {
        return citySegments
            .filter(seg => seg.latitude && seg.longitude)
            .map((seg, index) => {
                // Image: city_thumbnail_url from useCitiesByIdsForMap (location-personalization map API), else first slot image from itinerary
                let cityImage = cityIdToThumbnail.get(seg.cityId) ?? ''
                if (!cityImage) {
                    for (let d = seg.firstDayIndex; d <= seg.lastDayIndex; d++) {
                        const day = dayMapData[d]
                        if (!day) continue
                        for (const slot of day.slots) {
                            if (slot.image) {
                                cityImage = slot.image
                                break
                            }
                        }
                        if (cityImage) break
                    }
                }

                // Build day-range label: "Day 1" or "Day 1-3"
                const dayStart = seg.firstDayIndex + 1
                const dayEnd = seg.lastDayIndex + 1
                const sequenceLabel = dayStart === dayEnd ? `Day ${dayStart}` : `Day ${dayStart}-${dayEnd}`

                return {
                    id: `city-${seg.cityId}-${index}`,
                    name: seg.cityName,
                    geo_location: {
                        lat: seg.latitude!,
                        long: seg.longitude!
                    } as GeoLocation,
                    image: cityImage || undefined,
                    type: 'city' as const,
                    sequenceNumber: index + 1,
                    sequenceLabel,
                    onClickData: {
                        firstDayIndex: seg.firstDayIndex,
                        cityName: seg.cityName,
                        dateRange: seg.dateRange,
                        nights: seg.nights
                    }
                }
            })
    }, [citySegments, dayMapData, cityIdToThumbnail])

    // ─── Route coordinates ─────────────────────────────────────────

    // Overview: smooth spline curves through city waypoints, enhanced with great-circle arcs
    const overviewRouteCoordinates: [number, number][] = useMemo(() => {
        const validSegments = citySegments.filter(seg => seg.latitude && seg.longitude)
        if (validSegments.length < 2) return []

        // For 2 cities, use great-circle with a gentle arc overlay
        if (validSegments.length === 2) {
            const from: [number, number] = [validSegments[0].longitude!, validSegments[0].latitude!]
            const to: [number, number] = [validSegments[1].longitude!, validSegments[1].latitude!]
            return interpolateGreatCircle(from, to, MAP_CONFIG.routeLine.arcPoints)
        }

        // For 3+ cities, use Catmull-Rom spline through city waypoints for smooth, natural curves
        const waypoints: [number, number][] = validSegments.map(seg => [seg.longitude!, seg.latitude!])
        return catmullRomSpline(waypoints, MAP_CONFIG.routeLine.curvePoints)
    }, [citySegments])

    // Day view: smooth spline curves between experience markers in slot order
    const getDayRouteCoordinates = useCallback((dayIndex: number): [number, number][] => {
        const markers = getMarkersForDay(dayIndex)
        if (markers.length < 2) return []

        const waypoints: [number, number][] = markers
            .filter(m => m.geo_location?.lat && m.geo_location?.long)
            .map(m => {
                const lat = typeof m.geo_location!.lat === 'string' ? parseFloat(m.geo_location!.lat) : m.geo_location!.lat
                const lng = typeof m.geo_location!.long === 'string' ? parseFloat(m.geo_location!.long) : m.geo_location!.long
                return [lng, lat] as [number, number]
            })

        if (waypoints.length < 2) return waypoints
        return catmullRomSpline(waypoints, MAP_CONFIG.routeLine.curvePoints)
    }, [getMarkersForDay])

    return {
        dayMapData,
        allMarkers,
        getMarkersForDay,
        isLoading: false,
        primaryCityName,
        citySegments,
        cityMarkers,
        overviewRouteCoordinates,
        getDayRouteCoordinates
    }
}
