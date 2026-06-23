import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { BadgeCheck, ChevronDown, MapPin, MoveRight, Settings, Zap } from 'lucide-react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { getFacilityIcon } from './components/IconMap'
import apiClient from '@/lib/api/apiClient'
import SearchHeader, { type SearchParams } from '@/components/common/SearchHeader'
// ProgressStepsLoader no longer used - page renders progressively with skeletons
import { ForYouSection, PricingSidebar, type PricingSidebarRef, AmenitiesSection, ReviewsHighlightsSection, FloatingQuestions } from './components'
import PhotoGallery from './components/PhotoGallery'
import { HotelDetailData } from '@/types/hotelDetailTypes'
// import { useAccommodationDeal } from './hooks/useAccommodationDeal'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { getAgentBySpace } from '@/api/ataAPI/ataApi'
import { triggerAssistantPrompt } from '@/pages/Stays/Components/assistantController'
import { toast } from 'sonner'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import LogoLoadingScreen from '@/components/shared/LogoLoadingScreen'
import ReactHelmet from '@/components/shared/React-Helmet/ReactHelmet'
import { getShortlistedByTrip } from '../Apis/shortlistAPI'
import { useLocationPersonalizationCity } from './hooks/locationPresonalizationCityHook'
import ViewGalleryButton from '@/modules/Experiences/components/ExperienceDetails/components/ViewGalleryButton'
import { DealSection } from './components/DealsSection'
import { useAccommodationDeal, useAccommodationDealResult } from './hooks/useAccommodationDeal'
import MobileCompleteHeaderWithSearch from '@/components/MobileCompleteHeaderWithSearch'
import { useUserInfo } from '@/hooks/useUserInfo'
import { useStayCardBadges } from '../config/stayCardVisibility'
import { VerifiedBadge } from '../Components/VerifiedBadge'
import { AirbnbBadge } from '../Components/AirbnbBadge'
import { PLATFORM_ICONS } from '@/constants/icons/platformIcons'
// import { USER_TYPE_RIMIGO_INTERNAL } from '@/constants/userConfig'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
// import { USER_TYPE_RIMIGO_INTERNAL } from '@/constants/userConfig'
import AddToCollectionButton from '@/components/common/AddToCollectionButton'
import AddToCollectionModal from '@/modules/ContentCollection/components/AddToCollectionModal'
import { useCountryIdFromCity } from './hooks/useCountryIdFromCity'
import { decodeOccupancies, encodeOccupancies } from '@/types/occupancy'
import { getCityByName } from '../Apis/citiesAPI'
import { useIsMobile } from '@/hooks/use-mobile'
import AddToDatabaseModal from '@/components/Addtodatabasemodal'
import { checkAccommodationExistence, updateAccommodationVerification } from '@/pages/Stays/Apis/accommodationsAPI'

interface HotelDetailPageProps {
    /** Optional override so the page can be driven from a different route (e.g.
     *  the public `/hotel/:slug`) where `useParams().hotelId` is undefined but
     *  the parent knows the `zentrum_hub_id` from a separate lookup. When set,
     *  takes precedence over the URL param. */
    hotelIdOverride?: string
}

