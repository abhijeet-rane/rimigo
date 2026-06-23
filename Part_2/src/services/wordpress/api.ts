import axios from 'axios'
import { WORDPRESS_API_URL, ENDPOINTS, PER_PAGE } from './config'
import type { WordPressPost, WordPressCategory, WordPressTag, WordPressMedia, PaginationParams, PaginatedResponse } from './types'

const api = axios.create({
    baseURL: WORDPRESS_API_URL,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
    }
})

// Add response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 301 || error.response?.status === 302) {
            // Handle redirect
            const newUrl = error.response.headers.location
            if (newUrl) {
                return api.get(newUrl)
            }
        }
        return Promise.reject(error)
    }
)

export const WordPressService = {
    // Posts
    async getPosts(params: PaginationParams = {}): Promise<WordPressPost[]> {
        try {
            const { data } = await api.get(ENDPOINTS.posts, {
                params: {
                    per_page: params.per_page || PER_PAGE,
                    page: params.page || 1,
                    search: params.search,
                    categories: params.categories?.join(','),
                    tags: params.tags?.join(','),
                    _embed: true // Include embedded data
                }
            })
            return data
        } catch (error) {
            console.error('Error fetching posts:', error)
            return []
        }
    },

    async getPostsPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<WordPressPost>> {
        try {
            const response = await api.get(ENDPOINTS.posts, {
                params: {
                    per_page: params.per_page || PER_PAGE,
                    page: params.page || 1,
                    search: params.search,
                    categories: params.categories?.join(','),
                    tags: params.tags?.join(','),
                    _embed: true // Include embedded data
                }
            })

            const totalPosts = parseInt(response.headers['x-wp-total'] || '0')
            const totalPages = parseInt(response.headers['x-wp-totalpages'] || '0')
            const currentPage = params.page || 1
            const perPage = params.per_page || PER_PAGE

            return {
                data: response.data,
                pagination: {
                    currentPage,
                    totalPages,
                    totalPosts,
                    perPage
                }
            }
        } catch (error) {
            console.error('Error fetching posts:', error)
            return {
                data: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 0,
                    totalPosts: 0,
                    perPage: PER_PAGE
                }
            }
        }
    },

    async getPost(slug: string): Promise<WordPressPost | null> {
        try {
            const { data } = await api.get(`${ENDPOINTS.posts}?slug=${slug}&_embed=true`)
            return Array.isArray(data) ? data[0] : data
        } catch (error) {
            console.error('Error fetching post:', error)
            return null
        }
    },

    // Categories
    async getCategories(): Promise<WordPressCategory[]> {
        try {
            const { data } = await api.get(ENDPOINTS.categories)
            return data
        } catch (error) {
            console.error('Error fetching categories:', error)
            return []
        }
    },

    // Tags
    async getTags(): Promise<WordPressTag[]> {
        try {
            const { data } = await api.get(ENDPOINTS.tags)
            return data
        } catch (error) {
            console.error('Error fetching tags:', error)
            return []
        }
    },

    // Media
    async getMedia(id: number): Promise<WordPressMedia | null> {
        try {
            const { data } = await api.get(`${ENDPOINTS.media}/${id}`)
            return data
        } catch (error) {
            console.error('Error fetching media:', error)
            return null
        }
    }
}
