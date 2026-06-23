import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { ArrowLeftFromLine, ArrowRightFromLine, BadgeCheck, ChevronDown, MapPin, Sparkles, Zap } from 'lucide-react'
import { useUserInfo } from '@/hooks/useUserInfo'
import { shouldShowAirbnb } from '../config/stayCardVisibility'
import { getBestAreas, type BestAreasGeoJSONResponse } from '../Apis/bestAreasAPI'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

interface GeoLocation {
    lat: string
    long: string
}

interface AccommodationMarker {
    id: string | number
    name: string
    geo_location?: GeoLocation
    rate_per_night?: number
    overall_rating?: number
    star_rating?: number | string
    content?: string[]
    zentrum_hub_id?: string
    accommodation_id?: string
    review_data?: {
        platform_reviews?: Array<{
            platform: string
            rating: number
            review_count: number
            logo_url: string | null
        }>
        location_tags?: string[]
    }
    is_verified?: boolean
    is_b2b_deal_available?: boolean
    is_available_on_airbnb?: boolean
}

interface StaysMapProps {
    cityName?: string
    /** Authoritative city centre from LocationPersonalizationCity (via /location-personalization-cities/map/).
     *  Primary source for map position. When null AND cityCenterLoading=false, StaysMap
     *  falls back to Mapbox geocoding. */
    cityCenter?: { lon: number; lat: number } | null
    /** True while the city-center API is still in flight. Used to defer Mapbox fallback
     *  until we know backend has no valid coords — prevents Mapbox from racing the backend. */
    cityCenterLoading?: boolean
    accommodations?: AccommodationMarker[]
    hoveredAccommodationId?: string | null
    onMarkerClick?: (accommodationId: string | number) => void
    // Navigation props for hotel detail page
    cityId?: string
    checkIn?: string
    checkOut?: string
    travelPurpose?: string
    groupType?: string
    preferences?: string[]
    guestsData?: {
        adults?: number
        children?: number
        infants?: number
        children_age?: number[]
    }
    reviewType?: string
    isExpanded?: boolean
    onExpandChange?: (expanded: boolean) => void
    fetchViewportStays?: (bounds: { north: number; south: number; east: number; west: number }) => Promise<any[]>
    buttonPage?:string
    // Shortlist & collection
    shortlistState?: Record<string, { accommodationId: string; isShortlisted: boolean }>
    shortlistLoadingIds?: Record<string, boolean>
    onShortlistToggle?: (zentrumHubId: string, accommodationId: string) => void
    onAddToCollection?: (accommodationId: string, extras?: AddToCollectionExtras) => void
}

export interface AddToCollectionExtras {
    name?: string
    zentrumHubId?: string
    imageUrl?: string
    isVerified?: boolean
    isB2bDealAvailable?: boolean
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

const EMPTY_BEST_AREAS_GEOJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: []
}

// Compute [west, south, east, north] from a Polygon/MultiPolygon geometry —
// used when the API response omits properties.bbox.
function computeBboxFromGeometry(geometry: GeoJSON.Geometry | undefined): [number, number, number, number] | undefined {
    if (!geometry) return undefined
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
    const visit = (lng: number, lat: number) => {
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
    }
    if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach((ring) => ring.forEach(([lng, lat]) => visit(lng, lat)))
    } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach(([lng, lat]) => visit(lng, lat))))
    } else {
        return undefined
    }
    if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return undefined
    return [minLng, minLat, maxLng, maxLat]
}

function buildBestAreaOptionsFromResponse(data: BestAreasGeoJSONResponse): BestAreaOption[] {
    return data.features
        .map((f) => {
            const bbox = f.properties.bbox ?? computeBboxFromGeometry(f.geometry as GeoJSON.Geometry)
            if (!bbox) return null
            return {
                id: f.properties.id,
                name: f.properties.name,
                bbox,
                whyRecommended: f.properties.whyRecommended,
                highlights: f.properties.highlights ?? []
            }
        })
        .filter((o): o is BestAreaOption => o !== null)
}

// Highlight item from API: label + optional icon (emoji)
export interface BestAreaHighlight {
    label: string
    icon?: string
}

// For dropdown and hover: id, name, bbox, why recommended, and highlights
export interface BestAreaOption {
    id: string
    name: string
    bbox: [number, number, number, number]
    whyRecommended: string
    highlights: BestAreaHighlight[]
}

// ─── Shared marker & popup builders ───────────────────────────────────────────
// Single source of truth for both prop-driven and viewport markers.

interface MarkerElementOptions {
    priceText: string
    shortName: string
    starRating?: number | string
    overallRating?: number
    isHovered?: boolean
    isVerified?: boolean
    isB2b?: boolean
    isAirbnb?: boolean
    isRimigoInternal?: boolean
    getMarkerColor?: (r: number | undefined) => string
}

function buildMarkerElement(opts: MarkerElementOptions): HTMLDivElement {
    const {
        priceText, shortName, starRating, overallRating,
        isHovered = false, isVerified = false, isB2b = false, isAirbnb = false,
        isRimigoInternal = false,
    } = opts

    const markerBg = isHovered
        ? '#7011F6'
        : isRimigoInternal && isVerified ? '#ecfdf5'
        : isRimigoInternal && isB2b ? '#f5f3ff'
        : '#FFFFFF'

    const markerBorder = isHovered ? 'white'
        : isRimigoInternal && isVerified ? '#10b981'
        : isRimigoInternal && isB2b ? '#7c3aed'
        : isAirbnb ? '#FF385C'
        : '#747474'
    const borderWidth = (isRimigoInternal && (isVerified || isB2b)) || isAirbnb ? '2px' : '1px'
    const textColor = isHovered ? 'white' : '#101010'

    const el = document.createElement('div')
    el.className = 'accommodation-marker'
    el.style.cssText = `
        width:80px;background-color:${markerBg};border:${borderWidth} solid ${markerBorder};
        border-radius:8px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        transition:background-color 0.2s,border-color 0.2s,color 0.2s,box-shadow 0.2s;
        padding:3px 4px;font-family:'Red Hat Display',sans-serif;color:${textColor};
        box-sizing:border-box;line-height:1.2;
    `

    if (priceText) {
        const priceLine = document.createElement('div')
        priceLine.style.cssText = 'font-size:10px;font-weight:700;white-space:nowrap;'
        priceLine.textContent = priceText
        el.appendChild(priceLine)
    }

    const nameRow = document.createElement('div')
    nameRow.style.cssText = 'display:flex;align-items:center;gap:2px;max-width:72px;'
    const nameLine = document.createElement('div')
    nameLine.className = 'marker-name'
    nameLine.style.cssText = `font-size:8px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${isHovered ? 'rgba(255,255,255,0.8)' : '#6b7280'};`
    nameLine.textContent = shortName
    nameRow.appendChild(nameLine)
    if (isVerified) {
        const badgeImg = document.createElement('img')
        badgeImg.src = 'https://media.rimigo.com/1776327515732_verified_badge.svg'
        badgeImg.alt = 'Verified'
        badgeImg.style.cssText = 'width:10px;height:10px;flex-shrink:0;'
        nameRow.appendChild(badgeImg)
    }
    if (isAirbnb) {
        const airbnbImg = document.createElement('img')
        airbnbImg.src = 'https://cdn.brandfetch.io/idkuvXnjOH/theme/dark/symbol.svg'
        airbnbImg.alt = 'Airbnb'
        airbnbImg.style.cssText = 'width:8px;height:8px;flex-shrink:0;'
        nameRow.appendChild(airbnbImg)
    }
    el.appendChild(nameRow)

    if (starRating && Number(starRating) > 0) {
        const starsLine = document.createElement('div')
        starsLine.className = 'marker-stars'
        const count = Math.min(5, Math.round(Number(starRating)))
        starsLine.style.cssText = `font-size:8px;line-height:1;color:${isHovered ? '#fcd34d' : '#f59e0b'};letter-spacing:-1px;`
        starsLine.textContent = '★'.repeat(count)
        el.appendChild(starsLine)
    }

    if (overallRating && overallRating > 0 && overallRating < 5.0) {
        el.style.overflow = 'visible'
        const ratingBadge = document.createElement('div')
        ratingBadge.className = 'marker-rating'
        ratingBadge.style.cssText = `
            position:absolute;top:-6px;right:-6px;min-width:22px;height:16px;
            background:#059669;color:white;font-size:9px;font-weight:700;border-radius:8px;
            display:flex;align-items:center;justify-content:center;padding:0 4px;
            border:1.5px solid white;z-index:5;box-shadow:0 1px 3px rgba(5,150,105,0.3);line-height:1;
        `
        ratingBadge.textContent = Number(overallRating).toFixed(1)
        el.appendChild(ratingBadge)
    }

    if (isRimigoInternal && isVerified && isB2b) {
        el.style.overflow = 'visible'
        const b2bDot = document.createElement('div')
        b2bDot.style.cssText = `
            position:absolute;top:-4px;right:-4px;width:10px;height:10px;
            background-color:#7c3aed;border-radius:50%;border:1.5px solid white;
            z-index:4;box-shadow:0 1px 2px rgba(124,58,237,0.4);
        `
        el.appendChild(b2bDot)
    }

    return el
}

