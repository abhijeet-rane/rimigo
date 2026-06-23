import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { CheckSquare, Plus, Trash2, Utensils } from 'lucide-react'
import type { Section, ContentCollection, Block } from '../types/contentCollection'
import type { ApiResponse } from '../types/contentCollection'
import type { IItineraryCompletedResponse } from '@/modules/Itinerary/hooks/ItineraryHook'
import CustomShimmer from '@/components/shared/Shimmer'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import FoodCard, { type FoodItemData } from './FoodCard'
import AddFoodItemModal from './AddFoodItemModal'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import apiClient from '@/lib/api/apiClient'
import { useQuery } from '@tanstack/react-query'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import type { CollectionBulkSelectionConfig } from '@/components/Collection'
import { buildFoodItemsFromItinerary } from '../utils/itineraryFoodAdapter'
import { placePhotoProxyUrl } from '@/modules/Itinerary/utils/mealPlaceImage'

type CollectionApi = {
    addSection: (
        collectionIdentifier: string,
        payload: {
            id: string
            section_type: string
            title: string
            description?: string | null
            sections_order: number
            blocks: unknown[]
            metadata?: Record<string, unknown>
        }
    ) => Promise<unknown>
}

interface FoodTabContentProps {
    activeCollectionResponse?: ApiResponse<ContentCollection> | undefined
    activeTab?: string | null
    isCollectionLoading?: boolean
    isRimigoInternal?: boolean
    isActive?: boolean
    collectionIdentifier?: string
    onFoodItemAdded?: () => void
    api?: CollectionApi
    hoveredCardId?: string | null
    setHoveredCardId?: (id: string | null) => void
    fullCollectionResponse?: ApiResponse<ContentCollection>
    countryId?: string
    /** When true, allows any user to add food items (overrides isRimigoInternal check) */
    canAddFood?: boolean
    onDeleteSection?: (sectionId: string) => void
    isDeleting?: boolean
    bulkSelection?: CollectionBulkSelectionConfig
    /** Optional callback to switch to map view (renders Map View button in city carousel) */
    onMapViewClick?: () => void
    /** When provided, the sticky header is portaled into this container */
    headerPortalRef?: React.RefObject<HTMLDivElement | null>
    /**
     * Completed-itinerary payload. Fallback data source when the collection
     * has no `section_type: 'restaurant'` sections. Meal slots (`kind: 'meal'`)
     * are projected to `FoodItemData` via `buildFoodItemsFromItinerary`.
     * When the tab renders from itinerary data, it switches to read-only:
     * Add spot, delete, bulk-select are all hidden (we never write
     * restaurants into the collection in this mode).
     */
    itineraryData?: IItineraryCompletedResponse | null
}

function isFoodItem(x: unknown): x is FoodItemData {
    return typeof x === 'object' && x !== null && 'name' in x && typeof (x as FoodItemData).name === 'string'
}

function getFoodItemsFromBlock(block: Block): FoodItemData[] {
    const items = block.value?.items as unknown[] | undefined
    if (!Array.isArray(items)) return []
    return items
        .filter((item): item is FoodItemData => {
            if (!isFoodItem(item)) return false
            const { name } = item
            return Boolean(name && String(name).trim())
        })
        .map((item) => {
            const raw = item as unknown as Record<string, unknown>
            // Priority: stable GCS image_url → place_id photo proxy → legacy
            // photo_url. Prefer a stored stable image when present (no backend
            // hit); otherwise resolve fresh via the proxy keyed on place_id.
            const placeId = typeof raw.place_id === 'string' ? raw.place_id.trim() : ''
            const imageUrl =
                (typeof raw.image_url === 'string' ? raw.image_url.trim() || undefined : undefined) ||
                (placeId ? placePhotoProxyUrl(placeId, 800) : undefined) ||
                (typeof raw.photo_url === 'string' ? raw.photo_url.trim() || undefined : undefined)
            return {
                name: String(item.name).trim(),
                map_link: typeof item.map_link === 'string' ? item.map_link.trim() || undefined : undefined,
                instagram_url: typeof item.instagram_url === 'string' ? item.instagram_url.trim() || undefined : undefined,
                image_url: imageUrl
            }
        })
}

