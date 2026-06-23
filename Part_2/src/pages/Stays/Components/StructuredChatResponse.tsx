import React, { useEffect, useRef } from 'react'
import { ExternalLink } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface StructuredContent {
    paragraphs?: string[] | null
    bullet_lists?: Array<{ items: string[] }> | null
    numbered_lists?: Array<{ items: string[] }> | null
    sections?: Array<{
        header: string
        content: Array<
            | { type: 'paragraph'; text: string }
            | { type: 'bullet_list'; items: string[] }
            | { type: 'numbered_list'; items: string[] }
            | { type: 'labeled_item'; label: string; text: string }
        >
    }> | null
}

interface LocationField {
    latitude: number
    longitude: number
    name?: string
}

interface Location {
    name: string
    latitude: number
    longitude: number
}

interface StructuredChatResponseData {
    text: string
    reasoning?: string
    urls?: string[] | null
    images?: string[] | null
    output_type: 'experience_chat_response' | 'hotel_chat_response' | 'faq_response'
    content: StructuredContent
    experience?: {
        id: string
        identifier: string
        name: string
    }
    zentrum_hub_id?: string
    location_field?: LocationField
    locations?: Location[]
}

interface StructuredChatResponseProps {
    data: StructuredChatResponseData
}

// Location Map Component - supports single location or multiple locations
interface LocationMapProps {
    location?: { latitude: number; longitude: number; name?: string }
    locations?: Array<{ name: string; latitude: number; longitude: number }>
}

const LocationMap: React.FC<LocationMapProps> = ({ location, locations }) => {
    const mapRef = useRef<HTMLDivElement | null>(null)
    const mapInstanceRef = useRef<mapboxgl.Map | null>(null)
    const markersRef = useRef<mapboxgl.Marker[]>([])

    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

    // Determine which locations to show
    const locationsToShow =
        locations && locations.length > 0
            ? locations
            : location
              ? [{ name: location.name || 'Location', latitude: location.latitude, longitude: location.longitude }]
              : []

    useEffect(() => {
        if (!mapRef.current || !MAPBOX_TOKEN || locationsToShow.length === 0) return
        if (mapInstanceRef.current) return

        mapboxgl.accessToken = MAPBOX_TOKEN

        // Calculate center and bounds for multiple locations
        const lats = locationsToShow.map((l) => l.latitude)
        const lngs = locationsToShow.map((l) => l.longitude)
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2

        const map = new mapboxgl.Map({
            container: mapRef.current,
            style: 'mapbox://styles/mapbox/standard',
            center: [centerLng, centerLat],
            zoom: locationsToShow.length > 1 ? 12 : 13,
            pitch: 60,
            bearing: 0,
            interactive: true,
            attributionControl: false
        })

        map.on('style.load', () => {
            try {
                map.setConfigProperty('basemap', 'lightPreset', 'standard')
            } catch {}
        })

        map.on('error', (e) => {
            console.warn('Mapbox error', e?.error || e)
        })

        // Add markers for all locations
        locationsToShow.forEach((loc) => {
            const el = document.createElement('div')
            el.style.cssText =
                'width: 24px; height: 24px; border-radius: 50%; background: #7011F6; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); cursor: pointer;'
            const marker = new mapboxgl.Marker({ element: el })
                .setLngLat([loc.longitude, loc.latitude])
                .setPopup(new mapboxgl.Popup().setText(loc.name))
                .addTo(map)
            markersRef.current.push(marker)
        })

        // Fit bounds if multiple locations
        if (locationsToShow.length > 1) {
            const bounds = new mapboxgl.LngLatBounds()
            locationsToShow.forEach((loc) => {
                bounds.extend([loc.longitude, loc.latitude])
            })
            map.fitBounds(bounds, { padding: 40, maxZoom: 14 })
        }

        mapInstanceRef.current = map

        const resize = () => map.resize()
        window.addEventListener('resize', resize)
        const id = setTimeout(resize, 150)

        return () => {
            clearTimeout(id)
            window.removeEventListener('resize', resize)
            markersRef.current.forEach((marker) => marker.remove())
            markersRef.current = []
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }
        }
    }, [locationsToShow, MAPBOX_TOKEN])

    if (!MAPBOX_TOKEN) {
        return (
            <div className="w-full h-48 rounded-lg border border-grey_4 bg-grey_5 flex items-center justify-center">
                <p className="text-xs text-grey-grey_2">Map unavailable</p>
            </div>
        )
    }

    if (locationsToShow.length === 0) {
        return null
    }

    return (
        <div className="w-full h-48 rounded-lg border border-grey_4 overflow-hidden">
            <div
                ref={mapRef}
                className="w-full h-full"
            />
        </div>
    )
}

