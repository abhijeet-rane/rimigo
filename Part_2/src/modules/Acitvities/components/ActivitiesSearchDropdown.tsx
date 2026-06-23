import { Binoculars, MapPin, Hotel } from 'lucide-react'
import { Fragment, useState } from 'react'
import type { CityListItem } from '@/components/common/SearchBar'
import type { WhereModalSection, WhereModalSectionItem } from '@/components/common/SearchBar/modals/WhereModal'

interface ActivitiesSearchDropdownProps {
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
}

const LoadingShimmer = () => (
    <>
        {[1, 2, 3].map((index) => (
            <div
                key={index}
                className="w-full flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-10 h-10 bg-grey-5 rounded-lg"></div>
                <div className="flex-1">
                    <div className="h-4 bg-grey-5 rounded mb-2"></div>
                    <div className="h-3 bg-grey-5 rounded w-2/3"></div>
                </div>
            </div>
        ))}
    </>
)

const ResultSubtitle = ({ subtitle }: { subtitle: string }) => {
    return <p className="text-[14px] font-[600] leading-[18px] tracking-[-0.04em] text-grey-2 font-manrope">{subtitle}</p>
}

const ResultTitle = ({ title }: { title: string }) => {
    return <p className="text-[16px] font-[600] leading-[20px] tracking-[-0.02em] text-grey-0 font-red-hat-display">{title}</p>
}

const getIcon = (type?: string) => {
    if (type === 'experience') {
        return <Binoculars className="h-5 w-5 text-primary-default" />
    }
    if (type === 'hotel') {
        return <Hotel className="h-5 w-5 text-primary-default" />
    }
    return <MapPin className="h-5 w-5 text-primary-default" />
}

/**
 * Get image URL from item meta or city data
 */
const getImageUrl = (item: WhereModalSectionItem | { id: string; name: string; image_url?: string }): string | null => {
    // For section items (experiences, countries), check meta
    if ('meta' in item && item.meta && typeof item.meta === 'object' && 'imageUrl' in item.meta) {
        return item.meta.imageUrl as string | null
    }
    // For cities, check image_url property directly
    if ('image_url' in item && item.image_url) {
        return item.image_url
    }
    return null
}

/**
 * Image component with fallback to icon
 * Shows icon if no imageUrl provided or if image fails to load
 */
const ImageOrIcon = ({
    imageUrl,
    type,
    className = 'h-10 w-10 rounded-lg object-cover'
}: {
    imageUrl: string | null | undefined
    type?: string
    className?: string
}) => {
    const [imageError, setImageError] = useState(false)

    // Show icon if no URL provided or if image failed to load.
    // Wrap in the same h-10 w-10 footprint as the image so list rows stay aligned.
    if (!imageUrl || imageError) {
        return (
            <div className="h-10 w-10 rounded-full bg-transparent flex items-center justify-center shrink-0">
                {getIcon(type)}
            </div>
        )
    }

    // Show image if URL is available
    return (
        <img
            src={imageUrl}
            alt=""
            className={className}
            onError={() => setImageError(true)}
        />
    )
}

