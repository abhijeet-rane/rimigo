import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Loader2, PlusCircle, Sparkles, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import Typography from '@/components/shared/Typography'
import { searchHotelSuggestions, type HotelSuggestion } from '@/pages/Stays/Services'
import { checkAccommodationExistence, getAccommodationMetadata } from '@/pages/Stays/Apis/accommodationsAPI'
import { getTomorrowDate, getDayAfterTomorrowDate } from '@/utils/dateUtils'
import type { CityOption } from './ConfirmExternalStayModal'
import ConfirmRimigoStayModal from './ConfirmRimigoStayModal'
import { buildStayDetailUrlFromSuggestion } from '../utils/stayDetailUrl'
import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

/** Rimigo mark for catalog rows (same asset as SearchHeader / tripboard). */
const RIMIGO_STAY_LIST_MARK = '/icons/logo-transparent-indigo.png'

/** Hide autosuggest fullName when it only repeats title + location line. */
function isRedundantFullName(name: string, fullName: string | undefined, locationLine: string): boolean {
    if (!fullName?.trim()) return true
    if (fullName.trim() === name.trim()) return true
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
    if (locationLine && norm(fullName) === norm(`${name}, ${locationLine}`)) return true
    return false
}

export type SearchRimigoStaysApi = {
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
}

interface SearchRimigoStaysModalProps {
    isOpen: boolean
    onClose: () => void
    collectionIdentifier?: string
    addStayApi?: SearchRimigoStaysApi
    nextSectionsOrder?: number
    availableCities?: CityOption[]
    countryId?: string
    onSuccess?: () => void
}

