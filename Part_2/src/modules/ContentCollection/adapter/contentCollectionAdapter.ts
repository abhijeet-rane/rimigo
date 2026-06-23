import type {
    ContentCollection,
    Section,
    Block,
    ContentCollectionViewModel,
    SectionViewModel,
    BlockViewModel,
    CurationStatus
} from '../types/contentCollection'

/**
 * Format status for display
 */
const formatStatus = (status: CurationStatus | string): string => {
    const statusMap: Record<string, string> = {
        draft: 'Draft',
        published: 'Published',
        archived: 'Archived'
    }
    return statusMap[status] || status
}

/**
 * Format currency for display
 */
const formatCurrency = (amount: number, currency: string): string => {
    if (!amount) return ''
    const rounded = Math.round(amount)
    const formatted = rounded.toLocaleString('en-IN') // adds commas like 1,23,456
    if (currency === 'INR') return `₹${formatted}`

    const symbolMap: Record<string, string> = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥'
    }
    const symbol = symbolMap[currency] || currency
    return `${symbol}${formatted}`
}

/**
 * Format block type for display
 */
const formatBlockType = (type: string): string => {
    const typeMap: Record<string, string> = {
        text: 'Text',
        text_list: 'Text List',
        links: 'Links',
        notice: 'Notice'
    }
    return typeMap[type] || type
}

/**
 * Adapt block to ViewModel
 */
export const adaptBlockToViewModel = (block: Block): BlockViewModel => {
    return {
        id: block.id || '',
        type: block.block_type,
        typeFormatted: formatBlockType(block.block_type),
        label: block.label || null,
        description: block.description || null,
        level: block.level || null,
        value: block.value || {}
    }
}

/**
 * Adapt section to ViewModel
 */
export const adaptSectionToViewModel = (section: Section): SectionViewModel => {
    return {
        id: section.id || '',
        type: section.section_type || '',
        typeFormatted: formatBlockType(section.section_type || ''),
        title: section.title || '',
        description: section.description || null,
        sectionsOrder: section.sections_order ?? null,
        entityId: section.entity_id || null,
        blocks: (section.blocks || []).map(adaptBlockToViewModel)
    }
}

/**
 * Adapt content collection to ViewModel
 */
export const adaptContentCollectionToViewModel = (collection: ContentCollection): ContentCollectionViewModel => {
    const imageUrl = collection.image_url || collection.cover_image || ''
    const formattedPrice = collection.pricing
        ? formatCurrency(collection.pricing.amount, collection.pricing.currency)
        : null

    return {
        id: collection.id || '',
        identifier: collection.identifier || '',
        name: collection.name || '',
        description: collection.description || '',
        imageUrl: imageUrl,
        tripId: collection.trip_id || collection.context?.trip_id || null,
        publisherName: collection.publisher?.name || null,
        publisherId: collection.publisher?.publisher_id || null,
        publisherType: collection.publisher?.type || null,
        publisherMetadata: collection.publisher?.metadata || null,
        status: (collection.curation_status || collection.status || 'draft') as CurationStatus,
        statusFormatted: formatStatus(collection.curation_status || collection.status || 'draft'),
        sections: (collection.sections || [])
            .map(adaptSectionToViewModel)
            .sort((a, b) => (a.sectionsOrder ?? Infinity) - (b.sectionsOrder ?? Infinity)),
        context: collection.context || null,
        isActive: collection.is_active ?? false,
        createdAt: collection.created_at || null,
        updatedAt: collection.updated_at || null,
        formattedPrice: formattedPrice
    }
}

