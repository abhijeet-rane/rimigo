import { useEffect } from 'react'

interface SEOProps {
    title?: string
    description?: string
    canonical?: string
    image?: string
    type?: string
}

export default function SEO({ title, description, canonical, image, type = 'article' }: SEOProps) {
    useEffect(() => {
        // Update document title
        if (title) {
            document.title = title
        }

        // Update or create meta tags
        const updateMetaTag = (name: string, content: string) => {
            let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement
            if (!meta) {
                meta = document.createElement('meta')
                meta.name = name
                document.head.appendChild(meta)
            }
            meta.content = content
        }

        const updatePropertyTag = (property: string, content: string) => {
            let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement
            if (!meta) {
                meta = document.createElement('meta')
                meta.setAttribute('property', property)
                document.head.appendChild(meta)
            }
            meta.content = content
        }

        // Update canonical link
        if (canonical) {
            let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
            if (!link) {
                link = document.createElement('link')
                link.rel = 'canonical'
                document.head.appendChild(link)
            }
            link.href = canonical
        }

        // Update meta description
        if (description) {
            updateMetaTag('description', description)
            updatePropertyTag('og:description', description)
        }

        // Update Open Graph tags
        if (title) {
            updatePropertyTag('og:title', title)
            updatePropertyTag('twitter:title', title)
        }

        if (image) {
            updatePropertyTag('og:image', image)
            updatePropertyTag('twitter:image', image)
        }

        updatePropertyTag('og:type', type)
        updatePropertyTag('og:url', canonical || window.location.href)
        updatePropertyTag('twitter:card', 'summary_large_image')

        // Cleanup function
        return () => {
            // Reset title to default if needed
            document.title = 'Rimigo | Vacations made'
        }
    }, [title, description, canonical, image, type])

    return null // This component doesn't render anything
}
