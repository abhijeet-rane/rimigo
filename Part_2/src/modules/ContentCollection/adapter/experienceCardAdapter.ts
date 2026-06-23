import { adaptExperienceDetailsToUI } from '@/modules/Experiences/adapters'
import type { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import type { ExperienceDetailsType } from '@/modules/Experiences/types/experienceDetailTypes'
import { getCategoryIcon } from '@/modules/Acitvities/utils/categoryIconMapper'
import type { EnrichedExperience } from '@/modules/Experiences/api/experienceBatchAPI'
import type { Section } from '../types/contentCollection'

/**
 * Adapts raw experience data to ExperienceCardData format
 * @param exp - Raw experience data from API
 * @returns ExperienceCardData or null if invalid
 */
export const adaptExperienceToCardData = (exp: unknown): ExperienceCardData | null => {
    if (!exp) return null

    const adapted = adaptExperienceDetailsToUI(exp as ExperienceDetailsType)
    const firstCategory = adapted.categories && adapted.categories.length > 0 ? adapted.categories[0] : null
    const categoryIcon = getCategoryIcon(firstCategory ?? null)

    return {
        id: adapted.id,
        title: adapted.name,
        name: adapted.name,
        city_name: adapted.location?.city?.name || '',
        city_id: adapted.location?.city?.id || '',
        image: adapted.display_props?.landscape_image || '',
        images: [adapted.display_props?.landscape_image || '', ...(adapted.content?.verified_photos?.map((p) => p.url) || [])],
        price: {
            lower_bound: adapted.price?.lower_bound || 0,
            upper_bound: adapted.price?.upper_bound || 0,
            currency: adapted.price?.currency || ''
        },
        suggestion_priority: adapted.suggestion_priority ?? null,
        short_description: adapted.short_description || null,
        category: firstCategory,
        categoryBackendValue: firstCategory,
        categories: adapted.categories || null,
        categoryIcon: categoryIcon
    } as ExperienceCardData
}

/**
 * Adapts collection section data to ExperienceCardData format
 * This adapter extracts experience card data directly from the collection response
 * @param section - Section from collection response
 * @returns ExperienceCardData or null if invalid
 */
export const adaptCollectionSectionToExperienceCard = (section: Section): ExperienceCardData | null => {
    if (!section || section.section_type !== 'experience' || !section.entity_id) {
        return null
    }

    const metadata = section.metadata as {
        city_id?: string
        city_name?: string
        display_props?: {
            landscape_image?: string
        }
        content?: {
            verified_photos?: Array<{
                id: string
                url: string
            }>
        }
        start_date?: string | null
        end_date?: string | null
    } | undefined

    const landscapeImage = metadata?.display_props?.landscape_image || ''
    const verifiedPhotos = metadata?.content?.verified_photos || []
    const images = [landscapeImage, ...verifiedPhotos.map((photo) => photo.url)].filter(Boolean)

    return {
        id: section.entity_id,
        title: section.title || '',
        name: section.title || '',
        city_name: metadata?.city_name || '',
        city_id: metadata?.city_id || '',
        image: landscapeImage,
        images: images.length > 0 ? images : [landscapeImage],
        price: {
            lower_bound: null,
            upper_bound: null,
            currency: null
        },
        suggestion_priority: null,
        short_description: section.description || null,
        category: null,
        categoryBackendValue: null,
        categories: null,
        categoryIcon: null,
        start_date: metadata?.start_date || null,
        end_date: metadata?.end_date || null
    } as ExperienceCardData
}

/**
 * Resolve card data for a collection experience section using the bulk
 * enrichment map as the source of truth. Section metadata supplies only the
 * per-collection state (start_date / end_date); the section's title is a
 * lightweight offline fallback when enrichment is absent.
 *
 * Returns null when there's no usable data — the caller should have already
 * gated rendering on `isEnrichmentLoading` so null here means the experience
 * was deleted from the source DB. Caller drops the card silently.
 */
export const resolveExperienceCardData = (
    section: Section,
    enrichedMap: Map<string, EnrichedExperience>
): ExperienceCardData | null => {
    if (!section || section.section_type !== 'experience' || !section.entity_id) {
        return null
    }
    const enriched = enrichedMap.get(section.entity_id)
    if (!enriched) return null

    const metadata = section.metadata as
        | { start_date?: string | null; end_date?: string | null }
        | undefined

    const landscapeImage = enriched.display_props?.landscape_image || ''
    const verifiedPhotos = enriched.content?.verified_photos || []
    const images = [landscapeImage, ...verifiedPhotos.map((p) => p?.url || '')].filter(Boolean)
    const firstCategory = enriched.categories && enriched.categories.length > 0 ? enriched.categories[0] : null
    const categoryIcon = getCategoryIcon(firstCategory ?? null)
    const title = enriched.name || section.title || ''

    return {
        id: section.entity_id,
        identifier: enriched.identifier || undefined,
        title,
        name: title,
        city_name: enriched.city_name || '',
        city_id: enriched.city_id || '',
        image: landscapeImage,
        images: images.length > 0 ? images : [landscapeImage],
        price: {
            lower_bound: enriched.price?.lower_bound ?? null,
            upper_bound: enriched.price?.upper_bound ?? null,
            currency: enriched.price?.currency ?? null,
        },
        suggestion_priority: enriched.suggestion_priority ?? null,
        short_description: enriched.short_description ?? null,
        category: firstCategory,
        categoryBackendValue: firstCategory,
        categories: enriched.categories ?? null,
        categoryIcon,
        start_date: metadata?.start_date ?? null,
        end_date: metadata?.end_date ?? null,
    } as ExperienceCardData
}
