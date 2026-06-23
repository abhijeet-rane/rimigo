import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import posthog from 'posthog-js'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { useOptionalTravelerTrips, TripEvents } from '@/pages/Landing/context/travelerTripsContext'
import { getButtonEventName } from '../types/ButtonName'
import { useCreatorAttribution } from './creatorAttributionHooks'

interface PostHogContextType {
    initialized: boolean
}

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST
const isProduction = import.meta.env.VITE_ENV === 'production'
const PostHogContext = createContext<PostHogContextType | null>(null)

export const PostHogProvider = ({ children }: { children: any }) => {
    const travelerTrips = useOptionalTravelerTrips()
    const [initialized, setInitialized] = useState(false)
    const [userRegistered, setUserRegistered] = useState(false)

    useEffect(() => {
        const initPostHog = async () => {
            // Standalone Itinerary-Skeleton build: no analytics backend. Skip the
            // real posthog.init (which would open a network connection) when no
            // project key is configured, but mark the provider initialized so
            // `usePostHog` consumers keep working as no-ops.
            if (!POSTHOG_KEY) {
                setInitialized(true)
                return
            }

            const userInfo = await TokenStorage.getUserInfo()

            posthog.init(POSTHOG_KEY, {
                api_host: POSTHOG_HOST,
                person_profiles: 'identified_only',
                bootstrap: userInfo
                    ? {
                          distinctID: userInfo.traveler_id,
                          isIdentifiedID: true
                      }
                    : undefined,
                autocapture: isProduction,
                capture_pageview: isProduction,
                capture_pageleave: isProduction,
                disable_session_recording: !isProduction,
                session_recording: {
                    maskAllInputs: false,
                    maskInputOptions: {
                        password: true
                    },
                    maskInputFn: (value: string, el?: HTMLElement) => {
                        if (!el) return value

                        const type = el.getAttribute('type')
                        const id = el.getAttribute('id')
                        const name = el.getAttribute('name')

                        if (el.hasAttribute('data-otp') || id === 'otp' || name === 'otp' || type === 'otp') {
                            return '*'.repeat(value.length)
                        }

                        if (type === 'password') {
                            return '*'.repeat(value.length)
                        }

                        return value
                    }
                }
            })

            // Handle user identification and opt-in/out
            if (userInfo) {
                const email = userInfo?.email?.toLowerCase() ?? ''
                const isInternal = email.includes('rimigo.com')

                if (!isProduction || isInternal) {
                    posthog.opt_out_capturing()
                } else {
                    posthog.opt_in_capturing()
                    posthog.identify(userInfo.traveler_id, userInfo)
                }
                setUserRegistered(true)
            }

            setInitialized(true)
        }

        initPostHog()
    }, [])

    // Load user info and active trip once
    useEffect(() => {
        if (!initialized || !userRegistered) return

        const activeTrip = travelerTrips?.activeTrip

        const activeTripPayload = activeTrip
            ? {
                  trip_id: activeTrip.trip_id,
                  name: activeTrip.tripProfile?.trip_name ?? activeTrip.name ?? null,
                  role: activeTrip.role ?? null,
                  preferred_travel_time: activeTrip.preferred_travel_time ?? null,
                  final_destination_cities: activeTrip.final_destination_cities ?? [],
                  final_destination_countries: activeTrip.final_destination_countries ?? [],
                  itinerary: activeTrip.tripItinerary ?? null,
                  trip_preference: activeTrip.trip_preference ?? null
              }
            : null

        posthog.register({ active_trip: activeTripPayload })
    }, [initialized, userRegistered, travelerTrips?.activeTrip])

    const getQueryParams = () => {
        const params = new URLSearchParams(window.location.search)
        const result: Record<string, any> = {}

        params.forEach((value, key) => {
            // Convert comma lists into arrays (like city_prefs=a,b,c)
            result[key] = value.includes(',') ? value.split(',') : value
        })

        return result
    }

    // Update active trip dynamically
    useEffect(() => {
        const unsubscribe = TripEvents.subscribe((activeTrip) => {
            const activeTripPayload = activeTrip
                ? {
                      trip_id: activeTrip.trip_id,
                      name: activeTrip.tripProfile?.trip_name ?? activeTrip.name ?? null,
                      role: activeTrip.role ?? null,
                      preferred_travel_time: activeTrip.preferred_travel_time ?? null,
                      final_destination_cities: activeTrip.final_destination_cities ?? [],
                      final_destination_countries: activeTrip.final_destination_countries ?? [],
                      itinerary: activeTrip.tripItinerary ?? null,
                      trip_preference: activeTrip.trip_preference ?? null
                  }
                : null

            posthog.register({ active_trip: activeTripPayload })
        })

        return () => {
            try {
                unsubscribe()
            } catch {}
        }
    }, [])
    // === Auto Track Page Opened for Every Navigation (Works for ALL Routers) ===
    useEffect(() => {
        if (!initialized) return

        let lastUrl = window.location.pathname + window.location.search

        const getPageName = () => {
            const path = window.location.pathname.split('/').filter(Boolean)

            if (path.length === 0) return 'Home'

            const main = path[0] // stays, trips, experience, etc
            const isDetail = path.length > 1 // e.g. stays/:id → detail page

            const baseName = main.charAt(0).toUpperCase() + main.slice(1)

            return isDetail ? `${baseName} Detail` : baseName
        }

        const sendPageOpenedEvent = () => {
            const pageName = getPageName()

            trackEvent(`${pageName} Page Opened`, {
                page_name: pageName
            })
        }

        // Detect full SPA navigation using URL watcher
        const observer = new MutationObserver(() => {
            const currentUrl = window.location.pathname + window.location.search
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl
                sendPageOpenedEvent()
            }
        })

        observer.observe(document, { subtree: true, childList: true })

        // Patch pushState + replaceState (for frameworks that use it)
        // Patch pushState + replaceState safely
        const wrap = (method: History['pushState'] | History['replaceState']) =>
            function (this: History, ...args: Parameters<typeof method>) {
                const result = method.apply(this, args)
                const currentUrl = window.location.pathname + window.location.search
                if (currentUrl !== lastUrl) {
                    lastUrl = currentUrl
                    sendPageOpenedEvent()
                }
                return result
            }

        history.pushState = wrap(history.pushState)
        history.replaceState = wrap(history.replaceState)

        sendPageOpenedEvent()

        return () => observer.disconnect()
    }, [initialized])

    const trackEvent = (name: string, props: Record<string, any> = {}) => {
        if (!initialized) {
            return
        }

        const userInfo = posthog.get_property('user_info') as { email?: string } | undefined

        // Block rimigo internal users
        if (userInfo?.email?.includes('rimigo.com')) {
            return
        }

        const queryParams = getQueryParams()

        // NOTE: this internal trackEvent is used only by the auto-pageview tracker mounted
        // here at the root. Creator attribution is injected by the `usePostHog` hook below
        // (which closes over CreatorAttributionContext); it is intentionally NOT applied
        // here because the auto-pageview tracker fires above any creator-attributed page.
        const eventPayload = {
            ...props,
            isAuthenticated: !!userInfo,
            current_url: window.location.pathname + window.location.search,
            url_query: queryParams
        }

        if (!isProduction) {
            return
        }

        posthog.capture(name, eventPayload)
    }

    return <PostHogContext.Provider value={{ initialized }}>{children}</PostHogContext.Provider>
}

