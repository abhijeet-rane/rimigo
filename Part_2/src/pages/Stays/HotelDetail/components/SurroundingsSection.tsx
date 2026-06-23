import { useState, useEffect, useRef } from 'react'
import { HotelDetailData } from '../../../../types/hotelDetailTypes'
import { getLucideIcon } from '../../../../constants/lucideIconMap'
import NearbyMap from '../../../../components/NearbyMap'

interface SurroundingsSectionProps {
    hotelData: HotelDetailData
    nearbyTab: string
    setNearbyTab: (tab: string) => void
    nearbySelectedIdx: number
    setNearbySelectedIdx: (idx: number) => void
}

export const SurroundingsSection = ({ hotelData, nearbyTab, setNearbyTab, nearbySelectedIdx, setNearbySelectedIdx }: SurroundingsSectionProps) => {
    const sectionRef = useRef<HTMLDivElement>(null)
    const [isMapVisible, setIsMapVisible] = useState(false)

    // Lazy-load the NearbyMap only when the section scrolls into view
    // This saves a Mapbox map load for users who don't scroll to surroundings
    useEffect(() => {
        if (!sectionRef.current) return
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsMapVisible(true)
                    observer.disconnect()
                }
            },
            { rootMargin: '200px', threshold: 0 }
        )
        observer.observe(sectionRef.current)
        return () => observer.disconnect()
    }, [])

    const currentHead = nearbyTab || (hotelData.nearby_list?.[0]?.section_head ?? '')
    const iconName = (() => {
        const h = (currentHead || '').toLowerCase()
        if (h.includes('transport')) return 'TrainFront'
        if (h.includes('food') || h.includes('drink')) return 'UtensilsCrossed'
        if (h.includes('attraction') || h.includes('activity')) return 'MapPin'
        return 'MapPin'
    })()

    return (
        <div ref={sectionRef} className="my-6 rounded-2xl border border-feature-card-border bg-white pt-4">
            <div className="flex items-start gap-3 mb-2 px-4">
                <span className="mt-0.5">{getLucideIcon(iconName, 20, 20)}</span>
                <div>
                    <div
                        style={{
                            color: '#000',
                            fontFamily: 'Red Hat Display',
                            fontSize: '18px',
                            fontStyle: 'normal',
                            fontWeight: 467 as any,
                            lineHeight: '24px',
                            letterSpacing: '-0.36px'
                        }}>
                        Surroundings of this stay
                    </div>
                </div>
            </div>
            <div
                className="px-4"
                style={{
                    color: 'var(--grey-2, #747474)',
                    fontFamily: 'Manrope',
                    fontSize: '14px',
                    fontStyle: 'normal',
                    fontWeight: 400 as any,
                    lineHeight: '20px',
                    letterSpacing: '-0.28px',
                    maxWidth: '580px',
                    paddingTop: '2px'
                }}>
                Explore what's around your stay and discover nearby places worth visiting.
            </div>

            {/* Section-head driven chips */}
            <div className="flex items-center gap-3 mt-6 px-4">
                <img
                    src="/illustrations/wand.png"
                    alt="wand"
                    className="w-4 h-4"
                />
                <span
                    style={{
                        color: 'var(--primary-indigo, #7011F6)',
                        fontFamily: 'Red Hat Display',
                        fontSize: 12,
                        fontStyle: 'normal',
                        fontWeight: 550 as any,
                        lineHeight: 'normal',
                        letterSpacing: '-0.12px'
                    }}>
                    Spots that you'll love
                </span>
            </div>
            <div className="flex items-center gap-3 text-sm mb-3 mt-2 px-4 max-md:overflow-x-auto scrollbar-hide">
                {(hotelData.nearby_list || [])
                    .map((s: any) => s.section_head)
                    .map((head: string) => (
                        <button
                            key={head}
                            onClick={() => setNearbyTab(head)}
                            className={`px-3 py-1 rounded-full cursor-pointer max-md:shrink-0`}
                            style={
                                nearbyTab === head
                                    ? {
                                          borderRadius: 20,
                                          border: '1px solid var(--grey-0, #101010)',
                                          background: 'var(--grey-0, #101010)',
                                          color: 'var(--full-white, #FFF)',
                                          fontFamily: 'Red Hat Display',
                                          fontSize: 12,
                                          fontStyle: 'normal',
                                          fontWeight: 645 as any,
                                          letterSpacing: '-0.12px'
                                      }
                                    : {
                                          borderRadius: 20,
                                          border: '1px solid var(--grey-4, #E0E0E0)',
                                          background: 'var(--grey-5, #F8F8F8)',
                                          color: '#000',
                                          fontFamily: 'Red Hat Display',
                                          fontSize: 12,
                                          fontStyle: 'normal',
                                          fontWeight: 550 as any,
                                          letterSpacing: '-0.12px'
                                      }
                            }>
                            {head}
                        </button>
                    ))}
            </div>

            <div className="max-md:flex max-md:flex-col md:grid grid-cols-1 md:grid-cols-5 border border-b-0 border-l-0 border-r-0 border-feature-card-border md:h-[450px]">
                {/* Left list */}
                <div className=" md:col-span-2 max-md:overflow-x-auto md:overflow-y-auto border border-b-0 border-l-0 border-t-0 border-feature-card-border h-full scrollbar-hide">
                    {(() => {
                        const sec = (hotelData.nearby_list || []).find((s: any) =>
                            nearbyTab ? s.section_head === nearbyTab : (s.section_head || '').toLowerCase().includes('attraction')
                        )
                        const items = (sec?.items || []).slice().sort((a: any, b: any) => {
                            const ad = typeof a.distance_m === 'number' ? a.distance_m : Number.MAX_SAFE_INTEGER
                            const bd = typeof b.distance_m === 'number' ? b.distance_m : Number.MAX_SAFE_INTEGER
                            return ad - bd
                        })
                        return items.length ? (
                            <div className="divide-y md:divide-y divide-feature-card-border max-md:flex max-md:flex-row max-md:divide-x">
                                {items.map((i: any, idx: number) => (
                                    <button
                                        key={i.label}
                                        onClick={() => setNearbySelectedIdx(idx)}
                                        className={`max-md:shrink-0 cursor-pointer px-4 md:w-full text-left py-4 hover:bg-grey-grey_5 focus:bg-grey-grey_5 ${nearbySelectedIdx === idx ? 'bg-grey-grey_5' : ''}`}>
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div
                                                    style={{
                                                        color: '#000',
                                                        fontFamily: 'Manrope',
                                                        fontSize: '14px',
                                                        fontStyle: 'normal',
                                                        fontWeight: 500 as any,
                                                        lineHeight: 'normal',
                                                        letterSpacing: '-0.28px'
                                                    }}>
                                                    {i.label}
                                                </div>
                                            </div>
                                            <div
                                                className="whitespace-nowrap"
                                                style={{
                                                    color: '#000',
                                                    fontFamily: 'Manrope',
                                                    fontSize: '14px',
                                                    fontStyle: 'normal',
                                                    fontWeight: 500 as any,
                                                    lineHeight: 'normal',
                                                    letterSpacing: '-0.28px'
                                                }}>
                                                {i.distance_m
                                                    ? `${i.distance_m > 1000 ? (i.distance_m / 1000).toFixed(1) + ' km' : Math.round(i.distance_m) + 'm'}`
                                                    : ''}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 py-3 text-sm text-grey-grey_2">No data</div>
                        )
                    })()}
                </div>

                {/* Map panel — lazy-loaded to save Mapbox map load credits */}
                <div className="md:col-span-3 p-2 h-full max-md:h-[450px]">
                    {isMapVisible ? (
                        (() => {
                            const sec = (hotelData.nearby_list || []).find((s: any) =>
                                nearbyTab ? s.section_head === nearbyTab : (s.section_head || '').toLowerCase().includes('attraction')
                            )
                            const items = (sec?.items || [])
                                .slice()
                                .sort((a: any, b: any) => {
                                    const ad = typeof a.distance_m === 'number' ? a.distance_m : Number.MAX_SAFE_INTEGER
                                    const bd = typeof b.distance_m === 'number' ? b.distance_m : Number.MAX_SAFE_INTEGER
                                    return ad - bd
                                })
                                .map((i) => ({ label: i.label, lat: i.lat, long: i.long, map_link: i.map_link }))
                            return (
                                <NearbyMap
                                    center={hotelData.geoCode}
                                    items={items as any}
                                    selectedIndex={nearbySelectedIdx}
                                />
                            )
                        })()
                    ) : (
                        <div className="w-full h-full rounded-xl bg-grey-grey_5 animate-pulse" />
                    )}
                </div>
            </div>
        </div>
    )
}
