import { useCallback, useEffect, useState, useRef } from 'react'
import TripPreferenceStepLayout from './TripPreferenceStepLayout'
import { Search, X, ArrowLeft, TrendingUp } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import Typography from '@/components/shared/Typography'
import CustomShimmer from '@/components/shared/Shimmer'
import clsx from 'clsx'
import { WEBSITE_CONFIG } from '@/constants/websiteConfig'
import { LocationResponse } from '@/modules/Onboarding/api'
import { FERRIS_WHEEL_ICON } from '@/constants/thiingsIcons'
import { DividerLine } from '@/components/DividerLine'
import { useCountries } from '@/hooks/useCountries'
import { useUserInfo } from '@/hooks/useUserInfo'
import { useTravelerTripsAPI } from '@/hooks/trips/useTravelerTripsAPI'
import { TravelerPreviousTrips } from '@/modules/Onboarding/components/TravelerPreviousTrips'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

export interface TripPreferenceDestinationResult {
    countries: string[]
}

interface TripPreferenceDestinationStepProps {
    flowType: 'create' | 'edit'
    initialCountries?: { id: string; name: string }[]
    onNextStep?: (result: TripPreferenceDestinationResult) => void
    onSave?: (result: TripPreferenceDestinationResult) => void
    currentStep?: number
    totalSteps?: number
    onClose?: () => void
    isSaving?: boolean
}

interface DestinationCardData {
    id: string
    name: string
    imageUrl?: string
}

const SafeImage = ({ src, alt, className }: { src?: string; alt: string; className?: string }) => {
    const fallback = FERRIS_WHEEL_ICON
    const [imgSrc, setImgSrc] = useState(src && src.trim() !== '' ? src : fallback)

    useEffect(() => {
        if (src && src.trim() !== '') {
            setImgSrc(src)
        } else {
            setImgSrc(fallback)
        }
    }, [src])

    const handleError = () => {
        if (imgSrc !== fallback) setImgSrc(fallback)
    }

    return (
        <img
            src={imgSrc}
            alt={alt}
            className={className}
            onError={handleError}
        />
    )
}

const DestinationCard = ({ imageUrl, title, onPress }: { imageUrl?: string; title: string; onPress?: () => void }) => {
    return (
        <button
            type="button"
            onClick={onPress}
            className="w-full flex items-center cursor-pointer gap-3 p-3 rounded-[var(--radius-lg)] border border-grey-4 bg-natural-white hover:shadow-[var(--shadow-feature-card)] transition-shadow duration-200 text-left">
            <SafeImage
                src={imageUrl}
                alt={title}
                className="w-10 h-10 rounded-[8px] object-cover"
            />
            <Typography
                family="redhat"
                weight="semibold"
                color="grey-0"
                textAlign="left"
                className="flex-1">
                {title}
            </Typography>
        </button>
    )
}

