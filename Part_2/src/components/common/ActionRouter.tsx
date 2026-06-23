import { useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useNavigationActionStore } from '@/stores/navigationActionStore'
import type {
    NavigationAction,
    ScrollTarget,
    HighlightAction,
} from '@/modules/Itinerary/components/chat/types'

/** Maps target_page values to route path builders */
const PAGE_ROUTE_MAP: Record<
    string,
    (params?: Record<string, string>) => string
> = {
    itinerary: (params) =>
        params?.itinerary_id
            ? `/itinerary/${params.itinerary_id}`
            : '/tripboard?tab=itinerary',
    hotel_detail: (params) =>
        params?.hotel_id ? `/stays/${params.hotel_id}` : '/stays',
    experience_detail: (params) =>
        params?.experience_id
            ? `/experiences/${params.experience_id}`
            : '/experiences',
    stays_search: () => '/stays',
    experiences_search: () => '/experiences',
    flights: () => '/flights',
}

function scrollToTarget(target: ScrollTarget) {
    requestAnimationFrame(() => {
        setTimeout(() => {
            let element: Element | null = null

            if (target.type === 'slot' && target.day_index !== undefined) {
                if (target.slot_index !== undefined) {
                    element = document.querySelector(
                        `[data-day-index="${target.day_index}"][data-slot-index="${target.slot_index}"]`
                    )
                }
                if (!element) {
                    element = document.querySelector(
                        `[data-day-index="${target.day_index}"]`
                    )
                }
            } else if (
                target.type === 'day' &&
                target.day_index !== undefined
            ) {
                element = document.querySelector(
                    `[data-day-index="${target.day_index}"]`
                )
            } else if (target.type === 'section' && target.section_id) {
                element = document.getElementById(target.section_id)
            }

            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        }, 500)
    })
}

function applyHighlight(
    highlight: HighlightAction,
    setActiveHighlight: (h: HighlightAction) => void,
    clearActiveHighlight: () => void
) {
    setActiveHighlight(highlight)

    for (const target of highlight.targets) {
        const el = document.querySelector(
            `[data-day-index="${target.day_index}"][data-slot-index="${target.slot_index}"]`
        )
        if (el) {
            el.classList.add(`nav-highlight-${highlight.type}`)
        }
    }

    setTimeout(() => {
        for (const target of highlight.targets) {
            const el = document.querySelector(
                `[data-day-index="${target.day_index}"][data-slot-index="${target.slot_index}"]`
            )
            if (el) {
                el.classList.remove(`nav-highlight-${highlight.type}`)
            }
        }
        clearActiveHighlight()
    }, highlight.duration_ms)
}

export function ActionRouter() {
    const navigate = useNavigate()
    const location = useLocation()
    const {
        pendingAction,
        clearPendingAction,
        setActiveHighlight,
        clearActiveHighlight,
    } = useNavigationActionStore()

    const executeAction = useCallback(
        (action: NavigationAction) => {
            const targetPage = action.target_page

            if (targetPage !== 'current') {
                const routeBuilder = PAGE_ROUTE_MAP[targetPage]
                if (routeBuilder) {
                    const path = routeBuilder(action.target_params)
                    if (location.pathname !== path) {
                        if (action.transition === 'replace') {
                            navigate(path, { replace: true })
                        } else {
                            navigate(path)
                        }
                    }
                }
            }

            if (action.scroll_to) {
                scrollToTarget(action.scroll_to)
            }

            if (action.highlight && action.highlight.type !== 'none') {
                const delay = targetPage !== 'current' ? 800 : 200
                setTimeout(() => {
                    applyHighlight(
                        action.highlight!,
                        setActiveHighlight,
                        clearActiveHighlight
                    )
                }, delay)
            }

            clearPendingAction()
        },
        [
            navigate,
            location.pathname,
            clearPendingAction,
            setActiveHighlight,
            clearActiveHighlight,
        ]
    )

    useEffect(() => {
        if (pendingAction) {
            executeAction(pendingAction)
        }
    }, [pendingAction, executeAction])

    return null
}

export default ActionRouter
