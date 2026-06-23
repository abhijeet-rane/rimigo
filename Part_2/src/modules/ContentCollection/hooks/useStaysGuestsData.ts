import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { type GuestsData } from '@/components/common/SearchBar/modals/GuestsModal'
import { type GroupSetup } from '@/api/tripPreferencesAPI/tripPreferencesAPI'

const DEFAULT_ADULTS = 2

export function useStaysGuestsData(tripGroupSetup?: GroupSetup | null): GuestsData {
    const [searchParams] = useSearchParams()
    return useMemo<GuestsData>(() => {
        const hasUrlParams = searchParams.has('adults')
        if (hasUrlParams) {
            const adults = Math.max(1, parseInt(searchParams.get('adults') || String(DEFAULT_ADULTS), 10) || DEFAULT_ADULTS)
            const children = parseInt(searchParams.get('children') || '0', 10) || 0
            const infants = parseInt(searchParams.get('infants') || '0', 10) || 0
            const childrenAgeParam = searchParams.get('children_age')
            const children_age = childrenAgeParam
                ? childrenAgeParam.split(',').map(Number).filter((age) => !isNaN(age))
                : []
            return { adults, children, infants, children_age }
        }
        if (tripGroupSetup) {
            return {
                adults: Math.max(1, tripGroupSetup.adults || DEFAULT_ADULTS),
                children: tripGroupSetup.children || 0,
                infants: tripGroupSetup.infants || 0,
                children_age: tripGroupSetup.children_age || []
            }
        }
        return { adults: DEFAULT_ADULTS, children: 0, infants: 0, children_age: [] }
    }, [searchParams, tripGroupSetup])
}
