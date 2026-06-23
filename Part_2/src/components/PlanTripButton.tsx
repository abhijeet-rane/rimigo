import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { ShinyButton } from './magicui/shiny-button'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'

interface PlanTripButtonProps {
    text?: string
    href?: string
    target?: string
    buttonPage?: string
    buttonName?: string
    buttonAction?: string
    location?: string
    onClick?: () => void
    utmSource?: string 
}

export function PlanTripButton({
    onClick,
    text,
    href,
    target,
    buttonPage = 'home_page_v1',
    buttonName = 'start_your_trip',
    buttonAction = 'cta_button_clicked',
    location = 'hero_section',
}: PlanTripButtonProps) {
    const navigate = useNavigate()
    const { trackButtonClickCustom } = usePostHog()

    const handleClick = () => {
        trackButtonClickCustom({
            buttonPage,
            buttonName,
            buttonAction,
            location
        })

        if (onClick) {
            onClick()
            return
        }

        if (href) {
            // External or custom link
            window.open(href, target || '_blank')
        } else {
            // Default internal route
            navigate(`${DEFAULT_LANDING_PAGE_ROUTE}/?utm_source=rimigo_website`)
        }
    }

    return (
        <ShinyButton
            className="bg-primary-default text-natural-white rounded-sm"
            onClick={handleClick}>
            {text || 'Start Planning'}
        </ShinyButton>
    )
}

export default PlanTripButton
