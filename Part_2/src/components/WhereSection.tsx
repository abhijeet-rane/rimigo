import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X, MapPin, Hotel } from 'lucide-react'
import MobileSearchExpandContent from './MobileSearchExpandContent'
import type { WhereSegmentConfig, WhereDimensionConfig, WhereDimensionItem, CityListItem, CountryListItem } from './common/SearchBar'

const ImageOrIcon = ({ imageUrl, type }: { imageUrl?: string | null; type?: string }) => {
    const [errored, setErrored] = useState(false)
    if (!imageUrl || errored) {
        return (
            <div className="h-10 w-10 rounded-full bg-transparent flex items-center justify-center shrink-0">
                {type === 'hotel' ? (
                    <Hotel className="h-6 w-6 text-primary-default" />
                ) : (
                    <MapPin className="h-6 w-6 text-grey-2" />
                )}
            </div>
        )
    }
    return (
        <img
            src={imageUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover shrink-0"
            onError={() => setErrored(true)}
        />
    )
}

interface WhereSectionProps {
    value?: string
    onSelect: (id: string, name: string, type: 'city' | 'hotel' | string) => void
    whereConfig?: WhereSegmentConfig
    selectedCountries?: CountryListItem[]
    allCitiesFromCountries?: CityListItem[]
    onClose?: () => void
    selectedCities?: CityListItem[]
}

const LocationLoadingShimmer = () => (
    <>
        {[1, 2, 3, 4, 5].map((index) => (
            <div
                key={index}
                className="w-full flex items-center gap-3 px-5 py-1">
                <div className="p-4 flex items-center justify-center bg-grey-4 rounded-md animate-pulse">
                    <div className="h-4 w-4 bg-grey-3 rounded"></div>
                </div>
                <div className="flex-1 h-4 bg-grey-4 rounded animate-pulse"></div>
            </div>
        ))}
    </>
)

const WhereSection: React.FC<WhereSectionProps> = ({
    onSelect,
    whereConfig,
    onClose,
    selectedCountries = [],
    allCitiesFromCountries = [],
    selectedCities = []
}) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [cities, setCities] = useState<CityListItem[]>([])
    const [isLoadingCities, setIsLoadingCities] = useState(false)
    const [dimensionResults, setDimensionResults] = useState<Record<string, WhereDimensionItem[]>>({})
    const [dimensionLoadingState, setDimensionLoadingState] = useState<Record<string, boolean>>({})

    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const dimensionRequestIdRef = useRef<Record<string, number>>({})

    const trimmedQuery = searchQuery.trim()
    const hasMeaningfulQuery = trimmedQuery.length > 0

    const metadataCities = whereConfig?.metadata?.cities
    const initialData = whereConfig?.initialData as CityListItem[] | undefined

    const defaultCities = useMemo<CityListItem[]>(() => {
        if (metadataCities?.length) return metadataCities
        if (initialData?.length) return initialData
        if (allCitiesFromCountries?.length) return allCitiesFromCountries
        return []
    }, [metadataCities, initialData, allCitiesFromCountries])

    const defaultCityDimension = useMemo<WhereDimensionConfig<CityListItem>>(
        () => ({
            id: 'city',
            label: whereConfig?.label ?? 'Cities',
            type: 'city',
            supportsSelection: true,
            isPrimary: true,
            mapItem: (city) => ({
                id: city.id,
                title: city.name,
                subtitle: (city as any).country_name,
                type: 'city',
                raw: city
            }),
            emptyMessage: 'No cities found'
        }),
        [whereConfig?.label]
    )

    const dimensionConfigs = useMemo<WhereDimensionConfig[]>(() => {
        const customDimensions = (whereConfig?.dimensions || []).filter((dimension) => dimension && dimension.enabled !== false)
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
    }, [whereConfig?.dimensions, defaultCityDimension])

    const additionalDimensions = useMemo(() => dimensionConfigs.filter((dimension) => dimension.id !== 'city'), [dimensionConfigs])

    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        const trimmedText = trimmedQuery

        if (trimmedText.length === 0) {
            setCities(defaultCities)
            setIsLoadingCities(false)
            return
        }

        if (trimmedText.length < 3) {
            if (defaultCities.length > 0) {
                const filtered = defaultCities.filter((city) => city.name.toLowerCase().includes(trimmedText.toLowerCase()))
                setCities(filtered)
            } else {
                setCities([])
            }
            setIsLoadingCities(false)
            return
        }

        setIsLoadingCities(true)
        debounceTimerRef.current = setTimeout(async () => {
            try {
                if (metadataCities?.length) {
                    const searchTerm = trimmedText.toLowerCase()
                    let filtered = metadataCities.filter((city) => city.name.toLowerCase().includes(searchTerm))

                    if (filtered.length === 0) {
                        if (whereConfig?.customSearchCities) {
                            const apiResults = await whereConfig.customSearchCities(trimmedText)
                            setCities(
                                apiResults
                                    .filter((item: any) => item.type?.toLowerCase() === 'city')
                                    .map((item: any) => ({ id: item.id, name: item.name, is_live: item.is_live }))
                            )
                            return
                        }

                        if (allCitiesFromCountries.length > 0) {
                            setCities(allCitiesFromCountries.filter((city) => city.name.toLowerCase().includes(searchTerm)))
                            return
                        }
                    }

                    setCities(filtered)
                    return
                }

                if (selectedCountries.length > 0 && allCitiesFromCountries.length > 0) {
                    const filtered = allCitiesFromCountries.filter((city) => city.name.toLowerCase().includes(trimmedText.toLowerCase()))
                    setCities(filtered)
                    return
                }

                if (whereConfig?.customSearchCities) {
                    const results = await whereConfig.customSearchCities(trimmedText)
                    setCities(results)
                } else {
                    setCities([])
                }
            } catch (error) {
                console.error('Error searching cities:', error)
                setCities([])
            } finally {
                setIsLoadingCities(false)
            }
        }, 800)

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
        }
    }, [trimmedQuery, metadataCities, selectedCountries, allCitiesFromCountries, initialData, whereConfig, defaultCities])

    useEffect(() => {
        if (additionalDimensions.length === 0) return

        const shouldSearch = trimmedQuery.length >= 3

        additionalDimensions.forEach((dimension) => {
            if (!dimension.search) return

            if (!shouldSearch) {
                setDimensionResults((prev) => {
                    if (!prev[dimension.id] || prev[dimension.id].length === 0) return prev
                    return { ...prev, [dimension.id]: [] }
                })
                setDimensionLoadingState((prev) => {
                    if (prev[dimension.id] === false || prev[dimension.id] === undefined) return prev
                    return { ...prev, [dimension.id]: false }
                })
                return
            }

            const requestId = (dimensionRequestIdRef.current[dimension.id] || 0) + 1
            dimensionRequestIdRef.current[dimension.id] = requestId

            setDimensionLoadingState((prev) => ({ ...prev, [dimension.id]: true }))

            dimension
                .search({ query: trimmedQuery, selectedCountries, selectedCities, metadataCities, allCitiesFromCountries })
                .then((results) => {
                    if (dimensionRequestIdRef.current[dimension.id] !== requestId) return
                    const mapped =
                        results
                            ?.map((item) => dimension.mapItem(item, { query: trimmedQuery }))
                            .filter((item): item is WhereDimensionItem => Boolean(item)) ?? []
                    const limited = dimension.limit ? mapped.slice(0, dimension.limit) : mapped
                    setDimensionResults((prev) => ({ ...prev, [dimension.id]: limited }))
                })
                .catch((error) => {
                    console.error(`Failed to fetch results for dimension "${dimension.id}":`, error)
                    if (dimensionRequestIdRef.current[dimension.id] !== requestId) return
                    setDimensionResults((prev) => ({ ...prev, [dimension.id]: [] }))
                })
                .finally(() => {
                    if (dimensionRequestIdRef.current[dimension.id] !== requestId) return
                    setDimensionLoadingState((prev) => ({ ...prev, [dimension.id]: false }))
                })
        })
    }, [additionalDimensions, trimmedQuery, selectedCountries, selectedCities, allCitiesFromCountries, metadataCities])

    const isSelected = (cityId: string) => selectedCities.some((c) => c.id === cityId)
    const unselectedCities = cities.filter((city) => !isSelected(city.id))

    const handleCitySelect = (city: CityListItem) => {
        onSelect(city.id, city.name, 'city')
        const isFromDefaults = defaultCities.some((c) => c.id === city.id)
        if (isFromDefaults) {
            onClose?.()
        }
    }

    const handleDimensionSelect = (dimension: WhereDimensionConfig, item: WhereDimensionItem) => {
        if (dimension.onSelect) {
            dimension.onSelect(item, {
                closeModal: () => onSelect(item.id, item.title, item.type || 'city'),
                query: trimmedQuery
            })
        } else {
            onSelect(item.id, item.title, item.type || 'city')
        }
    }

    const unifiedResults = useMemo(() => {
        const cityItems = unselectedCities.map((city) => ({
            id: city.id,
            type: 'city' as const,
            title: city.name,
            subtitle: undefined,
            raw: city,
            dimensionId: 'city',
            dimensionLabel: 'City'
        }))

        // Render every configured additional dimension (countries, experiences, hotels, …)
        // in the order they're declared so callers control the result grouping.
        const dimensionItems = additionalDimensions.flatMap((dimension) =>
            (dimensionResults[dimension.id] || []).map((item) => ({
                id: `${dimension.id}-${item.id}`,
                type: item.type,
                title: item.title,
                subtitle: item.subtitle,
                raw: { dimension, item },
                dimensionId: dimension.id,
                dimensionLabel: dimension.label
            }))
        )

        return [...dimensionItems, ...cityItems]
    }, [unselectedCities, additionalDimensions, dimensionResults])

    const isLoading = isLoadingCities || Object.values(dimensionLoadingState).some(Boolean)
    const hasResults = unifiedResults.length > 0

    const showingDefaultList = !hasMeaningfulQuery && defaultCities.length > 0

    return (
        <MobileSearchExpandContent title="Where are you going?">
            <div className="flex flex-col h-full -mt-5">
                {/* Search Input */}
                <div className="bg-grey-5 px-2.5 py-2.5 shadow-sm shrink-0">
                    <div className="flex items-center gap-2 bg-white border border-grey-4 rounded-[8px] px-2.5">
                        <Search className="w-5 h-5 text-grey-0 shrink-0" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={whereConfig?.placeholder || 'Search destinations'}
                            className="w-full py-2.5 text-[16px] font-medium font-manrope text-grey-0 outline-none bg-transparent"
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="p-0.5 hover:bg-grey-5 rounded-full transition-colors">
                                <X className="h-4 w-4 text-grey-2" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="border-t border-feature-card-border">
                        {isLoading ? (
                            <LocationLoadingShimmer />
                        ) : hasResults ? (
                            <>
                                {showingDefaultList && (
                                    <p className="pt-3 pb-1 px-5 text-[11px] font-extrabold font-manrope uppercase text-grey-2 tracking-wide">
                                        {whereConfig?.label || 'Cities'}
                                    </p>
                                )}
                                {unifiedResults.map((result) => {
                                    if (result.type === 'city') {
                                        const cityRaw = result.raw as CityListItem & { image_url?: string; country_name?: string }
                                        const isNotLive = cityRaw.is_live === false
                                        return (
                                            <button
                                                key={result.id}
                                                type="button"
                                                disabled={isNotLive}
                                                aria-disabled={isNotLive}
                                                onClick={() => {
                                                    if (isNotLive) return
                                                    handleCitySelect(cityRaw)
                                                }}
                                                className={`w-full flex items-center gap-3 py-2.5 px-5 text-left transition-colors ${
                                                    isNotLive ? 'bg-grey-5 cursor-not-allowed' : 'hover:bg-grey-5 border-b border-feature-card-border'
                                                }`}>
                                                <div className="flex items-center shrink-0">
                                                    <ImageOrIcon imageUrl={cityRaw.image_url} type="city" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="block text-[16px] font-semibold text-grey-0 font-red-hat-display truncate">
                                                        {result.title}
                                                    </span>
                                                    {cityRaw.country_name && (
                                                        <div className="text-[13px] font-semibold font-manrope text-grey-2 truncate">
                                                            City in {cityRaw.country_name}
                                                        </div>
                                                    )}
                                                </div>
                                                {isNotLive && (
                                                    <span className="ml-auto shrink-0 text-[12px] tracking-[0.02em] px-2 py-0.5 rounded-md bg-grey-4 text-grey-0 border border-grey-4 font-red-hat-display font-semibold">
                                                        COMING SOON
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    } else {
                                        const { dimension, item } = result.raw as { dimension: WhereDimensionConfig; item: WhereDimensionItem }
                                        const meta = (item.meta ?? {}) as { is_live?: boolean; imageUrl?: string }
                                        const isCountry = item.type === 'location_country'
                                        const isNotLiveCountry = isCountry && meta.is_live === false
                                        return (
                                            <button
                                                key={result.id}
                                                type="button"
                                                disabled={isNotLiveCountry}
                                                aria-disabled={isNotLiveCountry}
                                                onClick={() => {
                                                    if (isNotLiveCountry) return
                                                    handleDimensionSelect(dimension, item)
                                                }}
                                                className={`w-full flex items-center gap-3 py-2.5 px-5 text-left transition-colors ${
                                                    isNotLiveCountry ? 'bg-grey-5 cursor-not-allowed' : 'hover:bg-grey-5 border-b border-feature-card-border'
                                                }`}>
                                                <div className="flex items-center shrink-0">
                                                    <ImageOrIcon imageUrl={meta.imageUrl} type={item.type} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="block text-[16px] font-semibold text-grey-0 font-red-hat-display truncate mb-1">
                                                        {result.title}
                                                    </span>
                                                    {result.subtitle && (
                                                        <div
                                                            className="text-[13px] font-semibold font-manrope text-grey-2 truncate"
                                                            title={result.subtitle}>
                                                            {result.subtitle}
                                                        </div>
                                                    )}
                                                </div>
                                                {isNotLiveCountry && (
                                                    <span className="ml-auto shrink-0 text-[12px] tracking-[0.02em] px-2 py-0.5 rounded-md bg-grey-4 text-grey-0 border border-grey-4 font-red-hat-display font-semibold">
                                                        COMING SOON
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    }
                                })}
                            </>
                        ) : hasMeaningfulQuery ? (
                            <div className="px-4 py-6 text-center text-xs font-manrope font-medium text-grey-2">
                                No results found for "{trimmedQuery}"
                            </div>
                        ) : (
                            <div className="px-4 py-6 text-center text-xs text-grey-2">Start typing to search for destinations</div>
                        )}
                    </div>
                </div>
            </div>
        </MobileSearchExpandContent>
    )
}

export default WhereSection
