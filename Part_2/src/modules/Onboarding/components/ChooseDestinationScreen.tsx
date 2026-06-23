import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowLeft, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/shared/ButtonNew'
import Typography from '@/components/shared/Typography'
import { SearchDestinationCardData } from '@/lib/api/OnboardingApi'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getPrioritizedCountriesToSearchDestinationCardData } from '../adapters/getPrioritizedCountriesAdapter'
import {
    createBasicTrip,
    CreateBasicTripDataResponse,
    getTravelerProfileStatus,
    TravelerProfileStatus,
    getBasicTripData,
    GetBasicTripDataDataResponse
} from '../api/onboardingAPI'
import { useDebounce } from '@/hooks/useDebounce'
import { PopularDestination } from './PopularDestination'
import { SafeImage } from './SearchDestinationCard'
import StripAnimation from './StripAnimation'
import { TravelerPreviousTrips } from './TravelerPreviousTrips'
import { TokenStorage } from '@/lib/api/tokenStorage'

import { MAX_WIDTH } from '../constants/width'
import CustomShimmer from '@/components/shared/Shimmer'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { toast } from 'sonner'
import { LeadGenStorage } from '../storage/leadGenStorage'
import { updateTripPartial, UpdateTripData, UpdateTripDataResponse } from '@/api/trip/tripAPI'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import ReactHelmet from '@/components/shared/React-Helmet/ReactHelmet'
import { WEBSITE_CONFIG } from '@/constants/websiteConfig'
import { OrDivider } from '@/components/shared/OrDivider'
import { useCountries } from '@/hooks/useCountries'
import { LEADGEN_V2_BUTTON_PAGE } from '@/constants/posthogEvents'

const createTripPath = (trip_id: string, searchParamsFromUrl: URLSearchParams, destination_finalized?: boolean) =>
    `/trip/${trip_id}/create/select-group-type/?${searchParamsFromUrl.toString()}&destination_finalized=${destination_finalized ? true : false}`
const createProfileUpdatePath = (trip_id: string, searchParamsFromUrl: URLSearchParams, destination_finalized?: boolean) =>
    `/profile/update/?redirectTo=/trip/${trip_id}/create/select-group-type/?${searchParamsFromUrl.toString()}&destination_finalized=${destination_finalized ? true : false}`

interface ChooseDestinationScreenProps {
    /** When true, skip auth-dependent logic (login happens later) */
    deferredLogin?: boolean
    /** Called with selected destinations when deferredLogin is true */
    onDeferredSubmit?: (destinations: SearchDestinationCardData[]) => void
    /** Called when user skips destination selection in deferredLogin mode */
    onDeferredSkip?: () => void
    /** Pre-selected destinations (used to restore state when navigating back) */
    defaultDestinations?: SearchDestinationCardData[]
    /** Custom back button handler (e.g. for single-route wizard) */
    onBack?: () => void
}

