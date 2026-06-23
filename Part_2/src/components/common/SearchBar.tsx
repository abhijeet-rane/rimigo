import { Search, SlidersHorizontal, X, ArrowUpDown, ArrowDown01, ArrowDown10, Heart } from 'lucide-react'
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { WhereModal } from './SearchBar/modals/WhereModal'
import type { WhereModalSection } from './SearchBar/modals/WhereModal'
import { WhenModal, type WhenModalType } from './SearchBar/modals/WhenModal'
import { PreferencesModal, DEFAULT_GROUP_TYPES, DEFAULT_PURPOSE_TYPES, DEFAULT_LOCATION_PREFERENCES } from './SearchBar/modals/PreferencesModal'
import { CountryModal } from './SearchBar/modals/CountryModal'
import { GuestsModal, type GuestsData } from './SearchBar/modals/GuestsModal'
import { RoomsGuestsModal } from './SearchBar/modals/RoomsGuestsModal'
import type { OccupanciesConfig } from '@/types/occupancy'
import { flattenOccupancies, guestsDataToOccupancies } from '@/types/occupancy'
import { searchCities, type CityListItem, searchCountries, type CountryListItem } from '@/pages/Stays/Services'
import { getAllCitiesByCountry } from '@/api/locationApi'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import GuideTipper from '@/modules/UserGuideModal/pages/GuideTipper'
import { useOnboardingGuideContext } from '@/modules/UserGuideModal/context/OnboardingGuideProvider'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useCountryCities } from '@/modules/Acitvities/hooks/useCountryCities'
import { useSearchParams } from 'react-router-dom'

// Re-export for convenience
export type { WhenModalType, CityListItem, CountryListItem, GuestsData }
export { DEFAULT_LOCATION_PREFERENCES }

export interface SearchParams {
    cityId?: string
    cityName?: string
    countryId?: string
    countryName?: string
    // Multiselect support
    cityIds?: string[]
    cityNames?: string[]
    countryIds?: string[]
    countryNames?: string[]
    checkIn?: Date
    checkOut?: Date
    month?: number
    year?: number
    groupType?: string
    travelPurpose?: string
    cityPreferences?: string[]
    guestsData?: GuestsData
    priceRange?: { min: number; max: number }
    rooms?: number
    occupancies?: OccupanciesConfig
}

export interface SegmentConfig {
    enabled: boolean
    required?: boolean // If false, segment can be skipped in auto-progress
    label?: string
    placeholder?: string
    multiselect?: boolean
    initialData?: CountryListItem[] | CityListItem[]
    onChange?: (items: CountryListItem[] | CityListItem[]) => void
    metadata?: {
        countries?: CountryListItem[]
        cities?: CityListItem[]
    }
}

export type SearchResultItemType = 'city' | 'hotel' | string

export interface WhereDimensionItem {
    id: string
    title: string
    subtitle?: string
    description?: string
    type?: SearchResultItemType
    meta?: Record<string, unknown>
    raw?: unknown
}

export interface WhereDimensionSelectHelpers {
    closeModal: () => void
    query: string
}

export interface WhereDimensionSearchArgs {
    query: string
    selectedCountries: CountryListItem[]
    selectedCities: CityListItem[]
    metadataCities?: CityListItem[]
    allCitiesFromCountries: CityListItem[]
}

export interface WhereDimensionConfig<Item = any> {
    id: string
    label: string
    type?: SearchResultItemType
    enabled?: boolean
    limit?: number
    supportsSelection?: boolean
    isPrimary?: boolean
    closeOnSelect?: boolean
    search?: (args: WhereDimensionSearchArgs) => Promise<Item[]>
    mapItem: (item: Item, ctx: { query: string }) => WhereDimensionItem | null | undefined
    onSelect?: (item: WhereDimensionItem, helpers: WhereDimensionSelectHelpers) => void
    emptyMessage?: string
}

export interface WhereSegmentConfig extends SegmentConfig {
    dimensions?: WhereDimensionConfig[]
    // Optional custom search function to replace default searchCities API
    // If provided, this will be used instead of the default searchCities() call
    customSearchCities?: (query: string) => Promise<CityListItem[]>
    // Optional custom component to render the dropdown results
    // If provided, this component will be used instead of the default WhereModal rendering
    renderDropdown?: React.ComponentType<{
        isOpen: boolean
        onClose: () => void
        cities: CityListItem[]
        isLoadingCities: boolean
        whereText: string
        onCitySelect: (cityId: string, cityName: string) => void
        selectedCities: CityListItem[]
        multiselect: boolean
        anchorElement: HTMLElement | null
        sections?: WhereModalSection[]
        showWhenEmpty?: boolean
        hasInitialData?: boolean
        hasMetadata?: boolean
        isCountryEnabled?: boolean
    }>
    // Optional custom heading text for search matches section
    searchMatchesHeading?: string
}

export interface WhenSegmentConfig {
    enabled: boolean
    required?: boolean // If false, segment can be skipped in auto-progress
    label?: string
    placeholder?: string
    type?: WhenModalType
    checkInTimeLabel?: string
    checkOutTimeLabel?: string
    initialCheckIn?: Date
    initialCheckOut?: Date
    initialMonth?: number
    initialYear?: number // For year type and month_year type
    initialMonthYear?: number // For month_year type only - the year associated with the selected month
    onChange?: (checkIn?: Date, checkOut?: Date, month?: number, year?: number) => void
}

export interface GuestsSegmentConfig {
    enabled: boolean
    required?: boolean
    label?: string
    placeholder?: string
    initialData?: GuestsData
    onChange?: (data: GuestsData) => void
}

export interface RoomsSegmentConfig {
    enabled: boolean
    label?: string
    placeholder?: string
    initialData?: number
    /** Seed per-room occupancy for the combined Rooms+Guests modal. Takes
     * precedence over deriving from `guestsConfig.initialData` + `initialData`. */
    initialOccupancies?: OccupanciesConfig
    onChange?: (rooms: number) => void
}

export interface BudgetMetadata {
    bucket_size: number
    buckets: Array<{ min: number; max: number; count: number }>
    total_hotels: number
    min_rate: number
    max_rate: number
    check_in_date: string
    check_out_date: string
    status: 'processing' | 'in_progress' | 'completed' | 'failed' | 'timeout' | 'estimated'
}

export interface PreferencesSegmentConfig {
    enabled: boolean
    required?: boolean // If false, segment can be skipped in auto-progress
    label?: string
    placeholder?: string
    initialGroupType?: string
    initialTravelPurpose?: string
    initialLocationPreferences?: string[]
    selectionLimit?: number | null
    // Budget configuration
    budgetConfig?: {
        enabled: boolean
        metadata?: BudgetMetadata
        initialPriceRange?: { min: number; max: number }
    }
    onChange?: (groupType?: string, purposeType?: string, locationPreferences?: string[], priceRange?: { min: number; max: number }) => void
}

export interface LocationPreference {
    key: string
    value: string
    label: string
    icon: string
    imageUrl?: string
}

export interface SearchBarProps {
    onFilterClick?: () => void
    onSortClick?: () => void
    currentOrderBy?: Record<string, number>
    iconSrc?: string
    pageName?: string

    iconAlt?: string
    onSearch?: (params: SearchParams) => void
    // New: optionally open a specific segment
    initialActiveSegment?: 'where' | 'country' | 'when' | 'guests' | 'preferences' | null
    // Configuration for segments (now includes initial values and onChange callbacks)
    countryConfig?: SegmentConfig
    whereConfig?: WhereSegmentConfig
    whenConfig?: WhenSegmentConfig
    guestsConfig?: GuestsSegmentConfig
    roomsConfig?: RoomsSegmentConfig
    preferencesConfig?: PreferencesSegmentConfig
    // Location preferences for different screens
    locationPreferences?: LocationPreference[]
    // Show/hide filters and sort
    showFilters?: boolean
    hasActiveFilters?: boolean
    showSort?: boolean
    setCriteriaModalClosed?: (closed: boolean) => void
    wishlistConfig?: {
        enabled: boolean
        onClick?: () => void
        shortlistCount?: number | null
    }
}

const normalizeToStartOfDay = (date: Date) => {
    const normalized = new Date(date)
    normalized.setHours(0, 0, 0, 0)
    return normalized
}

const isDateBeforeToday = (date: Date | undefined, today: Date) => {
    if (!date) return false
    return normalizeToStartOfDay(date).getTime() < today.getTime()
}

const isMonthYearInPast = (month: number | null, year: number | null, today: Date) => {
    if (month === null || year === null) return false
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1
    if (year < currentYear) return true
    if (year === currentYear && month < currentMonth) return true
    return false
}

const isYearInPast = (year: number | null, today: Date) => {
    if (year === null) return false
    return year < today.getFullYear()
}

// Reusable Label Component
const SearchBarLabel = ({ children }: { children: React.ReactNode }) => {
    return (
        <div
            className="text-2 font-semibold leading-normal uppercase font-manrope"
            style={{ fontWeight: 645, fontSize: '11px' }}>
            {children}
        </div>
    )
}

