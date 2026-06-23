/**
 * Server Entry Point for SSR
 *
 * This file renders the React app on the server for improved SEO.
 * It works with React Router v7 and handles URL-based rendering.
 *
 * Usage:
 * import { render } from './entry-server'
 * const { html, helmet } = await render(url)
 */

import ReactDOMServer from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'

export async function render(url: string) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
                retry: 0 // Don't retry failed queries during SSR
                // Keep queries enabled for SSR but with timeout
                // Individual components can disable if needed
            }
        }
    })

    const helmetContext = {}

    // Pre-fetch critical data for the route if it's an experience page
    const experienceSlugMatch = url.match(/^\/experience\/([^/?]+)/)
    console.log('[SSR] URL:', url, 'Match:', experienceSlugMatch)
    if (experienceSlugMatch) {
        const slug = experienceSlugMatch[1]
        console.log('[SSR] Pre-fetching experience data for:', slug)
        try {
            // Pre-fetch experience data for SEO using SSR-safe function
            const { getExperienceDetailsBySlugSSR } = await import('./modules/Experiences/api/experienceApi')
            console.log('[SSR] API function loaded, calling...')
            await queryClient.prefetchQuery({
                queryKey: ['publicExperience', slug],
                queryFn: () => {
                    const defaultGroupType = 'couple'
                    const defaultTravelPurpose = 'leisure_relaxation'
                    const defaultPreferences = ['cultural']
                    const defaultTripMonth = new Date().getMonth() + 1
                    return getExperienceDetailsBySlugSSR(slug, defaultGroupType, defaultTravelPurpose, defaultPreferences, defaultTripMonth)
                },
                staleTime: 60 * 1000
            })
            console.log('[SSR] ✅ Pre-fetch complete!')
        } catch (error) {
            console.error('[SSR] ❌ Failed to pre-fetch experience data:', error)
            console.error('Error details:', error)
            // Continue with rendering even if pre-fetch fails
        }
    }

    // Pre-fetch tripboard collection for shared `/tripboard/<tripId>` links so that
    // WhatsApp / Facebook / Twitter crawlers see the tripboard name + cover image in
    // the initial HTML. Without this, `<SocialMeta>` renders with undefined collection
    // data during SSR and the crawler gets the default Rimigo fallback tags.
    const tripboardMatch = url.match(/^\/tripboard\/([^/?]+)/)
    const isPreTripPath = tripboardMatch && (tripboardMatch[1] === 'new' || tripboardMatch[1] === 'create')
    if (tripboardMatch && !isPreTripPath) {
        const tripId = tripboardMatch[1]
        console.log('[SSR] Pre-fetching tripboard data for:', tripId)
        try {
            const { tripboardApi } = await import('./modules/Tripboard/api/tripboardApi')
            const { travelerCollectionApi } = await import('./modules/ContentCollection/api/travelerCollectionApi')

            // 1. Resolve identifier from tripId.
            const collectionListResponse = await tripboardApi.getCollectionByTripId(tripId)
            await queryClient.prefetchQuery({
                queryKey: ['tripboard-collection', tripId, undefined],
                queryFn: () => Promise.resolve(collectionListResponse),
                staleTime: 60 * 1000
            })

            const identifier = collectionListResponse?.data?.[0]?.identifier
            if (identifier) {
                // 2. Pre-fetch the experience-section detail (the page's metadata source).
                //    Matches the client queryKey in TripboardPage so the data is ready at render.
                await queryClient.prefetchQuery({
                    queryKey: ['traveler-collection', identifier, 'experience'],
                    queryFn: () => travelerCollectionApi.getByIdentifier(identifier, 'experience'),
                    staleTime: 60 * 1000
                })
            }
            console.log('[SSR] ✅ Tripboard pre-fetch complete!')
        } catch (error) {
            console.error('[SSR] ❌ Failed to pre-fetch tripboard data:', error)
            // Continue rendering even if pre-fetch fails — client will fetch and update tags.
        }
    }

    // Pre-fetch the public hotel page `/hotel/<slug>` so crawlers see the hotel name,
    // photos, and Hotel JSON-LD in the initial HTML (same reason as experience pages —
    // WhatsApp / Facebook / Twitter / Googlebot don't execute JS).
    const hotelSlugMatch = url.match(/^\/hotel\/([^/?]+)/)
    if (hotelSlugMatch) {
        const slug = hotelSlugMatch[1]
        console.log('[SSR] Pre-fetching hotel data for:', slug)
        try {
            const { getHotelDetailsForSlugSSR } = await import('./modules/Hotels/api/hotelApi')
            await queryClient.prefetchQuery({
                queryKey: ['publicHotel', slug],
                queryFn: () => getHotelDetailsForSlugSSR(slug),
                staleTime: 60 * 1000
            })
            console.log('[SSR] ✅ Hotel pre-fetch complete!')
        } catch (error) {
            console.error('[SSR] ❌ Failed to pre-fetch hotel data:', error)
            // Continue rendering — client will fetch and update meta tags.
        }
    }

    // Pre-fetch rimigo-collection detail for the same reason — social share preview.
    // URL shape: `/rimigo-collection/<country>/<identifier>`
    const rimigoCollectionMatch = url.match(/^\/rimigo-collection\/[^/?]+\/([^/?]+)/)
    if (rimigoCollectionMatch) {
        const identifier = rimigoCollectionMatch[1]
        console.log('[SSR] Pre-fetching rimigo-collection data for:', identifier)
        try {
            const { contentCollectionApi } = await import('./modules/ContentCollection/api/contentCollectionApi')
            await queryClient.prefetchQuery({
                queryKey: ['content-collection', identifier, 'experience'],
                queryFn: () => contentCollectionApi.getByIdentifier(identifier, 'experience'),
                staleTime: 60 * 1000
            })
            console.log('[SSR] ✅ Rimigo-collection pre-fetch complete!')
        } catch (error) {
            console.error('[SSR] ❌ Failed to pre-fetch rimigo-collection data:', error)
        }
    }

    if (!experienceSlugMatch && !tripboardMatch && !rimigoCollectionMatch && !hotelSlugMatch) {
        console.log('[SSR] No SEO pre-fetch for this route')
    }

    // Use MemoryRouter for SSR (compatible with React Router v7)
    // initialEntries sets the URL path for server-side rendering
    const html = ReactDOMServer.renderToString(
        <QueryClientProvider client={queryClient}>
            <HelmetProvider context={helmetContext}>
                <MemoryRouter initialEntries={[url]}>
                    <App />
                </MemoryRouter>
            </HelmetProvider>
        </QueryClientProvider>
    )

    // @ts-expect-error - helmet context types
    const { helmet } = helmetContext

    return {
        html,
        helmet: helmet
            ? {
                  htmlAttributes: helmet.htmlAttributes.toString(),
                  bodyAttributes: helmet.bodyAttributes.toString(),
                  title: helmet.title.toString(),
                  priority: helmet.priority.toString(),
                  meta: helmet.meta.toString(),
                  link: helmet.link.toString(),
                  script: helmet.script.toString()
              }
            : null
    }
}
