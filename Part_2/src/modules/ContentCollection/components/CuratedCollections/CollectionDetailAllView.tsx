import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import ListCard from '@/components/ListCard'
import CardShortlistOverlay from '@/modules/Acitvities/components/CardShortlistOverlay'
import { useIsMobile } from '@/hooks/use-mobile'
import { contentCollectionApi, type CollectionListSourceDetails } from '@/modules/ContentCollection/api/contentCollectionApi'
import { adaptCollectionSectionToExperienceCard, resolveExperienceCardData } from '@/modules/ContentCollection/adapter/experienceCardAdapter'
import type { Section } from '@/modules/ContentCollection/types/contentCollection'
import ExperiencesListShimmer from '@/modules/Acitvities/components/ExperiencesListShimmer'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { useExperiencesList } from '@/modules/Acitvities/hooks/useExperiencesList'
import { useExperiencesEnrichment } from '@/modules/ContentCollection/hooks/useExperiencesEnrichment'
import { useCountryCollections } from '@/modules/ContentCollection/hooks/useCountryCollections'
import CollectionCreatorBar from './CollectionCreatorBar'
import { RIMIGO_COLLECTION_ROUTE } from '@/routes/routes'

interface CollectionDetailAllViewProps {
    identifier: string
    /** Cached from URL param so the breadcrumb paints before the fetch. */
    collectionName?: string
    /** Scopes the shared shortlist store so hearts sync with other tabs. */
    countryId?: string | null
    tripId?: string | null
    onBack: () => void
    onSneakPeekClick?: (e: React.MouseEvent, experienceId: string) => void
    onCardClick?: (experienceId: string) => void
    /**
     * Creator of this collection (from the list item). Drives the "from
     * {name}'s tripboard" bar. Passed from the parent on open; on a cold
     * reload it's recovered from the cached country-collections list.
     */
    sourceDetails?: CollectionListSourceDetails | null
    /**
     * Whether the Activities tab is the visible tab. The mobile floating bar
     * portals to <body>, so it would otherwise stay visible after switching to
     * another tab (the tab is hidden via `display:none`, not unmounted).
     */
    isActive?: boolean
}

/**
 * In-tab "All › <collection name>" view. Same breadcrumb + grid as
 * `BestThingsAllView`. Card data (incl. images) comes from the bulk
 * experiences batch (`useExperiencesEnrichment`); section metadata is slim
 * under the new writer, so `adaptCollectionSectionToExperienceCard` is only a
 * legacy fallback.
 */
