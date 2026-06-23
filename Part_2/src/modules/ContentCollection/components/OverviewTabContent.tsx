import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import PortraitImageCarousel from './PortraitImageCarousel'
import ImageGrid from '@/modules/Experiences/components/ExperienceDetails/components/ImageGrid'
import PhotoGallery from '@/modules/Experiences/components/ExperienceDetails/components/PhotoGallery'
import OverviewInfoCards from './OverviewInfoCards'
import HighlightsSection from './HighlightsSection'
import YouTubeVideoSection from './YouTubeVideoSection'
import CreatorAndUnlockSection from './CreatorAndUnlockSection'
import CustomShimmer from '@/components/shared/Shimmer'
import { cn } from '@/lib/utils'
import type { OverviewData } from '../adapter/overviewAdapter'
import { adaptMetadataToOverviewData } from '../adapter/overviewAdapter'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import TripRouteCarousel from './TripRouteCarousel'
import CollectionVideosSection from './CollectionVideosSection'
import InstagramReelsSection from './InstagramReelsSection'
import RimigoFooter from '@/components/Footer/RimigoFooter'
import { CountryData } from '@/hooks/useCountries'
import { CountrySwitcher } from '@/pages/Landing/Components/CountrySwitcher'

interface OverviewTabContentProps {
    overviewData?: OverviewData | null
    collectionIdentifier?: string
    collectionName?: string
    contentCollectionMetadataId?: string | null
    publisherId?: string | null
    publisherType?: string | null
    countryId?: string
    onBuyClick?: () => void
    isProcessingPayment?: boolean
    /** Show the creator + unlock card (Traveler collections only) */
    showCreatorAndUnlockSection?: boolean
    /** Override title for trip route section (default: "Cities we visited") */
    tripRouteTitle?: string
    /** Extra content to render before trip route (e.g. country info section) */
    extraContent?: React.ReactNode
    /** Extra content to render after highlights (e.g. shorts section) */
    extraContentAfterHighlights?: React.ReactNode
    /** Section directly under trip highlights (e.g. tripboard daily itinerary cards) */
    dailyHighlightsContent?: React.ReactNode
    /** Hide the info cards section */
    hideInfoCards?: boolean
    /** Hide the description section */
    hideDescription?: boolean
    /** Override highlights title line 1 (default: "Access our") */
    highlightsTitleLine1?: string
    /** Override highlights title line 2 (default: "Recommendations") */
    highlightsTitleLine2?: string
    showCountrySwitcher?:boolean
    countriesForSwitcher?: CountryData[]
    selectedCountrySwitcherId?: string | null
    onCountrySwitcherSelect?: (countryId: string, countryName: string) => void
}

const DESCRIPTION_LINE_CLAMP = 3

