import type { FilterContentComponent } from './types'
import { StaysFilterContent } from './StaysFilter/StaysFilterContent'
import { ExperienceFilterContent } from '@/modules/Experiences/components/Filters/ExperienceFilter/ExperienceFilterContent'

/**
 * Filter Registry
 * Add new filter types here to make them available throughout the app
 */
export const FilterRegistry: Record<string, FilterContentComponent> = {
    stays: StaysFilterContent,
    experiences: ExperienceFilterContent
    // Add more filter types here
    // attractions: AttractionsFilterContent,
}

export type FilterType = keyof typeof FilterRegistry
