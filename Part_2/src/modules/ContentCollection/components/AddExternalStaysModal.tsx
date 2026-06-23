import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
    X,
    Search,
    Loader2,
    Plane,
    Building2,
    Globe,
    BedDouble,
    Train,
    Map,
    MapPin,
    Landmark,
    Trees,
    Waves
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import Typography from '@/components/shared/Typography'
import { getKayakHotelSingle } from '@/api/kayak/kayakHotelApi'
import { useKayakHotelAPI } from '@/hooks/kayak/useKayakHotelAPI'
import { useUserInfo } from '@/hooks/useUserInfo'
import { getTomorrowDate, getDayAfterTomorrowDate } from '@/utils/dateUtils'
import type {
    KayakAutocompleteResultItem,
    KayakPrimaryPlaceType
} from '@/types/kayakTypes/kayakAutocompleteTypes'
import type { KayakHotelSingleData } from '@/types/kayakTypes/kayakHotelTypes'
import ConfirmExternalStayModal from './ConfirmExternalStayModal'
import type { CityOption } from './ConfirmExternalStayModal'
import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

export type AddStayApi = {
    addStayToCollection?: (
        collectionIdentifier: string,
        zentrumHubId: string,
        stayName: string,
        stayDescription?: string,
        sectionsOrder?: number,
        metadata?: {
            banner_img?: string
            location_tag?: string
            city_id?: string
            city_name?: string
            category?: string
            accommodation_id?: string
        }
    ) => Promise<unknown>
    addKayakStayToCollection?: (
        collectionIdentifier: string,
        payload: {
            title: string
            entity_id: string
            sections_order: number
            metadata: {
                city_id: string
                city_name: string
                latitude: number
                longitude: number
                category: string
                kayak_images: unknown[]
                kayak_hotel_id: string
                kayak_star_rating?: number
            }
        }
    ) => Promise<unknown>
}

const PLACE_TYPE_ICON_MAP: Record<KayakPrimaryPlaceType, React.ComponentType<{ className?: string }>> = {
    airport: Plane,
    city: Building2,
    country: Globe,
    hotel: BedDouble,
    trainstation: Train,
    region: Map,
    neighborhood: MapPin,
    landmark: Landmark,
    nationalpark: Trees,
    island: Waves
}

function getPlaceTypeIcon(primaryPlaceType: string): React.ComponentType<{ className?: string }> {
    const Icon = PLACE_TYPE_ICON_MAP[primaryPlaceType as KayakPrimaryPlaceType]
    return Icon ?? MapPin
}

interface AddExternalStaysModalProps {
    isOpen: boolean
    onClose: () => void
    collectionIdentifier?: string
    addStayApi?: AddStayApi
    nextSectionsOrder?: number
    availableCities?: CityOption[] // Deprecated - will be fetched using countryIds
    countryIds?: string[] // Country IDs to fetch cities for (single or multi-destination)
    onSuccess?: () => void
}