export const usePostHog = () => {
    const context = useContext(PostHogContext)
    if (!context) throw new Error('usePostHog must be used inside PostHogProvider')

    const { initialized } = context
    const creatorAttribution = useCreatorAttribution()

    // Build trackEvent inside the hook so it closes over the caller's CreatorAttribution
    // context — events fire only with the creator scope visible at the call site, not a
    // module-level snapshot. Per-event props (e.g. a card-level override) always win.
    const trackEvent = useCallback(
        (name: string, props: Record<string, any> = {}) => {
            if (!initialized) return

            const userInfo = posthog.get_property('user_info') as { email?: string } | undefined
            if (userInfo?.email?.includes('rimigo.com')) return

            const params = new URLSearchParams(window.location.search)
            const queryParams: Record<string, any> = {}
            params.forEach((v, k) => {
                queryParams[k] = v.includes(',') ? v.split(',') : v
            })

            const creatorOverrides: Record<string, string> = {}
            if (creatorAttribution) {
                if (!props.creator_handle && typeof creatorAttribution.creator_handle === 'string' && creatorAttribution.creator_handle) {
                    creatorOverrides.creator_handle = creatorAttribution.creator_handle
                }
                if (!props.creator_id && typeof creatorAttribution.creator_id === 'string' && creatorAttribution.creator_id) {
                    creatorOverrides.creator_id = creatorAttribution.creator_id
                }
            }

            const eventPayload = {
                ...props,
                ...creatorOverrides,
                isAuthenticated: !!userInfo,
                current_url: window.location.pathname + window.location.search,
                url_query: queryParams
            }

            if (!isProduction) return

            posthog.capture(name, eventPayload)
        },
        [initialized, creatorAttribution]
    )

    const trackPageView = useCallback(
        ({ page_name, extra }: { page_name: string; extra?: Record<string, any> }) =>
            trackEvent(`Page Viewed: ${capitalize(page_name)}`, { page_name, ...extra }),
        [trackEvent]
    )

    const trackPageClose = useCallback(
        ({ page_name, extra }: { page_name: string; extra?: Record<string, any> }) =>
            trackEvent(`Page Closed: ${capitalize(page_name)}`, { page_name, ...extra }),
        [trackEvent]
    )

    const trackButtonClick = useCallback(
        ({ button_name, location, extra }: { button_name: string; location?: string; extra?: Record<string, any> }) =>
            trackEvent(`Button Clicked: ${capitalize(button_name)}`, { button_name, location: location ?? null, ...extra }),
        [trackEvent]
    )
    const trackButtonClickCustom = useCallback(
        ({
            buttonPage,
            buttonName,
            buttonAction,
            location,
            extra
        }: {
            buttonPage: string
            buttonName: string
            buttonAction: string
            location?: string
            extra?: Record<string, any>
        }) => {
            const eventName = getButtonEventName({ buttonPage, buttonName, buttonAction })
            trackEvent(eventName, { button_name: eventName, location: location ?? null, ...extra })
        },
        [trackEvent]
    )

    const refreshUserInfo = async () => {
        const userInfo = await TokenStorage.getUserInfo()

        if (!userInfo) return

        const email = userInfo?.email?.toLowerCase() ?? ''
        const isInternal = email.includes('rimigo.com')

        if (!isProduction || isInternal) {
            posthog.opt_out_capturing()
            return
        }

        posthog.opt_in_capturing()
        posthog.identify(userInfo.traveler_id, userInfo)
        posthog.register({ user_info: userInfo })
    }

    return { trackEvent, trackPageView, trackPageClose, trackButtonClick, refreshUserInfo, trackButtonClickCustom }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
