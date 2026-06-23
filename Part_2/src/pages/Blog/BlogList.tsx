import { useEffect, useState, useCallback } from 'react'
import { WordPressService } from '../../services/wordpress/api'
import type { WordPressPost } from '../../services/wordpress/types'
import { Link } from 'react-router-dom'
import Pagination from '../../components/ui/Pagination'
import { IconSearch, IconX } from '@tabler/icons-react'

export default function BlogList() {
    const [posts, setPosts] = useState<WordPressPost[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 0,
        totalPosts: 0,
        perPage: 20
    })

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                setLoading(true)
                const response = await WordPressService.getPostsPaginated({
                    page: currentPage,
                    search: searchQuery || undefined
                })
                setPosts(response.data)
                setPagination(response.pagination)
            } catch (err) {
                setError('Failed to fetch blog posts')
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        fetchPosts()
    }, [currentPage, searchQuery])

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        // Scroll to top when page changes
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query)
        setCurrentPage(1) // Reset to first page when searching
    }, [])

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        handleSearch(searchInput.trim())
    }

    const clearSearch = () => {
        setSearchInput('')
        handleSearch('')
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[70vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
                <div className="text-red-500 text-xl font-semibold mb-4">{error}</div>
                <p className="text-gray-600 text-center">Please try again later or contact support if the problem persists.</p>
            </div>
        )
    }

    return (
        <div className="pt-32 pb-20 md:pt-44 md:pb-32 bg-white-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 md:mb-16">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Travel Diaries</h1>
                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-4">
                        Discover travel tips, destination guides, and stories from our community
                    </p>
                    {pagination.totalPosts > 0 && (
                        <p className="text-sm text-gray-500">
                            {searchQuery ? (
                                <>
                                    Found {pagination.totalPosts} result
                                    {pagination.totalPosts !== 1 ? 's' : ''} for "{searchQuery}"
                                </>
                            ) : (
                                <>
                                    Showing {(currentPage - 1) * pagination.perPage + 1} to{' '}
                                    {Math.min(currentPage * pagination.perPage, pagination.totalPosts)} of {pagination.totalPosts} articles
                                </>
                            )}
                        </p>
                    )}
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-12">
                    <form
                        onSubmit={handleSearchSubmit}
                        className="relative">
                        <div className="relative">
                            <IconSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search articles..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="w-full pl-12 pr-12 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                    <IconX className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="sr-only">
                            Search
                        </button>
                    </form>
                    {searchQuery && (
                        <div className="mt-3 text-center">
                            <button
                                onClick={clearSearch}
                                className="text-sm text-primary hover:text-primary/80 transition-colors">
                                Clear search
                            </button>
                        </div>
                    )}
                </div>

                {posts.length === 0 && !loading ? (
                    <div className="text-center py-12">
                        <div className="text-gray-400 mb-4">
                            <IconSearch className="w-16 h-16 mx-auto mb-4" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{searchQuery ? 'No articles found' : 'No articles available'}</h3>
                        <p className="text-gray-600 mb-6">
                            {searchQuery
                                ? `We couldn't find any articles matching "${searchQuery}". Try different keywords or browse all articles.`
                                : 'There are no articles available at the moment.'}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="bg-primary-default text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
                                View All Articles
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {posts.map((post) => (
                            <Link
                                key={post.id}
                                to={`/blogs/${post.slug}`}
                                className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                                {post.featured_media && post._embedded?.['wp:featuredmedia']?.[0]?.source_url && (
                                    <div className="aspect-[16/10] w-full overflow-hidden">
                                        <img
                                            src={post._embedded?.['wp:featuredmedia']?.[0]?.source_url}
                                            alt={post.title.rendered}
                                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                )}
                                <div className="p-6">
                                    <div className="flex items-center text-sm text-gray-500 mb-3">
                                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">
                                            {post._embedded?.['wp:term']?.[0]?.[0]?.name || 'Travel'}
                                        </span>
                                        <span className="ml-2">
                                            {new Date(post.date).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <h2
                                        className="text-xl font-semibold mb-3 text-gray-900 group-hover:text-primary transition-colors duration-200"
                                        dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                                    />
                                    <div
                                        className="text-gray-600 line-clamp-3"
                                        dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }}
                                    />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                    className="mt-12"
                />
            </div>
        </div>
    )
}