const AddExternalStaysModal: React.FC<AddExternalStaysModalProps> = ({
    isOpen,
    onClose,
    collectionIdentifier,
    addStayApi,
    nextSectionsOrder,
    availableCities = [],
    countryIds,
    onSuccess
}) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [queryToSearch, setQueryToSearch] = useState<string | null>(null)
    const [addingEntityKey, setAddingEntityKey] = useState<string | null>(null)
    const [confirmModalOpen, setConfirmModalOpen] = useState(false)
    const [confirmModalData, setConfirmModalData] = useState<KayakHotelSingleData | null>(null)
    const [confirmModalItem, setConfirmModalItem] = useState<KayakAutocompleteResultItem | null>(null)
    const [isAddingToCollection, setIsAddingToCollection] = useState(false)
    const { user } = useUserInfo()

    // Fetch cities from API using country IDs
    const { data: citiesApiResponse } = useQuery({
        queryKey: ['cities-by-country', countryIds],
        queryFn: async () => {
            if (!countryIds || countryIds.length === 0) return { results: [] }
            const params: Record<string, string | boolean> = { is_paginated: false }
            if (countryIds.length === 1) {
                params.country = countryIds[0]
            } else {
                params.country_ids = countryIds.join(',')
            }
            const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/cities/`, { params })
            return response.data
        },
        enabled: !!countryIds && countryIds.length > 0 && isOpen,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Transform API response to match expected format
    const allCities = useMemo(() => {
        if (!citiesApiResponse?.results) return []
        return citiesApiResponse.results
            .map((city: { id?: string; city_id?: string; name?: string; city_name?: string; country?: { id?: string; name?: string } }) => ({
                id: city.id || city.city_id || '',
                name: city.name || city.city_name || '',
                country_name: city.country?.name
            }))
            .filter((city: { id: string; name: string }) => city.id && city.name)
    }, [citiesApiResponse])

    // Use fetched cities if countryIds is provided, otherwise fallback to availableCities prop
    const citiesToUse = useMemo(() => {
        if (countryIds && countryIds.length > 0 && allCities.length > 0) {
            return allCities
        }
        return availableCities
    }, [countryIds, allCities, availableCities])

    const {
        filteredResults: results,
        isLoading: isSearching,
        isFetched: hasSearched
    } = useKayakHotelAPI({
        searchTerm: queryToSearch,
        enabled: isOpen,
        filterByTypes: ['hotel']
    })

    const handleSearch = () => {
        setQueryToSearch(searchQuery.trim())
    }

    const handleAddToCollectionClick = async (item: KayakAutocompleteResultItem) => {
        if (!collectionIdentifier) return
        setAddingEntityKey(item.entityKey)
        try {
            const checkIn = getTomorrowDate()
            const checkOut = getDayAfterTomorrowDate()

            const response = await getKayakHotelSingle({
                hotel: item.entityKey,
                user_track_id: user?.id ?? 'default',
                check_in: checkIn,
                check_out: checkOut,
                response_options: 'images'
            })
            const data = response?.data
            if (data) {
                setConfirmModalData(data)
                setConfirmModalItem(item)
                setConfirmModalOpen(true)
            } else {
                toast.error('Could not load hotel details. Please try again.')
            }
        } catch (err) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error('Failed to fetch hotel details:', err)
            }
            toast.error('Failed to load hotel details. Please try again.')
        } finally {
            setAddingEntityKey(null)
        }
    }

    const handleConfirmAddToCollection = async (selectedCity: CityOption, startDate: string | null, endDate: string | null) => {
        const addKayakFn = addStayApi?.addKayakStayToCollection
        const item = confirmModalItem
        const hotelData = confirmModalData
        if (!collectionIdentifier || !addKayakFn || !item || !hotelData) return
        setIsAddingToCollection(true)
        try {
            const lat = hotelData.latitude ?? 0
            const lng = hotelData.longitude ?? 0
            // Filter to only include large images (exclude small ones)
            const largeImagesOnly = (hotelData.images ?? [])
                .filter((img) => img.large)
                .map((img) => ({ large: img.large }))

            const metadata: Record<string, unknown> = {
                city_id: selectedCity.id,
                city_name: selectedCity.name,
                latitude: lat,
                longitude: lng,
                category: 'hotel',
                kayak_images: largeImagesOnly,
                kayak_hotel_id: item.entityKey,
                kayak_star_rating: hotelData.starRating
            }
            if (startDate) metadata.start_date = startDate
            if (endDate) metadata.end_date = endDate

            await addKayakFn(collectionIdentifier, {
                title: item.hotelName || item.name,
                entity_id: item.entityKey,
                sections_order: nextSectionsOrder ?? 1,
                metadata: metadata as any
            })
            toast.success(`Added "${item.hotelName || item.name}" to collection`)
            onSuccess?.()
            setConfirmModalOpen(false)
            setConfirmModalData(null)
            setConfirmModalItem(null)
        } catch (err) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error('Failed to add stay to collection:', err)
            }
            toast.error('Failed to add stay to collection. Please try again.')
        } finally {
            setIsAddingToCollection(false)
        }
    }

    const handleConfirmModalCancel = () => {
        setConfirmModalOpen(false)
        setConfirmModalData(null)
        setConfirmModalItem(null)
    }

    if (!isOpen) return null

    const modalContent = (
        <div className="fixed inset-0 z-500 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
            <div
                className="relative bg-white rounded-lg shadow-2xl flex flex-col w-full max-w-2xl max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-grey-4">
                    <Typography size="18" weight="semibold" color="grey-0">
                        Add external stays
                    </Typography>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-grey-5 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-grey-2" />
                    </button>
                </div>

                <div className="flex flex-col flex-1 min-h-0 px-6 py-4">
                    <div className="flex gap-2 shrink-0 mb-4">
                        <input
                            type="text"
                            placeholder="Search for a hotel or stay..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="flex-1 min-h-[44px] px-4 py-2.5 border border-grey-4 rounded-lg bg-white text-grey-0 placeholder:text-grey-2 focus:outline-none focus:ring-primary-default"
                        />
                        <button
                            type="button"
                            onClick={handleSearch}
                            disabled={isSearching || !searchQuery.trim()}
                            className="shrink-0 px-4 py-2 rounded-lg bg-primary-default text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-60"
                        >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Search
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0">
                        {!hasSearched ? (
                            <div className="py-8 text-center">
                                <Typography size="14" weight="medium" color="grey-2">
                                    Enter a search term and click Search to find external stays.
                                </Typography>
                            </div>
                        ) : isSearching ? (
                            <div className="py-8 flex justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-primary-default" />
                            </div>
                        ) : results.length === 0 ? (
                            <div className="py-8 text-center">
                                <Typography size="14" weight="medium" color="grey-1">
                                    No stays found. Try a different search.
                                </Typography>
                            </div>
                        ) : (
                            <ul className="space-y-1 overflow-y-auto max-h-[400px]">
                                {results.map((item) => {
                                    const IconComponent = getPlaceTypeIcon(item.primaryPlaceType)
                                    return (
                                        <li
                                            key={item.entityKey}
                                            className="flex items-start gap-3 p-3 rounded-lg border border-grey-4 hover:bg-grey-5 transition-colors"
                                        >
                                            <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-grey-5 text-grey-2">
                                                <IconComponent className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                                <Typography size="16" weight="semibold" color="grey-0">
                                                    {item.hotelName || item.name}
                                                </Typography>
                                                <Typography size="14" weight="medium" color="grey-1">
                                                    {item.cityName}
                                                </Typography>
                                                <Typography size="12" weight="normal" color="grey-2">
                                                    {item.fullName}
                                                </Typography>
                                            </div>
                                            {collectionIdentifier && addStayApi?.addStayToCollection && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddToCollectionClick(item)}
                                                    disabled={!!addingEntityKey}
                                                    className="shrink-0 px-3 py-1.5 text-sm font-medium text-primary-default hover:bg-primary-default/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                >
                                                    {addingEntityKey === item.entityKey ? (
                                                        <>
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            Adding...
                                                        </>
                                                    ) : (
                                                        'View'
                                                    )}
                                                </button>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <>
            {createPortal(modalContent, document.body)}
            {confirmModalData && confirmModalItem && (
                <ConfirmExternalStayModal
                    isOpen={confirmModalOpen}
                    onClose={handleConfirmModalCancel}
                    hotelData={confirmModalData}
                    autocompleteItem={confirmModalItem}
                    availableCities={citiesToUse}
                    isAdding={isAddingToCollection}
                    onConfirm={handleConfirmAddToCollection}
                />
            )}
        </>
    )
}

export default AddExternalStaysModal
