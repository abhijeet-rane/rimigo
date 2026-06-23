import { useQuery } from '@tanstack/react-query'

import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { getExperiencesWithShorts, type ExperienceWithShort, type ShortsExploreResponse } from '@/modules/WatchAlong/api/watchAlongApi'

interface UseWatchAlongShortsParams {
    countryId?: string | null
    limit?: number
    enabled?: boolean
}

interface UseWatchAlongShortsResult {
    shorts: ExperienceWithShort[]
    isLoading: boolean
    error: Error | null
}

/**
 * Fetch Watch Along shorts once and share them across hero + discover surfaces.
 */
export const useWatchAlongShorts = ({ countryId, limit = 12, enabled = true }: UseWatchAlongShortsParams = {}): UseWatchAlongShortsResult => {
    const queryResult = useQuery<ShortsExploreResponse, Error, ExperienceWithShort[]>({
        queryKey: ['watchAlongShorts', countryId, limit],
        queryFn: async () => {
            if (!countryId) {
                throw new Error('Country ID is required to fetch Watch Along shorts')
            }
            return await getExperiencesWithShorts(countryId, 1, limit, true)
        },
        enabled: enabled && Boolean(countryId),
        staleTime: HOURS_24,
        retry: 1,
        select: (response) => response.data ?? []
    })

    return {
        shorts: queryResult.data ?? [],
        isLoading: queryResult.isLoading,
        error: queryResult.error ?? null
    }
}

export const extractVideoIdFromUrl = (url?: string | null): string | null => {
    if (!url) return null

    const shortsMatch = url.match(/youtube\.com\/shorts\/([^/?&]+)/)
    if (shortsMatch?.[1]) {
        return shortsMatch[1]
    }

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
}

/**
 * Convert shorts into thumbnail URLs suitable for portrait hero tiles.
 */
export const mapShortsToThumbnails = (shorts: ExperienceWithShort[], limit = 3): string[] => {
    return shorts
        .slice(0, limit)
        .map((short) => {
            const videoId = extractVideoIdFromUrl(short.youtube_short?.url)
            return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null
        })
        .filter((url): url is string => Boolean(url))
}
