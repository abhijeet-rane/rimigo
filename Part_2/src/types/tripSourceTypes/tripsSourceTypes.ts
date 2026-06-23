interface Media {
    instagram_username?: string | null
    instagram_profile_url?: string | null
    thumbnail_url?: string | null
}

export interface ITripSourceResponse {
    id?: string
    full_name: string
    is_source_valid: boolean
    name: string
    has_media_content: boolean
    media: Media
}
