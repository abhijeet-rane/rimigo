import { useQuery } from '@tanstack/react-query'
import { getATAFeatures, type ATAFeaturesResult } from '@/api/ataAPI/featuresAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import type { ATAFeature } from '@/api/ataAPI/types/featuresTypes'
import type { CategoryInfo } from '@/api/ataAPI/types/featuresTypes'

interface UseATAFeaturesParams {
    countryId?: string
    enabled?: boolean
}

interface UseATAFeaturesReturn {
    features: ATAFeature[]
    heroFeatures: ATAFeature[]
    featuredFeatures: ATAFeature[]
    categoryInfo: Record<string, CategoryInfo>
    isLoading: boolean
    error: Error | null
}

/**
 * React Query hook to fetch ATA features
 * Separates features by category (hero vs featured) and filters by status
 */
export const useATAFeatures = ({
    countryId,
    enabled = true
}: UseATAFeaturesParams = {}): UseATAFeaturesReturn => {
    const { data: result, isLoading, error } = useQuery<ATAFeaturesResult>({
        queryKey: ['ataFeatures', countryId],
        queryFn: () => getATAFeatures(countryId),
        enabled,
        staleTime: HOURS_24,
        retry: 1 // Only retry once to fail fast
    })

    const features = result?.features || []
    const categoryInfo = result?.categoryInfo || {}

    // Separate features by category and filter by active status
    const heroFeatures = features.filter(
        (f) => f.category === 'hero' && (f.status === 'active' || f.status === 'coming_soon')
    )
    const featuredFeatures = features.filter(
        (f) => f.category === 'featured' && f.status === 'active'
    )

    return {
        features,
        heroFeatures,
        featuredFeatures,
        categoryInfo,
        isLoading,
        error: error as Error | null
    }
}

