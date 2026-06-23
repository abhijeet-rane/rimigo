import { useMemo, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import SearchHeader from '@/components/common/SearchHeader'
import { getCollectionById, CollectionExperiencesMappingsResponse } from '../api/collectionsAPI'
import { adaptCollectionExperienceToUI } from '../adapters/collectionExperienceAdapter'
import { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { bulkUpsertTripExperiences } from '@/modules/Experiences/api/experienceShortlistAPI'
import { dispatchOpenTripCreationModal } from '@/lib/events/tripCreationModalEvents'
import { toast } from 'sonner'
import { useSearchParams } from 'react-router-dom'
import Typography from '@/components/shared/Typography'
import { Breadcrumbs, useBreadcrumbs } from '@/components/Breadcrumbs'
import SneakPeekModal from '../components/SneakPeakModal/SneakPeekModal'
import ListCard from '@/components/ListCard'
import ShortlistButton from '@/components/common/ShortlistButton'
import { formatPrice } from '@/modules/Experiences/utils/priceFormatter'
import CollectionCreatorInfo from '../components/CollectionCreatorInfo'
import { adaptSourceToCreator } from '../adapters/collectionsAdapter'
import Divider from '@/components/shared/Divider/Divider'
import RimigoFooter from '@/components/Footer/RimigoFooter'
import { useShortlistedExperiences } from '../context/ShortlistedExperiencesContext'
import { useIsMobile } from '@/hooks/use-mobile'
import MobileCompleteHeaderWithSearch from '@/components/MobileCompleteHeaderWithSearch'

const CollectionDetailPage = () => {
    const { collectionId } = useParams<{ countryId: string; cityId: string; collectionId: string }>()
    const [searchParams] = useSearchParams()
    const [sneakPeekExperienceId, setSneakPeekExperienceId] = useState<string | null>(null)
    const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
    const isMobile = useIsMobile()
    // Get trip traveler context for shortlisting
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null

    // Fetch collection data
    const {
        data: collectionData,
        isLoading: isCollectionLoading,
        isError: isCollectionError
    } = useQuery<CollectionExperiencesMappingsResponse>({
        queryKey: ['collection', collectionId],
        queryFn: () => getCollectionById(collectionId!),
        enabled: !!collectionId
    })

    // Get city name from breadcrumbs (already fetched there, no extra API call)
    const breadcrumbItems = useBreadcrumbs()
    const cityName = useMemo(() => {
        const cityBreadcrumb = breadcrumbItems.find((item) => item.href.includes('/city/'))
        return cityBreadcrumb?.label || ''
    }, [breadcrumbItems])

    // Transform collection experiences to ExperienceCardData format
    const experiences: ExperienceCardData[] = useMemo(() => {
        if (!collectionData?.experiences) return []
        return collectionData.experiences.map(adaptCollectionExperienceToUI)
    }, [collectionData])

    // Get collection metadata from the collection object
    const collectionInfo = collectionData?.collection
    const collectionName = collectionInfo?.name || ''
    const collectionDescription = collectionInfo?.description || ''

    // Create creator object if source exists - use actual collection data
    const creator = useMemo(() => {
        if (!collectionData?.collection?.source) return null
        // Use the actual collection data from the API response
        return adaptSourceToCreator(collectionData.collection.source, collectionData.collection.source_metadata || undefined)
    }, [collectionData])

    // Get shortlisted experiences from context
    const { shortlistState, refreshShortlist } = useShortlistedExperiences()
    const [shortlistLoadingIds, setShortlistLoadingIds] = useState<Record<string, boolean>>({})

    // Handle experience click
    const handleExperienceClick = useCallback(
        (experienceId: string) => {
            const url = `/experiences/${experienceId}/?${searchParams.toString()}`
            window.open(url)
        },
        [searchParams]
    )

    // Handle shortlist toggle
    const handleShortlistToggle = useCallback(
        async (experienceId: string) => {
            if (!experienceId) {
                return
            }

            if (!activeTripId) {
                dispatchOpenTripCreationModal({ source: 'experiences-card' })
                return
            }

            const existingEntry = shortlistState[experienceId]
            const nextState = !(existingEntry?.isShortlisted ?? false)

            setShortlistLoadingIds((prev) => ({ ...prev, [experienceId]: true }))

            try {
                await bulkUpsertTripExperiences(activeTripId, {
                    trip_id: activeTripId,
                    experiences: [
                        {
                            experience_id: experienceId,
                            is_traveler_shortlisted: nextState
                        }
                    ]
                })

                // Refresh shortlist state from context
                await refreshShortlist()

                toast.success(nextState ? 'Added to wishlist' : 'Removed from wishlist')
            } catch {
                toast.error('Failed to update wishlist')
            } finally {
                setShortlistLoadingIds((prev) => {
                    const updated = { ...prev }
                    delete updated[experienceId]
                    return updated
                })
            }
        },
        [activeTripId, shortlistState, refreshShortlist]
    )

    // Handle sneak peek click
    const handleSneakPeekClick = useCallback((e: React.MouseEvent, experienceId: string) => {
        e.stopPropagation()
        setSneakPeekExperienceId(experienceId)
    }, [])

    // Handle close sneak peek modal
    const handleCloseSneakPeek = useCallback(() => {
        setSneakPeekExperienceId(null)
    }, [])

    // Loading state
    if (isCollectionLoading) {
        return (
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName="Activities"
                    ishidden={true}
                    assistantConfig={{ enabled: true }}
                />
                <MobileCompleteHeaderWithSearch
                    title={'Activities'}
                    headerType={'experiences'}
                />
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    <div className="text-center">Loading collection...</div>
                </div>
            </div>
        )
    }

    // Error state
    if (isCollectionError || !collectionData) {
        return (
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName="Activities"
                    ishidden={true}
                    assistantConfig={{ enabled: true }}
                />
                <MobileCompleteHeaderWithSearch
                    title={'Activities'}
                    headerType={'experiences'}
                />
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    <div className="text-center text-red-500">Failed to load collection</div>
                </div>
            </div>
        )
    }

    // Breadcrumbs are now handled by the Breadcrumbs component

    return (
        <>
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName="Activities"
                    ishidden={true}
                    assistantConfig={{ enabled: true }}
                    breadcrumbsConfig={{ enabled: true, className: 'mb-6' }}
                />
                <MobileCompleteHeaderWithSearch
                    title={'Activities'}
                    headerType={'experiences'}
                />
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    {/* Breadcrumb Navigation */}
                    <div className="mb-6">
                        <Breadcrumbs searchParams={searchParams} />
                    </div>

                    {/* Header Section - Title/Description on Left, Curated By on Right */}
                    <div className="flex flex-col md:flex-row gap-8  justify-between">
                        {/* Left Column - Title and Description */}
                        <div className=" flex flex-col gap-3     md:w-[40%]">
                            <p className="text-[24px] font-red-hat-display font-[467] leading-[100%] tracking-[-2%] text-grey-0">{collectionName}</p>
                            {/* Description from API */}
                            <p className="text-[16px] font-manrope font-[500] leading-[20px] tracking-[-0.02em] text-grey-1">
                                {collectionDescription}
                            </p>
                        </div>

                        {/* Right Column - Curated By */}
                        {creator && (
                            <div className=" shrink-0 ">
                                <div className="bg-grey-5 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                                    <Typography
                                        size="12"
                                        weight="semibold"
                                        family="redhat"
                                        color="grey-2"
                                        className=" uppercase tracking-wider">
                                        CURATED BY
                                    </Typography>
                                    <CollectionCreatorInfo
                                        creator={creator}
                                        cityName={cityName}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <Divider className="my-6" />

                    {/* Experiences Grid */}
                    {experiences.length === 0 ? (
                        <div className="text-center py-12">
                            <Typography
                                size="16"
                                weight="medium"
                                color="grey-1">
                                No experiences found in this collection.
                            </Typography>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-15 items-start">
                            {experiences.map((experience) => {
                                const experienceId = experience.id
                                const shortlistEntry = shortlistState[experienceId]
                                const isShortlisted = shortlistEntry?.isShortlisted ?? false
                                const isShortlisting = Boolean(shortlistLoadingIds[experienceId])

                                // Format price
                                const { lower_bound, upper_bound, currency } = experience.price
                                const formattedPrice = formatPrice(lower_bound || 0, upper_bound || 0, currency || '')

                                // Get first verified photo for sneak peek button
                                const firstVerifiedPhoto = experience.images && experience.images.length > 1 ? experience.images[1] : undefined

                                const isHovered = hoveredCardId === experienceId || isMobile

                                return (
                                    <div
                                        key={experience.id}
                                        className="relative w-full"
                                        onMouseEnter={() => setHoveredCardId(experienceId)}
                                        onMouseLeave={() => setHoveredCardId(null)}>
                                        {/* Invisible placeholder to maintain grid cell size */}
                                        <div className={isHovered ? 'invisible' : 'visible'}>
                                            <ListCard
                                                image={experience.image}
                                                images={experience.images}
                                                imageAlt={experience.name || experience.title}
                                                fullHeight={true}
                                                className="group w-full"
                                                onClick={() => handleExperienceClick(experienceId)}
                                                topBadge={undefined}
                                                title={experience.name || experience.title}
                                                price={formattedPrice}
                                                category={undefined}
                                                categoryIcon={undefined}
                                                categories={undefined}
                                                categoryIconsMap={undefined}
                                                showShortlistButton={false}
                                                showSneakPeekButton={false}
                                                onSneakPeekClick={undefined}
                                                sneakPeekUserImage={undefined}
                                            />
                                        </div>
                                        {/* Absolutely positioned card on hover */}
                                        {isHovered && (
                                            <div className="absolute left-0 top-0 w-full z-20 shadow-2xl rounded-2xl">
                                                <ListCard
                                                    image={experience.image}
                                                    images={experience.images}
                                                    imageAlt={experience.name || experience.title}
                                                    fullHeight={true}
                                                    className="group w-full"
                                                    onClick={() => handleExperienceClick(experienceId)}
                                                    topBadge={undefined}
                                                    title={experience.name || experience.title}
                                                    price={formattedPrice}
                                                    category={undefined}
                                                    categoryIcon={undefined}
                                                    categories={undefined}
                                                    categoryIconsMap={undefined}
                                                    showShortlistButton={false}
                                                    showSneakPeekButton={!!handleSneakPeekClick}
                                                    onSneakPeekClick={handleSneakPeekClick ? (e) => handleSneakPeekClick(e, experienceId) : undefined}
                                                    sneakPeekUserImage={firstVerifiedPhoto}
                                                />
                                                {/* Shortlist Button - positioned absolutely over the card */}
                                                <div className="absolute right-3 top-3 z-10">
                                                    <ShortlistButton
                                                        ariaLabel="Save to shortlist"
                                                        isShortlisted={isShortlisted}
                                                        onShortlist={async () => {
                                                            await handleShortlistToggle(experienceId)
                                                        }}
                                                        isLoading={isShortlisting}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {/* Shortlist Button - for non-hovered state */}
                                        {!isHovered && (
                                            <div className="absolute right-3 top-3 z-10">
                                                <ShortlistButton
                                                    ariaLabel="Save to shortlist"
                                                    isShortlisted={isShortlisted}
                                                    onShortlist={async () => {
                                                        await handleShortlistToggle(experienceId)
                                                    }}
                                                    isLoading={isShortlisting}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Sneak Peek Modal */}
                    {sneakPeekExperienceId && (
                        <SneakPeekModal
                            isOpen={!!sneakPeekExperienceId}
                            onClose={handleCloseSneakPeek}
                            experienceId={sneakPeekExperienceId}
                        />
                    )}
                </div>
            </div>
            <RimigoFooter />
        </>
    )
}

export default CollectionDetailPage