const CollectionDetailAllView: React.FC<CollectionDetailAllViewProps> = ({
    identifier,
    collectionName,
    countryId,
    tripId,
    onBack,
    onSneakPeekClick,
    onCardClick,
    sourceDetails,
    isActive = true,
}) => {
    const isMobile = useIsMobile()

    // Creator for the "from {name}'s tripboard" bar. Prefer the prop passed on
    // open; on a cold reload (no prop) recover it from the cached country
    // collections list — the query is disabled when the prop is present so we
    // don't fire a needless fetch.
    const { collections: countryCollections } = useCountryCollections(sourceDetails || !countryId ? [] : [countryId])
    const creatorSource = sourceDetails ?? countryCollections.find((c) => c.identifier === identifier)?.source_details ?? null
    // Rimigo fallback when the collection has no external creator — show the
    // compass + "Rimigo's tripboard" (matching the card) so the bar always
    // appears, never blank.
    const isRimigoCreator = !creatorSource
    const creatorName = creatorSource?.name ?? 'Rimigo'
    const creatorImage = creatorSource?.image ?? '/icons/compass.png'

    const handleViewTrip = useCallback(() => {
        // Open the creator's full collection in a new tab so the user keeps
        // their place in the Activities listing.
        window.open(`${RIMIGO_COLLECTION_ROUTE}/details/${identifier}`, '_blank', 'noopener,noreferrer')
    }, [identifier])

    // Shared store — hearts stay in sync with the rest of the Activities tab.
    const { shortlistState, shortlistLoadingIds, handleShortlistToggle } = useExperiencesList({
        countryId: countryId ?? null,
        cityId: null,
        activeTripId: tripId ?? null,
        priorities: [],
        preferences: [],
        enabled: !!countryId || !!tripId,
    })

    // Matches the queryKey used by ViewContentCollection / entry-server so
    // cross-page navigation hits cache.
    const { data, isLoading } = useQuery({
        queryKey: ['content-collection', identifier, 'experience'],
        queryFn: () => contentCollectionApi.getByIdentifier(identifier, 'experience'),
        enabled: !!identifier,
        staleTime: HOURS_24,
        gcTime: HOURS_24,
    })

    const collection = data?.data
    const headerName = (collection?.name?.trim() || collectionName?.trim()) || 'Collection'

    // Entity ids of every experience section — drives the bulk enrichment.
    const experienceIds = useMemo(
        () =>
            (collection?.sections ?? [])
                .filter((s: Section) => s.section_type === 'experience' && !!s.entity_id)
                .map((s) => s.entity_id as string),
        [collection?.sections]
    )

    // Card data (images, title, price, categories) is sourced from the batch —
    // section metadata is dates-only under the new writer.
    const { enrichedExperiencesMap, isEnrichmentLoading } = useExperiencesEnrichment({
        experienceIds,
        enabled: isActive && experienceIds.length > 0,
    })

    const experienceCards = useMemo(() => {
        // Wait for the batch to settle — slim sections would otherwise resolve
        // via the fallback adapter into blank-image cards during the window.
        if (isEnrichmentLoading) return []
        const sections = collection?.sections ?? []
        return sections
            .filter((s: Section) => s.section_type === 'experience' && !!s.entity_id)
            .map((s) => ({
                section: s,
                // Batch is the source of truth; legacy full-metadata sections
                // still resolve via the old adapter so cards never go blank.
                card: resolveExperienceCardData(s, enrichedExperiencesMap) ?? adaptCollectionSectionToExperienceCard(s),
            }))
            .filter((entry) => entry.card !== null) as Array<{
                section: Section
                card: NonNullable<ReturnType<typeof adaptCollectionSectionToExperienceCard>>
            }>
    }, [collection?.sections, enrichedExperiencesMap, isEnrichmentLoading])

    return (
        // Mobile bottom padding so the floating creator bar never covers the
        // last row of cards. Desktop has no floating bar.
        <div className="px-4 md:px-0 pb-24 md:pb-0">
            {/* Breadcrumb — mirrors BestThingsAllView. */}
            <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-2 text-[14px] font-red-hat-display py-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="font-semibold text-grey-1 hover:text-primary-default transition-colors cursor-pointer">
                    All
                </button>
                <ChevronRight className="w-4 h-4 text-grey-2" />
                <span className="font-bold text-grey-0 truncate min-w-0">{headerName}</span>

                {/* Desktop: "View {name}'s tripboard" at the right of the row. */}
                <CollectionCreatorBar
                    variant="inline"
                    name={creatorName}
                    imageUrl={creatorImage}
                    isRimigo={isRimigoCreator}
                    onViewTrip={handleViewTrip}
                />
            </nav>

            {(isLoading || isEnrichmentLoading) && experienceCards.length === 0 ? (
                <ExperiencesListShimmer count={4} />
            ) : experienceCards.length === 0 ? (
                <p className="py-8 text-center text-grey-1 text-[14px] font-red-hat-display">
                    No activities in this collection yet.
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-6 items-start mt-2 md:mt-4">
                    {experienceCards.map(({ card }) => {
                        const experienceId = card.id
                        // Watch Reel thumb: prefer verified photo, fall back to
                        // landscape so the pill is never blank.
                        const sneakPreviewImage =
                            (card.images && card.images.length > 1 ? card.images[1] : undefined) ||
                            card.image ||
                            undefined

                        const shortlistEntry = shortlistState[experienceId]
                        const isShortlisted = shortlistEntry?.isShortlisted ?? false
                        const isShortlisting = Boolean(shortlistLoadingIds[experienceId])

                        return (
                            <div
                                key={experienceId}
                                className="relative w-full">
                                <ListCard
                                    image={card.image}
                                    images={card.images}
                                    imageAlt={card.name ?? ''}
                                    fullHeight={!isMobile}
                                    className="group w-full"
                                    onClick={() => onCardClick?.(experienceId)}
                                    title={card.name ?? ''}
                                    city={card.city_name}
                                    showShortlistButton={false}
                                    showSneakPeekButton={!!onSneakPeekClick}
                                    onSneakPeekClick={
                                        onSneakPeekClick ? (e) => onSneakPeekClick(e, experienceId) : undefined
                                    }
                                    sneakPeekUserImage={sneakPreviewImage}
                                    sneakPeekButtonLabel="Watch Reel"
                                />
                                {/* Wired to the shared shortlist store. */}
                                <CardShortlistOverlay
                                    isShortlisted={isShortlisted}
                                    isShortlisting={isShortlisting}
                                    onToggle={() => handleShortlistToggle(experienceId)}
                                />
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Mobile: floating "These experiences are from {name}'s tripboard"
                bar pinned to the bottom (portaled to <body> internally). Only
                while the Activities tab is active — otherwise the portaled bar
                would linger over other tabs. */}
            {isActive && (
                <CollectionCreatorBar
                    variant="floating"
                    name={creatorName}
                    imageUrl={creatorImage}
                    isRimigo={isRimigoCreator}
                    onViewTrip={handleViewTrip}
                />
            )}
        </div>
    )
}

export default CollectionDetailAllView
