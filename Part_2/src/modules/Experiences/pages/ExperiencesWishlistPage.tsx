import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import SearchHeader from '@/components/common/SearchHeader'
import ListCard from '@/components/ListCard'
import ShortlistButton from '@/components/common/ShortlistButton'
import { ExperienceCardData } from '../types/experienceCardTypes'
import type { ShortlistedByTripExperienceResult } from '../api/experienceShortlistAPI'
import { bulkUpsertTripExperiences, getCityWiseShortlistedExperiences } from '../api/experienceShortlistAPI'
import { toast } from 'sonner'
import { useExperiencesWishlistSearch } from '../hooks/useExperiencesWishlistSearch'
import { formatPrice } from '../utils/priceFormatter'
import LoadingMoreExperiences from '../components/ExperiencesExploreLandingPage/LoadingMoreExperiences'
import { useIsMobile } from '@/hooks/use-mobile'
import MobileCompleteHeaderWithSearch from '@/components/MobileCompleteHeaderWithSearch'

interface CityWiseExperiences {
    city_id: string
    city_name: string
    experiences: ExperienceCardData[]
}

const transformExperience = (item: ShortlistedByTripExperienceResult): ExperienceCardData => {
    const experience = item.experience
    const experienceId = experience?.id || item.experience_id || ''

    const price = experience?.price ||
        item.price || {
            currency: 'INR',
            lower_bound: 0,
            upper_bound: 0
        }

    const image = experience?.display_props?.landscape_image || item.content?.[0] || ''

    const cityName = experience?.base_city?.name || 'Unknown City'
    const cityId = '' // City ID not available in shortlist response, would need to fetch separately if needed

    const categories = experience?.categories || []

    return {
        id: experienceId,
        title: experience?.name || 'Unnamed Experience',
        city_name: cityName,
        city_id: cityId,
        price: {
            lower_bound: price.lower_bound || null,
            upper_bound: price.upper_bound || null,
            currency: price.currency || null
        },
        image,
        suggestion_priority: null, // Not available in shortlist response
        short_description: experience?.short_description ?? null,
        category: null,
        categoryBackendValue: categories.length > 0 ? categories[0] : null, // Use first category as primary
        categories: categories.length > 0 ? categories : null // All categories for tags
    }
}

