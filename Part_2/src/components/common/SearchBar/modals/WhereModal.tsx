import { MapPin, Hotel } from 'lucide-react'
import { useState } from 'react'
import { Chip } from '../../ChipSearch'

export interface WhereModalSectionItem {
    id: string
    title: string
    subtitle?: string
    description?: string
    type?: 'city' | 'hotel' | string
    meta?: Record<string, unknown>
    raw?: unknown
}

const ImageOrIcon = ({ imageUrl, type }: { imageUrl?: string | null; type?: string }) => {
    const [errored, setErrored] = useState(false)
    const showFallback = !imageUrl || errored
    if (showFallback) {
        return (
            <div className="h-10 w-10 rounded-full bg-transparent flex items-center justify-center shrink-0">
                {type === 'hotel' ? (
                    <Hotel className="h-5 w-5 text-primary-default" />
                ) : (
                    <MapPin className="h-5 w-5 text-grey-grey_2" />
                )}
            </div>
        )
    }
    return (
        <img
            src={imageUrl as string}
            alt=""
            className="h-10 w-10 rounded-full object-cover shrink-0"
            onError={() => setErrored(true)}
        />
    )
}

export interface WhereModalSection {
    id: string
    label: string
    items: WhereModalSectionItem[]
    isLoading?: boolean
    emptyMessage?: string
    onSelect: (item: WhereModalSectionItem) => void
}

interface CitySearchResult {
    id: string
    name: string
    is_live?: boolean
    image_url?: string
    country_name?: string
}

interface WhereModalProps {
    isOpen: boolean
    onClose: () => void
    cities: CitySearchResult[]
    isLoadingCities: boolean
    whereText: string
    onCitySelect: (cityId: string, cityName: string) => void
    selectedCities: CitySearchResult[]
    multiselect: boolean
    anchorElement: HTMLElement | null
    sections?: WhereModalSection[]
    showWhenEmpty?: boolean
    hasInitialData?: boolean
    hasMetadata?: boolean
    isCountryEnabled?: boolean
    searchMatchesHeading?: string
}

const LocationLoadingShimmer = () => (
    <>
        {[1, 2, 3, 4, 5].map((index) => (
            <div
                key={index}
                className="w-full flex items-center gap-3 px-1 py-1">
                <div className="p-4 flex items-center justify-center bg-grey-grey_4 rounded-md animate-pulse">
                    <div className="h-4 w-4 bg-grey-grey_3 rounded"></div>
                </div>
                <div className="flex-1 h-4 bg-grey-grey_4 rounded animate-pulse"></div>
            </div>
        ))}
    </>
)

