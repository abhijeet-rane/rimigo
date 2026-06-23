import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOnboardingGuide, updateOnboardingGuide } from '../api/onboardingApi'
import { OnboardingGuideStructure } from '../types/OnboardingType'

const QUERY_KEY = ['onboardingGuide']

export const useOnboardingGuide = (isLoggedIn: boolean) => {
    const qc = useQueryClient()

    const query = useQuery({
        queryKey: QUERY_KEY,
        queryFn: getOnboardingGuide,
        staleTime: Infinity,
        // enabled: isLoggedIn
        enabled: false
    })

    const mutation = useMutation({
        mutationFn: (payload: OnboardingGuideStructure) => updateOnboardingGuide(payload),
        onSuccess: (response) => {
            qc.setQueryData(QUERY_KEY, response)
        },
        onError: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEY })
        }
    })

    return {
        guide: query.data?.data ?? null,
        isLoading: isLoggedIn ? query.isLoading : false,
        updateGuide: mutation.mutate,
        isUpdating: mutation.isPending
    }
}
