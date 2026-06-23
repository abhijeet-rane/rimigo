import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CollectionCardVerticalCTAList, CollectionCTACardBanner } from '@/components/CollectionCta'
import { HeaderWithSidebar } from '@/pages/Landing/Components/HeaderWithSidebar'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import { CategoryTabs } from '@/pages/Landing/Components/CategoryTabs'
import { contentCollectionApi, type CollectionListItem } from '@/modules/ContentCollection/api/contentCollectionApi'
import { mapCollectionToCardItem, getCollectionDetailPath } from './utils/collectionCardMappers'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useTravelerDetails } from '@/modules/TravelerProfile/hooks/travelerProfile'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { useCountries } from '@/hooks/useCountries'
import { useTripFlags } from '@/hooks/useTripFlags'
import { getLiveCountries, type LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI'
import CustomShimmer from '@/components/shared/Shimmer'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'
import Divider from '@/components/shared/Divider/Divider'
import { useAuth } from '@/lib/auth/providers/AuthProviders'

interface CollectionPageProps {
    headerClassName?: string
    hideHeader?: boolean 
    TitleClassname?: string
    hidePersonalized?: boolean
}

const ALL_TAB = 'all'

function PersonalizedSectionShimmer() {
    return (
        <section className="w-full px-0 py-4 md:py-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CustomShimmer
                    height={32}
                    radius={8}
                    className="max-w-[280px]"
                />
            </div>
            <div className="mt-6 md:mt-8 hidden md:block">
                <CustomShimmer
                    height={320}
                    radius={16}
                    className="w-full max-w-[760px] mx-auto"
                />
            </div>
            <div className="mt-6 md:hidden flex flex-col gap-4">
                <CustomShimmer
                    height={380}
                    radius={16}
                    className="w-full max-w-[360px] mx-auto"
                />
            </div>
        </section>
    )
}

function AllCollectionsSectionShimmer() {
    return (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <CustomShimmer
                    key={i}
                    height={420}
                    radius={16}
                    className="w-full max-w-[360px] mx-auto sm:mx-0"
                />
            ))}
        </div>
    )
}

/** Live countries that have at least one collection (match by country name) */
function getCountryTabsFromLiveCountries(
    liveCountries: LocationPersonalizationResponse[],
    collections: CollectionListItem[]
): LocationPersonalizationResponse[] {
    const namesInCollections = new Set(
        collections
            .flatMap((c) => c.countries ?? [])
            .map((country) => country.name?.toLowerCase().trim())
            .filter(Boolean)
    )
    return liveCountries.filter((live) => namesInCollections.has(live.country_name?.toLowerCase().trim()))
}

