import { BreadcrumbConfig, BreadcrumbSegment } from './types'
import { getCountryBasicInfo, getCityBasicInfo } from '@/api/curation/locationPersonalizationAPI'
import { getCollectionById } from '@/modules/Acitvities/api/collectionsAPI'
import { DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE, RIMIGO_COLLECTION_ROUTE } from '@/routes/routes'
import { contentCollectionApi } from '@/modules/ContentCollection/api/contentCollectionApi'

/**
 * Fetch country name by country ID
 * Note: This is a fallback function. The hook uses React Query for better caching.
 */
const fetchCountryName = async (countryId: string): Promise<string | null> => {
    try {
        const countryInfo = await getCountryBasicInfo(countryId)
        return countryInfo?.country_name || null
    } catch {
        return null
    }
}

/**
 * Fetch city name by city ID
 */
const fetchCityName = async (cityId: string): Promise<string | null> => {
    try {
        const cityInfo = await getCityBasicInfo(cityId)
        return cityInfo?.data?.city_name || null
    } catch {
        return null
    }
}

/**
 * Fetch collection name by collection ID
 * Note: This fetches the full collection. If you have a lighter endpoint, use that instead.
 */
const fetchCollectionName = async (collectionId: string): Promise<string | null> => {
    try {
        const collectionData = await getCollectionById(collectionId)
        return collectionData?.collection?.name || null
    } catch {
        return null
    }
}

/**
 * Decode country name from URL slug (convert hyphens back to spaces and capitalize)
 */
