import { useMemo } from 'react'
import GenericCarouselTopButton from '@/components/shared/Carousel/GenericCarouselTopButton'
import Divider from '@/components/shared/Divider/Divider'
import CollectionCard from '@/components/Collection/CollectionCard'
import type { CollectionListItem } from '@/modules/ContentCollection/api/contentCollectionApi'
import { useCountryCollections } from '@/modules/ContentCollection/hooks/useCountryCollections'
import { adaptListItemToCollection } from '@/modules/ContentCollection/adapter/collectionListItemAdapter'

interface CuratedCollectionsSectionProps {
    /** Trip destinations. Multi-country → header drops the country name. */
    countryIds: string[]
    /** Single-country trip only; otherwise header uses the generic copy. */
    countryName?: string | null
    /** VIEW ALL on a card. Parent does the URL-param swap to render
     *  `CollectionDetailAllView` in-tab. */
    onViewAllCollection: (collection: CollectionListItem) => void
    /** Title style override (replaces the default heading classes; the
     *  `\n` line-break handling is kept). The Tripboard country overview
     *  passes its shared section-heading classes so this matches the
     *  other headings. */
    titleClassName?: string
    /** Suppress the trailing divider. The country overview's next section
     *  (All Cities) ships its own top divider — keeping both painted two
     *  stacked lines. */
    hideTrailingDivider?: boolean
}

/**
 * Activities tab: country-scoped creator collections under Best Things.
 * Reuses /experiences' `<CollectionCard>` design.
 */
const CuratedCollectionsSection: React.FC<CuratedCollectionsSectionProps> = ({
    countryIds,
    countryName,
    onViewAllCollection,
    titleClassName: titleClassNameProp,
    hideTrailingDivider = false,
}) => {
    const { collections, isLoading } = useCountryCollections(countryIds)

    const adapted = useMemo(() => collections.map(adaptListItemToCollection), [collections])

    // `\n` forces the second line on mobile (`whitespace-pre-line` below);
    // desktop collapses it to a space (`md:whitespace-normal`).
    const headerTitle = useMemo(() => {
        const trimmedCountry = countryName?.trim()
        if (countryIds.length === 1 && trimmedCountry) {
            return `Curated ${trimmedCountry} collections,\nfrom your favourite creators`
        }
        return 'Curated collections,\nfrom your favourite creators'
    }, [countryIds.length, countryName])

    // Silent hide — no skeleton/empty state.
    if (isLoading) return null
    if (adapted.length === 0) return null

    // Resolve adapted id back to the original item (parent needs identifier
    // + name for the detail-view URL params).
    const handleViewAllById = (collectionId: string) => {
        const match = collections.find((c) => c.identifier === collectionId)
        if (match) onViewAllCollection(match)
    }

    const isSingle = adapted.length === 1

    // The whitespace classes stay even when overridden — they handle the
    // `\n` line-break in `headerTitle`, not the type styling.
    const titleClassName = titleClassNameProp
        ? `whitespace-pre-line md:whitespace-normal ${titleClassNameProp}`
        : 'font-red-hat-display text-[18px] md:text-[22px] font-bold text-grey-0 leading-snug tracking-[-0.4px] whitespace-pre-line md:whitespace-normal'

    // Always on mobile (keeps the progress bar). Desktop falls through to
    // the single-card branch below when there's only one collection.
    const carousel = (
        <GenericCarouselTopButton
            title={headerTitle}
            titleSize="24px"
            titleClassName={titleClassName}
            gap={16}
            compactDesktopNav>
            {adapted.map((collection) => (
                <div
                    key={collection.id}
                    // Narrower than the page so the next card peeks on mobile;
                    // smaller fixed widths on desktop so the card isn't oversized.
                    className="w-[82vw] md:w-[280px] lg:w-[312px] xl:w-[340px] shrink-0">
                    <CollectionCard
                        collection={collection}
                        onViewAll={handleViewAllById}
                        titleLines={1}
                        compact
                    />
                </div>
            ))}
        </GenericCarouselTopButton>
    )

    // Single collection on desktop: skip the carousel (no dead-zone next
    // to a lone card). Mobile still uses the carousel for the progress bar.
    const body = isSingle ? (
        <>
            <div className="md:hidden">{carousel}</div>
            <div className="hidden md:flex md:flex-col md:gap-4">
                <h2 className={titleClassName}>{headerTitle}</h2>
                <div className="w-full md:max-w-[312px]">
                    <CollectionCard
                        collection={adapted[0]}
                        onViewAll={handleViewAllById}
                        titleLines={1}
                        compact
                    />
                </div>
            </div>
        </>
    ) : (
        carousel
    )

    // Trailing divider separates the collections from the CTA banner below.
    // Inside the section so it hides when the section self-hides.
    return (
        <>
            {body}
            {!hideTrailingDivider && <Divider />}
        </>
    )
}

export default CuratedCollectionsSection
