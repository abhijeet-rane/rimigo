import { useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BreadcrumbItem, BreadcrumbSegment, BreadcrumbConfig } from './types'
import { breadcrumbConfig, routePatterns } from './breadcrumbConfig'
import { getCountryBasicInfo } from '@/api/curation/locationPersonalizationAPI'
import { getCityBasicInfo } from '@/api/curation/locationPersonalizationAPI'
import { getCollectionById } from '@/modules/Acitvities/api/collectionsAPI'
import { getActivitiesByGroupTypeSectionTitle } from '@/modules/Acitvities/components/utils/activitiesByGroupTypeSectinTitle'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

/**
 * Parse pathname into segments based on route patterns
 */
const parsePathname = (pathname: string): BreadcrumbSegment[] => {
    const segments: BreadcrumbSegment[] = []

    // Try rimigo country/collection pattern first
    const rimigoCollectionMatch = pathname.match(routePatterns.rimigoCountryCollection)
    if (rimigoCollectionMatch) {
        segments.push({
            key: 'rimigo-collections',
            id: 'collections',
            paramName: 'collections'
        })
        segments.push({
            key: 'rimigo-country',
            id: rimigoCollectionMatch[1],
            paramName: 'countryName'
        })
        segments.push({
            key: 'rimigo-collection',
            id: rimigoCollectionMatch[2],
            paramName: 'identifier'
        })
        return segments
    }

    // Try rimigo country pattern
    const rimigoCountryMatch = pathname.match(routePatterns.rimigoCountry)
    if (rimigoCountryMatch) {
        segments.push({
            key: 'rimigo-collections',
            id: 'collections',
            paramName: 'collections'
        })
        segments.push({
            key: 'rimigo-country',
            id: rimigoCountryMatch[1],
            paramName: 'countryName'
        })
        return segments
    }

    // Try country/city/filter pattern
    const filterMatch = pathname.match(routePatterns.countryCityFilter)
    if (filterMatch) {
        segments.push({
            key: 'country',
            id: filterMatch[1],
            paramName: 'countryId'
        })
        segments.push({
            key: 'city',
            id: filterMatch[2],
            paramName: 'cityId'
        })
        segments.push({
            key: 'filter',
            id: filterMatch[3],
            paramName: 'filterId'
        })
        return segments
    }

    // Try country/city/collection pattern
    const collectionMatch = pathname.match(routePatterns.countryCityCollection)
    if (collectionMatch) {
        segments.push({
            key: 'country',
            id: collectionMatch[1],
            paramName: 'countryId'
        })
        segments.push({
            key: 'city',
            id: collectionMatch[2],
            paramName: 'cityId'
        })
        segments.push({
            key: 'collection',
            id: collectionMatch[3],
            paramName: 'collectionId'
        })
        return segments
    }

    // Try country/city pattern
    const cityMatch = pathname.match(routePatterns.countryCity)
    if (cityMatch) {
        segments.push({
            key: 'country',
            id: cityMatch[1],
            paramName: 'countryId'
        })
        segments.push({
            key: 'city',
            id: cityMatch[2],
            paramName: 'cityId'
        })
        return segments
    }

    return segments
}

/**
 * Custom hook to fetch country name with React Query
 */
const useCountryName = (countryId: string | null) => {
    return useQuery({
        queryKey: ['countryBasicInfo', countryId],
        queryFn: () => getCountryBasicInfo(countryId!),
        enabled: !!countryId,
        select: (data) => {
            // Extract country name from the response
            // The API might return country_name directly or nested
            return data?.country_name || null
        }
    })
}

/**
 * Custom hook to fetch city name with React Query
 */
const useCityName = (cityId: string | null) => {
    return useQuery({
        queryKey: ['cityBasicInfo', cityId],
        queryFn: () => getCityBasicInfo(cityId!),
        enabled: !!cityId,
        select: (data) => data?.data?.city_name || null
    })
}

/**
 * Custom hook to fetch collection name with React Query
 */
const useCollectionName = (collectionId: string | null) => {
    return useQuery({
        queryKey: ['collection', collectionId],
        queryFn: () => getCollectionById(collectionId!),
        enabled: !!collectionId,
        select: (data) => data?.collection?.name || null
    })
}

/**
 * Custom hook to decode rimigo country name from slug
 */
const useRimigoCountryName = (countrySlug: string | null) => {
    return useQuery({
        queryKey: ['rimigo-country-name', countrySlug],
        queryFn: async () => {
            if (!countrySlug) return null
            // Decode country name from slug
            return countrySlug
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
        },
        enabled: !!countrySlug,
        staleTime: Infinity // Country name from slug doesn't change
    })
}

/**
 * Custom hook to fetch rimigo collection name with React Query
 */