const SearchRimigoStaysModal: React.FC<SearchRimigoStaysModalProps> = ({
    isOpen,
    onClose,
    collectionIdentifier,
    addStayApi,
    nextSectionsOrder,
    availableCities = [],
    countryId,
    onSuccess
}) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [results, setResults] = useState<HotelSuggestion[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)

    const [confirmOpen, setConfirmOpen] = useState(false)
    const [pendingSuggestion, setPendingSuggestion] = useState<HotelSuggestion | null>(null)
    const [pendingBannerImg, setPendingBannerImg] = useState<string | null>(null)
    const [pendingDisplayName, setPendingDisplayName] = useState('')
    const [pendingAccommodationId, setPendingAccommodationId] = useState<string | undefined>(undefined)
    const [loadingZentrumId, setLoadingZentrumId] = useState<string | null>(null)
    const [isAddingToCollection, setIsAddingToCollection] = useState(false)

    const confirmDetailHref = useMemo(() => {
        if (!pendingSuggestion) return null
        return buildStayDetailUrlFromSuggestion(pendingSuggestion)
    }, [pendingSuggestion])

    const { data: citiesApiResponse } = useQuery({
        queryKey: ['cities-by-country', countryId, 'rimigo-stays-search'],
        queryFn: async () => {
            if (!countryId) return { results: [] }
            const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/cities/`, {
                params: {
                    country: countryId,
                    is_paginated: false
                }
            })
            return response.data
        },
        enabled: !!countryId && isOpen,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    const allCities = useMemo(() => {
        if (!citiesApiResponse?.results) return []
        return citiesApiResponse.results
            .map((city: { id?: string; city_id?: string; name?: string; city_name?: string }) => ({
                id: city.id || city.city_id || '',
                name: city.name || city.city_name || ''
            }))
            .filter((city: { id: string; name: string }) => city.id && city.name)
    }, [citiesApiResponse])

    const citiesToUse = useMemo(() => {
        if (countryId && allCities.length > 0) {
            return allCities
        }
        return availableCities
    }, [countryId, allCities, availableCities])

    const resetTransient = () => {
        setResults([])
        setHasSearched(false)
        setSearchQuery('')
        setConfirmOpen(false)
        setPendingSuggestion(null)
        setPendingBannerImg(null)
        setPendingDisplayName('')
        setPendingAccommodationId(undefined)
        setLoadingZentrumId(null)
    }

    const handleClose = () => {
        resetTransient()
        onClose()
    }

    const openHotelDetailsInNewTab = (suggestion: HotelSuggestion) => {
        const href = buildStayDetailUrlFromSuggestion(suggestion)
        if (!href) {
            toast.error('Could not open property details.')
            return
        }
        window.open(href, '_blank', 'noopener,noreferrer')
    }

    const handleSearch = async () => {
        const q = searchQuery.trim()
        if (!q) return
        setIsSearching(true)
        setHasSearched(true)
        try {
            const list = await searchHotelSuggestions(q)
            setResults(list)
        } catch (err) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error('[SearchRimigoStaysModal] search failed', err)
            }
            toast.error('Search failed. Please try again.')
            setResults([])
        } finally {
            setIsSearching(false)
        }
    }

    const openConfirmForSuggestion = async (suggestion: HotelSuggestion) => {
        const zentrumHubId = suggestion.referenceId || suggestion.id
        if (!zentrumHubId || !collectionIdentifier || !addStayApi?.addStayToCollection) {
            return
        }
        if (citiesToUse.length === 0) {
            toast.error('No cities available. Ensure this collection has a country, or add stays from the map first.')
            return
        }

        setLoadingZentrumId(zentrumHubId)
        try {
            const existence = await checkAccommodationExistence(zentrumHubId)
            if (!existence.is_accommodation_exists) {
                toast.error("This property is not in Rimigo's stay catalog yet. Use Add External Stays for Kayak listings.")
                return
            }

            let banner: string | null = null
            let displayName = suggestion.name || suggestion.fullName
            try {
                const metaRes = await getAccommodationMetadata({
                    stay_ids: [zentrumHubId],
                    check_in_date: getTomorrowDate(),
                    check_out_date: getDayAfterTomorrowDate()
                })
                const row = metaRes.data?.data?.[0]
                if (row?.banner_img) {
                    banner = row.banner_img
                }
                if (row?.name) {
                    displayName = row.name
                }
            } catch {
                // Metadata is optional for add; proceed with suggestion text only
            }

            setPendingSuggestion(suggestion)
            setPendingBannerImg(banner)
            setPendingDisplayName(displayName)
            setPendingAccommodationId(existence.accommodation_id)
            setConfirmOpen(true)
        } catch (err) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error('[SearchRimigoStaysModal] prepare add failed', err)
            }
            toast.error('Could not verify this stay in Rimigo. Please try again.')
        } finally {
            setLoadingZentrumId(null)
        }
    }

    const handleConfirmAdd = async (selectedCity: CityOption) => {
        const suggestion = pendingSuggestion
        const zentrumHubId = suggestion?.referenceId || suggestion?.id
        const addFn = addStayApi?.addStayToCollection
        if (!collectionIdentifier || !addFn || !zentrumHubId || !suggestion) return

        setIsAddingToCollection(true)
        try {
            const metadata: {
                banner_img?: string
                city_id: string
                city_name: string
                category: string
                accommodation_id?: string
            } = {
                city_id: selectedCity.id,
                city_name: selectedCity.name,
                category: 'hotel'
            }
            if (pendingBannerImg) {
                metadata.banner_img = pendingBannerImg
            }
            if (pendingAccommodationId) {
                metadata.accommodation_id = pendingAccommodationId
            }

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
            setConfirmOpen(false)
            setPendingSuggestion(null)
            setPendingBannerImg(null)
            setPendingAccommodationId(undefined)
            handleClose()
        } catch (err) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error('[SearchRimigoStaysModal] add failed', err)
            }
            toast.error('Failed to add stay to collection. Please try again.')
        } finally {
            setIsAddingToCollection(false)
        }
    }

    return (
        <>
            {createPortal(
                <AnimatePresence>
                    {isOpen ? (
                        <motion.div
                            key="search-rimigo-overlay"
                            role="presentation"
                            className="fixed inset-0 z-500 flex items-center justify-center p-3 sm:p-5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.22 }}>
                            <motion.button
                                type="button"
                                aria-label="Close dialog"
                                className="absolute inset-0 bg-grey-0/50 backdrop-blur-[8px]"
                                onClick={handleClose}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            />
                            <motion.div
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="search-rimigo-stays-title"
                                className="relative w-full max-w-2xl max-h-[min(88vh,720px)] flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.28)] border border-grey-4/50"
                                onClick={(e) => e.stopPropagation()}
                                initial={{ opacity: 0, scale: 0.96, y: 18 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: 12 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
                                <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-grey-4/60 bg-gradient-to-br from-primary-default/[0.06] via-white to-white">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="shrink-0 p-2.5 rounded-xl bg-primary-default/12 text-primary-default">
                                            <Sparkles className="w-5 h-5" aria-hidden />
                                        </div>
                                        <div className="min-w-0">
                                            <Typography
                                                id="search-rimigo-stays-title"
                                                size="20"
                                                weight="semibold"
                                                color="grey-0"
                                                className="font-red-hat-display tracking-tight">
                                                Search Rimigo Stays
                                            </Typography>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="shrink-0 p-2 rounded-xl text-grey-2 hover:text-grey-0 hover:bg-grey-5/90 transition-colors"
                                        aria-label="Close"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex flex-col flex-1 min-h-0 px-5 sm:px-6 py-5 gap-4">
                                    <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                                        <div className="relative flex-1">
                                            <Search
                                                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-2 pointer-events-none"
                                                aria-hidden
                                            />
                                            <input
                                                type="search"
                                                placeholder="Hotel name…"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
                                                className="w-full min-h-11 pl-10 pr-4 py-3 rounded-xl border border-grey-4/90 bg-grey-5/25 text-grey-0 text-[15px] placeholder:text-grey-2 focus:outline-none focus:ring-2 focus:ring-primary-default/30 focus:border-primary-default focus:bg-white transition-all shadow-sm"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => void handleSearch()}
                                            disabled={isSearching || !searchQuery.trim()}
                                            className="shrink-0 min-h-11 px-6 rounded-xl bg-primary-default text-white font-semibold text-sm font-red-hat-display shadow-md shadow-primary-default/25 hover:brightness-[1.03] active:scale-[0.99] transition-all disabled:opacity-45 disabled:shadow-none disabled:pointer-events-none flex items-center justify-center gap-2"
                                        >
                                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                            Search
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 [scrollbar-gutter:stable]">
                                        {!hasSearched ? (
                                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed border-grey-4/80 bg-grey-5/20">
                                                <div className="h-14 w-14 rounded-2xl bg-white ring-1 ring-grey-4/50 flex items-center justify-center p-2 mb-3 shadow-sm">
                                                    <img
                                                        src={RIMIGO_STAY_LIST_MARK}
                                                        alt=""
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <Typography size="15" weight="semibold" color="grey-1" className="font-red-hat-display">
                                                    Rimigo catalog
                                                </Typography>
                                                <Typography size="13" weight="medium" color="grey-2" className="mt-1.5 max-w-[280px] leading-relaxed text-center">
                                                    Zentrum + Rimigo:<br /> search names, tap a row for details, or Add.
                                                </Typography>
                                            </div>
                                        ) : isSearching ? (
                                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                                <Loader2 className="w-9 h-9 animate-spin text-primary-default" />
                                                <Typography size="14" weight="medium" color="grey-2">
                                                    Searching…
                                                </Typography>
                                            </div>
                                        ) : results.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-14 px-4 text-center rounded-2xl bg-grey-5/25 border border-grey-4/60">
                                                <Typography size="15" weight="semibold" color="grey-1">
                                                    No matches
                                                </Typography>
                                                <Typography size="14" weight="medium" color="grey-2" className="mt-2 max-w-xs">
                                                    Try another spelling or a shorter name.
                                                </Typography>
                                            </div>
                                        ) : (
                                            <ul className="flex flex-col gap-2.5 pb-1">
                                                {results.map((item) => {
                                                    const key = item.referenceId || item.id
                                                    const busy = loadingZentrumId === key
                                                    const locationLine = [item.city, item.state, item.country].filter(Boolean).join(', ')
                                                    const showFullName =
                                                        item.fullName &&
                                                        !isRedundantFullName(item.name, item.fullName, locationLine)
                                                    return (
                                                        <li
                                                            key={key}
                                                            className="flex flex-col sm:flex-row sm:items-stretch rounded-2xl border border-grey-4/70 bg-white shadow-sm hover:shadow-md hover:border-primary-default/25 transition-all duration-200 overflow-hidden group"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => openHotelDetailsInNewTab(item)}
                                                                className="flex flex-1 min-w-0 gap-3 p-4 text-left hover:bg-grey-5/[0.45] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-default/35 transition-colors"
                                                            >
                                                                <div
                                                                    className="shrink-0 h-[52px] w-[52px] rounded-xl bg-white ring-1 ring-grey-4/55 flex items-center justify-center p-1.5 shadow-sm"
                                                                    aria-hidden>
                                                                    <img
                                                                        src={RIMIGO_STAY_LIST_MARK}
                                                                        alt=""
                                                                        className="max-h-full max-w-full object-contain"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                                    <Typography
                                                                        size="16"
                                                                        weight="semibold"
                                                                        color="grey-0"
                                                                        className="font-red-hat-display leading-snug group-hover:text-primary-default transition-colors">
                                                                        {item.name}
                                                                    </Typography>
                                                                    {locationLine ? (
                                                                        <Typography size="13" weight="medium" color="grey-2">
                                                                            {locationLine}
                                                                        </Typography>
                                                                    ) : null}
                                                                    {showFullName ? (
                                                                        <Typography size="12" weight="normal" color="grey-3" className="line-clamp-2">
                                                                            {item.fullName}
                                                                        </Typography>
                                                                    ) : null}
                                                                    <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-grey-2 group-hover:text-primary-default transition-colors">
                                                                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden />
                                                                        Open in new tab
                                                                    </span>
                                                                </div>
                                                            </button>
                                                            {collectionIdentifier && addStayApi?.addStayToCollection ? (
                                                                <div className="flex sm:flex-col justify-center sm:justify-center px-3 py-3 sm:py-4 sm:px-4 sm:border-l border-grey-4/60 bg-grey-5/[0.35] sm:min-w-[132px]">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => void openConfirmForSuggestion(item)}
                                                                        disabled={!!loadingZentrumId}
                                                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-default text-white text-sm font-semibold font-red-hat-display shadow-md shadow-primary-default/20 hover:brightness-[1.05] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
                                                                    >
                                                                        {busy ? (
                                                                            <>
                                                                                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                                                                <span>Wait…</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <PlusCircle className="w-4 h-4 shrink-0" />
                                                                                <span>Add</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            ) : null}
                                                        </li>
                                                    )
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>,
                document.body
            )}
            <ConfirmRimigoStayModal
                isOpen={confirmOpen}
                onClose={() => {
                    setConfirmOpen(false)
                    setPendingSuggestion(null)
                    setPendingBannerImg(null)
                    setPendingAccommodationId(undefined)
                }}
                hotelName={pendingDisplayName || pendingSuggestion?.name || ''}
                subtitle={pendingSuggestion?.fullName}
                bannerImg={pendingBannerImg}
                availableCities={citiesToUse}
                isAdding={isAddingToCollection}
                onConfirm={(city) => void handleConfirmAdd(city)}
                detailHref={confirmDetailHref}
            />
        </>
    )
}

export default SearchRimigoStaysModal
