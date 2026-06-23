import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { CollectionSectionProps } from './types'
import CollectionCard from './CollectionCard'
import GenericCarouselTopButton from '@/components/shared/Carousel/GenericCarouselTopButton'
import { getCollectionExperiences } from '@/modules/Acitvities/api/collectionsAPI'
import { adaptCollectionExperiencesToCollections } from '@/modules/Acitvities/adapters/collectionsAdapter'
import { cn } from '@/lib/utils'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import Divider from '../shared/Divider/Divider'

const CollectionSection: React.FC<CollectionSectionProps> = ({
    cityId,
    sourceId,
    title = 'Curated collections',
    onViewAll,
    onItemClick,
    className,
    enabled = true,
    showDivider = true
}) => {
    // Fetch collections using API
    const {
        data: apiData,
        isLoading,
        isError
    } = useQuery({
        queryKey: ['collectionExperiences', cityId, sourceId],
        queryFn: () => getCollectionExperiences({ cityId: cityId || undefined, sourceId: sourceId || undefined }),
        enabled: enabled && (!!cityId || !!sourceId),
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Transform the API data to Collection format
    const collections = apiData ? adaptCollectionExperiencesToCollections(apiData) : []

    // Don't render if loading, error, or no collections
    if (isLoading || isError || !collections || collections.length === 0) {
        return null
    }

    return (
        <>
            {showDivider && <Divider className="mb-10 md:my-12" />}
            <section className={cn('w-full max-md:pl-[20px]', className)}>
                {/* Carousel with Title */}
                <GenericCarouselTopButton
                    title={title}
                    gap={16}
                    className="">
                    {collections.map((collection) => (
                        <div
                            key={collection.id}
                            className="w-[calc(100vw-40px)]  md:w-[360px] lg:w-[440px] xl:w-[520px] shrink-0">
                            <CollectionCard
                                collection={collection}
                                onViewAll={onViewAll}
                                onItemClick={onItemClick}
                            />
                        </div>
                    ))}
                </GenericCarouselTopButton>
                {showDivider && <Divider className="mt-10 md:hidden" />}
            </section>
            {/* {showDivider && <Divider className="my-12 bg-white" />} */}
        </>
    )
}

export default CollectionSection