const DescriptionSection: React.FC<{ description: string }> = ({ description }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isClamped, setIsClamped] = useState(false)
    const textRef = React.useRef<HTMLParagraphElement>(null)

    React.useEffect(() => {
        const el = textRef.current
        if (el) {
            // Check if text is actually clamped (overflowing)
            setIsClamped(el.scrollHeight > el.clientHeight)
        }
    }, [description])

    return (
        <div className="mb-6">
            <p
                ref={textRef}
                className={cn(
                    'font-manrope font-medium text-[13px] md:text-[14px] text-grey-1 leading-[20px]',
                    !isExpanded && `line-clamp-${DESCRIPTION_LINE_CLAMP}`
                )}
                style={!isExpanded ? { WebkitLineClamp: DESCRIPTION_LINE_CLAMP, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
            >
                {description}
            </p>
            {isClamped && (
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-1 text-[13px] font-semibold font-manrope text-primary-default cursor-pointer hover:underline"
                >
                    {isExpanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </div>
    )
}

const OverviewTabContent: React.FC<OverviewTabContentProps> = ({
    overviewData,
    contentCollectionMetadataId,
    publisherId,
    publisherType,
    countryId,
    onBuyClick,
    isProcessingPayment,
    showCreatorAndUnlockSection = false,
    tripRouteTitle,
    extraContent,
    extraContentAfterHighlights,
    dailyHighlightsContent,
    hideInfoCards = false,
    hideDescription = false,
    highlightsTitleLine1,
    highlightsTitleLine2,
    showCountrySwitcher,
    countriesForSwitcher,
    selectedCountrySwitcherId,
    onCountrySwitcherSelect
}) => {
    const [isGalleryOpen, setIsGalleryOpen] = useState(false)
    const [initialPhotoIndex, setInitialPhotoIndex] = useState<number>(0)

    // Fetch metadata if contentCollectionMetadataId is provided
    const {
        data: metadataResponse,
        isLoading: isMetadataLoading
    } = useQuery({
        queryKey: ['content-collection-metadata', contentCollectionMetadataId],
        queryFn: async () => {
            if (!contentCollectionMetadataId) {
                throw new Error('Metadata ID is required')
            }
            return await contentCollectionApi.getContentCollectionMetadata(contentCollectionMetadataId)
        },
        enabled: !!contentCollectionMetadataId,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Convert metadata response to OverviewData
    const metadataOverviewData = useMemo(() => {
        if (!metadataResponse) {
            return null
        }
        return adaptMetadataToOverviewData(metadataResponse)
    }, [metadataResponse])

    // Merge overviewData with metadataOverviewData (metadata takes precedence for overlapping fields)
    const mergedData = useMemo(() => {
        
        // Start with overviewData or empty data (no dummy fallback for images)
        const baseData: OverviewData = overviewData || {
            images: [],
            title: '',
            description: ''
        }
        
        // If we have metadata, merge it in (metadata takes precedence)
        if (metadataOverviewData) {
            return {
                // Images: combine both, prioritizing metadata images first (no dummy fallback)
                images: [
                    ...(metadataOverviewData.images || [])
                ],
                // Separate portrait and landscape images from metadata
                portraitImages: metadataOverviewData.portraitImages,
                landscapeImages: metadataOverviewData.landscapeImages,
                // Title and description: prefer base data (from collection)
                title: baseData.title || metadataOverviewData.title,
                description: baseData.description || metadataOverviewData.description,
                // Info cards: prefer metadata if available
                infoCards: metadataOverviewData.infoCards || baseData.infoCards,
                // Highlights: prefer metadata if available
                highlights: metadataOverviewData.highlights || baseData.highlights,
                // YouTube video: prefer metadata if available
                youtubeVideo: metadataOverviewData.youtubeVideo || baseData.youtubeVideo,
                // YouTube shorts: from metadata
                youtubeShorts: metadataOverviewData.youtubeShorts,
                //rimigo videos
                rimigoVideos: metadataOverviewData.rimigoVideos,
                // Instagram reels: from metadata
                instagramReels: metadataOverviewData.instagramReels,
                // Trip route: from metadata
                tripRoute: metadataOverviewData.tripRoute,
                // Creator and unlock data: only from base data (not in metadata)
                creatorData: baseData.creatorData,
                unlockData: baseData.unlockData
            }
        }
        
        // If no metadata, use base data only (no dummy image fallback)
        return {
            images: baseData.images || [],
            title: baseData.title,  
            description: baseData.description,
            infoCards: baseData.infoCards,
            highlights: baseData.highlights,
            youtubeVideo: baseData.youtubeVideo,
            youtubeShorts: baseData.youtubeShorts,
            rimigoVideos: baseData.rimigoVideos,
            instagramReels: baseData.instagramReels,
            tripRoute: baseData.tripRoute,
            creatorData: baseData.creatorData,
            unlockData: baseData.unlockData
        }
    }, [overviewData, metadataOverviewData])    

    const data = mergedData
    
    // Get portrait and landscape image URLs
    const portraitImageUrls = data.portraitImages?.map((img) => img.url) || []
    const landscapeImageUrls = data.landscapeImages?.map((img) => img.url) || []
    
    // Combine all images for gallery
    const allImageUrls = useMemo(() => {
        const all = [...portraitImageUrls, ...landscapeImageUrls]
        return all.length > 0 ? all : data.images.map((img) => img.url)
    }, [portraitImageUrls, landscapeImageUrls, data.images])

    const handleImageClick = (_imageUrl: string, index: number) => {
        setInitialPhotoIndex(index)
        setIsGalleryOpen(true)
    }

    const handleShowAllPhotos = () => {
        setInitialPhotoIndex(0)
        setIsGalleryOpen(true)
    }

    // Check if images exist or if we're loading
    const hasPortraitImages = portraitImageUrls.length > 0
    const hasLandscapeImages = landscapeImageUrls.length > 0
    const showPortraitCarousel = hasPortraitImages || isMetadataLoading
    const showLandscapeGrid = hasLandscapeImages || (isMetadataLoading && !hasPortraitImages)

    // Convert youtube_shorts to ExperienceWithShort format for ShortsCarousel
    // const shortsExperiences: ExperienceWithShort[] = useMemo(() => {
    //     if (!data.youtubeShorts || data.youtubeShorts.length === 0) {
    //         return []
    //     }
    //     return data.youtubeShorts.map((short, index) => ({
    //         id: short.id || `short-${index}`,
    //         name: `Short ${index + 1}`,
    //         suggestion_priority: 0,
    //         display_props: {
    //             landscape_image: ''
    //         },
    //         price: {
    //             lower_bound: 0,
    //             upper_bound: 0
    //         },
    //         city_name: '',
    //         city_id: '',
    //         youtube_short: {
    //             id: short.id || `short-${index}`,
    //             url: short.url,
    //             description: '',
    //             created_at: '',
    //             updated_at: ''
    //         },
    //         short_description: null,
    //         category_backend_value: null,
    //         category_icon: null,
    //         category: null
    //     }))
    // }, [data.youtubeShorts])


    return (
        <div className="w-full pt-3 md:pt-8 md:flex flex-col items-center justify-center">
            <div className=' md:max-w-[1100px]'>
                {/* Portrait Image Carousel - Show if portrait images exist or loading */}
                {showPortraitCarousel && (
                    <div className="mb-4 md:mb-12">
                        <PortraitImageCarousel
                            images={portraitImageUrls}
                            isLoading={isMetadataLoading && !hasPortraitImages}
                            onImageClick={(url, index) => {
                                // Find the index in all images
                                const allIndex = allImageUrls.indexOf(url)
                                handleImageClick(url, allIndex >= 0 ? allIndex : index)
                            }}
                            onShowAllPhotos={hasPortraitImages && portraitImageUrls.length > 0 ? handleShowAllPhotos : undefined}
                        />
                    </div>
                )}

                {/* Landscape Image Grid - Show if landscape images exist or loading */}
                {showLandscapeGrid && (
                    <div className="mb-4 md:mb-12 md:max-w-[1100px]">
                        {isMetadataLoading && !hasLandscapeImages ? (
                            // Show shimmer while loading
                            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 h-[58vh] rounded-2xl overflow-hidden">
                                <div className="md:col-span-2">
                                    <CustomShimmer height={580} radius={16} fill />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <CustomShimmer height={290} radius={16} fill />
                                    <CustomShimmer height={290} radius={16} fill />
                                    <CustomShimmer height={290} radius={16} fill />
                                    <CustomShimmer height={290} radius={16} fill />
                                </div>
                            </div>
                        ) : (
                            <ImageGrid
                                isShortlisted={false}
                                isLoading={false}
                                showShortlistButton={false}
                                images={landscapeImageUrls}
                                onImageClick={(url, index) => {
                                    // Find the index in all images
                                    const allIndex = allImageUrls.indexOf(url)
                                    handleImageClick(url, allIndex >= 0 ? allIndex : index)
                                }}
                                onShowAllPhotos={hasLandscapeImages && landscapeImageUrls.length > 0 ? handleShowAllPhotos : undefined}
                            />
                        )}
                    </div>
                )}

                {/* Description Section with Show More */}
                {!hideDescription && data.description && (
                    <DescriptionSection description={data.description} />
                )}

                  {/* Extra content (e.g. country exploration section for tripboard) */}
                {extraContent}
                
                {/* Info Cards Section - Only show if data exists */}
                {!hideInfoCards && data.infoCards && (
                    <div className="mb-12">
                        <OverviewInfoCards infoCards={data.infoCards} />
                    </div>
                )}

                {/* Trip Route Section - Only show if data exists */}
                {data.tripRoute && data.tripRoute.length > 0 && (
                    <div className="mb-12">
                        <TripRouteCarousel
                            cities={data.tripRoute}
                            title={tripRouteTitle}
                            className="bg-grey-5 rounded-2xl p-4"
                        />
                    </div>
                )}

                {/* Highlights Section - Only show if data exists */}
                {data.highlights && (
                    <div className="mb-12">
                        <HighlightsSection highlights={data.highlights} titleLine1={highlightsTitleLine1} titleLine2={highlightsTitleLine2} />
                    </div>
                )}

                {dailyHighlightsContent}

                {/* Extra content after highlights (e.g. shorts section) */}
                {extraContentAfterHighlights && (
                    <>
                        {/* Country switcher — only for multi-destination trips */}
                        {showCountrySwitcher && countriesForSwitcher && countriesForSwitcher.length > 1 && (
                            <div className="mb-6 flex justify-center">
                                <CountrySwitcher
                                    countries={countriesForSwitcher}
                                    selectedCountryId={selectedCountrySwitcherId ?? null}
                                    onCountrySelect={onCountrySwitcherSelect ?? (() => {})}
                                />
                            </div>
                        )}
                        {extraContentAfterHighlights}
                    </>
                )}

            </div>

            {/* Instagram Reels Section - Show if creator reels exist */}
            {data.instagramReels && data.instagramReels.length > 0 && (
                <div className="mb-10 md:mb-14 w-full md:max-w-[1100px] px-2 md:px-0">
                    <InstagramReelsSection
                        reels={data.instagramReels}
                        title="From the creator"
                        subtitle="Watch the moments behind this trip on Instagram"
                    />
                </div>
            )}

            {/* YouTube Shorts Carousel Section - Show if shorts exist */}
            {data.rimigoVideos && data.rimigoVideos.length > 0 && (
                <div className="mb-6 md:mb-5 flex flex-col gap-10 items-center justify-center w-full md:max-w-[1100px]">
                    <div
                        className={cn(
                            'w-full flex items-center justify-center rounded-none! pt-0 pb-0')}>
                                <CollectionVideosSection
                                    className=""
                                    videos={data.rimigoVideos}
                                    // autoPlayOnHover={true}
                                    autoPlayInView={true}
                                    mediaContainerClassname="h-[280px] md:h-[550px]"
                                    cardClassName="w-[150px] md:w-[320px]"
                                />
                     </div>           
                </div>
            )}

            <div className='w-full px-2'>

                {/* YouTube Video Section - Only show if video data exists */}
                {(data.youtubeVideo?.videoUrl || data.youtubeVideo?.videoId) && (
                    <div className="mb-24 w-full">
                        <YouTubeVideoSection
                            videoUrl={data.youtubeVideo?.videoUrl}
                            videoId={data.youtubeVideo?.videoId}
                            title={data.youtubeVideo?.title}
                        />
                    </div>
                )}
            </div>

            <div className='w-full'>

                {/* Creator and Unlock Section - Always show (unlock section always shown with dummy data if needed) */}
                {showCreatorAndUnlockSection && (
                    <div className="md-24 md:mb-1 w-full px-5 md:px-35">
                        <CreatorAndUnlockSection
                            creatorData={data.creatorData}
                            unlockData={data.unlockData}
                            publisherId={publisherId}
                            publisherType={publisherType}
                            countryId={countryId}
                            onBuyClick={onBuyClick}
                            isProcessingPayment={isProcessingPayment}
                        />
                    </div>
                )}
            </div>
                {/* Why Choose Section - Always show (static content) */}
                {/* <div className="mb-8">
                    <WhyChooseSection />
                </div> */}



            <RimigoFooter/>

           

            {/* Photo Gallery Modal */}
            {allImageUrls.length > 0 && (
                <PhotoGallery
                    images={allImageUrls}
                    isOpen={isGalleryOpen}
                    onClose={() => setIsGalleryOpen(false)}
                    initialIndex={initialPhotoIndex}
                />
            )}
        </div>
    )
}

export default OverviewTabContent
