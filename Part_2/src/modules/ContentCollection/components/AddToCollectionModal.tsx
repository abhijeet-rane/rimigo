import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { travelerCollectionApi } from '../api/travelerCollectionApi'
import apiClient from '@/lib/api/apiClient'
import type { ContentCollection } from '../types/contentCollection'
import { toast } from 'sonner'
import clsx from 'clsx'
import { Plus, X, ExternalLink, Search, ListChecks, Heart, Check } from 'lucide-react'
import CreateCollectionModal from './CreateCollectionModal'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { getLiveCountries } from '@/api/curation/locationPersonalizationAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { TRIP_ROLE_CO_TRAVELER, TRIP_ROLE_INVITED } from '@/constants/userConfig'
import { COMPASS_LOGO_PURPLE_TRANSPARENT_BG } from '@/constants/rimigo'

import { useUserInfo } from '@/hooks/useUserInfo'
import { updateAccommodationVerification } from '@/pages/Stays/Apis/accommodationsAPI'
import { PLATFORM_ICONS } from '@/constants/icons/platformIcons'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'

interface FlightDataForCollection {
    reference_id: string
    title: string
    metadata: {
        reference_id: string
        segments: Array<{
            airline: { code: string; name: string; flight_number: string }
            origin: { airport_code: string; airport_name: string; city_code: string; city_name: string; departure_time: string }
            destination: { airport_code: string; airport_name: string; city_code: string; city_name: string; arrival_time: string }
            duration: { minutes: number; formatted: string }
        }>
        total_price: string
        stop_count: number
        total_duration: number
        formatted_duration: string
        departure_date: string
        return_date: string | null
        is_refundable: boolean
        journey_type: number
        best_offer?: {
            provider: string
            price: number
            currency?: string
            affiliate_url?: string | null
            provider_logo_url?: string | null
        }
        search_params: {
            origin: string[]
            destination: string[]
            departure_date: string[]
            return_date: string[] | null
            adult_count: number
            child_count: number
            infant_count: number
            cabin_class: number
            journey_type: number
        }
    }
}

interface AddToCollectionModalProps {
    isOpen: boolean
    onClose: () => void
    experienceId: string // For stays, this should be zentrum_hub_id (used as entity_id)
    experienceName: string
    onSuccess?: (verificationUpdate?: { is_verified?: boolean; is_b2b_deal_available?: boolean }) => void
    entityType?: 'experience' | 'stays' | 'flights' // Optional: defaults to 'experience'
    stayImageUrl?: string // Optional: for stays, the banner image URL
    zentrumHubId?: string // Optional: for stays, the zentrum hub ID (deprecated - use experienceId instead)
    locationTag?: string | React.ReactNode // Optional: for stays, the location tag (string or JSX)
    cityId?: string // Optional: for stays, the city ID
    cityName?: string // Optional: for stays, the city name
    category?: string | null // Optional: for stays, the category
    accommodationId?: string // Optional: for stays, the accommodation ID (to be included in metadata)
    checkIn?: string // Optional: for stays, the check-in date (start_date)
    checkOut?: string // Optional: for stays, the check-out date (end_date)
    flightData?: FlightDataForCollection // Optional: for flights, the full flight data
    isVerified?: boolean
    isB2bDealAvailable?: boolean
}