export const CollectionsPage: React.FC<CollectionPageProps> = ({ 
        headerClassName, 
        hideHeader = false ,
        TitleClassname , 
        hidePersonalized = false 
    }) => {
    const navigate = useNavigate()
    const { trackEvent } = usePostHog()
    const travelerTrips = useOptionalTravelerTrips()
    const [travelerId, setTravelerId] = useState<string | undefined>()
    const [searchParams] = useSearchParams()
    const { isAuthenticated } = useAuth()
    

    useEffect(() => {
        TokenStorage.getUserInfo()
            .then((userInfo) => setTravelerId(userInfo?.traveler_id))
            .catch(() => setTravelerId(undefined))
    }, [])

    useEffect(() => {
        trackEvent(POSTHOG_EVENTS.COLLECTIONS_PAGE_VIEW, { page: 'collections' })
    }, [trackEvent])

    const { travelerDetails } = useTravelerDetails(travelerId)
    const activeTrip = travelerTrips?.activeTrip

    const isTripPlanned = Boolean(activeTrip?.final_destination_countries && activeTrip.final_destination_countries.length > 0)
    const { allCountries } = useCountries({ shouldUsePrioritized: isTripPlanned })
    const tripFlags = useTripFlags(activeTrip, allCountries)
    const tripDestinations = activeTrip?.final_destination_countries ?? []

    const { sourceId, sourceName } = useMemo(() => {
        const source = travelerDetails?.source
        if (!source) {
            return { sourceId: undefined, sourceName: undefined }
        }

        if (typeof source === 'string') {
            return { sourceId: source, sourceName: source }
        }

        if (typeof source === 'object') {
            const sourceObj = source as { id?: string; name?: string }
            return {
                sourceId: sourceObj.id,
                sourceName: sourceObj.name
            }
        }

        return { sourceId: undefined, sourceName: undefined }
    }, [travelerDetails])

    const countryIds = useMemo(() => {
        const fromProfile = activeTrip?.tripProfile?.final_destination_countries
        if (Array.isArray(fromProfile) && fromProfile.length > 0) {
            return fromProfile.filter((c): c is string => typeof c === 'string' && c.length > 0)
        }

        const fromTrip = activeTrip?.final_destination_countries
        if (Array.isArray(fromTrip) && fromTrip.length > 0) {
            const ids = fromTrip
                .map((c) => {
                    if (typeof c === 'string') return c
                    const maybeObj = c as { id?: string; country_id?: string }
                    return maybeObj?.id ?? maybeObj?.country_id ?? null
                })
                .filter((id): id is string => Boolean(id))
            if (ids.length > 0) return ids
        }

        return []
    }, [activeTrip])

    const handlePersonalizedCtaClick = useCallback(
        (item: CollectionListItem) => {
            navigate(getCollectionDetailPath(item))
        },
        [navigate]
    )

    const handleAllCtaClick = useCallback(
        (item: CollectionListItem) => {
            navigate(getCollectionDetailPath(item))
        },
        [navigate]
    )

    const { data: personalizedData, isLoading: isPersonalizedLoading } = useQuery({
        queryKey: ['collection-list', 'personalized', sourceId ?? null, sourceName ?? null, countryIds.join(',') || null],
        queryFn: () =>
            contentCollectionApi.getCollectionList({
                ...(sourceId ? { source: sourceId } : {}),
                ...(sourceName ? { sourceName } : {}),
                ...(countryIds.length ? { country_ids: countryIds } : {})
            }),
        enabled: Boolean(sourceId || sourceName || countryIds.length > 0),
        staleTime: 5 * 60 * 1000
    })    

    const personalizedCollections = personalizedData?.data ?? []

    const personalizedCardItems = useMemo(
        () =>
            personalizedCollections.map((collection) =>
                mapCollectionToCardItem(collection, handlePersonalizedCtaClick, {
                    overviewColumns: 2,
                    fillWidth: true,
                    imageFullOpacity: true,
                    analyticsContext: { section: 'personalized' }
                })
            ),
        [personalizedCollections, handlePersonalizedCtaClick]
    )
    const personalizedCardsPlain = useMemo(
        () =>
            personalizedCardItems.map((item) => ({
                ...item,
                headerTone: 'plain' as const
            })),
        [personalizedCardItems]
    )

    const { data: allCollectionsData, isLoading: isAllCollectionsLoading } = useQuery({
        queryKey: ['collection-list', 'all'],
        queryFn: () => contentCollectionApi.getCollectionList({}),
        staleTime: 5 * 60 * 1000
    })

    const { data: liveCountriesData } = useQuery({
        queryKey: ['live-countries'],
        queryFn: getLiveCountries,
        staleTime: 5 * 60 * 1000
    })

    const allCollections = allCollectionsData?.data ?? []
    const liveCountries = liveCountriesData ?? []

    const countryTabsFromLive = useMemo(() => getCountryTabsFromLiveCountries(liveCountries, allCollections), [liveCountries, allCollections])

    const [activeTab, setActiveTab] = useState<string>(() => {
        const tabParam = searchParams.get('tab')
        return tabParam || ALL_TAB
    })

    useEffect(() => {
        if (activeTab === ALL_TAB) return
        const exists = countryTabsFromLive.some((c) => c.country_id === activeTab)
        if (!exists) {
            setActiveTab(ALL_TAB)
        }
    }, [countryTabsFromLive, activeTab])

    const availableCategories = useMemo(() => [ALL_TAB, ...countryTabsFromLive.map((c) => c.country_id)], [countryTabsFromLive])
    const categoryTitles = useMemo(() => {
        const titles: Record<string, string> = { [ALL_TAB]: 'All' }
        countryTabsFromLive.forEach((c) => {
            titles[c.country_id] = c.country_name
        })
        return titles
    }, [countryTabsFromLive])

    const categoryIcons = useMemo(() => {
        const icons: Record<string, React.ReactNode> = {
            [ALL_TAB]: (
                <span
                    className="shrink-0"
                    aria-hidden>
                    🌏
                </span>
            )
        }
        countryTabsFromLive.forEach((c) => {
            if (c.flag_icon_url) {
                icons[c.country_id] = (
                    <img
                        src={c.flag_icon_url}
                        alt=""
                        className="w-4 h-4 shrink-0 rounded-full object-cover"
                        aria-hidden
                    />
                )
            }
        })
        return icons
    }, [countryTabsFromLive])

    const filteredCollections = useMemo(() => {
        if (activeTab === ALL_TAB) return allCollections
        const selected = countryTabsFromLive.find((c) => c.country_id === activeTab)
        if (!selected) return allCollections
        const target = selected.country_name?.toLowerCase().trim()
        return allCollections.filter((collection) => collection.countries?.some((country) => country.name?.toLowerCase().trim() === target))
    }, [activeTab, allCollections, countryTabsFromLive])

    const filteredCardItems = useMemo(
        () =>
            filteredCollections.map((collection) =>
                mapCollectionToCardItem(collection, handleAllCtaClick, {
                    overviewColumns: 2,
                    fillWidth: true,
                    imageFullOpacity: true,
                    analyticsContext: { section: 'all' }
                })
            ),
        [filteredCollections, handleAllCtaClick]
    )

    const renderPersonalizedSectionHeading = () => {
        if (tripDestinations.length === 0) {
            return <h2 className="text-2xl font-semibold tracking-tight text-grey-0">For your upcoming trip</h2>
        }
        if (tripDestinations.length === 1) {
            const name = tripDestinations[0]?.name ?? 'trip'
            const flagUrl = tripFlags.flags[0]
            return (
                <h2 className="text-2xl font-semibold tracking-tight text-grey-0 flex flex-wrap items-center gap-2">
                    For your{' '}
                    {flagUrl ? (
                        <img
                            src={flagUrl}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover border-[2px] border-white inline-block align-middle"
                            aria-hidden
                        />
                    ) : null}{' '}
                    {name} trip
                </h2>
            )
        }
        return (
            <h2 className="text-2xl font-semibold tracking-tight text-grey-0 flex flex-wrap items-center gap-2 font-manrope">
                For your{' '}
                <span
                    className="inline-flex items-center -space-x-1.5 shrink-0"
                    aria-hidden>
                    {tripFlags.flags.slice(0, 3).map((url, i) => (
                        <img
                            key={i}
                            src={url}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover border-[2px] border-white"
                            style={{ zIndex: tripFlags.flags.length - i }}
                        />
                    ))}
                </span>{' '}
                Multidestination trip
            </h2>
        )
    }

    const renderPersonalizedSection = () => {
        if (isPersonalizedLoading) {
            return <PersonalizedSectionShimmer />
        }

        if (!personalizedCardItems.length) {
            return null
        }

        return (
            <>
                <section className="w-full px-0 py-2 md:py-5">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>{renderPersonalizedSectionHeading()}</div>
                    </div>

                    <GenericCarousel
                        className="mt-4 md:mt-5 hidden md:block"
                        containerClassName="pb-2"
                        gap={8}
                        gradientStartColor="white"
                        gradientEndColor="rgba(255,255,255,0)">
                        {personalizedCardItems.map((card, index) => (
                            <div
                                key={card.id ?? index}
                                className="flex-none w-[658px] max-w-[658px] shrink-0">
                                <CollectionCTACardBanner
                                    {...card}
                                    maxWidthClassName="md:max-w-[650px]"
                                />
                            </div>
                        ))}
                    </GenericCarousel>
                    <div className="mt-4 md:hidden bg-white">
                        <CollectionCardVerticalCTAList
                            items={personalizedCardsPlain}
                            className="gap-4"
                            cardClassName="max-w-[360px] w-full mx-auto"
                        />
                    </div>
                </section>
                <Divider />
            </>
        )
    }

    const renderAllCollectionsSection = () => {
        return (
            <section className="w-full px-0 py-4 md:py-6">
                <div className="flex flex-col gap-3 items-center justify-center">
                    <div className="flex flex-col gap-4 items-center mb-3">
                            <p className={` hidden text-[26px] md:text-[34px] font-red-hat-display text-grey-0 leading-tight font-[650] ${TitleClassname}`}>
                                Need Inspiration?
                            </p>
                        <h2 className="font-manrope font-[600] text-[22px] md:text-[28px] text-grey-0 leading-tight text-center">
                        Explore Tripboards of <br className='block md:hidden'/> fellow travelers
                    </h2>
                    </div>
                    {availableCategories.length > 1 && (
                        <CategoryTabs
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            availableCategories={availableCategories}
                            categoryTitles={categoryTitles}
                            categoryIcons={categoryIcons}
                        />
                    )}
                </div>

                {isAllCollectionsLoading && <AllCollectionsSectionShimmer />}

                {!isAllCollectionsLoading && !filteredCardItems.length && (
                    <p className="mt-6 text-center text-grey-2">No collections yet for this country.</p>
                )}

                {!isAllCollectionsLoading && filteredCardItems.length > 0 && (
                    <div className="mt-3 md:mt-4">
                        <CollectionCardVerticalCTAList
                            items={filteredCardItems}
                            className="gap-3 md:gap-5"
                        />
                    </div>
                )}
            </section>
        )
    }

    return (
        <>
            {/* Desktop header */}
            {!hideHeader && (
                <div className={headerClassName}>
                    <HeaderWithSidebar
                        showCountrySwitcher={false}
                        heading="Tripboards"
                        showTripSelectionButton
                    />
                </div>
            )}
            <div className="min-h-screen w-full   bg-white pb-6">
                <div className={`mx-auto flex flex-col justify-center items-center gap-5 md:gap-6 px-4 md:px-8 
                    ${isAuthenticated ? 'max-w-7xl' : 'max-w-7xl'} `}>
                    {!hidePersonalized && renderPersonalizedSection()}
                    <div
                        className="hidden md:block"
                        aria-hidden
                    />
                    {renderAllCollectionsSection()}
                </div>
            </div>
        </>
    )
}

export default CollectionsPage
