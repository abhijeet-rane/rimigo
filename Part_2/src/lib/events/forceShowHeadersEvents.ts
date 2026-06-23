export const FORCE_SHOW_HEADERS_EVENT = 'rimigo:force-show-headers'

/**
 * Tell every `useHideOnScrollDown` listener to snap back to the visible state.
 * Dispatched on tab switch so a freshly-opened tab (at scrollTop 0) never
 * inherits the previous tab's hidden-header state.
 */
export const dispatchForceShowHeaders = () => {
    if (typeof window === 'undefined') {
        return
    }

    window.dispatchEvent(new Event(FORCE_SHOW_HEADERS_EVENT))
}

export const addForceShowHeadersListener = (listener: () => void): (() => void) => {
    if (typeof window === 'undefined') {
        return () => {}
    }

    window.addEventListener(FORCE_SHOW_HEADERS_EVENT, listener)

    return () => {
        window.removeEventListener(FORCE_SHOW_HEADERS_EVENT, listener)
    }
}