export const ActivitiesSearchDropdown = ({
    isOpen,
    onClose,
    cities,
    isLoadingCities,
    whereText,
    onCitySelect,
    selectedCities,
    anchorElement,
    sections = []
}: ActivitiesSearchDropdownProps) => {
    if (!isOpen) return null

    const trimmedQuery = whereText.trim()
    const hasMeaningfulQuery = trimmedQuery.length > 0

    // Combine all results: cities + sections
    const hasCities = cities.length > 0
    const hasSections = sections.some((section) => section.items && section.items.length > 0)
    const hasContent = hasCities || hasSections || isLoadingCities

    if (!hasContent && !hasMeaningfulQuery) return null

    // Calculate position based on anchor element
    const getPosition = () => {
        if (!anchorElement) return { top: '100%', left: '0' }
        const rect = anchorElement.getBoundingClientRect()
        return {
            top: `${rect.bottom + 8}px`,
            left: `${rect.left}px`
        }
    }

    const position = getPosition()

    // Filter out selected cities
    const unselectedCities = cities.filter((city) => !selectedCities.some((selected) => selected.id === city.id))

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 w-screen h-screen bg-transparent z-40"
                onClick={onClose}
            />

            {/* Dropdown */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="fixed w-[90vw] max-md:mx-auto md:w-[520px] max-h-[80vh] md:max-h-[70vh] z-50 bg-white rounded-lg shadow-lg flex flex-col overflow-hidden "
                style={{ top: position.top, left: position.left }}>
                {/* Header */}
                <div className="px-5 py-2  bg-grey-5 shrink-0">
                    <h3 className="text-[14px] font-semibold leading-[20px] tracking-[-0.28px] text-grey-2">Search results</h3>
                </div>

                {/* Content — Order: autosuggest sections (hotels / countries / experiences) first, then city search results */}
                <div className="flex-1 overflow-y-auto">
                    {/* Section blocks (autosuggest: hotels / countries / experiences) — declared order, rendered first */}
                    {sections.map((section) => {
                        const hasItems = section.items && section.items.length > 0
                        if (section.isLoading) {
                            return (
                                <div key={section.id} className="border-t border-feature-card-border py-2">
                                    <LoadingShimmer />
                                </div>
                            )
                        }
                        if (!hasItems) return null
                        return (
                            <Fragment key={section.id}>
                                <div className="border-t border-feature-card-border">
                                    {section.items.map((item: WhereModalSectionItem) => {
                                        const imageUrl = getImageUrl(item)
                                        const meta = (item.meta ?? {}) as { is_live?: boolean }
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
                                                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                                                    isNotLiveCountry ? 'bg-grey-5 cursor-not-allowed' : 'cursor-pointer hover:bg-grey-5'
                                                }`}>
                                                <ImageOrIcon imageUrl={imageUrl} type={item.type} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                                                <div className="flex-1 min-w-0 flex flex-col gap-1">
                                                    <ResultTitle title={item.title} />
                                                    {item.subtitle && <ResultSubtitle subtitle={item.subtitle} />}
                                                </div>
                                                {isNotLiveCountry && (
                                                    <span className="ml-auto shrink-0 text-[12px] tracking-[0.02em] px-2 py-0.5 rounded-md bg-grey-4 text-grey-0 border border-grey-4 font-red-hat-display font-semibold">
                                                        COMING SOON
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </Fragment>
                        )
                    })}

                    {/* Cities block (search results, after autosuggest) */}
                    {isLoadingCities ? (
                        <div className="py-2">
                            <LoadingShimmer />
                        </div>
                    ) : unselectedCities.length > 0 ? (
                        <div className="border-t border-feature-card-border">
                            {unselectedCities.map((city) => {
                                const cityWithMeta = city as { image_url?: string; country_name?: string }
                                const cityImageUrl = cityWithMeta.image_url
                                const cityCountryName = cityWithMeta.country_name
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
                                        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                                            isNotLive ? 'bg-grey-5 cursor-not-allowed' : 'cursor-pointer hover:bg-grey-5 border-b border-feature-card-border'
                                        }`}>
                                        <ImageOrIcon imageUrl={cityImageUrl || null} type="city" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                                            <ResultTitle title={city.name} />
                                            <ResultSubtitle subtitle={cityCountryName ? `City in ${cityCountryName}` : 'City'} />
                                        </div>
                                        {isNotLive && (
                                            <span className="ml-auto shrink-0 text-[12px] tracking-[0.02em] px-2 py-0.5 rounded-md bg-grey-4 text-grey-0 border border-grey-4 font-red-hat-display font-semibold">
                                                COMING SOON
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    ) : null}

                    {/* Empty State */}
                    {!isLoadingCities &&
                        unselectedCities.length === 0 &&
                        !sections.some((s) => s.items && s.items.length > 0) &&
                        hasMeaningfulQuery && (
                            <div className="px-4 py-8 text-center">
                                <div className="text-sm text-grey-2">No results found for "{trimmedQuery}"</div>
                            </div>
                        )}
                </div>
            </div>
        </>
    )
}
