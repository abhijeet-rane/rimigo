import { getTravelerDetails, Traveler } from '@/api/travelerAPI/travelerAPI'
import { useQuery } from '@tanstack/react-query'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { useEffect } from 'react'
import { HOURS_1 } from '@/constants/commons/tanstackConstants'

export const useTravelerDetails = (travelerId?: string) => {
    const query = useQuery<Traveler, Error>({
        queryKey: ['travelerDetails', travelerId],
        queryFn: () => getTravelerDetails(travelerId as string),
        enabled: !!travelerId,
        refetchOnWindowFocus: false,
        staleTime: HOURS_1
    })

    useEffect(() => {
        if (!query.data) return

        const updateUserInfo = async () => {
            const { id, ...restTravelerDetails } = query.data

            const updatedUserInfo = {
                ...(id && { traveler_id: id }),
                ...restTravelerDetails
            }

            await TokenStorage.setUserInfo(updatedUserInfo)
        }

        updateUserInfo()
    }, [query.data])

    return {
        travelerDetails: query.data,
        isTravelerDetailsLoading: query.isLoading,
        isTravelerDetailsError: query.error,
        refetchTravelerDetails: query.refetch
    }
}
