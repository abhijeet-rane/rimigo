import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
    BedDouble,
    Building2,
    ExternalLink,
    Globe,
    Landmark,
    Loader2,
    Map,
    MapPin,
    Plane,
    PlusCircle,
    Search,
    Sparkles,
    Train,
    Trees,
    Waves,
    X
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import Typography from '@/components/shared/Typography'
import { searchHotelSuggestions, type HotelSuggestion } from '@/pages/Stays/Services'
import {
    checkAccommodationExistence,
    getAccommodationMetadata
} from '@/pages/Stays/Apis/accommodationsAPI'
import { getKayakHotelSingle } from '@/api/kayak/kayakHotelApi'
import { useKayakHotelAPI } from '@/hooks/kayak/useKayakHotelAPI'
import { useUserInfo } from '@/hooks/useUserInfo'
import { getDayAfterTomorrowDate, getTomorrowDate } from '@/utils/dateUtils'
import type { KayakAutocompleteResultItem, KayakPrimaryPlaceType } from '@/types/kayakTypes/kayakAutocompleteTypes'
import type { KayakHotelSingleData } from '@/types/kayakTypes/kayakHotelTypes'
import type { CityOption } from './ConfirmExternalStayModal'
import ConfirmExternalStayModal from './ConfirmExternalStayModal'
import ConfirmRimigoStayModal from './ConfirmRimigoStayModal'
import AddToDatabaseModal from '@/components/Addtodatabasemodal'
import { buildStayDetailUrlFromSuggestion } from '../utils/stayDetailUrl'
import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

type SearchTab = 'rimigo' | 'external'

const RIMIGO_COMPASS_ICON = '/icons/compass.png'

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

