import ExperienceDetailsTitle from './components/ExperienceDetailsTitle'
import { AdaptedExperienceDetailsType } from '../../types'
import ExperienceDetailsImageGrid from './sections/ExperienceDetailsImageGrid'
import Divider from '@/components/shared/Divider/Divider'
import ExperienceSummarySection from './sections/ExperienceSummarySection'
import ScrollTabsContainer from '@/components/shared/ScrollTabs/ScrollTabsContainer'
import ExperienceAnalyzeForYouSection from './sections/ExperienceAnalyzeForYouSection'
import ExperienceYoutubeShortsSection from './sections/ExperienceYoutubeShortsSection'
import ExperienceReviewsSection from './sections/ExperienceReviewsSection'
import HowToGetThereSection from './sections/HowToGetThereSection'
import ToursSection from './sections/ToursSection'
import { ExperienceDetailsLongYTVideoSection } from './sections/ExperienceDetailsLongYTVideoSection'
import AdditionalInfoSection from './sections/AdditionalInfoSection'
import WhenToVisit from './sections/WhenToVisit'
import { RecommendedMode } from '../../types/experienceDetailTypes'
import { useState, useEffect, useCallback } from 'react'
import { checkExists, bulkUpsertTripExperiences } from '../../api/experienceShortlistAPI'
import { toast } from 'sonner'
import { UITransportOptions } from './components/HowToGetThere/TransportInformationCard'
import { isValidRecommendedOption } from './sections/transportUtils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { useSearchParams } from 'react-router-dom'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useToursForExperience } from '../../hooks/useToursForExperience'
import ExperienceFindBestTicketSection from './sections/ExperienceFindBestTicketSection'
import { FloatingQuestionsContainer } from '@/components/FloatingQuestions'
import { getExperienceFloatingQuestions } from '../../api/experienceApi'
import { triggerAssistantPrompt } from '@/pages/Stays/Components/assistantController'
import LoginToViewCTA from './components/LoginToViewCTA'
import HoursOfOperationCard from './components/HoursOfOperationCard'
import { useSortedToursByPriority } from '../../hooks/useSortedToursByPriority'
import { useUserInfo } from '@/hooks/useUserInfo'

type RawTransportOptions = {
    bus: boolean
    metro: boolean
    train: boolean
    taxi: boolean
    car: boolean
    bike: boolean
    cable_car: boolean
    walking: boolean
    shuttle_service: boolean
    boat_service: boolean
    ferry_service: boolean
    description: string
    recommended_option: string[]
    transport_option_description?: Array<{
        key: string
        description: string
    }>
}

// Type guard to check if transport options is in raw format
const isRawTransportOptions = (transport: UITransportOptions | RawTransportOptions): transport is RawTransportOptions => {
    return 'bus' in transport && typeof (transport as RawTransportOptions).bus === 'boolean'
}

interface SummaryData {
    recommendation_details: {
        is_recommended: boolean
        reasoning_for_recommendation: string[]
    }
    tags: string[]
    curated_overall_score?: number
}

