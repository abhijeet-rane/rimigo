import { useLocation, useNavigate } from 'react-router-dom'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'
import { useAuth } from '@/lib/auth/providers/AuthProviders'

interface UtmDefaults {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

export const useStartPlanningCTA = (
  location: string,
  utmDefaults: string | UtmDefaults = 'rimigo_website'
) => {
  const routerLocation = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { trackButtonClickCustom } = usePostHog()

  // Back-compat: callers passing a plain string set just utm_source.
  const defaults: UtmDefaults = typeof utmDefaults === 'string'
    ? { utm_source: utmDefaults }
    : utmDefaults

  const handleStartPlanningClick = async () => {
    const currentParams = new URLSearchParams(routerLocation.search)

    // Apply defaults for any UTM keys missing on the current URL —
    // explicit URL params always win.
    if (!currentParams.has('utm_source')) {
      currentParams.set('utm_source', defaults.utm_source || 'rimigo_website')
    }
    if (defaults.utm_medium && !currentParams.has('utm_medium')) {
      currentParams.set('utm_medium', defaults.utm_medium)
    }
    if (defaults.utm_campaign && !currentParams.has('utm_campaign')) {
      currentParams.set('utm_campaign', defaults.utm_campaign)
    }

    // Convert all params into tracking extra object
    const commonExtra: Record<string, string> = {}
    currentParams.forEach((value, key) => {
      commonExtra[key] = value
    })

    const queryString = currentParams.toString()

    // ✅ If authenticated → go to landing page
    if (isAuthenticated) {
      trackButtonClickCustom({
        buttonPage: 'home_page_v1',
        buttonName: 'home',
        buttonAction: 'cta_button_clicked',
        location,
        extra: commonExtra,
      })

      navigate(`${DEFAULT_LANDING_PAGE_ROUTE}?${queryString}`)
      return
    }

    // ✅ Not authenticated → track start planning
    trackButtonClickCustom({
      buttonPage: 'home_page_v1',
      buttonName: 'start_planning',
      buttonAction: 'cta_button_clicked',
      location,
      extra: commonExtra,
    })

    navigate(`${DEFAULT_LANDING_PAGE_ROUTE}?${currentParams.toString()}`)
  }

  return handleStartPlanningClick
}