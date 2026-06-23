import { GA_MEASUREMENT_ID } from '@/constants/googleAnalytics'

declare global {
    interface Window {
        gtag?: (...args: any[]) => void
    }
}

export interface GAEventParams {
    event_category?: string
    event_label?: string | null
    event_callback?: () => void
    event_timeout?: number
    [key: string]: any
}

/**
 * Custom hook for Google Analytics tracking
 * Provides a reusable interface for tracking events via gtag
 */
export const useGoogleAnalytics = () => {
    /**
     * Track a Google Analytics event
     * @param eventName - The name of the event (e.g., 'book_tour_click')
     * @param params - Event parameters including category, label, callback, etc.
     */
    const trackGoogleEvent = (eventName: string, params?: GAEventParams) => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', eventName, params || {})
        }
    }

    /**
     * Track a page view
     * @param pagePath - The path of the page
     * @param pageTitle - Optional page title
     */
    const trackPageView = (pagePath: string, pageTitle?: string) => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('config', GA_MEASUREMENT_ID, {
                page_path: pagePath,
                page_title: pageTitle
            })
        }
    }

    return {
        trackGoogleEvent,
        trackPageView
    }
}

