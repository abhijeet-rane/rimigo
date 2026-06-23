import { useQueries } from '@tanstack/react-query'
import { getExperienceSneakPeek } from '@/modules/Experiences/api/experienceApi'
import { extractSneakPeekData } from './useSneakPeekData'

/**
 * Fetches the first short for each experience id, in parallel.
 *
 * Used by the Top Highlights mobile reels: clicking a highlight opens a
 * reel list iterating through every top-10 highlight, one video per
 * highlight. Each item's first short is sourced from the per-experience
 * sneak-peek endpoint (the same endpoint `SneakPeekModal` uses), so the
 * shorts are exactly the ones already configured for each activity.
 *
 * The hook is `enabled`-gated so it only fires when the caller actually
 * needs the data (e.g. when the user opens the reels view). Each
 * experience query is cached independently — subsequent opens hit the
 * React Query cache instead of re-fetching.
 */
interface SneakPeekStat {
    value: string
    description: string
}

export interface FirstShortInfo {
    /** Source experience id — drives shortlist binding from the caller. */
    experienceId: string
    /** Experience display name shown as the per-reel title. */
    name: string
    /** First short URL, or null when the experience has no shorts. */
    shortUrl: string | null
    /** All of this experience's short URLs, in order. The reels view plays
     *  the first and falls through to the next on a YouTube embed error
     *  (e.g. 150 — restricted on cookieless mobile Safari), so a single
     *  non-embeddable short doesn't blank out the whole experience. */
    shortUrls: string[]
    /** Stable id for the React key — combines experience + short id. */
    reelId: string
    /** Whether the per-experience fetch is still pending. */
    isLoading: boolean
    /** Per-experience pill stats (same shape ActivityExploreReelsView renders). */
    duration: SneakPeekStat | null
    bestMonths: SneakPeekStat | null
    valueForMoney: SneakPeekStat | null
    walkingRequired: SneakPeekStat | null
}

interface UseFirstShortsForExperiencesParams {
    experiences: Array<{ id: string; name?: string | null }>
    /** Only fetch when true (e.g. when the reels view is about to open). */
    enabled: boolean
}

export const useFirstShortsForExperiences = ({
    experiences,
    enabled
}: UseFirstShortsForExperiencesParams) => {
    const queries = useQueries({
        queries: experiences.map((exp) => ({
            queryKey: ['experienceSneakPeek', exp.id] as const,
            queryFn: () => getExperienceSneakPeek(exp.id),
            enabled: enabled && !!exp.id,
            staleTime: 5 * 60 * 1000
        }))
    })

    // `useQueries` returns a fresh array every render — a `useMemo` keyed
    // on it would never hit. Just recompute inline; the work is ~O(n) over
    // a small list and the consumer renders are cheap.
    const firstShorts: FirstShortInfo[] = experiences.map((exp, idx) => {
        const result = queries[idx]
        const shorts = result?.data?.shorts ?? []
        const first = shorts[0] ?? null
        const shortUrls = shorts.map((s: { url?: string }) => s?.url).filter((u: string | undefined): u is string => !!u)
        const stats = extractSneakPeekData(result?.data)
        return {
            experienceId: exp.id,
            name: result?.data?.name || exp.name || 'Experience',
            shortUrl: first?.url ?? null,
            shortUrls,
            reelId: first ? `${exp.id}::${first.id}` : exp.id,
            isLoading: Boolean(result?.isLoading),
            duration: stats.duration,
            bestMonths: stats.bestMonths,
            valueForMoney: stats.valueForMoney,
            walkingRequired: stats.walkingRequired
        }
    })

    const isLoading = queries.some((q) => q.isLoading)

    return { firstShorts, isLoading }
}
