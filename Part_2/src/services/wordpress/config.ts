export const WORDPRESS_API_URL = 'https://blog.rimigo.com//wp-json/wp/v2'

export const PER_PAGE = 10 // Number of posts to fetch per page

export const ENDPOINTS = {
    posts: '/posts',
    categories: '/categories',
    tags: '/tags',
    media: '/media'
} as const
