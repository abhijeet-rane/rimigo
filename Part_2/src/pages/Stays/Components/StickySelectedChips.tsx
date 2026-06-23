import { X, IndianRupee } from 'lucide-react'

interface StickySelectedChipsProps {
    searchParams: URLSearchParams
    setSearchParams: (params: URLSearchParams, options?: { replace?: boolean }) => void
    propertyTypes: Array<{ id: string; label: string; icon_url: string }>
    allAmenities?: {
        primary?: Array<{ unique_id: string; label: string }>
        essentials?: Array<{ unique_id: string; label: string }>
        features?: Array<{ unique_id: string; label: string }>
        location?: Array<{ unique_id: string; label: string }>
        services?: Array<{ unique_id: string; label: string }>
    }
}

const StickySelectedChips = ({ searchParams, setSearchParams, propertyTypes, allAmenities }: StickySelectedChipsProps) => {
    return (
        <div className="sticky top-16 z-30 bg-natural-white border-b border-feature-card-border">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex flex-wrap gap-2">
                    {/* Group type chip (preferences) */}
                    {(() => {
                        const groupType = searchParams.get('group_type')
                        if (!groupType) return null
                        const groupMap: Record<string, { label: string; image: string }> = {
                            couple: { label: 'Couple', image: '/illustrations/group types/couple.png' },
                            couple_with_children: {
                                label: 'Couple with Children',
                                image: '/illustrations/group types/couple_w_children.png'
                            },
                            friends_group: { label: 'Friends Group', image: '/illustrations/group types/friends.png' },
                            immediate_family: { label: 'Family', image: '/illustrations/group types/immediate_family.png' },
                            solo_traveler: { label: 'Solo Traveler', image: '/illustrations/group types/solo.png' }
                        }
                        const info = groupMap[groupType]
                        if (!info) return null
                        return (
                            <div
                                key={`gt-${groupType}`}
                                onClick={() => {
                                    const next = new URLSearchParams(searchParams)
                                    next.set('action', 'preferences')
                                    setSearchParams(next, { replace: true })
                                }}
                                className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-feature-card-border bg-natural-white text-sm text-header-black hover:bg-grey-grey_5">
                                <img
                                    src={info.image}
                                    alt={info.label}
                                    className="h-4 w-4 object-contain"
                                />
                                <span>{info.label}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        const next = new URLSearchParams(searchParams)
                                        next.delete('group_type')
                                        setSearchParams(next, { replace: true })
                                    }}
                                    className="cursor-pointer">
                                    <X className="h-3.5 w-3.5 text-grey-grey_2" />
                                </button>
                            </div>
                        )
                    })()}

                    {/* Travel purpose chip (preferences) */}
                    {(() => {
                        const purpose = searchParams.get('travel_purpose')
                        if (!purpose) return null
                        const purposeMap: Record<string, { label: string; image: string }> = {
                            leisure_relaxation: { label: 'Leisure & Relaxation', image: '/illustrations/purpose/leisure.png' },
                            family_vacation: { label: 'Family Vacation', image: '/illustrations/purpose/family_vacation.png' },
                            honeymoon: { label: 'Honeymoon', image: '/illustrations/purpose/honeymoon.png' },
                            anniversary_trip: { label: 'Anniversary Trip', image: '/illustrations/purpose/anniversary.png' },
                            birthday_celebration: { label: 'Birthday Celebration', image: '/illustrations/purpose/birthday.png' },
                            solo_escape: { label: 'Solo Escape', image: '/illustrations/purpose/solo_escape.png' }
                        }
                        const info = purposeMap[purpose]
                        if (!info) return null
                        return (
                            <div
                                key={`tp-${purpose}`}
                                onClick={() => {
                                    const next = new URLSearchParams(searchParams)
                                    next.set('action', 'preferences')
                                    setSearchParams(next, { replace: true })
                                }}
                                className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-feature-card-border bg-natural-white text-sm text-header-black hover:bg-grey-grey_5">
                                <img
                                    src={info.image}
                                    alt={info.label}
                                    className="h-4 w-4 object-contain"
                                />
                                <span>{info.label}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        const next = new URLSearchParams(searchParams)
                                        next.delete('travel_purpose')
                                        setSearchParams(next, { replace: true })
                                    }}
                                    className="cursor-pointer">
                                    <X className="h-3.5 w-3.5 text-grey-grey_2" />
                                </button>
                            </div>
                        )
                    })()}

                    {/* City preferences chips (preferences) */}
                    {(() => {
                        const prefMap: Record<string, { label: string; icon: string }> = {
                            station_nearby: { label: 'Near Station', icon: '🚇' },
                            city_center: { label: 'City Center', icon: '🏙️' },
                            nightlife: { label: 'Nightlife', icon: '🌃' },
                            restaurant_nearby: { label: 'Restaurants', icon: '🍽️' },
                            indian_restaurant_nearby: { label: 'Indian Food', icon: '🍛' },
                            perfect_area: { label: 'Perfect Area', icon: '⭐' },
                            near_domestic_airport: { label: 'Near Domestic Airport', icon: '✈️' },
                            near_international_airport: { label: 'Near International Airport', icon: '🛫' },
                            supermarkets_nearby: { label: 'Supermarkets', icon: '🛒' },
                            check_in_window: { label: 'Check-in Window', icon: '🕐' },
                            shuttle_service: { label: 'Shuttle Service', icon: '🚐' },
                            parking_available: { label: 'Parking', icon: '🅿️' },
                            great_view: { label: 'Great View', icon: '🌅' }
                        }
                        const prefs = (searchParams.get('city_prefs') || '').split(',').filter(Boolean)
                        return prefs.map((pref) => {
                            const info = prefMap[pref]
                            if (!info) return null
                            return (
                                <div
                                    key={`pref-${pref}`}
                                    onClick={() => {
                                        const next = new URLSearchParams(searchParams)
                                        next.set('action', 'preferences')
                                        setSearchParams(next, { replace: true })
                                    }}
                                    className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-feature-card-border bg-natural-white text-sm text-header-black hover:bg-grey-grey_5">
                                    <span className="text-base leading-none">{info.icon}</span>
                                    <span>{info.label}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const remaining = prefs.filter((p) => p !== pref)
                                            const next = new URLSearchParams(searchParams)
                                            if (remaining.length) next.set('city_prefs', remaining.join(','))
                                            else next.delete('city_prefs')
                                            setSearchParams(next, { replace: true })
                                        }}
                                        className="cursor-pointer">
                                        <X className="h-3.5 w-3.5 text-grey-grey_2" />
                                    </button>
                                </div>
                            )
                        })
                    })()}

                    {/* Property type chips (filters) */}
                    {(() => {
                        let pts = searchParams.getAll('pt')
                        if (!pts.length) {
                            const csv = searchParams.get('pt') || searchParams.get('property_types') || ''
                            pts = csv.split(',').filter(Boolean)
                        }
                        const ptMap: Record<string, { label: string; icon_url: string }> = {}
                        propertyTypes.forEach((t) => {
                            ptMap[t.id] = { label: t.label, icon_url: t.icon_url }
                        })
                        return pts.map((pt) => {
                            const info = ptMap[pt] || { label: pt, icon_url: '' }
                            return (
                                <div
                                    key={`pt-${pt}`}
                                    onClick={() => {
                                        const next = new URLSearchParams(searchParams)
                                        next.set('action', 'filters')
                                        setSearchParams(next, { replace: true })
                                    }}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-feature-card-border bg-natural-white text-sm text-header-black hover:bg-grey-grey_5">
                                    {info.icon_url ? (
                                        <img
                                            src={info.icon_url}
                                            alt={info.label}
                                            className="h-4 w-4 object-contain"
                                        />
                                    ) : null}
                                    <span>{info.label}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const next = new URLSearchParams(searchParams)
                                            const current = next.getAll('pt').length
                                                ? next.getAll('pt')
                                                : (next.get('pt') || next.get('property_types') || '').split(',').filter(Boolean)
                                            const updated = current.filter((t) => t !== pt)
                                            next.delete('pt')
                                            next.delete('property_types')
                                            updated.forEach((t) => next.append('pt', t))
                                            updated.forEach((t) => next.append('property_types', t))
                                            setSearchParams(next, { replace: true })
                                        }}
                                        className="cursor-pointer">
                                        <X className="h-3.5 w-3.5 text-grey-grey_2" />
                                    </button>
                                </div>
                            )
                        })
                    })()}

                    {/* Amenity chips (filters) */}
                    {(() => {
                        let ams = searchParams.getAll('am')
                        if (!ams.length) {
                            const csv = searchParams.get('am') || searchParams.get('amenities') || ''
                            ams = csv.split(',').filter(Boolean)
                        }
                        // Build amenity label map from fetched filters
                        const amenityLabelMap: Record<string, string> = {}
                        const all = [
                            ...(allAmenities?.primary || []),
                            ...(allAmenities?.essentials || []),
                            ...(allAmenities?.features || []),
                            ...(allAmenities?.location || []),
                            ...(allAmenities?.services || [])
                        ]
                        all.forEach((a) => (amenityLabelMap[a.unique_id] = a.label))
                        return ams.map((am) => {
                            const label = amenityLabelMap[am] || am
                            return (
                                <div
                                    key={`am-${am}`}
                                    onClick={() => {
                                        const next = new URLSearchParams(searchParams)
                                        next.set('action', 'filters')
                                        setSearchParams(next, { replace: true })
                                    }}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-feature-card-border bg-natural-white text-sm text-header-black hover:bg-grey-grey_5">
                                    <span className="w-4 h-4 rounded-full bg-grey-grey_5 inline-flex items-center justify-center text-[10px]">✓</span>
                                    <span>{label}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const next = new URLSearchParams(searchParams)
                                            const current = next.getAll('am').length
                                                ? next.getAll('am')
                                                : (next.get('am') || next.get('amenities') || '').split(',').filter(Boolean)
                                            const updated = current.filter((a) => a !== am)
                                            next.delete('am')
                                            next.delete('amenities')
                                            updated.forEach((a) => next.append('am', a))
                                            updated.forEach((a) => next.append('amenities', a))
                                            setSearchParams(next, { replace: true })
                                        }}
                                        className="cursor-pointer">
                                        <X className="h-3.5 w-3.5 text-grey-grey_2" />
                                    </button>
                                </div>
                            )
                        })
                    })()}

                    {/* Budget chip */}
                    {(() => {
                        const bMin = searchParams.get('budget_min')
                        const bMax = searchParams.get('budget_max')
                        if (!bMin || !bMax) return null
                        return (
                            <div
                                key="budget"
                                onClick={() => {
                                    const next = new URLSearchParams(searchParams)
                                    next.set('action', 'filters')
                                    setSearchParams(next, { replace: true })
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-feature-card-border bg-natural-white text-sm text-header-black hover:bg-grey-grey_5">
                                <IndianRupee className="h-4 w-4" />
                                <span>{`${Number(bMin)} - ${Number(bMax)}`}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        const next = new URLSearchParams(searchParams)
                                        next.delete('budget_min')
                                        next.delete('budget_max')
                                        setSearchParams(next, { replace: true })
                                    }}
                                    className="cursor-pointer">
                                    <X className="h-3.5 w-3.5 text-grey-grey_2" />
                                </button>
                            </div>
                        )
                    })()}
                </div>
            </div>
        </div>
    )
}

export default StickySelectedChips
