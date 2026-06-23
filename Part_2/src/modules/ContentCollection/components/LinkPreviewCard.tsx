import { useState, useEffect } from 'react'
import { ImageIcon } from 'lucide-react'

interface LinkPreviewCardProps {
    url: string
    className?: string
}

interface LinkPreviewData {
    title?: string
    description?: string
    image?: string
    siteName?: string
}

const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ url, className = '' }) => {
    const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(false)
    const [imageError, setImageError] = useState(false)

    useEffect(() => {
        let isMounted = true
        let timeoutId: NodeJS.Timeout
        let abortController: AbortController

        const fetchPreview = async () => {
            try {
                setIsLoading(true)
                setError(false)
                setImageError(false)

                // Create abort controller for cleanup
                abortController = new AbortController()

                // Set a timeout for the request
                timeoutId = setTimeout(() => {
                    if (isMounted) {
                        abortController.abort()
                        setError(true)
                        setIsLoading(false)
                    }
                }, 10000) // 10 second timeout

                // Try to fetch the URL HTML
                // Note: Many sites block CORS, so this may fail - we'll use fallback
                let response: Response
                let html: string

                try {
                    response = await fetch(url, {
                        method: 'GET',
                        mode: 'cors',
                        signal: abortController.signal,
                        headers: {
                            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                        }
                    })

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`)
                    }

                    html = await response.text()
                } catch {
                    // CORS blocked or network error - use fallback
                    throw new Error('CORS_BLOCKED')
                }

                clearTimeout(timeoutId)

                if (!isMounted) return

                // Parse HTML using DOMParser
                const parser = new DOMParser()
                const doc = parser.parseFromString(html, 'text/html')

                // Extract metadata
                const title =
                    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                    doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
                    doc.querySelector('title')?.textContent ||
                    ''

                const description =
                    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                    doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
                    doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                    ''

                const image =
                    doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                    doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
                    doc.querySelector('meta[name="twitter:image:src"]')?.getAttribute('content') ||
                    ''

                const siteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || ''

                // Convert relative image URLs to absolute
                let absoluteImageUrl = image
                if (image && !image.startsWith('http')) {
                    try {
                        const urlObj = new URL(url)
                        if (image.startsWith('//')) {
                            absoluteImageUrl = `${urlObj.protocol}${image}`
                        } else if (image.startsWith('/')) {
                            absoluteImageUrl = `${urlObj.protocol}//${urlObj.host}${image}`
                        } else {
                            absoluteImageUrl = `${urlObj.protocol}//${urlObj.host}/${image}`
                        }
                    } catch {
                        absoluteImageUrl = image
                    }
                }

                if (isMounted) {
                    setPreviewData({
                        title: title.trim(),
                        description: description.trim(),
                        image: absoluteImageUrl,
                        siteName: siteName.trim()
                    })
                    setIsLoading(false)
                }
            } catch (err) {
                // Handle CORS or other errors gracefully
                if (err instanceof Error && err.name === 'AbortError') {
                    // Request was aborted, don't log as error
                    return
                }

                clearTimeout(timeoutId)

                // CORS is likely blocking the request - this is expected for most sites
                // Try to at least extract domain info for a basic preview
                try {
                    const urlObj = new URL(url)
                    const domain = urlObj.hostname

                    // Use a larger favicon service that provides better images
                    // Try multiple favicon services as fallback
                    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`

                    if (isMounted) {
                        setPreviewData({
                            title: domain.replace('www.', ''),
                            description: '',
                            image: faviconUrl, // Use favicon as fallback
                            siteName: domain.replace('www.', '')
                        })
                        setIsLoading(false)
                        // Don't set error - we have a fallback
                        return
                    }
                } catch {
                    // Invalid URL or other error
                    if (isMounted) {
                        setError(true)
                        setIsLoading(false)
                    }
                }
            }
        }

        if (url) {
            fetchPreview()
        }

        return () => {
            isMounted = false
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
            if (abortController) {
                abortController.abort()
            }
        }
    }, [url])

    // Get the image URL from preview
    const imageUrl = previewData?.image

    // Determine if we should use circular shape (check if className contains rounded-full)
    const isCircular = className.includes('rounded-full')
    const shapeClass = isCircular ? 'rounded-full' : 'rounded-lg'
    const aspectClass = isCircular ? '' : 'aspect-square'

    // Show loading state
    if (isLoading) {
        return (
            <div
                className={`w-full h-full ${aspectClass} bg-grey-5 ${shapeClass} flex items-center justify-center border border-grey-4 ${className}`}>
                <div className="animate-pulse">
                    <ImageIcon className="w-8 h-8 text-grey-3" />
                </div>
            </div>
        )
    }

    // Show preview image or placeholder
    if (imageUrl && !error) {
        return (
            <div
                className={`w-full h-full ${aspectClass} ${shapeClass} overflow-hidden border border-grey-4 bg-grey-5 flex items-center justify-center ${className}`}>
                <img
                    src={imageUrl}
                    alt={previewData?.title || previewData?.siteName || 'Link preview'}
                    className={`w-full h-full ${imageError ? 'hidden' : 'object-cover'} ${isCircular ? 'rounded-full' : ''}`}
                    onError={() => {
                        setImageError(true)
                    }}
                    loading="lazy"
                />
                {imageError && (
                    <div className="flex flex-col items-center gap-2 px-2">
                        <ImageIcon className="w-8 h-8 text-grey-3" />
                        {previewData?.title && !isCircular && <p className="text-xs text-grey-2 text-center line-clamp-2">{previewData.title}</p>}
                    </div>
                )}
            </div>
        )
    }

    // Show placeholder/dummy image
    return (
        <div className={`w-full h-full ${aspectClass} ${shapeClass} flex items-center justify-center ${className}`}>
            <div className="flex flex-col items-center gap-2 px-2">
                <ImageIcon className="w-8 h-8 text-grey-3" />
                {previewData?.title && !isCircular && <p className="text-xs text-grey-2 text-center line-clamp-2">{previewData.title}</p>}
                {!previewData?.title && !isLoading && !isCircular && <p className="text-xs text-grey-3 text-center">Preview unavailable</p>}
            </div>
        </div>
    )
}

export default LinkPreviewCard