/** Get food items from a section: either value.items array or section-as-one-item (block with maps_url/instagram_url, name = section.title) */
function getFoodItemsFromSection(section: Section): FoodItemData[] {
    const cityId = typeof section.metadata?.city_id === 'string' ? section.metadata.city_id : undefined
    const cityName = typeof section.metadata?.city_name === 'string' ? section.metadata.city_name : undefined

    const fromBlocks = section.blocks?.flatMap((b) => getFoodItemsFromBlock(b)) ?? []
    if (fromBlocks.length > 0) {
        return fromBlocks.map((item) => ({ ...item, sectionId: section.id, city_id: cityId, city_name: cityName }))
    }
    const linksBlock = section.blocks?.find((b) => b.block_type === 'links' && (b.value?.maps_url || b.value?.instagram_url))
    if (linksBlock?.value && section.title) {
        const v = linksBlock.value
        const mapLink = typeof v.maps_url === 'string' ? v.maps_url.trim() || undefined : undefined
        const instagramUrl = typeof v.instagram_url === 'string' ? v.instagram_url.trim() || undefined : undefined
        const placeId = typeof v.place_id === 'string' ? v.place_id.trim() : ''
        const imageUrl =
            (typeof v.image_url === 'string' ? v.image_url.trim() || undefined : undefined) ||
            (placeId ? placePhotoProxyUrl(placeId, 800) : undefined) ||
            (typeof v.photo_url === 'string' ? v.photo_url.trim() || undefined : undefined)
        const address = typeof v.address === 'string' ? v.address.trim() || undefined : undefined
        const latitude = typeof v.latitude === 'number' ? v.latitude : undefined
        const longitude = typeof v.longitude === 'number' ? v.longitude : undefined
        if (mapLink || instagramUrl) {
            return [
                {
                    sectionId: section.id,
                    name: section.title,
                    map_link: mapLink,
                    instagram_url: instagramUrl,
                    image_url: imageUrl,
                    address,
                    latitude,
                    longitude,
                    city_id: cityId,
                    city_name: cityName
                }
            ]
        }
    }
    return []
}

