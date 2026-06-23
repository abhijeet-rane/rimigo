import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'

interface TripboardExploreMoreCardProps {
    variant: 'stays' | 'activities'
    subtitle: string
    to: string
    /** When true (default), opens explore in a new browser tab */
    openInNewTab?: boolean
    buttonPage?: string
    /** Merged into PostHog `extra` (e.g. surface, collection id, city) */
    trackingExtra?: Record<string, unknown>
}

const TripboardExploreMoreCard: React.FC<TripboardExploreMoreCardProps> = ({
    variant,
    subtitle,
    to,
    openInNewTab = true,
    buttonPage = TRIPBOARD_V1_BUTTON_PAGE,
    trackingExtra
}) => {
    const { trackButtonClickCustom } = usePostHog()
    const buttonLabel = variant === 'stays' ? 'Browse Stays' : 'Browse Activities'
    const destinationPath = to.split('?')[0] || to

    return (
        <div className="mt-8 mb-4 flex w-full flex-col items-center justify-center rounded-[28px] bg-grey-5 px-6 py-10 text-center">
            <h3 className="font-red-hat-display text-[18px] font-bold text-grey-0 md:text-xl">Want to explore more?</h3>
            <p className="mt-2 max-w-md font-manrope text-[15px] font-medium text-grey-1 md:text-[15px]">{subtitle}</p>
            <Link
                to={to}
                target={openInNewTab ? '_blank' : undefined}
                rel={openInNewTab ? 'noopener noreferrer' : undefined}
                onClick={() => {
                    trackButtonClickCustom({
                        buttonPage,
                        buttonName: variant === 'stays' ? 'collection_explore_more_stays' : 'collection_explore_more_activities',
                        buttonAction: 'click',
                        extra: {
                            explore_variant: variant,
                            open_in_new_tab: openInNewTab,
                            destination: to,
                            destination_path: destinationPath,
                            subtitle_preview: subtitle,
                            ...trackingExtra
                        }
                    })
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-default to-primary-dark px-6 py-3 font-red-hat-display text-[15px] font-semibold text-white shadow-sm transition-all hover:shadow-md">
                {buttonLabel}
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
        </div>
    )
}

export default TripboardExploreMoreCard
