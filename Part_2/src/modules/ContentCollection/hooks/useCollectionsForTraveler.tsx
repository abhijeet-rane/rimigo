import { useQuery } from "@tanstack/react-query"
import { travelerCollectionApi } from "../api/travelerCollectionApi"
import { ContentCollection } from "../types/contentCollection"
import { HOURS_24 } from "@/constants/commons/tanstackConstants"

/**
 * Hook to fetch collections for a traveler
 * @param travelerId - The traveler ID to fetch collections for
 * @param enabled - Whether the query should be enabled (defaults to true if travelerId exists)
 * @param isInvitedUser - Whether the user is an invited user, this is used to allow CSM to access collections of the trip owner
 */
export const useCollectionsForTarveler = (
    travelerId: string | null | undefined,
    enabled?: boolean,
    isInvitedUser?: boolean
): {
    collections: ContentCollection[]
    isLoading: boolean
    isError: boolean
    hasCollections: boolean
} => {
    const { data: checkExistsData, isLoading, isError } = useQuery({
        queryKey: ['collections-for-traveler', travelerId],
        queryFn: () => {
            if (!travelerId) {
                throw new Error('Traveler ID is required')
            }
            return travelerCollectionApi.checkTravelerCollectionsExists(travelerId, isInvitedUser)
        },
        enabled: enabled !== undefined ? enabled : !!travelerId,
        gcTime: HOURS_24,
        staleTime: HOURS_24,
        refetchOnWindowFocus: false,
    })

    const collections: ContentCollection[] = []
    const hasCollections = checkExistsData?.data?.is_exists || false

    return {
        collections,
        isLoading,
        isError,
        hasCollections
    }
}