const TripPreferenceDestinationStep = ({
    flowType,
    initialCountries,
    onNextStep,
    onSave,
    currentStep,
    totalSteps,
    onClose,
    isSaving
}: TripPreferenceDestinationStepProps) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDestinations, setSelectedDestinations] = useState<DestinationCardData[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const debouncedSearch = useDebounce(searchTerm, 300)
    const inputRef = useRef<HTMLInputElement>(null)
    const { user } = useUserInfo()
    
    // Fetch previous trips if user is logged in
    const { data: tripsData, isLoading: isTripsLoading } = useTravelerTripsAPI(user?.id ?? '', true, false)
    const tripsWithDestinations = tripsData?.trips.filter((trip) => trip.final_destination_countries?.length > 0) ?? []
    const showPreviousTrips = !!user && tripsWithDestinations.length > 0
    const { trackButtonClickCustom } = usePostHog()

    // Autofocus on page load
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    // Initialize selected destinations from props
    useEffect(() => {
        if (initialCountries?.length) {
            setSelectedDestinations(
                initialCountries.map((c) => ({
                    id: c.id,
                    name: c.name,
                    imageUrl: undefined
                }))
            )
        }
    }, [initialCountries])

    // Query for all countries (both live and non-live)
    const {
        allCountries,
        liveCountries,
        comingSoonCountries,
        isLoading: isLoadingCountries
    } = useCountries({
        shouldUsePrioritized: true
    })

    // Filter countries for search (client-side filtering)
    const searchResults = allCountries?.filter((country) => country.country_name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    const isLoadingSearch = false // No API call needed, just filtering

    const handleFocus = () => setIsSearching(true)

    const handleBack = () => {
        setIsSearching(false)
        setSearchTerm('')
    }

    const handleSelectDestination = useCallback((location: LocationResponse) => {
        const destination: DestinationCardData = {
            id: location.country_id,
            name: location.country_name,
            imageUrl: location.icon_url
        }

        setSelectedDestinations((prev) => {
            if (prev.some((d) => d.id === destination.id)) {
                return prev
            }
            return [...prev, destination]
        })
        setSearchTerm('')
        requestAnimationFrame(() => {
            inputRef.current?.focus()
        })
    }, [])

    const handleRemoveDestination = useCallback((id: string) => {
        setSelectedDestinations((prev) => prev.filter((d) => d.id !== id))
        requestAnimationFrame(() => {
            inputRef.current?.focus()
        })
    }, [])

    const handleSubmit = () => {
        const payload: TripPreferenceDestinationResult = {
            countries: selectedDestinations.map((d) => d.id)
        }
        trackButtonClickCustom?.({
            buttonPage: 'trip_destination_step',
            buttonName: flowType === 'create'
                ? 'destination_continue'
                : 'destination_save',
            buttonAction: 'click',
            extra: {
                flowType,
                selectedCountryIds: selectedDestinations.map((d) => d.id),
                selectedCountryNames: selectedDestinations.map((d) => d.name),
                hasComingSoonCountry: selectedDestinations.some((d) =>
                    comingSoonCountries?.some((c) => c.country_id === d.id)
                ),
                currentStep,
                sourceScreen: 'trip_preference_destination_step'
            }
        })
        if (flowType === 'create') {
            onNextStep?.(payload)
        } else {
            onSave?.(payload)
        }
    }

    const filterSelected = (list: LocationResponse[] | undefined) => {
        if (!list) return []
        return list.filter((d) => !selectedDestinations.some((s) => s.id === d.country_id))
    }
    const filteredLiveCountries = filterSelected(liveCountries)
    const filteredComingSoonCountries = filterSelected(comingSoonCountries)

    const searchLiveCountries = filterSelected(searchResults)?.filter((c) => c.is_live)
    const searchComingSoonCountries = filterSelected(searchResults)?.filter((c) => !c.is_live)
    const hasSearchResults = (searchLiveCountries?.length ?? 0) > 0 || (searchComingSoonCountries?.length ?? 0) > 0

    return (
        <TripPreferenceStepLayout
            title="Where do you want to go?"
            description="Select one or more destinations for your trip."
            flowType={flowType}
            onPrimary={handleSubmit}
            primaryDisabled={selectedDestinations.length === 0}
            primaryLoading={isSaving}
            currentStep={currentStep}
            totalSteps={totalSteps}
            onClose={onClose}>
            <div className="flex flex-col gap-4 w-full ">
                {/* Previous Trips Section - Only show if user is logged in */}
                {showPreviousTrips && (
                    <TravelerPreviousTrips
                        tripsWithDestinations={tripsWithDestinations}
                        isLoading={isTripsLoading}
                        maxWidth='100%'
                        padding='0px'
                    />
                )}
                
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
                            className="cursor-pointer"
                            type="button">
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
                                    alt={d.name}
                                    className="w-6 h-6 rounded-sm"
                                />
                                <Typography
                                    textAlign="left"
                                    weight="semibold"
                                    size="16"
                                    family="redhat"
                                    color="grey-0">
                                    {d.name}
                                </Typography>
                                <button
                                    onClick={() => handleRemoveDestination(d.id)}
                                    className="cursor-pointer"
                                    type="button">
                                    <X
                                        size={20}
                                        className="text-grey-0"
                                    />
                                </button>
                            </div>
                        ))}

                        <input
                            ref={inputRef}
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
                    <div className="flex flex-col w-full gap-4">
                        {/* Loading state */}
                        {isLoadingSearch && (
                            <div className="flex flex-col gap-4 w-full">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <CustomShimmer
                                        key={index}
                                        height={88}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Search results */}
                        {!isLoadingSearch && (
                            <>
                                {isSearching && searchTerm.length > 0 && (
                                    <div className="flex flex-col w-full gap-4">
                                        {/* Loading */}
                                        {isLoadingSearch && (
                                            <div className="flex flex-col gap-4 w-full">
                                                {Array.from({ length: 5 }).map((_, index) => (
                                                    <CustomShimmer
                                                        key={index}
                                                        height={88}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {!isLoadingSearch && (
                                            <>
                                                {/* RESULTS FOUND */}
                                                {hasSearchResults && (
                                                    <>
                                                        {searchLiveCountries?.length > 0 && (
                                                            <div className="flex flex-col gap-4 w-full">
                                                                <div className="flex items-center gap-1">
                                                                    <Typography
                                                                        family="redhat"
                                                                        weight="extrabold"
                                                                        size="12"
                                                                        color="grey-2">
                                                                        POPULAR DESTINATIONS
                                                                    </Typography>
                                                                    <TrendingUp
                                                                        size={16}
                                                                        className="text-grey-2"
                                                                    />
                                                                </div>

                                                                <div className="flex flex-col gap-3">
                                                                    {searchLiveCountries.map((item) => (
                                                                        <DestinationCard
                                                                            key={item.country_id}
                                                                            imageUrl={item.icon_url}
                                                                            title={item.country_name}
                                                                            onPress={() => handleSelectDestination(item)}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {searchComingSoonCountries?.length > 0 && (
                                                            <div className="flex flex-col gap-4 w-full">
                                                                <div className="flex items-center gap-2 w-full">
                                                                    <Typography
                                                                        family="redhat"
                                                                        weight="extrabold"
                                                                        size="12"
                                                                        color="grey-2"
                                                                        className="whitespace-nowrap">
                                                                        COMING SOON
                                                                    </Typography>

                                                                    <div className="flex-1 h-px min-w-0 bg-gradient-to-l from-transparent via-grey-4 to-grey-4" />
                                                                </div>

                                                                <div className="flex flex-col gap-3">
                                                                    {searchComingSoonCountries.map((item) => (
                                                                        <DestinationCard
                                                                            key={item.country_id}
                                                                            imageUrl={item.icon_url}
                                                                            title={item.country_name}
                                                                            onPress={() => handleSelectDestination(item)}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {/* NO RESULTS */}
                                                {!hasSearchResults && (
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
                            </>
                        )}
                    </div>
                )}

                {/* Popular Destinations (when not searching or search is empty) */}
                {searchTerm.length === 0 && (
                    <div className="flex flex-col gap-6 w-full">
                        {/* POPULAR DESTINATIONS */}
                        <div className="flex flex-col gap-4 w-full">
                            <div className="flex items-center gap-1">
                                <Typography
                                    family="redhat"
                                    weight="extrabold"
                                    size="12"
                                    color="grey-2"
                                    textAlign="left">
                                    POPULAR DESTINATIONS
                                </Typography>
                                <TrendingUp
                                    size={16}
                                    className="text-grey-2"
                                />
                            </div>

                            {isLoadingCountries && (
                                <div className="flex flex-col gap-4">
                                    {Array.from({ length: 4 }).map((_, index) => (
                                        <CustomShimmer
                                            key={index}
                                            height={88}
                                        />
                                    ))}
                                </div>
                            )}

                            {!isLoadingCountries && (
                                <div className="flex flex-col gap-3">
                                    {filteredLiveCountries?.map((item) => (
                                        <DestinationCard
                                            key={item.country_id}
                                            imageUrl={item.icon_url}
                                            title={item.country_name}
                                            onPress={() => handleSelectDestination(item)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* COMING SOON */}
                        {!isLoadingCountries && comingSoonCountries?.length > 0 && (
                            <div className="flex flex-col gap-4 w-full">
                                <div className="flex items-center gap-2 w-full">
                                    <Typography
                                        family="redhat"
                                        weight="extrabold"
                                        size="12"
                                        color="grey-2"
                                        textAlign="left"
                                        className="whitespace-nowrap">
                                        COMING SOON
                                    </Typography>

                                    <DividerLine direction="right" />
                                </div>

                                <div className="flex flex-col gap-3">
                                    {filteredComingSoonCountries.map((item) => (
                                        <DestinationCard
                                            key={item.country_id}
                                            imageUrl={item.icon_url}
                                            title={item.country_name}
                                            onPress={() => handleSelectDestination(item)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </TripPreferenceStepLayout>
    )
}

export default TripPreferenceDestinationStep
