import { useQuery } from '@tanstack/react-query'
import { getExperienceSneakPeek } from '@/modules/Experiences/api/experienceApi'
import { extractSneakPeekData } from './useSneakPeekData'
import type { SneakPeekResponse } from '@/modules/Experiences/types/sneakPeekTypes'

/**
 * Fetches ALL shorts for a single experience.
 *
 * Used by the per-card "Watch Reel" flow: tapping a card opens a reel
 * feed of that one activity's own videos (it can have several), instead
 * of a cross-activity feed. Shares the `['experienceSneakPeek', id]`
 * query key with `useFirstShortsForExperiences` so the cache is reused.
 */
interface SneakPeekStat {
    value: string
    description: string
}

export interface ExperienceReelShort {
    /** Short id from the sneak-peek payload. */
    id: string
    /** YouTube watch/embed url. */
    url: string
    /** Stable React key — `${experienceId}::${shortId}`. */
    reelId: string
}

interface UseExperienceShortsParams {
    /** Experience to fetch shorts for. `null` keeps the query disabled. */
    experienceId: string | null
    /** Fallback display name used until the API name resolves. */
    name?: string | null
    /** Only fetch when true (e.g. when the reels view is about to open). */
    enabled: boolean
}

export const useExperienceShorts = ({ experienceId, name, enabled }: UseExperienceShortsParams) => {
    const { data, isLoading } = useQuery({
        queryKey: ['experienceSneakPeek', experienceId],
        queryFn: () => getExperienceSneakPeek(experienceId as string),
        enabled: enabled && !!experienceId,
        staleTime: 5 * 60 * 1000
    })

    const sneakPeek = data as SneakPeekResponse | undefined
    const shorts: ExperienceReelShort[] = (sneakPeek?.shorts ?? [])
        .filter((s) => !!s?.url)
        .map((s) => ({ id: s.id, url: s.url, reelId: `${experienceId}::${s.id}` }))

    const stats = extractSneakPeekData(sneakPeek)

    return {
        shorts,
        name: sneakPeek?.experience_name || name || 'Experience',
        // Real experience photo for the reel poster / no-video fallback —
        // landscape hero first, else the first verified photo. Never a
        // YouTube thumbnail.
        imageUrl: sneakPeek?.landscape_image ?? sneakPeek?.verified_photos?.[0]?.url,
        duration: stats.duration as SneakPeekStat | null,
        bestMonths: stats.bestMonths as SneakPeekStat | null,
        valueForMoney: stats.valueForMoney as SneakPeekStat | null,
        walkingRequired: stats.walkingRequired as SneakPeekStat | null,
        isLoading
    }
}