interface PopupCardOptions {
    name: string
    images: string[]
    price: string
    starRating?: number | string
    reviewScore?: number
    hubId: string
    accommodationId: string
    // Navigation
    cityId?: string
    cityName?: string
    checkIn?: string
    checkOut?: string
    travelPurpose?: string
    groupType?: string
    preferences?: string[]
    reviewType?: string
    guestsData?: { adults?: number; children?: number; infants?: number; children_age?: number[] }
    isVerified?: boolean
    isB2bDealAvailable?: boolean
    isAvailableOnAirbnb?: boolean
    // Actions
    onClose: () => void
    onNavigate?: (hubId: string) => void
    onMarkerClick?: (id: string) => void
    onAddToCollection?: (accId: string, extras?: AddToCollectionExtras) => void
    onShortlistToggle?: (hubId: string, accId: string) => void
    isShortlisted?: boolean
    trackButtonClickCustom?: (opts: any) => void
    buttonPage?: string
}

function buildPopupCard(opts: PopupCardOptions): HTMLDivElement {
    const {
        name, images, price, starRating, reviewScore, hubId, accommodationId,
        cityId, cityName, checkIn, checkOut, travelPurpose, groupType, preferences,
        reviewType, guestsData, isVerified, isB2bDealAvailable = false, isAvailableOnAirbnb = false,
        onClose, onMarkerClick, onAddToCollection, onShortlistToggle: _onShortlistToggle, isShortlisted = false,
        trackButtonClickCustom, buttonPage
    } = opts
    // `onShortlistToggle` is retained on the interface for callers that still
    // pass it, but the map card no longer renders a standalone shortlist
    // button — the heart now triggers add-to-collection instead.
    void _onShortlistToggle

    const popupCard = document.createElement('div')
    popupCard.className = 'map-popup-card'
    popupCard.style.cssText = `
        position:absolute;width:240px;background:white;border-radius:12px;
        box-shadow:0 8px 24px rgba(0,0,0,0.15);overflow:hidden;z-index:10000;
        pointer-events:auto;font-family:'Red Hat Display',sans-serif;
    `

    // ── Image section with carousel ──
    const imageSection = document.createElement('div')
    imageSection.style.cssText = 'position:relative;width:100%;height:120px;overflow:hidden;background:#f5f5f5;'

    const popupImages = images.slice(0, 5)
    if (popupImages.length > 1) {
        let imgIdx = 0
        const track = document.createElement('div')
        track.style.cssText = 'display:flex;height:100%;transition:transform 0.3s ease;'
        popupImages.forEach((url, i) => {
            const img = document.createElement('img')
            img.src = url
            img.alt = `${name} ${i + 1}`
            img.style.cssText = 'width:240px;height:100%;object-fit:cover;flex-shrink:0;'
            img.loading = i === 0 ? 'eager' : 'lazy'
            img.onerror = () => { img.style.display = 'none' }
            track.appendChild(img)
        })
        imageSection.appendChild(track)

        // Dot indicators
        const dotsRow = document.createElement('div')
        dotsRow.style.cssText = 'position:absolute;bottom:6px;left:50%;transform:translateX(-50%);display:flex;gap:3px;'
        const dots: HTMLElement[] = []
        popupImages.forEach((_, i) => {
            const dot = document.createElement('span')
            dot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${i === 0 ? 'white' : 'rgba(255,255,255,0.5)'};transition:background 0.2s;`
            dots.push(dot)
            dotsRow.appendChild(dot)
        })
        imageSection.appendChild(dotsRow)

        const updateCarousel = () => {
            track.style.transform = `translateX(-${imgIdx * 240}px)`
            dots.forEach((d, i) => { d.style.background = i === imgIdx ? 'white' : 'rgba(255,255,255,0.5)' })
        }

        // Arrow buttons — always visible on mobile (no hover), hover-reveal on desktop
        const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
        const initialOpacity = isMobileViewport ? '1' : '0'
        const arrStyle = `position:absolute;top:50%;transform:translateY(-50%);width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.8);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:${initialOpacity};transition:opacity 0.2s;z-index:3;`
        const leftArr = document.createElement('button')
        leftArr.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>'
        leftArr.style.cssText = arrStyle + 'left:6px;'
        leftArr.onclick = (e) => { e.stopPropagation(); if (imgIdx > 0) { imgIdx--; updateCarousel() } }
        const rightArr = document.createElement('button')
        rightArr.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>'
        rightArr.style.cssText = arrStyle + 'right:6px;'
        rightArr.onclick = (e) => { e.stopPropagation(); if (imgIdx < popupImages.length - 1) { imgIdx++; updateCarousel() } }
        imageSection.appendChild(leftArr)
        imageSection.appendChild(rightArr)
        if (!isMobileViewport) {
            imageSection.onmouseenter = () => { leftArr.style.opacity = '1'; rightArr.style.opacity = '1' }
            imageSection.onmouseleave = () => { leftArr.style.opacity = '0'; rightArr.style.opacity = '0' }
        }
    } else if (popupImages[0]) {
        const img = document.createElement('img')
        img.src = popupImages[0]
        img.alt = name
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;'
        img.onerror = () => { img.style.display = 'none' }
        imageSection.appendChild(img)
    }

    // ── Close button (top-right) ──
    const closeBtn = document.createElement('button')
    closeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M13 1L1 13M1 1L13 13" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>'
    closeBtn.style.cssText = 'position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,0.5);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;z-index:2;'
    closeBtn.onmouseover = () => { closeBtn.style.background = 'rgba(0,0,0,0.7)' }
    closeBtn.onmouseout = () => { closeBtn.style.background = 'rgba(0,0,0,0.5)' }
    closeBtn.onclick = (e) => { e.stopPropagation(); onClose() }
    imageSection.appendChild(closeBtn)

    // ── Action button (top-left): Add-to-tripboard, rendered as a heart ──
    // The dedicated shortlist-toggle button has been removed; the single
    // heart now simply triggers the add-to-collection flow. `isShortlisted`
    // drives its filled/outline state so the visual still reflects whether
    // the stay is already in the tripboard.
    const actionBtnStyle = 'width:28px;height:28px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.8);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;padding:0;'
    const actionRow = document.createElement('div')
    actionRow.style.cssText = 'position:absolute;top:8px;left:8px;display:flex;gap:6px;'

    if (onAddToCollection && accommodationId) {
        const addBtn = document.createElement('button')
        const fill = isShortlisted ? '#7011F6' : 'none'
        const stroke = isShortlisted ? '#7011F6' : 'white'
        addBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
        addBtn.title = 'Add to tripboard'
        addBtn.style.cssText = actionBtnStyle + (isShortlisted ? 'background:white;' : 'background:rgba(0,0,0,0.45);')
        addBtn.onmouseover = () => { if (!isShortlisted) addBtn.style.background = 'rgba(0,0,0,0.7)' }
        addBtn.onmouseout = () => { if (!isShortlisted) addBtn.style.background = 'rgba(0,0,0,0.45)' }
        addBtn.onclick = (e) => {
            e.stopPropagation()
            onAddToCollection(accommodationId, {
                name,
                zentrumHubId: hubId,
                imageUrl: images[0],
                isVerified,
                isB2bDealAvailable,
            })
        }
        actionRow.appendChild(addBtn)
    }

    if (actionRow.childNodes.length > 0) {
        imageSection.appendChild(actionRow)
    }

    popupCard.appendChild(imageSection)

    // ── Content section ──
    const contentSection = document.createElement('div')
    contentSection.style.cssText = 'padding:12px;'

    // Name
    const nameWrap = document.createElement('div')
    nameWrap.style.cssText = 'display:flex;align-items:flex-start;gap:4px;margin:0 0 6px;'
    const nameEl = document.createElement('h3')
    nameEl.textContent = name
    nameEl.style.cssText = 'margin:0;font-size:14px;font-weight:700;color:#101010;font-family:\'Red Hat Display\',sans-serif;line-height:1.3;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;'
    nameWrap.appendChild(nameEl)
    if (isVerified) {
        const badgeImg = document.createElement('img')
        badgeImg.src = 'https://media.rimigo.com/1776327515732_verified_badge.svg'
        badgeImg.alt = 'Verified'
        badgeImg.style.cssText = 'width:14px;height:14px;flex-shrink:0;margin-top:2px;'
        nameWrap.appendChild(badgeImg)
    }

    // Ratings row
    if (starRating || (reviewScore && reviewScore > 0)) {
        const ratingsRow = document.createElement('div')
        ratingsRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;'
        if (starRating) {
            const stars = document.createElement('span')
            stars.textContent = '★'.repeat(Math.min(5, Math.round(Number(starRating))))
            stars.style.cssText = 'font-size:12px;color:#f59e0b;'
            ratingsRow.appendChild(stars)
        }
        if (reviewScore && typeof reviewScore === 'number' && reviewScore > 0) {
            const badge = document.createElement('span')
            badge.textContent = reviewScore.toFixed(1)
            badge.style.cssText = 'font-size:11px;font-weight:600;color:#059669;background:#ecfdf5;padding:2px 6px;border-radius:4px;'
            ratingsRow.appendChild(badge)
        }
        contentSection.appendChild(ratingsRow)
    }

    // Price + arrow row
    const priceRow = document.createElement('div')
    priceRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;'

    const priceEl = document.createElement('div')
    if (price && price !== '—') {
        priceEl.textContent = price
        priceEl.style.cssText = 'font-size:16px;font-weight:700;color:#101010;'
    } else {
        priceEl.innerHTML = '<div style="display:flex;align-items:center;gap:6px"><div style="width:10px;height:10px;border:2px solid #d1d5db;border-top-color:#6b7280;border-radius:50%;animation:spin 0.8s linear infinite"></div><span style="font-size:12px;color:#6b7280">Loading price...</span></div>'
        if (!document.getElementById('map-spinner-style')) {
            const style = document.createElement('style')
            style.id = 'map-spinner-style'
            style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}'
            document.head.appendChild(style)
        }
    }

    const arrowBtn = document.createElement('button')
    arrowBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'
    arrowBtn.style.cssText = 'width:32px;height:32px;border-radius:50%;background:#f3f4f6;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#374151;transition:background 0.2s;flex-shrink:0;'
    arrowBtn.onmouseover = () => { arrowBtn.style.background = '#e5e7eb' }
    arrowBtn.onmouseout = () => { arrowBtn.style.background = '#f3f4f6' }
    arrowBtn.onclick = (e) => {
        e.stopPropagation()
        trackButtonClickCustom?.({
            buttonPage: buttonPage || 'Stays_map',
            buttonName: 'view_deal',
            buttonAction: 'hotel_detail_open',
            extra: { hotel_name: name, zentrum_hub_id: hubId, city_id: cityId, city_name: cityName, check_in: checkIn || '', check_out: checkOut || '', travel_purpose: travelPurpose || '', group_type: groupType || '', review_type: reviewType || 'complete' }
        })
        if (hubId && cityId && cityName) {
            const sp = new URLSearchParams({
                hotel_name: name, zentrum_hub_id: hubId, city_id: cityId,
                check_in: checkIn || '', check_out: checkOut || '', city_name: cityName,
                travel_purpose: travelPurpose || '', group_type: groupType || '',
                city_prefs: preferences?.join(',') || '', review_type: reviewType || 'complete',
                accommodation_id: accommodationId
            })
            if (guestsData) {
                const { adults, children, infants, children_age } = guestsData
                if (typeof adults === 'number') sp.set('adults', String(adults))
                if (typeof children === 'number') sp.set('children', String(children))
                if (typeof infants === 'number') sp.set('infants', String(infants))
                if (children_age?.length) sp.set('children_age', children_age.join(','))
            }
            window.open(`/stays/${hubId}?${sp.toString()}`, '_blank')
        } else {
            onMarkerClick?.(hubId)
        }
    }

    priceRow.appendChild(priceEl)
    priceRow.appendChild(arrowBtn)

    contentSection.appendChild(nameWrap)
    if (isAvailableOnAirbnb) {
        const airbnbRow = document.createElement('div')
        airbnbRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:2px;margin-bottom:4px;'
        airbnbRow.innerHTML = `<span style="font-size:11px;font-weight:500;color:#6b7280;font-family:Manrope,sans-serif;">Available on</span><img src="https://cdn.brandfetch.io/idkuvXnjOH/theme/dark/symbol.svg" alt="Airbnb" style="width:10px;height:10px;flex-shrink:0;" /><span style="font-size:11px;font-weight:700;color:#FF385C;font-family:'Red Hat Display',sans-serif;letter-spacing:0.02em;">AIRBNB</span>`
        contentSection.appendChild(airbnbRow)
    }
    contentSection.appendChild(priceRow)

    popupCard.appendChild(contentSection)

    return popupCard
}

// ─── End shared builders ──────────────────────────────────────────────────────

const StaysMap = ({
    cityName,
    cityCenter = null,
    cityCenterLoading = false,
    accommodations = [],
    hoveredAccommodationId,
    onMarkerClick,
    cityId,
    checkIn,
    checkOut,
    travelPurpose,
    groupType,
    preferences,
    guestsData,
    reviewType,
    isExpanded = false,
    onExpandChange,
    fetchViewportStays,
    buttonPage = 'Stays_map',
    shortlistState,
    shortlistLoadingIds: _shortlistLoadingIds,
    onShortlistToggle,
    onAddToCollection
}: StaysMapProps) => {
    const { isRimigoInternal } = useUserInfo()
    type VerificationFilter = 'all' | 'verified' | 'b2b' | 'both' | 'none'
    const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('all')
    const [verificationDropdownCollapsed, setVerificationDropdownCollapsed] = useState(true)
    /** Mapbox-geocoded fallback coords. Populated only when the backend city-center
     *  request has settled with no valid location. Never races with `cityCenter`. */
    const [fallbackCoords, setFallbackCoords] = useState<{ lon: number; lat: number } | null>(null)
    const [selectedBestAreaId, setSelectedBestAreaId] = useState<string>('')
    const [bestAreasCollapsed, setBestAreasCollapsed] = useState(true)
    const [areaDetailsExpanded, setAreaDetailsExpanded] = useState(false)
    const [bestAreasData, setBestAreasData] = useState<{
        geoJson: BestAreasGeoJSONResponse
        options: BestAreaOption[]
    } | null>(null)
    const [bestAreasLoading, setBestAreasLoading] = useState(false)
    const bestAreasOptionsRef = useRef<BestAreaOption[]>([])
    const bestAreasGeoJsonRef = useRef<GeoJSON.FeatureCollection | null>(null)
    const mapRef = useRef<HTMLDivElement | null>(null)
    const mapInstanceRef = useRef<mapboxgl.Map | null>(null)
    const markersRef = useRef<Map<string | number, mapboxgl.Marker>>(new Map())
    const markerElementsRef = useRef<Map<string | number, HTMLElement>>(new Map())
    const miniCardVisibilityRef = useRef<Map<string | number, boolean>>(new Map())
    const popupCardRef = useRef<HTMLElement | null>(null)
    const popupCardCoordinatesRef = useRef<{ lat: number; lng: number; accommodationId: string | number } | null>(null)
    const orbitAnimIdRef = useRef<number | null>(null)
    const isOrbitingRef = useRef<boolean>(false)
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const { trackButtonClickCustom } = usePostHog()

    // Defensive geo filter: drop stays whose lat/lng is missing, non-numeric, or
    // exactly 0 on either axis. Backend currently has many (0,0) records, and a
    // single bad row can drag the bounding-box center to the wrong place.
    // Remove once backend geo data is fully cleaned up.
    const geoValidAccommodations = useMemo(() => {
        if (!accommodations) return []
        return accommodations.filter((acc) => {
            const geo = acc.geo_location
            if (!geo) return false
            const lat = typeof geo.lat === 'number' ? geo.lat : parseFloat(geo.lat as unknown as string)
            const lng = typeof geo.long === 'number' ? geo.long : parseFloat(geo.long as unknown as string)
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
            if (lat === 0 || lng === 0) return false
            return true
        })
    }, [accommodations])

    const filteredAccommodations = useMemo(() => {
        if (verificationFilter === 'all') return geoValidAccommodations
        return geoValidAccommodations.filter((acc) => {
            const v = acc.is_verified === true
            const b = acc.is_b2b_deal_available === true
            if (verificationFilter === 'verified') return v && !b
            if (verificationFilter === 'b2b') return b && !v
            if (verificationFilter === 'both') return v && b
            if (verificationFilter === 'none') return !v && !b
            return true
        })
    }, [geoValidAccommodations, verificationFilter])

    // Fetch best areas for the current city
    useEffect(() => {
        if (!cityId || cityId === 'unknown') {
            setBestAreasData(null)
            setBestAreasLoading(false)
            return
        }
        let ignore = false
        setBestAreasLoading(true)
        getBestAreas(cityId)
            .then((data) => {
                if (ignore) return
                if (data.features && data.features.length > 0) {
                    setBestAreasData({
                        geoJson: data,
                        options: buildBestAreaOptionsFromResponse(data)
                    })
                } else {
                    setBestAreasData(null)
                }
            })
            .catch(() => {
                if (!ignore) setBestAreasData(null)
            })
            .finally(() => {
                if (!ignore) setBestAreasLoading(false)
            })
        return () => {
            ignore = true
        }
    }, [cityId])

    // Keep refs in sync for map event handlers and source data; clear selection if current area not in new options
    useEffect(() => {
        const options = bestAreasData?.options ?? []
        bestAreasOptionsRef.current = options
        bestAreasGeoJsonRef.current = bestAreasData?.geoJson ?? null
        if (selectedBestAreaId && options.length > 0 && !options.some((a) => a.id === selectedBestAreaId)) {
            setSelectedBestAreaId('')
        }
    }, [bestAreasData, selectedBestAreaId])

    // Update map best-areas source when API data arrives or is cleared
    useEffect(() => {
        const map = mapInstanceRef.current
        const source = map?.getSource?.('best-areas')
        if (!map || !source || source.type !== 'geojson') return
        const geo = bestAreasData?.geoJson ?? EMPTY_BEST_AREAS_GEOJSON
            ; (source as mapboxgl.GeoJSONSource).setData(geo as GeoJSON.FeatureCollection)
    }, [bestAreasData])

    // Get marker color based on rating (same as match label colors)
    const getMarkerColor = (rating: number | undefined): string => {
        if (!rating) return '#7011F6' // Default primary purple

        const percentage = (rating / 10) * 100

        if (percentage > 90) {
            return '#7011F6' // primary-default - Recommended
        } else if (percentage > 80) {
            return '#26BC6D' // secondary-green - Great Match
        } else if (percentage > 70) {
            return '#CDAE00' // secondary-yellow - Good Match
        } else if (percentage > 50) {
            return '#E55A34' // secondary-orange - Average Match
        } else {
            return '#E73434' // secondary-red - Avoid
        }
    }

    // Effective map center: cityCenter (backend) if available, otherwise Mapbox-geocoded
    // fallback. cityCenter always wins because fallbackCoords is only populated after
    // cityCenter resolves to null (see geocode effect below), so no race.
    const effectiveCenter = cityCenter ?? fallbackCoords

    // Mapbox geocoding fallback — ONLY fires once the backend city-center request has
    // settled (cityCenterLoading=false) AND returned no valid location (cityCenter=null).
    // This ordering prevents the historical "Interlaken → Oshawa" bug where Mapbox raced
    // the backend and won, resolving an ambiguous city name to the wrong country.
    useEffect(() => {
        if (cityCenter) return
        if (cityCenterLoading) return
        if (!MAPBOX_TOKEN || !cityName) return
        let ignore = false
        const fetchGeo = async () => {
            try {
                const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityName)}.json?limit=1&access_token=${MAPBOX_TOKEN}`
                const res = await fetch(url)
                if (!res.ok) {
                    const text = await res.text()
                    console.error('Mapbox geocode failed', res.status, text)
                    return
                }
                const data: any = await res.json()
                const feature = data?.features?.[0]
                if (!ignore && feature && Array.isArray(feature.center)) {
                    setFallbackCoords({ lon: feature.center[0], lat: feature.center[1] })
                }
            } catch (err) {
                console.error('Mapbox geocode error', err)
            }
        }
        fetchGeo()
        return () => { ignore = true }
    }, [cityName, cityCenter, cityCenterLoading])

    // Ref to capture the initial center for map creation. Once set, it's sticky —
    // map gets created at whichever center arrived first (cityCenter or fallback).
    const initialCenterRef = useRef<{ lon: number; lat: number } | null>(null)
    if (effectiveCenter && !initialCenterRef.current) {
        initialCenterRef.current = effectiveCenter
    }

    // Initialize map ONCE — never recreate on data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!mapRef.current) return
        if (!MAPBOX_TOKEN) return
        if (!initialCenterRef.current) return // Wait for first center
        if (mapInstanceRef.current) return

        mapboxgl.accessToken = MAPBOX_TOKEN

        const center = initialCenterRef.current
        const map = new mapboxgl.Map({
            container: mapRef.current,
            style: 'mapbox://styles/mapbox/standard',
            center: [center.lon, center.lat],
            zoom: 10,
            pitch: 45,
            bearing: 0,
            minZoom: 8,
            maxZoom: 18
        })

        map.boxZoom.disable()

        map.on('style.load', () => {
            try {
                map.setConfigProperty('basemap', 'lightPreset', 'standard')
            } catch { }

            // Run best-areas setup only once (style.load can fire again when we add source)
            if ((map as any)._staysBestAreasSetup) return
                ; (map as any)._staysBestAreasSetup = true

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

            // Ensure canvas is behind all other container children (controls, markers) so hotel pins stay visible
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
            const onMapMouseMove = (e: mapboxgl.MapMouseEvent) => {
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
            const onMapClick = (e: mapboxgl.MapMouseEvent) => {
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
            map.on('mousemove', onMapMouseMove)
            map.on('click', onMapClick)

                ; (map as any)._staysBestAreasCleanup = () => {
                    map.off('mousemove', onMapMouseMove)
                    map.off('click', onMapClick)
                    tooltipPopup.remove()
                }
        })

        map.on('error', (e) => {
            console.warn('Mapbox error', e?.error || e)
        })

        mapInstanceRef.current = map
        map.once('load', () => setMapReady(true))

        const resize = () => map.resize()
        window.addEventListener('resize', resize)

        // Observe container size changes for better resize handling
        let resizeObserver: ResizeObserver | null = null
        if (mapRef.current && 'ResizeObserver' in window) {
            resizeObserver = new ResizeObserver(() => {
                map.resize()
            })
            resizeObserver.observe(mapRef.current)
        }

        const id = setTimeout(resize, 150)
        return () => {
            clearTimeout(id)
            window.removeEventListener('resize', resize)
            if (resizeObserver) {
                resizeObserver.disconnect()
            }
            markersRef.current.forEach((marker) => marker.remove())
            markersRef.current.clear()
            markerElementsRef.current.clear()
            miniCardVisibilityRef.current.clear()
            // Remove popup card
            if (popupCardRef.current) {
                popupCardRef.current.remove()
                popupCardRef.current = null
            }
            popupCardCoordinatesRef.current = null
            if (orbitAnimIdRef.current) {
                cancelAnimationFrame(orbitAnimIdRef.current)
                orbitAnimIdRef.current = null
                isOrbitingRef.current = false
            }
            const bestAreasCleanup = (map as any)._staysBestAreasCleanup
            if (typeof bestAreasCleanup === 'function') bestAreasCleanup()
            map.remove()
            mapInstanceRef.current = null
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!effectiveCenter])

    // Viewport-based progressive loading: fetch stays on zoom/pan, add markers directly (no re-render)
    const viewportMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
    const viewportFetchControllerRef = useRef<AbortController | null>(null)
    const viewportSeenIdsRef = useRef<Set<string>>(new Set())
    const [viewportMarkerCount, setViewportMarkerCount] = useState(0)
    const [viewportLoading, setViewportLoading] = useState(false)
    const [mapReady, setMapReady] = useState(false)

    // Clear viewport markers when accommodations change (e.g. filter applied)
    // so stale unfiltered viewport markers don't linger on the map
    const accKeyRef = useRef('')
    useEffect(() => {
        const key = accommodations.map((a) => String(a.id)).sort().join(',')
        if (accKeyRef.current === key) return
        const isInitial = accKeyRef.current === ''
        accKeyRef.current = key

        // Skip first load — only clear on subsequent changes (filter/sort)
        if (isInitial) return

        viewportMarkersRef.current.forEach((m) => m.remove())
        viewportMarkersRef.current.clear()
        viewportSeenIdsRef.current.clear()
        setViewportMarkerCount(0)
    }, [accommodations])

    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map || !mapReady || !fetchViewportStays) return

        let debounceTimer: ReturnType<typeof setTimeout> | null = null

        const onMoveEnd = () => {
            if (debounceTimer) clearTimeout(debounceTimer)
            debounceTimer = setTimeout(async () => {
                const mapBounds = map.getBounds()
                if (!mapBounds) return
                const viewport = {
                    north: mapBounds.getNorth(),
                    south: mapBounds.getSouth(),
                    east: mapBounds.getEast(),
                    west: mapBounds.getWest()
                }

                // Skip if viewport is too large (> ~80km)
                if (Math.abs(viewport.north - viewport.south) > 0.72) return
                if (Math.abs(viewport.east - viewport.west) > 0.72) return

                if (viewportFetchControllerRef.current) viewportFetchControllerRef.current.abort()
                const controller = new AbortController()
                viewportFetchControllerRef.current = controller

                setViewportLoading(true)
                try {
                    const stays = await fetchViewportStays(viewport)
                    if (controller.signal.aborted) return

                    // Add markers for truly new stays (not already on map)
                    stays.forEach((stay) => {
                        const hubId = stay.zentrum_hub_id || stay.id
                        if (!hubId) return
                        // Skip if already a prop-driven marker or previous viewport marker
                        if (markersRef.current.has(hubId) || viewportMarkersRef.current.has(hubId) || viewportSeenIdsRef.current.has(hubId)) return
                        viewportSeenIdsRef.current.add(hubId)

                        const geo = stay.geo_location
                        if (!geo?.lat || !geo?.long) return
                        const lat = parseFloat(geo.lat)
                        const lng = parseFloat(geo.long)
                        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
                        // Defensive: drop (0,0) or lat=0 / lng=0 stays — bad backend data
                        if (lat === 0 || lng === 0) return

                        const rate = stay.rate_per_night
                        const priceText = rate && rate > 0 ? `₹ ${Math.round(rate).toLocaleString()}` : ''

                        const el = buildMarkerElement({
                            priceText,
                            shortName: (stay.name || 'Hotel').slice(0, 14),
                            starRating: (stay as any).star_rating || (stay as any).starRating,
                            overallRating: stay.overall_rating || (stay as any).review_data?.overall_score,
                            isAirbnb: shouldShowAirbnb(isRimigoInternal, (stay as any).is_available_on_airbnb === true),
                            isRimigoInternal,
                        })

                        el.addEventListener('click', (e) => {
                            e.stopPropagation()
                            if (popupCardRef.current) { popupCardRef.current.remove(); popupCardRef.current = null }
                            if (!mapRef.current || !mapInstanceRef.current) return

                            // `stay.id` is the zentrum_hub_id fallback (see hubId above),
                            // so never use it as an accommodation_id fallback — that would
                            // send the hub id to /sections/ instead of the Mongo accommodation id.
                            const vpAccId = (stay as any).accommodation_id || ''
                            const popupCard = buildPopupCard({
                                name: stay.name || 'Hotel',
                                images: Array.isArray(stay.content) ? stay.content : [],
                                price: rate && rate > 0 ? `₹ ${Math.round(rate).toLocaleString()}` : '',
                                starRating: (stay as any).star_rating || (stay as any).starRating,
                                reviewScore: stay.overall_rating || (stay as any).review_data?.overall_score,
                                hubId,
                                accommodationId: vpAccId,
                                cityId, cityName, checkIn, checkOut, travelPurpose, groupType, preferences, reviewType, guestsData,
                                isVerified: (stay as any).is_verified === true,
                                isB2bDealAvailable: (stay as any).is_b2b_deal_available === true,
                                isAvailableOnAirbnb: shouldShowAirbnb(isRimigoInternal, (stay as any).is_available_on_airbnb === true),
                                onClose: () => { popupCardRef.current?.remove(); popupCardRef.current = null; popupCardCoordinatesRef.current = null },
                                onMarkerClick, onAddToCollection, onShortlistToggle,
                                isShortlisted: shortlistState?.[hubId]?.isShortlisted ?? false,
                                trackButtonClickCustom, buttonPage,
                            })

                            mapRef.current!.appendChild(popupCard)
                            popupCardRef.current = popupCard
                            popupCardCoordinatesRef.current = { lat, lng, accommodationId: hubId }

                            const point = mapInstanceRef.current!.project([lng, lat])
                            const mapRect = mapRef.current!.getBoundingClientRect()
                            popupCard.style.left = `${Math.max(10, Math.min(point.x - 120, mapRect.width - 250))}px`
                            popupCard.style.top = `${Math.max(10, Math.min(point.y - 250, mapRect.height - 210))}px`
                        })

                        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
                            .setLngLat([lng, lat])
                            .addTo(map)

                        viewportMarkersRef.current.set(hubId, marker)
                    })

                    // Update count
                    setViewportMarkerCount(viewportMarkersRef.current.size)
                } catch {
                    // Ignore abort/network errors
                } finally {
                    if (!controller.signal.aborted) setViewportLoading(false)
                }
            }, 600)
        }

        map.on('moveend', onMoveEnd)
        return () => {
            map.off('moveend', onMoveEnd)
            if (debounceTimer) clearTimeout(debounceTimer)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchViewportStays, onMarkerClick, mapReady])

    // When user selects a best area from dropdown: fly map to that area and highlight it
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map || !map.getLayer('best-areas-highlighted')) return

        const options = bestAreasOptionsRef.current
        if (selectedBestAreaId) {
            const area = options.find((a) => a.id === selectedBestAreaId)
            if (area && Array.isArray(area.bbox) && area.bbox.length === 4) {
                const [west, south, east, north] = area.bbox
                if ([west, south, east, north].every((n) => Number.isFinite(n))) {
                    map.fitBounds(
                        [
                            [west, south],
                            [east, north]
                        ],
                        { padding: 80, duration: 800, maxZoom: 14 }
                    )
                    map.setFilter('best-areas-highlighted', ['==', ['get', 'id'], selectedBestAreaId])
                }
            }
        } else {
            map.setFilter('best-areas-highlighted', ['in', ['get', 'id'], ['literal', []]])
        }
    }, [selectedBestAreaId, bestAreasData])

    // When the effective center changes (city switched, or fallback coords arrive
    // after cityCenter resolved to null), clear stale markers and fly the existing
    // map instance to the new center.
    const flownCenterRef = useRef<string>('')
    useEffect(() => {
        if (!effectiveCenter) return
        const key = `${effectiveCenter.lon},${effectiveCenter.lat}`
        if (flownCenterRef.current === key) return

        // First commit: the map-init effect already creates the map at this center.
        const isFirstCommit = flownCenterRef.current === ''
        flownCenterRef.current = key
        if (isFirstCommit) return

        // Reset city-switched viewport markers before flying
        viewportMarkersRef.current.forEach((m) => m.remove())
        viewportMarkersRef.current.clear()
        viewportSeenIdsRef.current.clear()
        setViewportMarkerCount(0)
        setSelectedBestAreaId('')

        if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo({
                center: [effectiveCenter.lon, effectiveCenter.lat],
                zoom: 10,
                duration: 1200
            })
        }
    }, [effectiveCenter])

    // Fit-bounds-to-markers disabled on initial load.
    // Previously this effect animated the map to encompass every accommodation
    // marker after stays arrived, which re-centered the map away from the
    // searched city whenever stays included distant-but-legitimate outliers
    // (e.g. Disneyland Paris hotels ~30 km east of Paris). The map now stays
    // at the geocoded/centroid-based center chosen at init; users pan to
    // explore outliers.

    // Update markers incrementally
    useEffect(() => {
        if (!mapInstanceRef.current) return

        // Listen for external focus requests to simulate marker click
        const onFocus = (e: Event) => {
            const ce = e as CustomEvent<{ id: string | number }>
            const markerId = ce.detail && (ce as any).detail?.id
            if (markerId == null) return
            const el = markerElementsRef.current.get(String(markerId))
            if (el) {
                // simulate user click on marker element to reuse existing logic
                el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
            }
        }
        window.addEventListener('stays:focusMarker' as any, onFocus as EventListener)

        const currentAccommodationIds = new Set(filteredAccommodations.map((acc) => String(acc.id)))
        const existingMarkerIds = new Set(markersRef.current.keys())

        // Helper function to update popup card position based on map coordinates
        const updatePopupPosition = () => {
            if (!mapInstanceRef.current || !mapRef.current || !popupCardRef.current || !popupCardCoordinatesRef.current) return

            const { lat, lng } = popupCardCoordinatesRef.current
            // Convert lat/lng to pixel coordinates
            const point = mapInstanceRef.current.project([lng, lat])
            const mapRect = mapRef.current.getBoundingClientRect()

            // Position popup above the marker
            const popupWidth = 240 // Card width (smaller)
            const popupHeight = 200 // Approximate card height (smaller)
            const markerOffsetY = 50 // Marker height (26px) + spacing to ensure it's above

            const left = point.x - popupWidth / 2
            const top = point.y - popupHeight - markerOffsetY

            // Ensure popup stays within map bounds
            const boundedLeft = Math.max(10, Math.min(left, mapRect.width - popupWidth - 10))
            const boundedTop = Math.max(10, Math.min(top, mapRect.height - popupHeight - 10))

            popupCardRef.current.style.left = `${boundedLeft}px`
            popupCardRef.current.style.top = `${boundedTop}px`
        }

        // Update popup position when map moves/zooms
        const updatePopupOnMapMove = () => {
            updatePopupPosition()
        }

        // Add map event listeners for popup positioning
        if (mapInstanceRef.current) {
            mapInstanceRef.current.on('move', updatePopupOnMapMove)
            mapInstanceRef.current.on('zoom', updatePopupOnMapMove)
        }

        // Remove markers that are no longer in accommodations list
        existingMarkerIds.forEach((id) => {
            if (!currentAccommodationIds.has(String(id))) {
                const marker = markersRef.current.get(id)
                if (marker) {
                    marker.remove()
                    markersRef.current.delete(id)
                    markerElementsRef.current.delete(id)
                    miniCardVisibilityRef.current.delete(id)
                    // Hide popup if it's for this marker
                    if (popupCardCoordinatesRef.current?.accommodationId === id) {
                        if (popupCardRef.current) {
                            popupCardRef.current.remove()
                            popupCardRef.current = null
                        }
                        popupCardCoordinatesRef.current = null
                    }
                }
            }
        })

        // Add or update markers (use filtered list)
        const filteredIds = new Set(filteredAccommodations.map((a) => String(a.id)))
        filteredAccommodations.forEach((acc) => {
            if (!acc.geo_location?.lat || !acc.geo_location?.long) return

            // Parse coordinates - Mapbox expects [longitude, latitude] format
            // Note: The data fields might have coordinates swapped (lat field contains lng, long field contains lat)
            let lat = parseFloat(acc.geo_location.lat)
            let lng = parseFloat(acc.geo_location.long)

            if (isNaN(lat) || isNaN(lng)) return

            // Swap coordinates only if they are clearly in wrong order (outside valid ranges)
            // We don't use heuristics like comparing absolute values because:
            // - European cities often have lat > lng (e.g., London: lat~51.5, lng~-0.1)
            // - Asian cities often have lng > lat (e.g., Tokyo: lat~35, lng~139)
            // Only swap when coordinates are definitively out of valid ranges
            const shouldSwap = Math.abs(lat) > 90 || Math.abs(lng) > 180

            if (shouldSwap) {
                ;[lat, lng] = [lng, lat]
            }

            // Ensure coordinates are clamped to valid ranges
            const finalLat = Math.max(-90, Math.min(90, lat))
            const finalLng = Math.max(-180, Math.min(180, lng))

            const markerKey = String(acc.id)
            const isVisible = filteredIds.has(markerKey)
            const existingMarker = markersRef.current.get(markerKey)
            const existingElement = markerElementsRef.current.get(markerKey)

            // If marker exists, update its style, position, and visibility
            if (existingMarker && existingElement) {
                existingElement.style.display = isVisible ? 'flex' : 'none'
                if (!isVisible) return
                const isHovered = hoveredAccommodationId === acc.id
                const isVerifiedExisting = isRimigoInternal && acc.is_verified === true
                const isB2bExisting = isRimigoInternal && acc.is_b2b_deal_available === true
                const isAirbnbExisting = shouldShowAirbnb(isRimigoInternal, acc.is_available_on_airbnb === true)
                const markerColor = isHovered ? getMarkerColor(acc.overall_rating) : (isVerifiedExisting ? '#ecfdf5' : isB2bExisting ? '#f5f3ff' : '#FFFFFF')
                const textColor = isHovered ? 'white' : '#101010'

                existingMarker.setLngLat([finalLng, finalLat])

                existingElement.style.backgroundColor = markerColor
                existingElement.style.borderColor = isHovered ? 'white' : (isVerifiedExisting ? '#10b981' : isB2bExisting ? '#7c3aed' : isAirbnbExisting ? '#FF385C' : '#747474')
                existingElement.style.color = textColor
                existingElement.style.zIndex = isHovered ? '1000' : '1'

                // Update name line color on hover
                const nameEl = existingElement.querySelector('.marker-name') as HTMLElement
                if (nameEl) {
                    nameEl.style.color = isHovered ? 'rgba(255,255,255,0.8)' : '#6b7280'
                }
                const starsEl = existingElement.querySelector('.marker-stars') as HTMLElement
                if (starsEl) {
                    starsEl.style.color = isHovered ? '#fcd34d' : '#f59e0b'
                }
                return
            }

            // Create new marker
            const isHovered = hoveredAccommodationId != null && String(hoveredAccommodationId) === markerKey
            const formattedPrice = acc.rate_per_night ? `₹ ${Math.round(acc.rate_per_night).toLocaleString()}` : ''

            const el = buildMarkerElement({
                priceText: formattedPrice,
                shortName: (acc.name || 'Hotel').slice(0, 14),
                starRating: acc.star_rating,
                overallRating: acc.overall_rating,
                isHovered,
                isVerified: acc.is_verified === true,
                isB2b: acc.is_b2b_deal_available === true,
                isAirbnb: shouldShowAirbnb(isRimigoInternal, acc.is_available_on_airbnb === true),
                isRimigoInternal,
                getMarkerColor,
            })

            const hidePopupCard = () => {
                if (popupCardRef.current) {
                    popupCardRef.current.remove()
                    popupCardRef.current = null
                }
                popupCardCoordinatesRef.current = null
            }

            // Click handler: toggle popup + zoom
            el.addEventListener('click', (e) => {
                e.stopPropagation()

                if (popupCardCoordinatesRef.current?.accommodationId === acc.id && popupCardRef.current) {
                    hidePopupCard()
                    return
                }

                if (!mapRef.current || !mapInstanceRef.current) return
                hidePopupCard()

                const accId = acc.accommodation_id || String(acc.id)
                const hubId = acc.zentrum_hub_id || ''

                const popupCard = buildPopupCard({
                    name: acc.name,
                    images: acc.content || [],
                    price: acc.rate_per_night ? `₹ ${Math.round(acc.rate_per_night).toLocaleString()}` : '—',
                    starRating: acc.star_rating,
                    reviewScore: acc.overall_rating,
                    hubId,
                    accommodationId: accId,
                    cityId, cityName, checkIn, checkOut, travelPurpose, groupType, preferences, reviewType, guestsData,
                    isVerified: acc.is_verified === true,
                    isB2bDealAvailable: acc.is_b2b_deal_available === true,
                    isAvailableOnAirbnb: shouldShowAirbnb(isRimigoInternal, acc.is_available_on_airbnb === true),
                    onClose: hidePopupCard,
                    onMarkerClick, onAddToCollection, onShortlistToggle,
                    isShortlisted: shortlistState?.[hubId]?.isShortlisted ?? false,
                    trackButtonClickCustom, buttonPage,
                })

                mapRef.current.appendChild(popupCard)
                popupCardRef.current = popupCard
                popupCardCoordinatesRef.current = { lat: finalLat, lng: finalLng, accommodationId: acc.id }
                updatePopupPosition()

                // Hide popup when clicking outside
                const hideOnOutsideClick = (event: MouseEvent) => {
                    if (popupCard && !popupCard.contains(event.target as Node) && !el.contains(event.target as Node)) {
                        hidePopupCard()
                        document.removeEventListener('click', hideOnOutsideClick)
                    }
                }
                setTimeout(() => document.addEventListener('click', hideOnOutsideClick), 100)

                // Zoom to marker
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo({
                        center: [finalLng, finalLat],
                        zoom: 16,
                        pitch: mapInstanceRef.current.getPitch(),
                        bearing: mapInstanceRef.current.getBearing(),
                        duration: 1100,
                        essential: true,
                        padding: { top: 80, bottom: 80, left: 80, right: 80 }
                    })
                }
            })

            const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
                .setLngLat([finalLng, finalLat])
                .addTo(mapInstanceRef.current!)

            markersRef.current.set(markerKey, marker)
            markerElementsRef.current.set(markerKey, el)
        })
        return () => {
            window.removeEventListener('stays:focusMarker' as any, onFocus as EventListener)
            // Remove map event listeners
            if (mapInstanceRef.current) {
                mapInstanceRef.current.off('move', updatePopupOnMapMove)
                mapInstanceRef.current.off('zoom', updatePopupOnMapMove)
            }
            // Clean up popup card
            if (popupCardRef.current) {
                popupCardRef.current.remove()
                popupCardRef.current = null
            }
            popupCardCoordinatesRef.current = null
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accommodations, filteredAccommodations, hoveredAccommodationId, onMarkerClick])

    const handleExpandClick = useCallback(() => {
        const nextState = !isExpanded
        trackButtonClickCustom?.({
            buttonPage: buttonPage,
            buttonName: 'map',
            buttonAction: nextState ? 'expand' : 'collapse',
            extra: {
                city_id: cityId
            }
        })
        onExpandChange?.(nextState)
    }, [isExpanded, onExpandChange, cityId])

    // Resize map when expansion state changes - resize multiple times during transition for smooth effect
    useEffect(() => {
        if (mapInstanceRef.current && mapRef.current) {
            // Resize immediately to prevent blank screen
            mapInstanceRef.current.resize()

            // Resize at multiple intervals during the transition for smooth rendering
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

            // Final resize after transition completes
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
            className="lg:sticky lg:top-20 h-[70vh] md:h-[60vh] lg:h-[calc(100vh-8rem)] overflow-hidden  bg-natural-white relative transition-all duration-300 ease-in-out w-full"
            style={{
                willChange: 'width', // Optimize for smooth transitions
                backfaceVisibility: 'hidden', // Prevent flickering
                transform: 'translateZ(0)' // Force hardware acceleration
            }}>
            {/* Expand/Collapse Button */}
            <button
                onClick={handleExpandClick}
                className="cursor-pointer absolute top-3 left-3 flex items-center justify-center w-8 h-8 rounded-md bg-white/90 backdrop-blur-sm border border-gray-200/60 shadow-sm hover:bg-white hover:shadow-md transition-all duration-200 group"
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

            {/* Top toolbar — keeps the verification + best-areas chips in a single
                flex row (no overlap) and stacks above the "Why area?" panel below. */}
            <div className="absolute top-3 left-14 z-[1010] flex items-start gap-2 max-w-[calc(100%-4.5rem)]">

            {/* Verification filter — single button with dropdown (Best Areas style) */}
            {isRimigoInternal && accommodations && accommodations.some((a) => a.is_verified || a.is_b2b_deal_available) && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            const opening = verificationDropdownCollapsed
                            setVerificationDropdownCollapsed(!verificationDropdownCollapsed)
                            if (opening) {
                                setBestAreasCollapsed(true)
                                setAreaDetailsExpanded(false)
                            }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium font-manrope transition-all cursor-pointer whitespace-nowrap shadow-md border ${
                            verificationFilter !== 'all'
                                ? 'bg-white text-grey-0 border-emerald-500/50'
                                : 'bg-white text-grey-0 border-gray-200/80'
                        }`}
                        aria-expanded={!verificationDropdownCollapsed}>
                        <BadgeCheck className="w-3.5 h-3.5" style={{ color: verificationFilter !== 'all' ? '#059669' : '#6b7280' }} />
                        {verificationFilter === 'all' ? 'Filter stays' : verificationFilter === 'verified' ? 'Verified' : verificationFilter === 'b2b' ? 'B2B Deals' : 'Verified + B2B'}
                        <ChevronDown size={14} className={`shrink-0 text-grey-2 transition-transform ${!verificationDropdownCollapsed ? 'rotate-180' : ''}`} />
                    </button>
                    {!verificationDropdownCollapsed && (
                        <>
                            <div className="fixed inset-0 z-[1050]" onClick={() => setVerificationDropdownCollapsed(true)} />
                            <div className="absolute top-full left-0 mt-1.5 z-[1051] w-[180px] rounded-lg bg-white shadow-lg border border-feature-card-border overflow-hidden">
                                <p className="px-3 py-2 font-manrope text-[12px] font-semibold text-grey-1 border-b border-feature-card-border">
                                    Filter by status
                                </p>
                                <div className="py-0.5">
                                    {[
                                        { key: 'all' as VerificationFilter, label: 'Show all', icon: null, color: '#6b7280' },
                                        { key: 'verified' as VerificationFilter, label: 'Verified only', icon: BadgeCheck, color: '#059669' },
                                        ...(isRimigoInternal ? [
                                            { key: 'b2b' as VerificationFilter, label: 'B2B Deals only', icon: Zap, color: '#7c3aed' },
                                            { key: 'both' as VerificationFilter, label: 'Verified + B2B', icon: BadgeCheck, color: '#d97706' },
                                        ] : []),
                                    ].map(({ key, label, icon: Icon, color }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => {
                                                setVerificationFilter(key)
                                                setVerificationDropdownCollapsed(true)
                                            }}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                                                verificationFilter === key ? 'bg-grey-5' : 'hover:bg-grey-5'
                                            }`}>
                                            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />}
                                            {!Icon && <span className="w-3.5 h-3.5 shrink-0" />}
                                            <span className="font-manrope text-[12px] font-medium text-grey-0">
                                                {label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Best areas chip + dropdown */}
            {cityId && !bestAreasLoading && bestAreasData && bestAreasData.options.length > 0 && (
                <div className="relative min-w-0">
                    <button
                        type="button"
                        onClick={() => {
                            const nextState = !bestAreasCollapsed
                            trackButtonClickCustom?.({
                                buttonPage: buttonPage,
                                buttonName: 'best_areas',
                                buttonAction: nextState ? 'collapse' : 'expand',
                                extra: { city_id: cityId }
                            })
                            setBestAreasCollapsed(nextState)
                            if (!nextState) {
                                setVerificationDropdownCollapsed(true)
                                setAreaDetailsExpanded(false)
                            }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium font-manrope transition-all cursor-pointer whitespace-nowrap shadow-md border ${
                            selectedBestAreaId
                                ? 'bg-white text-grey-0 border-[#10b981]/50'
                                : 'bg-white text-grey-0 border-gray-200/80'
                        }`}
                        aria-expanded={!bestAreasCollapsed}>
                        <MapPin className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                        {selectedBestAreaId
                            ? bestAreasData.options.find((a) => a.id === selectedBestAreaId)?.name ?? 'Best areas'
                            : 'Best areas'}
                        <ChevronDown size={14} className={`shrink-0 text-grey-2 transition-transform ${!bestAreasCollapsed ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown list */}
                    {!bestAreasCollapsed && (
                        <>
                            <div className="fixed inset-0 z-[1050]" onClick={() => setBestAreasCollapsed(true)} />
                            <div className="absolute top-full left-0 mt-1.5 z-[1051] w-[200px] rounded-lg bg-white shadow-lg border border-feature-card-border overflow-hidden">
                                <p className="px-3 py-2 font-manrope text-[12px] font-semibold text-grey-1 border-b border-feature-card-border">
                                    Select Best Area
                                </p>
                                <div className="py-0.5">
                                    {bestAreasData.options.map((area) => (
                                        <button
                                            key={area.id}
                                            type="button"
                                            onClick={() => {
                                                trackButtonClickCustom?.({
                                                    buttonPage: buttonPage,
                                                    buttonName: 'best_area_dropdown',
                                                    buttonAction: 'select_area',
                                                    extra: { city_id: cityId, area_id: area.id }
                                                })
                                                setSelectedBestAreaId(area.id)
                                                setBestAreasCollapsed(true)
                                                setAreaDetailsExpanded(false)
                                            }}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                                                selectedBestAreaId === area.id ? 'bg-primary-pale-purple/30' : 'hover:bg-grey-5'
                                            }`}>
                                            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: '#10b981' }} />
                                            <span className="font-manrope text-[12px] font-medium text-grey-0">
                                                {area.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
            </div>

            {/* "Why area?" chip + expanded detail panel */}
            {selectedBestAreaId && bestAreasData && bestAreasData.options.length > 0 && (() => {
                const area = bestAreasData.options.find((a) => a.id === selectedBestAreaId)
                if (!area) return null
                return (
                    <div className="absolute top-14 left-3 z-[999]">
                        {areaDetailsExpanded ? (
                            <div className="min-w-[240px] max-w-[300px] rounded-xl bg-white shadow-lg border border-gray-200/80 overflow-hidden p-3 space-y-2">
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
                                {area.highlights && area.highlights.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {area.highlights.map((h, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex font-medium items-center gap-1.5 px-2.5 py-1 rounded-full border border-feature-card-border bg-natural-white text-xs text-header-black">
                                                {h.icon != null && h.icon !== '' && (
                                                    <span className="shrink-0" aria-hidden>{h.icon}</span>
                                                )}
                                                {h.label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setAreaDetailsExpanded(true)
                                    setBestAreasCollapsed(true)
                                    setVerificationDropdownCollapsed(true)
                                }}
                                className="rounded-md bg-white border border-grey-4 shadow-sm px-3 py-1.5 text-[12px] font-medium font-manrope text-grey-0 hover:border-primary-default hover:text-primary-default transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0">
                                <Sparkles className="w-3 h-3 text-primary-default shrink-0" />
                                Why {area.name}?
                            </button>
                        )}
                    </div>
                )
            })()}

            {/* Skeleton until we have some center (cityCenter from backend, or Mapbox
                fallback that fired after backend settled). Hidden once the map instance
                exists, so city switches don't flash the skeleton. */}
            {!effectiveCenter && !mapInstanceRef.current ? (
                <div className="w-full h-full bg-grey-grey_4 animate-pulse" />
            ) : (
                <div
                    ref={mapRef}
                    className="w-full h-full stays-map-root"
                    style={{
                        willChange: 'transform',
                        backfaceVisibility: 'hidden',
                        transform: 'translateZ(0)'
                    }}
                />
            )}

            {/* Stay count badge */}
            {(filteredAccommodations.length + viewportMarkerCount > 0 || viewportLoading) && (
                <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-md px-3 py-1.5 shadow-sm border border-gray-200/60 flex items-center gap-1.5">
                    {viewportLoading && (
                        <div className="w-3 h-3 border-2 border-gray-300 border-t-primary-default rounded-full animate-spin" />
                    )}
                    <span className="text-[11px] font-medium font-manrope text-grey-1">
                        {viewportLoading
                            ? 'Loading stays...'
                            : `${filteredAccommodations.length + viewportMarkerCount} stays on map`
                        }
                    </span>
                </div>
            )}
        </div>
    )
}

// Memoize component to prevent re-renders when props haven't meaningfully changed
export default memo(StaysMap, (prevProps, nextProps) => {
    // Only re-render if these props actually change
    if (prevProps.cityName !== nextProps.cityName) return false
    if (prevProps.cityId !== nextProps.cityId) return false
    if (prevProps.hoveredAccommodationId !== nextProps.hoveredAccommodationId) return false
    if (prevProps.isExpanded !== nextProps.isExpanded) return false

    // Compare accommodations by ID, geo-location, and price
    // This allows re-renders when prices are fetched (after polling completes)
    // but prevents flicker during polling when only intermediate states change
    const prevAccs = prevProps.accommodations || []
    const nextAccs = nextProps.accommodations || []

    if (prevAccs.length !== nextAccs.length) return false

    // Create comparison strings that include prices so markers update when prices are fetched
    const prevKey = prevAccs
        .map((acc) => `${acc.id}-${acc.geo_location?.lat}-${acc.geo_location?.long}-${acc.rate_per_night ?? ''}`)
        .sort()
        .join('|')
    const nextKey = nextAccs
        .map((acc) => `${acc.id}-${acc.geo_location?.lat}-${acc.geo_location?.long}-${acc.rate_per_night ?? ''}`)
        .sort()
        .join('|')

    if (prevKey !== nextKey) return false

    // fetchViewportStays — allow re-render when this prop is first provided
    if (prevProps.fetchViewportStays !== nextProps.fetchViewportStays) return false

    // Props are equal, skip re-render
    return true
})
