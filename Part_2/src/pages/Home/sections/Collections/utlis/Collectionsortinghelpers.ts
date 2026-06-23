import type { CollectionListItem } from '@/modules/ContentCollection/api/contentCollectionApi'

/**
 * Sort collections to prioritize free tripboards before paid ones
 * Within each price tier, maintains original order
 * 
 * @param collections - Array of collections to sort
 * @returns Sorted array with free collections first, then paid collections
 */
export const sortCollectionsByPrice = (
    collections: CollectionListItem[]
): CollectionListItem[] => {
    return [...collections].sort((a, b) => {
        const priceA = a.pricing?.amount ?? 0
        const priceB = b.pricing?.amount ?? 0

        // Free (0) comes first, then paid in ascending order
        if (priceA === 0 && priceB === 0) return 0 // Both free, keep order
        if (priceA === 0) return -1 // a is free, comes first
        if (priceB === 0) return 1 // b is free, comes first
        
        // Both are paid, sort by price ascending (cheaper first)
        return priceA - priceB
    })
}