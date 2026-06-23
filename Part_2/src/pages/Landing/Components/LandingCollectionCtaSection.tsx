import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CollectionCardVerticalCTA, CollectionCtaLandingCTA, CollectionCardVerticalCTAList } from '@/components/CollectionCta'
import { contentCollectionApi, type CollectionListItem } from '@/modules/ContentCollection/api/contentCollectionApi'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useTravelerDetails } from '@/modules/TravelerProfile/hooks/travelerProfile'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { mapCollectionToCardItem, getCollectionDetailPath } from '@/pages/Collections/utils/collectionCardMappers'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'

const CollectionsSectionHeading: React.FC<{ onExploreAll?: () => void }> = () => {
    return (
        <div className="w-full flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] items-center gap-4 mb-8 md:mb-10">
            <div
                className="hidden sm:block"
                aria-hidden
            />
            <h2 className="text-center sm:whitespace-nowrap sm:col-start-2 sm:justify-self-center">
                <span
                    className="
                        text-[24px] leading-[34px]
                        sm:text-[24px] sm:leading-[38px]
                        md:text-[32px] md:leading-[36px]
                        lg:text-[32px] lg:leading-[32px]
                        xl:text-[32px] xl:leading-[32px]
                        2xl:text-[40px] 2xl:leading-[44px]
                    "
                    style={{
                        fontFamily: 'Red Hat Display',
                        fontWeight: 550,
                        fontStyle: 'normal',
                        letterSpacing: '-0.02em',
                        verticalAlign: 'middle',
                        color: 'grey-0'
                    }}>
                    Tripboards from{' '}
                </span>
                <span
                    className="
                        text-[24px] leading-[34px]
                        sm:text-[24px] sm:leading-[38px]
                        md:text-[32px] md:leading-[36px]
                        lg:text-[36px] lg:leading-[36px]
                        xl:text-[32px] xl:leading-[32px]
                        2xl:text-[40px] 2xl:leading-[44px]
                        italic
                    "
                    style={{
                        fontFamily: 'Red Hat Display',
                        fontWeight: 550,
                        fontStyle: 'italic',
                        letterSpacing: '-0.02em',
                        verticalAlign: 'middle',
                        color: '#7C3AED',
                        position: 'relative',
                        display: 'inline-block'
                    }}>
                    experienced{' '}
                </span>
                <span
                    className="
                        text-[24px] leading-[34px]
                        sm:text-[24px] sm:leading-[38px]
                        md:text-[32px] md:leading-[36px]
                        lg:text-[32px] lg:leading-[32px]
                        xl:text-[32px] xl:leading-[32px]
                        2xl:text-[40px] 2xl:leading-[44px]
        "
                    style={{
                        fontFamily: 'Red Hat Display',
                        fontWeight: 550,
                        fontStyle: 'normal',
                        letterSpacing: '-0.02em',
                        verticalAlign: 'middle',
                        color: 'grey-0',
                        position: 'relative',
                        display: 'inline-block',
                        marginLeft: '0.20em'
                    }}>
                    travelers
                    <img
                        src="/images/sparkles.png"
                        alt="sparkles"
                        className="
                            absolute top-1.5 -right-3
                            sm:top-1.5 sm:-right-3
                            md:top-1.5 md:-right-5
                            lg:top-1.5 lg:-right-5
                            xl:top-1.5 xl:-right-5
                            2xl:top-1.5 2xl:-right-10
                            h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 xl:h-10 xl:w-10
                        "
                        style={{
                            transform: 'translate(50%, -50%)'
                        }}
                    />
                </span>
            </h2>
            {/* {onExploreAll ? (
                <div className="hidden sm:flex sm:col-start-3 justify-end items-center">
                    <button
                        type="button"
                        onClick={onExploreAll}
                        className="shrink-0 font-red-hat-display text-base font-semibold text-primary-default tracking-[-0.02em] cursor-pointer flex items-center gap-1 transition-colors hover:text-primary-dark">
                        SEE ALL
                        <span aria-hidden>&gt;</span>
                    </button>
                </div>
            ) : (
                <div
                    className="hidden sm:block"
                    aria-hidden
                />
            )} */}
        </div>
    )
}

