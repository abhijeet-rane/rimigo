import Typography from '@/components/shared/Typography'
import { HOURS_1 } from '@/constants/commons/tanstackConstants'
import { DEFAULT_TRIP_ONBOARDING_ROUTE } from '@/routes/routes'
import { ITripSourceResponse } from '@/types/tripSourceTypes/tripsSourceTypes'
import { useQuery } from '@tanstack/react-query'
import React, { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import SourceInfoCard from '../../Onboarding/components/SourceInfoCard'
import { tripSourceAPIAdapter } from '../adapter'
import { getTripSourceByName } from '../api'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { toast } from 'sonner'
import { ErrorOnBoardingScreen } from '@/modules/ErrorScreen/pages/ErrorBoradingScreen'
import CustomShimmer from '@/components/shared/Shimmer'
import { GradientLoading } from '@/utils/SvgUtils'
import { useIsMobile } from '@/hooks/use-mobile'
import { contentCollectionApi } from '@/modules/ContentCollection/api/contentCollectionApi'
import { getCollectionDetailPath, mapCollectionToCardItem } from '@/pages/Collections/utils/collectionCardMappers'
import { CollectionCardVerticalCTAList } from '@/components/CollectionCta'
import { useSetCreatorAttribution } from '@/modules/amplitude/components/creatorAttributionHooks'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

const SHARK_TANK_IMAGE_URL =
    'https://sharktank-india.com/wp-content/uploads/2025/01/cropped-SHARK-TANK-INDIA.png'

const CreatorInfoSection: React.FC = () => {
    const { trip_source } = useParams()
    const isMobile = useIsMobile()
    const navigate = useNavigate() // ✅ React Router navigation hook - moved to top
    const { trackEvent, trackButtonClickCustom } = usePostHog()
    const setCreatorAttribution = useSetCreatorAttribution()

    // search params
    const [searchParams] = useSearchParams()
    const utmMedium = searchParams.get('utm_medium') // instagram

    const {
        data: tripSourceData,
        isLoading,
        isError,
        error
    } = useQuery<ITripSourceResponse>({
        queryFn: () => getTripSourceByName(trip_source as string),
        queryKey: ['tripSource', trip_source],
        enabled: !!trip_source,
        staleTime: HOURS_1,
        gcTime: HOURS_1
    })

    // Push creator attribution into the app-root context so descendant trackEvent
    // calls inherit creator_handle / creator_id. Handle is available from the path
    // param immediately; id fills in once tripSourceData resolves. Cleanup clears
    // attribution on unmount so leaving this page stops tagging unrelated events.
    useEffect(() => {
        setCreatorAttribution({
            creator_handle: trip_source ?? null,
            creator_id: tripSourceData?.id ?? null
        })
        return () => setCreatorAttribution(null)
    }, [trip_source, tripSourceData?.id, setCreatorAttribution])

    if (isError) {
        toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        return <ErrorOnBoardingScreen />
    }

    const buildTrackingQuery = () => {
        const sourceParam = trip_source ? `utm_source=${trip_source}` : ''
        const additionalParams = searchParams.toString()
        return [sourceParam, additionalParams].filter(Boolean).join('&')
    }

    const buildTripOnboardingTarget = () => {
        const trackingQuery = buildTrackingQuery()
        return trackingQuery ? `${DEFAULT_TRIP_ONBOARDING_ROUTE}?${trackingQuery}` : DEFAULT_TRIP_ONBOARDING_ROUTE
    }

    const navigateToLoginWithRedirect = () => {
        const redirectTarget = buildTripOnboardingTarget()
        // const loginQueryParts = [trackingQuery, `redirectTo=${encodeURIComponent(redirectTarget)}`].filter(Boolean).join('&')
        // navigate(`${LOGIN_ROUTE}${loginQueryParts ? `?${loginQueryParts}` : ''}`)
        navigate(redirectTarget, { replace: true })
    }

    // if source is not valid, then redirect to
    if (tripSourceData?.is_source_valid !== true && !isLoading) {
        if (isMobile) {
            navigateToLoginWithRedirect()
        } else {
            navigate(buildTripOnboardingTarget(), { replace: true })
        }
    }

    const adapterCreatorData = tripSourceAPIAdapter(tripSourceData as ITripSourceResponse)


    const creatorName = adapterCreatorData?.source_name

    const { data: collectionsData, isLoading: isCollectionsLoading } = useQuery({
        queryKey: ['collection-list', 'creator', creatorName],
        queryFn: () => contentCollectionApi.getCollectionList({}),
        enabled: !!creatorName && !isLoading,
        staleTime: 5 * 60 * 1000
    })

    // Filter collections where source_details.username matches creator name
    const creatorCollections = useMemo(() => {
        if (!collectionsData?.data || !creatorName) return []
        return collectionsData.data.filter(
            (c) => c.source_details?.username?.toLowerCase() === creatorName.toLowerCase()
        )
    }, [collectionsData, creatorName])

    const creatorCardItems = useMemo(
        () => creatorCollections.map((collection) =>
            mapCollectionToCardItem(collection, () => navigate(getCollectionDetailPath(collection)), {
                overviewColumns: 2,
                fillWidth: true,
                imageFullOpacity: true,
                analyticsContext: { section: 'creator_page' }
            })
        ),
        [creatorCollections, navigate]
    )

    useEffect(() => {
        if (!tripSourceData) return
        trackEvent('Creator Storefront Page Viewed', {
            creator_handle: trip_source ?? null,
            creator_id: tripSourceData?.id ?? null,
            is_source_valid: tripSourceData.is_source_valid,
            source_app: utmMedium,
            tripboards_count: creatorCardItems.length
        })
    }, [tripSourceData, trip_source, utmMedium, creatorCardItems.length, trackEvent])

    const handleStartPlanning = () => {
        trackButtonClickCustom({
            buttonPage: 'creator_landing',
            buttonName: 'start_planning',
            buttonAction: 'cta_click',
            extra: {
                is_mobile: isMobile,
                source_app: utmMedium
            }
        })
        // if mobile, then redirect to benefits page
        if (isMobile) {
            navigateToLoginWithRedirect()
            // return
        } else {
            navigate(buildTripOnboardingTarget(), { replace: true })
            // return
        }

        // navigate(buildTripOnboardingTarget())
    }

    return (
        <div className="relative w-full h-screen overflow-hidden flex flex-col items-center">

            {/* Scrollable content */}
            <div className="relative w-full h-full overflow-y-auto flex flex-col items-center">
                <div className="absolute top-0 w-full pointer-events-none">
                    <GradientLoading />
                </div>
                <div
                    className="flex px-5 sm:px-6 md:px-8 lg:px-8 pt-15 flex-col bg-natural-white items-center justify-center w-full"
                    style={{
                        maxWidth: '450px',
                        gap: 'clamp(16px, 5vh, 56px)',
                    }}>
                    {/* Hero Text */}
                    {isLoading ? (
                        <CustomShimmer
                            height={80}
                            radius={16}
                        />
                    ) : (
                        <div className="text-center items-center justify-center flex flex-col gap-3 w-full ">
                            <Typography
                                size="24"
                                family="redhat"
                                weight="semibold"
                                textAlign="center"
                                className='flex gap-2'
                                color="grey-0">
                                Meet my team at{' '}
                                    <img
                                        src="/icons/logo-transparent-indigo.png"
                                        alt="Rimigo"
                                        className="h-9 md:h-11 w-auto object-contain md:mt-0 md:pb-2 "
                                    />
                            </Typography>
                            <Typography
                                size="16"
                                family="manrope"
                                weight="medium"
                                color="grey-2"
                                textAlign="center">
                                Plans your international trip using my recommendations and insights.{' '}
                            </Typography>
                        </div>
                    )}

                    {isLoading ? (
                        <CustomShimmer
                            height={128}
                            radius={16}
                        />
                    ) : (
                        <div
                            className="flex flex-col  items-center"
                            style={{ gap: 'clamp(16px, 5vh, 64px)' }}>
                            <SourceInfoCard
                                source_app={utmMedium ?? ''}
                                firstName={adapterCreatorData.source_name}
                                imageUrl={adapterCreatorData.thumbnail_url}
                            />
                        </div>
                    )}
                    <button
                        onClick={handleStartPlanning}
                        className="w-full cursor-pointer py-4 rounded-xl bg-primary-default text-white font-semibold">
                        Start planning
                    </button>
                </div>

                {/* Creator Tripboards */}
                {!isLoading && creatorCardItems.length > 0 && (
                    <div className="w-full max-w-[450px] flex flex-col gap-4 px-5 mt-4">
                        {/* Divider with text */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-grey-4" />
                            <span className="text-[16px] font-semibold font-manrope text-grey-2 whitespace-nowrap">
                                OR
                            </span>
                            <div className="flex-1 h-px bg-grey-4" />
                        </div>

                        {/* Heading */}
                        <div className="flex flex-col items-center gap-1 text-center">
                            <p className="text-[18px] font-semibold font-red-hat-display text-grey-0 tracking-[-0.02em]">
                                Explore my tripboards
                            </p>
                            <p className="text-[16px] font-medium font-manrope text-grey-2 mb-3">
                                Real trips, curated recommendations
                            </p>
                        </div>

                        <CollectionCardVerticalCTAList
                            items={creatorCardItems}
                            className="!grid-cols-1"
                            cardClassName="w-full"
                        />
                    </div>
                )}

                {isCollectionsLoading && (
                    <CustomShimmer
                        height={200}
                        radius={16}
                        className="w-full max-w-[450px] px-5 mt-4"
                    />
                )}

                {/* Featured On */}
                <div className="flex flex-col items-center gap-2 mt-6 pb-6 md:pb-8">
                    <p className="text-grey-2 text-[12px] font-medium md:text-[16px] font-manrope tracking-none md:leading-[28px]">
                        Featured on
                    </p>
                    <img
                        src={SHARK_TANK_IMAGE_URL}
                        alt="Shark Tank India"
                        className="h-auto object-contain"
                        style={{ maxHeight: '28px' }}
                    />
                </div>
            </div>
        </div>
    )
}

export default CreatorInfoSection
