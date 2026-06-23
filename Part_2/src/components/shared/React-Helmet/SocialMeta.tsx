import { Helmet } from 'react-helmet-async'

export interface SocialMetaProps {
    /** Page title. Also used as `og:title` / `twitter:title` when no override is given. */
    title: string
    /** Short description for `meta[name=description]`, `og:description`, `twitter:description`. */
    description?: string
    /** Absolute URL for the social preview image (og:image / twitter:image). */
    image?: string
    /** Canonical URL for this page. Defaults to `window.location.href` on the client. */
    url?: string
    /** og:type — usually "article" for content pages. Defaults to "article". */
    type?: 'article' | 'website'
}

/**
 * Emits OpenGraph + Twitter + basic SEO meta tags for a page.
 *
 * WhatsApp / Facebook / Twitter / LinkedIn all read these from the server-rendered
 * HTML, so pages that need rich share previews should render this AND be pre-fetched
 * in `entry-server.tsx` so the data is available during SSR.
 */
const SocialMeta: React.FC<SocialMetaProps> = ({
    title,
    description,
    image,
    url,
    type = 'article'
}) => {
    // On the client, fall back to the current URL so the share link matches the page
    // the viewer is on. During SSR `window` is undefined, so only emit `og:url` when
    // the caller passes an explicit value.
    const resolvedUrl = url ?? (typeof window !== 'undefined' ? window.location.href : undefined)

    return (
        <Helmet>
            <title>{title}</title>
            {description && <meta name="description" content={description} />}

            {/* OpenGraph — Facebook, WhatsApp, LinkedIn */}
            <meta property="og:title" content={title} />
            {description && <meta property="og:description" content={description} />}
            {image && <meta property="og:image" content={image} />}
            {resolvedUrl && <meta property="og:url" content={resolvedUrl} />}
            <meta property="og:type" content={type} />
            <meta property="og:site_name" content="Rimigo" />

            {/* Twitter / X */}
            <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
            <meta name="twitter:title" content={title} />
            {description && <meta name="twitter:description" content={description} />}
            {image && <meta name="twitter:image" content={image} />}
        </Helmet>
    )
}

export default SocialMeta