type SearchStaysModalApi = {
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
            start_date?: string
            end_date?: string
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

interface SearchStaysModalProps {
    isOpen: boolean
    onClose: () => void
    collectionIdentifier?: string
    addStayApi?: SearchStaysModalApi
    nextSectionsOrder?: number
    availableCities?: CityOption[]
    countryIds?: string[]
    onSuccess?: () => void
    /** Current filter check-in date (YYYY-MM-DD) to pre-populate external stays */
    filterCheckIn?: string | null
    /** Current filter check-out date (YYYY-MM-DD) to pre-populate external stays */
    filterCheckOut?: string | null
}

const SearchStaysModal: React.FC<SearchStaysModalProps> = ({
    isOpen,
    onClose,
    collectionIdentifier,
    addStayApi,
    nextSectionsOrder,
    availableCities = [],
    countryIds,
    onSuccess,
    filterCheckIn,
    filterCheckOut
}) => {
    const { user } = useUserInfo()
    const [activeTab, setActiveTab] = useState<SearchTab>('rimigo')

    const [rimigoQuery, setRimigoQuery] = useState('')
    const [rimigoResults, setRimigoResults] = useState<HotelSuggestion[]>([])
    const [rimigoSearching, setRimigoSearching] = useState(false)
    const [rimigoHasSearched, setRimigoHasSearched] = useState(false)
    const [rimigoBusyId, setRimigoBusyId] = useState<string | null>(null)
    const [rimigoExistenceMap, setRimigoExistenceMap] = useState<Record<string, { exists: boolean; accommodationId?: string }>>({})

    const [externalQuery, setExternalQuery] = useState('')
    const [externalQueryToSearch, setExternalQueryToSearch] = useState<string | null>(null)
    const [externalBusyId, setExternalBusyId] = useState<string | null>(null)

    const [confirmRimigoOpen, setConfirmRimigoOpen] = useState(false)
    const [pendingSuggestion, setPendingSuggestion] = useState<HotelSuggestion | null>(null)
    const [pendingBannerImg, setPendingBannerImg] = useState<string | null>(null)
    const [pendingDisplayName, setPendingDisplayName] = useState('')
    const [pendingAccommodationId, setPendingAccommodationId] = useState<string | undefined>(undefined)
    const [isAddingRimigoToCollection, setIsAddingRimigoToCollection] = useState(false)

    const [confirmExternalOpen, setConfirmExternalOpen] = useState(false)
    const [confirmExternalData, setConfirmExternalData] = useState<KayakHotelSingleData | null>(null)
    const [confirmExternalItem, setConfirmExternalItem] = useState<KayakAutocompleteResultItem | null>(null)
    const [isAddingExternalToCollection, setIsAddingExternalToCollection] = useState(false)

    const [isAddToDbBusy, setIsAddToDbBusy] = useState(false)
    const [isAddToDbModalOpen, setIsAddToDbModalOpen] = useState(false)
    const [pendingAddToDbHotel, setPendingAddToDbHotel] = useState<{
        hotel_name: string
        zentrum_hub_id: string
        images?: string
        city?: string
    } | null>(null)
    const [pendingAddToDbCity, setPendingAddToDbCity] = useState<CityOption | null>(null)

    const { data: citiesApiResponse } = useQuery({
        queryKey: ['cities-by-country', countryIds, 'unified-stays-search'],
        queryFn: async () => {
            if (!countryIds || countryIds.length === 0) return { results: [] }
            const params: Record<string, string | boolean> = { is_paginated: false }
            if (countryIds.length === 1) params.country = countryIds[0]
            else params.country_ids = countryIds.join(',')
            const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/cities/`, { params })
            return response.data
        },
        enabled: !!countryIds && countryIds.length > 0 && isOpen,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    const fetchedCities = useMemo<CityOption[]>(() => {
        if (!citiesApiResponse?.results) return []
        return citiesApiResponse.results
            .map((city: { id?: string; city_id?: string; name?: string; city_name?: string }) => ({
                id: city.id || city.city_id || '',
                name: city.name || city.city_name || ''
            }))
            .filter((city: { id: string; name: string }) => city.id && city.name)
    }, [citiesApiResponse])

    const citiesToUse = useMemo<CityOption[]>(() => {
        if (fetchedCities.length > 0) return fetchedCities
        return availableCities
    }, [fetchedCities, availableCities])

    const { filteredResults: externalResults, isLoading: externalSearching, isFetched: externalHasSearched } = useKayakHotelAPI({
        searchTerm: externalQueryToSearch,
        enabled: isOpen && activeTab === 'external',
        filterByTypes: ['hotel']
    })

    useEffect(() => {
        if (!isOpen) {
            setActiveTab('rimigo')
            setRimigoQuery('')
            setRimigoResults([])
            setRimigoHasSearched(false)
            setRimigoExistenceMap({})
            setExternalQuery('')
            setExternalQueryToSearch(null)
            setPendingSuggestion(null)
            setConfirmRimigoOpen(false)
            setConfirmExternalOpen(false)
            setConfirmExternalData(null)
            setConfirmExternalItem(null)
            setPendingAddToDbHotel(null)
            setPendingAddToDbCity(null)
            setIsAddToDbModalOpen(false)
        }
    }, [isOpen])

    useEffect(() => {
        if (rimigoResults.length === 0) return
        const missingIds = rimigoResults
            .map((item) => item.referenceId || item.id)
            .filter((id) => id && !rimigoExistenceMap[id])
        if (missingIds.length === 0) return
        let cancelled = false
        void (async () => {
            const checks = await Promise.all(
                missingIds.map(async (zentrumId) => {
                    try {
                        const res = await checkAccommodationExistence(zentrumId)
                        return [zentrumId, { exists: !!res.is_accommodation_exists, accommodationId: res.accommodation_id }] as const
                    } catch {
                        return [zentrumId, { exists: false }] as const
                    }
                })
            )
            if (cancelled) return
            setRimigoExistenceMap((prev) => {
                const next = { ...prev }
                checks.forEach(([id, result]) => {
                    next[id] = result
                })
                return next
            })
        })()
        return () => {
            cancelled = true
        }
    }, [rimigoResults, rimigoExistenceMap])

    const handleTabSwitch = (tab: SearchTab) => {
        if (tab === activeTab) return
        setActiveTab(tab)
    }

    const resolveCityForName = (cityName?: string): CityOption => {
        if (!cityName) return citiesToUse[0] || { id: '', name: '' }
        const match =
            citiesToUse.find((c) => c.name.toLowerCase() === cityName.toLowerCase()) ||
            citiesToUse.find((c) => c.name.toLowerCase().includes(cityName.toLowerCase())) ||
            citiesToUse[0]
        return match || { id: '', name: cityName }
    }

    const openAddToRimigoModal = (payload: { zentrumHubId: string; name: string; cityName?: string; image?: string }) => {
        const resolvedCity = resolveCityForName(payload.cityName)
        if (!resolvedCity.id) {
            toast.error('No collection city available for adding to Rimigo DB.')
            return
        }
        setPendingAddToDbHotel({
            hotel_name: payload.name,
            zentrum_hub_id: payload.zentrumHubId,
            images: payload.image,
            city: payload.cityName
        })
        setPendingAddToDbCity(resolvedCity)
        setIsAddToDbModalOpen(true)
    }

    const handleRimigoSearch = async () => {
        const q = rimigoQuery.trim()
        if (!q) return
        setRimigoSearching(true)
        setRimigoHasSearched(true)
        try {
            const list = await searchHotelSuggestions(q)
            setRimigoResults(list)
        } catch {
            toast.error('Search failed. Please try again.')
            setRimigoResults([])
        } finally {
            setRimigoSearching(false)
        }
    }

    const prepareRimigoAdd = async (suggestion: HotelSuggestion) => {
        const zentrumHubId = suggestion.referenceId || suggestion.id
        if (!zentrumHubId || !collectionIdentifier || !addStayApi?.addStayToCollection) return
        if (citiesToUse.length === 0) {
            toast.error('No cities available for this collection.')
            return
        }
        setRimigoBusyId(zentrumHubId)
        try {
            let banner: string | null = null
            let displayName = suggestion.name || suggestion.fullName
            const existence = rimigoExistenceMap[zentrumHubId]
            try {
                const metaRes = await getAccommodationMetadata({
                    stay_ids: [zentrumHubId],
                    check_in_date: effectiveCheckIn,
                    check_out_date: effectiveCheckOut
                })
                const row = metaRes.data?.data?.[0]
                if (row?.banner_img) banner = row.banner_img
                if (row?.name) displayName = row.name
            } catch {
                // Optional metadata
            }
            setPendingSuggestion(suggestion)
            setPendingBannerImg(banner)
            setPendingDisplayName(displayName)
            setPendingAccommodationId(existence?.accommodationId)
            setConfirmRimigoOpen(true)
        } catch {
            toast.error('Could not prepare stay. Please try again.')
        } finally {
            setRimigoBusyId(null)
        }
    }

    const handleConfirmRimigoAdd = async (selectedCity: CityOption, startDate: string | null, endDate: string | null) => {
        const suggestion = pendingSuggestion
        const zentrumHubId = suggestion?.referenceId || suggestion?.id
        const addFn = addStayApi?.addStayToCollection
        if (!collectionIdentifier || !addFn || !zentrumHubId || !suggestion) return
        setIsAddingRimigoToCollection(true)
        try {
            const metadata: {
                banner_img?: string
                city_id: string
                city_name: string
                category: string
                accommodation_id?: string
                start_date?: string
                end_date?: string
            } = {
                city_id: selectedCity.id,
                city_name: selectedCity.name,
                category: 'hotel'
            }
            if (pendingBannerImg) metadata.banner_img = pendingBannerImg
            if (pendingAccommodationId) metadata.accommodation_id = pendingAccommodationId
            if (startDate) metadata.start_date = startDate
            if (endDate) metadata.end_date = endDate
            await addFn(
                collectionIdentifier,
                zentrumHubId,
                pendingDisplayName || suggestion.name || suggestion.fullName,
                undefined,
                nextSectionsOrder ?? 1,
                metadata
            )
            toast.success(`Added "${pendingDisplayName || suggestion.name}" to collection`)
            onSuccess?.()
            setConfirmRimigoOpen(false)
            setPendingSuggestion(null)
            setPendingBannerImg(null)
            setPendingAccommodationId(undefined)
        } catch {
            toast.error('Failed to add stay to collection. Please try again.')
        } finally {
            setIsAddingRimigoToCollection(false)
        }
    }

    const handleExternalSearch = () => {
        setExternalQueryToSearch(externalQuery.trim())
    }

    // Effective check-in/out: use filter dates if valid, else fall back to tomorrow/day-after
    const effectiveCheckIn = filterCheckIn || getTomorrowDate()
    const effectiveCheckOut = filterCheckOut || getDayAfterTomorrowDate()

    const prepareExternalAdd = async (item: KayakAutocompleteResultItem) => {
        if (!collectionIdentifier) return
        setExternalBusyId(item.entityKey)
        try {
            const response = await getKayakHotelSingle({
                hotel: item.entityKey,
                user_track_id: user?.id ?? 'default',
                check_in: effectiveCheckIn,
                check_out: effectiveCheckOut,
                response_options: 'images'
            })
            const data = response?.data
            if (!data) {
                toast.error('Could not load hotel details. Please try again.')
                return
            }
            setConfirmExternalData(data)
            setConfirmExternalItem(item)
            setConfirmExternalOpen(true)
        } catch {
            toast.error('Failed to load hotel details. Please try again.')
        } finally {
            setExternalBusyId(null)
        }
    }

    const handleConfirmExternalAdd = async (selectedCity: CityOption, startDate: string | null, endDate: string | null) => {
        const addKayakFn = addStayApi?.addKayakStayToCollection
        const item = confirmExternalItem
        const hotelData = confirmExternalData
        if (!collectionIdentifier || !addKayakFn || !item || !hotelData) return
        setIsAddingExternalToCollection(true)
        try {
            const largeImagesOnly = (hotelData.images ?? []).filter((img) => img.large).map((img) => ({ large: img.large }))
            const metadata: Record<string, unknown> = {
                city_id: selectedCity.id,
                city_name: selectedCity.name,
                latitude: hotelData.latitude ?? 0,
                longitude: hotelData.longitude ?? 0,
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
                metadata: metadata as {
                    city_id: string
                    city_name: string
                    latitude: number
                    longitude: number
                    category: string
                    kayak_images: unknown[]
                    kayak_hotel_id: string
                    kayak_star_rating?: number
                }
            })
            toast.success(`Added "${item.hotelName || item.name}" to collection`)
            onSuccess?.()
            setConfirmExternalOpen(false)
            setConfirmExternalData(null)
            setConfirmExternalItem(null)
        } catch {
            toast.error('Failed to add stay to collection. Please try again.')
        } finally {
            setIsAddingExternalToCollection(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
            {createPortal(
                <AnimatePresence>
                    <motion.div
                        role="presentation"
                        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}>
                        <button type="button" className="absolute inset-0 bg-grey-0/50 backdrop-blur-[8px] cursor-default" onClick={onClose} />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            className="relative w-full max-w-4xl h-[min(60vh,560px)] flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.28)] border border-grey-4/50"
                            initial={{ opacity: 0, scale: 0.96, y: 18 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 12 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}>

                            {/* Header */}
                            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-grey-4/60 bg-gradient-to-br from-primary-default/[0.06] via-white to-white shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0 p-2.5 rounded-xl bg-primary-default/12 text-primary-default">
                                        <Sparkles className="w-5 h-5" aria-hidden />
                                    </div>
                                    <Typography size="20" weight="semibold" color="grey-0" className="font-red-hat-display tracking-tight">
                                        Search Stays
                                    </Typography>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="cursor-pointer shrink-0 p-2 rounded-xl text-grey-2 hover:text-grey-0 hover:bg-grey-5/90 transition-colors"
                                    aria-label="Close">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Tabs + Search */}
                            <div className="px-5 sm:px-6 pt-4 pb-2 shrink-0 flex items-center gap-3">
                                <div className="inline-flex rounded-xl border border-grey-4 bg-grey-5/50 p-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleTabSwitch('rimigo')}
                                        className={`cursor-pointer px-5 py-2 rounded-md text-sm font-semibold transition-all ${
                                            activeTab === 'rimigo'
                                                ? 'bg-white text-primary-default shadow-sm'
                                                : 'text-grey-2 hover:text-grey-0 hover:bg-white/60'
                                        }`}>
                                        Rimigo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleTabSwitch('external')}
                                        className={`cursor-pointer px-5 py-2 rounded-md text-sm font-semibold transition-all ${
                                            activeTab === 'external'
                                                ? 'bg-white text-primary-default shadow-sm'
                                                : 'text-grey-2 hover:text-grey-0 hover:bg-white/60'
                                        }`}>
                                        External
                                    </button>
                                </div>
                                <div className="flex gap-2 flex-1 min-w-0">
                                    <div className="relative flex-1 min-w-0">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-2 pointer-events-none" />
                                        <input
                                            type="search"
                                            placeholder={
                                                activeTab === 'rimigo'
                                                    ? 'Search Rimigo stays by hotel name...'
                                                    : 'Search external stays by hotel name or city...'
                                            }
                                            value={activeTab === 'rimigo' ? rimigoQuery : externalQuery}
                                            onChange={(e) =>
                                                activeTab === 'rimigo'
                                                    ? setRimigoQuery(e.target.value)
                                                    : setExternalQuery(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key !== 'Enter') return
                                                if (activeTab === 'rimigo') void handleRimigoSearch()
                                                else handleExternalSearch()
                                            }}
                                            className="w-full min-h-10 pl-10 pr-4 py-2 rounded-xl border border-grey-4/90 bg-grey-5/25 text-grey-0 font-medium text-md placeholder:font-light placeholder:text-grey-2 focus:outline-none focus:ring-2 focus:ring-primary-default/30 focus:border-primary-default focus:bg-white transition-all shadow-sm"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (activeTab === 'rimigo') void handleRimigoSearch()
                                            else handleExternalSearch()
                                        }}
                                        disabled={
                                            activeTab === 'rimigo'
                                                ? rimigoSearching || !rimigoQuery.trim()
                                                : externalSearching || !externalQuery.trim()
                                        }
                                        className="cursor-pointer shrink-0 min-h-10 px-5 rounded-xl bg-primary-default text-white font-semibold text-sm shadow-md shadow-primary-default/25 disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity">
                                        {(activeTab === 'rimigo' ? rimigoSearching : externalSearching) ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Search className="w-4 h-4" />
                                        )}
                                        Search
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="flex flex-col flex-1 min-h-0 px-5 sm:px-6 pb-5 gap-3">
                                {activeTab === 'rimigo' ? (
                                    <>
                                        {/* Rimigo results */}
                                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1">
                                            {!rimigoHasSearched ? (
                                                <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center rounded-2xl border border-dashed border-grey-4/80 bg-grey-5/20">
                                                    <div className="h-14 w-14 rounded-2xl bg-white ring-1 ring-grey-4/50 flex items-center justify-center p-2 mb-3 shadow-sm">
                                                        <img src={RIMIGO_COMPASS_ICON} alt="" className="w-full h-full object-contain" />
                                                    </div>
                                                    <Typography size="15" weight="semibold" color="grey-1">
                                                        Search the Rimigo catalog
                                                    </Typography>
                                                    <Typography size="13" weight="normal" color="grey-2" className="mt-1">
                                                        Type a hotel name and press Search
                                                    </Typography>
                                                </div>
                                            ) : rimigoSearching ? (
                                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                                    <Loader2 className="w-9 h-9 animate-spin text-primary-default" />
                                                    <Typography size="14" weight="medium" color="grey-2">Searching...</Typography>
                                                </div>
                                            ) : rimigoResults.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full py-14 text-center rounded-2xl bg-grey-5/25 border border-grey-4/60">
                                                    <Typography size="15" weight="semibold" color="grey-1">No matches found</Typography>
                                                    <Typography size="13" weight="normal" color="grey-2" className="mt-1">Try a different hotel name</Typography>
                                                </div>
                                            ) : (
                                                <ul className="grid grid-cols-2 gap-2.5 pb-1">
                                                    {rimigoResults.map((item) => {
                                                        const key = item.referenceId || item.id
                                                        const busy = rimigoBusyId === key
                                                        const locationLine = [item.city, item.country].filter(Boolean).join(', ')
                                                        const existsRow = rimigoExistenceMap[key]
                                                        const canAddStay = !!existsRow?.exists
                                                        return (
                                                            <li key={key} className="flex flex-col gap-3 p-3.5 rounded-2xl border border-grey-4/70 bg-white shadow-sm hover:shadow-md transition-shadow">
                                                                {/* Top row: icon + info */}
                                                                <div className="flex items-start gap-2.5">
                                                                    <div className="shrink-0 h-10 w-10 rounded-xl bg-grey-5/70 ring-1 ring-grey-4/60 flex items-center justify-center p-1.5">
                                                                        <img src={RIMIGO_COMPASS_ICON} alt="" className="w-full h-full object-contain" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1 pt-0.5">
                                                                        <p className="text-[13px] font-semibold text-grey-0 leading-snug line-clamp-2">{item.name}</p>
                                                                        {locationLine ? <p className="text-[11px] font-medium text-grey-3 mt-0.5">{locationLine}</p> : null}
                                                                    </div>
                                                                </div>
                                                                {/* Actions — single row */}
                                                                <div className="flex items-center gap-1.5 mt-auto flex-wrap">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => void prepareRimigoAdd(item)}
                                                                        disabled={!canAddStay || !!rimigoBusyId}
                                                                        className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary-default text-white text-[12px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-default/90 transition-colors whitespace-nowrap">
                                                                        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}
                                                                        Stay
                                                                    </button>
                                                                    {!canAddStay && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openAddToRimigoModal({ zentrumHubId: key, name: item.name || item.fullName, cityName: item.city })}
                                                                            disabled={isAddToDbBusy}
                                                                            className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-primary-default text-primary-default text-[12px] font-semibold hover:bg-primary-default/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                                                                            {isAddToDbBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}
                                                                            Add to DB
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const href = buildStayDetailUrlFromSuggestion(item)
                                                                            if (!href) return
                                                                            window.open(href, '_blank', 'noopener,noreferrer')
                                                                        }}
                                                                        className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-grey-4 text-grey-2 hover:text-grey-0 hover:bg-grey-5 transition-colors text-[12px] font-medium whitespace-nowrap">
                                                                        <ExternalLink className="w-3 h-3" />
                                                                        Preview
                                                                    </button>
                                                                </div>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* External results */}
                                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1">
                                            {!externalHasSearched ? (
                                                <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center rounded-2xl border border-dashed border-grey-4/80 bg-grey-5/20">
                                                    <div className="shrink-0 p-3 rounded-2xl bg-grey-5 text-grey-2 mb-3">
                                                        <Globe className="w-7 h-7" />
                                                    </div>
                                                    <Typography size="15" weight="semibold" color="grey-1">
                                                        Search external stays
                                                    </Typography>
                                                    <Typography size="13" weight="normal" color="grey-2" className="mt-1">
                                                        Find hotels from the global catalog and add them to this collection
                                                    </Typography>
                                                </div>
                                            ) : externalSearching ? (
                                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                                    <Loader2 className="w-9 h-9 animate-spin text-primary-default" />
                                                    <Typography size="14" weight="medium" color="grey-2">Searching...</Typography>
                                                </div>
                                            ) : !externalResults || externalResults.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full py-14 text-center rounded-2xl bg-grey-5/25 border border-grey-4/60">
                                                    <Typography size="15" weight="semibold" color="grey-1">No stays found</Typography>
                                                    <Typography size="13" weight="normal" color="grey-2" className="mt-1">Try a different search term</Typography>
                                                </div>
                                            ) : (
                                                <ul className="grid grid-cols-2 gap-2.5 pb-1">
                                                    {externalResults.map((item) => {
                                                        const IconComponent = getPlaceTypeIcon(item.primaryPlaceType)
                                                        const isBusy = externalBusyId === item.entityKey
                                                        const locationLine = [item.cityName, item.countryName].filter(Boolean).join(', ')
                                                        return (
                                                            <li
                                                                key={item.entityKey}
                                                                className="flex flex-col gap-3 p-3.5 rounded-2xl border border-grey-4/70 bg-white shadow-sm hover:shadow-md transition-shadow">
                                                                {/* Top row: icon + info */}
                                                                <div className="flex items-start gap-2.5">
                                                                    <div className="shrink-0 h-10 w-10 rounded-xl bg-grey-5/70 ring-1 ring-grey-4/60 flex items-center justify-center">
                                                                        <IconComponent className="w-5 h-5 text-grey-2" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1 pt-0.5">
                                                                        <p className="text-[13px] font-semibold text-grey-0 leading-snug line-clamp-2">{item.hotelName || item.name}</p>
                                                                        {locationLine ? <p className="text-[11px] font-medium text-grey-3 mt-0.5">{locationLine}</p> : null}
                                                                    </div>
                                                                </div>
                                                                {/* Action */}
                                                                <div className="mt-auto">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => void prepareExternalAdd(item)}
                                                                        disabled={!!externalBusyId}
                                                                        className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-default text-white text-[12px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-default/90 transition-colors whitespace-nowrap">
                                                                        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}
                                                                        Stay
                                                                    </button>
                                                                </div>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
            <ConfirmRimigoStayModal
                isOpen={confirmRimigoOpen}
                onClose={() => {
                    setConfirmRimigoOpen(false)
                    setPendingSuggestion(null)
                    setPendingBannerImg(null)
                    setPendingAccommodationId(undefined)
                }}
                hotelName={pendingDisplayName || pendingSuggestion?.name || ''}
                subtitle={pendingSuggestion?.fullName}
                bannerImg={pendingBannerImg}
                availableCities={citiesToUse}
                isAdding={isAddingRimigoToCollection}
                onConfirm={(city, startDate, endDate) => void handleConfirmRimigoAdd(city, startDate, endDate)}
                detailHref={pendingSuggestion ? buildStayDetailUrlFromSuggestion(pendingSuggestion) : null}
                initialCheckIn={effectiveCheckIn}
                initialCheckOut={effectiveCheckOut}
            />
            {confirmExternalData && confirmExternalItem && (
                <ConfirmExternalStayModal
                    isOpen={confirmExternalOpen}
                    onClose={() => {
                        setConfirmExternalOpen(false)
                        setConfirmExternalData(null)
                        setConfirmExternalItem(null)
                    }}
                    hotelData={confirmExternalData}
                    autocompleteItem={confirmExternalItem}
                    availableCities={citiesToUse}
                    isAdding={isAddingExternalToCollection}
                    onConfirm={handleConfirmExternalAdd}
                    initialCheckIn={effectiveCheckIn}
                    initialCheckOut={effectiveCheckOut}
                />
            )}
            {pendingAddToDbHotel && pendingAddToDbCity && (
                <AddToDatabaseModal
                    isOpen={isAddToDbModalOpen}
                    onClose={() => setIsAddToDbModalOpen(false)}
                    hotelData={pendingAddToDbHotel}
                    cityId={pendingAddToDbCity.id}
                    cityName={pendingAddToDbCity.name}
                    onSuccess={async () => {
                        setIsAddToDbBusy(true)
                        try {
                            const res = await checkAccommodationExistence(pendingAddToDbHotel.zentrum_hub_id)
                            if (res.is_accommodation_exists) {
                                const row = { exists: true, accommodationId: res.accommodation_id }
                                setRimigoExistenceMap((prev) => ({ ...prev, [pendingAddToDbHotel.zentrum_hub_id]: row }))
                            }
                        } finally {
                            setIsAddToDbBusy(false)
                        }
                    }}
                />
            )}
        </>
    )
}

export default SearchStaysModal
