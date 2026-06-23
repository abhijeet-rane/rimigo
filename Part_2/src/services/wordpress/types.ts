export interface WordPressPost {
    id: number
    date: string
    modified: string
    slug: string
    status: string
    type: string
    title: {
        rendered: string
    }
    content: {
        rendered: string
        protected: boolean
    }
    excerpt: {
        rendered: string
        protected: boolean
    }
    featured_media: number
    categories: number[]
    tags: number[]
    _links: {
        [key: string]: Array<{
            href: string
        }>
    }
    _embedded?: {
        'wp:featuredmedia'?: Array<{
            source_url: string
        }>
        'wp:term'?: Array<
            Array<{
                id: number
                name: string
                slug: string
            }>
        >
        author?: Array<{
            name: string
            avatar_urls?: {
                [key: string]: string
            }
        }>
    }
}

export interface WordPressCategory {
    id: number
    count: number
    description: string
    link: string
    name: string
    slug: string
    taxonomy: string
    parent: number
}

export interface WordPressTag {
    id: number
    count: number
    description: string
    link: string
    name: string
    slug: string
    taxonomy: string
}

export interface WordPressMedia {
    id: number
    date: string
    slug: string
    type: string
    link: string
    title: {
        rendered: string
    }
    source_url: string
    media_details: {
        sizes: {
            [key: string]: {
                source_url: string
                width: number
                height: number
            }
        }
    }
}

export interface PaginationParams {
    page?: number
    per_page?: number
    search?: string
    categories?: number[]
    tags?: number[]
}

export interface PaginatedResponse<T> {
    data: T[]
    pagination: {
        currentPage: number
        totalPages: number
        totalPosts: number
        perPage: number
    }
}