export const WhereModal = ({
    isOpen,
    onClose,
    cities,
    isLoadingCities,
    whereText,
    onCitySelect,
    selectedCities,

    anchorElement,
    sections = [],
    showWhenEmpty = false,
    hasInitialData = false,
    hasMetadata = false,
    isCountryEnabled = false
}: WhereModalProps) => {
    const hasInput = whereText.length > 0
    const trimmedQuery = whereText.trim()
    const hasMeaningfulQuery = trimmedQuery.length > 0
    const hasSectionsContent =
        sections.some((section) => section.isLoading || (section.items && section.items.length > 0)) || (hasMeaningfulQuery && sections.length > 0)

    const shouldShowWhenEmpty = showWhenEmpty || (isCountryEnabled && isOpen) || (hasInitialData && isOpen) || (hasMetadata && isOpen)

    const hasContentToShow =
        hasInput || selectedCities.length > 0 || hasSectionsContent || shouldShowWhenEmpty || (isOpen && (cities.length > 0 || isLoadingCities))

    if (!isOpen || !hasContentToShow) return null

    const isSelected = (cityId: string) => selectedCities.some((c) => c.id === cityId)

    const unselectedCities = cities.filter((city) => !isSelected(city.id))

    const getPosition = () => {
        if (!anchorElement) return { top: '100%', left: '0' }
        const rect = anchorElement.getBoundingClientRect()
        return {
            top: `${rect.bottom + 8}px`,
            left: `${rect.left}px`
        }
    }

    const position = getPosition()

    // Define color schemes for different sections
    const formatHotelLabel = (label: string) => {
        if (label === 'Hotels') return 'Hotel'
        return label
    }
    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 w-screen h-screen bg-transparent z-40"
                onClick={onClose}
            />
            <div
                onClick={(e) => e.stopPropagation()}
                className="fixed w-[360px] z-50"
                style={{ top: position.top, left: position.left }}>
                <div className="bg-white border border-feature-card-border rounded-lg shadow-lg max-h-[400px]  overflow-y-auto">
                    {/* Combined List - Search Results and All Sections */}
                    <div className="px-5 py-2  bg-grey-5 shrink-0">
                        <h3 className="text-[14px] font-semibold leading-[20px] tracking-[-0.28px] text-grey-2">Search results</h3>
                    </div>
                    <div className="p-2 border-t border-feature-card-border">
                        {/* Autosuggest Section Items (e.g. Hotels) — rendered before city search results */}
                        {sections.map((section) => {
                            const hasItems = section.items && section.items.length > 0

                            if (section.isLoading) {
                                return <LocationLoadingShimmer key={section.id} />
                            }

                            if (!hasItems) {
                                return null
                            }

                            return section.items.map((item) => {
                                const meta = (item.meta ?? {}) as { is_live?: boolean; imageUrl?: string }
                                const isCountry = item.type === 'location_country'
                                const isNotLiveCountry = isCountry && meta.is_live === false
                                return (
                                    <button
                                        key={`${section.id}-${item.id}`}
                                        type="button"
                                        disabled={isNotLiveCountry}
                                        aria-disabled={isNotLiveCountry}
                                        onClick={() => {
                                            if (isNotLiveCountry) return
                                            section.onSelect(item)
                                        }}
                                        className={`w-full flex items-center gap-3 px-1 py-2 text-left rounded-md transition-colors ${
                                            isNotLiveCountry ? 'bg-grey-5 cursor-not-allowed' : 'cursor-pointer hover:bg-grey-5'
                                        }`}>
                                        <div className="flex flex-col min-w-12 items-center gap-1">
                                            <ImageOrIcon imageUrl={meta.imageUrl} type={item.type} />
                                            <Chip text={formatHotelLabel(section.label)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="block text-sm font-medium text-header-black truncate mb-1">{item.title}</span>
                                            {item.subtitle && (
                                                <div
                                                    className="text-xs text-grey-grey_2 truncate"
                                                    title={item.subtitle}>
                                                    {item.subtitle}
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
                            })
                        })}

                        {/* Search Results (Cities) */}
                        {isLoadingCities ? (
                            <LocationLoadingShimmer />
                        ) : (
                            cities.map((city) => {
                                const isNotLive = city.is_live === false
                                return (
                                    <button
                                        key={city.id}
                                        type="button"
                                        disabled={isNotLive}
                                        aria-disabled={isNotLive}
                                        onClick={() => {
                                            if (isNotLive) return
                                            onCitySelect(city.id, city.name)
                                        }}
                                        className={`w-full flex items-center gap-3 px-1 py-2 text-left rounded-md transition-colors ${
                                            isNotLive ? 'bg-grey-5 cursor-not-allowed' : 'cursor-pointer hover:bg-grey-5'
                                        }`}>
                                        <div className="flex flex-col min-w-12 items-center gap-1">
                                            <ImageOrIcon imageUrl={city.image_url} type="city" />
                                            <Chip text="City" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <span className="block text-sm font-medium text-header-black truncate">{city.name}</span>
                                            {city.country_name && (
                                                <div className="text-xs text-grey-grey_2 truncate">
                                                    City in {city.country_name}
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
                            })
                        )}

                        {/* Empty States */}
                        {!isLoadingCities &&
                            unselectedCities.length === 0 &&
                            !sections.some((s) => s.items?.length > 0) &&
                            (hasMeaningfulQuery ? (
                                <div className="px-4 py-6 text-center text-xs text-grey_2">No results found for "{trimmedQuery}"</div>
                            ) : selectedCities.length === 0 && !hasInput ? (
                                <div className="px-4 py-6 text-center text-xs text-grey_2">Start typing to search for cities</div>
                            ) : (
                                <div className="px-4 py-6 text-center text-xs text-grey_2">All available cities selected</div>
                            ))}
                    </div>
                </div>
            </div>
        </>
    )
}