const useRimigoCollectionName = (identifier: string | null) => {
    return useQuery({
        queryKey: ['rimigo-collection', identifier],
        queryFn: async () => {
            if (!identifier) return null
            // const response = await contentCollectionApi.getByIdentifier(identifier)
            return null
        },
        enabled: !!identifier,
        refetchOnMount: false,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })
}

/**
 * Main breadcrumb hook
 * Parses the current route and resolves all segment names
 */
export const useBreadcrumbs = (config: BreadcrumbConfig = breadcrumbConfig, providedSearchParams?: URLSearchParams): BreadcrumbItem[] => {
    const location = useLocation()
    const pathname = location.pathname
    const [searchParamsFromHook] = useSearchParams()
    const searchParams = providedSearchParams || searchParamsFromHook

    // Parse pathname into segments
    const segments = useMemo(() => parsePathname(pathname), [pathname])

    // Extract IDs for each segment type
    const countryId = useMemo(() => segments.find((s) => s.key === 'country')?.id || null, [segments])
    const cityId = useMemo(() => segments.find((s) => s.key === 'city')?.id || null, [segments])
    const collectionId = useMemo(() => segments.find((s) => s.key === 'collection')?.id || null, [segments])
    const filterId = useMemo(() => segments.find((s) => s.key === 'filter')?.id || null, [segments])
    const rimigoCountrySlug = useMemo(() => segments.find((s) => s.key === 'rimigo-country')?.id || null, [segments])
    const rimigoCollectionId = useMemo(() => segments.find((s) => s.key === 'rimigo-collection')?.id || null, [segments])

    // Fetch names using React Query (with caching)
    const { data: countryName, isLoading: isCountryLoading } = useCountryName(countryId)
    const { data: cityName, isLoading: isCityLoading } = useCityName(cityId)
    const { data: collectionName, isLoading: isCollectionLoading } = useCollectionName(collectionId)
    const { data: rimigoCountryName, isLoading: isRimigoCountryLoading } = useRimigoCountryName(rimigoCountrySlug)
    const { data: rimigoCollectionName, isLoading: isRimigoCollectionLoading } = useRimigoCollectionName(rimigoCollectionId)

    // For filter, we need to get the filter name based on filterId
    // For now, filterId is "groupType", so we'll resolve it from query params
    const filterName = useMemo(() => {
        if (!filterId) return null
        // For now, filterId is "groupType", get the actual group type from query params
        if (filterId === 'groupType') {
            const groupType = searchParams.get('groupType')
            if (groupType) {
                return getActivitiesByGroupTypeSectionTitle(groupType).title
            }
            return 'Group Type'
        }
        return filterId
    }, [filterId, searchParams])

    // Build breadcrumb items
    return useMemo(() => {
        const items: BreadcrumbItem[] = []

        // Always add home
        items.push({
            label: config.home.label,
            href: config.home.href
        })

        // Add segments in order
        const accumulatedSegments: BreadcrumbSegment[] = []

        for (const segment of segments) {
            accumulatedSegments.push(segment)

            // Get the segment config
            const segmentConfig = config.segments.find((s) => s.key === segment.key)
            if (!segmentConfig) continue

            // Get the resolved name based on segment key
            let label: string | null = null
            let isLoading = false

            switch (segment.key) {
                case 'country':
                    label = countryName || null
                    isLoading = isCountryLoading
                    break
                case 'city':
                    label = cityName || null
                    isLoading = isCityLoading
                    break
                case 'collection':
                    label = collectionName || null
                    isLoading = isCollectionLoading
                    break
                case 'filter':
                    label = filterName || null
                    isLoading = false // Filter name is resolved synchronously
                    break
                case 'rimigo-collections':
                    label = 'Collections'
                    isLoading = false
                    break
                case 'rimigo-country':
                    label = rimigoCountryName || null
                    isLoading = isRimigoCountryLoading
                    break
                case 'rimigo-collection':
                    label = rimigoCollectionName || null
                    isLoading = isRimigoCollectionLoading
                    break
            }

            // Build href for this segment, preserving current query params
            const href = segmentConfig.buildHref(accumulatedSegments.slice(0, -1), segment.id, searchParams)

            // Add breadcrumb item
            items.push({
                label: label || segment.id, // Fallback to ID if name not resolved
                href,
                isLoading
            })
        }

        return items
    }, [
        segments,
        countryName,
        cityName,
        collectionName,
        filterName,
        rimigoCountryName,
        rimigoCollectionName,
        isCountryLoading,
        isCityLoading,
        isCollectionLoading,
        isRimigoCountryLoading,
        isRimigoCollectionLoading,
        config,
        searchParams
    ])
}
