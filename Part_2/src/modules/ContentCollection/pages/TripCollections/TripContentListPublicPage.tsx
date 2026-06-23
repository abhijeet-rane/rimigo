import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loading } from '@/components/shared/Loading'
import SearchHeader from '@/components/common/SearchHeader'
import Typography from '@/components/shared/Typography'
import { TRIP_COLLECTION_ROUTE } from '@/routes/routes'
import LinkCard from '@/components/Cards/LinkCard'
import { TAROT_CARD } from '@/constants/thiingsIcons'
import { useTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useUserInfo } from '@/hooks/useUserInfo'
import { travelerCollectionApi } from '../../api/travelerCollectionApi'
import { ContentCollection } from '../../types/contentCollection'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { Plus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { importCompletedItinerary } from '@/modules/Itinerary/hooks/ItineraryHook'
import { useTripboardCreation, type TripboardStatus } from '@/modules/Itinerary/hooks/useTripboardCreation'

const TripContentListPublicPage = ({ hideSearchHeader = false }: { hideSearchHeader?: boolean }) => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const travelerTripsContext = useTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const { user, isRimigoInternal } = useUserInfo()
    const travelerId = user?.id

    const tripboardCreation = useTripboardCreation()

    // Fetch only purchased collections (base_collection set) for logged-in user
    const { data: collectionsData, isLoading, isError } = useQuery({
        queryKey: ['traveler-collections-list', travelerId, 'purchased'],
        queryFn: () => {
            if (!travelerId) {
                throw new Error('Traveler ID is required')
            }
            return travelerCollectionApi.getTravelerCollections(travelerId, false, true)
        },
        enabled: !!travelerId,
        gcTime: HOURS_24,
        staleTime: HOURS_24,
        refetchOnWindowFocus: false,
    })

    const collections = collectionsData?.data || []

    // Check if active trip has a generated itinerary
    const hasItinerary = !!activeTrip?.tripItinerary?.id

    /**
     * Trigger tripboard creation from the active trip's itinerary.
     * Derives all necessary params from the trip context (no wizard needed).
     */
    const handleCreateTripboard = async () => {
        if (!activeTrip || !hasItinerary) return

        const itineraryId = activeTrip.tripItinerary!.id
        const tripId = activeTrip.trip_id
        const ownerId = activeTrip.owner_id
        const tripName = activeTrip.tripProfile?.trip_name || activeTrip.name || 'My Trip'

        // Country info
        const tripCountries = activeTrip.final_destination_countries || []
        const countryIds = tripCountries.map((c) => c.id).filter(Boolean)
        const countryName = tripCountries[0]?.name || ''

        // Derive group setup from trip preferences
        const groupSetup = activeTrip.trip_preference?.group_setup ||
            activeTrip.tripProfile?.group_setup || { adults: 2, children: 0, infants: 0 }

        // Derive dates from trip travel time
        const travelTime = activeTrip.tripProfile?.preferred_travel_time || activeTrip.preferred_travel_time
        const startDate = travelTime?.startDate || new Date().toISOString().split('T')[0]
        const endDate = travelTime?.endDate || new Date().toISOString().split('T')[0]

        // Dietary restrictions from trip preferences
        const dietaryRestrictions = activeTrip.trip_preference?.diet_preferences || []

        try {
            // Fetch the full itinerary data
            const itineraryData = await importCompletedItinerary(itineraryId)

            // Trigger tripboard creation
            await tripboardCreation.trigger({
                itineraryId,
                tripId,
                travelerId: ownerId,
                tripName,
                countryIds,
                countryName,
                itineraryData,
                wizardData: {
                    startDate,
                    endDate,
                    groupSetup: {
                        adults: groupSetup.adults || 2,
                        children: groupSetup.children || 0,
                        infants: groupSetup.infants || 0
                    },
                    stayBudgetRange: { min: 3000, max: 8000 }, // Default moderate budget range
                    dietaryRestrictions
                }
            })

            // Refetch collections list after creation
            queryClient.invalidateQueries({
                queryKey: ['traveler-collections-list', travelerId, 'purchased']
            })
        } catch (err) {
            console.error('[TripCollections] Failed to create tripboard:', err)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white">
                {!hideSearchHeader && (
                    <SearchHeader
                        pageName="Tripboards"
                        assistantConfig={{ enabled: false }}
                        ctaConfig={{ enabled: false }}
                        breadcrumbsConfig={{ enabled: isRimigoInternal, className: 'mb-6' }}
                    />
                )}
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    <Loading />
                </div>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="min-h-screen bg-white">
                {!hideSearchHeader && (
                    <SearchHeader
                        pageName="Tripboards"
                        assistantConfig={{ enabled: false }}
                        ctaConfig={{ enabled: false }}
                        breadcrumbsConfig={{ enabled: isRimigoInternal, className: 'mb-6' }}
                    />
                )}
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    <div className="text-center text-red-500">Failed to load collections. Please try again.</div>
                </div>
            </div>
        )
    }

    const handleCollectionClick = (identifier: string) => {
        // Navigate to collection view
        // Use "trip" as placeholder countryName to match route structure
        navigate(`${TRIP_COLLECTION_ROUTE}/${identifier}`)
    }

    return (
        <div className="min-h-screen bg-white">
            {!hideSearchHeader && (
                <SearchHeader
                    pageName="Tripboards"
                    assistantConfig={{ enabled: false }}
                    ctaConfig={{ enabled: false }}
                    // breadcrumbsConfig={{ enabled: true, className: 'mb-6' }}
                />
            )}
            <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="flex items-start justify-between mb-8">
                    <div className="flex flex-col gap-3">
                        <Typography
                            size="24"
                            weight="bold"
                            family="redhat"
                            color="grey-0"
                            className="leading-[100%] tracking-[-2%]">
                            Your Tripboards
                        </Typography>
                        <Typography
                            size="16"
                            weight="medium"
                            family="manrope"
                            color="grey-1"
                            className="leading-[20px] tracking-[-0.02em]">
                            Explore curated tripboards of experiences and stays for your trip.
                        </Typography>
                    </div>

                    {/* Create Tripboard Button - only for internal users */}
                    {hasItinerary && isRimigoInternal && (
                        <CreateTripboardButton
                            status={tripboardCreation.status}
                            error={tripboardCreation.error}
                            onClick={handleCreateTripboard}
                            onReset={tripboardCreation.reset}
                        />
                    )}
                </div>

                {/* Collections Grid */}
                {collections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        {
                            isRimigoInternal && (
                                <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center">
                            <Plus size={28} className="text-primary-default" />
                        </div>
                            )
                        }
                        {
                            !isRimigoInternal && (
                                <Typography
                                size="16"
                                weight="medium"
                                color="grey-1"
                                className="text-center max-w-sm">
                                    No collections found.
                            </Typography>
                            )
                        }
                        { isRimigoInternal && (
                            <Typography
                                size="16"
                                weight="medium"
                                color="grey-1"
                                className="text-center max-w-sm">
                                {hasItinerary
                                    ? 'No collections yet. Create a tripboard from your itinerary to get started!'
                                    : 'No collections found for this trip. Generate an itinerary first to create a tripboard.'}
                            </Typography>
                        )}
                        {hasItinerary && isRimigoInternal && tripboardCreation.status === 'idle' && (
                            <button
                                onClick={handleCreateTripboard}
                                className="mt-2 px-6 py-3 rounded-xl bg-primary-default text-white font-semibold font-manrope cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2">
                                <Plus size={18} />
                                Create Tripboard
                            </button>
                        )}
                        {isRimigoInternal && tripboardCreation.status === 'creating' && (
                            <div className="flex items-center gap-2 mt-2 text-primary-default">
                                <Loader2 size={18} className="animate-spin" />
                                <span className="text-sm font-medium font-manrope">Creating tripboard...</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {collections.map((collection: ContentCollection) => (
                            <LinkCard
                                key={collection.identifier}
                                title={collection.name}
                                description={collection.description ?? ''}
                                iconSrc={collection.cover_image || TAROT_CARD}
                                onAction={() => handleCollectionClick(collection.identifier!)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Create Tripboard Button (header CTA) ───────────────────────────────────

interface CreateTripboardButtonProps {
    status: TripboardStatus
    error: string | null
    onClick: () => void
    onReset: () => void
}

const CreateTripboardButton = ({ status, error, onClick, onReset }: CreateTripboardButtonProps) => {
    if (status === 'creating') {
        return (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 text-primary-default shrink-0">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[13px] font-semibold font-manrope">Creating tripboard...</span>
            </div>
        )
    }

    if (status === 'completed') {
        return (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 text-green-600 shrink-0">
                <CheckCircle2 size={16} />
                <span className="text-[13px] font-semibold font-manrope">Tripboard created!</span>
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-500">
                    <AlertCircle size={14} />
                    <span className="text-[12px] font-medium font-manrope">{error || 'Failed'}</span>
                </div>
                <button
                    onClick={() => {
                        onReset()
                        onClick()
                    }}
                    className="px-4 py-2.5 rounded-xl border border-grey-3 text-grey-0 text-[13px] font-semibold font-manrope cursor-pointer hover:bg-grey-5 transition-colors">
                    Retry
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-default text-white text-[13px] font-semibold font-manrope cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 shrink-0">
            <Plus size={16} />
            Create Tripboard
        </button>
    )
}

export default TripContentListPublicPage
