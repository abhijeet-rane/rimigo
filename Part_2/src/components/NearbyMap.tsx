import React, { useEffect, useMemo, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { renderToStaticMarkup } from 'react-dom/server'
import { Home } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'

type NearbyItem = {
    label: string
    lat: number
    long: number
    map_link?: string
}

interface GeoCodeCenter {
    lat?: string
    long?: string
}

interface NearbyMapProps {
    center?: GeoCodeCenter
    items: NearbyItem[]
    selectedIndex?: number
    height?: number | string
}

const MAPBOX_TOKEN = (import.meta as any).env.VITE_MAPBOX_TOKEN as string | undefined

const NearbyMap: React.FC<NearbyMapProps> = ({ center, items, selectedIndex = 0, height }) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const mapInstanceRef = useRef<mapboxgl.Map | null>(null)
    const markersRef = useRef<mapboxgl.Marker[]>([])

    const mapCenter = useMemo(() => {
        if (center?.lat && center?.long) {
            const lat = parseFloat(center.lat)
            const lng = parseFloat(center.long)
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
        }
        const first = items[0]
        if (first) return { lat: first.lat, lng: first.long }
        return undefined
    }, [center, items])

    useEffect(() => {
        if (!containerRef.current) return
        if (!MAPBOX_TOKEN || !mapCenter) return
        if (mapInstanceRef.current) return

        mapboxgl.accessToken = MAPBOX_TOKEN
        const map = new mapboxgl.Map({
            container: containerRef.current,
            style: 'mapbox://styles/mapbox/standard',
            center: [mapCenter.lng, mapCenter.lat],
            zoom: 15.0,
            pitch: 55.0,
            bearing: 20.0
        })

        map.on('error', (e) => console.warn('Mapbox error', e?.error || e))
        mapInstanceRef.current = map
        // Add hotel marker at center using a Lucide Home icon after style is loaded
        map.on('style.load', () => {
            try {
                const el = document.createElement('div')
                el.title = 'Hotel'
                el.style.cssText =
                    'width:38px;height:38px;border-radius:19px;background:#101010;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);'
                const svg = renderToStaticMarkup(React.createElement(Home, { color: '#FFF', size: 20, strokeWidth: 2 }))
                el.innerHTML = svg
                new mapboxgl.Marker({ element: el }).setLngLat([mapCenter.lng, mapCenter.lat]).addTo(map)
            } catch {}
        })
        const resize = () => map.resize()
        window.addEventListener('resize', resize)
        const id = setTimeout(resize, 150)
        return () => {
            clearTimeout(id)
            window.removeEventListener('resize', resize)
            map.remove()
            mapInstanceRef.current = null
        }
    }, [mapCenter])

    // Update markers and fly to selected
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return

        // Clear markers
        markersRef.current.forEach((m) => m.remove())
        markersRef.current = []

        items.forEach((it, idx) => {
            const img = document.createElement('img')
            img.src = idx === selectedIndex ? '/illustrations/location_pin.png' : '/illustrations/primar_indigo_pin.png'
            img.alt = it.label
            img.style.cssText = 'height:38px;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.25));'
            const marker = new mapboxgl.Marker({ element: img, anchor: 'bottom' as any })
                .setLngLat([it.long, it.lat])
                .setPopup(new mapboxgl.Popup().setText(it.label))
                .addTo(map)
            markersRef.current.push(marker)
        })

        if (items[selectedIndex]) {
            map.flyTo({ center: [items[selectedIndex].long, items[selectedIndex].lat], zoom: 15.5 })
        }
    }, [items, selectedIndex])

    const openSelectedInMaps = () => {
        const sel = items[selectedIndex]
        if (sel?.map_link) window.open(sel.map_link, '_blank')
    }

    const wrapperStyle: React.CSSProperties = {
        height: height ?? '100%',
        minHeight: height ? undefined : 416
    }

    return (
        <div
            className="rounded-xl relative border border-feature-card-border bg-grey-grey_4 h-full"
            style={wrapperStyle}>
            <div
                ref={containerRef}
                className="w-full h-full"
            />
            {!MAPBOX_TOKEN && (
                <div className="w-full h-full flex items-center justify-center">
                    <button
                        onClick={openSelectedInMaps}
                        className="absolute  max-md:top-1/2 md:bottom-0 md:translate-y-1/2 px-4 py-2 rounded-full border border-primary-default text-primary-default text-sm">
                        show on map
                    </button>
                </div>
            )}
        </div>
    )
}

export default NearbyMap