const HotelDetailPage: React.FC<HotelDetailPageProps> = ({ hotelIdOverride }) => {
    const { hotelId: hotelIdFromParams } = useParams<{ hotelId: string }>()
    const hotelId = hotelIdOverride ?? hotelIdFromParams
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()

    const [hotelData, setHotelData] = useState<HotelDetailData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'forYou' | 'amenities' | 'reviews' | 'deals'>('forYou')
    const [isGalleryOpen, setIsGalleryOpen] = useState(false)
    const tabsRef = useRef<HTMLDivElement | null>(null)
    const [underlineStyle, setUnderlineStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 })
    const [nearbyTab, setNearbyTab] = useState<string>('')
    const [nearbySelectedIdx, setNearbySelectedIdx] = useState<number>(0)
    const [rimigoTop5, setRimigoTop5] = useState<any[]>([])
    const isMobile = useIsMobile()
    const [isAddToDatabaseModalOpen, setIsAddToDatabaseModalOpen] = useState(false)
    const [isVerificationDropdownOpen, setIsVerificationDropdownOpen] = useState(false)
    const verificationDropdownRef = useRef<HTMLDivElement>(null)
    const [localIsVerified, setLocalIsVerified] = useState<boolean | null>(null)
    const [localIsB2bDealAvailable, setLocalIsB2bDealAvailable] = useState<boolean | null>(null)
    const [localIsAvailableOnAirbnb, setLocalIsAvailableOnAirbnb] = useState<boolean | null>(null)
    const [isUpdatingVerification, setIsUpdatingVerification] = useState(false)
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)

    const activeTabRef = useRef(activeTab)
    const pricingSidebarRef = useRef<PricingSidebarRef>(null)
    const pricingSidebarMobileRef = useRef<PricingSidebarRef>(null)
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    // Header state for SearchHeader component

    // Affiliate link state (Agoda preferred)
    const [affiliateAgodaUrl] = useState<string | null>(null)

    const [isShortlisted, setIsShortlisted] = useState(false)
    const sliderRef = useRef<HTMLDivElement>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const hotelName = searchParams.get('hotel_name') || ''
    const zentrumHubId = searchParams.get('zentrum_hub_id') || ''
    const accommodationIdParam = searchParams.get('accommodation_id') || ''
    const cityId = searchParams.get('city_id') || ''
    const cityName = searchParams.get('city_name') || ''
    const checkIn = searchParams.get('check_in') || ''
    const checkOut = searchParams.get('check_out') || ''
    const travelPurpose = searchParams.get('travel_purpose') || ''
    const groupType = searchParams.get('group_type') || ''
    const preferencesString = searchParams.get('city_prefs') || ''
    const preferences = preferencesString ? preferencesString.split(',') : []
    const reviewType = searchParams.get('review_type') || ''
    const occupanciesParam = searchParams.get('occupancies')
    const initialOccupancies = useMemo(
        () => (occupanciesParam ? decodeOccupancies(occupanciesParam) : undefined),
        [occupanciesParam]
    )
    const rooms = initialOccupancies?.length ?? (parseInt(searchParams.get('rooms') || '1', 10) || 1)
    const ATA_AGENT_SPACE = 'hotel_expert_chat'
    const location = window.location.href
    const tripId = activeTrip?.trip_id
    const { trackEvent, trackButtonClick } = usePostHog()
    const { isRimigoInternal } = useUserInfo()
    const showDealsTab = isRimigoInternal 
    const dealsApiEnabled = isRimigoInternal 
    const [isAddToCollectionModalOpen, setIsAddToCollectionModalOpen] = useState(false)
    const { user } = useUserInfo()
    const { isAuthenticated } = useAuth()
    const queryClient = useQueryClient()
    
    const { data: accommodationExistenceData, isLoading: isCheckingAccommodation } = useQuery({
        queryKey: ['accommodationExistence', zentrumHubId],
        queryFn: () => checkAccommodationExistence(zentrumHubId),
        enabled: !!zentrumHubId && isRimigoInternal,
        staleTime: HOURS_24,
        gcTime: HOURS_24,
        retry: 1,
        refetchOnWindowFocus: false
    })

    const accommodationExists = accommodationExistenceData?.is_accommodation_exists ?? false
    const accommodationDbId = accommodationExistenceData?.accommodation_id
    const isNotInRimigo = isRimigoInternal && !accommodationExists && !isCheckingAccommodation
    useEffect(() => {
        if (!isVerificationDropdownOpen) return
        const handleClickOutside = (e: MouseEvent) => {
            if (verificationDropdownRef.current && !verificationDropdownRef.current.contains(e.target as Node)) {
                setIsVerificationDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isVerificationDropdownOpen])
    const effectiveIsVerified = localIsVerified ?? hotelData?.is_verified ?? false
    const effectiveIsB2bDealAvailable = localIsB2bDealAvailable ?? hotelData?.is_b2b_deal_available ?? false
    const effectiveIsAvailableOnAirbnb = localIsAvailableOnAirbnb ?? hotelData?.is_available_on_airbnb ?? false
    const { showVerifiedBadge, showB2bBadge, showAirbnbBadge } = useStayCardBadges(effectiveIsVerified, effectiveIsB2bDealAvailable, effectiveIsAvailableOnAirbnb)
    const handleVerificationToggle = async (field: 'is_verified' | 'is_b2b_deal_available' | 'is_available_on_airbnb', value: boolean) => {
        if (!accommodationDbId || isUpdatingVerification) return
        setIsUpdatingVerification(true)
        if (field === 'is_verified') setLocalIsVerified(value)
        else if (field === 'is_b2b_deal_available') setLocalIsB2bDealAvailable(value)
        else setLocalIsAvailableOnAirbnb(value)
        try {
            await updateAccommodationVerification(accommodationDbId, { [field]: value })
            const label = field === 'is_verified' ? 'Verified' : field === 'is_b2b_deal_available' ? 'B2B Deals' : 'Is Available on Airbnb'
            toast.success(value ? `Marked as ${label}` : `Removed from ${label}`)
        } catch {
            if (field === 'is_verified') setLocalIsVerified(!value)
            else if (field === 'is_b2b_deal_available') setLocalIsB2bDealAvailable(!value)
            else setLocalIsAvailableOnAirbnb(!value)
            toast.error('Failed to update verification status')
        } finally {
            setIsUpdatingVerification(false)
        }
    }


    // City resolution: API response first, then URL query params as fallback
    // API returns DB-resolved city/city_id (null if city not found in DB)
    const finalCityName = hotelData?.city || cityName
    const responseCityId = hotelData?.city_id

    // If no city_id from API response, fetch by finalCityName
    const { data: fetchedCityId } = useQuery({
        queryKey: ['cityByName', finalCityName],
        queryFn: async () => {
            if (!finalCityName) return null
            return await getCityByName(finalCityName)
        },
        enabled: !responseCityId && !!finalCityName,
        staleTime: HOURS_24,
        gcTime: HOURS_24,
        retry: 1,
        refetchOnWindowFocus: false
    })

    // Resolved city id: API response > fetched by name
    const resolvedCityId = useMemo(
        () => (responseCityId || fetchedCityId) ?? undefined,
        [responseCityId, fetchedCityId]
    )

    // Sync resolved city_id and city_name into URL params (subtle replace)
    useEffect(() => {
        const next = new URLSearchParams(searchParams)
        let changed = false
        const newCityId = responseCityId || fetchedCityId
        if (newCityId && searchParams.get('city_id') !== newCityId) {
            next.set('city_id', newCityId)
            changed = true
        }
        if (finalCityName && searchParams.get('city_name') !== finalCityName) {
            next.set('city_name', finalCityName)
            changed = true
        }
        if (changed) {
            setSearchParams(next, { replace: true })
        }
    }, [responseCityId, fetchedCityId, finalCityName, searchParams, setSearchParams])

    // Fetch country ID using city and append to URL query params
    // This is required for the add to collection modal to work. As it requires country_id to be present in the URL query params.
    // This is to fetch collections of the country
    useCountryIdFromCity(cityId || null)

    // Fetch agent ID by space
    const { data: agentId, isLoading: isAgentIdLoading } = useQuery({
        queryKey: ['agentBySpace', ATA_AGENT_SPACE],
        queryFn: () => getAgentBySpace(ATA_AGENT_SPACE),
        enabled: isAuthenticated,
        staleTime: HOURS_24 // Cache for 24 hours since agent IDs don't change frequently
    })
    const { data: cityPersonalizationData } = useLocationPersonalizationCity(cityId || undefined)
    // Progressive rate API: only runs for rimigo_internal travelers (dealsApiEnabled)
    const accommodationDealQuery = tripId
        ? useAccommodationDeal(location, tripId, dealsApiEnabled)
        : { data: null, isLoading: false, isError: false, error: null }
    void accommodationDealQuery // used only to run hook; enabled: false for non-internal prevents API call
    const { data: accommodationDealData } = accommodationDealQuery
    const hotelSearchRequestId = accommodationDealData?.hotel_search_request_id
    const isDealsActive = activeTab === 'deals' && showDealsTab && dealsApiEnabled
    const { data: accommodationDealResult, isLoading: isDealResultLoading } = useAccommodationDealResult(hotelSearchRequestId, isDealsActive)

    // Re-check accommodation existence after deal flow completes (it may have auto-created the accommodation)
    useEffect(() => {
        if (accommodationDealResult?.deal_request_status === 'COMPLETED' && isRimigoInternal) {
            queryClient.invalidateQueries({ queryKey: ['accommodationExistence', zentrumHubId] })
        }
    }, [accommodationDealResult?.deal_request_status, isRimigoInternal, zentrumHubId, queryClient])

    // Track Zentrum response time via PostHog
    const dealRequestStartRef = useRef<number | null>(null)
    useEffect(() => {
        if (hotelSearchRequestId && !dealRequestStartRef.current) {
            dealRequestStartRef.current = Date.now()
        }
    }, [hotelSearchRequestId])
    useEffect(() => {
        const status = accommodationDealResult?.deal_request_status
        if (status === 'COMPLETED' && dealRequestStartRef.current) {
            const durationMs = Date.now() - dealRequestStartRef.current
            trackEvent('B2B Deal Response Time', {
                zentrum_hub_id: zentrumHubId,
                hotel_name: hotelName,
                hotel_search_request_id: hotelSearchRequestId,
                duration_ms: durationMs,
                duration_s: Math.round(durationMs / 1000),
                room_count: Object.keys(accommodationDealResult?.request_deal_response?.room_types || {}).length,
                has_rooms: Object.keys(accommodationDealResult?.request_deal_response?.room_types || {}).length > 0
            })
            dealRequestStartRef.current = null
        }
    }, [accommodationDealResult?.deal_request_status])

    const hotelPollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    useEffect(() => {
        if (!hotelData?.attributes) return

        const hotelAttributes = hotelData.attributes

        // If we don't have city personalization, default to first 5 attributes
        if (!cityId || !cityPersonalizationData?.preferences?.stays?.top_review_attributes) {
            setRimigoTop5(hotelAttributes.slice(0, 5))
            return
        }

        const cityTopAttributes = cityPersonalizationData.preferences.stays.top_review_attributes

        // City data provides attribute keys like "proximity_to_attractions"
        const cityAttrKeys = cityTopAttributes.map((item: any) => (item?.attribute || '').toString().toLowerCase()).filter(Boolean)

        const matched: any[] = []

        for (const key of cityAttrKeys) {
            const match = hotelAttributes.find((attr: any) => {
                const attrKeyRaw = (attr.key || '').toString()
                if (attrKeyRaw) {
                    return attrKeyRaw.toLowerCase() === key
                }

                // Fallback: derive key from label if key is missing
                const labelRaw = (attr.label || '').toString().toLowerCase()
                const derivedKeyFromLabel = labelRaw.replace(/ /g, '_')
                return derivedKeyFromLabel === key
            })

            if (match) {
                matched.push(match)
            }
        }

        if (matched.length > 0) {
            setRimigoTop5(matched.slice(0, 5))
        } else {
            setRimigoTop5(hotelAttributes.slice(0, 5))
        }
    }, [hotelData, cityPersonalizationData, cityId])
    const handleScroll = () => {
        if (!sliderRef.current) return

        const scrollLeft = sliderRef.current.scrollLeft
        const width = sliderRef.current.offsetWidth
        const index = Math.round(scrollLeft / width)

        setActiveIndex(index)
    }
    useEffect(() => {
        const preferenceValues = preferencesString ? preferencesString.split(',') : []
        const fetchHotelDetailsPoll = async () => {
            if (!hotelId) return

            try {
                const requestData = {
                    hotel_name: hotelName,
                    zentrum_hub_id: zentrumHubId,
                    city: {
                        id: cityId,
                        name: cityName
                    },
                    travel_purpose: travelPurpose,
                    group_type: groupType,
                    preferences: preferenceValues,
                    review_type: reviewType
                }

                const response = await apiClient.post('/stays/', requestData)

                if (response.data.response_code === 'SS0200') {
                    const data = response.data.data
                    setHotelData(data)

                    const reviewStatusRaw = data?.review_data?.status
                    const reviewStatus = typeof reviewStatusRaw === 'string' ? reviewStatusRaw.toLowerCase() : ''
                    if (reviewStatus === 'in_progress') {
                        if (hotelPollTimeoutRef.current) {
                            clearTimeout(hotelPollTimeoutRef.current)
                        }
                        hotelPollTimeoutRef.current = setTimeout(fetchHotelDetailsPoll, 2000)
                    }
                } else {
                    setError('Failed to fetch hotel details')
                }
            } catch (err) {
                toast.error((err as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
                setError('Error loading hotel details')
            }
        }

        const fetchHotelDetails = async () => {
            if (!hotelId) return

            try {
                setLoading(true)
                setError(null)

                const requestData = {
                    hotel_name: hotelName,
                    zentrum_hub_id: zentrumHubId,
                    city: {
                        id: cityId,
                        name: cityName
                    },
                    travel_purpose: travelPurpose,
                    group_type: groupType,
                    preferences: preferenceValues,
                    review_type: reviewType
                }

                const response = await apiClient.post('/stays/', requestData)

                if (response.data.response_code === 'SS0200') {
                    setHotelData(response.data.data)
                    trackEvent('Hotel Detail Page Viewed', {
                        hotel_id: hotelId,
                        hotel_name: hotelName,
                        zentrum_hub_id: zentrumHubId,
                        city_id: cityId,
                        city_name: cityName,
                        travel_purpose: travelPurpose,
                        group_type: groupType,
                        preferences: preferenceValues,
                        review_type: reviewType,
                        review_status: response.data.data?.review_data?.status ?? null
                    })
                } else {
                    setError('Failed to fetch hotel details')
                }
                const data = response.data.data

                if (data) {
                    setHotelData(data)
                }

                const reviewStatusRaw = data?.review_data?.status
                const reviewStatus = typeof reviewStatusRaw === 'string' ? reviewStatusRaw.toLowerCase() : ''

                if (reviewStatus === 'in_progress') {
                    if (hotelPollTimeoutRef.current) {
                        clearTimeout(hotelPollTimeoutRef.current)
                    }
                    hotelPollTimeoutRef.current = setTimeout(fetchHotelDetailsPoll, 2000)
                }
            } catch (err) {
                setError('Error loading hotel details')
            } finally {
                setLoading(false)
            }
        }

        fetchHotelDetails()

        return () => {
            if (hotelPollTimeoutRef.current) {
                clearTimeout(hotelPollTimeoutRef.current)
            }
        }
    }, [hotelId, hotelName, zentrumHubId, cityId, cityName, travelPurpose, groupType, preferencesString, reviewType])

    // Initialize underline position on mount
    useEffect(() => {
        const container = tabsRef.current
        if (!container) return
        const init = () => {
            const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
            const btn = buttons[0]
            if (btn) {
                const left = btn.offsetLeft + 8
                const width = btn.clientWidth - 16
                setUnderlineStyle({ left, width })
            }
        }
        const id = window.requestAnimationFrame(init)
        return () => window.cancelAnimationFrame(id)
    }, [])

    // Keep underline in sync
    useEffect(() => {
        const container = tabsRef.current
        if (!container) return
        const update = () => {
            const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
            const ids = showDealsTab ? ['forYou', 'reviews', 'amenities', 'deals'] : ['forYou', 'reviews', 'amenities']
            const idx = ids.indexOf(activeTab)
            const btn = buttons[idx] || buttons[0]
            if (btn) {
                const left = btn.offsetLeft + 8
                const width = btn.clientWidth - 16
                setUnderlineStyle({ left, width })
            }
        }
        const id = window.requestAnimationFrame(update)
        const ro = new ResizeObserver(update)
        ro.observe(container)
        window.addEventListener('resize', update)
        return () => {
            window.cancelAnimationFrame(id)
            ro.disconnect()
            window.removeEventListener('resize', update)
        }
    }, [activeTab, showDealsTab])
    useEffect(() => {
        activeTabRef.current = activeTab
    }, [activeTab])
    // Scroll spy - only for non-deals tabs
    useEffect(() => {
        if (activeTab === 'deals') return

        const sectionIdToTab: Record<string, typeof activeTab> = {
            forYouSection: 'forYou',
            amenitiesSection: 'amenities',
            reviewsSection: 'reviews'
        }
        const collectTargets = () =>
            Object.keys(sectionIdToTab)
                .map((id) => ({ id, el: document.getElementById(id) }))
                .filter((x): x is { id: string; el: HTMLElement } => Boolean(x.el))

        let targets = collectTargets()

        if (targets.length === 0) {
            const raf = requestAnimationFrame(() => {
                targets = collectTargets()
            })
            return () => cancelAnimationFrame(raf)
        }

        const ratios = new Map<string, number>()
        const observer = new IntersectionObserver(
            (entries) => {
                if (activeTabRef.current === 'deals') return

                entries.forEach((e) => {
                    const id = (e.target as HTMLElement).id
                    const ratio = e.intersectionRatio || 0
                    ratios.set(id, ratio)
                })

                const currentId = Object.keys(sectionIdToTab).find((id) => sectionIdToTab[id] === activeTabRef.current) || ''
                const currentRatio = ratios.get(currentId) ?? 0
                const keepThreshold = 0.45
                if (currentRatio >= keepThreshold) {
                    return
                }

                let bestId: string | null = null
                let bestRatio = 0
                ratios.forEach((r, id) => {
                    if (r > bestRatio) {
                        bestRatio = r
                        bestId = id
                    }
                })
                const minSwitch = 0.25
                if (bestId && bestRatio >= minSwitch) {
                    const next = sectionIdToTab[bestId]
                    if (next && next !== activeTabRef.current) {
                        setActiveTab(next)
                    }
                }
            },
            { root: null, threshold: [0.1, 0.25, 0.5, 0.75], rootMargin: '-96px 0px -45% 0px' }
        )

        targets.forEach(({ el }) => {
            if (el) observer.observe(el)
        })
        return () => observer.disconnect()
    }, [hotelData, activeTab])

    // Initialize nearby tab
    useEffect(() => {
        if (!nearbyTab && hotelData?.nearby_list?.length) {
            setNearbyTab(hotelData.nearby_list[0].section_head)
        }
    }, [hotelData, nearbyTab])

    // Fetch affiliate links
    // useEffect(() => {
    //     const fetchAffiliateLinks = async () => {
    //         if (!zentrumHubId || !checkIn || !checkOut) {
    //             return
    //         }

    //         try {
    //             const response = await getAffiliateLinks({
    //                 zentrum_hub_id: zentrumHubId,
    //                 check_in_date: checkIn,
    //                 check_out_date: checkOut,
    //                 only_our_affiliate: true,
    //                 trip_id: tripId
    //             })

    //             if (response.response_code === 'SS0200') {
    //                 const data = response.data
    //                 const providers: string[] = data?.providers || []
    //                 const links = data?.affiliate_links || {}
    //                 if (providers.includes('Agoda') && links?.Agoda) {
    //                     try {
    //                         const url = new URL(links.Agoda as string)
    //                         // Update params based on current URL state
    //                         const adults = parseInt(searchParams.get('adults') || '2', 10)
    //                         const children = parseInt(searchParams.get('children') || '0', 10)
    //                         const childAges = (searchParams.get('children_age') || '')
    //                             .split(',')
    //                             .filter(Boolean)
    //                             .map((a) => parseInt(a, 10))
    //                             .filter((n) => !Number.isNaN(n))

    //                         // nights (los)
    //                         const start = new Date(checkIn)
    //                         const end = new Date(checkOut)
    //                         const ms = end.getTime() - start.getTime()
    //                         const los = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))

    //                         url.searchParams.set('checkin', checkIn)
    //                         url.searchParams.set('los', String(los))
    //                         url.searchParams.set('adults', String(adults))
    //                         url.searchParams.set('children', String(children))
    //                         if (children > 0) {
    //                             url.searchParams.set('childAges', childAges.join(','))
    //                         } else {
    //                             url.searchParams.delete('childAges')
    //                         }

    //                         setAffiliateAgodaUrl(url.toString())
    //                     } catch {
    //                         setAffiliateAgodaUrl(links.Agoda as string)
    //                     }
    //                 } else {
    //                     setAffiliateAgodaUrl(null)
    //                 }
    //             } else {
    //                 setAffiliateAgodaUrl(null)
    //             }
    //         } catch (err) {}
    //     }

    //     fetchAffiliateLinks()
    // }, [zentrumHubId, checkIn, checkOut, tripId, searchParams])

    useEffect(() => {
        let cancelled = false
        const fetchShortlistStatus = async () => {
            if (!activeTrip?.trip_id || !zentrumHubId) {
                setIsShortlisted(false)
                return
            }

            try {
                let page = 1
                const limit = 50
                let found = false

                while (!found) {
                    const response = await getShortlistedByTrip({
                        tripId: activeTrip.trip_id,
                        baseCityIds: cityId || undefined,
                        accommodationId: accommodationIdParam || undefined,
                        page,
                        limit
                    })

                    if (cancelled) {
                        return
                    }

                    const match = response.results.find((stay) => stay.zentrum_hub_id === zentrumHubId)
                    if (match) {
                        setIsShortlisted(Boolean(match.is_traveler_shortlisted))
                        found = true
                        break
                    }

                    if (!response.has_more) {
                        break
                    }

                    page += 1
                }

                if (!found && !cancelled) {
                    setIsShortlisted(false)
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to fetch stay shortlist status', error)
                    setIsShortlisted(false)
                }
            }
        }

        fetchShortlistStatus()

        return () => {
            cancelled = true
        }
    }, [activeTrip?.trip_id, zentrumHubId, cityId, accommodationIdParam])

    const handleSearch = (params: SearchParams) => {
        const formatDate = (date: Date) => {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }

        const next = new URLSearchParams(searchParams.toString())

        if (params.checkIn) {
            next.set('check_in', formatDate(params.checkIn))
        } else {
            next.delete('check_in')
        }

        if (params.checkOut) {
            next.set('check_out', formatDate(params.checkOut))
        } else {
            next.delete('check_out')
        }

        if (params.groupType) {
            next.set('group_type', params.groupType)
        } else {
            next.delete('group_type')
        }

        if (params.travelPurpose) {
            next.set('travel_purpose', params.travelPurpose)
        } else {
            next.delete('travel_purpose')
        }

        const preferencesStringValue = params.cityPreferences && params.cityPreferences.length ? params.cityPreferences.join(',') : ''
        if (preferencesStringValue) {
            next.set('city_prefs', preferencesStringValue)
        } else {
            next.delete('city_prefs')
        }

        if (params.guestsData) {
            next.set('adults', String(params.guestsData.adults ?? 0))
            next.set('children', String(params.guestsData.children ?? 0))
            next.set('infants', String(params.guestsData.infants ?? 0))
            if (params.guestsData.children_age && params.guestsData.children_age.length) {
                next.set('children_age', params.guestsData.children_age.join(','))
            } else {
                next.delete('children_age')
            }
        }

        if (params.rooms && params.rooms > 1) {
            next.set('rooms', String(params.rooms))
        } else {
            next.delete('rooms')
        }

        if (params.occupancies) {
            next.set('occupancies', encodeOccupancies(params.occupancies))
        }

        setSearchParams(next, { replace: true })
    }

    // React to URL param to switch active tab when requested by sidebar or external navigation
    useEffect(() => {
        const tab = searchParams.get('active_tab')
        if (tab === 'deals' && showDealsTab && activeTabRef.current !== 'deals') {
            setActiveTab('deals')
            activeTabRef.current = 'deals'

            // Wait for tab to render, then scroll into view
            setTimeout(() => {
                const container = tabsRef.current
                if (container) {
                    container.scrollIntoView({ behavior: 'smooth', block: 'start' })

                    // Update the underline to highlight the deals tab button
                    const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
                    const ids = showDealsTab ? ['forYou', 'reviews', 'amenities', 'deals'] : ['forYou', 'reviews', 'amenities']
                    const idx = ids.indexOf('deals')
                    const btn = buttons[idx]
                    if (btn) {
                        const rect = btn.getBoundingClientRect()
                        const containerRect = container.getBoundingClientRect()
                        setUnderlineStyle({ left: rect.left - containerRect.left + 8, width: rect.width - 16 })
                    }
                }
            }, 300)
        }
    }, [searchParams, showDealsTab])
    const checkInDate = checkIn ? new Date(checkIn) : undefined
    const checkOutDate = checkOut ? new Date(checkOut) : undefined

    const reviewStatusNormalized = typeof hotelData?.review_data?.status === 'string' ? hotelData.review_data.status.toLowerCase() : ''
    const isReviewProcessing = reviewStatusNormalized === 'in_progress'

    const guestsInitialData = useMemo(() => {
        const adults = parseInt(searchParams.get('adults') || '0', 10)
        const children = parseInt(searchParams.get('children') || '0', 10)
        const infants = parseInt(searchParams.get('infants') || '0', 10)
        const childAges = (searchParams.get('children_age') || '')
            .split(',')
            .map((age) => parseInt(age, 10))
            .filter((age) => !Number.isNaN(age))

        return {
            adults: adults > 0 ? adults : 1,
            children: children > 0 ? children : 0,
            infants: infants > 0 ? infants : 0,
            children_age: childAges
        }
    }, [searchParams])

    // loaderPreferencesData removed - no longer needed since ProgressStepsLoader was removed

    const formatReviewCount = (n?: number) => {
        if (n === undefined || n === null) return ''
        if (n >= 1000) return `${(n / 1000).toFixed(1)}k reviews`
        return `${n} reviews`
    }

    const handleSeeAllReviewsClick = useCallback(() => {
        setActiveTab('reviews')

        const reviewsElement = document.getElementById('reviewsSection')
        if (reviewsElement) {
            reviewsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }

        const container = tabsRef.current
        if (container) {
            const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
            const ids = showDealsTab ? ['forYou', 'reviews', 'amenities', 'deals'] : ['forYou', 'reviews', 'amenities']
            const idx = ids.indexOf('reviews')
            const btn = buttons[idx] || buttons[0]
            if (btn) {
                const rect = btn.getBoundingClientRect()
                const containerRect = container.getBoundingClientRect()
                setUnderlineStyle({ left: rect.left - containerRect.left + 8, width: rect.width - 16 })
            }
        }
    }, [showDealsTab, setActiveTab, setUnderlineStyle])
    // @ts-ignore -- kept for potential future use
    const _handleViewDeals = useCallback(() => {
        trackButtonClick({
            button_name: 'View Deals Online',
            location: 'hotel_detail_page',
            extra: {
                zentrumHubId: hotelId,
                trip_id: activeTrip?.trip_id || null,
                traveler_id: user?.id || null
            }
        })

        if (showDealsTab) {
            setActiveTab('deals')
        }

        const sidebarElement = isMobile ? document.getElementById('pricing-sidebar-mobile') : document.getElementById('pricing-sidebar')
        const refToUse = isMobile ? pricingSidebarMobileRef : pricingSidebarRef

        if (sidebarElement) {
            if (isMobile) {
                const scrollContainer = document.getElementById('hotel-detail-scroll-container')

                if (scrollContainer) {
                    const elementPosition = sidebarElement.offsetTop
                    const offsetPosition = elementPosition - 200 // 200px from top

                    scrollContainer.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    })
                }
            } else {
                sidebarElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        }

        setTimeout(() => {
            if (refToUse.current) {
                refToUse.current.findCheapestDeal()
            } else {
            }
        }, 500)
    }, [showDealsTab, isMobile, trackButtonClick, hotelId, activeTrip?.trip_id, user?.id, pricingSidebarMobileRef, pricingSidebarRef])

    const handleGuardedAddToCollection = useCallback(() => {
        if (isNotInRimigo) {
            toast.warning('Please add this property to Rimigo first before adding to a collection.')
            return
        }
        setIsAddToCollectionModalOpen(true)
    }, [isNotInRimigo])

    if (loading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#F9F7FF]">
                <LogoLoadingScreen />
            </div>
        )
    }
    if (error || !hotelData) {
        return (
            <div className="min-h-screen bg-natural-white relative">
                <div className="md:hidden">
                    <MobileCompleteHeaderWithSearch
                        iconSrc={'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/explore_stays.png'}
                        headerType="stays"
                        onSearch={handleSearch}
                        whereConfig={{
                            enabled: false,
                            label: 'Where',
                            placeholder: 'Search cities',
                            multiselect: false,
                            initialData: cityId && cityName ? [{ id: cityId, name: cityName }] : undefined
                        }}
                        whenConfig={{
                            enabled: true,
                            label: 'When',
                            placeholder: 'Add dates',
                            type: 'date_range',
                            initialCheckIn: checkInDate,
                            initialCheckOut: checkOutDate
                        }}
                        guestsConfig={{
                            enabled: true,
                            label: 'Guests',
                            placeholder: 'Add guests',
                            initialData: guestsInitialData
                        }}
                        preferencesConfig={{
                            enabled: true,
                            label: 'Preferences',
                            placeholder: 'Add preferences',
                            initialGroupType: groupType || undefined,
                            initialTravelPurpose: travelPurpose || undefined,
                            initialLocationPreferences: preferences || []
                        }}
                        title={'Stays'}
                    />
                </div>
                <div className="hidden md:block">
                    {' '}
                    <SearchHeader
                        iconSrc={'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/explore_stays.png'}
                        pageName="Stays"
                        onSearch={handleSearch}
                        initialActiveSegment={null}
                        whereConfig={{
                            enabled: false,
                            label: 'Where',
                            placeholder: 'Search cities',
                            multiselect: false,
                            initialData: cityId && cityName ? [{ id: cityId, name: cityName }] : undefined
                        }}
                        whenConfig={{
                            enabled: true,
                            label: 'When',
                            placeholder: 'Add dates',
                            type: 'date_range',
                            initialCheckIn: checkInDate,
                            initialCheckOut: checkOutDate
                        }}
                        guestsConfig={{
                            enabled: true,
                            label: 'Guests',
                            placeholder: 'Add guests',
                            initialData: guestsInitialData
                        }}
                        roomsConfig={{
                            enabled: true,
                            label: 'Rooms',
                            placeholder: '1 room',
                            initialData: rooms,
                            initialOccupancies
                        }}
                        preferencesConfig={{
                            enabled: true,
                            label: 'Preferences',
                            placeholder: 'Add preferences',
                            initialGroupType: groupType || undefined,
                            initialTravelPurpose: travelPurpose || undefined,
                            initialLocationPreferences: preferences || []
                        }}
                        assistantConfig={{
                            enabled: true
                        }}
                        filterConfig={{ enabled: false }}
                        sortConfig={{ enabled: false }}
                    />
                </div>

                <div className="flex items-center justify-center h-[50vh]">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-header-black mb-4">Error Loading Hotel Details</h2>
                        <p className="text-grey-grey_2 mb-4">{error}</p>
                        <button
                            onClick={() => navigate(-1)}
                            className="px-6 py-3 bg-primary-default text-white rounded-lg hover:bg-primary-default/90 transition-colors">
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Review processing no longer blocks the entire page.
    // The page renders with available zentrum data, and review-dependent
    // sections show skeleton placeholders until polling completes.

    const allImageLinks = hotelData.images?.flatMap((group: any) => group.links) || []
    const topFiveImages = allImageLinks.slice(0, 5)
    const stayIdForCollection = accommodationIdParam || zentrumHubId
    const stayLocationTag = Array.isArray(hotelData.location_tag) ? hotelData.location_tag?.[0] : undefined
    const stayImageUrl = topFiveImages?.[0]

    return (
        <>
            <ReactHelmet title={`${hotelData.hotel_name}`} />
            <div className="h-screen max-md:overflow-y-hidden md:min-h-screen bg-natural-white relative">
                <div className="md:hidden sticky top-0 z-40">
                    <MobileCompleteHeaderWithSearch
                        headerType="stays"
                        onSearch={handleSearch}
                        whereConfig={{
                            enabled: false,
                            label: 'Where',
                            placeholder: 'Search cities',
                            multiselect: false,
                            initialData: cityId && cityName ? [{ id: cityId, name: cityName }] : undefined
                        }}
                        whenConfig={{
                            enabled: true,
                            label: 'When',
                            placeholder: 'Add dates',
                            type: 'date_range',
                            initialCheckIn: checkInDate,
                            initialCheckOut: checkOutDate
                        }}
                        guestsConfig={{
                            enabled: true,
                            label: 'Guests',
                            placeholder: 'Add guests',
                            initialData: {
                                adults: parseInt(searchParams.get('adults') || '1', 10) || 1,
                                children: parseInt(searchParams.get('children') || '0', 10) || 0,
                                infants: parseInt(searchParams.get('infants') || '0', 10) || 0,
                                children_age: (searchParams.get('children_age') || '')
                                    .split(',')
                                    .filter(Boolean)
                                    .map((age) => parseInt(age, 10))
                            }
                        }}
                        roomsConfig={{
                            enabled: true,
                            label: 'Rooms',
                            placeholder: '1 room',
                            initialData: rooms,
                            initialOccupancies
                        }}
                        preferencesConfig={{
                            enabled: true,
                            label: 'Preferences',
                            placeholder: 'Add preferences',
                            initialGroupType: groupType || undefined,
                            initialTravelPurpose: travelPurpose || undefined,
                            initialLocationPreferences: preferences || []
                        }}
                        title={'Stays'}
                        onSearchModalOpenChange={setIsMobileSearchOpen}
                    />
                </div>
                <div className="md:hidden">
                    <SearchHeader
                        pageName="Stays"
                        ishidden={true}
                        assistantConfig={{
                            enabled: isAuthenticated && !isAgentIdLoading && !!agentId && !!zentrumHubId && !isMobileSearchOpen,
                            ataId: agentId,
                            tripId: tripId || undefined,
                            assistantType: 'HotelExpertChat',
                            entityType: 'zentrum_hub_id',
                            entityId: zentrumHubId,
                            inputData: {
                                zentrumHubId,
                                hotelName
                            }
                        }}
                        filterConfig={{ enabled: false }}
                        sortConfig={{ enabled: false }}
                        whereConfig={{ enabled: false }}
                        whenConfig={{ enabled: false }}
                        guestsConfig={{ enabled: false }}
                        preferencesConfig={{ enabled: false }}
                    />
                </div>
                <div className="hidden md:block">
                    <SearchHeader
                        pageName="Stays"
                        iconSrc={'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/explore_stays.png'}
                        onSearch={handleSearch}
                        initialActiveSegment={null}
                        whereConfig={{
                            enabled: false,
                            label: 'Where',
                            placeholder: 'Search cities',
                            multiselect: false,
                            initialData: cityId && cityName ? [{ id: cityId, name: cityName }] : undefined
                        }}
                        whenConfig={{
                            enabled: true,
                            label: 'When',
                            placeholder: 'Add dates',
                            type: 'date_range',
                            initialCheckIn: checkInDate,
                            initialCheckOut: checkOutDate
                        }}
                        guestsConfig={{
                            enabled: true,
                            label: 'Guests',
                            placeholder: 'Add guests',
                            initialData: {
                                adults: parseInt(searchParams.get('adults') || '1', 10) || 1,
                                children: parseInt(searchParams.get('children') || '0', 10) || 0,
                                infants: parseInt(searchParams.get('infants') || '0', 10) || 0,
                                children_age: (searchParams.get('children_age') || '')
                                    .split(',')
                                    .filter(Boolean)
                                    .map((age) => parseInt(age, 10))
                            }
                        }}
                        roomsConfig={{
                            enabled: true,
                            label: 'Rooms',
                            placeholder: '1 room',
                            initialData: rooms,
                            initialOccupancies
                        }}
                        preferencesConfig={{
                            enabled: true,
                            label: 'Preferences',
                            placeholder: 'Add preferences',
                            initialGroupType: groupType || undefined,
                            initialTravelPurpose: travelPurpose || undefined,
                            initialLocationPreferences: preferences || []
                        }}
                        assistantConfig={{
                            enabled: isAuthenticated && !isAgentIdLoading && !!agentId && !!zentrumHubId,
                            ataId: agentId,
                            tripId: tripId || undefined,
                            assistantType: 'HotelExpertChat',
                            entityType: 'zentrum_hub_id',
                            entityId: zentrumHubId,
                            inputData: {
                                zentrumHubId,
                                hotelName
                            }
                        }}
                        filterConfig={{ enabled: false }}
                        sortConfig={{ enabled: false }}
                    />
                </div>

                <div
                    id="hotel-detail-scroll-container"
                    className="max-w-[1320px] max-md:overflow-x-hidden  mx-auto pt-0  py-8 overflow-y-auto max-h-[calc(100vh-80px)] scrollbar-hide">
                    {/* Header Section */}
                    {/* Internal-only manage controls — full-width row above hotel header, extreme right */}
                    {isRimigoInternal && (
                        <div
                            className="-mx-[17%] max-md:hidden px-[17%] bg-natural-white flex justify-end gap-2 pt-4 pb-1"
                            style={{ fontFamily: 'Red Hat Display, ui-sans-serif, system-ui' }}>
                            {!accommodationExists && !isCheckingAccommodation && (
                                <button
                                    onClick={() => setIsAddToDatabaseModalOpen(true)}
                                    className="px-4 py-2 cursor-pointer bg-white border border-primary-default text-primary-default rounded-xl hover:bg-primary-default/5 transition-colors font-semibold text-sm flex items-center gap-2 font-red-hat-display"
                                >
                                    <span className="text-lg">+</span>
                                    ADD TO RIMIGO
                                </button>
                            )}
                            {accommodationExists && (
                                <div className="relative" ref={verificationDropdownRef}>
                                    <button
                                        onClick={() => setIsVerificationDropdownOpen(!isVerificationDropdownOpen)}
                                        className="px-3 py-2 cursor-pointer bg-white border border-grey-3 rounded-xl hover:bg-grey-5 transition-colors font-semibold text-sm flex items-center gap-1.5 font-red-hat-display text-grey-1"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Manage
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isVerificationDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isVerificationDropdownOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-grey-4 shadow-xl z-50 p-2 flex flex-col gap-1">
                                            {/* Verified */}
                                            <label className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${effectiveIsVerified ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-grey-5 border border-transparent'}`}>
                                                <div className="flex items-center gap-2.5">
                                                    <BadgeCheck className={`w-4 h-4 ${effectiveIsVerified ? 'text-emerald-600' : 'text-grey-3'}`} />
                                                    <span className={`text-sm font-semibold font-red-hat-display ${effectiveIsVerified ? 'text-emerald-700' : 'text-grey-1'}`}>Verified</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={effectiveIsVerified}
                                                    disabled={isUpdatingVerification}
                                                    onClick={() => handleVerificationToggle('is_verified', !effectiveIsVerified)}
                                                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${effectiveIsVerified ? 'bg-emerald-500' : 'bg-grey-4'} disabled:opacity-50`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${effectiveIsVerified ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                                                </button>
                                            </label>
                                            {/* B2B Deals */}
                                            <label className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${effectiveIsB2bDealAvailable ? 'bg-violet-50 border border-violet-200' : 'hover:bg-grey-5 border border-transparent'}`}>
                                                <div className="flex items-center gap-2.5">
                                                    <Zap className={`w-4 h-4 ${effectiveIsB2bDealAvailable ? 'text-violet-600' : 'text-grey-3'}`} />
                                                    <span className={`text-sm font-semibold font-red-hat-display ${effectiveIsB2bDealAvailable ? 'text-violet-700' : 'text-grey-1'}`}>B2B Deals</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={effectiveIsB2bDealAvailable}
                                                    disabled={isUpdatingVerification}
                                                    onClick={() => handleVerificationToggle('is_b2b_deal_available', !effectiveIsB2bDealAvailable)}
                                                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${effectiveIsB2bDealAvailable ? 'bg-violet-500' : 'bg-grey-4'} disabled:opacity-50`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${effectiveIsB2bDealAvailable ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                                                </button>
                                            </label>
                                            {/* Airbnb — branded selector row */}
                                            <label className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${effectiveIsAvailableOnAirbnb ? 'bg-[#FF385C]/8 border border-[#FF385C]/30' : 'hover:bg-grey-5 border border-transparent'}`}>
                                                <div className="flex items-center gap-2.5">
                                                    <img
                                                        src={PLATFORM_ICONS.AIRBNB}
                                                        alt="Airbnb"
                                                        className={`w-5 h-5 shrink-0 transition-opacity duration-150 ${effectiveIsAvailableOnAirbnb ? 'opacity-100' : 'opacity-40'}`}
                                                    />
                                                    <div className="flex flex-col leading-tight">
                                                        <span className={`text-xs font-bold font-red-hat-display tracking-wide uppercase ${effectiveIsAvailableOnAirbnb ? 'text-[#FF385C]' : 'text-grey-2'}`}>airbnb</span>
                                                        <span className="text-[10px] font-manrope text-grey-3 leading-none">Available on platform</span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={effectiveIsAvailableOnAirbnb}
                                                    disabled={isUpdatingVerification}
                                                    onClick={() => handleVerificationToggle('is_available_on_airbnb', !effectiveIsAvailableOnAirbnb)}
                                                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${effectiveIsAvailableOnAirbnb ? 'bg-[#FF385C]' : 'bg-grey-4'} disabled:opacity-50`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${effectiveIsAvailableOnAirbnb ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                                                </button>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    <div
                        className="-mx-[17%] max-md:hidden px-[17%] mb-0 md:sticky top-0  z-20 bg-natural-white md:pt-8 flex items-end pb-3 justify-between gap-4"
                        style={{ fontFamily: 'Red Hat Display, ui-sans-serif, system-ui' }}>
                        <div className="flex-1 mt-[-6px]  max-md:pl-[20px]   ">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                <h1 className="text-[18px] font-red-hat-display md:text-3xl font-bold text-header-black max-md:leading-tight">
                                    {hotelData.hotel_name}
                                </h1>
                                {showVerifiedBadge && <VerifiedBadge size="lg" />}
                                {showB2bBadge && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-300">
                                        <Zap className="w-3.5 h-3.5 text-violet-600" />
                                        <span className="text-xs font-red-hat-display font-bold text-violet-700 tracking-wide">B2B Deals</span>
                                    </span>
                                )}
                                {showAirbnbBadge && <AirbnbBadge size="md" />}
                            </div>
                            <div className="flex items-center gap-2 text-[14px] md:text-base text-grey-grey_2 max-md:leading-tight">
                                <MapPin className="w-4 h-4" />
                                <span>
                                    {finalCityName}
                                    {hotelData.location_tag && hotelData.location_tag.length > 0 ? ` | ${hotelData.location_tag.join(', ')}` : ''}
                                </span>
                            </div>
                        </div>
                        <div className="text-right flex flex-row items-end gap-3 max-md:pr-[20px]   ">
                            {stayIdForCollection && cityId ? (
                                <div className="flex items-center gap-2 border-[2px] border-primary-default bg-primary-default/90 rounded-full">
                                    <AddToCollectionButton
                                        ariaLabel="Add to collection"
                                        onAddToCollection={handleGuardedAddToCollection}
                                        isShortlisted={isShortlisted}
                                        className="bg-primary-default hover:bg-primary-default/90 border-primary-default"
                                    />
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="mb-8">
                        <div className="md:hidden -mx-4 relative">
                            {/* Slider */}
                            <div
                                ref={sliderRef}
                                onScroll={handleScroll}
                                className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar">
                                {topFiveImages.map((img, index) => (
                                    <div
                                        key={index}
                                        className="snap-center shrink-0 w-full px-4"
                                        onClick={() => setIsGalleryOpen(true)}>
                                        <img
                                            src={img}
                                            alt=""
                                            className="w-full h-[320px] object-cover "
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Dots */}
                            <div className="absolute bottom-4 left-6 flex gap-2">
                                {topFiveImages.map((_, index) => (
                                    <span
                                        key={index}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                            activeIndex === index ? 'bg-natural-white scale-110' : 'bg-natural-white/50'
                                        }`}
                                    />
                                ))}
                            </div>
                            <div className="absolute w-full right-5">
                                <ViewGalleryButton onClick={() => setIsGalleryOpen(true)} />
                            </div>
                            <div className="absolute top-4 right-6 flex items-center gap-2">
                                {stayIdForCollection && (
                                    <AddToCollectionButton
                                        ariaLabel="Add to collection"
                                        isShortlisted={isShortlisted}
                                        onAddToCollection={async () => {
                                            setIsAddToCollectionModalOpen(true)
                                        }}
                                    />
                                )}
                            </div>
                            {/* Show all photos button (inspired by desktop) */}
                        </div>
                        <div className="relative max-md:hidden">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[58vh]">
                                {topFiveImages[0] && (
                                    <div
                                        onClick={() => setIsGalleryOpen(true)}
                                        className="md:col-span-2 overflow-hidden block rounded-l-xl cursor-pointer hover:opacity-90 transition-opacity">
                                        <img
                                            src={topFiveImages[0]}
                                            alt={`${hotelData.hotel_name} 1`}
                                            className="w-full h-full object-cover aspect-video md:aspect-auto"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    {topFiveImages.slice(1, 5).map((image: string, index: number) => (
                                        <div
                                            key={index}
                                            onClick={() => setIsGalleryOpen(true)}
                                            className={`overflow-hidden block cursor-pointer hover:opacity-90 transition-opacity ${index === 1 ? 'rounded-tr-xl' : index === 3 ? 'rounded-br-xl' : ''}`}>
                                            <img
                                                src={image}
                                                alt={`${hotelData.hotel_name} ${index + 2}`}
                                                className="w-full h-full object-cover aspect-4/3"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <ViewGalleryButton onClick={() => setIsGalleryOpen(true)} />
                        </div>
                    </div>
                    <div
                        className="mx-5 mb-0 md:hidden top-0  z-20 bg-natural-white md:pt-8 flex flex-col md:flex-row items-start md:items-end pb-3 justify-between gap-4 md:gap-4"
                        style={{ fontFamily: 'Red Hat Display, ui-sans-serif, system-ui' }}>
                        <div className="flex-1 mt-[-6px]    ">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                <h1 className="text-[18px] font-red-hat-display md:text-3xl font-bold text-header-black max-md:leading-tight">
                                    {hotelData.hotel_name}
                                </h1>
                                {showVerifiedBadge && <VerifiedBadge size="md" />}
                                {showB2bBadge && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200">
                                        <Zap className="w-3 h-3 text-violet-600" />
                                        <span className="text-[0.625rem] font-semibold text-violet-700">B2B Deals</span>
                                    </span>
                                )}
                                {showAirbnbBadge && <AirbnbBadge size="sm" />}
                            </div>
                            <div className="flex items-center gap-2 text-[14px] md:text-base text-grey-1 font-semibold max-md:leading-tight">
                                <MapPin className="w-4 h-4" />
                                <span>
                                    {finalCityName}
                                    {hotelData.location_tag && hotelData.location_tag.length > 0 ? ` | ${hotelData.location_tag.join(', ')}` : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div
                        className="md:hidden"
                        id="pricing-sidebar-mobile">
                        {' '}
                        <div
                            className="flex flex-col gap-8 max-md:px-[20px]"
                            style={{ position: 'sticky', top: 136, height: 'fit-content' }}>
                            <PricingSidebar
                                ref={pricingSidebarMobileRef}
                                hotelData={hotelData}
                                checkIn={checkIn}
                                checkOut={checkOut}
                                affiliateAgodaUrl={affiliateAgodaUrl || undefined}
                                active={isMobile}
                            />
                            <FloatingQuestions
                                hotelData={hotelData}
                                onOpenAssistant={(question) => {
                                    triggerAssistantPrompt(question)
                                }}
                            />
                        </div>
                    </div>
                    <div className="mb-8">
                        {/* What guests are saying row */}
                        <div
                            id="forYouSection"
                            className="md:rounded-2xl border border-feature-card-border bg-white p-4 my-4 mb-10">
                            <div
                                className="max-md:flex max-md:flex-col grid items-start gap-0 md:gap-1 border border-t-0 border-l-0 border-r-0 border-feature-card-border pb-4"
                                style={{
                                    gridTemplateColumns: '80px minmax(0, 1fr)'
                                }}>
                                {/* Left side: logo / image */}
                                <div className="max-md:flex max-md:items-center max-md:flex-row max-md:mb-5 md:flex-col items-start gap-1 w-full md:w-auto shrink-0">
                                    <img
                                        src="/illustrations/rimigos_top_5_view.png"
                                        alt="bubbles"
                                        className="h-6 md:h-12 w-auto"
                                    />
                                    <h2 className="max-md:flex max-md:flex-row font-caveat text-2xl">
                                        Rimigo's
                                        <br className="hidden md:block" />
                                        <div className="block md:hidden mx-0.5" />
                                        Top 5
                                    </h2>
                                </div>

                                {/* Right side: the 5 grid items or skeleton */}
                                <div className="grid grid-cols-5 max-md:flex max-md:flex-nowrap max-md:overflow-x-auto max-md:w-full max-md:overscroll-x-contain scrollbar-hide">
                                    {isReviewProcessing || !rimigoTop5?.length ? (
                                        // Skeleton placeholders while reviews are loading
                                        Array.from({ length: 5 }).map((_, idx) => (
                                            <div
                                                key={`top5-skeleton-${idx}`}
                                                className={`flex items-start md:pt-2 gap-1 md:gap-2 pr-2 md:px-4 max-md:shrink-0 max-md:min-w-[100px] ${idx !== 0 ? 'border-l border-feature-card-border px-2' : ''}`}>
                                                <div className="shrink-0 mt-0.5 w-5 h-5 rounded bg-grey-4/50 animate-pulse" />
                                                <div className="flex flex-col md:gap-2 flex-1">
                                                    <div className="h-4 w-20 rounded bg-grey-4/50 animate-pulse mb-1" />
                                                    <div className="h-4 w-14 rounded bg-grey-4/50 animate-pulse" />
                                                    <div className="h-6 w-16 rounded-lg bg-grey-4/50 animate-pulse mt-1" />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        (rimigoTop5 || []).map((attr: any, idx: number) => {
                                            const ratingLabel = attr.tag?.label || ''
                                            const ratingColor = attr.tag?.color || '#000000'
                                            const Icon = attr.icon ? getFacilityIcon(attr, 20) : null
                                            return (
                                                <div
                                                    key={attr.label}
                                                    className={`flex items-start md:pt-2 gap-1 md:gap-2 pr-2 md:px-4 max-md:shrink-0 max-md:min-w-auto
                                            ${idx !== 0 ? 'border-l border-feature-card-border px-2' : ''}`}
                                                    style={{ fontFamily: 'Red Hat Display, ui-sans-serif, system-ui' }}>
                                                    {Icon && (
                                                        <div
                                                            className="shrink-0 mt-0.5"
                                                            style={{ color: '#101010' }}>
                                                            {Icon}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col md:gap-2 flex-1">
                                                        <div
                                                            className="text-[12px] tracking-[-0.5px] font-red-hat-display leading-4 overflow-hidden font-semibold min-h-8 text-grey-0"
                                                            style={{
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                fontSize: '14px',
                                                            }}>
                                                            {attr.label}
                                                        </div>
                                                        <div
                                                            className="rounded-lg px-3 py-1.5 text-xs font-bold text-white uppercase tracking-wide"
                                                            style={{
                                                                backgroundColor: ratingColor,
                                                                width: 'fit-content'
                                                            }}>
                                                            {ratingLabel}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                            {/* MOBILE REVIEWS */}
                            {hotelData.review_data?.ratings?.top_platforms?.length ? (
                                <div className="md:hidden">
                                    <div className="my-4 border-t border-feature-card-border" />

                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-row gap-3 overflow-x-auto overscroll-x-contain scrollbar-hide">
                                            {hotelData.review_data.ratings.top_platforms.map((platform: any) => (
                                                <div
                                                    key={platform.platform}
                                                    className="flex items-center gap-2 shrink-0 px-3 py-1.5
                                   rounded-[8px] bg-grey-5
                                   border border-feature-card-border">
                                                    <img
                                                        src={platform.logo_url}
                                                        alt={platform.platform}
                                                        className="h-5 w-5 object-cover"
                                                    />

                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[14px] font-semibold text-header-black">
                                                            {platform.rating?.toFixed ? platform.rating.toFixed(1) : platform.rating}
                                                        </span>

                                                        <span className="text-[14px] leading-5 text-grey-2 tracking-[-0.01em] font-medium font-manrope">
                                                            ({formatReviewCount(platform.review_count)})
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : isReviewProcessing ? (
                                <div className="md:hidden">
                                    <div className="my-4 border-t border-feature-card-border" />
                                    <div className="flex flex-row gap-3 overflow-x-auto overscroll-x-contain scrollbar-hide">
                                        {Array.from({ length: 4 }).map((_, idx) => (
                                            <div key={`mobile-platform-skeleton-${idx}`} className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-[8px] bg-grey-5 border border-feature-card-border">
                                                <div className="h-5 w-5 rounded bg-grey-4/50 animate-pulse" />
                                                <div className="flex flex-col gap-1">
                                                    <div className="h-4 w-8 rounded bg-grey-4/50 animate-pulse" />
                                                    <div className="h-3 w-12 rounded bg-grey-4/50 animate-pulse" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {/* DESKTOP REVIEWS */}
                            {hotelData.review_data?.ratings?.top_platforms?.length ? (
                                <div className="pt-4 max-md:hidden flex items-center justify-between gap-4">
                                    <div className="flex flex-wrap gap-3">
                                        {hotelData.review_data.ratings.top_platforms.slice(0, 4).map((p: any) => (
                                            <a
                                                key={p.platform}
                                                href={p.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-2 rounded-full
                               border border-feature-card-border bg-white
                               hover:shadow-sm transition-shadow">
                                                <img
                                                    src={p.logo_url}
                                                    alt={p.platform}
                                                    className="h-5 w-auto object-contain"
                                                />
                                                <span className="text-sm font-semibold text-header-black">
                                                    {p.rating?.toFixed ? p.rating.toFixed(1) : p.rating}
                                                </span>
                                                <span className="text-xs text-grey-grey_2">({formatReviewCount(p.review_count)})</span>
                                            </a>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSeeAllReviewsClick}
                                        className="text-sm font-semibold underline text-header-black
                       whitespace-nowrap flex items-center gap-1 cursor-pointer">
                                        See all reviews <MoveRight className="h-5" />
                                    </button>
                                </div>
                            ) : isReviewProcessing ? (
                                <div className="pt-4 max-md:hidden flex items-center gap-4">
                                    <div className="flex flex-wrap gap-3">
                                        {Array.from({ length: 4 }).map((_, idx) => (
                                            <div key={`desktop-platform-skeleton-${idx}`} className="flex items-center gap-2 px-4 py-2 rounded-full border border-feature-card-border bg-white">
                                                <div className="h-5 w-12 rounded bg-grey-4/50 animate-pulse" />
                                                <div className="h-4 w-6 rounded bg-grey-4/50 animate-pulse" />
                                                <div className="h-3 w-10 rounded bg-grey-4/50 animate-pulse" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Tabs */}

                        <div
                            ref={tabsRef}
                            className="  sticky top-0 md:top-[100px] pt-5 items-center gap-6 z-20 text-sm border border-t-0 border-l-0 border-r-0 border-feature-card-border bg-white">
                            {[
                                { id: 'forYou', label: 'For you', target: 'forYouSection', scrollable: true },
                                { id: 'reviews', label: 'Reviews', target: 'reviewsSection', scrollable: true },
                                { id: 'amenities', label: 'Amenities', target: 'amenitiesSection', scrollable: true },
                                ...(showDealsTab ? [{ id: 'deals', label: 'Rooms', target: null, scrollable: false } as const] : [])
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        // Track PostHog event when deals tab is clicked
                                        if (tab.id === 'deals') {
                                            trackButtonClick({
                                                button_name: 'Deals Tab',
                                                location: 'hotel_detail_page',
                                                extra: {
                                                    zentrumHubId: hotelId,
                                                    trip_id: activeTrip?.trip_id || null,
                                                    traveler_id: user?.id || null
                                                }
                                            })
                                        }

                                        setActiveTab(tab.id as any)
                                        if (tab.scrollable && tab.target) {
                                            const el = document.getElementById(tab.target)
                                            if (el) {
                                                const isMobile = window.innerWidth < 768

                                                if (isMobile) {
                                                    // Find the scrollable container
                                                    const scrollContainer = document.getElementById('hotel-detail-scroll-container')

                                                    if (scrollContainer) {
                                                        const offset = 180 // Adjust based on your header + tab bar height
                                                        const elementPosition = el.offsetTop
                                                        const offsetPosition = elementPosition - offset

                                                        scrollContainer.scrollTo({
                                                            top: offsetPosition,
                                                            behavior: 'smooth'
                                                        })
                                                    }
                                                } else {
                                                    // Desktop: use default behavior
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                }
                                            }
                                        }
                                        const container = tabsRef.current
                                        if (container) {
                                            const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
                                            const idx = ['forYou', 'reviews', 'amenities', 'deals'].indexOf(tab.id)
                                            const btn = buttons[idx]
                                            if (btn) {
                                                const rect = btn.getBoundingClientRect()
                                                const containerRect = container.getBoundingClientRect()
                                                setUnderlineStyle({ left: rect.left - containerRect.left + 8, width: rect.width - 16 })
                                            }
                                        }
                                    }}
                                    className={`px-2 pb-3 cursor-pointer`}
                                    style={{
                                        color: activeTab === tab.id ? 'var(--primary-indigo, #7011F6)' : 'var(--grey-2, #747474)',
                                        fontFamily: 'Manrope',
                                        fontSize: '16px',
                                        lineHeight: '20px',
                                        letterSpacing: '-0.32px',
                                        fontWeight: activeTab === tab.id ? (700 as any) : (600 as any)
                                    }}>
                                    <div>{tab.label}</div>
                                </button>
                            ))}
                            <div
                                className="absolute bottom-0 h-[2px] transition-all duration-300 ease-out"
                                style={{
                                    left: underlineStyle.left ?? 8,
                                    width: underlineStyle.width ?? 40,
                                    backgroundColor: 'var(--primary-indigo, #7011F6)'
                                }}
                            />
                        </div>

                        {/* Conditional Content Rendering */}
                        {activeTab === 'deals' && showDealsTab ? (
                            <div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                    <div className="md:col-span-2  ">
                                        <DealSection
                                            checkin={checkIn}
                                            checkout={checkOut}
                                            dealResponse={accommodationDealResult}
                                            isLoading={isDealResultLoading}
                                        />
                                    </div>
                                    <div className="hidden md:block">
                                        <PricingSidebar
                                            ref={pricingSidebarRef}
                                            hotelData={hotelData}
                                            checkIn={checkIn}
                                            checkOut={checkOut}
                                            affiliateAgodaUrl={affiliateAgodaUrl || undefined}
                                            active={!isMobile}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                    <div className="md:col-span-2 mt-5 ">
                                        <div id="forYouSection">
                                            {isReviewProcessing ? (
                                                <div className="space-y-4">
                                                    <div className="rounded-2xl border border-feature-card-border bg-white p-6">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="h-5 w-5 rounded bg-grey-4/50 animate-pulse" />
                                                            <div className="h-5 w-32 rounded bg-grey-4/50 animate-pulse" />
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="h-4 w-full rounded bg-grey-4/50 animate-pulse" />
                                                            <div className="h-4 w-3/4 rounded bg-grey-4/50 animate-pulse" />
                                                            <div className="h-4 w-5/6 rounded bg-grey-4/50 animate-pulse" />
                                                        </div>
                                                    </div>
                                                    <div className="rounded-2xl border border-feature-card-border bg-white p-6">
                                                        <div className="h-5 w-40 rounded bg-grey-4/50 animate-pulse mb-4" />
                                                        <div className="h-48 w-full rounded-xl bg-grey-4/50 animate-pulse" />
                                                    </div>
                                                    <p className="text-sm text-grey-grey_2 text-center animate-pulse">
                                                        Generating personalised insights...
                                                    </p>
                                                </div>
                                            ) : (
                                                <ForYouSection
                                                    hotelData={hotelData}
                                                    nearbyTab={nearbyTab}
                                                    setNearbyTab={setNearbyTab}
                                                    nearbySelectedIdx={nearbySelectedIdx}
                                                    setNearbySelectedIdx={setNearbySelectedIdx}
                                                    onOpenAssistant={(question) => {
                                                        triggerAssistantPrompt(question)
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div
                                        id="pricing-sidebar"
                                        className="hidden md:flex flex-col gap-8"
                                        style={{ position: 'sticky', top: 136, height: 'fit-content' }}>
                                        <PricingSidebar
                                            ref={pricingSidebarRef}
                                            hotelData={hotelData}
                                            checkIn={checkIn}
                                            checkOut={checkOut}
                                            affiliateAgodaUrl={affiliateAgodaUrl || undefined}
                                            active={!isMobile}
                                        />
                                        <FloatingQuestions
                                            hotelData={hotelData}
                                            onOpenAssistant={(question) => {
                                                triggerAssistantPrompt(question)
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="border-t border-feature-card-border my-4" />
                                <div
                                    id="reviewsSection"
                                    className="max-md:px-[20px]">
                                    {isReviewProcessing ? (
                                        <div className="py-6 space-y-3">
                                            <div className="h-6 w-48 rounded bg-grey-4/50 animate-pulse" />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    {Array.from({ length: 3 }).map((_, idx) => (
                                                        <div key={`review-pos-skeleton-${idx}`} className="flex items-start gap-2">
                                                            <div className="h-4 w-4 rounded-full bg-grey-4/50 animate-pulse shrink-0 mt-0.5" />
                                                            <div className="h-4 w-full rounded bg-grey-4/50 animate-pulse" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="space-y-2">
                                                    {Array.from({ length: 3 }).map((_, idx) => (
                                                        <div key={`review-neg-skeleton-${idx}`} className="flex items-start gap-2">
                                                            <div className="h-4 w-4 rounded-full bg-grey-4/50 animate-pulse shrink-0 mt-0.5" />
                                                            <div className="h-4 w-full rounded bg-grey-4/50 animate-pulse" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <ReviewsHighlightsSection
                                            data={hotelData.review_data}
                                            attributes={hotelData.attributes || []}
                                        />
                                    )}
                                </div>
                                <div className="border-t border-feature-card-border max-md:my-8   my-4" />
                                <div
                                    id="amenitiesSection"
                                    className="max-md:px-[20px]">
                                    {isReviewProcessing ? (
                                        <div className="py-6 space-y-3">
                                            <div className="h-6 w-36 rounded bg-grey-4/50 animate-pulse" />
                                            <div className="flex flex-wrap gap-2">
                                                {Array.from({ length: 8 }).map((_, idx) => (
                                                    <div key={`amenity-skeleton-${idx}`} className="h-8 w-24 rounded-full bg-grey-4/50 animate-pulse" />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <AmenitiesSection amenities={hotelData.amenities || []} />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <PhotoGallery
                    hotelData={hotelData}
                    isOpen={isGalleryOpen}
                    onClose={() => setIsGalleryOpen(false)}
                />
                
                {isRimigoInternal && zentrumHubId && (
                <AddToDatabaseModal
                    isOpen={isAddToDatabaseModalOpen}
                    onClose={() => setIsAddToDatabaseModalOpen(false)}
                    hotelData={{
                    hotel_name: hotelData.hotel_name,
                    zentrum_hub_id: zentrumHubId,
                    images: hotelData?.images?.[0]?.links?.[0],
                    city: hotelData.city
                    }}
                    cityId={resolvedCityId || cityId}
                    cityName={cityName}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['accommodationExistence', zentrumHubId] })
                    }}
                />
                )}

                {/* Add to Collection Modal */}
                {zentrumHubId && (
                    <AddToCollectionModal
                        isOpen={isAddToCollectionModalOpen}
                        onClose={() => setIsAddToCollectionModalOpen(false)}
                        experienceId={stayIdForCollection}
                        experienceName={hotelData.hotel_name || 'Hotel'}
                        entityType="stays"
                        stayImageUrl={stayImageUrl}
                        zentrumHubId={zentrumHubId || undefined}
                        locationTag={stayLocationTag}
                        cityId={cityId}
                        cityName={cityName}
                        accommodationId={accommodationDbId || accommodationIdParam || undefined}
                        checkIn={checkIn || undefined}
                        checkOut={checkOut || undefined}
                        isVerified={effectiveIsVerified}
                        isB2bDealAvailable={effectiveIsB2bDealAvailable}
                        onSuccess={(verificationUpdate) => {
                            if (verificationUpdate) {
                                if (verificationUpdate.is_verified !== undefined) setLocalIsVerified(verificationUpdate.is_verified)
                                if (verificationUpdate.is_b2b_deal_available !== undefined) setLocalIsB2bDealAvailable(verificationUpdate.is_b2b_deal_available)
                            }
                        }}
                    />
                )}
            </div>
        </>
    )
}

export default HotelDetailPage