export const LandingCollectionCtaSection: React.FC = () => {
    const navigate = useNavigate()
    const { trackEvent } = usePostHog()
    const [searchParams] = useSearchParams()
    const [travelerId, setTravelerId] = useState<string | undefined>()
    useEffect(() => {
        TokenStorage.getUserInfo()
            .then((userInfo) => setTravelerId(userInfo?.traveler_id))
            .catch(() => setTravelerId(undefined))
    }, [])
    const { travelerDetails } = useTravelerDetails(travelerId)
    const travelerTrips = useOptionalTravelerTrips()
    const activeTrip = travelerTrips?.activeTrip

    const { sourceId, sourceName } = React.useMemo(() => {
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
    const countryIds = React.useMemo(() => {
        const fromProfile = activeTrip?.tripProfile?.final_destination_countries
        if (Array.isArray(fromProfile) && fromProfile.length > 0) {
            return fromProfile.filter((c): c is string => typeof c === 'string' && c.length > 0)
        }
        const fromTrip = activeTrip?.final_destination_countries
        if (Array.isArray(fromTrip) && fromTrip.length > 0) {
            const ids = fromTrip
                .map((c) =>
                    typeof c === 'string'
                        ? c
                        : ((c as { id?: string; country_id?: string })?.id ?? (c as { id?: string; country_id?: string })?.country_id)
                )
                .filter(Boolean) as string[]
            if (ids.length > 0) return ids
        }
        const fromUrl = searchParams.get('country_id')
        if (fromUrl?.trim()) {
            return fromUrl
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
        }
        return []
    }, [activeTrip, searchParams])

    const handleCtaClick = React.useCallback(
        (item: CollectionListItem, cardVariant: 'landing' | 'vertical') => {
            if (cardVariant === 'landing') {
                trackEvent(POSTHOG_EVENTS.COLLECTION_CTA_CLICK, {
                    section: 'landing',
                    card_variant: cardVariant,
                    collection_id: item.identifier,
                    collection_title: item.name
                })
            }
            navigate(getCollectionDetailPath(item))
        },
        [navigate, trackEvent]
    )

  const handleExploreAll = React.useCallback(() => {
    navigate('/tripboards')
  }, [navigate])

    const { data: collectionList } = useQuery({
        queryKey: ['collection-list', sourceId ?? null, sourceName ?? null, countryIds.join(',') || null],
        queryFn: () =>
            contentCollectionApi.getCollectionList({
                ...(sourceId ? { source: sourceId } : {}),
                ...(sourceName ? { sourceName } : {}),
                country_ids: countryIds
            }),
        enabled: (!!sourceId || !!sourceName) && countryIds.length > 0,
        staleTime: 5 * 60 * 1000
    })

    const collections = collectionList?.data ?? []

    if (!collections.length) {
        return null
    }

    if (collections.length === 1) {
        const singleCollection = collections[0]
        const desktopCardProps = mapCollectionToCardItem(singleCollection, (item) => handleCtaClick(item, 'landing'), {
            overviewColumns: 4,
            fillWidth: true,
            analyticsContext: { section: 'landing', cardVariant: 'landing' }
        })
        const mobileCardProps = mapCollectionToCardItem(singleCollection, (item) => handleCtaClick(item, 'vertical'), {
            overviewColumns: 2,
            fillWidth: true,
            analyticsContext: { section: 'landing' }
        })

        return (
            <section className="w-full flex items-center justify-center px-4 py-8 md:py-10 md:px-4">
                <div className="w-full mx-auto md:w-[90%] lg:w-[72%]">
                    <CollectionsSectionHeading onExploreAll={handleExploreAll} />
                    <div className="hidden md:block w-full">
                        <CollectionCtaLandingCTA
                            {...desktopCardProps}
                            overviewItems={desktopCardProps.overviewItems}
                            portraitImageUrls={desktopCardProps.portraitImageUrls}
                        />
                    </div>
                    <div className="md:hidden w-full">
                        <CollectionCardVerticalCTA
                            {...mobileCardProps}
                            overviewItems={mobileCardProps.overviewItems}
                            portraitImageUrls={mobileCardProps.portraitImageUrls}
                        />
                    </div>
                    {handleExploreAll && (
                        <>
                            <div className="md:hidden mt-6 flex justify-center w-full">
                                <button
                                    type="button"
                                    onClick={handleExploreAll}
                                    className="shrink-0 font-red-hat-display text-base font-semibold text-primary-default tracking-[-0.02em] cursor-pointer flex items-center gap-1 transition-colors hover:text-primary-dark">
                                    SEE ALL
                                    <span aria-hidden>&gt;</span>
                                </button>
                            </div>
                            <div className="hidden md:flex mt-8 justify-center w-full">
                                <button
                                    type="button"
                                    onClick={handleExploreAll}
                                    className="shrink-0 font-red-hat-display text-base font-semibold text-primary-default tracking-[-0.02em] cursor-pointer flex items-center gap-1 transition-colors hover:text-primary-dark">
                                    SEE ALL
                                    <span aria-hidden>&gt;</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </section>
        )
    }

    const listItems = collections.map((collection) =>
        mapCollectionToCardItem(collection, (item) => handleCtaClick(item, 'vertical'), {
            overviewColumns: 2,
            fillWidth: true,
            analyticsContext: { section: 'landing' }
        })
    )

    return (
        <section className="w-full flex items-center justify-center px-4 py-8 md:py-12 md:px-6">
            <div className="w-full mx-auto max-w-full md:max-w-[96%] lg:max-w-[94%] xl:max-w-[92%] 2xl:max-w-[88%]">
                <CollectionsSectionHeading onExploreAll={handleExploreAll} />
                <CollectionCardVerticalCTAList
                    items={listItems}
                    className="gap-8 md:gap-10"
                />
                {handleExploreAll && (
                    <>
                        <div className="md:hidden mt-6 flex justify-center w-full">
                            <button
                                type="button"
                                onClick={handleExploreAll}
                                className="shrink-0 font-red-hat-display text-base font-semibold text-primary-default tracking-[-0.02em] cursor-pointer flex items-center gap-1 transition-colors hover:text-primary-dark">
                                SEE ALL
                                <span aria-hidden>&gt;</span>
                            </button>
                        </div>
                        <div className="hidden md:flex mt-8 justify-center w-full">
                            <button
                                type="button"
                                onClick={handleExploreAll}
                                className="shrink-0 font-red-hat-display text-base font-semibold text-primary-default tracking-[-0.02em] cursor-pointer flex items-center gap-1 transition-colors hover:text-primary-dark">
                                SEE ALL
                                <span aria-hidden>&gt;</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </section>
    )
}
