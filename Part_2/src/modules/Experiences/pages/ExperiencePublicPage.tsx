import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getExperienceDetailsBySlug } from '../api/experienceApi'
import { ExperienceDetailsType } from '../types/experienceDetailTypes'
import { adaptExperienceDetailsToUI } from '../adapters'
import ExperienceDetailsSection from '../components/ExperienceDetails/ExperienceDetailsSection'
import { Helmet } from 'react-helmet-async'
import BaseLayoutWeb from '@/pages/Home/BaseLayoutWeb'
import { useAuth } from '@/lib/auth/providers/AuthProviders'

/**
 * Public Experience Details Page - SEO Optimized
 *
 * This page is designed to be crawlable and indexable by search engines.
 * URL format: /experience/:slug (e.g., /experience/burj-khalifa)
 *
 * Features:
 * - Public access (no authentication required)
 * - Slug-based URLs for better SEO
 * - Rich meta tags for social sharing
 * - Structured data (JSON-LD) for search engines
 * - Server-side rendering ready
 * - Smart content display: Shows full content to logged-in users, locked sections to guests
 */
const ExperiencePublicPage = () => {
    const { slug } = useParams<{ slug: string }>()
    const { isAuthenticated } = useAuth()

    // Use default values for public access - showing couple experience by default
    const defaultGroupType = 'couple' // Using 'couple' (singular) as default
    const defaultTravelPurpose = 'leisure_relaxation'
    const defaultPreferences = ['cultural']
    const defaultTripMonth = new Date().getMonth() + 1

    // Fetch experience details using slug/identifier with default personalization values
    const {
        data: experienceDetails,
        isLoading,
        error
    } = useQuery({
        queryKey: ['publicExperience', slug],
        queryFn: () => {
            if (!slug) throw new Error('Slug is required')

            return getExperienceDetailsBySlug(slug, defaultGroupType, defaultTravelPurpose, defaultPreferences, defaultTripMonth)
        },
        enabled: !!slug,
        staleTime: 1000 * 60 * 60 // Cache for 1 hour for public pages
    })

    // Loading state
    if (isLoading) {
        return (
            <BaseLayoutWeb>
                <div className="flex items-center justify-center min-h-screen bg-white pt-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading experience details...</p>
                    </div>
                </div>
            </BaseLayoutWeb>
        )
    }

    // Error state
    if (error || !experienceDetails) {
        return (
            <BaseLayoutWeb>
                <div className="flex items-center justify-center min-h-screen bg-white pt-20">
                    <div className="text-center px-4">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Experience Not Found</h1>
                        <p className="text-gray-600 mb-6">The experience you're looking for doesn't exist or has been removed.</p>
                        <a
                            href="/"
                            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                            Go to Homepage
                        </a>
                    </div>
                </div>
            </BaseLayoutWeb>
        )
    }

    // Adapt the data for UI
    const adaptedExperienceDetails = adaptExperienceDetailsToUI(experienceDetails.data.experience as ExperienceDetailsType)
    const floatingQuestionsCacheKey = experienceDetails.data.floating_questions_cache_key ?? null

    // Extract data for meta tags and structured data
    const experienceName = adaptedExperienceDetails.name
    const experienceDescription =
        adaptedExperienceDetails.display_props?.description ||
        `Discover ${experienceName} - An amazing experience in ${adaptedExperienceDetails.location?.city?.name || 'the destination'}.`
    const experienceImage = adaptedExperienceDetails.display_props?.landscape_image || adaptedExperienceDetails.display_props?.portrait_image || ''
    const experienceUrl = `https://rimigo.com/experience/${slug}`
    const cityName = adaptedExperienceDetails.location?.city?.name || ''
    const countryName = adaptedExperienceDetails.location?.country?.name || ''
    const priceRange =
        adaptedExperienceDetails.price?.lower_bound && adaptedExperienceDetails.price?.upper_bound
            ? `${adaptedExperienceDetails.price.currency} ${adaptedExperienceDetails.price.lower_bound} - ${adaptedExperienceDetails.price.upper_bound}`
            : ''

    // Create structured data for Google (JSON-LD)
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'TouristAttraction',
        name: experienceName,
        description: experienceDescription,
        image: experienceImage,
        url: experienceUrl,
        address: {
            '@type': 'PostalAddress',
            addressLocality: cityName,
            addressCountry: countryName
        },
        offers: priceRange
            ? {
                  '@type': 'AggregateOffer',
                  priceCurrency: adaptedExperienceDetails.price?.currency,
                  lowPrice: adaptedExperienceDetails.price?.lower_bound,
                  highPrice: adaptedExperienceDetails.price?.upper_bound
              }
            : undefined
    }

    return (
        <BaseLayoutWeb>
            {/* SEO Meta Tags */}
            <Helmet>
                {/* Primary Meta Tags */}
                <title>{`${experienceName} | Rimigo`}</title>
                <meta
                    name="title"
                    content={`${experienceName} | Rimigo`}
                />
                <meta
                    name="description"
                    content={experienceDescription}
                />
                <link
                    rel="canonical"
                    href={experienceUrl}
                />

                {/* Open Graph / Facebook */}
                <meta
                    property="og:type"
                    content="website"
                />
                <meta
                    property="og:url"
                    content={experienceUrl}
                />
                <meta
                    property="og:title"
                    content={`${experienceName} | Rimigo`}
                />
                <meta
                    property="og:description"
                    content={experienceDescription}
                />
                <meta
                    property="og:image"
                    content={experienceImage || 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/logos/favicon-gradient.png'}
                />
                <meta
                    property="og:image:width"
                    content="1200"
                />
                <meta
                    property="og:image:height"
                    content="630"
                />
                <meta
                    property="og:image:alt"
                    content={experienceName}
                />
                <meta
                    property="og:image:type"
                    content="image/jpeg"
                />
                <meta
                    property="og:site_name"
                    content="Rimigo"
                />

                {/* Twitter */}
                <meta
                    property="twitter:card"
                    content="summary_large_image"
                />
                <meta
                    property="twitter:url"
                    content={experienceUrl}
                />
                <meta
                    property="twitter:title"
                    content={`${experienceName} | Rimigo`}
                />
                <meta
                    property="twitter:description"
                    content={experienceDescription}
                />
                <meta
                    property="twitter:image"
                    content={experienceImage || 'https://rimigowebsitecontent.s3.ap-south-1.amazonaws.com/Rimigo_R_logo.svg'}
                />
                <meta
                    property="twitter:image:alt"
                    content={experienceName}
                />

                {/* Additional SEO */}
                <meta
                    name="robots"
                    content="index, follow"
                />
                <meta
                    name="googlebot"
                    content="index, follow"
                />
                <meta
                    name="keywords"
                    content={`${experienceName}, ${cityName}, ${countryName}, travel, tourism, activities, things to do`}
                />

                {/* Structured Data (JSON-LD) */}
                <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
            </Helmet>

            {/* Experience Content */}
            <div className="min-h-screen bg-white">
                {/* Add padding-top to account for fixed navbar */}
                <div className="pt-32 md:pt-36 px-4 md:px-6">
                    <div className="max-w-[1400px] mx-auto">
                        <ExperienceDetailsSection
                            experienceDetails={adaptedExperienceDetails}
                            summaryData={null}
                            isSummaryLoading={false}
                            selectedMonth={null}
                            recommendedMode={adaptedExperienceDetails.recommended_mode}
                            tripId={undefined}
                            floatingQuestionsCacheKey={floatingQuestionsCacheKey}
                            isPublicView={!isAuthenticated}
                            defaultGroupType={defaultGroupType}
                        />
                    </div>
                </div>
            </div>
        </BaseLayoutWeb>
    )
}

export default ExperiencePublicPage
