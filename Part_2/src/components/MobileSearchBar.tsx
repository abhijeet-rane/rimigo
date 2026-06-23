import React, { useState, useEffect, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { PreferencesSection } from './PreferencesSection'
import { WhenSection } from './WhenSection'
import DatesCheckSectionStays from './DatesCheckSectionStays'
import MobileAccordion from './MobileAccordion'
import Typography from './shared/Typography'
import { DEFAULT_GROUP_TYPES, DEFAULT_PURPOSE_TYPES } from './common/SearchBar/modals/PreferencesModal'
import { GuestsData } from './GuestsSelector'
import WhoIsGoing from './WhoIsGoing'
import type { OccupanciesConfig } from '@/types/occupancy'
import { flattenOccupancies, guestsDataToOccupancies, MAX_ROOMS, MAX_ADULTS_PER_ROOM, MAX_CHILDREN_PER_ROOM, DEFAULT_CHILD_AGE } from '@/types/occupancy'
import { Trash2 } from 'lucide-react'
import type {
    PreferencesSegmentConfig,
    LocationPreference,
    GuestsSegmentConfig,
    RoomsSegmentConfig,
    WhereSegmentConfig,
    WhenSegmentConfig,
    CityListItem,
    CountryListItem,
    SegmentConfig
} from './common/SearchBar'
import WhereSection from './WhereSection'

export type SearchHeaderType = 'stays' | 'experiences'
export type ActiveSection = 'country' | 'where' | 'when' | 'guests' | 'rooms' | 'preferences' | null

interface MobileSearchModalProps {
    onSearch: (params: any) => void
    headerType: SearchHeaderType
    preferencesConfig?: PreferencesSegmentConfig
    locationPreferences?: LocationPreference[]
    guestsConfig?: GuestsSegmentConfig
    roomsConfig?: RoomsSegmentConfig
    countryConfig?: SegmentConfig
    whereConfig?: WhereSegmentConfig
    whenConfig?: WhenSegmentConfig
    iconSrc?: string
    outerOpen?: boolean
    onOpenChange?: (isOpen: boolean) => void
}

const MobileSearchModal: React.FC<MobileSearchModalProps> = ({
    onSearch,
    headerType,
    iconSrc,
    preferencesConfig = { enabled: true, label: 'PREFERENCES', placeholder: 'Add preferences' },
    locationPreferences,
    guestsConfig,
    roomsConfig,
    countryConfig,
    whereConfig,
    whenConfig,
    outerOpen,
    onOpenChange
}) => {
    const [isOpen, setIsOpenInternal] = useState(false)
    const setIsOpen = (open: boolean) => {
        setIsOpenInternal(open)
        onOpenChange?.(open)
    }
    const isCountryEnabled = countryConfig?.enabled === true
    const isWhereEnabled = whereConfig?.enabled !== false
    const isPreferencesEnabled = preferencesConfig?.enabled !== false

    const getInitialActiveSection = (): ActiveSection => {
        if (isCountryEnabled) return 'country'
        if (isWhereEnabled) return 'where'
        return 'when'
    }

    const [activeSection, setActiveSection] = useState<ActiveSection>(getInitialActiveSection())

    /* COUNTRY */
    const [countryText, setCountryText] = useState('')
    const [countryId, setCountryId] = useState<string | null>(null)
    const [selectedCountries, setSelectedCountries] = useState<CountryListItem[]>([])

    /* WHERE */
    const [whereText, setWhereText] = useState('')
    const [whereId, setWhereId] = useState<string | null>(null)
    const [, setWhereType] = useState<string | null>(null)
    const [selectedCities, setSelectedCities] = useState<CityListItem[]>([])
    const [allCitiesFromCountries] = useState<CityListItem[]>([])

    /* WHEN */
    const [whenMonth, setWhenMonth] = useState<Date | null>(null)
    const [checkInDate, setCheckInDate] = useState<Date | null>(null)
    const [checkOutDate, setCheckOutDate] = useState<Date | null>(null)

    /* PREFERENCES */
    const [selectedGroupType, setSelectedGroupType] = useState(preferencesConfig?.initialGroupType || '')
    const [selectedPurposeType, setSelectedPurposeType] = useState(preferencesConfig?.initialTravelPurpose || '')
    const [selectedLocationPreferences, setSelectedLocationPreferences] = useState<string[]>(preferencesConfig?.initialLocationPreferences || [])
    const [priceRange, setPriceRange] = useState(preferencesConfig?.budgetConfig?.initialPriceRange)

    /* GUESTS */
    const [guests, setGuests] = useState<GuestsData>(
        guestsConfig?.initialData || {
            adults: 1,
            children: 0,
            infants: 0,
            children_age: []
        }
    )

    /* ROOMS */
    const [rooms, setRooms] = useState<number>(
        roomsConfig?.initialOccupancies?.length || roomsConfig?.initialData || 1
    )
    const useCombinedGuestsRooms = headerType === 'stays' && !!roomsConfig?.enabled
    const [occupancies, setOccupancies] = useState<OccupanciesConfig>(() =>
        roomsConfig?.initialOccupancies && roomsConfig.initialOccupancies.length > 0
            ? roomsConfig.initialOccupancies
            : guestsDataToOccupancies(
                  guestsConfig?.initialData || { adults: 1, children: 0, children_age: [] },
                  roomsConfig?.initialData || 1
              )
    )

    const handleRoomsChange = (newRooms: number) => {
        const clamped = Math.max(1, Math.min(9, newRooms))
        setRooms(clamped)
        if (guests.adults < clamped) {
            setGuests((prev) => ({ ...prev, adults: clamped }))
        }
    }

    const whereInitialKey = useMemo(
        () => (Array.isArray(whereConfig?.initialData) ? (whereConfig!.initialData as CityListItem[]).map((c) => c.id).join(',') : ''),
        [whereConfig?.initialData]
    )

    const whenInitialKey = useMemo(
        () => `${whenConfig?.initialCheckIn?.toISOString() ?? ''},${whenConfig?.initialCheckOut?.toISOString() ?? ''}`,
        [whenConfig?.initialCheckIn, whenConfig?.initialCheckOut]
    )

    const preferencesInitialKey = useMemo(
        () =>
            `${preferencesConfig?.initialGroupType ?? ''},${preferencesConfig?.initialTravelPurpose ?? ''},${(preferencesConfig?.initialLocationPreferences ?? []).join(',')}`,
        [preferencesConfig?.initialGroupType, preferencesConfig?.initialTravelPurpose, preferencesConfig?.initialLocationPreferences]
    )

    const guestsInitialKey = useMemo(
        () =>
            guestsConfig?.initialData
                ? `${guestsConfig.initialData.adults},${guestsConfig.initialData.children},${guestsConfig.initialData.infants},${(guestsConfig.initialData.children_age ?? []).join(',')}`
                : '',
        [guestsConfig?.initialData]
    )

    useEffect(() => {
        if (!whereConfig?.initialData?.length) {
            setWhereText('')
            setWhereId(null)
            setSelectedCities([])
            return
        }
        const city = (whereConfig.initialData as CityListItem[])[0]
        setWhereText(city.name)
        setWhereId(city.id)
        setWhereType('city')
        setSelectedCities([city])
    }, [whereInitialKey])

    useEffect(() => {
        if (headerType === 'stays') {
            setCheckInDate(whenConfig?.initialCheckIn ?? null)
            setCheckOutDate(whenConfig?.initialCheckOut ?? null)
        } else if (headerType === 'experiences') {
            if (whenConfig?.initialMonth !== undefined && whenConfig?.initialYear !== undefined) {
                setWhenMonth(new Date(whenConfig.initialYear, whenConfig.initialMonth - 1, 1))
            }
        }
    }, [whenInitialKey, headerType])

    useEffect(() => {
        setSelectedGroupType(preferencesConfig?.initialGroupType || '')
        setSelectedPurposeType(preferencesConfig?.initialTravelPurpose || '')
        setSelectedLocationPreferences(preferencesConfig?.initialLocationPreferences || [])
    }, [preferencesInitialKey])

    useEffect(() => {
        if (guestsConfig?.initialData) {
            setGuests(guestsConfig.initialData)
        }
    }, [guestsInitialKey])

    useEffect(() => {
        if (roomsConfig?.initialOccupancies && roomsConfig.initialOccupancies.length > 0) {
            setRooms(roomsConfig.initialOccupancies.length)
            setOccupancies(roomsConfig.initialOccupancies)
        } else if (roomsConfig?.initialData) {
            setRooms(roomsConfig.initialData)
        }
    }, [roomsConfig?.initialData, roomsConfig?.initialOccupancies])

    const countryInitialKey = useMemo(
        () => (Array.isArray(countryConfig?.initialData) ? (countryConfig!.initialData as CountryListItem[]).map((c) => c.id).join(',') : ''),
        [countryConfig?.initialData]
    )
    useEffect(() => {
        if (!countryConfig?.initialData?.length) return
        const country = (countryConfig.initialData as CountryListItem[])[0]
        setCountryText(country.name)
        setCountryId(country.id)
        setSelectedCountries([country])
    }, [countryInitialKey])

    useEffect(() => {
        if (typeof outerOpen === 'boolean') {
            setIsOpen(outerOpen)
        }
    }, [outerOpen])

    const formatMonth = (date: Date | null) => {
        if (!date) return 'Select month'
        return date.toLocaleDateString('default', { month: 'long', year: 'numeric' })
    }

    const formatGuests = (g: GuestsData) => {
        const parts = []
        if (g.adults) parts.push(`${g.adults} adult${g.adults > 1 ? 's' : ''}`)
        if (g.children) parts.push(`${g.children} child${g.children > 1 ? 'ren' : ''}`)
        if (g.infants) parts.push(`${g.infants} infant${g.infants > 1 ? 's' : ''}`)
        return parts.length ? parts.join(', ') : 'Add guests'
    }

    const formatRange = (start: Date | null, end: Date | null) =>
        start && end
            ? `${start.toLocaleDateString('default', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('default', {
                  day: '2-digit',
                  month: 'short'
              })}`
            : 'Select dates'

    const preferencesSummary = useMemo(() => {
        const parts: string[] = []
        const group = DEFAULT_GROUP_TYPES.find((g) => g.value === selectedGroupType)?.label
        const purpose = DEFAULT_PURPOSE_TYPES.find((p) => p.value === selectedPurposeType)?.label
        if (group) parts.push(group)
        if (purpose) parts.push(purpose)
        if (selectedLocationPreferences.length && locationPreferences) {
            const first = locationPreferences.find((p) => p.value === selectedLocationPreferences[0])
            if (first) {
                parts.push(selectedLocationPreferences.length === 1 ? first.label : `${first.label} +${selectedLocationPreferences.length - 1}`)
            }
        }
        return parts.length ? parts.join(', ') : preferencesConfig?.placeholder || 'Select preferences'
    }, [selectedGroupType, selectedPurposeType, selectedLocationPreferences, locationPreferences, preferencesConfig?.placeholder])

    const handleWhereSelect = (id: string, name: string, type: string) => {
        if (type === 'location_country') {
            setCountryId(id)
            setCountryText(name)
            setWhereId(null)
            setWhereText(name)
            setSelectedCities([])
        } else {
            setWhereId(id)
            setWhereText(name)
            setWhereType(type)

            if (type === 'city') {
                const city: CityListItem = { id, name }
                setSelectedCities([city])
                whereConfig?.onChange?.([city] as any)
            }
        }

        setActiveSection('when')
    }

    const handleGuestsChange = (newGuests: GuestsData) => {
        setGuests(newGuests)
        // If adults dropped below rooms, reduce rooms to match
        if (roomsConfig?.enabled && newGuests.adults < rooms) {
            setRooms(newGuests.adults)
        }
        guestsConfig?.onChange?.(newGuests)
    }

    const handleSearch = () => {
        if (headerType === 'stays') {
            if (!checkInDate || !checkOutDate) return

            const searchParams: any = {
                checkIn: checkInDate,
                checkOut: checkOutDate,
                guestsData: guests
            }

            if (countryId && countryText) {
                searchParams.countryId = countryId
                searchParams.countryName = countryText
            }

            if (whereId && whereText) {
                searchParams.cityId = whereId
                searchParams.cityName = whereText
            }

            if (roomsConfig?.enabled) {
                searchParams.rooms = rooms
            }

            if (isPreferencesEnabled) {
                searchParams.groupType = selectedGroupType || undefined
                searchParams.travelPurpose = selectedPurposeType || undefined
                searchParams.cityPreferences = selectedLocationPreferences.length ? selectedLocationPreferences : undefined
                searchParams.priceRange = priceRange
            }

            onSearch(searchParams)
            setIsOpen(false)
            return
        }

        if (!whenMonth) return

        const month = whenMonth.getMonth() + 1
        const year = whenMonth.getFullYear()

        const searchParams: any = { month, year }

        if (countryId && countryText) {
            searchParams.countryId = countryId
            searchParams.countryName = countryText
        }

        if (whereId && whereText) {
            searchParams.cityId = whereId
            searchParams.cityName = whereText
        }

        if (isPreferencesEnabled) {
            searchParams.groupType = selectedGroupType || undefined
            searchParams.travelPurpose = selectedPurposeType || undefined
            searchParams.cityPreferences = selectedLocationPreferences.length ? selectedLocationPreferences : undefined
            searchParams.priceRange = priceRange
        }

        onSearch(searchParams)
        setIsOpen(false)
    }

    const handleSummaryItemClick = (key: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setIsOpen(true)
        setActiveSection(key as ActiveSection)
    }

    const summaryItems = [
        ...(isCountryEnabled ? [{ key: 'country', label: 'COUNTRY', value: countryText || 'Any country' }] : []),
        ...(isWhereEnabled ? [{ key: 'where', label: 'WHERE', value: whereText || 'Anywhere' }] : []),
        {
            key: 'when',
            label: 'WHEN',
            value: headerType === 'stays' ? formatRange(checkInDate, checkOutDate) : formatMonth(whenMonth)
        },
        ...(headerType === 'stays' ? [{ key: 'guests', label: 'GUESTS', value: formatGuests(guests) }] : []),
        ...(roomsConfig?.enabled ? [{ key: 'rooms', label: 'ROOMS', value: rooms === 1 ? '1 room' : `${rooms} rooms` }] : []),
        ...(isPreferencesEnabled ? [{ key: 'preferences', label: preferencesConfig?.label || 'PREFERENCES', value: preferencesSummary }] : [])
    ]

    return (
        <>
            <div className="flex flex-row min-w-0 overflow-hidden p-2.5 items-center gap-2 bg-natural-white border border-grey-4 rounded-[12px]">
                {iconSrc && (
                    <img
                        src={iconSrc}
                        alt={'search-icon'}
                        className="h-[33px] w-[33px] object-contain"
                    />
                )}
                {summaryItems.map((item, index) => {
                    const isFixed = item.key === 'country' || item.key === 'where' || item.key === 'when'
                    const isFlexible = item.key === 'preferences'
                    const isGuests = item.key === 'guests'

                    return (
                        <React.Fragment key={item.key}>
                            <div
                                onClick={(e) => handleSummaryItemClick(item.key, e)}
                                className={
                                    isFixed
                                        ? 'flex flex-col shrink-0 grow-0 cursor-pointer'
                                        : isFlexible
                                          ? 'flex flex-col flex-1 min-w-0 cursor-pointer'
                                          : isGuests
                                            ? 'flex flex-col shrink-0 min-w-0 max-w-[90px] cursor-pointer'
                                            : 'flex flex-col min-w-0 cursor-pointer'
                                }>
                                <Typography
                                    size="10"
                                    weight="extrabold"
                                    color="grey-2">
                                    {item.label}
                                </Typography>
                                <Typography
                                    size="12"
                                    weight="bold"
                                    className={isFixed ? 'whitespace-nowrap' : 'truncate'}>
                                    {item.value}
                                </Typography>
                            </div>

                            {index < summaryItems.length - 1 && (
                                <Typography
                                    size="16"
                                    color="grey-3">
                                    ∙
                                </Typography>
                            )}
                        </React.Fragment>
                    )
                })}
            </div>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-grey-1 z-80"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="fixed inset-x-0 top-4 z-80 px-1 mx-auto flex flex-col max-h-[calc(100vh-120px)] my-auto">
                        <div className="flex justify-end pb-3">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-10 h-10 bg-grey-4 rounded-full flex items-center justify-center">
                                <X />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-white rounded-3xl border scrollbar-hide">
                            {isWhereEnabled && (
                                <MobileAccordion
                                    title="Where are you going?"
                                    value={whereText || 'Select destination'}
                                    isOpen={activeSection === 'where'}
                                    onToggle={() => setActiveSection((prev) => (prev === 'where' ? null : 'where'))}>
                                    <WhereSection
                                        value={whereText}
                                        whereConfig={whereConfig}
                                        selectedCountries={selectedCountries}
                                        allCitiesFromCountries={allCitiesFromCountries}
                                        selectedCities={selectedCities}
                                        onSelect={handleWhereSelect}
                                        onClose={() => setIsOpen(false)}
                                    />
                                </MobileAccordion>
                            )}

                            <MobileAccordion
                                title="When are you going?"
                                value={headerType === 'stays' ? formatRange(checkInDate, checkOutDate) : formatMonth(whenMonth)}
                                isOpen={activeSection === 'when'}
                                onToggle={() => setActiveSection((prev) => (prev === 'when' ? null : 'when'))}>
                                {headerType === 'stays' ? (
                                    <DatesCheckSectionStays
                                        checkIn={checkInDate}
                                        checkOut={checkOutDate}
                                        onChange={(s, e) => {
                                            setCheckInDate(s)
                                            setCheckOutDate(e)
                                            whenConfig?.onChange?.(s ?? undefined, e ?? undefined)
                                            if (s && e) setActiveSection('guests')
                                        }}
                                    />
                                ) : (
                                    <WhenSection
                                        value={whenMonth}
                                        onChange={(date) => {
                                            setWhenMonth(date)
                                            if (whenConfig?.onChange && date) {
                                                whenConfig.onChange(undefined, undefined, date.getMonth() + 1, date.getFullYear())
                                            }
                                            if (isPreferencesEnabled) {
                                                setActiveSection('preferences')
                                            } else {
                                                setActiveSection(null)
                                            }
                                        }}
                                    />
                                )}
                            </MobileAccordion>

                            {headerType === 'stays' && useCombinedGuestsRooms && (
                                <MobileAccordion
                                    title="Guests & Rooms"
                                    value={(() => {
                                        const flat = flattenOccupancies(occupancies)
                                        const totalGuests = flat.adults + flat.children
                                        return `${occupancies.length} ${occupancies.length === 1 ? 'Room' : 'Rooms'}, ${totalGuests} ${totalGuests === 1 ? 'Guest' : 'Guests'}`
                                    })()}
                                    isOpen={activeSection === 'guests'}
                                    onToggle={() => setActiveSection((prev) => (prev === 'guests' ? null : 'guests'))}>
                                    <div className="px-4 py-3">
                                        {occupancies.map((room, roomIdx) => (
                                            <div key={roomIdx} className={roomIdx > 0 ? 'mt-4 pt-4 border-t border-grey-4' : ''}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="font-['Red_Hat_Display'] text-[15px] font-bold" style={{ color: '#101010' }}>Room {roomIdx + 1}</p>
                                                    {roomIdx > 0 && (
                                                        <button onClick={() => setOccupancies(prev => { const next = prev.filter((_, i) => i !== roomIdx); const flat = flattenOccupancies(next); setGuests({ adults: flat.adults, children: flat.children, infants: 0, children_age: flat.childAges }); setRooms(flat.noOfRooms); return next })} className="p-1 rounded-full hover:bg-red-50 cursor-pointer">
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </button>
                                                    )}
                                                </div>
                                                {/* Adults */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <div><p className="font-['Red_Hat_Display'] text-[14px] font-[550]" style={{ color: '#363636' }}>Adult</p><p className="font-['Manrope'] text-[11px] font-semibold" style={{ color: '#747474' }}>Age 18+</p></div>
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => setOccupancies(prev => { const next = [...prev]; next[roomIdx] = { ...next[roomIdx], numOfAdults: Math.max(1, next[roomIdx].numOfAdults - 1) }; const flat = flattenOccupancies(next); setGuests({ adults: flat.adults, children: flat.children, infants: 0, children_age: flat.childAges }); setRooms(flat.noOfRooms); return next })} disabled={room.numOfAdults <= 1} className={`w-9 h-9 flex items-center justify-center transition-colors ${room.numOfAdults <= 1 ? 'rounded-full border border-grey-grey_4 bg-grey-grey_5 cursor-not-allowed opacity-40' : 'rounded-full border border-primary-default bg-natural-white text-primary-default cursor-pointer'}`}><span className="text-lg font-medium">−</span></button>
                                                        <span className="text-base font-semibold text-header-black w-6 text-center">{room.numOfAdults}</span>
                                                        <button onClick={() => setOccupancies(prev => { const next = [...prev]; next[roomIdx] = { ...next[roomIdx], numOfAdults: Math.min(MAX_ADULTS_PER_ROOM, next[roomIdx].numOfAdults + 1) }; const flat = flattenOccupancies(next); setGuests({ adults: flat.adults, children: flat.children, infants: 0, children_age: flat.childAges }); setRooms(flat.noOfRooms); return next })} disabled={room.numOfAdults >= MAX_ADULTS_PER_ROOM} className={`w-9 h-9 flex items-center justify-center transition-colors ${room.numOfAdults >= MAX_ADULTS_PER_ROOM ? 'rounded-full border border-grey-grey_4 bg-grey-grey_5 cursor-not-allowed opacity-40' : 'rounded-full border border-primary-default bg-natural-white text-primary-default cursor-pointer'}`}><span className="text-lg font-medium">+</span></button>
                                                    </div>
                                                </div>
                                                {/* Children */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <div><p className="font-['Red_Hat_Display'] text-[14px] font-[550]" style={{ color: '#363636' }}>Children</p><p className="font-['Manrope'] text-[11px] font-semibold" style={{ color: '#747474' }}>Age 17 or younger</p></div>
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => setOccupancies(prev => { const next = [...prev]; const ages = next[roomIdx].childAges.slice(0, -1); next[roomIdx] = { ...next[roomIdx], childAges: ages }; const flat = flattenOccupancies(next); setGuests({ adults: flat.adults, children: flat.children, infants: 0, children_age: flat.childAges }); setRooms(flat.noOfRooms); return next })} disabled={room.childAges.length <= 0} className={`w-9 h-9 flex items-center justify-center transition-colors ${room.childAges.length <= 0 ? 'rounded-full border border-grey-grey_4 bg-grey-grey_5 cursor-not-allowed opacity-40' : 'rounded-full border border-primary-default bg-natural-white text-primary-default cursor-pointer'}`}><span className="text-lg font-medium">−</span></button>
                                                        <span className="text-base font-semibold text-header-black w-6 text-center">{room.childAges.length}</span>
                                                        <button onClick={() => setOccupancies(prev => { const next = [...prev]; const ages = [...next[roomIdx].childAges, DEFAULT_CHILD_AGE]; next[roomIdx] = { ...next[roomIdx], childAges: ages }; const flat = flattenOccupancies(next); setGuests({ adults: flat.adults, children: flat.children, infants: 0, children_age: flat.childAges }); setRooms(flat.noOfRooms); return next })} disabled={room.childAges.length >= MAX_CHILDREN_PER_ROOM} className={`w-9 h-9 flex items-center justify-center transition-colors ${room.childAges.length >= MAX_CHILDREN_PER_ROOM ? 'rounded-full border border-grey-grey_4 bg-grey-grey_5 cursor-not-allowed opacity-40' : 'rounded-full border border-primary-default bg-natural-white text-primary-default cursor-pointer'}`}><span className="text-lg font-medium">+</span></button>
                                                    </div>
                                                </div>
                                                {/* Child ages */}
                                                {room.childAges.length > 0 && (
                                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                                        {room.childAges.map((age, childIdx) => (
                                                            <select key={childIdx} value={age} onChange={(e) => setOccupancies(prev => { const next = [...prev]; const ages = [...next[roomIdx].childAges]; ages[childIdx] = parseInt(e.target.value, 10); next[roomIdx] = { ...next[roomIdx], childAges: ages }; const flat = flattenOccupancies(next); setGuests({ adults: flat.adults, children: flat.children, infants: 0, children_age: flat.childAges }); setRooms(flat.noOfRooms); return next })} className="px-3 py-2 border border-grey-4 rounded-lg text-sm font-['Manrope'] text-grey-0 bg-white cursor-pointer focus:outline-none focus:border-primary-default">
                                                                {Array.from({ length: 18 }, (_, i) => (<option key={i} value={i}>Child {childIdx + 1}: Age {i}</option>))}
                                                            </select>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {occupancies.length < MAX_ROOMS && (
                                            <button onClick={() => { setOccupancies(prev => { const next = [...prev, { numOfAdults: 2, childAges: [] }]; const flat = flattenOccupancies(next); setGuests({ adults: flat.adults, children: flat.children, infants: 0, children_age: flat.childAges }); setRooms(flat.noOfRooms); return next }) }} className="mt-4 w-full py-3 border border-dashed border-grey-3 rounded-xl text-sm font-semibold font-['Red_Hat_Display'] text-grey-1 hover:border-primary-default hover:text-primary-default transition-colors cursor-pointer">
                                                Add Room
                                            </button>
                                        )}
                                    </div>
                                </MobileAccordion>
                            )}

                            {headerType === 'stays' && !useCombinedGuestsRooms && (
                                <MobileAccordion
                                    title="Who is going?"
                                    value={formatGuests(guests)}
                                    isOpen={activeSection === 'guests'}
                                    onToggle={() => setActiveSection((prev) => (prev === 'guests' ? null : 'guests'))}>
                                    <WhoIsGoing
                                        value={guests}
                                        onChange={handleGuestsChange}
                                        initialData={guestsConfig?.initialData}
                                    />
                                </MobileAccordion>
                            )}

                            {roomsConfig?.enabled && !useCombinedGuestsRooms && (
                                <MobileAccordion
                                    title="How many rooms?"
                                    value={rooms === 1 ? '1 room' : `${rooms} rooms`}
                                    isOpen={activeSection === 'rooms'}
                                    onToggle={() => setActiveSection((prev) => (prev === 'rooms' ? null : 'rooms'))}>
                                    <div className="flex items-center justify-between py-2 px-3">
                                        <div>
                                            <p
                                                className="font-['Red_Hat_Display'] text-[16px] font-[550] leading-[20px] tracking-[-0.32px]"
                                                style={{ color: '#363636' }}>
                                                Rooms
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 ">
                                            <button
                                                onClick={() => handleRoomsChange(rooms - 1)}
                                                disabled={rooms <= 1}
                                                className={`w-9 h-9 flex items-center justify-center transition-colors ${
                                                    rooms <= 1
                                                        ? 'rounded-full border border-grey-grey_4 bg-grey-grey_5 cursor-not-allowed opacity-40'
                                                        : 'rounded-full border border-primary-default bg-natural-white text-primary-default hover:bg-primary-default-80 cursor-pointer'
                                                }`}>
                                                <span className="text-lg font-medium">−</span>
                                            </button>
                                            <span className="text-base font-semibold text-header-black w-8 text-center">{rooms}</span>
                                            <button
                                                onClick={() => handleRoomsChange(rooms + 1)}
                                                disabled={rooms >= 9}
                                                className={`w-9 h-9 flex items-center justify-center transition-colors ${
                                                    rooms >= 9
                                                        ? 'rounded-full border border-grey-grey_4 bg-grey-grey_5 cursor-not-allowed opacity-40'
                                                        : 'rounded-full border border-primary-default bg-natural-white text-primary-default hover:bg-primary-default-80 cursor-pointer'
                                                }`}>
                                                <span className="text-lg font-medium">+</span>
                                            </button>
                                        </div>
                                    </div>
                                </MobileAccordion>
                            )}

                            {isPreferencesEnabled && (
                                <MobileAccordion
                                    title="What are your preferences?"
                                    value={preferencesSummary}
                                    isOpen={activeSection === 'preferences'}
                                    onToggle={() => setActiveSection((prev) => (prev === 'preferences' ? null : 'preferences'))}>
                                    <PreferencesSection
                                        groupTypes={DEFAULT_GROUP_TYPES}
                                        purposeTypes={DEFAULT_PURPOSE_TYPES}
                                        locationPreferences={locationPreferences}
                                        selectedGroupType={selectedGroupType}
                                        selectedPurposeType={selectedPurposeType}
                                        selectedLocationPreferences={selectedLocationPreferences}
                                        onGroupTypeSelect={setSelectedGroupType}
                                        onPurposeTypeSelect={setSelectedPurposeType}
                                        onLocationPreferenceToggle={(v) =>
                                            setSelectedLocationPreferences((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))
                                        }
                                        budgetConfig={preferencesConfig?.budgetConfig}
                                        selectedPriceRange={priceRange}
                                        onPriceRangeChange={setPriceRange}
                                        selectionLimit={preferencesConfig?.selectionLimit}
                                    />
                                </MobileAccordion>
                            )}
                        </div>
                    </div>

                    <div className="fixed inset-x-0 bottom-0 z-[81] bg-grey-5 border border-grey-4">
                        <div className="w-full py-4 pb-6 px-[31px]">
                            <button
                                onClick={handleSearch}
                                className="w-full bg-primary-default text-natural-white p-4 rounded-[12px] font-semibold font-red-hat-display flex items-center justify-center gap-2.5">
                                <Search className="w-4 h-4" />
                                {headerType === 'stays' ? 'Explore Stays' : 'Search'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    )
}

export default MobileSearchModal
