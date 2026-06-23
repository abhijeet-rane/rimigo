/**
 * Public Hotel Details Page — SEO-optimized public wrapper around `HotelDetailPage`.
 *
 * URL: `/hotel/:slug` (e.g. `/hotel/hilton-osaka-osaka`).
 *
 * Responsibilities:
 *  1. Resolve slug → accommodation + initial `/stays/` payload via `getHotelDetailsForSlug`.
 *     Doing both upfront means the user sees ONE loader, not two (slug → then /stays/).
 *  2. Seed `useSearchParams` with the fields `HotelDetailPage` expects
 *     (`hotel_name`, `zentrum_hub_id`, `city_id`, `city_name`, `check_in`,
 *     `check_out`, `travel_purpose`, `group_type`, `review_type`, plus explicit
 *     guest/room defaults so the pricing sidebar shows 2 adults / 1 room).
 *  3. Emit full SEO head (title, OG, Twitter, Hotel JSON-LD) via `Helmet`.
 *  4. Only THEN mount `HotelDetailPage` with `hotelIdOverride={zentrum_hub_id}` —
 *     at which point its own `/stays/` call returns instantly from the backend
 *     cache (or near-instantly) because we just primed it.
 *
 * Mirrors `ExperiencePublicPage`'s pattern so crawlers (Google, WhatsApp,
 * ChatGPT, Claude) see rich structured data during SSR.
 */
import { useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import HotelDetailPage from '@/pages/Stays/HotelDetail/HotelDetailPage'
import LogoLoadingScreen from '@/components/shared/LogoLoadingScreen'
import { OnboardingGuideProvider } from '@/modules/UserGuideModal/context/OnboardingGuideProvider'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { getHotelDetailsForSlug, type AccommodationPublicData } from '../api/hotelApi'

const HOTEL_FALLBACK_IMAGE = 'https://rimigo-tripboard.s3.ap-south-1.amazonaws.com/logos/favicon-gradient.png'

/** +30 days default check-in, 1 night. Matches what OTAs default to on hotel landing pages. */
const defaultDates = () => {
    const checkIn = new Date()
    checkIn.setDate(checkIn.getDate() + 30)
    const checkOut = new Date(checkIn)
    checkOut.setDate(checkOut.getDate() + 1)
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    return { checkIn: fmt(checkIn), checkOut: fmt(checkOut) }
}

/** Compose the searchParams block `HotelDetailPage` reads from. */
const buildSearchParams = (acc: AccommodationPublicData): Record<string, string> => {
    const cityId = acc.base_city_info?.id
        ?? (typeof acc.base_city === 'string' ? acc.base_city : acc.base_city?.id)
        ?? ''
    const cityName = acc.base_city_info?.name
        ?? (typeof acc.base_city === 'object' ? acc.base_city?.name ?? '' : '')
    const { checkIn, checkOut } = defaultDates()
    return {
        hotel_name: acc.name ?? '',
        zentrum_hub_id: acc.zentrum_hub_id ?? '',
        accommodation_id: acc.id ?? '',
        city_id: cityId,
        city_name: cityName,
        check_in: checkIn,
        check_out: checkOut,
        travel_purpose: 'leisure_relaxation',
        group_type: 'couple',
        review_type: 'complete',
        city_prefs: '',
        // Explicit guest/room defaults so PricingSidebar and friends render
        // "2 adults, 1 room" rather than the ambiguous fallback they derive
        // from missing params.
        adults: '2',
        children: '0',
        infants: '0',
        rooms: '1'
    }
}

const HotelPublicPage = () => {
    const { slug } = useParams<{ slug: string }>()
    const [searchParams, setSearchParams] = useSearchParams()
    const { isAuthenticated } = useAuth()

    // Composite query: slug → accommodation detail → `/stays/` prime-call.
    // `getHotelDetailsForSlug` handles both requests internally, so React sees
    // ONE loading window. The nested `/stays/` POST warms the backend cache,
    // which makes HotelDetailPage's own duplicate call feel instant on mount.
    const { data, isLoading, error } = useQuery({
        queryKey: ['publicHotel', slug],
        queryFn: () => {
            if (!slug) throw new Error('Slug is required')
            return getHotelDetailsForSlug(slug)
        },
        enabled: !!slug,
        staleTime: 1000 * 60 * 60
    })

    const accommodation = data?.accommodation

    // Seed URL search params so `HotelDetailPage` picks them up via `useSearchParams`.
    // Writes only missing keys so we don't clobber anything the user already has
    // in the URL (e.g. a custom check-in date they arrived with).
    useEffect(() => {
        if (!accommodation) return
        const defaults = buildSearchParams(accommodation)
        const next = new URLSearchParams(searchParams)
        let changed = false
        for (const [key, value] of Object.entries(defaults)) {
            if (!value) continue
            if (!next.get(key)) {
                next.set(key, value)
                changed = true
            }
        }
        if (changed) {
            setSearchParams(next, { replace: true })
        }
    }, [accommodation, searchParams, setSearchParams])

    // Required params HotelDetailPage depends on for its /stays/ POST. We must
    // defer mounting it until these land in the URL; otherwise the first render
    // fires a request with empty body that either 400s or returns garbage.
    const hasRequiredSearchParams =
        !!searchParams.get('hotel_name')
        && !!searchParams.get('zentrum_hub_id')
        && !!searchParams.get('check_in')
        && !!searchParams.get('check_out')

    // ── SEO meta-tag data ────────────────────────────────────────────────
    const metaBundle = useMemo(() => {
        if (!accommodation) return null
        const cityName = accommodation.base_city_info?.name
            ?? (typeof accommodation.base_city === 'object' ? accommodation.base_city?.name ?? '' : '')
        const hotelUrl = `https://rimigo.com/hotel/${slug}`
        const heroImage = accommodation.media?.photos?.[0]?.url || HOTEL_FALLBACK_IMAGE
        const description = (accommodation.description
            || `Discover ${accommodation.name} — photos, reviews, and price comparisons on Rimigo.`
        ).slice(0, 300)
        const structuredData: Record<string, unknown> = {
            '@context': 'https://schema.org',
            '@type': 'Hotel',
            name: accommodation.name,
            description,
            url: hotelUrl,
            image: heroImage,
            address: {
                '@type': 'PostalAddress',
                addressLocality: cityName,
                streetAddress: accommodation.location?.address || undefined
            }
        }
        if (accommodation.location?.lat && accommodation.location?.long) {
            structuredData.geo = {
                '@type': 'GeoCoordinates',
                latitude: accommodation.location.lat,
                longitude: accommodation.location.long
            }
        }
        return {
            title: `${accommodation.name} | Rimigo`,
            description,
            heroImage,
            hotelUrl,
            cityName,
            structuredData
        }
    }, [accommodation, slug])

    // Show exactly ONE loader: while either the data is still loading OR the
    // URL hasn't been seeded yet. Once both are true, HotelDetailPage mounts
    // and hits the just-warmed cache on its own `/stays/` call — feels instant.
    const isReady = !!accommodation && hasRequiredSearchParams

    if (isLoading || (!error && !isReady)) {
        // LogoLoadingScreen is `w-full h-full` — without a sized parent it
        // collapses to the top-left. Wrap in a full-viewport flex box so the
        // loader sits dead-centre on desktop and mobile.
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-white">
                <LogoLoadingScreen />
            </div>
        )
    }

    if (error || !accommodation) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white pt-20">
                <div className="text-center px-4">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Hotel Not Found</h1>
                    <p className="text-gray-600 mb-6">
                        The hotel you're looking for doesn't exist or has been removed.
                    </p>
                    <a
                        href="/"
                        className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                        Go to Homepage
                    </a>
                </div>
            </div>
        )
    }

    return (
        <OnboardingGuideProvider isLoggedIn={isAuthenticated}>
            {metaBundle && (
                <Helmet>
                    <title>{metaBundle.title}</title>
                    <meta name="title" content={metaBundle.title} />
                    <meta name="description" content={metaBundle.description} />
                    <link rel="canonical" href={metaBundle.hotelUrl} />

                    {/* OpenGraph — WhatsApp / Facebook / LinkedIn */}
                    <meta property="og:type" content="website" />
                    <meta property="og:url" content={metaBundle.hotelUrl} />
                    <meta property="og:title" content={metaBundle.title} />
                    <meta property="og:description" content={metaBundle.description} />
                    <meta property="og:image" content={metaBundle.heroImage} />
                    <meta property="og:image:alt" content={accommodation.name} />
                    <meta property="og:site_name" content="Rimigo" />

                    {/* Twitter / X */}
                    <meta property="twitter:card" content="summary_large_image" />
                    <meta property="twitter:url" content={metaBundle.hotelUrl} />
                    <meta property="twitter:title" content={metaBundle.title} />
                    <meta property="twitter:description" content={metaBundle.description} />
                    <meta property="twitter:image" content={metaBundle.heroImage} />

                    <meta name="robots" content="index, follow" />
                    <meta name="googlebot" content="index, follow" />
                    <meta
                        name="keywords"
                        content={`${accommodation.name}, ${metaBundle.cityName}, hotel, booking, stays, travel`}
                    />

                    {/* JSON-LD — Google Rich Results */}
                    <script type="application/ld+json">
                        {JSON.stringify(metaBundle.structuredData)}
                    </script>
                </Helmet>
            )}

            {/* Delegate to HotelDetailPage. Params are seeded above, /stays/ is
                already warm in the backend cache from the composite fetch, so
                HotelDetailPage's own loader should barely flash. */}
            <HotelDetailPage hotelIdOverride={accommodation.zentrum_hub_id} />
        </OnboardingGuideProvider>
    )
}

export default HotelPublicPage
