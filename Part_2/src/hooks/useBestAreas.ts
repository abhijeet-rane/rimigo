import { useQuery } from '@tanstack/react-query'
import { getBestAreas, type BestAreasGeoJSONResponse, type BestAreaHighlight } from '@/pages/Stays/Apis/bestAreasAPI'
import { CURATION_QUERY_KEYS } from './queryKeys'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

export interface BestAreaOption {
    id: string
    name: string
    bbox: [number, number, number, number]
    whyRecommended: string
    highlights: BestAreaHighlight[]
}

function buildOptions(data: BestAreasGeoJSONResponse): BestAreaOption[] {
    return data.features.map((f) => ({
        id: f.properties.id,
        name: f.properties.name,
        bbox: f.properties.bbox,
        whyRecommended: f.properties.whyRecommended,
        highlights: f.properties.highlights ?? []
    }))
}

export function useBestAreas(cityId: string | undefined) {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: CURATION_QUERY_KEYS.bestAreas(cityId ?? ''),
        queryFn: () => getBestAreas(cityId!),
        enabled: !!cityId && cityId !== 'unknown',
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    const hasAreas = !!data?.features && data.features.length > 0
    const options: BestAreaOption[] = hasAreas ? buildOptions(data) : []
    const geoJson: GeoJSON.FeatureCollection | null = hasAreas ? data : null

    return {
        options,
        geoJson,
        isLoading,
        isError,
        error: error as Error | null
    }
}