const FoodTabContent: React.FC<FoodTabContentProps> = ({
    activeCollectionResponse,
    activeTab,
    isCollectionLoading,
    isRimigoInternal = false,
    collectionIdentifier,
    onFoodItemAdded,
    api = contentCollectionApi,
    setHoveredCardId,
    countryId,
    canAddFood = false,
    onDeleteSection,
    isDeleting = false,
    bulkSelection,
    headerPortalRef,
    isActive = true,
    itineraryData,
}) => {
    // NOTE: bulk-select + delete are effectively disabled below when the
    // tab is in itinerary-mode (see `sourceIsItinerary` check). Reading
    // these up-front to keep downstream branches simple.
    const bulkSelectMode = bulkSelection?.mode ?? false
    const selectedSectionIds = bulkSelection?.selectedSectionIds
    const onToggleSectionSelect = bulkSelection?.onToggleSectionSelect
    const showBulkSelectionControlsRaw = Boolean(bulkSelection)
    const onToggleBulkSelectMode = bulkSelection?.onToggleMode
    const onBulkDeleteSelected = bulkSelection?.onDeleteSelected
    const onBulkSelectAll = bulkSelection?.onSelectAllVisible

    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [searchParams, setSearchParams] = useSearchParams()
    usePostHog()

    // Selected city is derived from URL params (source of truth) — same as StaysTab/ExperienceTab
    const selectedCityId = useMemo(() => searchParams.get('city_id') ?? null, [searchParams])

    const restaurantSections = useMemo(() => {
        if (activeTab !== 'restaurant' || !activeCollectionResponse?.data?.sections) return []
        return activeCollectionResponse.data.sections.filter((section: Section) => section.section_type === 'restaurant')
    }, [activeCollectionResponse, activeTab])

    // Priority chain for populating the tab:
    //   1. collection has restaurant sections → use them (legacy; keeps
    //      backward compat for pre-existing + purchased collections).
    //   2. itinerary has meal slots → derive on-the-fly (new default
    //      once backend stops writing restaurants during assemble()).
    //   3. neither → empty state.
    const itineraryFoodItems = useMemo(
        () => buildFoodItemsFromItinerary(itineraryData?.days),
        [itineraryData?.days],
    )

    const collectionFoodItems = useMemo(() => {
        const items: FoodItemData[] = []
        restaurantSections.forEach((section) => {
            items.push(...getFoodItemsFromSection(section))
        })
        return items
    }, [restaurantSections])

    // `sourceIsItinerary` gates edit controls. When itinerary data drives
    // the tab, Add/Delete/Bulk-select are hidden because we never persist
    // restaurant sections in this mode.
    const sourceIsItinerary = collectionFoodItems.length === 0 && itineraryFoodItems.length > 0
    const allFoodItems = sourceIsItinerary ? itineraryFoodItems : collectionFoodItems
    const showBulkSelectionControls = showBulkSelectionControlsRaw && !sourceIsItinerary
    const allowAddFood = !sourceIsItinerary
    const effectiveOnDeleteSection = sourceIsItinerary ? undefined : onDeleteSection

    // Extract unique cities from ALL sections (experience, stays, restaurant) using full collection
    const uniqueCities = useMemo(() => {
        const cityMap = new Map<string, string>()
        for (const item of allFoodItems) {
            if (item.city_id && item.city_name) {
                cityMap.set(item.city_id, item.city_name)
            }
        }
        return Array.from(cityMap.entries()).map(([id, name]) => ({ id, name }))
    }, [allFoodItems])

    // Only apply city filter if the URL city matches one of the restaurant cities;
    // otherwise show all (e.g. when city_id was set by the stays tab for a different city)
    const effectiveCityId = useMemo(() => {
        if (selectedCityId === null) return null
        return uniqueCities.some((c) => c.id === selectedCityId) ? selectedCityId : null
    }, [selectedCityId, uniqueCities])

    const foodItems = useMemo(() => {
        if (effectiveCityId === null) return allFoodItems
        return allFoodItems.filter((item) => item.city_id === effectiveCityId)
    }, [allFoodItems, effectiveCityId])

    const bulkVisibleFoodSectionIds = useMemo(() => {
        const seen = new Set<string>()
        const ids: string[] = []
        for (const item of foodItems) {
            if (item.sectionId && !seen.has(item.sectionId)) {
                seen.add(item.sectionId)
                ids.push(item.sectionId)
            }
        }
        return ids
    }, [foodItems])

    // Fetch cities from API for AddFoodItemModal
    const { data: citiesApiResponse } = useQuery({
        queryKey: ['cities-by-country', countryId],
        queryFn: async () => {
            if (!countryId) return { results: [] }
            const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/cities/`, {
                params: {
                    country: countryId,
                    is_paginated:false
                }
            })
            return response.data
        },
        enabled: !!countryId && isAddModalOpen,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

        // Transform API response to match expected format
     const allCities = useMemo(() => {
            if (!citiesApiResponse?.results) return []
            return citiesApiResponse.results
                .map((city: { id?: string; city_id?: string; name?: string; city_name?: string }) => ({
                    id: city.id || city.city_id || '',
                    name: city.name || city.city_name || ''
                }))
                .filter((city: { id: string; name: string }) => city.id && city.name)
        }, [citiesApiResponse])

    if (isCollectionLoading) {
        return (
            <div className="flex flex-col gap-4 p-4 min-h-screen">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4">
                    {[...Array(4)].map((_, i) => (
                        <CustomShimmer
                            key={i}
                            height={300}
                            radius={16}
                            className="w-full"
                        />
                    ))}
                </div>
            </div>
        )
    }

    const allVisibleFoodSectionsSelected =
        bulkVisibleFoodSectionIds.length > 0 &&
        bulkVisibleFoodSectionIds.every((id) => selectedSectionIds?.has(id))

    return (
        <>
            <div className="flex flex-col gap-2 min-h-screen ">
                <div className='flex flex-col gap-5'>
                {/* Sticky city filter header (portaled if ref provided) */}
                {(() => {
                    if (uniqueCities.length === 0) return null
                    const cityFilterContent = (
                        <div className="bg-white px-0">
                            <div className="flex items-center">
                                <div className="relative flex-1 min-w-0">
                                    <GenericCarousel
                                        className="flex-1 min-w-0"
                                        gap={0}
                                        gradientStartColor="white"
                                        gradientEndColor="rgba(255,255,255,0)">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = new URLSearchParams(searchParams)
                                                next.delete('city_id')
                                                setSearchParams(next, { replace: true })
                                            }}
                                            className={`relative flex items-center px-4 py-3 cursor-pointer shrink-0 transition-colors ${
                                                effectiveCityId === null ? 'bg-[#dfdde0]' : 'bg-white hover:bg-grey-6'
                                            }`}>
                                            <span className="text-[14px] font-bold font-red-hat-display text-grey-0 tracking-[-0.28px] leading-[18px] whitespace-nowrap">All</span>
                                        </button>
                                        {uniqueCities.map((city) => (
                                            <button
                                                key={city.id}
                                                type="button"
                                                onClick={() => {
                                                    const next = new URLSearchParams(searchParams)
                                                    next.set('city_id', city.id)
                                                    setSearchParams(next, { replace: true })
                                                }}
                                                className={`relative flex items-center px-4 py-3 cursor-pointer shrink-0 transition-colors ${
                                                    effectiveCityId === city.id ? 'bg-[#dfdde0]' : 'bg-white hover:bg-grey-6'
                                                }`}>
                                                <span className="text-[14px] font-bold font-red-hat-display text-grey-0 tracking-[-0.28px] leading-[18px] whitespace-nowrap">{city.name}</span>
                                            </button>
                                        ))}
                                    </GenericCarousel>
                                </div>
                            </div>
                        </div>
                    )
                    return headerPortalRef?.current && isActive
                        ? createPortal(cityFilterContent, headerPortalRef.current)
                        : !headerPortalRef
                            ? <div className="bg-white mb-0 -mx-4 px-4 sticky top-0 z-20 shadow-[0px_2px_4px_rgba(0,0,0,0.08)]">{cityFilterContent}</div>
                            : null
                })()}

                {/* Action buttons — Select + Add spot, right-aligned.
                    Hidden entirely in itinerary-mode (read-only view). */}
                {(showBulkSelectionControls || (allowAddFood && (isRimigoInternal || canAddFood) && collectionIdentifier)) && (
                    <div className="flex items-center justify-end gap-2 px-4 py-3">
                        {showBulkSelectionControls && (
                            <div className="flex items-center gap-2 shrink-0">
                                <button type="button" onClick={onToggleBulkSelectMode} className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-grey-4 bg-white hover:bg-grey-5 text-[12px] font-medium">
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    {bulkSelectMode ? 'Cancel' : 'Select'}
                                </button>
                                {bulkSelectMode && onBulkSelectAll && (
                                    <button type="button" onClick={() => onBulkSelectAll(bulkVisibleFoodSectionIds)} disabled={bulkVisibleFoodSectionIds.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-grey-4 bg-white hover:bg-grey-5 disabled:opacity-50 text-[12px] font-medium text-grey-0">
                                        {allVisibleFoodSectionsSelected ? 'Deselect all' : 'Select all'}
                                    </button>
                                )}
                                {bulkSelectMode && (
                                    <button type="button" onClick={() => void onBulkDeleteSelected?.()} disabled={!selectedSectionIds || selectedSectionIds.size === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 text-[12px] font-medium">
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete ({selectedSectionIds?.size ?? 0})
                                    </button>
                                )}
                            </div>
                        )}
                        {allowAddFood && (isRimigoInternal || canAddFood) && collectionIdentifier && (
                            <button type="button" onClick={() => { setIsAddModalOpen(true) }} className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-grey-4 shrink-0 transition-colors cursor-pointer bg-white text-grey-0 hover:bg-grey-5 text-[12px] font-medium">
                                <Plus className="w-3.5 h-3.5" />
                                Add spot
                            </button>
                        )}
                    </div>
                )}

                {/* Empty state: show when neither source has items. We can't
                    gate on `restaurantSections.length` alone anymore because
                    itinerary-mode legitimately has 0 restaurant sections
                    while still having food items. */}
                {allFoodItems.length === 0 || foodItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-8">
                        <div className="w-14 h-14 rounded-2xl bg-grey-5 flex items-center justify-center mb-4">
                            <Utensils className="w-6 h-6 text-grey-3" />
                        </div>
                        <p className="text-base font-semibold text-grey-1 font-red-hat-display mb-1">No food spots yet</p>
                        <p className="text-sm text-grey-2 font-manrope text-center">Add restaurants and cafes to this collection</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 pt-4 pb-24">
                            {foodItems.map((item, index) => (
                                <div
                                    key={item.sectionId || `food-${index}`}
                                    className="relative">
                                    {!sourceIsItinerary && bulkSelectMode && item.sectionId && onToggleSectionSelect && (
                                        <label className="absolute top-3 left-3 z-30 inline-flex items-center gap-2 rounded-md bg-white border border-grey-4 px-2.5 py-1 cursor-pointer shadow-sm hover:bg-grey-5">
                                            <input
                                                type="checkbox"
                                                checked={!!selectedSectionIds?.has(item.sectionId)}
                                                onChange={() => onToggleSectionSelect(item.sectionId!)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-3.5 w-3.5 accent-primary-default"
                                            />
                                            <span className="text-[11px] font-semibold text-grey-0">Select</span>
                                        </label>
                                    )}
                                    <FoodCard
                                        item={item}
                                        onMouseEnter={() => item.sectionId && setHoveredCardId?.(item.sectionId)}
                                        onMouseLeave={() => setHoveredCardId?.(null)}
                                        onClick={() => {
                                            if (item.map_link) {
                                                window.open(item.map_link, '_blank', 'noopener,noreferrer')
                                            }
                                        }}
                                        onDeleteSection={effectiveOnDeleteSection}
                                        showDeleteButton={!!effectiveOnDeleteSection}
                                        isDeleting={isDeleting}
                                    />
                                </div>
                            ))}
                        </div>
                        {foodItems.length < 1 && (
                            <div className="flex-1 flex flex-col items-center justify-center gap-2 -mt-16">
                                <Utensils
                                    className="w-5 h-5 text-grey-3/50"
                                    strokeWidth={1.5}
                                />
                                <p className="text-lg text-grey-3 font-manrope italic">Savor like the star you are.</p>
                            </div>
                        )}
                    </>
                )}
                </div>
            </div>

            {allowAddFood && (isRimigoInternal || canAddFood) && collectionIdentifier && (
                <AddFoodItemModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    collectionIdentifier={collectionIdentifier}
                    onSuccess={onFoodItemAdded}
                    api={api}
                    availableCities={allCities}
                    isRimigoInternal={isRimigoInternal}
                />
            )}
        </>
    )
}

export default FoodTabContent