const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
    isOpen,
    onClose,
    experienceId,
    experienceName,
    onSuccess,
    entityType = 'experience',
    stayImageUrl,
    zentrumHubId,
    locationTag,
    cityId,
    cityName,
    category,
    accommodationId,
    checkIn,
    checkOut,
    flightData,
    isVerified = false,
    isB2bDealAvailable = false
}) => {
    const [searchParams] = useSearchParams()
    const queryClient = useQueryClient()
    const { trackButtonClickCustom } = usePostHog()
    const countryIdFromUrl = searchParams.get('country_id') || ''
    const [selectedCollection, setSelectedCollection] = useState<ContentCollection | null>(null)
    const [isAdding, setIsAdding] = useState(false)
    const [isCreateCollectionModalOpen, setIsCreateCollectionModalOpen] = useState(false)
    const [allowMultiDestination, setAllowMultiDestination] = useState(false)
    const [countrySearchQuery, setCountrySearchQuery] = useState<string>('')
    const [selectedCountryId, setSelectedCountryId] = useState<string>(countryIdFromUrl)
    const [collectionType, setCollectionType] = useState<'content' | 'traveler'>('content')
    const DEFAULT_COLLECTION_IMAGE = COMPASS_LOGO_PURPLE_TRANSPARENT_BG
    const { user, isRimigoInternal } = useUserInfo()
    const [verifiedToggle, setVerifiedToggle] = useState(true)
    const [airbnbToggle, setAirbnbToggle] = useState(false)

    // Determine effective countryId - if allowMultiDestination is true, use empty string to remove filter
    // Otherwise use selectedCountryId (which defaults to countryIdFromUrl)
    const countryId = allowMultiDestination ? '' : selectedCountryId

    // Get active trip ID from context
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTripId = travelerTripsContext?.activeTrip?.trip_id ?? null

    const activeTrip = travelerTripsContext?.activeTrip
    const role = activeTrip?.role
    const isInvitedOrCoTraveler = role === TRIP_ROLE_INVITED || role === TRIP_ROLE_CO_TRAVELER
    const collectionsTravelerId = isInvitedOrCoTraveler ? activeTrip?.owner_id : user?.id

    // Fetch collections by country_id (or all collections if allowMultiDestination is true)
    const {
        data: collectionsResponse,
        isLoading: isContentLoading,
        isError: isContentError
    } = useQuery({
        queryKey: ['content-collections-by-country', countryId, activeTripId, allowMultiDestination],
        queryFn: async () => {
            // If allowMultiDestination is true, fetch collections with country_name=multidestination
            if (allowMultiDestination) {
                // Fetch collections with country_name=multidestination
                const url = `/api/content-collections/?country_name=multidestination&trip_details=true&list_name=true`
                const response = await apiClient.get(url)

                // Handle different API response structures
                if (response.data && response.data.data && Array.isArray(response.data.data)) {
                    return { data: response.data.data }
                }
                if (Array.isArray(response.data)) {
                    return { data: response.data }
                }
                return { data: [] }
            }

            // Otherwise, fetch by country_id as before
            if (!countryId) {
                throw new Error('Country ID is required')
            }
            return await contentCollectionApi.getByCountryId(countryId, undefined, true)
        },
        enabled: isOpen && collectionType === 'content' && (!!countryId || allowMultiDestination)
    })

    // For non-rimigo-internal users, also filter by trip_id
    // For invited travelers, activeTripId is already the owner's trip
    const collectionsTripId = !isRimigoInternal ? activeTripId : undefined

    // Fetch traveler collections (separate API: list_name=true&is_invited=true)
    const {
        data: travelerCollectionsResponse,
        isLoading: isTravelerLoading,
        isError: isTravelerError
    } = useQuery({
        queryKey: ['traveler-collections-for-list', collectionsTravelerId, collectionsTripId],
        queryFn: () => travelerCollectionApi.getTravelerCollectionsForList(collectionsTravelerId, collectionsTripId ?? undefined),
        enabled: isOpen && collectionType === 'traveler'
    })

    const contentCollections = collectionsResponse?.data || []
    const travelerCollections = travelerCollectionsResponse?.data || []
    const collections = collectionType === 'traveler' ? travelerCollections : contentCollections
    const isLoading = collectionType === 'traveler' ? isTravelerLoading : isContentLoading
    const isError = collectionType === 'traveler' ? isTravelerError : isContentError

    // Fetch all live countries for country search
    const { data: allLiveCountries } = useQuery({
        queryKey: ['live-countries'],
        queryFn: async () => {
            const results = await getLiveCountries()
            return results.map((c) => ({
                id: c.country_id,
                name: c.country_name,
                icon_url: c.icon_url || null
            }))
        },
        enabled: isOpen,
        staleTime: HOURS_24
    })

    // Filter live countries based on search query
    const searchedCountries = useMemo(() => {
        if (!allLiveCountries || !countrySearchQuery.trim()) return []
        const query = countrySearchQuery.toLowerCase()
        return allLiveCountries.filter((c) => c.name.toLowerCase().includes(query)).slice(0, 20) // Limit to 20 results
    }, [allLiveCountries, countrySearchQuery])

    // Default to traveler collection tab for non-rimigo_internal users (they only see traveler collections)
    // For rimigo_internal users, they can switch between tabs
    useEffect(() => {
        if (isOpen && !isRimigoInternal) {
            setCollectionType('traveler')
        }
    }, [isOpen, isRimigoInternal])

    // Sync selectedCountryId when countryIdFromUrl changes
    useEffect(() => {
        if (countryIdFromUrl && countryIdFromUrl !== selectedCountryId) {
            setSelectedCountryId(countryIdFromUrl)
        }
    }, [countryIdFromUrl])

    const handleCollectionSelect = async (collection: ContentCollection) => {
        if (isAdding) return // Prevent duplicate clicks

        trackButtonClickCustom?.({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'add_to_collection_select',
            buttonAction: 'click',
            extra: { collection_id: collection.id, entity_type: entityType }
        })
        setSelectedCollection(collection)
        setIsAdding(true)

        try {
            // Calculate sections_order - use the next order number after existing sections
            const existingSections = collection.sections || []
            const maxOrder = existingSections.reduce((max, section) => {
                const order = section.sections_order ?? 0
                return Math.max(max, order)
            }, 0)
            const nextOrder = maxOrder + 1

            const api = collectionType === 'traveler' ? travelerCollectionApi : contentCollectionApi

            if (entityType === 'flights' && flightData) {
                // Flights always go to traveler collections
                await travelerCollectionApi.addFlightToCollection(
                    collection.identifier!,
                    flightData,
                    nextOrder
                )
                toast.success(`Flight added to "${collection.name}"`)
            } else if (entityType === 'stays') {
                // If internal user has verified toggle ON, update accommodation first
                const effectiveVerified = isRimigoInternal && verifiedToggle
                if (accommodationId && (effectiveVerified || airbnbToggle)) {
                    await updateAccommodationVerification(accommodationId, {
                        ...(effectiveVerified ? { is_verified: true } : {}),
                        ...(airbnbToggle ? { is_available_on_airbnb: true } : {}),
                    })
                }
                const stayMetadata: {
                    banner_img?: string
                    zentrum_hub_id?: string
                    location_tag?: string
                    city_id?: string
                    city_name?: string
                    category?: string
                    accommodation_id?: string
                    start_date?: string
                    end_date?: string
                    is_verified?: boolean
                    is_b2b_deal_available?: boolean
                } = {}
                if (stayImageUrl) {
                    stayMetadata.banner_img = stayImageUrl
                }
                if (zentrumHubId) {
                    stayMetadata.zentrum_hub_id = zentrumHubId
                }
                // Only persist locationTag to backend metadata when it's a
                // plain string — the prop accepts ReactNode to support rich
                // in-card rendering (e.g. distance link), but those nodes
                // can't be serialized onto a stored section.
                if (locationTag && typeof locationTag === 'string') {
                    stayMetadata.location_tag = locationTag
                }
                if (cityId) {
                    stayMetadata.city_id = cityId
                }
                if (cityName) {
                    stayMetadata.city_name = cityName
                }
                if (category) {
                    stayMetadata.category = category
                }
                if (accommodationId && accommodationId !== experienceId) {
                    stayMetadata.accommodation_id = accommodationId
                }
                if (checkIn) {
                    stayMetadata.start_date = checkIn
                }
                if (checkOut) {
                    stayMetadata.end_date = checkOut
                }
                stayMetadata.is_verified = effectiveVerified || isVerified
                stayMetadata.is_b2b_deal_available = isRimigoInternal ? isB2bDealAvailable : false

                await api.addStayToCollection(
                    collection.identifier!,
                    zentrumHubId || experienceId,
                    experienceName,
                    undefined,
                    nextOrder,
                    Object.keys(stayMetadata).length > 0 ? stayMetadata : undefined
                )
                toast.success(`Added "${experienceName}" to "${collection.name}"`)
            } else {
                const slimMetadata: { start_date?: string; end_date?: string } = {}
                if (checkIn) slimMetadata.start_date = checkIn
                if (checkOut) slimMetadata.end_date = checkOut
                await api.addExperienceToCollection(
                    collection.identifier!,
                    experienceId,
                    experienceName,
                    undefined,
                    nextOrder,
                    Object.keys(slimMetadata).length > 0 ? slimMetadata : undefined
                )
                toast.success(`Added "${experienceName}" to "${collection.name}"`)
            }

            if (collectionType === 'traveler') {
                await queryClient.invalidateQueries({ queryKey: ['traveler-collections-for-list'] })
            }
            onSuccess?.(entityType === 'stays' ? { is_verified: (isRimigoInternal && verifiedToggle) || isVerified, is_b2b_deal_available: isB2bDealAvailable } : undefined)
            onClose()
            setSelectedCollection(null)
        } catch (error) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error(`Failed to add ${entityType} to collection:`, error)
            }
            toast.error(`Failed to add ${entityType} to collection. Please try again.`)
        } finally {
            setIsAdding(false)
        }
    }

    const handleCreateCollection = () => {
        trackButtonClickCustom?.({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'add_to_collection_create_new',
            buttonAction: 'click'
        })
        setIsCreateCollectionModalOpen(true)
    }

    const handleCollectionCreated = async (collectionIdentifier: string) => {
        // Refresh collections list
        await queryClient.invalidateQueries({ queryKey: ['content-collections-by-country', countryId, activeTripId, allowMultiDestination] })

        // Close create modal and keep add to collection modal open
        setIsCreateCollectionModalOpen(false)

        // Fetch the newly created collection and add experience to it
        try {
            const collectionResponse = await contentCollectionApi.getByIdentifier(collectionIdentifier)
            const newCollection = collectionResponse.data

            // Automatically add experience to the newly created collection
            await handleCollectionSelect(newCollection)
        } catch (error) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error('Failed to fetch new collection:', error)
            }
            toast.error('Collection created but failed to add experience. Please try adding it manually.')
        }
    }

    // Get collection image - prefer icon_url, then cover_image, otherwise show a default placeholder
    const getCollectionImage = (collection: ContentCollection): string => {
        if (collection.icon_url) {
            return collection.icon_url
        }
        if (collection.cover_image) {
            return collection.cover_image
        }
        return DEFAULT_COLLECTION_IMAGE
    }

    // Format collection description
    const getCollectionDescription = (collection: ContentCollection): string => {
        if (collection.description) {
            return collection.description
        }
        // Format from context if available
        const countryIds = collection.context?.country_id
        if (countryIds) {
            if (Array.isArray(countryIds) && countryIds.length > 0) {
                return `${countryIds.length} country${countryIds.length > 1 ? 's' : ''}`
            } else if (typeof countryIds === 'string') {
                return '1 country'
            }
        }
        return 'Collection'
    }

    if (!isOpen) {
        return (
            <>
                <CreateCollectionModal
                    isOpen={isCreateCollectionModalOpen}
                    onClose={() => setIsCreateCollectionModalOpen(false)}
                    experienceId={experienceId}
                    experienceName={experienceName}
                    onSuccess={handleCollectionCreated}
                />
            </>
        )
    }

    return (
        <>
            {createPortal(
                <div className="fixed inset-0 z-50">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={onClose}
                    />

                    {/* Centered modal */}
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div
                            className="flex h-[640px] max-h-[90vh] flex-col rounded-2xl bg-white shadow-2xl overflow-hidden w-full max-w-lg"
                            onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="px-6 pt-6 pb-4 flex flex-col gap-3 border-b border-grey-4">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-xl font-semibold font-red-hat-display">
                                        {!isRimigoInternal ? 'Add to Trip' : collectionType === 'traveler' ? 'Add to Trip' : 'Add to Collection'}
                                    </h2>
                                    <button
                                        onClick={onClose}
                                        className="w-9 h-9 rounded-full cursor-pointer border border-grey-4 hover:border-grey-2 hover:bg-grey-5 flex items-center justify-center transition-colors shrink-0"
                                        aria-label="Close">
                                        <X className="w-4 h-4 text-grey-1" />
                                    </button>
                                </div>
                                <div className="flex flex-col items-start gap-3 flex-wrap">
                                    {/* Tabs: Collection | Traveler Collection - only visible for rimigo_internal users */}
                                    {isRimigoInternal && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    trackButtonClickCustom?.({
                                                        buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                                        buttonName: 'add_to_collection_tab_switch',
                                                        buttonAction: 'click',
                                                        extra: { tab: 'content' }
                                                    })
                                                    setCollectionType('content')
                                                }}
                                                className={clsx(
                                                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold font-red-hat-display transition-all',
                                                    collectionType === 'content'
                                                        ? 'bg-grey-0 text-white border border-grey-0 shadow-sm'
                                                        : 'bg-white text-grey-0 border border-grey-4 hover:border-grey-2'
                                                )}>
                                                <ListChecks className="w-3.5 h-3.5 shrink-0" />
                                                Public Tripboards
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    trackButtonClickCustom?.({
                                                        buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                                        buttonName: 'add_to_collection_tab_switch',
                                                        buttonAction: 'click',
                                                        extra: { tab: 'traveler' }
                                                    })
                                                    setCollectionType('traveler')
                                                }}
                                                className={clsx(
                                                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold font-red-hat-display transition-all',
                                                    collectionType === 'traveler'
                                                        ? 'bg-grey-0 text-white border border-grey-0 shadow-sm'
                                                        : 'bg-white text-grey-0 border border-grey-4 hover:border-grey-2'
                                                )}>
                                                <Heart className="w-3.5 h-3.5 shrink-0" />
                                                Trips
                                            </button>
                                        </div>
                                    )}
                                    {/* Verified + Airbnb selector chips — internal only.
                                        Rendered as proper checkbox-style toggles: a square
                                        check-indicator sits inside each pill so the
                                        on/off affordance reads as a checkbox. */}
                                    {isRimigoInternal && entityType === 'stays' && accommodationId && (
                                        <div className="flex gap-2 flex-wrap">
                                            {(() => {
                                                const verifiedChecked = verifiedToggle || isVerified
                                                return (
                                                    <button
                                                        type="button"
                                                        role="checkbox"
                                                        aria-checked={verifiedChecked}
                                                        disabled={isVerified}
                                                        onClick={() => !isVerified && setVerifiedToggle(v => !v)}
                                                        className={clsx(
                                                            'flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border-2 text-[13px] font-semibold font-red-hat-display transition-all duration-200 select-none',
                                                            verifiedChecked
                                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                                : 'border-grey-4 bg-white text-grey-1 hover:border-emerald-400 hover:text-emerald-600',
                                                            isVerified ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                                        )}
                                                    >
                                                        <span
                                                            aria-hidden
                                                            className={clsx(
                                                                'inline-flex items-center justify-center w-4 h-4 rounded-[4px] border-2 transition-all shrink-0',
                                                                verifiedChecked
                                                                    ? 'bg-emerald-500 border-emerald-500'
                                                                    : 'bg-grey-5 border-grey-1'
                                                            )}
                                                        >
                                                            {verifiedChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                                        </span>
                                                        Verified
                                                    </button>
                                                )
                                            })()}

                                            <button
                                                type="button"
                                                role="checkbox"
                                                aria-checked={airbnbToggle}
                                                onClick={() => setAirbnbToggle(v => !v)}
                                                className={clsx(
                                                    'flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border-2 text-[13px] font-semibold font-red-hat-display transition-all duration-200 select-none cursor-pointer',
                                                    airbnbToggle
                                                        ? 'border-[#FF385C] bg-[#FF385C]/5 text-[#FF385C]'
                                                        : 'border-grey-4 bg-white text-grey-1 hover:border-[#FF385C] hover:text-[#FF385C]'
                                                )}
                                            >
                                                <span
                                                    aria-hidden
                                                    className={clsx(
                                                        'inline-flex items-center justify-center w-4 h-4 rounded-[4px] border-2 transition-all shrink-0',
                                                        airbnbToggle
                                                            ? 'bg-[#FF385C] border-[#FF385C]'
                                                            : 'bg-grey-5 border-grey-1'
                                                    )}
                                                >
                                                    {airbnbToggle && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                                </span>
                                                <img
                                                    src={PLATFORM_ICONS.AIRBNB}
                                                    alt=""
                                                    className="w-4 h-4 shrink-0"
                                                />
                                                Available on Airbnb
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Country Filter — only for the Public Tripboards tab.
                                The block lives outside the conditional `!allowMultiDestination`
                                gate so the modal height stays stable when the toggle flips. */}
                            {collectionType === 'content' && (
                                <div className="px-6 pt-4 pb-3 border-b border-grey-4 relative">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <label className="text-[12px] font-semibold text-grey-1 uppercase tracking-wider font-red-hat-display">
                                            Filter by country
                                        </label>
                                        {/* Multi-destination toggle moved here from the header.
                                            Sits inline with the section label as a compact pill toggle. */}
                                        {(entityType === 'stays' || entityType === 'experience') && (
                                            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={allowMultiDestination}
                                                    onChange={(e) => {
                                                        setAllowMultiDestination(e.target.checked)
                                                        if (e.target.checked) {
                                                            setCountrySearchQuery('')
                                                        }
                                                    }}
                                                    className="w-3.5 h-3.5 rounded-md border-grey-4 text-primary-default focus:ring-primary-default focus:ring-2"
                                                />
                                                <span className="text-[12px] font-medium font-manrope text-grey-1 whitespace-nowrap">Multi-destination only</span>
                                            </label>
                                        )}
                                    </div>
                                    {/* Search input — disabled (and visually muted) when multi-destination
                                        mode is on, so it occupies the same vertical space either way. */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-2" />
                                        <input
                                            type="text"
                                            placeholder={allowMultiDestination ? 'Showing all multi-destination boards' : 'Search countries…'}
                                            value={countrySearchQuery}
                                            onChange={(e) => setCountrySearchQuery(e.target.value)}
                                            disabled={allowMultiDestination}
                                            className={clsx(
                                                'w-full pl-10 pr-4 py-2.5 border border-grey-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-default text-sm font-manrope placeholder:text-grey-3',
                                                allowMultiDestination && 'bg-grey-5 cursor-not-allowed opacity-70'
                                            )}
                                        />
                                        {/* Selected country chip — small inline chip inside the input row */}
                                        {!allowMultiDestination && selectedCountryId && allLiveCountries && (() => {
                                            const selectedCountry = allLiveCountries.find((c) => c.id === selectedCountryId)
                                            if (!selectedCountry) return null
                                            return (
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                    <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full border border-primary-default/40 bg-primary-default/5 text-primary-default text-[11px] font-semibold font-red-hat-display">
                                                        {selectedCountry.icon_url && (
                                                            <img
                                                                src={selectedCountry.icon_url}
                                                                alt=""
                                                                className="w-3.5 h-3.5 object-contain shrink-0"
                                                            />
                                                        )}
                                                        <span className="truncate max-w-[100px]">{selectedCountry.name}</span>
                                                    </span>
                                                </div>
                                            )
                                        })()}
                                        {!allowMultiDestination && countrySearchQuery.trim() && searchedCountries && searchedCountries.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1.5 max-h-56 overflow-y-auto border border-grey-4 rounded-xl bg-white shadow-lg divide-y divide-grey-4">
                                                {searchedCountries.map((country: { id: string; name: string; icon_url: string | null }) => (
                                                    <button
                                                        key={country.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedCountryId(country.id)
                                                            setCountrySearchQuery('')
                                                        }}
                                                        className="flex items-center gap-3 p-3 w-full text-left hover:bg-grey-5 transition-colors">
                                                        {country.icon_url && (
                                                            <img
                                                                src={country.icon_url}
                                                                alt={country.name}
                                                                className="w-7 h-7 object-contain"
                                                            />
                                                        )}
                                                        <span className="text-sm font-medium text-grey-0 font-manrope">{country.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-6">
                                {collectionType === 'content' && !countryId && !allowMultiDestination ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p>Country ID is required to load collections.</p>
                                        <p className="text-sm mt-2">Please navigate to a page with country_id in the URL.</p>
                                    </div>
                                ) : isLoading ? (
                                    <div className="space-y-2.5 mt-4" aria-busy="true" aria-live="polite">
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl border border-grey-4 bg-white"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-grey-4/70 animate-pulse shrink-0" />
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <div className="h-3.5 w-2/3 rounded-full bg-grey-4/70 animate-pulse" />
                                                    <div className="h-3 w-1/3 rounded-full bg-grey-4/50 animate-pulse" />
                                                </div>
                                                <div className="w-20 h-8 rounded-full bg-grey-4/60 animate-pulse shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                ) : isError ? (
                                    <div className="text-center py-8 text-destructive">
                                        <p>Failed to load collections.</p>
                                        <p className="text-sm mt-2">Please try again later.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5 mt-4">
                                        {collections.map((collection: ContentCollection) => {
                                            const collectionImage = getCollectionImage(collection)
                                            const collectionDescription = getCollectionDescription(collection)
                                            const isSelected = selectedCollection?.id === collection.id

                                            // For traveler-collection rows the trip name is the
                                            // primary label; we deliberately don't show the
                                            // tripboard's own collection `name` anymore.
                                            const primaryLabel = collectionType === 'traveler'
                                                ? (collection.trip_name || 'Untitled trip')
                                                : collection.name

                                            // Country count for the secondary line, computed
                                            // from the collection's `context.country_id` array.
                                            const countryIds = collection.context?.country_id
                                            const countryCount = Array.isArray(countryIds)
                                                ? countryIds.length
                                                : (typeof countryIds === 'string' && countryIds ? 1 : 0)
                                            const secondaryLabel = collectionType === 'traveler'
                                                ? (countryCount > 0
                                                    ? `${countryCount} ${countryCount === 1 ? 'country' : 'countries'}`
                                                    : null)
                                                : (isRimigoInternal ? collectionDescription : null)

                                            const openTripboard = (e: React.MouseEvent) => {
                                                e.stopPropagation()
                                                if (collection.trip_id) {
                                                    window.open(`/tripboard/${collection.trip_id}/`, '_blank', 'noopener,noreferrer')
                                                }
                                            }

                                            return (
                                                <div
                                                    key={collection.id}
                                                    role={collection.trip_id ? 'link' : undefined}
                                                    tabIndex={collection.trip_id ? 0 : undefined}
                                                    onClick={collection.trip_id ? openTripboard : undefined}
                                                    onKeyDown={(e) => {
                                                        if (collection.trip_id && (e.key === 'Enter' || e.key === ' ')) {
                                                            e.preventDefault()
                                                            window.open(`/tripboard/${collection.trip_id}/`, '_blank', 'noopener,noreferrer')
                                                        }
                                                    }}
                                                    className={clsx(
                                                        'group w-full flex items-center gap-3 p-3 rounded-xl border border-grey-4 bg-white transition-all duration-150',
                                                        collection.trip_id
                                                            ? 'cursor-pointer hover:border-primary-default hover:bg-primary-default/5 hover:shadow-sm'
                                                            : 'hover:border-grey-2'
                                                    )}>
                                                    {/* Thumbnail */}
                                                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-grey-5">
                                                        <img
                                                            src={collectionImage}
                                                            alt={primaryLabel}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-[15px] leading-tight truncate font-red-hat-display text-grey-0">{primaryLabel}</div>
                                                        {secondaryLabel && (
                                                            <div className="text-xs font-medium text-grey-2 mt-1 truncate font-manrope">{secondaryLabel}</div>
                                                        )}
                                                        {isAdding && isSelected && <div className="text-xs font-medium text-primary-default mt-1.5">Adding…</div>}
                                                    </div>

                                                    {/* Navigate icon — keeps the affordance discoverable */}
                                                    {collection.trip_id && (
                                                        <button
                                                            onClick={openTripboard}
                                                            disabled={isAdding}
                                                            className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-full border border-grey-4 bg-white hover:border-primary-default hover:text-primary-default transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                            title="Open tripboard"
                                                            aria-label="Open tripboard">
                                                            <ExternalLink className="w-3.5 h-3.5 text-grey-2 group-hover:text-primary-default" />
                                                        </button>
                                                    )}

                                                    {/* Add Button */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCollectionSelect(collection) }}
                                                        disabled={isAdding}
                                                        className="shrink-0 inline-flex items-center gap-1 px-3.5 py-1.5 text-[13px] font-semibold font-red-hat-display text-primary-default border border-primary-default rounded-full cursor-pointer hover:bg-primary-default hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                                        <Plus className="w-3.5 h-3.5" />
                                                        Add
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Create New Collection Button - only for content collections */}
                                {collectionType === 'content' && (
                                    <div className="mt-5 pt-4 border-t border-grey-4">
                                        <button
                                            onClick={handleCreateCollection}
                                            disabled={isAdding}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-grey-3 hover:border-primary-default hover:bg-primary-default/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                                            <div className="w-10 h-10 rounded-full bg-grey-0 flex items-center justify-center shrink-0">
                                                <Plus className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="font-semibold font-red-hat-display text-[15px] text-grey-0">Create a collection</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Create Collection Modal */}
            <CreateCollectionModal
                isOpen={isCreateCollectionModalOpen}
                onClose={() => setIsCreateCollectionModalOpen(false)}
                experienceId={experienceId}
                experienceName={experienceName}
                onSuccess={handleCollectionCreated}
            />
        </>
    )
}

export default AddToCollectionModal
