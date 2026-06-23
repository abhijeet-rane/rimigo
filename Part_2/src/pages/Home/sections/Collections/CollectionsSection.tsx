import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CollectionCardVerticalCTAList } from '@/components/CollectionCta'
import { CategoryTabs } from '@/pages/Landing/Components/CategoryTabs'
import { contentCollectionApi, type CollectionListItem } from '@/modules/ContentCollection/api/contentCollectionApi'
import { mapCollectionToCardItem, getCollectionDetailPath } from '@/pages/Collections/utils/collectionCardMappers'
import { getLiveCountries, type LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI'
import CustomShimmer from '@/components/shared/Shimmer'
import { STATIC_TEXT } from '@/constants'
import { TRIPBOARDS_ROUTE } from '@/routes/routes'
import { ChevronRight } from 'lucide-react'
import { sortCollectionsByPrice } from './utlis/Collectionsortinghelpers' 

const ALL_TAB = 'all'

function AllCollectionsSectionShimmer() {
    return (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[1, 2, 3].map((i) => (
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

interface CollectionsSectionProps {
    title?: string
    showTabs?: boolean
    limit?: number
}

export const CollectionsSection: React.FC<CollectionsSectionProps> = ({
    title = STATIC_TEXT.COLLECTIONS_HEADER,
    showTabs = true,
    limit
}) => {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<string>(ALL_TAB)

    const handleCollectionClick = useCallback(
        (item: CollectionListItem) => {
            navigate(getCollectionDetailPath(item))
        },
        [navigate]
    )

    const handleSeeAllClick = useCallback(() => {
        const queryParams = new URLSearchParams()
        if (activeTab !== ALL_TAB) {
            queryParams.set('tab', activeTab)
        }
        navigate(`${TRIPBOARDS_ROUTE}?${queryParams.toString()}`)
    }, [navigate, activeTab])

    const { data: allCollectionsData, isLoading: isAllCollectionsLoading } = useQuery({
        queryKey: ['collection-list', 'all', limit ?? 'unlimited'], 
        queryFn: () => contentCollectionApi.getCollectionList({}),
        staleTime: 5 * 60 * 1000
    })

    const { data: liveCountriesData } = useQuery({
        queryKey: ['live-countries'],
        queryFn: getLiveCountries,
        staleTime: 5 * 60 * 1000,
        enabled: showTabs
    })

    const allCollections = allCollectionsData?.data ?? []
    const liveCountries = liveCountriesData ?? []    

    const countryTabsFromLive = useMemo(() => 
        showTabs ? getCountryTabsFromLiveCountries(liveCountries, allCollections) : [],
        [liveCountries, allCollections, showTabs]
    )

    useEffect(() => {
        if (activeTab === ALL_TAB) return
        const exists = countryTabsFromLive.some((c) => c.country_id === activeTab)
        if (!exists) {
            setActiveTab(ALL_TAB)
        }
    }, [countryTabsFromLive, activeTab])

    const availableCategories = useMemo(() => 
        [ALL_TAB, ...countryTabsFromLive.map((c) => c.country_id)], 
        [countryTabsFromLive]
    )

    const categoryTitles = useMemo(() => {
        const titles: Record<string, string> = { [ALL_TAB]: 'All' }
        countryTabsFromLive.forEach((c) => {
            titles[c.country_id] = c.country_name
        })
        return titles
    }, [countryTabsFromLive])

    const categoryIcons = useMemo(() => {
        const icons: Record<string, React.ReactNode> = {
            [ALL_TAB]: <span className="shrink-0" aria-hidden>🌏</span>
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
        return allCollections.filter((collection) => 
            collection.countries?.some((country) => country.name?.toLowerCase().trim() === target)
        )
    }, [activeTab, allCollections, countryTabsFromLive])

    // Sort by price: free first, then paid
    const sortedCollections = useMemo(() => 
        sortCollectionsByPrice(filteredCollections), 
        [filteredCollections]
    )

    const displayedCollections = useMemo(() => {
        return limit ? sortedCollections.slice(0, limit) : sortedCollections
    }, [sortedCollections, limit])

    const filteredCardItems = useMemo(
        () =>
            displayedCollections.map((collection) =>
                mapCollectionToCardItem(collection, handleCollectionClick, {
                    overviewColumns: 2,
                    fillWidth: true,
                    imageFullOpacity: true,
                    analyticsContext: { section: 'landing' }
                })
            ),
        [displayedCollections, handleCollectionClick]
    )

    if (isAllCollectionsLoading) {
        return (
            <section className="w-full px-4 md:px-8 py-4 md:py-6 flex items-start justify-center mt-10">
                <h2 className="text-3xl md:text-4xl font-bold text-grey-0 tracking-tight mb-6">{title}</h2>
                <AllCollectionsSectionShimmer />
            </section>
        )
    }

    if (!filteredCardItems.length) {
        return null
    }

    return (
        <section className="max-w-7xl mx-auto px-6 md:px-8 py-2 mt-10">
            <div className="flex flex-col gap-3">
                <div className="flex flex-col items-center justify-center gap-1 py-8">
                    <h2 className="text-3xl md:text-4xl font-bold font-red-hat-display text-grey-0 text-center">{title}</h2>
                </div>
                {availableCategories.length > 1 && showTabs && (
                    <CategoryTabs
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        availableCategories={availableCategories}
                        categoryTitles={categoryTitles}
                        categoryIcons={categoryIcons}
                    />
                )}
            </div>

            {!filteredCardItems.length && (
                <p className="mt-6 text-center text-grey-2">No collections yet for this country.</p>
            )}

            {filteredCardItems.length > 0 && (
                <>
                    <div className="mt-3 md:mt-4">
                        <CollectionCardVerticalCTAList
                            items={filteredCardItems}
                            className="gap-3 md:gap-5"
                        />
                    </div>
                    {/* "See all" button */}
                    <div className="flex items-end justify-center mt-8">
                        <button
                            onClick={handleSeeAllClick}
                            className="flex items-center gap-[0.5px] text-primary-default hover:text-primary-dark transition-colors cursor-pointer hover:underline">
                            <p className="text-[16px] leading-[18px] font-bold font-red-hat-display text-primary-default">SEE ALL</p>
                            <ChevronRight className="w-4 h-4 text-primary-default" />
                        </button>
                    </div>
                </>
            )}
        </section>
    )
}

export default CollectionsSection