const decodeCountryName = (countrySlug: string): string => {
    return countrySlug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

/**
 * Fetch rimigo collection name by identifier
 */
const fetchRimigoCollectionName = async (identifier: string): Promise<string | null> => {
    try {
        const response = await contentCollectionApi.getByIdentifier(identifier)
        return response.data?.name || null
    } catch {
        return null
    }
}

/**
 * Build href for country segment
 */
const buildCountryHref = (_segments: BreadcrumbSegment[], currentId: string, searchParams?: URLSearchParams): string => {
    const baseUrl = `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}?country_id=${currentId}`
    if (searchParams) {
        const params = new URLSearchParams(searchParams)
        // Don't duplicate country_id
        params.set('country_id', currentId)
        return `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}?${params.toString()}`
    }
    return baseUrl
}

/**
 * Build href for city segment
 */
const buildCityHref = (_segments: BreadcrumbSegment[], currentId: string, searchParams?: URLSearchParams): string => {
    const countrySegment = _segments.find((s) => s.key === 'country')
    if (!countrySegment) {
        const baseUrl = `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/${currentId}`
        if (searchParams) {
            return `${baseUrl}?${searchParams.toString()}`
        }
        return baseUrl
    }
    const baseUrl = `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/${currentId}?country_id=${countrySegment.id}`
    if (searchParams) {
        const params = new URLSearchParams(searchParams)
        // Ensure country_id is set
        params.set('country_id', countrySegment.id)
        return `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/${currentId}?${params.toString()}`
    }
    return baseUrl
}

/**
 * Build href for collection segment
 */
const buildCollectionHref = (_segments: BreadcrumbSegment[], currentId: string, searchParams?: URLSearchParams): string => {
    const countrySegment = _segments.find((s) => s.key === 'country')
    const citySegment = _segments.find((s) => s.key === 'city')

    if (!countrySegment || !citySegment) {
        // Fallback if segments are missing
        const baseUrl = `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/country/${countrySegment?.id || ''}/city/${citySegment?.id || ''}/collection/${currentId}`
        if (searchParams) {
            return `${baseUrl}?${searchParams.toString()}`
        }
        return baseUrl
    }

    const baseUrl = `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/country/${countrySegment.id}/city/${citySegment.id}/collection/${currentId}`
    if (searchParams) {
        return `${baseUrl}?${searchParams.toString()}`
    }
    return baseUrl
}

/**
 * Build href for filter segment
 */
const buildFilterHref = (_segments: BreadcrumbSegment[], currentId: string, searchParams?: URLSearchParams): string => {
    const countrySegment = _segments.find((s) => s.key === 'country')
    const citySegment = _segments.find((s) => s.key === 'city')

    if (!countrySegment || !citySegment) {
        // Fallback if segments are missing
        const baseUrl = `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/country/${countrySegment?.id || ''}/city/${citySegment?.id || ''}/filter/${currentId}`
        if (searchParams) {
            return `${baseUrl}?${searchParams.toString()}`
        }
        return baseUrl
    }

    const baseUrl = `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/country/${countrySegment.id}/city/${citySegment.id}/filter/${currentId}`
    if (searchParams) {
        return `${baseUrl}?${searchParams.toString()}`
    }
    return baseUrl
}

/**
 * Build href for rimigo country segment (using country name slug)
 */
const buildRimigoCountryHref = (_segments: BreadcrumbSegment[], currentId: string, searchParams?: URLSearchParams): string => {
    const baseUrl = `${RIMIGO_COLLECTION_ROUTE}/${currentId}`
    if (searchParams) {
        return `${baseUrl}?${searchParams.toString()}`
    }
    return baseUrl
}

/**
 * Build href for rimigo collections segment (base Collections page)
 */
const buildRimigoCollectionsHref = (_segments: BreadcrumbSegment[], _currentId: string, searchParams?: URLSearchParams): string => {
    const baseUrl = RIMIGO_COLLECTION_ROUTE
    if (searchParams) {
        return `${baseUrl}?${searchParams.toString()}`
    }
    return baseUrl
}

/**
 * Build href for rimigo collection segment
 */
const buildRimigoCollectionHref = (_segments: BreadcrumbSegment[], currentId: string, searchParams?: URLSearchParams): string => {
    const countrySegment = _segments.find((s) => s.key === 'rimigo-country')
    if (!countrySegment) {
        // Fallback if country segment is missing
        const baseUrl = `${RIMIGO_COLLECTION_ROUTE}/${currentId}`
        if (searchParams) {
            return `${baseUrl}?${searchParams.toString()}`
        }
        return baseUrl
    }
    const baseUrl = `${RIMIGO_COLLECTION_ROUTE}/${countrySegment.id}/${currentId}`
    if (searchParams) {
        return `${baseUrl}?${searchParams.toString()}`
    }
    return baseUrl
}

/**
 * Breadcrumb configuration
 * This maps route segments to their resolvers and href builders
 */
export const breadcrumbConfig: BreadcrumbConfig = {
    home: {
        label: 'Home',
        // Hardcoded to avoid circular dependency with routes.tsx (matches DEFAULT_LANDING_PAGE_ROUTE)
        href: '/tripboard'
    },
    segments: [
        {
            key: 'country',
            resolveName: fetchCountryName,
            buildHref: buildCountryHref
        },
        {
            key: 'city',
            resolveName: fetchCityName,
            buildHref: buildCityHref
        },
        {
            key: 'collection',
            resolveName: fetchCollectionName,
            buildHref: buildCollectionHref
        },
        {
            key: 'filter',
            resolveName: async (filterId: string) => {
                // For now, filterId is "groupType", so we need to get the actual group type from query params
                // This is a simplified version - in a real scenario, you might want to fetch filter metadata
                if (filterId === 'groupType') {
                    return 'Group Type'
                }
                return filterId
            },
            buildHref: buildFilterHref
        },
        {
            key: 'rimigo-collections',
            resolveName: async (_id: string) => {
                // Static label for Collections
                return 'Collections'
            },
            buildHref: buildRimigoCollectionsHref
        },
        {
            key: 'rimigo-country',
            resolveName: async (countrySlug: string) => {
                // Decode country name from slug
                return decodeCountryName(countrySlug)
            },
            buildHref: buildRimigoCountryHref
        },
        {
            key: 'rimigo-collection',
            resolveName: fetchRimigoCollectionName,
            buildHref: buildRimigoCollectionHref
        }
    ]
}

/**
 * Route pattern definitions
 * These patterns define how to parse the pathname
 * Note: Using RegExp constructor and string literal to avoid initialization order issues
 * Using '/experiences' directly (same as DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE)
 */
export const routePatterns = {
    countryCity: new RegExp(`^/experiences/country/([^/]+)/city/([^/]+)(?:/.*)?$`),
    countryCityCollection: new RegExp(`^/experiences/country/([^/]+)/city/([^/]+)/collection/([^/]+)(?:/.*)?$`),
    countryCityFilter: new RegExp(`^/experiences/country/([^/]+)/city/([^/]+)/filter/([^/]+)(?:/.*)?$`),
    rimigoCountry: new RegExp(`^/rimigo-collection/([^/]+)(?:/.*)?$`),
    rimigoCountryCollection: new RegExp(`^/rimigo-collection/([^/]+)/([^/]+)(?:/.*)?$`)
} as const