const StructuredChatResponse: React.FC<StructuredChatResponseProps> = ({ data }) => {
    const { content, urls, images, location_field, locations } = data

    // Helper function to render markdown bold as actual bold text
    const renderMarkdownBold = (text: string) => {
        const parts: (string | React.ReactElement)[] = []
        const regex = /\*\*(.*?)\*\*/g
        let lastIndex = 0
        let match
        let key = 0

        while ((match = regex.exec(text)) !== null) {
            // Add text before the bold
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index))
            }
            // Add bold text
            parts.push(
                <strong
                    key={key++}
                    className="font-bold">
                    {match[1]}
                </strong>
            )
            lastIndex = regex.lastIndex
        }
        // Add remaining text
        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex))
        }

        return parts.length > 0 ? parts : [text]
    }

    const renderParagraphs = (paragraphs: string[]) => {
        return paragraphs.map((para, idx) => (
            <p
                key={`para-${idx}`}
                className="text-sm font-medium leading-5 text-grey_0 font-red-hat-display mb-3 last:mb-0">
                {renderMarkdownBold(para)}
            </p>
        ))
    }

    const renderBulletList = (items: string[], idx: number) => {
        return (
            <ul
                key={`bullet-${idx}`}
                className="list-none space-y-2.5">
                {items.map((item, itemIdx) => (
                    <li
                        key={itemIdx}
                        className="flex items-start gap-2.5">
                        <span className="text-primary-default mt-1.5 font-bold flex-shrink-0">•</span>
                        <span className="text-sm font-medium leading-6 text-grey_0 font-red-hat-display flex-1">{renderMarkdownBold(item)}</span>
                    </li>
                ))}
            </ul>
        )
    }

    const renderNumberedList = (items: string[], idx: number) => {
        return (
            <ol
                key={`numbered-${idx}`}
                className="list-none mb-3 last:mb-0 space-y-2.5">
                {items.map((item, itemIdx) => (
                    <li
                        key={itemIdx}
                        className="flex items-start gap-3">
                        <span className="text-primary-default mt-0.5 font-bold text-sm min-w-[24px] flex-shrink-0">{itemIdx + 1}.</span>
                        <span className="text-sm font-medium leading-6 text-grey_0 font-red-hat-display flex-1">{renderMarkdownBold(item)}</span>
                    </li>
                ))}
            </ol>
        )
    }

    type SectionContentItem =
        | { type: 'paragraph'; text: string }
        | { type: 'bullet_list'; items: string[] }
        | { type: 'numbered_list'; items: string[] }
        | { type: 'labeled_item'; label: string; text: string }

    const renderSectionContent = (contentItems: SectionContentItem[] | null | undefined) => {
        if (!contentItems || !Array.isArray(contentItems)) return null

        // First pass: collect all numbered list items to maintain sequential numbering
        const allNumberedItems: string[] = []
        const processedItems: Array<{
            type: 'paragraph' | 'bullet_list' | 'numbered_list_placeholder' | 'labeled_item'
            text?: string
            items?: string[]
            label?: string
            numberedIndex?: number // Index in the allNumberedItems array
            key: number
            isNested?: boolean // Whether this bullet list follows a numbered item
        }> = []

        let itemIndex = 0
        let numberedItemCounter = 0
        let lastWasNumbered = false

        contentItems.forEach((item) => {
            if (item.type === 'numbered_list') {
                // Collect all numbered items for sequential numbering
                item.items.forEach((numberedItem) => {
                    allNumberedItems.push(numberedItem)
                    processedItems.push({
                        type: 'numbered_list_placeholder',
                        numberedIndex: numberedItemCounter++,
                        key: itemIndex++
                    })
                })
                lastWasNumbered = true
            } else if (item.type === 'paragraph') {
                processedItems.push({
                    type: 'paragraph',
                    text: item.text,
                    key: itemIndex++
                })
                lastWasNumbered = false
            } else if (item.type === 'bullet_list') {
                processedItems.push({
                    type: 'bullet_list',
                    items: item.items,
                    key: itemIndex++,
                    isNested: lastWasNumbered // Mark as nested if it follows a numbered item
                })
                lastWasNumbered = false
            } else if (item.type === 'labeled_item') {
                processedItems.push({
                    type: 'labeled_item',
                    label: item.label,
                    text: item.text,
                    key: itemIndex++
                })
                lastWasNumbered = false
            }
        })

        // Second pass: render items with proper sequential numbering and indentation
        return processedItems.map((item, index) => {
            const nextItem = processedItems[index + 1]
            const isFollowedByNumbered = nextItem?.type === 'numbered_list_placeholder'

            switch (item.type) {
                case 'paragraph':
                    return (
                        <p
                            key={item.key}
                            className="text-sm font-medium leading-5 text-grey_0 font-red-hat-display mb-3 last:mb-0">
                            {renderMarkdownBold(item.text!)}
                        </p>
                    )
                case 'bullet_list':
                    // If nested (follows a numbered item), add indentation
                    if (item.isNested) {
                        return (
                            <div
                                key={item.key}
                                className={`ml-8 ${isFollowedByNumbered ? 'mb-6' : 'mb-3'}`}>
                                {renderBulletList(item.items!, item.key)}
                            </div>
                        )
                    }
                    return (
                        <div
                            key={item.key}
                            className={isFollowedByNumbered ? 'mb-6' : 'mb-3'}>
                            {renderBulletList(item.items!, item.key)}
                        </div>
                    )
                case 'numbered_list_placeholder':
                    // Render single numbered item with sequential number
                    const numberedItem = allNumberedItems[item.numberedIndex!]
                    const displayNumber = item.numberedIndex! + 1
                    // Add more spacing if followed by another numbered item (new section)
                    const spacingClass = isFollowedByNumbered ? 'mb-6' : 'mb-3'
                    return (
                        <div
                            key={item.key}
                            className={spacingClass}>
                            <div className="flex items-start gap-3">
                                <span className="text-primary-default mt-0.5 font-bold text-sm min-w-[24px] flex-shrink-0">{displayNumber}.</span>
                                <span className="text-sm font-medium leading-6 text-grey_0 font-red-hat-display flex-1">
                                    {renderMarkdownBold(numberedItem)}
                                </span>
                            </div>
                        </div>
                    )
                case 'labeled_item':
                    // Render labeled item (label: text format) - more compact
                    const spacingClassLabeled = isFollowedByNumbered ? 'mb-4' : 'mb-2.5'
                    return (
                        <div
                            key={item.key}
                            className={spacingClassLabeled}>
                            <div className="flex items-start gap-2">
                                <span className="text-xs font-semibold text-grey_1 font-red-hat-display min-w-[100px] flex-shrink-0 uppercase tracking-wide">
                                    {item.label!}:
                                </span>
                                <span className="text-xs font-medium leading-5 text-grey_0 font-red-hat-display flex-1">
                                    {renderMarkdownBold(item.text!)}
                                </span>
                            </div>
                        </div>
                    )
                default:
                    return null
            }
        })
    }

    // Check if there's any structured content
    const hasStructuredContent =
        (content.paragraphs && content.paragraphs.length > 0) ||
        (content.bullet_lists && content.bullet_lists.length > 0) ||
        (content.numbered_lists && content.numbered_lists.length > 0) ||
        (content.sections && content.sections.length > 0)

    return (
        <div className="space-y-4">
            {/* Render paragraphs first */}
            {content.paragraphs && content.paragraphs.length > 0 && <div className="space-y-3">{renderParagraphs(content.paragraphs)}</div>}

            {/* Render bullet lists */}
            {content.bullet_lists && content.bullet_lists.length > 0 && (
                <div className="space-y-3">{content.bullet_lists.map((list, idx) => renderBulletList(list.items, idx))}</div>
            )}

            {/* Render numbered lists - combine all into a single list for proper sequential numbering */}
            {content.numbered_lists && content.numbered_lists.length > 0 && (
                <div className="space-y-3">
                    {(() => {
                        // Combine all numbered list items into a single array for sequential numbering
                        const allItems = content.numbered_lists.flatMap((list) => list.items)
                        return renderNumberedList(allItems, 0)
                    })()}
                </div>
            )}

            {/* Render sections */}
            {content.sections && content.sections.length > 0 && (
                <div className="space-y-5">
                    {content.sections.map((section, idx) => (
                        <div
                            key={`section-${idx}`}
                            className="space-y-3">
                            <h4 className="text-sm font-bold text-grey_0 font-red-hat-display mb-3 leading-5">{section.header}</h4>
                            <div className="pl-0">{renderSectionContent(section.content)}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Render text as paragraph if no structured content but text exists */}
            {!hasStructuredContent && data.text && (
                <p className="text-sm font-medium leading-5 text-grey_0 font-red-hat-display">{renderMarkdownBold(data.text)}</p>
            )}

            {/* Render images */}
            {images && images.length > 0 && (
                <div className={hasStructuredContent || data.text ? 'mt-4' : ''}>
                    <div className="grid grid-cols-2 gap-3">
                        {images.map((imageUrl, idx) => (
                            <div
                                key={idx}
                                className="rounded-lg overflow-hidden border border-grey_4">
                                <img
                                    src={imageUrl}
                                    alt={`Content image ${idx + 1}`}
                                    className="w-full h-auto object-cover"
                                    onError={(e) => {
                                        // Hide broken images
                                        e.currentTarget.style.display = 'none'
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Render URLs as clickable links */}
            {urls && urls.length > 0 && (
                <div className="mt-4 pt-3 border-t border-grey_4 space-y-2">
                    <p className="text-xs font-semibold text-grey_1 font-red-hat-display mb-2">RELATED LINKS</p>
                    <div className="space-y-2">
                        {urls.map((url, idx) => (
                            <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm font-medium text-primary-default hover:opacity-80 font-red-hat-display transition-opacity">
                                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                <span className="break-all">{url}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Show experience metadata if available */}
            {data.experience && (
                <div className="mt-4 pt-3 border-t border-grey_4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-grey_1 font-red-hat-display">Experience:</span>
                        <span className="text-xs font-medium text-grey_0 font-red-hat-display">{data.experience.name}</span>
                    </div>
                </div>
            )}

            {/* Render location map if location_field or locations array is available */}
            {((location_field && location_field.latitude && location_field.longitude) || (locations && locations.length > 0)) && (
                <div className="mt-3 pt-3 border-t border-grey_4">
                    <p className="text-xs font-semibold text-grey_1 font-red-hat-display mb-2 uppercase tracking-wide">
                        {locations && locations.length > 1 ? 'Recommended Locations' : 'Recommended Location'}
                    </p>
                    <LocationMap
                        location={location_field}
                        locations={locations}
                    />
                </div>
            )}
        </div>
    )
}

export default StructuredChatResponse