const ExperiencesWishlistPage = () => {
    const { tripId } = useParams<{ tripId: string }>()
    const [searchParams] = useSearchParams()

    const [shortlistState, setShortlistState] = useState<Record<string, { experienceId: string; isShortlisted: boolean }>>({})
    const [shortlistLoadingIds, setShortlistLoadingIds] = useState<Record<string, boolean>>({})
    const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
    const sentinelRef = useRef<HTMLDivElement>(null)
    const isMobile = useIsMobile()
    const countryIdFromParams = searchParams.get('country_id')
    const PAGE_SIZE = 10

    // Use search hook for wishlist page
    const { whereConfig, whenConfig, preferencesConfig, onSearch } = useExperiencesWishlistSearch()

    // Fetch experiences using infinite query
    const {
        data: experiencesData,
        isLoading,
        error: queryError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['cityWiseShortlistedExperiences', tripId, countryIdFromParams],
        queryFn: async ({ pageParam = 1 }) => {
            if (!tripId) {
                throw new Error('Trip ID is missing in the URL.')
            }
            const response = await getCityWiseShortlistedExperiences({
                tripId,
                country: countryIdFromParams || undefined,
                page: pageParam,
                limit: PAGE_SIZE
            })
            return response
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage || !lastPage.has_more) return undefined
            return lastPage.page + 1
        },
        initialPageParam: 1,
        enabled: !!tripId
    })

    // Merge city-wise experiences from all pages
    const cityWiseExperiences = useMemo(() => {
        if (!experiencesData?.pages) return []

        const cityMap = new Map<string, CityWiseExperiences>()

        // Process all pages
        experiencesData.pages.forEach((page) => {
            const results = page.results ?? {}
            Object.entries(results).forEach(([cityName, experienceItems]) => {
                const transformedExperiences = experienceItems.map((item) => transformExperience(item))

                if (cityMap.has(cityName)) {
                    // City exists, merge experiences (avoid duplicates by ID)
                    const existingCity = cityMap.get(cityName)!
                    const existingIds = new Set(existingCity.experiences.map((exp) => exp.id))
                    const newExperiences = transformedExperiences.filter((exp) => !existingIds.has(exp.id))
                    cityMap.set(cityName, {
                        ...existingCity,
                        experiences: [...existingCity.experiences, ...newExperiences]
                    })
                } else {
                    // New city
                    cityMap.set(cityName, {
                        city_id: transformedExperiences[0]?.city_id || cityName,
                        city_name: cityName,
                        experiences: transformedExperiences
                    })
                }
            })
        })

        return Array.from(cityMap.values())
    }, [experiencesData])

    // Build shortlist state from all experiences across all pages
    useEffect(() => {
        if (!experiencesData?.pages) return

        const nextShortlistState = experiencesData.pages.reduce<Record<string, { experienceId: string; isShortlisted: boolean }>>((acc, page) => {
            const results = page.results ?? {}
            Object.values(results).forEach((experienceArray) => {
                experienceArray.forEach((item) => {
                    const experienceId = item.experience?.id || item.experience_id
                    if (experienceId) {
                        acc[experienceId] = {
                            experienceId,
                            isShortlisted: item.is_traveler_shortlisted ?? true
                        }
                    }
                })
            })
            return acc
        }, {})

        setShortlistState(nextShortlistState)
    }, [experiencesData])

    const totalCount = experiencesData?.pages[0]?.total ?? 0
    const error = queryError ? (queryError as Error).message || 'Failed to load shortlisted experiences.' : null

    // Intersection Observer for infinite scroll
    useEffect(() => {
        if (!hasNextPage || isFetchingNextPage || isLoading) return

        const sentinel = sentinelRef.current
        if (!sentinel) return

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries
                if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    void fetchNextPage()
                }
            },
            {
                root: null,
                rootMargin: '200px',
                threshold: 0.1
            }
        )

        observer.observe(sentinel)

        return () => {
            observer.disconnect()
        }
    }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage])

    const handleToggleShortlist = useCallback(
        async (experienceId: string) => {
            if (!tripId) {
                return
            }

            const entry = shortlistState[experienceId]
            if (!entry) {
                return
            }

            const nextState = !(entry.isShortlisted ?? false)

            setShortlistLoadingIds((prev) => ({ ...prev, [experienceId]: true }))

            try {
                await bulkUpsertTripExperiences(tripId, {
                    trip_id: tripId,
                    experiences: [
                        {
                            experience_id: experienceId,
                            is_traveler_shortlisted: nextState
                        }
                    ]
                })

                setShortlistState((prev) => ({
                    ...prev,
                    [experienceId]: {
                        experienceId,
                        isShortlisted: nextState
                    }
                }))

                toast.success(nextState ? 'Added to shortlist' : 'Removed from shortlist')
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Failed to update shortlist', err)
                toast.error('Could not update shortlist. Please try again.')
            } finally {
                setShortlistLoadingIds((prev) => {
                    const next = { ...prev }
                    delete next[experienceId]
                    return next
                })
            }
        },
        [shortlistState, tripId]
    )

    const handleExperienceClick = useCallback(
        (experienceId: string) => {
            const url = `/experiences/${experienceId}/?${searchParams.toString()}`
            window.open(url, '_blank')
        },
        [searchParams]
    )

    return (
        <div className="min-h-screen flex flex-col bg-natural-white">
            <div className="md:hidden sticky top-0 z-30">
                <MobileCompleteHeaderWithSearch
                    title={'Wishlist'}
                    headerType={'experiences'}
                    iconSrc={'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/explore_activities.png'}
                    onSearch={onSearch}
                    whereConfig={whereConfig}
                    whenConfig={whenConfig}
                    preferencesConfig={preferencesConfig}
                    wishlistConfig={{ enabled: false }}
                />
            </div>
            <SearchHeader
                ishidden={true}
                iconSrc={'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/explore_activities.png'}
                pageName="Wishlist"
                onSearch={onSearch}
                whereConfig={whereConfig}
                whenConfig={whenConfig}
                preferencesConfig={preferencesConfig}
                assistantConfig={{ enabled: false }}
                filterConfig={{ enabled: false }}
                sortConfig={{ enabled: false }}
                wishlistConfig={{ enabled: false }}
            />
            <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 overflow-visible max-w-[1320px] mx-auto">
                {!tripId && <div className="text-center text-red-500 font-medium">Trip ID missing. Please check the URL.</div>}

                {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

                {totalCount > 0 && (
                    <div className="mb-4 text-sm text-grey-grey_2">
                        {totalCount} {totalCount === 1 ? 'result' : 'results'}
                    </div>
                )}

                {isLoading && cityWiseExperiences.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 10 }).map((_, index) => (
                            <div
                                key={`wishlist-skeleton-${index}`}
                                className="animate-pulse">
                                <div className="rounded-2xl bg-grey-grey_5 aspect-4/3 mb-4"></div>
                                <div className="h-4 bg-grey-grey_5 rounded mb-2"></div>
                                <div className="h-4 bg-grey-grey_5 rounded w-3/4"></div>
                            </div>
                        ))}
                    </div>
                ) : cityWiseExperiences.length > 0 ? (
                    <>
                        <div className="space-y-12">
                            {cityWiseExperiences.map((cityData) => (
                                <div
                                    key={cityData.city_id}
                                    className="space-y-6">
                                    {/* City Header */}
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-manrope font-semibold text-header-black">{cityData.city_name}</h2>
                                    </div>
                                    {/* Experiences Grid for this City */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-15 items-start overflow-visible">
                                        {cityData.experiences.map((experience) => {
                                            const experienceId = experience.id
                                            const shortlistEntry = shortlistState[experienceId]
                                            const isShortlisted = shortlistEntry?.isShortlisted ?? true
                                            const isShortlisting = Boolean(shortlistLoadingIds[experienceId])

                                            // Format price
                                            const { lower_bound, upper_bound, currency } = experience.price
                                            const formattedPrice = formatPrice(lower_bound || 0, upper_bound || 0, currency || '')

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
                                                        <div className="absolute left-0 top-0 w-full md:z-20 shadow-2xl rounded-2xl">
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
                                                            {/* Shortlist Button - positioned absolutely over the card */}
                                                            <div className="absolute right-3 top-3 z-10">
                                                                <ShortlistButton
                                                                    ariaLabel="Save to shortlist"
                                                                    isShortlisted={isShortlisted}
                                                                    onShortlist={async () => {
                                                                        await handleToggleShortlist(experienceId)
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
                                                                    await handleToggleShortlist(experienceId)
                                                                }}
                                                                isLoading={isShortlisting}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Sentinel element for infinite scroll */}
                        {hasNextPage && (
                            <div
                                ref={sentinelRef}
                                className="h-10 w-full"
                            />
                        )}

                        {/* Loading more indicator */}
                        {isFetchingNextPage && <LoadingMoreExperiences />}
                    </>
                ) : !isLoading && !error ? (
                    <div className="rounded-lg border border-dashed border-feature-card-border bg-white px-6 py-12 text-center">
                        <h2 className="text-xl font-semibold text-header-black">No shortlisted experiences yet</h2>
                        <p className="mt-2 text-sm text-grey-grey_2">Start exploring experiences and add them to your wishlist to see them here.</p>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export default ExperiencesWishlistPage
