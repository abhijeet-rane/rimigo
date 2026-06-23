export interface CollectionItem {
    id: string
    image: string
    category: string
    categoryIcon?: string
}

export interface Creator {
    id: string
    name: string
    handle: string
    profileImage?: string
    instagramFollowers: string
    /** Rimigo's own collections have no external creator. The adapter
     *  substitutes a Rimigo fallback so the card never renders header-less;
     *  this flag suppresses the Instagram badge for that case. */
    isRimigo?: boolean
    lastVisited: {
        location: string
        month?: string
        year?: number | null
    }
}

export interface Collection {
    id: string
    creator?: Creator // Made optional since API doesn't always provide creator info
    title: string
    duration?: string
    items: CollectionItem[]
    viewAllUrl?: string
    socialProof?: {
        count: number
        label: string
    }
}

export interface CollectionCardProps {
    collection: Collection
    onViewAll?: (collectionId: string) => void
    onItemClick?: (collectionId: string, itemId: string) => void
    /** How many lines the title may occupy before truncating with an
     *  ellipsis. Defaults to 2; the curated-collections carousel passes 1 so
     *  every card stays the same height regardless of title length. */
    titleLines?: 1 | 2
    /** Compact size — smaller image tiles, used by the Activities tab's
     *  curated-collections carousel so cards aren't oversized and the next
     *  card peeks on mobile. */
    compact?: boolean
}

export interface CollectionSectionProps {
    cityId?: string | null
    sourceId?: string | null
    title?: string
    onViewAll?: (collectionId: string) => void
    onItemClick?: (collectionId: string, itemId: string) => void
    className?: string
    enabled?: boolean
    showDivider?: boolean
}


/**
 * Bulk delete / multi-select for collection tabs.
 * When undefined, the tab renders no bulk UI. When defined, toolbar + per-card checkboxes apply.
 */
export type CollectionBulkSelectionConfig = {
    mode: boolean
    selectedSectionIds: Set<string>
    onToggleSectionSelect: (sectionId: string) => void
    onToggleMode: () => void
    onDeleteSelected: () => void | Promise<void>
    /** Select all visible section ids, or deselect visible ids if already all selected */
    onSelectAllVisible: (visibleSectionIds: string[]) => void
}
