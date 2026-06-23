import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WordPressService } from '../../services/wordpress/api'
import type { WordPressPost } from '../../services/wordpress/types'
import WPContentFrame from './WPContentFrame'
import SEO from '../../components/SEO'

type WordPressTerm = { id: number; name: string; slug: string }

export default function BlogPost() {
    const { slug } = useParams<{ slug: string }>()
    const [post, setPost] = useState<WordPressPost | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchPost = async () => {
            if (!slug) return

            try {
                const data = await WordPressService.getPost(slug)
                setPost(data)
            } catch (err) {
                setError('Failed to fetch blog post')
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        fetchPost()
    }, [slug])

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

    if (!post) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
                <div className="text-xl font-semibold mb-4">Post not found</div>
                <p className="text-gray-600 text-center">The blog post you're looking for doesn't exist or has been removed.</p>
            </div>
        )
    }

    return (
        <div className="pt-32 pb-20 md:pt-44 md:pb-32 bg-white-50">
            <SEO
                title={post.title.rendered}
                description={post.excerpt?.rendered?.replace(/<[^>]*>/g, '').substring(0, 160) || 'Travel blog post from Rimigo'}
                canonical={`https://rimigo.com/blogs/${post.slug}`}
                image={post._embedded?.['wp:featuredmedia']?.[0]?.source_url}
                type="article"
            />
            <article className="max-w-5xl md:max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
                {post.featured_media && (
                    <div className="aspect-video w-full mb-8 rounded-lg overflow-hidden shadow-lg">
                        <img
                            src={post._embedded?.['wp:featuredmedia']?.[0]?.source_url}
                            alt={post.title.rendered}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                <header className="mb-8 text-center">
                    <h1
                        className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
                        dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                    />

                    <div className="flex items-center justify-center text-sm text-gray-500 space-x-4">
                        <time dateTime={post.date}>
                            {new Date(post.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </time>
                        {post._embedded?.['wp:term']?.[0]?.map((term: WordPressTerm) => (
                            <span
                                key={term.id}
                                className="text-primary">
                                {term.name}
                            </span>
                        ))}
                    </div>
                </header>

                <WPContentFrame
                    html={post.content.rendered}
                    wordpressSiteBase={'https://blog.rimigo.com'}
                />

                <footer className="mt-12 pt-8 border-t border-gray-200">
                    <div className="flex flex-col items-center text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Share this post</h3>
                        <div className="flex space-x-4">
                            <a
                                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                                    post.title.rendered
                                )}&url=${encodeURIComponent(window.location.href)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-primary transition-colors duration-200">
                                Twitter
                            </a>
                            <a
                                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-primary transition-colors duration-200">
                                Facebook
                            </a>
                            <a
                                href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
                                    window.location.href
                                )}&title=${encodeURIComponent(post.title.rendered)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-primary transition-colors duration-200">
                                LinkedIn
                            </a>
                        </div>
                    </div>
                </footer>
            </article>
        </div>
    )
}
