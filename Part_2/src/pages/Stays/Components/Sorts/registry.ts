import { StaysSortContent } from './StaysSort/StaysSortContent'
import type { SortContentComponent } from './types'

export const SortRegistry: Record<string, SortContentComponent> = {
    stays: StaysSortContent
    // Add other sort types here (e.g., experiences: ExperienceSortContent)
}

export type SortType = keyof typeof SortRegistry
