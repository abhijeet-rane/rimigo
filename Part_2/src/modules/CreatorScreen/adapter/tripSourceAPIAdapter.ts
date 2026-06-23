import { ITripSourceResponse } from '@/types/tripSourceTypes/tripsSourceTypes'

/*
{
    "name": "wanderlust_himani",
    "has_media_content": true,
    "media": {
        "instagram_username": "wanderlust_himani",
        "instagram_profile_url": "https://www.instagram.com/wanderlust_himani/",
        "thumbnail_url": "https://rimigo-lead-generation.s3-accelerate.amazonaws.com/source_media/wanderlust_himani_hero.webp"
    }
}

*/
export const tripSourceAPIAdapter = (tripSourceData: ITripSourceResponse) => {
    const media = tripSourceData?.media ?? {} // fallback to empty object

    return {
        full_name: tripSourceData?.full_name ?? '',
        source_name: tripSourceData?.name ?? '',
        has_media_content: tripSourceData?.has_media_content ?? false,
        instagram_username: media?.instagram_username ?? null,
        instagram_profile_url: media?.instagram_profile_url ?? null,
        thumbnail_url: media?.thumbnail_url ?? ''
    }
}