const ExperienceDetailsSection = ({
    experienceDetails,
    summaryData,
    isSummaryLoading,

    selectedMonth,
    tripId,
    floatingQuestionsCacheKey,
    isPublicView = false,
    defaultGroupType,
    onAddToCollection
}: {
    experienceDetails: AdaptedExperienceDetailsType
    summaryData: SummaryData | null
    isSummaryLoading: boolean
    selectedMonth: Date | null
    recommendedMode: RecommendedMode | null
    tripId?: string
    floatingQuestionsCacheKey?: string | null
    isPublicView?: boolean
    defaultGroupType?: string
    onAddToCollection?: () => void
}) => {
    // Extract image URLs from verified_photos
    const imageUrls = experienceDetails.content?.verified_photos?.map((photo) => photo.url) ?? []

    // push to top
    imageUrls.unshift(experienceDetails.display_props?.landscape_image || '')

    const experienceId = experienceDetails.id

    // Fetch tours data and platform ratings
    // For public view, we'll show dummy tours to entice login
    const {
        tours,
        platformRatings,
        isLoading: isToursLoading,
        isPolling: isToursPolling,
        toursData
    } = useToursForExperience(experienceId, isPublicView)
    const { trackEvent } = usePostHog()

    const sortedTours = useSortedToursByPriority(tours)

    useEffect(() => {
        if (!experienceDetails) return

        trackEvent('Experience Detail Page Viewed', {
            experience_id: experienceDetails.id,
            experience_name: experienceDetails.name,
            city_id: experienceDetails.location.city.id,
            city_name: experienceDetails.location.city.name,
            country_id: experienceDetails.location.country.id,
            country_name: experienceDetails.location.country.name,
            trip_id: tripId ?? null,
            price_lower_bound: experienceDetails.price.lower_bound,
            price_upper_bound: experienceDetails.price.upper_bound,
            price_currency: experienceDetails.price.currency,
            is_ticket_required: experienceDetails.is_ticket_required,
            recommended_mode: experienceDetails.recommended_mode,
            tags: summaryData?.tags ?? [],
            is_recommended: summaryData?.recommendation_details.is_recommended ?? null,
            recommendation_reasoning: summaryData?.recommendation_details.reasoning_for_recommendation ?? []
        })
    }, [experienceDetails, summaryData, tripId])
    const [isTourSectionVisible, setIsTourSectionVisible] = useState(false)

    // Update tour section visibility based on tours data
    useEffect(() => {
        if (!isToursLoading) {
            setIsTourSectionVisible(tours.length > 0)
        }
    }, [isToursLoading, tours])
    const [isShortlisted, setIsShortlisted] = useState(false)
    const [isShortlistLoading, setIsShortlistLoading] = useState(false)

    // Get group type from URL or context or default (for public view)
    const [searchParams] = useSearchParams()
    const travelerTripsContext = useOptionalTravelerTrips()
    const groupType = searchParams.get('groupType') || travelerTripsContext?.activeTrip?.tripProfile?.group_type || defaultGroupType || ''
    const { user: userInfo } = useUserInfo()
    const hasYoutubeShorts = Boolean(experienceDetails.content?.youtube_shorts && experienceDetails.content.youtube_shorts.length > 0)

    // Fetch initial shortlist status
    useEffect(() => {
        if (!tripId || !experienceId) {
            setIsShortlisted(false)
            return
        }

        const fetchShortlistStatus = async () => {
            try {
                const response = await checkExists(experienceId, tripId)
                setIsShortlisted(response.is_traveler_shortlisted ?? false)
            } catch (error) {
                toast.error('Failed to fetch shortlist status', {
                    description: error instanceof Error ? error.message : 'Please try again later'
                })
                setIsShortlisted(false)
            }
        }

        fetchShortlistStatus()
    }, [tripId, experienceId])

    // Handle shortlist toggle
    const handleShortlist = useCallback(async () => {
        if (!tripId || !experienceId) {
            toast.error('No trip selected')
            return
        }

        setIsShortlistLoading(true)
        try {
            const nextState = !isShortlisted
            await bulkUpsertTripExperiences(tripId, {
                trip_id: tripId,
                experiences: [
                    {
                        experience_id: experienceId,
                        is_traveler_shortlisted: nextState
                    }
                ]
            })

            setIsShortlisted(nextState)
            toast.success(nextState ? 'Added to wishlist' : 'Removed from wishlist')
        } catch (error) {
            toast.error('Failed to update wishlist', {
                description: error instanceof Error ? error.message : 'Please try again later'
            })
        } finally {
            setIsShortlistLoading(false)
        }
    }, [tripId, experienceId, isShortlisted])

    return (
        <div className={`max-w-[1200px] mx-auto max-md:overflow-x-hidden  sm:p-4`}>
            {/* Title and Location */}
            <div className="max-md:flex max-md:flex-col-reverse">
                <ExperienceDetailsTitle
                    title={experienceDetails.name}
                    location={{
                        address: experienceDetails.location.address,
                        city: {
                            id: experienceDetails.location.city.id,
                            name: experienceDetails.location.city.name
                        },
                        country: {
                            id: experienceDetails.location.country.id,
                            name: experienceDetails.location.country.name
                        }
                    }}
                    priceUpperBound={experienceDetails.price.upper_bound}
                    priceLowerBound={experienceDetails.price.lower_bound}
                    priceCurrency={experienceDetails.price.currency}
                    isTicketRequired={experienceDetails.is_ticket_required}
                    recommendedMode={experienceDetails.recommended_mode}
                    suggestionPriority={experienceDetails.suggestion_priority ?? null}
                    isShortlisted={isPublicView ? false : isShortlisted}
                    onShortlist={isPublicView ? undefined : handleShortlist}
                    isLoading={isShortlistLoading}
                    experienceId={experienceId}
                    experienceName={experienceDetails.name}
                    onAddToCollection={onAddToCollection}
                />
                {/* Image Gallery */}
                <ExperienceDetailsImageGrid
                    shareProps={{
                        shareLink: typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://rimigo.com',
                        location: 'Experience Details',
                        trackingData: {
                            experienceId,
                            experienceName: experienceDetails.name
                        }
                    }}
                    isShortlisted={isPublicView ? false : isShortlisted}
                    onShortlist={isPublicView ? undefined : handleShortlist}
                    isLoading={isShortlistLoading}
                    images={imageUrls}
                    onImageClick={() => {}}
                />
            </div>

            {/* Seasonal Information */}
            {/* <ExperienceSeasonalInformation
                seasonalInformation={experienceDetails.seasonal_information}
                initialMonth={selectedMonth}
            /> */}

            <ExperienceSummarySection
                seasonalInformation={experienceDetails.seasonal_information}
                constraints={experienceDetails.constraints}
                platformRatings={platformRatings}
                travelerReviews={experienceDetails.traveler_reviews}
                groupType={groupType}
                rawTours={toursData?.tours ?? []}
            />

            {/* Tabs + Sticky Aside layout - ScrollTabsContainer handles the grid internally */}

            <ScrollTabsContainer
                groups={[
                    {
                        tabs: [
                            {
                                id: 'for-you',
                                tabTitle: 'For you',
                                component: (
                                    <>
                                        {isPublicView ? (
                                            <div className="relative min-h-[100px]">
                                                <div className="opacity-30 pointer-events-none">
                                                    <ExperienceAnalyzeForYouSection
                                                        summaryData={summaryData}
                                                        isLoading={isSummaryLoading}
                                                    />
                                                </div>
                                                <LoginToViewCTA
                                                    experienceId={experienceId}
                                                    countryId={experienceDetails.location.country.id}
                                                    countryName={experienceDetails.location.country.name}
                                                    type="ai-analysis"
                                                />
                                            </div>
                                        ) : (
                                            <ExperienceAnalyzeForYouSection
                                                summaryData={summaryData}
                                                isLoading={isSummaryLoading}
                                            />
                                        )}
                                        <div className="bg-primary-default-80 mt-4 px-4 pb-4 md:rounded-[12px]">
                                            {hasYoutubeShorts ? (
                                                <>
                                                    <ExperienceYoutubeShortsSection youtubeShorts={experienceDetails.content.youtube_shorts} />

                                                    <Divider className="md:my-4" />
                                                </>
                                            ) : null}
                                            <ExperienceReviewsSection
                                                groupType={groupType}
                                                groupReview={
                                                    experienceDetails.traveler_reviews?.group_reviews?.[groupType] ||
                                                    experienceDetails.traveler_reviews?.group_reviews?.couples ||
                                                    undefined
                                                }
                                                isPublicView={isPublicView}
                                            />
                                        </div>
                                    </>
                                )
                            },
                            {
                                id: 'how-to-book',
                                tabTitle: 'How to book',
                                visible: isTourSectionVisible,
                                component: (
                                    <>
                                        {isTourSectionVisible && <Divider className="my-4" />}
                                        {isTourSectionVisible && (
                                            <ToursSection
                                                tours={sortedTours}
                                                isLoading={isToursLoading}
                                                isPolling={isToursPolling}
                                                bookingWindow={experienceDetails.booking_window}
                                                setIsVisible={setIsTourSectionVisible}
                                                isPublicView={isPublicView}
                                                userInfo={userInfo}
                                                experienceId={experienceId}
                                            />
                                        )}
                                    </>
                                )
                            }
                        ],
                        stickyAside: (
                            <div className="flex flex-col gap-6 max-md:px-[20px]">
                                {isPublicView ? (
                                    <HoursOfOperationCard timing_guide={experienceDetails.timing_guide} />
                                ) : (
                                    <>
                                        <ExperienceFindBestTicketSection
                                            timing_guide={experienceDetails.timing_guide}
                                            platformLogos={
                                                experienceDetails.content?.youtube_shorts && experienceDetails.content.youtube_shorts.length > 0
                                                    ? []
                                                    : [
                                                          { url: 'https://logo.clearbit.com/getyourguide.com', alt: 'GetYourGuide' },
                                                          { url: 'https://logo.clearbit.com/klook.com', alt: 'Klook' },
                                                          { url: 'https://logo.clearbit.com/tripadvisor.in', alt: 'Tripadvisor' }
                                                      ]
                                            }
                                            sellingFast={false}
                                            onFindBestOption={() => {
                                                // Logic will be implemented later
                                            }}
                                        />
                                        <FloatingQuestionsContainer
                                            identifier={floatingQuestionsCacheKey}
                                            fetchFloatingQuestions={getExperienceFloatingQuestions}
                                            onQuestionClick={(question) => {
                                                void triggerAssistantPrompt(question)
                                            }}
                                        />
                                    </>
                                )}
                            </div>
                        )
                    },
                    {
                        tabs: [
                            {
                                id: 'youtube-videos',
                                tabTitle: 'In-depth experience',
                                component: (
                                    <>
                                        <br />
                                        <ExperienceDetailsLongYTVideoSection youtubeVideos={experienceDetails.content?.youtube_videos || []} />
                                    </>
                                )
                            },
                            {
                                id: 'when-to-visit',
                                tabTitle: 'When to visit',
                                component: (
                                    <>
                                        <Divider className="my-10 md:my-20" />
                                        <WhenToVisit
                                            seasonalInformation={experienceDetails.seasonal_information}
                                            selectedMonth={selectedMonth}
                                        />
                                        <Divider className="my-10 md:my-20" />
                                    </>
                                )
                            },
                            {
                                id: 'transport',
                                tabTitle: 'How to get there',
                                visible: (() => {
                                    const transport = experienceDetails.transport_options as UITransportOptions | RawTransportOptions
                                    // Check if it's raw format (has boolean flags)
                                    if (isRawTransportOptions(transport)) {
                                        const allFalse =
                                            !transport.bus &&
                                            !transport.metro &&
                                            !transport.train &&
                                            !transport.taxi &&
                                            !transport.car &&
                                            !transport.bike &&
                                            !transport.cable_car &&
                                            !transport.walking &&
                                            !transport.shuttle_service &&
                                            !transport.boat_service &&
                                            !transport.ferry_service
                                        const descriptionEmpty = !transport.description || transport.description.trim() === ''

                                        // Check if there are any valid recommended options (ones that exist in labelMap)
                                        const validRecommendedOptions =
                                            transport.recommended_option && transport.recommended_option.length > 0
                                                ? transport.recommended_option.filter(isValidRecommendedOption)
                                                : []
                                        const hasValidRecommendedOptions = validRecommendedOptions.length > 0

                                        return !(allFalse && descriptionEmpty && !hasValidRecommendedOptions)
                                    }
                                    // UI-adapted format
                                    const uiTransport = transport as UITransportOptions
                                    const descriptionEmpty = !uiTransport.description || uiTransport.description.trim() === ''
                                    const recommendedEmpty = !uiTransport.recommended_option || uiTransport.recommended_option.length === 0
                                    const modesEmpty = !uiTransport.modes || uiTransport.modes.length === 0
                                    return !(descriptionEmpty && recommendedEmpty && modesEmpty)
                                })(),
                                component: (
                                    <>
                                        <HowToGetThereSection transportOptions={experienceDetails.transport_options} />
                                    </>
                                )
                            },
                            {
                                id: 'additional-info',
                                tabTitle: 'Additional info',
                                component: (
                                    <>
                                        <Divider className="my-10 md:my-20" />
                                        <AdditionalInfoSection
                                            constraints={experienceDetails.constraints}
                                            isTicketRequired={experienceDetails.is_ticket_required}
                                            recommendedMode={experienceDetails.recommended_mode}
                                            bookingWindow={experienceDetails.booking_window}
                                        />
                                    </>
                                )
                            }
                        ]
                    }
                ]}
                stickyOffset={40}
            />
        </div>
    )
}

export default ExperienceDetailsSection
