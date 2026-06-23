import { useCallback } from 'react'
import ActivitiesByGroupTypeSection from '@/modules/Acitvities/sections/ActivitiesByGroupTypeSection'
import { triggerAssistantPrompt } from '@/pages/Stays/Components/assistantController'
import { STAR_PRIMARY_DEFAULT } from '@/constants/icons/svgFromCDN'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface BestThingsForLeisureSectionProps {
    cityId?: string | null
    countryId: string | null
    countryName: string | null
    urlCityIds: string[]
    onSneakPeekClick?: (e: React.MouseEvent, experienceId: string) => void
    /** When provided, overrides default card-click navigation. Tripboard
     *  Activities tab passes a handler that opens the SneakPeekModal inline. */
    onCardClick?: (experienceId: string) => void
    /** Override for SEE ALL — keeps the user on the Tripboard and renders
     *  the BestThingsAllView inline instead of navigating away. */
    onSeeAllClickOverride?: () => void
    /**
     * DOM id of the all-activities listing. The "See All" link scrolls to
     * this section per spec — the underlying child uses its own navigate
     * fallback when this isn't provided.
     */
    allActivitiesSectionId?: string
    /**
     * Show the "Help me choose" pill inside the section header (next to
     * SEE ALL). Opt-in because `ActivitiesByGroupTypeSection` (and this
     * wrapper) are reused on standalone activity pages where the pill
     * isn't appropriate. Tripboard Activities → Explore turns it on.
     */
    showHelpMeChoose?: boolean
    /** Forwarded to ActivitiesByGroupTypeSection. */
    onContentVisibilityChange?: (visible: boolean) => void
    /** Label override for the sneak peek button on Best Things cards. Defaults to "Sneak Peek". */
    sneakPeekButtonLabel?: string
}

/**
 * Spec section 3: Best things to do for preferred leisure.
 *
 * When `showHelpMeChoose` is on, a "Help me choose" pill is rendered
 * into the section header (left of SEE ALL). Tapping it dispatches a
 * prefilled prompt to the AI concierge via `triggerAssistantPrompt` —
 * the same handoff every other AI entry point in the app uses, so the
 * assistant opens and auto-submits without a separate modal.
 */
const BestThingsForLeisureSection: React.FC<BestThingsForLeisureSectionProps> = ({
    cityId,
    countryId,
    countryName,
    urlCityIds,
    onSneakPeekClick,
    onCardClick,
    onSeeAllClickOverride,
    showHelpMeChoose = false,
    onContentVisibilityChange,
    sneakPeekButtonLabel
}) => {
    const { trackButtonClickCustom } = usePostHog()
    const handleHelpMeChoose = useCallback(() => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_HELP_ME_CHOOSE_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { countryId, cityId, countryName }
        })
        const cityLabel = countryName?.trim() || 'this city'
        const prompt = `Help me choose the best activities to do in ${cityLabel} for my trip — shortlist a few that match my travel style and dates.`
        void triggerAssistantPrompt(prompt)
    }, [countryName, countryId, cityId, trackButtonClickCustom])

    // Same pill rendered into two slots so it can sit beside SEE ALL on
    // both viewports: in the header on desktop (hidden on mobile because
    // the header gets cramped at narrow widths), and in the mobile-only
    // footer row next to the bottom SEE ALL link on mobile.
    const helpMeChoosePill = (visibility: 'desktop' | 'mobile') => (
        <button
            type="button"
            onClick={handleHelpMeChoose}
            className={`${visibility === 'desktop' ? 'hidden md:flex' : 'flex md:hidden'} items-center gap-1.5 rounded-full bg-white text-primary-default text-[12px] font-semibold px-3 py-1.5 border border-primary-default hover:bg-primary-default-80 transition-colors shrink-0`}>
            <img
                src={STAR_PRIMARY_DEFAULT}
                alt=""
                className="w-3.5 h-3.5"
            />
            Help me choose
        </button>
    )

    return (
        <ActivitiesByGroupTypeSection
            cityId={cityId}
            countryId={countryId}
            countryName={countryName}
            urlCityIds={urlCityIds}
            onSneakPeekClick={onSneakPeekClick}
            onCardClick={onCardClick}
            onSeeAllClickOverride={onSeeAllClickOverride}
            headerTrailing={showHelpMeChoose ? helpMeChoosePill('desktop') : null}
            mobileFooterTrailing={showHelpMeChoose ? helpMeChoosePill('mobile') : null}
            onContentVisibilityChange={onContentVisibilityChange}
            sneakPeekButtonLabel={sneakPeekButtonLabel}
        />
    )
}

export default BestThingsForLeisureSection