const SearchBar = ({
    onFilterClick,
    onSortClick,
    currentOrderBy = { relevance: -1 },
    iconSrc = '/icons/bed.png',
    iconAlt = 'Hotels',
    onSearch,
    pageName,
    initialActiveSegment,
    countryConfig = { enabled: false, label: 'Country', placeholder: 'Search countries', multiselect: false },
    whereConfig = { enabled: true, label: 'Where', placeholder: 'Search destinations', multiselect: false },
    whenConfig = { enabled: true, label: 'When', placeholder: 'Add dates', type: 'date_range' },
    guestsConfig = { enabled: false, label: 'Guests', placeholder: 'Add guests' },
    roomsConfig = { enabled: false, label: 'Rooms', placeholder: '1 room' },
    preferencesConfig = { enabled: true, label: 'Preferences', placeholder: 'Add preferences' },
    locationPreferences = DEFAULT_LOCATION_PREFERENCES,
    showFilters = true,
    hasActiveFilters = false,
    showSort = true,
    setCriteriaModalClosed,
    wishlistConfig = { enabled: false, shortlistCount: 0 }
}: SearchBarProps) => {
    const todayStart = useMemo(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return today
    }, [])
    const locationPreferenceLimit =
        typeof preferencesConfig.selectionLimit === 'number' && preferencesConfig.selectionLimit > 0 ? preferencesConfig.selectionLimit : null

    const applyLocationPreferenceLimit = useCallback(
        (items: string[] = []) => {
            if (!items) return []
            if (locationPreferenceLimit) {
                return items.slice(0, locationPreferenceLimit)
            }
            return [...items]
        },
        [locationPreferenceLimit]
    )
    const [searchParams] = useSearchParams()

    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const [hoveredSegment, setHoveredSegment] = useState<string | null>(null)
    const [activeSegment, setActiveSegment] = useState<string | null>(null)
    const prevInitialActiveSegmentRef = useRef<SearchBarProps['initialActiveSegment'] | null>(null)
    const { guide, updateGuide } = useOnboardingGuideContext()

    // Get initial values from config
    const initialCity = (whereConfig.initialData as CityListItem[])?.[0]
    const initialCountry = (countryConfig.initialData as CountryListItem[])?.[0]
    const [isSetCreteriaOpen, SetIsSetCreateriaOpen] = useState(true)
    const [whereText, setWhereText] = useState<string>(initialCity?.name || '')
    const [countryText, setCountryText] = useState<string>(initialCountry?.name || '')
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const [selectedDates, setSelectedDates] = useState<{ checkIn?: Date; checkOut?: Date }>({
        checkIn: whenConfig.initialCheckIn,
        checkOut: whenConfig.initialCheckOut
    })
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
    const [selectedGroupType, setSelectedGroupType] = useState<string>(preferencesConfig.initialGroupType || '')
    const [selectedPurposeType, setSelectedPurposeType] = useState<string>(preferencesConfig.initialTravelPurpose || '')
    const [selectedLocationPreferences, setSelectedLocationPreferences] = useState<string[]>(() =>
        applyLocationPreferenceLimit(preferencesConfig.initialLocationPreferences || [])
    )
    const [priceRange, setPriceRange] = useState<{ min: number; max: number } | undefined>(preferencesConfig.budgetConfig?.initialPriceRange)
    // Ref to store the latest priceRange from PreferencesModal (used when search is clicked from modal)
    const priceRangeRef = useRef<{ min: number; max: number } | undefined>(preferencesConfig.budgetConfig?.initialPriceRange)

    // Sync ref when priceRange changes (from state updates)
    useEffect(() => {
        priceRangeRef.current = priceRange
    }, [priceRange])

    // Sync ref when initial priceRange changes (from URL/config)
    useEffect(() => {
        if (preferencesConfig.budgetConfig?.initialPriceRange) {
            priceRangeRef.current = preferencesConfig.budgetConfig.initialPriceRange
        }
    }, [preferencesConfig.budgetConfig?.initialPriceRange])
    const [guestsData, setGuestsData] = useState<GuestsData>(
        guestsConfig.initialData || {
            adults: 1,
            children: 0,
            infants: 0,
            children_age: []
        }
    )
    const [rooms, setRooms] = useState<number>(
        roomsConfig.initialOccupancies?.length || roomsConfig.initialData || 1
    )
    const [occupancies, setOccupancies] = useState<OccupanciesConfig>(() =>
        roomsConfig.initialOccupancies && roomsConfig.initialOccupancies.length > 0
            ? roomsConfig.initialOccupancies
            : guestsDataToOccupancies(
                  guestsConfig.initialData || { adults: 2, children: 0, children_age: [] },
                  roomsConfig.initialData || 1
              )
    )
    // Whether to use combined rooms+guests modal (when both are enabled)
    const useCombinedModal = guestsConfig.enabled && roomsConfig.enabled
    const { trackButtonClick } = usePostHog()

    // Multiselect state for countries and cities (from config)
    const [selectedCountries, setSelectedCountries] = useState<CountryListItem[]>((countryConfig.initialData as CountryListItem[]) || [])
    const [selectedCities, setSelectedCities] = useState<CityListItem[]>((whereConfig.initialData as CityListItem[]) || [])

    const whereInitialKey = Array.isArray(whereConfig.initialData) ? (whereConfig.initialData as CityListItem[]).map((item) => item.id).join(',') : ''
    const countryInitialKey = Array.isArray(countryConfig.initialData)
        ? (countryConfig.initialData as CountryListItem[]).map((item) => item.id).join(',')
        : ''
    const locationPreferencesInitialKey = Array.isArray(preferencesConfig.initialLocationPreferences)
        ? preferencesConfig.initialLocationPreferences.join(',')
        : ''
    const whenInitialKey = `${whenConfig.initialCheckIn?.toISOString() || ''},${whenConfig.initialCheckOut?.toISOString() || ''}`
    const preferencesInitialKey = `${preferencesConfig.initialGroupType || ''},${preferencesConfig.initialTravelPurpose || ''},${(preferencesConfig.initialLocationPreferences || []).join(',')}`
    const guestsInitialKey = guestsConfig.initialData
        ? `${guestsConfig.initialData.adults || 0},${guestsConfig.initialData.children || 0},${guestsConfig.initialData.infants || 0},${(guestsConfig.initialData.children_age || []).join(',')}`
        : ''

    // State for month/year selections (from config)
    const [selectedMonth, setSelectedMonth] = useState<number | null>(whenConfig.initialMonth ?? null)
    const [selectedMonthYear, setSelectedMonthYear] = useState<number | null>(whenConfig.initialMonthYear ?? null)
    const [selectedYear, setSelectedYear] = useState<number | null>(whenConfig.initialYear ?? null)

    // Internal state for city search
    const [cities, setCities] = useState<CityListItem[]>([])
    const [isLoadingCities, setIsLoadingCities] = useState(false)
    const [allCitiesFromCountries, setAllCitiesFromCountries] = useState<CityListItem[]>([])

    // Internal state for country search
    const [countries, setCountries] = useState<CountryListItem[]>([])
    const [isLoadingCountries, setIsLoadingCountries] = useState(false)

    // Track applied state (what was last searched)
    const [appliedState, setAppliedState] = useState({
        cityIds: [initialCity?.id].filter(Boolean), // Array of all selected city IDs
        countryIds: [initialCountry?.id].filter(Boolean), // Array of all selected country IDs
        checkIn: whenConfig.initialCheckIn,
        checkOut: whenConfig.initialCheckOut,
        month: whenConfig.initialMonth ?? null,
        year: whenConfig.initialMonthYear ?? whenConfig.initialYear ?? null,
        groupType: preferencesConfig.initialGroupType || '',
        travelPurpose: preferencesConfig.initialTravelPurpose || '',
        cityPreferences: applyLocationPreferenceLimit(preferencesConfig.initialLocationPreferences || []),
        priceRange: preferencesConfig.budgetConfig?.initialPriceRange,
        guests: {
            adults: guestsData.adults,
            children: guestsData.children,
            infants: guestsData.infants,
            children_age: guestsData.children_age
        },
        rooms: roomsConfig.initialData || 1
    })

    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const countryDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const dimensionDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const countrySegmentRef = useRef<HTMLButtonElement | null>(null)
    const whereSegmentRef = useRef<HTMLButtonElement | null>(null)
    const prevShortlistCountRef = useRef<number | null | undefined>(undefined)
    const [confettiIteration, setConfettiIteration] = useState(0)

    const shortlistCount = typeof wishlistConfig.shortlistCount === 'number' ? wishlistConfig.shortlistCount : 0
    const hasShortlist = shortlistCount > 0

    const defaultCityDimension = useMemo<WhereDimensionConfig<CityListItem>>(
        () => ({
            id: 'city',
            label: whereConfig.label ?? 'Cities',
            type: 'city',
            supportsSelection: true,
            isPrimary: true,
            mapItem: (city) => ({
                id: city.id,
                title: city.name,
                type: 'city',
                raw: city
            }),
            emptyMessage: 'No cities found'
        }),
        [whereConfig.label]
    )
    const isWherePrefilled = useMemo(() => {
        if (selectedCities.length > 0) return true

        if (activeSegment !== 'where' && whereText && whereText.trim() !== '') return true

        if (Array.isArray(whereConfig.initialData) && whereConfig.initialData.length > 0) return true

        return false
    }, [selectedCities.length, whereText, activeSegment, whereConfig.initialData])

    const shouldShowSetCriteriaGuide = useMemo(() => {
        if (guide?.stays?.set_criteria_guide === true) return false

        if (isWherePrefilled) return false

        if (!isSetCreteriaOpen) return false

        return true
    }, [guide?.stays?.set_criteria_guide, isWherePrefilled, isSetCreteriaOpen])

    const hasAutoTriggeredRef = useRef(false)
    const shouldFetchCitiesFromCountry = useMemo(() => {
        if (!activeTrip) return false
        const tripCountries = activeTrip.final_destination_countries || []
        const tripCities = activeTrip.final_destination_cities || []

        return tripCountries.length > 0 && tripCities.length === 0
    }, [activeTrip])

    const tripCountryId = useMemo(() => {
        if (!shouldFetchCitiesFromCountry) return undefined
        return activeTrip?.final_destination_countries?.[0]?.id
    }, [shouldFetchCitiesFromCountry, activeTrip])

    const { topCities, isLoading: isLoadingCountryCities } = useCountryCities({
        countryId: tripCountryId ?? ''
    })
    // Add a new ref to track when we should auto-search
    const shouldAutoSearchRef = useRef(false)
    useEffect(() => {
        if (pageName !== 'Stays') return
        if (!activeTrip || hasAutoTriggeredRef.current) {
            return
        }

        if (whenConfig.initialCheckIn || whenConfig.initialCheckOut) {
            hasAutoTriggeredRef.current = true
            return
        }

        const hasConfigCity = Array.isArray(whereConfig.initialData) && (whereConfig.initialData as CityListItem[]).length > 0
        const hasConfigCountry = Array.isArray(countryConfig.initialData) && (countryConfig.initialData as CountryListItem[]).length > 0
        if (hasConfigCity || hasConfigCountry) {
            hasAutoTriggeredRef.current = true
            return
        }

        const hasExistingSearch = Boolean(
            searchParams.get('check_in') || searchParams.get('check_out') || searchParams.get('city_id') || searchParams.get('country_id')
        )

        if (hasExistingSearch) {
            hasAutoTriggeredRef.current = true
            return
        }

        const tripCountries = activeTrip.final_destination_countries || []
        const tripCities = activeTrip.final_destination_cities || []

        if ((tripCountries.length === 0 && tripCities.length === 0) || selectedCountries.length > 0 || selectedCities.length > 0) {
            return
        }

        const getNextMonthDateRange = () => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const nextMonth = new Date(today)
            nextMonth.setMonth(today.getMonth() + 1)
            nextMonth.setDate(today.getDate() + 1)

            const dayAfter = new Date(nextMonth)
            dayAfter.setDate(nextMonth.getDate() + 1)

            return {
                checkIn: nextMonth,
                checkOut: dayAfter
            }
        }

        if (tripCities.length > 0) {
            hasAutoTriggeredRef.current = true

            const dates = getNextMonthDateRange()
            const tripCity = tripCities[0]
            const cityObj: CityListItem = {
                id: tripCity.id,
                name: tripCity.name
            }

            setTimeout(() => {
                setSelectedCities([cityObj])
                setWhereText(cityObj.name)
                setSelectedDates(dates)
                shouldAutoSearchRef.current = true
            }, 0)
            return
        }

        if (tripCountries.length > 0) {
            if (isLoadingCountryCities) {
                return
            }

            if (topCities && topCities.length > 0) {
                hasAutoTriggeredRef.current = true

                const dates = getNextMonthDateRange()
                const firstCity = topCities[0]
                const cityObj: CityListItem = {
                    id: firstCity.cityId,
                    name: firstCity.cityName ?? ''
                }

                setTimeout(() => {
                    setSelectedCities([cityObj])
                    setWhereText(cityObj.name)
                    setSelectedDates(dates)
                    shouldAutoSearchRef.current = true
                }, 0)
                return
            }

            hasAutoTriggeredRef.current = true

            const dates = getNextMonthDateRange()
            const tripCountry = tripCountries[0]
            const countryObj: CountryListItem = {
                id: tripCountry.id,
                name: tripCountry.name
            }

            setTimeout(() => {
                setSelectedCountries([countryObj])
                setCountryText(countryObj.name)
                setSelectedDates(dates)
                shouldAutoSearchRef.current = true
            }, 0)
        }
    }, [
        activeTrip,
        topCities,
        isLoadingCountryCities,
        selectedCountries.length,
        selectedCities.length,
        searchParams,
        whenConfig.initialCheckIn,
        whenConfig.initialCheckOut,
        whereConfig.initialData,
        countryConfig.initialData,
        pageName
    ])

    useEffect(() => {
        if (shouldAutoSearchRef.current) {
            const hasLocation = selectedCountries.length > 0 || selectedCities.length > 0
            const hasDates = selectedDates.checkIn && selectedDates.checkOut

            if (hasLocation && hasDates) {
                // Reset the flag BEFORE triggering search to prevent duplicate searches
                shouldAutoSearchRef.current = false

                // Small delay to ensure all state is settled
                setTimeout(() => {
                    handleSearchClick()
                }, 100)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCountries.length, selectedCities.length, selectedDates.checkIn, selectedDates.checkOut])

    // Auto-complete the guide step if where is prefilled
    useEffect(() => {
        if (isWherePrefilled && guide?.stays?.set_criteria_guide === false) {
            // Silently mark as complete without showing the guide
            updateGuide({
                ...guide,
                stays: {
                    ...guide.stays,
                    set_criteria_guide: true
                }
            })
        }
    }, [isWherePrefilled, guide, updateGuide])
    const dimensionConfigs = useMemo<WhereDimensionConfig[]>(() => {
        const customDimensions = (whereConfig.dimensions || []).filter((dimension) => dimension && dimension.enabled !== false)
        const customCityDimension = customDimensions.find((dimension) => dimension.id === 'city')
        const otherDimensions = customDimensions.filter((dimension) => dimension.id !== 'city')

        const cityDimension = customCityDimension
            ? {
                  ...defaultCityDimension,
                  ...customCityDimension,
                  supportsSelection: true,
                  isPrimary: true,
                  mapItem: customCityDimension.mapItem ?? defaultCityDimension.mapItem
              }
            : defaultCityDimension

        return [cityDimension, ...otherDimensions]
    }, [whereConfig.dimensions, defaultCityDimension])

    const additionalDimensions = useMemo(() => dimensionConfigs.filter((dimension) => dimension.id !== 'city'), [dimensionConfigs])

    const [dimensionResults, setDimensionResults] = useState<Record<string, WhereDimensionItem[]>>({})
    const [dimensionLoadingState, setDimensionLoadingState] = useState<Record<string, boolean>>({})
    const dimensionRequestIdRef = useRef<Record<string, number>>({})

    const trimmedWhereText = useMemo(() => whereText.trim(), [whereText])

    useEffect(() => {
        const activeIds = new Set(dimensionConfigs.map((dimension) => dimension.id))

        setDimensionResults((prev) => {
            const next: Record<string, WhereDimensionItem[]> = {}
            activeIds.forEach((id) => {
                if (prev[id]) {
                    next[id] = prev[id]
                }
            })
            return next
        })

        setDimensionLoadingState((prev) => {
            const next: Record<string, boolean> = {}
            activeIds.forEach((id) => {
                if (prev[id] !== undefined) {
                    next[id] = prev[id]
                }
            })
            return next
        })

        const current = dimensionRequestIdRef.current
        Object.keys(current).forEach((id) => {
            if (!activeIds.has(id)) {
                delete current[id]
            }
        })
    }, [dimensionConfigs])

    // Open initial active segment if provided
    useEffect(() => {
        if (initialActiveSegment) {
            setActiveSegment(initialActiveSegment)
        } else if (prevInitialActiveSegmentRef.current) {
            setActiveSegment(null)
        }
        prevInitialActiveSegmentRef.current = initialActiveSegment ?? null
    }, [initialActiveSegment])

    useEffect(() => {
        if (!wishlistConfig.enabled) return
        const currentCount = wishlistConfig.shortlistCount ?? 0
        const previousCount = prevShortlistCountRef.current ?? 0

        if (currentCount > previousCount && currentCount > 0) {
            setConfettiIteration((iteration) => iteration + 1)
        }

        prevShortlistCountRef.current = currentCount
    }, [wishlistConfig.shortlistCount, wishlistConfig.enabled])

    // Sync whereText with config initialData (only when segment is not active)
    useEffect(() => {
        if (activeSegment !== 'where') {
            const initialCity = (whereConfig.initialData as CityListItem[])?.[0]
            setWhereText(initialCity?.name || '')
        }
    }, [whereConfig.initialData, activeSegment])

    // Clear input when where segment opens if metadata cities are provided (for searchable multiselect)
    useEffect(() => {
        if (activeSegment === 'where' && whereConfig.metadata?.cities && whereConfig.metadata.cities.length > 0) {
            setWhereText('')
        }
    }, [activeSegment, whereConfig.metadata?.cities])

    // Sync countryText with config initialData (only when segment is not active)
    useEffect(() => {
        if (activeSegment !== 'country') {
            const initialCountry = (countryConfig.initialData as CountryListItem[])?.[0]
            setCountryText(initialCountry?.name || '')
        }
    }, [countryConfig.initialData, activeSegment])

    // Clear input when country segment opens if metadata countries are provided (for searchable multiselect)
    useEffect(() => {
        if (activeSegment === 'country' && countryConfig.metadata?.countries && countryConfig.metadata.countries.length > 0) {
            setCountryText('')
        }
    }, [activeSegment, countryConfig.metadata?.countries])

    // Keep selected cities in sync with config-provided initial data
    useEffect(() => {
        const initialCities = (whereConfig.initialData as CityListItem[]) || []
        setSelectedCities(initialCities)
    }, [whereInitialKey])

    // Keep selected countries in sync with config-provided initial data
    useEffect(() => {
        const initialCountries = (countryConfig.initialData as CountryListItem[]) || []
        setSelectedCountries(initialCountries)
    }, [countryInitialKey])

    // Prefill from config on mount/when provided
    useEffect(() => {
        if (whenConfig.initialCheckIn && !selectedDates.checkIn) {
            setSelectedDates((prev) => ({ checkIn: whenConfig.initialCheckIn, checkOut: prev.checkOut }))
        }
        if (whenConfig.initialCheckOut && !selectedDates.checkOut) {
            setSelectedDates((prev) => ({ checkIn: prev.checkIn, checkOut: whenConfig.initialCheckOut }))
        }
        if (preferencesConfig.initialGroupType && !selectedGroupType) {
            setSelectedGroupType(preferencesConfig.initialGroupType)
        }
        if (preferencesConfig.initialTravelPurpose && !selectedPurposeType) {
            setSelectedPurposeType(preferencesConfig.initialTravelPurpose)
        }
        if (
            preferencesConfig.initialLocationPreferences &&
            preferencesConfig.initialLocationPreferences.length &&
            selectedLocationPreferences.length === 0
        ) {
            setSelectedLocationPreferences(applyLocationPreferenceLimit(preferencesConfig.initialLocationPreferences))
        }
    }, [
        whenConfig.initialCheckIn,
        whenConfig.initialCheckOut,
        preferencesConfig.initialGroupType,
        preferencesConfig.initialTravelPurpose,
        preferencesConfig.initialLocationPreferences,
        locationPreferenceLimit
    ])

    // Sync dates when initial data changes from parent
    useEffect(() => {
        if (whenConfig.initialCheckIn || whenConfig.initialCheckOut) {
            setSelectedDates({ checkIn: whenConfig.initialCheckIn, checkOut: whenConfig.initialCheckOut })
        }
    }, [whenInitialKey])

    // Sync location preferences when config updates (e.g., via URL changes)
    useEffect(() => {
        const initialPrefs = preferencesConfig.initialLocationPreferences || []
        setSelectedLocationPreferences(applyLocationPreferenceLimit(initialPrefs))
    }, [locationPreferencesInitialKey, applyLocationPreferenceLimit])

    // Sync preferences when initial data changes from parent
    useEffect(() => {
        setSelectedGroupType(preferencesConfig.initialGroupType || '')
        setSelectedPurposeType(preferencesConfig.initialTravelPurpose || '')
        const initialPrefs = preferencesConfig.initialLocationPreferences || []
        setSelectedLocationPreferences(applyLocationPreferenceLimit(initialPrefs))
        // Sync price range from config
        if (preferencesConfig.budgetConfig?.initialPriceRange) {
            setPriceRange(preferencesConfig.budgetConfig.initialPriceRange)
        }
    }, [preferencesInitialKey, applyLocationPreferenceLimit, preferencesConfig.budgetConfig?.initialPriceRange])

    // Sync preferences from config when preferences modal opens (reflect URL changes)
    useEffect(() => {
        if (activeSegment === 'preferences') {
            setSelectedGroupType(preferencesConfig.initialGroupType || '')
            setSelectedPurposeType(preferencesConfig.initialTravelPurpose || '')
            setSelectedLocationPreferences(
                preferencesConfig.initialLocationPreferences && preferencesConfig.initialLocationPreferences.length
                    ? applyLocationPreferenceLimit(preferencesConfig.initialLocationPreferences)
                    : []
            )
            // Sync price range from config when modal opens
            if (preferencesConfig.budgetConfig?.initialPriceRange) {
                setPriceRange(preferencesConfig.budgetConfig.initialPriceRange)
            }
        }
    }, [
        activeSegment,
        preferencesConfig.initialGroupType,
        preferencesConfig.initialTravelPurpose,
        preferencesConfig.initialLocationPreferences,
        preferencesConfig.budgetConfig?.initialPriceRange,
        applyLocationPreferenceLimit
    ])

    // Fetch cities from selected countries
    useEffect(() => {
        const fetchCitiesFromCountries = async () => {
            if (countryConfig.enabled && selectedCountries.length > 0) {
                setIsLoadingCities(true)
                try {
                    const allCities: CityListItem[] = []
                    for (const country of selectedCountries) {
                        const response = await getAllCitiesByCountry(country.name)
                        if (response.results && Array.isArray(response.results)) {
                            allCities.push(...response.results)
                        }
                    }
                    setAllCitiesFromCountries(allCities)

                    // Clear selected cities that don't belong to the current countries
                    if (selectedCities.length > 0) {
                        const validCityIds = new Set(allCities.map((city) => city.id))
                        const filteredCities = selectedCities.filter((city) => validCityIds.has(city.id))

                        // Only update if cities were actually removed
                        if (filteredCities.length !== selectedCities.length) {
                            setSelectedCities(filteredCities)
                            if (filteredCities.length === 0) {
                                setWhereText('')
                            } else if (filteredCities.length === 1) {
                                setWhereText(filteredCities[0].name)
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error fetching cities from countries:', error)
                    setAllCitiesFromCountries([])
                } finally {
                    setIsLoadingCities(false)
                }
            } else {
                setAllCitiesFromCountries([])
                // Clear cities if no countries are selected
                if (countryConfig.enabled && selectedCities.length > 0) {
                    setSelectedCities([])
                    setWhereText('')
                }
            }
        }

        fetchCitiesFromCountries()
    }, [selectedCountries, countryConfig.enabled])

    // Real-time callbacks for country changes
    useEffect(() => {
        if (countryConfig.onChange) {
            countryConfig.onChange(selectedCountries as any)
        }
    }, [selectedCountries, countryConfig.onChange])

    // Real-time callbacks for city changes
    useEffect(() => {
        if (whereConfig.onChange) {
            whereConfig.onChange(selectedCities as any)
        }
    }, [selectedCities, whereConfig.onChange])

    // Real-time callbacks for date/time changes
    useEffect(() => {
        if (whenConfig.onChange) {
            whenConfig.onChange(selectedDates.checkIn, selectedDates.checkOut, selectedMonth ?? undefined, selectedYear ?? undefined)
        }
    }, [selectedDates.checkIn, selectedDates.checkOut, selectedMonth, selectedYear, whenConfig.onChange])

    // Note: No real-time callbacks for preferences - ALL preferences are only applied on search click
    // This prevents navigation blocking and URL update throttling
    // Preferences (groupType, travelPurpose, locationPreferences, priceRange) are only updated
    // in URL when handleSearchClick is called

    // Real-time callbacks for guests changes
    useEffect(() => {
        if (guestsConfig.onChange) {
            guestsConfig.onChange(guestsData)
        }
    }, [guestsData, guestsConfig.onChange])

    // When rooms change, ensure at least 1 adult per room
    const handleRoomsChange = useCallback((newRooms: number) => {
        const clamped = Math.max(1, Math.min(9, newRooms))
        setRooms(clamped)
        if (guestsData.adults < clamped) {
            setGuestsData((prev) => ({ ...prev, adults: clamped }))
        }
    }, [guestsData.adults])

    // Real-time callbacks for rooms changes
    useEffect(() => {
        if (roomsConfig.onChange) {
            roomsConfig.onChange(rooms)
        }
    }, [rooms, roomsConfig.onChange])

    // Sync rooms from config when initialData changes
    useEffect(() => {
        if (roomsConfig.initialData) {
            setRooms(roomsConfig.initialData)
        }
    }, [roomsConfig.initialData])

    // Sync guests data when initial data changes from parent (e.g., via URL changes)
    useEffect(() => {
        if (guestsConfig.initialData) {
            setGuestsData(guestsConfig.initialData)
        }
    }, [guestsInitialKey, guestsConfig.initialData])

    // Debounced city search - now handled internally
    useEffect(() => {
        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        // Check if metadata cities are provided
        const metadataCities = whereConfig.metadata?.cities

        // Only trigger search if:
        // 1. The "where" modal is open
        // 2. whereText is not empty
        // 3. whereText has at least 3 characters
        const trimmedText = whereText.trim()
        if (activeSegment === 'where' && trimmedText.length >= 3) {
            setIsLoadingCities(true)
            debounceTimerRef.current = setTimeout(async () => {
                try {
                    if (metadataCities && metadataCities.length > 0) {
                        // Filter from metadata cities
                        const searchTerm = trimmedText.toLowerCase()
                        let filtered = metadataCities.filter((city) => city.name.toLowerCase().includes(searchTerm))

                        // If countries are selected, further filter metadata cities by selected countries
                        if (countryConfig.enabled && selectedCountries.length > 0 && allCitiesFromCountries.length > 0) {
                            const countryCityIds = new Set(allCitiesFromCountries.map((c) => c.id))
                            filtered = filtered.filter((city) => countryCityIds.has(city.id))
                        }

                        setCities(filtered)
                    } else if (countryConfig.enabled && selectedCountries.length > 0) {
                        // If countries are selected, do local search within those cities
                        const filtered = allCitiesFromCountries.filter((city) => city.name.toLowerCase().includes(trimmedText.toLowerCase()))
                        setCities(filtered)
                    } else {
                        // Use custom search function if provided, otherwise use default searchCities
                        if (whereConfig.customSearchCities) {
                            const results = await whereConfig.customSearchCities(trimmedText)
                            setCities(results)
                        } else {
                            // Default global search
                            const results = await searchCities(trimmedText)
                            setCities(results)
                        }
                    }
                } catch (error) {
                    console.error('Error searching cities:', error)
                    setCities([])
                } finally {
                    setIsLoadingCities(false)
                }
            }, 800) // 0.8s debounce
        } else if (activeSegment === 'where' && (!whereText || trimmedText.length < 3)) {
            // Show cities based on priority: metadata > initialData > countries > empty
            // Only show if text is empty, not if it's less than 3 characters
            if (!whereText || trimmedText.length === 0) {
                if (metadataCities && metadataCities.length > 0) {
                    // Show all metadata cities, optionally filtered by selected countries
                    let citiesToShow = metadataCities
                    if (countryConfig.enabled && selectedCountries.length > 0 && allCitiesFromCountries.length > 0) {
                        const countryCityIds = new Set(allCitiesFromCountries.map((c) => c.id))
                        citiesToShow = metadataCities.filter((city) => countryCityIds.has(city.id))
                    }
                    setCities(citiesToShow)
                } else if (Array.isArray(whereConfig.initialData) && whereConfig.initialData.length > 0) {
                    // Show cities from initialData (filter out already selected ones)
                    const initialCities = whereConfig.initialData as CityListItem[]
                    const selectedIds = new Set(selectedCities.map((c) => c.id))
                    const unselectedInitial = initialCities.filter((city) => !selectedIds.has(city.id))

                    // If countries are selected, filter initial cities by selected countries
                    if (countryConfig.enabled && selectedCountries.length > 0 && allCitiesFromCountries.length > 0) {
                        const countryCityIds = new Set(allCitiesFromCountries.map((c) => c.id))
                        const filtered = unselectedInitial.filter((city) => countryCityIds.has(city.id))
                        setCities(filtered)
                    } else {
                        setCities(unselectedInitial)
                    }
                } else if (countryConfig.enabled && selectedCountries.length > 0) {
                    // Show all cities from selected countries
                    setCities(allCitiesFromCountries)
                } else {
                    setCities([])
                }
                setIsLoadingCities(false)
            } else {
                // Clear cities if search text has less than 3 characters
                setCities([])
                setIsLoadingCities(false)
            }
        } else {
            // Clear cities if search text is empty
            setCities([])
            setIsLoadingCities(false)
        }

        // Cleanup timer on unmount
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
        }
    }, [whereText, activeSegment, countryConfig.enabled, selectedCountries.length, allCitiesFromCountries, whereConfig.metadata?.cities])

    useEffect(() => {
        if (additionalDimensions.length === 0) {
            return
        }

        if (dimensionDebounceTimerRef.current) {
            clearTimeout(dimensionDebounceTimerRef.current)
        }

        const shouldSearch = activeSegment === 'where' && trimmedWhereText.length >= 3

        if (!shouldSearch) {
            additionalDimensions.forEach((dimension) => {
                setDimensionResults((prev) => {
                    if (!prev[dimension.id] || prev[dimension.id].length === 0) {
                        return prev
                    }
                    const next = { ...prev }
                    next[dimension.id] = []
                    return next
                })
                setDimensionLoadingState((prev) => {
                    if (prev[dimension.id] === false || prev[dimension.id] === undefined) {
                        return prev
                    }
                    const next = { ...prev }
                    next[dimension.id] = false
                    return next
                })
            })
            return
        }

        // Show loading immediately for snappy feedback, debounce the actual fetch.
        additionalDimensions.forEach((dimension) => {
            if (!dimension.search) return
            setDimensionLoadingState((prev) => ({ ...prev, [dimension.id]: true }))
        })

        dimensionDebounceTimerRef.current = setTimeout(() => {
            additionalDimensions.forEach((dimension) => {
                if (!dimension.search) return

                const requestId = (dimensionRequestIdRef.current[dimension.id] || 0) + 1
                dimensionRequestIdRef.current[dimension.id] = requestId

                dimension
                    .search({
                        query: trimmedWhereText,
                        selectedCountries,
                        selectedCities,
                        metadataCities: whereConfig.metadata?.cities as CityListItem[] | undefined,
                        allCitiesFromCountries
                    })
                .then((results) => {
                    if (dimensionRequestIdRef.current[dimension.id] !== requestId) {
                        return
                    }
                    const mapped =
                        results
                            ?.map((item) => dimension.mapItem(item, { query: trimmedWhereText }))
                            .filter((item): item is WhereDimensionItem => Boolean(item)) ?? []
                    const limited = dimension.limit ? mapped.slice(0, dimension.limit) : mapped
                    setDimensionResults((prev) => ({
                        ...prev,
                        [dimension.id]: limited
                    }))
                })
                .catch((error) => {
                    console.error(`[SearchBar] Failed to fetch results for dimension "${dimension.id}":`, error)
                    if (dimensionRequestIdRef.current[dimension.id] !== requestId) {
                        return
                    }
                    setDimensionResults((prev) => ({
                        ...prev,
                        [dimension.id]: []
                    }))
                })
                .finally(() => {
                    if (dimensionRequestIdRef.current[dimension.id] !== requestId) {
                        return
                    }
                    setDimensionLoadingState((prev) => ({
                        ...prev,
                        [dimension.id]: false
                    }))
                })
            })
        }, 800)

        return () => {
            if (dimensionDebounceTimerRef.current) {
                clearTimeout(dimensionDebounceTimerRef.current)
            }
        }
    }, [
        additionalDimensions,
        trimmedWhereText,
        activeSegment,
        selectedCountries,
        selectedCities,
        allCitiesFromCountries,
        whereConfig.metadata?.cities
    ])

    // Debounced country search - handled internally
    useEffect(() => {
        // Clear existing timer
        if (countryDebounceTimerRef.current) {
            clearTimeout(countryDebounceTimerRef.current)
        }

        // Check if metadata countries are provided
        const metadataCountries = countryConfig.metadata?.countries

        // Only trigger search if:
        // 1. The "country" modal is open
        // 2. countryText is not empty
        if (activeSegment === 'country' && countryText && countryText.trim() !== '') {
            setIsLoadingCountries(true)
            countryDebounceTimerRef.current = setTimeout(async () => {
                try {
                    if (metadataCountries && metadataCountries.length > 0) {
                        // Filter from metadata countries
                        const searchTerm = countryText.toLowerCase()
                        const filtered = metadataCountries.filter((country) => country.name.toLowerCase().includes(searchTerm))
                        setCountries(filtered)
                    } else {
                        // Global search
                        const results = await searchCountries(countryText)
                        setCountries(results)
                    }
                } catch (error) {
                    console.error('Error searching countries:', error)
                    setCountries([])
                } finally {
                    setIsLoadingCountries(false)
                }
            }, 300) // 0.3s debounce
        } else if (activeSegment === 'country' && (!countryText || countryText.trim() === '')) {
            // If country modal is open but no search text
            setIsLoadingCountries(true)
            countryDebounceTimerRef.current = setTimeout(async () => {
                try {
                    if (metadataCountries && metadataCountries.length > 0) {
                        // Show all metadata countries
                        setCountries(metadataCountries)
                    } else {
                        // Fetch popular countries
                        const results = await searchCountries('')
                        setCountries(results)
                    }
                } catch (error) {
                    console.error('Error fetching popular countries:', error)
                    setCountries([])
                } finally {
                    setIsLoadingCountries(false)
                }
            }, 100) // Shorter debounce for initial load
        } else {
            // Clear countries if modal is closed
            setCountries([])
            setIsLoadingCountries(false)
        }

        // Cleanup timer on unmount
        return () => {
            if (countryDebounceTimerRef.current) {
                clearTimeout(countryDebounceTimerRef.current)
            }
        }
    }, [countryText, activeSegment, countryConfig.metadata?.countries])

    // Utility function to sort list with selected items on top
    const sortWithSelectedOnTop = <T extends { id: string }>(list: T[], selectedItems: T[]): T[] => {
        const selectedIds = new Set(selectedItems.map((item) => item.id))
        const selected = list.filter((item) => selectedIds.has(item.id))
        const unselected = list.filter((item) => !selectedIds.has(item.id))
        return [...selected, ...unselected]
    }

    const handleLocationSelect = (cityId: string, cityName: string) => {
        // Try to find city in cities array (from search results)
        let city = cities.find((c) => c.id === cityId)

        // If not found, create city object (fallback for edge cases)
        if (!city) {
            city = { id: cityId, name: cityName }
        }

        if (whereConfig.multiselect) {
            // Multiselect mode: toggle selection
            setSelectedCities((prev) => {
                const isSelected = prev.some((c) => c.id === cityId)
                if (isSelected) {
                    return prev.filter((c) => c.id !== cityId)
                } else {
                    return [...prev, city!]
                }
            })
            // Clear input text for better UX - allows user to search for more cities
            setWhereText('')
            // In multiselect, keep modal open
        } else {
            // Single select mode
            setSelectedCities([city])
            setWhereText(cityName)

            // Auto-progress to next empty REQUIRED field only
            const isWhenComplete = (() => {
                if (whenConfig.type === 'date_range' || whenConfig.type === 'datetime_range') {
                    return selectedDates.checkIn && selectedDates.checkOut
                } else if (whenConfig.type === 'year') {
                    return selectedYear !== null
                } else if (whenConfig.type === 'month_year') {
                    return selectedMonth !== null && selectedMonthYear !== null
                }
                return true
            })()

            // Auto-progress to next enabled segment
            // Priority: when (if enabled and not complete) > guests (if required)
            if (whenConfig.enabled && !isWhenComplete) {
                setActiveSegment('when')
            } else if (guestsConfig.enabled && guestsConfig.required === true) {
                // Check if guests are configured (only if required)
                const hasGuests = guestsData.adults > 0 || guestsData.children > 0 || guestsData.infants > 0
                if (!hasGuests) {
                    setActiveSegment('guests')
                } else {
                    setActiveSegment(null)
                }
            } else {
                setActiveSegment(null)
            }
        }
    }

    const handleClearLocation = (e: React.MouseEvent) => {
        e.stopPropagation()
        setWhereText('')
        setSelectedCities([])
    }

    const handleCountrySelect = (countryId: string, countryName: string) => {
        const country = countries.find((c) => c.id === countryId)
        if (!country) return

        if (countryConfig.multiselect) {
            // Multiselect mode: toggle selection
            setSelectedCountries((prev) => {
                const isSelected = prev.some((c) => c.id === countryId)
                const newCountries = isSelected ? prev.filter((c) => c.id !== countryId) : [...prev, country]

                // Clear selected cities and input text that don't belong to the newly selected countries
                // This will be handled by the useEffect that watches selectedCountries
                return newCountries
            })

            // Clear input text for better UX - allows user to search for more countries
            setCountryText('')
            // Clear the where input text when country changes in multiselect
            setWhereText('')
            // In multiselect, keep modal open
        } else {
            // Single select mode
            setSelectedCountries([country])
            setCountryText(countryName)

            // Clear selected cities since country changed
            setSelectedCities([])
            setWhereText('')

            // Auto-progress to next empty REQUIRED field only
            const isWhenComplete = (() => {
                if (whenConfig.type === 'date_range' || whenConfig.type === 'datetime_range') {
                    return selectedDates.checkIn && selectedDates.checkOut
                } else if (whenConfig.type === 'year') {
                    return selectedYear !== null
                } else if (whenConfig.type === 'month_year') {
                    return selectedMonth !== null && selectedMonthYear !== null
                }
                return true
            })()

            // Auto-progress: only go to where if it's REQUIRED
            if (whereConfig.enabled && whereConfig.required !== false) {
                setActiveSegment('where')
            } else if (whenConfig.enabled && whenConfig.required !== false && !isWhenComplete) {
                setActiveSegment('when')
            } else if (guestsConfig.enabled && guestsConfig.required === true) {
                // Check if guests are configured (only if required)
                const hasGuests = guestsData.adults > 0 || guestsData.children > 0 || guestsData.infants > 0
                if (!hasGuests) {
                    setActiveSegment('guests')
                } else {
                    setActiveSegment(null)
                }
            } else {
                setActiveSegment(null)
            }
        }
    }

    const handleClearCountry = (e: React.MouseEvent) => {
        e.stopPropagation()
        setCountryText('')
        setSelectedCountries([])
        // Also clear cities since they depend on country selection
        if (whereConfig.enabled) {
            setSelectedCities([])
            setWhereText('')
        }
    }

    const handleSearchClick = () => {
        const selectedCity = selectedCities[0]
        const selectedCountry = selectedCountries[0]

        if (onSearch) {
            // For month_year type, use selectedMonthYear as the year
            const yearValue = whenConfig.type === 'month_year' ? selectedMonthYear : selectedYear
            // Use ref to get the latest priceRange (especially important when called from PreferencesModal)
            const currentPriceRange = priceRangeRef.current

            // 🔥🔥🔥 PostHog: Track Search Button Click
            trackButtonClick({
                button_name: 'Search Button',
                location: 'SearchBar',
                extra: {
                    // Single selects
                    cityId: selectedCity?.id,
                    cityName: selectedCity?.name,
                    countryId: selectedCountry?.id,
                    countryName: selectedCountry?.name,

                    // Multi-select
                    cityIds: selectedCities.map((c) => c.id),
                    countryIds: selectedCountries.map((c) => c.id),

                    // Dates
                    checkIn: selectedDates.checkIn,
                    checkOut: selectedDates.checkOut,

                    // When
                    month: selectedMonth,
                    year: yearValue,

                    // Preferences
                    groupType: selectedGroupType,
                    travelPurpose: selectedPurposeType,
                    cityPreferences: selectedLocationPreferences,
                    priceRange: currentPriceRange,

                    // Guests
                    guests: guestsConfig.enabled ? guestsData : undefined
                }
            })

            // Extract country info from city object if present (from search results)
            const cityWithCountry = selectedCity as CityListItem & { country_id?: string; country_name?: string }
            const countryIdFromCity = cityWithCountry?.country_id
            const countryNameFromCity = cityWithCountry?.country_name

            onSearch({
                // Single select (backward compatibility)
                cityId: selectedCity?.id,
                cityName: selectedCity?.name,
                countryId: selectedCountry?.id || countryIdFromCity,
                countryName: selectedCountry?.name || countryNameFromCity,
                // Multiselect arrays
                cityIds: selectedCities.length > 0 ? selectedCities.map((c) => c.id) : undefined,
                cityNames: selectedCities.length > 0 ? selectedCities.map((c) => c.name) : undefined,
                countryIds: selectedCountries.length > 0 ? selectedCountries.map((c) => c.id) : undefined,
                countryNames: selectedCountries.length > 0 ? selectedCountries.map((c) => c.name) : undefined,
                checkIn: selectedDates.checkIn,
                checkOut: selectedDates.checkOut,
                month: selectedMonth ?? undefined,
                year: yearValue ?? undefined,
                groupType: selectedGroupType,
                travelPurpose: selectedPurposeType,
                cityPreferences: selectedLocationPreferences,
                priceRange: currentPriceRange,
                guestsData: guestsConfig.enabled ? guestsData : undefined,
                rooms: roomsConfig.enabled ? rooms : undefined,
                occupancies: useCombinedModal ? occupancies : undefined
            })

            // Update applied state after search
            setAppliedState({
                cityIds: selectedCities.map((c) => c.id),
                countryIds: selectedCountries.map((c) => c.id),
                checkIn: selectedDates.checkIn,
                checkOut: selectedDates.checkOut,
                month: selectedMonth,
                year: yearValue,
                groupType: selectedGroupType,
                travelPurpose: selectedPurposeType,
                cityPreferences: selectedLocationPreferences,
                priceRange: priceRange,
                guests: {
                    adults: guestsData.adults,
                    children: guestsData.children,
                    infants: guestsData.infants,
                    children_age: guestsData.children_age
                },
                rooms
            })
        }
        // Close any open modal
        setActiveSegment(null)
    }

    // Preference handlers
    const handleGroupTypeSelect = (value: string) => {
        setSelectedGroupType(selectedGroupType === value ? '' : value)
    }

    const handlePurposeTypeSelect = (value: string) => {
        setSelectedPurposeType(selectedPurposeType === value ? '' : value)
    }

    const handleLocationPreferenceToggle = (value: string) => {
        setSelectedLocationPreferences((prev) => {
            if (prev.includes(value)) {
                // If already selected, remove it
                return prev.filter((item) => item !== value)
            } else {
                // If not selected and we haven't reached the limit, add it
                if (!locationPreferenceLimit || prev.length < locationPreferenceLimit) {
                    return [...prev, value]
                }
                // If limit reached, don't add
                return prev
            }
        })
    }

    // Calendar helper functions
    const navigateMonth = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
            setSlideDirection('left')
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
        } else {
            setSlideDirection('right')
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
        }
    }

    const handleDateClick = (date: Date) => {
        if (!selectedDates.checkIn || (selectedDates.checkIn && selectedDates.checkOut)) {
            // Setting check-in date
            setSelectedDates({ checkIn: date, checkOut: undefined })
            // Keep the when modal open for checkout selection
            setActiveSegment('when')
        } else {
            // Setting check-out date
            // If selected date is before check-in, swap them
            if (date < selectedDates.checkIn) {
                setSelectedDates({ checkIn: date, checkOut: selectedDates.checkIn })
            } else {
                setSelectedDates({ ...selectedDates, checkOut: date })
            }

            // Auto-progress to guests modal after setting checkout
            if (guestsConfig.enabled && guestsConfig.required === true) {
                setActiveSegment('guests')
            } else {
                setActiveSegment(null)
            }
        }
    }

    // Format date for display
    const formatDateDisplay = (date?: Date) => {
        if (!date) return 'Add date'
        const day = date.getDate()
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const month = monthNames[date.getMonth()]
        return `${day} ${month}`
    }

    // Format preferences display
    const formatGuestsDisplay = () => {
        if (useCombinedModal) {
            const flat = flattenOccupancies(occupancies)
            const parts: string[] = []
            if (occupancies.length > 1) parts.push(`${occupancies.length} Rooms`)
            else parts.push('1 Room')
            const totalGuests = flat.adults + flat.children
            parts.push(`${totalGuests} Guest${totalGuests > 1 ? 's' : ''}`)
            return parts.join(', ')
        }
        const totalGuests = guestsData.adults + guestsData.children + guestsData.infants
        if (totalGuests <= 0) {
            return guestsConfig.placeholder || 'Add guests'
        }
        return `${totalGuests} Guest${totalGuests > 1 ? 's' : ''}`
    }

    const formatPreferencesDisplay = () => {
        // Check if any preferences are selected (groupType, travelPurpose, or locationPreferences)
        const hasGroupType = !!selectedGroupType
        const hasTravelPurpose = !!selectedPurposeType
        const hasLocationPreferences = selectedLocationPreferences.length > 0

        // If nothing is selected, show placeholder
        if (!hasGroupType && !hasTravelPurpose && !hasLocationPreferences) {
            return preferencesConfig.placeholder || 'Add preferences'
        }

        // Build display parts
        const parts: string[] = []

        // Add group type if selected
        if (hasGroupType) {
            const groupType = DEFAULT_GROUP_TYPES.find((gt) => gt.value === selectedGroupType)
            const groupLabel =
                groupType?.label ||
                selectedGroupType
                    .split('_')
                    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                    .join(' ')
            parts.push(groupLabel)
        }

        // Add travel purpose if selected
        if (hasTravelPurpose) {
            const purposeType = DEFAULT_PURPOSE_TYPES.find((pt) => pt.value === selectedPurposeType)
            const purposeLabel =
                purposeType?.label ||
                selectedPurposeType
                    .split('_')
                    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                    .join(' ')
            parts.push(purposeLabel)
        }

        // Add location preferences if selected
        if (hasLocationPreferences) {
            // Use locationPreferences if provided and has items, otherwise use default (but only if locationPreferences wasn't explicitly set to empty)
            const preferenceCatalog =
                locationPreferences && locationPreferences.length > 0
                    ? locationPreferences
                    : locationPreferences === undefined
                      ? DEFAULT_LOCATION_PREFERENCES
                      : []
            const firstValue = selectedLocationPreferences[0]
            const firstPreference = preferenceCatalog.find((pref) => pref.value === firstValue)

            const formatFallbackLabel = (value: string) => {
                if (!value) return ''
                return value
                    .split('_')
                    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
                    .join(' ')
            }

            const firstLabel = firstPreference?.label || formatFallbackLabel(firstValue)

            if (selectedLocationPreferences.length === 1) {
                parts.push(firstLabel)
            } else {
                parts.push(`${firstLabel} +${selectedLocationPreferences.length - 1}`)
            }
        }

        // Join all parts with comma and space
        return parts.join(', ')
    }

    // Check if any search values have changed from applied state
    const hasValuesChanged = () => {
        // Check location - handle both single-select and multi-select
        const currentCityIds = selectedCities
            .map((c) => c.id)
            .sort()
            .join(',')
        const appliedCityIds = (appliedState.cityIds || []).sort().join(',')
        if (currentCityIds !== appliedCityIds) return true

        // Check country - handle both single-select and multi-select
        const currentCountryIds = selectedCountries
            .map((c) => c.id)
            .sort()
            .join(',')
        const appliedCountryIds = (appliedState.countryIds || []).sort().join(',')
        if (currentCountryIds !== appliedCountryIds) return true

        // Check dates based on when config type
        if (whenConfig.type === 'date_range' || whenConfig.type === 'datetime_range') {
            const checkInChanged = selectedDates.checkIn?.toDateString() !== appliedState.checkIn?.toDateString()
            const checkOutChanged = selectedDates.checkOut?.toDateString() !== appliedState.checkOut?.toDateString()
            if (checkInChanged || checkOutChanged) return true
        } else if (whenConfig.type === 'year') {
            const yearChanged = selectedYear !== appliedState.year
            if (yearChanged) return true
        } else if (whenConfig.type === 'month_year') {
            // For month_year, compare both month and the year associated with the month
            const monthChanged = selectedMonth !== appliedState.month
            const monthYearChanged = selectedMonthYear !== appliedState.year
            if (monthChanged || monthYearChanged) return true
        }

        // Check preferences
        if (selectedGroupType !== appliedState.groupType) return true
        if (selectedPurposeType !== appliedState.travelPurpose) return true

        // Check location preferences (array comparison)
        const prefsChanged =
            selectedLocationPreferences.length !== appliedState.cityPreferences.length ||
            selectedLocationPreferences.some((pref, index) => pref !== appliedState.cityPreferences[index])
        if (prefsChanged) return true

        // Check price range (only if preferences modal is not open - otherwise it's just a draft)
        // Price range is only applied on search click, not during slider interaction
        if (activeSegment !== 'preferences') {
            if (priceRange?.min !== appliedState.priceRange?.min || priceRange?.max !== appliedState.priceRange?.max) return true
        }

        // Check guests (deep compare)
        const guestsChanged =
            guestsConfig.enabled &&
            guestsConfig.required !== false &&
            (guestsData.adults !== appliedState.guests.adults ||
                guestsData.children !== appliedState.guests.children ||
                guestsData.infants !== appliedState.guests.infants ||
                (guestsData.children_age?.length || 0) !== (appliedState.guests.children_age?.length || 0) ||
                (guestsData.children_age || []).some((age, idx) => age !== (appliedState.guests.children_age || [])[idx]))
        if (guestsChanged) return true

        // Check rooms
        if (roomsConfig.enabled && rooms !== appliedState.rooms) return true

        return false
    }

    // Check if previous button should be disabled
    const isPrevDisabled = () => {
        const today = new Date()
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const firstMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        return firstMonthStart.getTime() <= currentMonthStart.getTime()
    }

    // Handle month selection
    const handleMonthSelect = (month: number, year: number) => {
        setSelectedMonth(month)
        setSelectedMonthYear(year)

        // Auto-progress to next enabled segment after selecting month
        // Priority: preferences > guests
        if (preferencesConfig.enabled) {
            // Check if preferences are set
            const hasPreferences = selectedGroupType || selectedPurposeType || selectedLocationPreferences.length > 0
            if (!hasPreferences) {
                setActiveSegment('preferences')
            } else {
                setActiveSegment(null)
            }
        } else if (guestsConfig.enabled && guestsConfig.required === true) {
            // Check if guests are configured (only if required)
            const hasGuests = guestsData.adults > 0 || guestsData.children > 0 || guestsData.infants > 0
            if (!hasGuests) {
                setActiveSegment('guests')
            } else {
                setActiveSegment(null)
            }
        } else {
            setActiveSegment(null)
        }
    }

    // Handle year selection
    const handleYearSelect = (year: number) => {
        setSelectedYear(year)

        // Auto-progress to next empty REQUIRED field only after selecting year
        if (guestsConfig.enabled && guestsConfig.required === true) {
            // Check if guests are configured (only if required)
            const hasGuests = guestsData.adults > 0 || guestsData.children > 0 || guestsData.infants > 0
            if (!hasGuests) {
                setActiveSegment('guests')
            } else {
                setActiveSegment(null)
            }
        } else {
            setActiveSegment(null)
        }
    }

    useEffect(() => {
        if (pageName !== 'Stays') return
        const checkInPast = isDateBeforeToday(selectedDates.checkIn, todayStart)
        const checkOutPast = isDateBeforeToday(selectedDates.checkOut, todayStart)
        const monthYearPast = whenConfig.type === 'month_year' && isMonthYearInPast(selectedMonth, selectedMonthYear, todayStart)
        const yearPast = whenConfig.type === 'year' && isYearInPast(selectedYear, todayStart)

        if (!checkInPast && !checkOutPast && !monthYearPast && !yearPast) {
            return
        }

        if (checkInPast || checkOutPast) {
            const hasLocation = selectedCities.length > 0 || selectedCountries.length > 0
            if (hasLocation) {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const nextMonth = new Date(today)
                nextMonth.setMonth(today.getMonth() + 1)
                nextMonth.setDate(today.getDate() + 1)
                const dayAfter = new Date(nextMonth)
                dayAfter.setDate(nextMonth.getDate() + 1)

                setSelectedDates({ checkIn: nextMonth, checkOut: dayAfter })
                shouldAutoSearchRef.current = true
                return
            }

            setSelectedDates((prev) => {
                const nextCheckIn = checkInPast ? undefined : prev.checkIn
                const nextCheckOut = checkOutPast ? undefined : prev.checkOut
                if (nextCheckIn === prev.checkIn && nextCheckOut === prev.checkOut) return prev
                return { checkIn: nextCheckIn, checkOut: nextCheckOut }
            })
        }

        if (monthYearPast) {
            setSelectedMonth(null)
            setSelectedMonthYear(null)
        }

        if (yearPast) {
            setSelectedYear(null)
        }

        if (whenConfig.enabled) {
            setActiveSegment('when')
        }
    }, [
        selectedDates.checkIn,
        selectedDates.checkOut,
        selectedMonth,
        selectedMonthYear,
        selectedYear,
        whenConfig.type,
        whenConfig.enabled,
        todayStart,
        selectedCities.length,
        selectedCountries.length,
        pageName
    ])

    // Format When display based on type
    const formatWhenDisplay = () => {
        if (whenConfig.type === 'year' && selectedYear !== null) {
            return `${selectedYear}`
        }
        if (whenConfig.type === 'month_year') {
            if (selectedMonth !== null && selectedMonthYear !== null) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                const monthIndex = Math.max(0, selectedMonth - 1)
                return `${monthNames[monthIndex]} ${selectedMonthYear}`
            }
        }
        if (selectedDates.checkIn && selectedDates.checkOut) {
            return `${formatDateDisplay(selectedDates.checkIn)} - ${formatDateDisplay(selectedDates.checkOut)}`
        }
        return whenConfig.placeholder
    }

    const whereAdditionalSections = useMemo<WhereModalSection[]>(() => {
        if (additionalDimensions.length === 0) {
            return []
        }

        const queryDisplay = trimmedWhereText

        return additionalDimensions.map((dimension) => {
            const items = dimensionResults[dimension.id] ?? []
            const isLoading = dimensionLoadingState[dimension.id] ?? false
            const fallbackEmptyMessage =
                dimension.emptyMessage ?? (queryDisplay ? `No ${dimension.label.toLowerCase()} found for "${queryDisplay}"` : 'No results yet')

            return {
                id: dimension.id,
                label: dimension.label,
                items,
                isLoading,
                emptyMessage: fallbackEmptyMessage,
                onSelect: (item: WhereDimensionItem) => {
                    const closeModal = () => {
                        setActiveSegment(null)
                        // After closing dimension modal, auto-progress to next enabled segment if needed
                        // Check if "when" segment should be opened (for month selection flow)
                        if (whenConfig.enabled) {
                            const isWhenComplete = (() => {
                                if (whenConfig.type === 'date_range' || whenConfig.type === 'datetime_range') {
                                    return selectedDates.checkIn && selectedDates.checkOut
                                } else if (whenConfig.type === 'year') {
                                    return selectedYear !== null
                                } else if (whenConfig.type === 'month_year') {
                                    return selectedMonth !== null && selectedMonthYear !== null
                                }
                                return true
                            })()
                            if (!isWhenComplete) {
                                // Small delay to ensure modal closes first
                                setTimeout(() => {
                                    setActiveSegment('when')
                                }, 100)
                                return
                            }
                        }
                        // If "when" is complete, check for preferences
                        if (preferencesConfig.enabled) {
                            const hasPreferences = selectedGroupType || selectedPurposeType || selectedLocationPreferences.length > 0
                            if (!hasPreferences) {
                                setTimeout(() => {
                                    setActiveSegment('preferences')
                                }, 100)
                            }
                        }
                    }
                    if (dimension.onSelect) {
                        dimension.onSelect(item, {
                            closeModal,
                            query: queryDisplay
                        })
                    }
                    if (dimension.closeOnSelect !== false) {
                        closeModal()
                    }
                }
            }
        })
    }, [additionalDimensions, dimensionResults, dimensionLoadingState, trimmedWhereText])
    const markStaysCriteriaGuideCompleted = () => {
        if (!guide) return

        const updated = {
            ...guide,
            stays: {
                ...guide.stays,
                set_criteria_guide: true
            }
        }

        updateGuide(updated)
    }

    return (
        <div className="flex-1 xl:mx-8 lg:mx-6 md:mx-4 sm:mx-2 relative ">
            <div className="flex items-center justify-center  gap-3 lg:gap-2 md:gap-1.5 relative z-50  ">
                {/* Search pill - always expanded */}
                <GuideTipper
                    isOpen={shouldShowSetCriteriaGuide}
                    title="Set your criteria"
                    highlight={['criteria']}
                    subtitle="Get personalised results, which you can update at any time."
                    onClose={() => {
                        SetIsSetCreateriaOpen(false)
                        setCriteriaModalClosed?.(true)
                        markStaysCriteriaGuideCompleted()
                    }}
                    closeTitle="CLOSE"
                    position="bottom"
                    primaryTitle="SELECT DESTINATION"
                    onPrimary={() => {
                        ;(SetIsSetCreateriaOpen(false), setActiveSegment('where'))
                        markStaysCriteriaGuideCompleted()
                    }}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`md:w-auto md:max-w-[745px] max-md:w-[calc(100%-40px)] max-md:mt-[10px] min-w-0 flex items-center ${activeSegment === 'preferences' ? 'max-w-[800px]' : ''} ${activeSegment === 'where' || activeSegment === 'country' ? 'md:max-w-[700px]' : ''} ${activeSegment ? 'bg-grey-4' : 'bg-natural-white'} border border-feature-card-border rounded-md transition-all duration-400 ease-out pr-2 lg:pr-2 md:pr-1.5 sm:pr-1 py-0
`}>
                        {/* Page Icon - Native to the page, not part of segments */}
                        <div className="flex items-center ml-1.5 mr-2 md:mr-1.5">
                            <img
                                src={iconSrc}
                                alt={iconAlt}
                                className="h-9.5 md:h-8 sm:h-7 object-contain"
                            />
                        </div>

                        {/* Country */}
                        {countryConfig.enabled && (
                            <>
                                <button
                                    ref={countrySegmentRef}
                                    className={`min-w-0 lg:py-2 py-1.5 lg:px-2 px-1.5 ml-1 mr-1 text-left cursor-pointer rounded-full ${
                                        hoveredSegment === 'country' ? 'bg-grey-5' : ''
                                    } transition-all duration-200`}
                                    onMouseEnter={() => !activeSegment && setHoveredSegment('country')}
                                    onMouseLeave={() => setHoveredSegment(null)}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (activeSegment !== 'country') {
                                            setActiveSegment('country')
                                        }
                                    }}>
                                    <div className="flex items-center gap-2 lg:max-w-[190px] md:max-w-[170px] sm:max-w-[150px] lg:min-w-[136px] md:min-w-[120px] sm:min-w-[110px]">
                                        <div className="flex-1 min-w-0 pl-0">
                                            <SearchBarLabel>{countryConfig.label}</SearchBarLabel>
                                            {activeSegment === 'country' ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        value={countryText}
                                                        onChange={(e) => setCountryText(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                        onKeyUp={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        className="text-sm font-medium text-header-black bg-transparent border-none outline-none flex-1 min-w-0"
                                                        placeholder={countryConfig.placeholder}
                                                        autoFocus
                                                    />
                                                    {countryText && countryText.trim() !== '' && (
                                                        <button
                                                            onClick={handleClearCountry}
                                                            className="cursor-pointer p-0.5 hover:bg-grey-5 rounded-full transition-colors">
                                                            <X className="h-4 w-4 text-grey-2" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-sm font-medium text-header-black truncate">
                                                    {selectedCountries.length > 0
                                                        ? selectedCountries.length === 1
                                                            ? selectedCountries[0].name
                                                            : `${selectedCountries[0].name} +${selectedCountries.length - 1} more`
                                                        : countryConfig.placeholder}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>

                                {/* Divider between Country and Where - hidden when Country or Where is active/hovered */}
                                {whereConfig.enabled && (
                                    <div
                                        className={`h-6 w-px bg-feature-card-border transition-opacity duration-200 ${activeSegment === 'country' || activeSegment === 'where' || ['country', 'where'].includes(hoveredSegment as any) ? 'opacity-0' : 'opacity-100'}`}
                                    />
                                )}
                            </>
                        )}

                        {/* Location */}
                        {whereConfig.enabled && (
                            <>
                                <button
                                    ref={whereSegmentRef}
                                    className={`min-w-0 lg:py-2 py-1.5 lg:px-2 px-1.5 ml-1 mr-1 text-left cursor-pointer rounded-full ${
                                        hoveredSegment === 'where' ? 'bg-grey-5' : ''
                                    } transition-all duration-200`}
                                    onMouseEnter={() => !activeSegment && setHoveredSegment('where')}
                                    onMouseLeave={() => setHoveredSegment(null)}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (activeSegment !== 'where') {
                                            setActiveSegment('where')
                                        }
                                    }}>
                                    <div className="flex items-center gap-2 lg:max-w-[190px] md:max-w-[170px] sm:max-w-[150px] lg:min-w-[100px] md:min-w-[90px] sm:min-w-[80px]">
                                        <div className="flex-1 min-w-0">
                                            <SearchBarLabel>{whereConfig.label}</SearchBarLabel>
                                            {activeSegment === 'where' ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        value={whereText}
                                                        onChange={(e) => setWhereText(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                        onKeyUp={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        className="text-sm font-medium text-grey-0 bg-transparent border-none outline-none flex-1 min-w-0 max-md:w-[100px]"
                                                        placeholder={whereConfig.placeholder}
                                                        autoFocus
                                                    />
                                                    {whereText && whereText.trim() !== '' && (
                                                        <button
                                                            onClick={handleClearLocation}
                                                            className="cursor-pointer p-0.5 hover:bg-grey-5 rounded-full transition-colors">
                                                            <X className="h-4 w-4 text-grey-2" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-sm font-medium text-grey-0 truncate">
                                                    {selectedCities.length > 0
                                                        ? selectedCities.length === 1
                                                            ? selectedCities[0].name
                                                            : `${selectedCities[0].name} +${selectedCities.length - 1} more`
                                                        : whereConfig.placeholder}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>

                                {/* Divider between Where and When - hidden when Where or When is active/hovered */}
                                {whenConfig.enabled && (
                                    <div
                                        className={`h-6 w-px bg-feature-card-border transition-opacity duration-200 ${activeSegment === 'where' || activeSegment === 'when' || ['where', 'when'].includes(hoveredSegment as any) ? 'opacity-0' : 'opacity-100'}`}
                                    />
                                )}
                            </>
                        )}

                        {/* When (Check in/out combined) */}
                        {whenConfig.enabled && (
                            <>
                                <button
                                    className={`flex-none w-fit md:w-[125px] sm:w-[110px] lg:px-3 px-2.5 lg:py-2 py-1.5 text-left cursor-pointer rounded-full ${
                                        hoveredSegment === 'when' ? 'bg-grey-5' : ''
                                    } transition-all duration-200`}
                                    onMouseEnter={() => !activeSegment && setHoveredSegment('when')}
                                    onMouseLeave={() => setHoveredSegment(null)}
                                    onClick={() => setActiveSegment(activeSegment === 'when' ? null : 'when')}>
                                    <div>
                                        <SearchBarLabel>{whenConfig.label}</SearchBarLabel>
                                        <div className="text-sm font-medium text-grey-0">{formatWhenDisplay()}</div>
                                    </div>
                                </button>

                                {/* Divider between When and Guests - hidden when When or Guests is active/hovered */}
                                {guestsConfig.enabled && (
                                    <div
                                        className={`h-6 w-px bg-feature-card-border transition-opacity duration-200 ${activeSegment === 'when' || activeSegment === 'guests' || ['guests', 'when'].includes(hoveredSegment as any) ? 'opacity-0' : 'opacity-100'}`}
                                    />
                                )}

                                {/* Divider between When and Preferences - hidden when When or Preferences is active/hovered (only shown when Guests is not enabled) */}
                                {!guestsConfig.enabled && preferencesConfig.enabled && (
                                    <div
                                        className={`h-6 w-px bg-feature-card-border transition-opacity duration-200 ${activeSegment === 'when' || activeSegment === 'preferences' || ['preferences', 'when'].includes(hoveredSegment as any) ? 'opacity-0' : 'opacity-100'}`}
                                    />
                                )}
                            </>
                        )}

                        {/* Guests (& Rooms when combined) */}
                        {guestsConfig.enabled && (
                            <>
                                <button
                                    className={`flex-none w-fit ${useCombinedModal ? 'md:w-[170px] sm:w-[150px]' : 'md:w-[115px] sm:w-[100px]'} lg:px-3 px-2.5 lg:py-2 py-1.5 text-left cursor-pointer rounded-full ${
                                        hoveredSegment === 'guests' ? 'bg-grey-5' : ''
                                    } transition-all duration-200`}
                                    onMouseEnter={() => !activeSegment && setHoveredSegment('guests')}
                                    onMouseLeave={() => setHoveredSegment(null)}
                                    onClick={() => setActiveSegment(activeSegment === 'guests' ? null : 'guests')}>
                                    <div>
                                        <SearchBarLabel>{useCombinedModal ? 'Guests & Rooms' : guestsConfig.label}</SearchBarLabel>
                                        <div className="text-sm font-medium text-grey-2">{formatGuestsDisplay()}</div>
                                    </div>
                                </button>

                                {/* Divider between Guests and Rooms - hidden when combined or when Guests or Rooms is active/hovered */}
                                {roomsConfig.enabled && !useCombinedModal && (
                                    <div
                                        className={`h-6 w-px bg-feature-card-border transition-opacity duration-200 ${activeSegment === 'guests' || activeSegment === 'rooms' || ['rooms', 'guests'].includes(hoveredSegment as any) ? 'opacity-0' : 'opacity-100'}`}
                                    />
                                )}

                                {/* Divider between Guests and Preferences */}
                                {(useCombinedModal || !roomsConfig.enabled) && preferencesConfig.enabled && (
                                    <div
                                        className={`h-6 w-px bg-feature-card-border transition-opacity duration-200 ${activeSegment === 'guests' || activeSegment === 'preferences' || ['preferences', 'guests'].includes(hoveredSegment as any) ? 'opacity-0' : 'opacity-100'}`}
                                    />
                                )}
                            </>
                        )}

                        {/* Rooms - hidden when using combined modal */}
                        {roomsConfig.enabled && !useCombinedModal && (
                            <>
                                <button
                                    className={`flex-none w-fit md:w-[100px] sm:w-[90px] lg:px-3 px-2.5 lg:py-2 py-1.5 text-left cursor-pointer rounded-full ${
                                        hoveredSegment === 'rooms' ? 'bg-grey-5' : ''
                                    } transition-all duration-200`}
                                    onMouseEnter={() => !activeSegment && setHoveredSegment('rooms')}
                                    onMouseLeave={() => setHoveredSegment(null)}
                                    onClick={() => setActiveSegment(activeSegment === 'rooms' ? null : 'rooms')}>
                                    <div>
                                        <SearchBarLabel>{roomsConfig.label}</SearchBarLabel>
                                        <div className="text-sm font-medium text-grey-2">
                                            {rooms === 1 ? '1 room' : `${rooms} rooms`}
                                        </div>
                                    </div>
                                </button>

                                {/* Divider between Rooms and Preferences - hidden when Rooms or Preferences is active/hovered */}
                                {preferencesConfig.enabled && (
                                    <div
                                        className={`h-6 w-px bg-feature-card-border transition-opacity duration-200 ${activeSegment === 'rooms' || activeSegment === 'preferences' || ['preferences', 'rooms'].includes(hoveredSegment as any) ? 'opacity-0' : 'opacity-100'}`}
                                    />
                                )}
                            </>
                        )}

                        {/* Preferences */}
                        {preferencesConfig.enabled && (
                            <button
                                className={`px-3 pr-4 md:px-2.5 md:pr-3.5 flex justify-between min-w-[120px] md:min-w-[110px] sm:min-w-[100px] max-w-[220px] md:max-w-[200px] lg:py-2 py-1.5 text-left cursor-pointer overflow-hidden ${
                                    activeSegment && 'max-w-[250px]'
                                } rounded-full ${hoveredSegment === 'preferences' ? 'bg-grey-5' : ''} transition-all duration-200`}
                                onMouseEnter={() => !activeSegment && setHoveredSegment('preferences')}
                                onMouseLeave={() => setHoveredSegment(null)}
                                onClick={() => setActiveSegment(activeSegment === 'preferences' ? null : 'preferences')}>
                                <div>
                                    <SearchBarLabel>{preferencesConfig.label}</SearchBarLabel>
                                    <div className="text-sm font-medium text-grey-0 truncate max-md:w-[140px]">{formatPreferencesDisplay()}</div>
                                </div>
                                {/* Search Button */}
                            </button>
                        )}
                        {(activeSegment || hasValuesChanged()) && (
                            <button
                                onClick={handleSearchClick}
                                className={`cursor-pointer max-md:py-2 py-3 md:py-2.5 ml-6 md:ml-4 px-2 h-10 md:px-2.5 shrink-0 flex items-center justify-center gap-2 bg-primary-default text-natural-white rounded-md hover:bg-primary-light transition-all duration-400`}>
                                <Search
                                    className={'h-5 w-5 md:h-4.5 md:w-4.5 sm:h-4 sm:w-4'}
                                    strokeWidth={2}
                                />
                                <div
                                    className="font-red-hat-display text-natural-white"
                                    style={{ fontWeight: 550, fontSize: '14px' }}>
                                    Search
                                </div>
                            </button>
                        )}
                    </div>
                </GuideTipper>
                {/* Filters/Sort combined pill - conditionally visible */}
                {(showFilters || showSort || wishlistConfig.enabled) && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className=" xl:ml-4 lg:ml-3 md:ml-2 sm:ml-1.5 flex items-stretch rounded-full overflow-hidden bg-natural-white">
                        {/* Filters */}
                        {showFilters && (
                            <button
                                onClick={onFilterClick}
                                className={`cursor-pointer relative flex items-center gap-2 pl-4 pr-6 lg:pl-4 lg:pr-6 md:pl-3 md:pr-4 py-2 md:py-1.5 hover:bg-grey-5 transition-colors ${hasActiveFilters ? 'bg-primary-default-80' : ''}`}>
                                <SlidersHorizontal className="h-5 w-5 md:h-4.5 md:w-4.5 sm:h-4 sm:w-4 text-header-black" />
                                {hasActiveFilters && (
                                    <span className="absolute top-1.5 right-4 w-2 h-2 rounded-full bg-primary-default" />
                                )}
                            </button>
                        )}
                        {/* Divider */}
                        {showFilters && showSort && <div className="w-px bg-feature-card-border my-2" />}
                        {/* Sort */}
                        {showSort && (
                            <button
                                onClick={onSortClick}
                                className={`cursor-pointer flex items-center gap-2 pl-4 pr-6 lg:pl-4 lg:pr-6 md:pl-3 md:pr-4 py-2 md:py-1.5 hover:bg-grey-5 transition-colors ${
                                    currentOrderBy.relevance ? '' : 'bg-primary-default-80'
                                }`}>
                                {currentOrderBy.relevance ? (
                                    <ArrowUpDown className="h-5 w-5 md:h-4.5 md:w-4.5 sm:h-4 sm:w-4 text-header-black" />
                                ) : currentOrderBy.rate === -1 ? (
                                    <ArrowDown10 className="h-5 w-5 md:h-4.5 md:w-4.5 sm:h-4 sm:w-4 text-header-black" />
                                ) : (
                                    <ArrowDown01 className="h-5 w-5 md:h-4.5 md:w-4.5 sm:h-4 sm:w-4 text-header-black" />
                                )}
                            </button>
                        )}
                        {(showFilters || showSort) && wishlistConfig.enabled && <div className="w-px bg-feature-card-border my-2" />}
                        {wishlistConfig.enabled && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    wishlistConfig.onClick?.()
                                }}
                                className="max-md:hidden flex items-center gap-2 pl-4 pr-6 lg:pl-4 lg:pr-6 md:pl-3 md:pr-4 py-2 md:py-1.5 hover:bg-grey-5 transition-all cursor-pointer relative">
                                <div className="relative flex items-center justify-center w-6 h-6 md:w-5.5 md:h-5.5 sm:w-5 sm:h-5">
                                    <div
                                        key={confettiIteration}
                                        className={`pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,105,180,0.6)_0%,rgba(255,255,255,0)_70%)] ${
                                            confettiIteration > 0 ? 'animate-searchbar-confetti' : ''
                                        }`}
                                        style={{ transform: 'scale(1.5)', opacity: 0 }}
                                    />
                                    <Heart
                                        className={`w-full h-full transition-colors duration-300 ${
                                            hasShortlist ? 'text-secondary-red' : 'text-header-black'
                                        }`}
                                        stroke="currentColor"
                                        fill={hasShortlist ? 'currentColor' : 'none'}
                                    />
                                </div>
                                {hasShortlist && <span className="text-md font-semibold transition-colors duration-300">{shortlistCount}</span>}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Country Modal */}
            {countryConfig.enabled && (
                <CountryModal
                    isOpen={activeSegment === 'country'}
                    onClose={() => setActiveSegment(null)}
                    countries={sortWithSelectedOnTop(countries, selectedCountries)}
                    isLoadingCountries={isLoadingCountries}
                    countryText={countryText}
                    onCountrySelect={handleCountrySelect}
                    selectedCountries={selectedCountries}
                    multiselect={countryConfig.multiselect || false}
                    anchorElement={countrySegmentRef.current}
                />
            )}

            {/* Where Modal */}
            {whereConfig.enabled &&
                (() => {
                    const CustomDropdown = whereConfig.renderDropdown
                    const modalProps = {
                        isOpen: activeSegment === 'where',
                        onClose: () => setActiveSegment(null),
                        cities: sortWithSelectedOnTop(cities, selectedCities),
                        isLoadingCities,
                        whereText,
                        onCitySelect: handleLocationSelect,
                        selectedCities,
                        multiselect: whereConfig.multiselect || false,
                        anchorElement: whereSegmentRef.current,
                        sections: whereAdditionalSections,
                        isCountryEnabled: countryConfig.enabled,
                        hasInitialData: Array.isArray(whereConfig.initialData) && whereConfig.initialData.length > 0,
                        hasMetadata: Boolean(whereConfig.metadata?.cities && whereConfig.metadata.cities.length > 0),
                        searchMatchesHeading: whereConfig.searchMatchesHeading
                    }

                    return CustomDropdown ? <CustomDropdown {...modalProps} /> : <WhereModal {...modalProps} />
                })()}

            {/* Calendar Modal */}
            {whenConfig.enabled && (
                <WhenModal
                    isOpen={activeSegment === 'when'}
                    onClose={() => setActiveSegment(null)}
                    selectedDates={selectedDates}
                    currentMonth={currentMonth}
                    slideDirection={slideDirection}
                    onDateClick={handleDateClick}
                    onNavigateMonth={navigateMonth}
                    isPrevDisabled={isPrevDisabled}
                    type={whenConfig.type || 'date_range'}
                    checkInTimeLabel={whenConfig.checkInTimeLabel}
                    checkOutTimeLabel={whenConfig.checkOutTimeLabel}
                    onMonthSelect={handleMonthSelect}
                    onYearSelect={handleYearSelect}
                    selectedMonth={selectedMonth}
                    selectedMonthYear={selectedMonthYear}
                    selectedYear={selectedYear}
                />
            )}

            {/* Guests Modal — combined or separate depending on config */}
            {guestsConfig.enabled && useCombinedModal && (
                <RoomsGuestsModal
                    isOpen={activeSegment === 'guests'}
                    onClose={() => setActiveSegment(null)}
                    initialOccupancies={occupancies}
                    onApply={(newOccupancies) => {
                        setOccupancies(newOccupancies)
                        // Derive flat values for backward compat
                        const flat = flattenOccupancies(newOccupancies)
                        setGuestsData({
                            adults: flat.adults,
                            children: flat.children,
                            infants: 0,
                            children_age: flat.childAges
                        })
                        setRooms(flat.noOfRooms)
                        if (preferencesConfig.enabled) {
                            setTimeout(() => setActiveSegment('preferences'), 100)
                        } else {
                            setActiveSegment(null)
                        }
                    }}
                />
            )}
            {guestsConfig.enabled && !useCombinedModal && (
                <GuestsModal
                    isOpen={activeSegment === 'guests'}
                    onClose={() => setActiveSegment(null)}
                    initialData={guestsData}
                    onApply={(newGuestsData) => {
                        setGuestsData(newGuestsData)
                        if (roomsConfig.enabled && newGuestsData.adults < rooms) {
                            setRooms(newGuestsData.adults)
                        }
                        if (roomsConfig.enabled) {
                            setTimeout(() => setActiveSegment('rooms'), 100)
                        } else if (preferencesConfig.enabled) {
                            setTimeout(() => setActiveSegment('preferences'), 100)
                        } else {
                            setActiveSegment(null)
                        }
                    }}
                />
            )}

            {/* Rooms Popover */}
            {roomsConfig.enabled && activeSegment === 'rooms' && (
                <>
                    <div
                        className="fixed inset-0 w-screen h-screen bg-transparent"
                        onClick={() => setActiveSegment(null)}
                        style={{ zIndex: 10050 }}
                    />
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-[280px]"
                        style={{ zIndex: 10051 }}>
                        <div className="bg-white border border-feature-card-border rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-header-black mb-6">Select Rooms</h2>
                            <div className="flex items-center justify-between px-1">
                                <div>
                                    <p
                                        className="font-['Red_Hat_Display'] text-[16px] font-[550] leading-[20px] tracking-[-0.32px]"
                                        style={{ color: '#363636' }}>
                                        Rooms
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
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
                            <button
                                onClick={() => {
                                    roomsConfig.onChange?.(rooms)
                                    if (preferencesConfig.enabled) {
                                        setTimeout(() => {
                                            setActiveSegment('preferences')
                                        }, 100)
                                    } else {
                                        setActiveSegment(null)
                                    }
                                }}
                                className="mt-6 w-full h-12 bg-header-black text-natural-white rounded-md font-semibold text-base hover:bg-opacity-90 transition-all duration-200 flex items-center justify-center gap-2">
                                <span>Done</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Preferences Modal */}
            {preferencesConfig.enabled && (
                <PreferencesModal
                    isOpen={activeSegment === 'preferences'}
                    onClose={() => setActiveSegment(null)}
                    groupTypes={DEFAULT_GROUP_TYPES}
                    purposeTypes={DEFAULT_PURPOSE_TYPES}
                    locationPreferences={locationPreferences}
                    selectedGroupType={selectedGroupType}
                    selectedPurposeType={selectedPurposeType}
                    selectedLocationPreferences={selectedLocationPreferences}
                    onGroupTypeSelect={handleGroupTypeSelect}
                    onPurposeTypeSelect={handlePurposeTypeSelect}
                    onLocationPreferenceToggle={handleLocationPreferenceToggle}
                    onSearch={handleSearchClick}
                    selectionLimit={locationPreferenceLimit}
                    budgetConfig={preferencesConfig.budgetConfig}
                    selectedPriceRange={priceRange}
                    onPriceRangeChange={(newPriceRange) => {
                        // Update both state and ref when priceRange changes
                        // Ref ensures we have the latest value when search is clicked (even if state hasn't updated yet)
                        setPriceRange(newPriceRange)
                        priceRangeRef.current = newPriceRange
                    }}
                />
            )}
        </div>
    )
}

export default SearchBar