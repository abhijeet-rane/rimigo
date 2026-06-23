/**
 * Service to auto-add a restaurant section to the food tab
 * when a meal slot with Google Place data is created in the itinerary.
 */

import { tripboardApi } from '@/modules/Tripboard/api/tripboardApi'
import { travelerCollectionApi } from '@/modules/ContentCollection/api/travelerCollectionApi'
import { ENTITY_TYPE_RESTAURANT } from '@/modules/ContentCollection/lib/collectionConfig'

export interface SlotPlaceData {
    place_id: string
    name: string
    map_link?: string
    image_url?: string
    address?: string
    latitude?: number | null
    longitude?: number | null
}

interface BaseCity {
    id: string
    name: string
}

/**
 * After a meal slot with Google Place data is created,
 * add a corresponding restaurant section to the active tripboard's food tab.
 */
export async function addRestaurantToFoodTab(
    tripId: string,
    slotData: SlotPlaceData,
    baseCity?: BaseCity
): Promise<void> {
    // 1) Get the traveler collection for this trip
    const collectionResponse = await tripboardApi.getCollectionByTripId(tripId)
    const collections = collectionResponse?.data
    if (!collections || !Array.isArray(collections) || collections.length === 0) return

    const collection = collections[0] as any
    const identifier = collection.identifier
    if (!identifier) return

    // 2) Build the restaurant section payload
    const blockValue: Record<string, unknown> = {}
    if (slotData.map_link) blockValue.maps_url = slotData.map_link
    if (slotData.place_id) blockValue.place_id = slotData.place_id
    if (slotData.image_url) blockValue.photo_url = slotData.image_url
    if (slotData.address) blockValue.address = slotData.address
    if (slotData.latitude != null) blockValue.latitude = slotData.latitude
    if (slotData.longitude != null) blockValue.longitude = slotData.longitude

    const metadata: Record<string, unknown> = {}
    if (baseCity) {
        metadata.city_id = baseCity.id
        metadata.city_name = baseCity.name
    }
    if (slotData.image_url) metadata.photo_url = slotData.image_url
    if (slotData.latitude != null && slotData.longitude != null) {
        metadata.location = {
            latitude: slotData.latitude,
            longitude: slotData.longitude,
            address: slotData.address || undefined
        }
    }

    const payload = {
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        section_type: 'restaurant',
        title: slotData.name,
        description: null as string | null,
        sections_order: Math.floor(Math.random() * 1000) + 1,
        entity_type: ENTITY_TYPE_RESTAURANT,
        blocks: [{ block_type: 'links', value: blockValue }],
        metadata
    }

    await travelerCollectionApi.addSection(identifier, payload)
}
