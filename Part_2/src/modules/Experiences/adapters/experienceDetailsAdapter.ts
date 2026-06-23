import { AdaptedExperienceDetailsType, ExperienceDetailsType } from '../types/experienceDetailTypes'
import { adaptExperienceSeasonalInformationToUI } from './experienceSeasonalInformationAdapter'

const DEFAULT_TRANSPORT_OPTIONS = {
    bus: false,
    metro: false,
    train: false,
    taxi: false,
    car: false,
    bike: false,
    cable_car: false,
    walking: false,
    shuttle_service: false,
    boat_service: false,
    ferry_service: false,
    description: '',
    recommended_option: [] as string[],
    transport_option_description: [] as Array<{ key: string; description: string }>
}

const adaptIdentifierToTitle = (identifier: string): string => {
    return identifier.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export const adaptExperienceDetailsToUI = (experienceDetails: ExperienceDetailsType): AdaptedExperienceDetailsType => {
    return {
        ...experienceDetails,
        id: experienceDetails.id,
        name: experienceDetails.name,
        identifier: adaptIdentifierToTitle(experienceDetails.identifier),
        location: {
            address: experienceDetails.location?.address ?? '',
            city: {
                id: experienceDetails.base_city?.id ?? '',
                name: experienceDetails.base_city?.name ?? ''
            },
            country: {
                id: experienceDetails.base_city?.country?.id ?? '',
                name: experienceDetails.base_city?.country?.name ?? ''
            }
        },
        price: {
            currency: experienceDetails.price?.currency ?? null,
            lower_bound: experienceDetails.price?.lower_bound ?? null,
            upper_bound: experienceDetails.price?.upper_bound ?? null
        },
        display_props: {
            name: experienceDetails.display_props?.name || '',
            landscape_image: experienceDetails.display_props?.landscape_image || '',
            portrait_image: experienceDetails.display_props?.portrait_image || '',
            reel: experienceDetails.display_props?.reel || '',
            video: experienceDetails.display_props?.video || '',
            description: experienceDetails.display_props?.description || ''
        },
        short_description: experienceDetails.short_description || '',
        categories: experienceDetails.categories || [],
        group_type_suitability: experienceDetails.group_type_suitability || {
            families: { is_suitable: false, description: '' },
            couples: { is_suitable: false, description: '' },
            solo_travelers: { is_suitable: false, description: '' },
            groups: { is_suitable: false, description: '' }
        },
        seasonal_information: adaptExperienceSeasonalInformationToUI(experienceDetails.seasonal_information || {}),
        content: experienceDetails?.content && {
            verified_photos: experienceDetails?.content?.verified_photos ?? [],
            instagram_reels: experienceDetails?.content?.instagram_reels ?? [],
            youtube_videos: experienceDetails?.content?.youtube_videos ?? [],
            highlights: experienceDetails?.content?.highlights ?? [],
            youtube_shorts: experienceDetails?.content?.youtube_shorts ?? []
        },
        transport_options: {
            ...DEFAULT_TRANSPORT_OPTIONS,
            ...(experienceDetails.transport_options ?? {}),
            transport_option_description:
                experienceDetails.transport_options?.transport_option_description ?? DEFAULT_TRANSPORT_OPTIONS.transport_option_description
        },
        timing_guide: experienceDetails.timing_guide || {
            recommended_time_slots: []
        },
        constraints: experienceDetails.constraints || {
            age: { minimum: 0, maximum: 100, description: '' },
            mobility: { wheelchair_accessible: false, walking_required: false, description: '' }
        },
        is_ticket_required: experienceDetails.is_ticket_required ?? null,
        recommended_mode: experienceDetails.recommended_mode ?? null,
        booking_window: experienceDetails.booking_window ?? null,
        suggestion_priority: experienceDetails.suggestion_priority ?? null,
        ata_agent: {
            id: experienceDetails?.ata_agent?.id ?? null,
            name: experienceDetails?.ata_agent?.name ?? '',
            identifier: experienceDetails?.ata_agent?.identifier ?? '',
            icon_url: experienceDetails?.ata_agent?.icon_url ?? null
        },
        traveler_reviews: experienceDetails.traveler_reviews
    }
}

/*
            "ata_agent": {
                "id": "68e54e54d9ef1a9272c5c2ef",
                "name": "Dessert Safari",
                "identifier": "uae-dubai-dessert-safari"
            },
*/