export const ChooseDestinationScreen = ({
    deferredLogin = false,
    onDeferredSubmit,
    onDeferredSkip,
    defaultDestinations,
    onBack
}: ChooseDestinationScreenProps = {}) => {
    const [isSearching, setIsSearching] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDestinations, setSelectedDestinations] = useState<SearchDestinationCardData[]>(defaultDestinations ?? [])
    const [searchParams, setSearchParams] = useSearchParams()
    const [isStartPlanningLoading, setIsStartPlanningLoading] = useState(false)
    const [travelerIdFromStore, setTravelerIdFromStore] = useState<string | null>(null)
    const [currentActiveLeadGenTripIdFromStorage, setCurrentActiveLeadGenTripIdFromStorage] = useState<{ trip_id: string } | null>(null)
    const [isCurrentActiveLeadGenTripIdFromStorageLoading, setIsCurrentActiveLeadGenTripIdFromStorageLoading] = useState(false)
    const debouncedSearch = useDebounce(searchTerm, 300)

    // capture utm_medium from the url
    const [searchParamsFromUrl] = useSearchParams()

    const navigate = useNavigate()
    const travelerTripsContext = useOptionalTravelerTrips()

    // get current active lead gen trip id from storage (skip in deferred login mode)
    useEffect(() => {
        if (deferredLogin) return
        ;(async () => {
            setIsCurrentActiveLeadGenTripIdFromStorageLoading(true)
            const leadGenData = await LeadGenStorage.getLeadGenData()

            if (leadGenData) {
                try {
                    const parsedData = JSON.parse(leadGenData)

                    setCurrentActiveLeadGenTripIdFromStorage(parsedData)
                } catch (error) {
                    toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
                    setCurrentActiveLeadGenTripIdFromStorage(null)
                }
            } else {
                setCurrentActiveLeadGenTripIdFromStorage(null)
            }

            setIsCurrentActiveLeadGenTripIdFromStorageLoading(false)
        })()
    }, [deferredLogin])

    // get traveler id from token storage (skip in deferred login mode)
    useEffect(() => {
        if (deferredLogin) return
        const fetchTravelerId = async () => {
            try {
                const userInfo = await TokenStorage.getUserInfo()
                setTravelerIdFromStore(userInfo.traveler_id)
            } catch (error) {
                // Failed to get traveler id
                toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
            }
        }
        fetchTravelerId()
    }, [deferredLogin])

    // Initialize search term from URL on component mount
    useEffect(() => {
        const urlSearchTerm = searchParams.get('search')
        if (urlSearchTerm) {
            setSearchTerm(urlSearchTerm)
            setIsSearching(true)
        }
    }, [searchParams])

    // Update URL when search term changes
    useEffect(() => {
        const currentSearch = searchParams.get('search')
        if (searchTerm !== currentSearch) {
            const newSearchParams = new URLSearchParams(searchParams)
            if (searchTerm.trim()) {
                newSearchParams.set('search', searchTerm)
            } else {
                newSearchParams.delete('search')
            }
            setSearchParams(newSearchParams, { replace: true })
        }
    }, [searchTerm, searchParams, setSearchParams])

    const { 
        allCountries, 
        liveCountries, 
        comingSoonCountries,
        isLoading:isLiveCountriesLoading,
        isError:isLiveCountriesError
    } = useCountries({ 
        shouldUsePrioritized: true 
    })

    // Filter live countries for search (client-side filtering)
    const searchResults = allCountries?.filter((country) => country.country_name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    const isSearchDestinationsLoading = false // No API call needed, just filtering
    const isSearchDestinationsError = false

    const {
        data: travelerProfileStatus,
        isLoading: isTravelerProfileStatusLoading,
        isError: isTravelerProfileStatusError
    } = useQuery<TravelerProfileStatus>({
        queryKey: ['travelerProfileStatus', travelerIdFromStore],
        queryFn: () => getTravelerProfileStatus(travelerIdFromStore!),
        enabled: !deferredLogin && !!travelerIdFromStore
    })

    // Fetch trip data for prepopulation
    const { data: tripData } = useQuery<GetBasicTripDataDataResponse>({
        queryKey: ['basicTripData', currentActiveLeadGenTripIdFromStorage?.trip_id],
        queryFn: () => getBasicTripData(currentActiveLeadGenTripIdFromStorage!.trip_id),
        enabled: !deferredLogin && !!currentActiveLeadGenTripIdFromStorage?.trip_id
    })

    // Transform API data using adapter
    const liveDestinations = getPrioritizedCountriesToSearchDestinationCardData(liveCountries)
    const comingSoonDestinations = getPrioritizedCountriesToSearchDestinationCardData(comingSoonCountries) 

    const searchLiveResults = searchResults?.filter(c => (c).is_live) ?? []
    const searchComingSoonResults = searchResults?.filter(c => !(c).is_live) ?? []

    const liveSearchDestinations = getPrioritizedCountriesToSearchDestinationCardData(searchLiveResults)
    const comingSoonSearchDestinations = getPrioritizedCountriesToSearchDestinationCardData(searchComingSoonResults)

    // const { data: pairDestinations, isLoading: isPairDestinationsLoading } = useQuery<SearchDestinationCardData[]>({
    //     queryKey: ['pairDestinations', searchTerm],
    //     queryFn: () => getPairedDestinationData(),
    //     enabled: selectedDestinations.length > 0
    // })

    // const { data: suggestions, isLoading: isSuggestionsLoading } = useQuery<SearchDestinationCardData[]>({
    //     queryKey: ['searchSuggestions', searchTerm],
    //     queryFn: () => getSearchSuggestionData(),
    //     enabled: !!searchTerm && (searchDestinations?.length ?? 0) === 0
    // })

    // Prepopulate selected destinations if final_destination_countries are present (skip in deferred login mode)
    useEffect(() => {
        if (deferredLogin) return
        if (tripData?.data.final_destination_countries && tripData.data.final_destination_countries.length > 0 && allCountries) {
            // Use live countries data to find matching ones
            const destinationData = getPrioritizedCountriesToSearchDestinationCardData(allCountries)

            // Filter destinations that match the saved country IDs
            const prepopulatedDestinations = tripData.data
                .final_destination_countries!.map((countryId) => destinationData.find((dest) => dest.id === countryId))
                .filter(Boolean) as SearchDestinationCardData[]

            if (prepopulatedDestinations.length > 0) {
                setSelectedDestinations(prepopulatedDestinations)
            }
        }
    }, [tripData, allCountries])

    const handleFocus = () => setIsSearching(true)
    const handleBack = () => {
        setIsSearching(false)
        setSearchTerm('')
    }

    const selectedIds = useMemo(() => new Set(selectedDestinations.map((d) => d.id)), [selectedDestinations])

    const handleSelectDestination = (dest: SearchDestinationCardData) => {
        if (selectedIds.has(dest.id)) {
            // Already selected → deselect
            setSelectedDestinations((prev) => prev.filter((d) => d.id !== dest.id))
        } else {
            setSelectedDestinations((prev) => [...prev, dest])
        }
        setSearchTerm('')
    }

    const handleRemoveDestination = (id: string) => {
        setSelectedDestinations((prev) => prev.filter((d) => d.id !== id))
    }

    const setCurrentActiveLeadGenTripIdInStorage = async (tripId: string) => {
        await LeadGenStorage.setLeadGenData({ trip_id: tripId })
    }

    const handleStartPlanning = async () => {
        // Deferred login mode: track event and pass destinations to parent, skip trip creation
        if (deferredLogin) {
            trackButtonClickCustom?.({
                buttonPage: LEADGEN_V2_BUTTON_PAGE,
                buttonName: 'destination_next_button',
                buttonAction: 'choose_destination_name_submit',
                extra: {
                    destination_name: selectedDestinations.map((d) => d.title)
                }
            })
            onDeferredSubmit?.(selectedDestinations)
            return
        }

        if (isTravelerProfileStatusError || isTravelerProfileStatusLoading) {
            toast.error('Traverler Profile Getting error')
            return
        }

        if (!travelerIdFromStore) {
            toast.error('Traveler ID is not found')
            return
        }

        setIsStartPlanningLoading(true)
        // handle create trip (v1 flow only — deferred flow tracks above and returns early)
        trackButtonClickCustom?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'start_planning',
            buttonAction: 'choose_destination_name_submit',
            extra: {
                destination_name: selectedDestinations.map((d) => d.title)
            }
        })
        try {
            let data: CreateBasicTripDataResponse | UpdateTripDataResponse = {} as CreateBasicTripDataResponse | UpdateTripDataResponse

            // payload, final destionation countries
            const payload = {
                interested_destinations: selectedDestinations.map((d) => d.id),
                final_destination_countries: selectedDestinations.map((d) => d.id),
                utm_medium: searchParamsFromUrl.get('utm_medium') || '',
                trip_source: searchParamsFromUrl.get('utm_source') || '',
                destination_finalized: true
            }
            let tripId = ''
            let is_trip_updated = false

            try {
                if (currentActiveLeadGenTripIdFromStorage?.trip_id) {
                    data = await updateTripPartial(currentActiveLeadGenTripIdFromStorage.trip_id, payload)
                    await setCurrentActiveLeadGenTripIdInStorage(data.data.trip_id)
                    is_trip_updated = true
                    tripId = data.data.trip_id
                } else {
                    data = await createBasicTrip(travelerIdFromStore, payload)
                    await setCurrentActiveLeadGenTripIdInStorage(data.data.trip_id)
                    tripId = data.data.trip_id
                }
            } catch (error) {
                toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
                return
            } finally {
                setIsStartPlanningLoading(false)
            }

            // Mark the newly created/updated trip as active
            if (travelerTripsContext?.updateActiveTrip) {
                await travelerTripsContext.updateActiveTrip(tripId, { force: true, replaceOnly: true })
            }

            if (travelerProfileStatus?.status === true) {
                // TODO: Remove the toast
                if (is_trip_updated) {
                    toast.success('Trip updated successfully')
                } else {
                    toast.success('Trip created successfully')
                }
                navigate(createTripPath(tripId, searchParamsFromUrl, true))
            } else {
                // TODO: Remove the toast
                toast.info('Please update your profile to continue')
                navigate(createProfileUpdatePath(tripId, searchParamsFromUrl, true))
            }
            setIsStartPlanningLoading(false)
        } catch (error) {
            toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        } finally {
            setIsStartPlanningLoading(false)
        }
    }
    const { trackButtonClickCustom } = usePostHog()

    // handle skip button - creates trip without destination or updates existing one
    const handlCTAAssistant = async () => {
        // Deferred login mode: skip without creating trip
        if (deferredLogin) {
            trackButtonClickCustom?.({
                buttonPage: LEADGEN_V2_BUTTON_PAGE,
                buttonName: 'skip_destination',
                buttonAction: 'click',
            })
            onDeferredSkip?.()
            return
        }

        if (isTravelerProfileStatusError || isTravelerProfileStatusLoading) {
            toast.error('Traverler Profile Getting error')
            return
        }

        if (!travelerIdFromStore) {
            toast.error('Traveler ID is not found')
            return
        }

        trackButtonClickCustom?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'skip_destination',
            buttonAction: 'click',
        })

        setIsStartPlanningLoading(true)

        try {
            let tripId = ''

            // If there's an existing trip, update it; otherwise create a new one
            if (currentActiveLeadGenTripIdFromStorage?.trip_id) {
                const payload: UpdateTripData = {
                    name: '',
                    interested_destinations: [],
                    final_destination_countries: []
                }
                const data = await updateTripPartial(currentActiveLeadGenTripIdFromStorage.trip_id, payload)
                await setCurrentActiveLeadGenTripIdInStorage(data.data.trip_id)
                tripId = data.data.trip_id
            } else {
                const payload = {
                    utm_medium: searchParamsFromUrl.get('utm_medium') || '',
                    trip_source: searchParamsFromUrl.get('utm_source') || '',
                    destination_finalized: false,
                    final_destination_countries: [],
                    interested_destinations: []
                }
                const data = await createBasicTrip(travelerIdFromStore, payload)
                await setCurrentActiveLeadGenTripIdInStorage(data.data.trip_id)
                tripId = data.data.trip_id
            }

            // Mark the trip as active (replaceOnly: true prevents page reload)
            if (travelerTripsContext?.updateActiveTrip) {
                await travelerTripsContext.updateActiveTrip(tripId, { force: true, replaceOnly: true })
            }
            if (travelerProfileStatus?.status === true) {
                navigate(createTripPath(tripId, searchParamsFromUrl, false))
            } else {
                navigate(createProfileUpdatePath(tripId, searchParamsFromUrl, false))
            }
        } catch (error) {
            toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        } finally {
            setIsStartPlanningLoading(false)
        }
    }

    if (!deferredLogin && isCurrentActiveLeadGenTripIdFromStorageLoading) {
        return null
    }

    // Calculate trips with destinations once (empty in deferred login mode)
    const trips = deferredLogin ? [] : (travelerTripsContext?.tripsData?.trips ?? [])
    const tripsWithDestinations = trips.filter((trip) => trip.final_destination_countries?.length > 0)
    const isTripsLoading = deferredLogin ? false : (travelerTripsContext?.isLoading ?? false)

    return (
        <>
            <ReactHelmet title={`Rimigo | Create Trip`} />
            <div className="flex relative flex-col w-full min-h-[100dvh] bg-gray-100 pb-20 md:pb-0">
                <div
                    className="flex flex-col h-full items-center w-full py-6 pb-10 overflow-y-auto  mx-auto  "
                    style={{ scrollbarWidth: 'none' }}>
                    {/* Header */}
                    {onBack && (
                        <div className="w-full px-[32px] pt-2" style={{ maxWidth: `${MAX_WIDTH}px` }}>
                            <button onClick={onBack} className="w-10 h-10 bg-grey-4 cursor-pointer rounded-full flex justify-center items-center">
                                <ArrowLeft size={24} className="text-gray-900" />
                            </button>
                        </div>
                    )}

                    <div className="relative z-10 w-full">
                        <StripAnimation />
                    </div>

                    {/* User previous trips */}
                    <TravelerPreviousTrips
                        tripsWithDestinations={tripsWithDestinations}
                        isLoading={isTripsLoading}
                        containerClassname='px-[30px] md:px-[25px]'
                    />

                    <div
                        className={`flex-1  flex flex-col items-center px-[32px] pb-6`}
                        style={{
                            maxWidth: `${MAX_WIDTH}px`,
                            width: '100%'
                        }}>
                        {/* Gradient OR - only show when trips with destinations are present */}
                        {tripsWithDestinations.length > 0 && <OrDivider className="my-4" />}
                        {(!isSearching || window.innerWidth >= 768) && (
                            <div className={clsx('flex flex-col w-full', isSearching ? 'hidden md:flex' : 'flex')}>
                                <Typography
                                    textAlign="left"
                                    size="12"
                                    weight="extrabold"
                                    family="redhat"
                                    color="grey-2">
                                    LET'S BEGIN
                                </Typography>

                                <Typography
                                    textAlign="left"
                                    size="24"
                                    weight="semibold"
                                    family="redhat"
                                    color="grey-0">
                                   Where would you like to <br /> travel next?
                                </Typography>
                            </div>
                        )}

                        <div className={`w-full`}>
                            <div className={clsx('flex flex-col w-full', isSearching ? 'py-0 md:py-[32px]' : 'py-[32px]')}>
                                {/* Search Box */}
                                <div
                                    className={clsx(
                                        'flex items-center w-full gap-2 bg-natural-white border rounded-xl p-[16px]',
                                        selectedDestinations.length > 0 ? 'py-4 shadow-md border-gray-300' : 'h-14 border-gray-200',
                                        isSearching ? 'border-gray-700 shadow-md' : ''
                                    )}
                                    style={{ boxShadow: '0px 2px 8px 0px var(--color-grey-4)' }}>
                                    {isSearching ? (
                                        <button
                                            onClick={handleBack}
                                            className="cursor-pointer">
                                            <ArrowLeft
                                                size={20}
                                                className="text-grey-0"
                                            />
                                        </button>
                                    ) : selectedDestinations.length === 0 ? (
                                        <Search
                                            size={20}
                                            className="text-grey-2"
                                        />
                                    ) : null}
                                    <div className="flex flex-wrap items-center gap-2 w-full">
                                        {selectedDestinations.map((d) => (
                                            <div
                                                key={d.id}
                                                className="flex items-center gap-2 p-2 border rounded-full border-grey-4">
                                                <SafeImage
                                                    src={d.imageUrl}
                                                    alt={d.title}
                                                    className="w-6 h-6 rounded-sm"
                                                />
                                                <Typography
                                                    textAlign="left"
                                                    weight="semibold"
                                                    size="16"
                                                    family="redhat"
                                                    color="grey-0">
                                                    {d.title}
                                                </Typography>
                                                <button
                                                    onClick={() => handleRemoveDestination(d.id)}
                                                    className="cursor-pointer">
                                                    <X
                                                        size={20}
                                                        className="text-grey-0"
                                                    />
                                                </button>
                                            </div>
                                        ))}

                                        <input
                                            type="text"
                                            placeholder={selectedDestinations.length > 0 ? '' : WEBSITE_CONFIG.COUNTRY_SEARCH_PLACEHOLDER}
                                            value={searchTerm}
                                            onFocus={handleFocus}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="flex-grow h-10 outline-none bg-transparent text-grey-0 placeholder-grey-2 min-w-[120px]"
                                        />
                                    </div>
                                </div>

                                {/* Search Results */}
                                {isSearching && searchTerm.length > 0 && (
                                    <div className="flex flex-col w-full gap-4 mt-[32px]">
                                        {/* Loading state with shimmer */}
                                        {isSearchDestinationsLoading && (
                                            <div className="flex flex-col gap-4 w-full">
                                                {Array.from({ length: 5 }).map((_, index) => (
                                                    <CustomShimmer
                                                        key={index}
                                                        height={88}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        {/* Error state */}
                                        {isSearchDestinationsError && (
                                            <div className="flex flex-col gap-4 border-b border-gray-300 pb-4">
                                                <Typography
                                                    size="12"
                                                    weight="semibold"
                                                    family="redhat"
                                                    color="secondary-red">
                                                    Failed to load search results. Please try again.
                                                </Typography>
                                            </div>
                                        )}
                                        {/* Search results */}
                                        {!isSearchDestinationsLoading && !isSearchDestinationsError && (
                                            <>
                                                {/* RESULTS FOUND */}
                                                {searchTerm &&
                                                    (liveSearchDestinations.length > 0 ||
                                                        comingSoonSearchDestinations.length > 0) && (
                                                        <>
                                                            {liveSearchDestinations.length > 0 && (
                                                                <PopularDestination
                                                                    title="POPULAR DESTINATIONS"
                                                                    destinations={liveSearchDestinations}
                                                                    isLoading={false}
                                                                    error={null}
                                                                    onSelectDestination={handleSelectDestination}
                                                                    selectedIds={selectedIds}
                                                                />
                                                            )}

                                                            {comingSoonSearchDestinations.length > 0 && (
                                                                <PopularDestination
                                                                    title="COMING SOON"
                                                                    destinations={comingSoonSearchDestinations}
                                                                    isLoading={false}
                                                                    error={null}
                                                                    onSelectDestination={handleSelectDestination}
                                                                    selectedIds={selectedIds}
                                                                />
                                                            )}
                                                        </>
                                                    )}
                                                {/* NO RESULTS */}
                                                {searchTerm &&
                                                    liveSearchDestinations.length === 0 &&
                                                    comingSoonSearchDestinations.length === 0 && (
                                                        <div className="flex flex-col gap-[32px]">
                                                            <div className="border-b border-gray-300 pb-[32px] flex items-center justify-center">
                                                                <Typography
                                                                    size="12"
                                                                    textAlign="center"
                                                                    weight="semibold"
                                                                    family="redhat"
                                                                    color="grey-2">
                                                                    We don't support this destination yet.
                                                                </Typography>
                                                            </div>
                                                        </div>
                                                    )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Paired Destinations with shimmer loading
                            {selectedDestinations.length > 0 && (
                                <div className="flex flex-col w-full gap-5 mt-[48px]">
                                <div className="flex flex-col gap-1">
                                <Typography
                                textAlign="left"
                                size="12"
                                weight="bold"
                                family="redhat"
                                color="grey-1">
                                OTHER POPULAR DESTINATIONS
                                </Typography>
                                <Typography
                                textAlign="left"
                                size="12"
                                weight="semibold"
                                family="redhat"
                                color="grey-2">
                                Explore more amazing places
                                </Typography>
                                </div>
                                
                                {isPairDestinationsLoading && (
                                    <div className="flex flex-col gap-4">
                                    {Array.from({ length: 4 }).map((_, index) => (
                                        <CustomShimmer
                                        key={index}
                                        height={88}
                                        />
                                        ))}
                                        </div>
                                        )}
                                        
                                        {!isPairDestinationsLoading &&
                                        filterSelected(pairDestinations).map((s) => (
                                            <SearchDestinationCard
                                            key={s.id}
                                            imageSource={{ uri: s.imageUrl }}
                                            title={s.title}
                                            onPress={() => handleSelectDestination(s)}
                                            />
                                            ))}
                                            </div>
                                            )} */}

                                {!searchTerm && (
                                <>
                                    {liveDestinations.length > 0 && (
                                    <PopularDestination
                                        title="Popular international countries"
                                        destinations={liveDestinations}
                                        isLoading={isLiveCountriesLoading}
                                        error={isLiveCountriesError ? new Error('Failed to load popular destinations') : null}
                                        onSelectDestination={handleSelectDestination}
                                        selectedIds={selectedIds}
                                    />
                                    )}

                                    {comingSoonDestinations.length > 0 && (
                                        <PopularDestination
                                            title="Coming soon"
                                            destinations={comingSoonDestinations}
                                            isLoading={false}
                                            error={null}
                                            onSelectDestination={handleSelectDestination}
                                            selectedIds={selectedIds}
                                        />
                                    )}
                                </>
                            )}

                            </div>
                        </div>
                    </div>
                </div>
                {/* Fixed Start Planning Button */}
                {/* //selectedDestinations.length */}
                <div className="fixed bottom-0 left-0 w-full lg:absolute lg:bottom-0 bg-natural-white z-50 flex justify-center px-4">
                    <div
                        className="w-full flex flex-row gap-4 py-4"
                        style={{ maxWidth: `${MAX_WIDTH}px` }}>
                        <Button
                            variant="secondary"
                            title={isStartPlanningLoading ? 'CREATING TRIP...' : 'SKIP'}
                            onClick={handlCTAAssistant}
                            className="w-full bg-grey-0"
                            buttonColor={{
                                enabled: 'bg-white border border-grey-0',
                                disabled: 'bg-white border border-grey-0 opacity-50'
                            }}
                            disabled={selectedDestinations.length != 0}
                            textStyle="text-grey-0 text-[14px] leading-[18px]"
                            loading={isStartPlanningLoading && selectedDestinations.length === 0}
                        />
                        <Button
                            variant="secondary"
                            title={
                                isStartPlanningLoading ? 'CREATING TRIP...' : currentActiveLeadGenTripIdFromStorage?.trip_id ? 'NEXT' : 'NEXT' // instead of start planning
                            }
                            onClick={handleStartPlanning}
                            disabled={selectedDestinations.length === 0}
                            className="w-full"
                            loading={isStartPlanningLoading && selectedDestinations.length != 0}
                        />
                    </div>
                    {/* Continue Planning Button */}
                    {/* {selectedDestinations.length !== 0 &&
                    currentActiveLeadGenTripIdFromStorage?.trip_id !== null &&
                    currentActiveLeadGenTripIdFromStorage?.trip_id !== undefined && (
                        <div
                        className="w-1/5 pb-8 pt-4"
                        style={{ maxWidth: `${MAX_WIDTH}px` }}>
                    
                            <Button
                                disabled={isStartPlanningLoading}
                                title={isStartPlanningLoading ? 'Creating trip...' : 'Continue planning'}
                                onClick={handleContinuePlanning}
                                className="w-full"
                                loading={isStartPlanningLoading}
                            />
                        </div>
                    )} */}
                </div>
            </div>
        </>
    )
}
