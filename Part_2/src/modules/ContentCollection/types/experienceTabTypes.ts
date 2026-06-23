import type { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import type { CollectionBulkSelectionConfig } from '@/components/Collection'
import type { Block, ExperienceComment } from './contentCollection'
import type { FallbackMode } from '../utils/cityDateFilter'

export type CollectionApi = {
    updateSectionMetadata: (identifier: string, sectionId: string, metadata: Record<string, unknown>) => Promise<unknown>
    bulkUpdateSectionMetadata?: (identifier: string, updates: Array<{ sectionId: string; metadata: Record<string, unknown> }>) => Promise<unknown>
    addExperienceToCollection?: (
        collectionIdentifier: string,
        experienceId: string,
        experienceName: string,
        experienceDescription?: string,
        sectionsOrder?: number,
        metadata?: Record<string, unknown>
    ) => Promise<unknown>
}

export interface ExperienceTabProps {
    experiences: ExperienceCardData[]
    /**
     * Itinerary-slot-derived list for the "In your itinerary" view. Required
     * when `showShortlistToggle` is true; the shortlist view continues to use
     * `experiences`.
     */
    inItineraryExperiences?: ExperienceCardData[]
    /** Itinerary slot id keyed by experience entity_id — drives slot-remove. */
    experienceSlotMap?: Map<string, string>
    /** Itinerary day id keyed by experience entity_id — reserved for day-scoped ops. */
    experienceDayMap?: Map<string, string>
    /** Comments keyed by `experience_id` — sourced from `collection.metadata.experience_comments`. */
    experienceCommentsByExpId?: Map<string, ExperienceComment[]>
    isExperiencesLoading: boolean
    onExperienceClick: (experienceId: string) => void
    onSneakPeekClick: (e: React.MouseEvent, experienceId: string) => void
    hoveredCardId: string | null
    setHoveredCardId: (id: string | null) => void
    onSwitchToMapTab?: () => void
    collectionIdentifier?: string
    experienceSectionMap?: Map<string, string>
    sectionMetadataMap?: Map<string, { [key: string]: unknown } | undefined>
    api?: CollectionApi
    allowDateEdit?: boolean
    onDeleteSection?: (sectionId: string) => void
    isDeleting?: boolean
    canAddExperience?: boolean
    hideShortlist?: boolean
    sectionBlocksMap?: Map<string, Block[]>
    collectionType?: 'content' | 'traveler'
    queryKeyPrefix?: string
    fallbackMode?: FallbackMode
    exploreCountryId?: string
    exploreCountryName?: string
    bulkSelection?: CollectionBulkSelectionConfig
    hideExactDates?: boolean
    tripStartDate?: string | null
    itineraryDays?: Array<{
        date: string | Date
        /** `country` is the BE's country label for the city — drives the
         *  multi-country Activities drill (city chips grouped per country). */
        base_city?: { id: string; name: string; country?: string } | null
        destination_city?: { id: string; name: string; country?: string } | null
        slots?: Array<{ entity_id?: string; kind?: string; entity_model?: string }>
    }>
    headerPortalRef?: React.RefObject<HTMLDivElement | null>
    isActive?: boolean
    /** Shortlist toggle — tripboard only. URL-persisted via `activities_view`. */
    showShortlistToggle?: boolean
    /** Required when `showShortlistToggle` is true. */
    tripId?: string
    /** Itinerary id — required for slot-remove in the "In your itinerary" view. */
    itineraryId?: string
    countryId?: string | null
    /**
     * Initial subtab when the URL `activities_view` param is missing.
     * Tripboard defaults to 'in_itinerary' (Explore). Curator-shared
     * collection pages default to 'shortlisted'.
     */
    defaultActivitiesView?: 'in_itinerary' | 'shortlisted'
    /**
     * Curator-shared collection mode. When true:
     *   • Shortlist subtab renders the collection's itinerary sections
     *     (read from `experiences`) instead of calling the shortlist API.
     *   • Each rendered card surfaces an "In your itinerary" badge.
     *   • Heart buttons are hidden (the viewer can't shortlist on
     *     someone else's collection).
     *   • The shortlist provider is not mounted.
     */
    readOnlyShortlist?: boolean
}
