import React from 'react'
import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import CityCard from '../components/CityCard'
import { useCountryCities } from '../hooks/useCountryCities'
import { useQueryParams } from '@/hooks/useQueryParams'
import type { ActivitiesCityCardData } from '../adapters/activitiesCitiesAdapter'
import { toast } from 'sonner'
import CustomShimmer from '@/components/shared/Shimmer'
import { DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE } from '@/routes/routes'
import CarouselWithSeeAll from '@/modules/Experiences/components/CarouselWithSeeAll'
import { scrollIntoViewWithHeaderGuard } from '@/hooks/useHideOnScrollDown'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface TopCitiesSectionProps {
    countryId: string | null
    /** Override the "See All" click handler (default: scroll to all-cities-section) */
    onSeeAllClick?: () => void
    /** Override city card clicks (default: open the standalone city explore
     *  page in a new tab). The Tripboard Activities tab uses this to keep
     *  navigation inside the tab. */
    onCityClick?: (cityId: string, cityName?: string) => void
    /** Title style override — the Tripboard country overview passes its
     *  shared section-heading classes so this matches the other headings. */
    titleClassName?: string
    /** Extra classes for the FIRST city card only. The carousel container
     *  is intentionally unpadded (`pl-0!`); the wrapping GenericCard's
     *  default `px-5` supplies the 20px left inset on every breakpoint, so
     *  the heading and first card align with the other sections. Callers
     *  that need an EXTRA inset on the first card can pass a left margin
     *  here instead of padding the container. */
    firstCardClassName?: string
}

const TopCitiesSection: React.FC<TopCitiesSectionProps> = ({
    countryId,
    onSeeAllClick: onSeeAllClickProp,
    onCityClick,
    titleClassName,
    firstCardClassName
}) => {
    const { topCities, isLoading, isError, countryName, countryId: countryIdFromCountryCities } = useCountryCities({ countryId })
    const queryParams = useQueryParams()
    const { trackButtonClickCustom } = usePostHog()

    // Default "See All" → scroll down to the All Cities grid via the shared
    // header-guarded scroll so the mobile hide-on-scroll sub-header stays
    // visible throughout the programmatic scroll (otherwise it collapses and
    // gets stranded hidden with no user gesture to bring it back).
    const scrollToAllCitiesAndRestoreHeader = () => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_TOP_CITIES_SEE_ALL_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { country_id: countryId }
        })
        scrollIntoViewWithHeaderGuard(document.getElementById('all-cities-section'))
    }

    // Handle city card click
    const handleCityClick = (cityId: string, cityName?: string) => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_TOP_CITIES_CITY_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { country_id: countryId, city_id: cityId, city_name: cityName }
        })
        if (onCityClick) {
            onCityClick(cityId, cityName)
            return
        }
        // Preserve all existing query params
        const params = new URLSearchParams()
        Object.entries(queryParams).forEach(([key, value]) => {
            params.set(key, value)
        })

        // Add city_name to query params if available
        if (cityName) {
            params.set('city_name', cityName)
        }

        // Navigate to ${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/<city_id>/ with all query params
        // Construct full URL
        const url = `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/${cityId}/?country_id=${countryIdFromCountryCities}&country_name=${countryName}&${params.toString()}`

        // Open in new tab
        window.open(url, '_blank')
    }

    // Don't render if no data and not loading
    if (!isLoading && topCities.length === 0) {
        return null
    }

    if (isError) {
        toast.error('Error fetching top cities')
        return null
    }

    // GenericCard's default `px-5` (kept on ALL breakpoints — no `md:pl-0`)
    // provides the 20px left inset for the heading and the first carousel
    // card; the CarouselWithSeeAll container below is `pl-0!` so its own
    // default `sm:pl-6 lg:pl-4 pl-4` never double-pads on top of it.
    return (
        <GenericCard className="border-none pr-0">
            {isLoading && topCities.length === 0 ? (
                <div className="p-0">
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                        {[...Array(5)].map((_, i) => (
                            <CustomShimmer
                                key={i}
                                className="min-w-[280px] h-[420px]"
                                height={420}
                            />
                        ))}
                    </div>
                </div>
            ) : topCities.length > 0 ? (
                <CarouselWithSeeAll
                    title="Explore activites in top cities"
                    titleClassName={titleClassName ?? 'max-md:text-[20px] text-[25px]'}
                    containerClassName="md:mb-5 pl-0!"
                    gradientStartColor="#ffffff"
                    gradientEndColor="transparent"
                    rightGradientStyle="w-10 bg-gradient-to-l"
                    leftGradientStyle="w-10 bg-gradient-to-r"
                    onSeeAllClick={onSeeAllClickProp ?? scrollToAllCitiesAndRestoreHeader}
                >
                    {topCities.map((city: ActivitiesCityCardData, index) => (
                        <div
                            key={city.cityId}
                            className={`min-w-[280px] max-w-[280px] cursor-pointer ${index === 0 ? (firstCardClassName ?? '') : ''}`}>
                            <CityCard
                                cityName={city.cityName || city.cityId}
                                knownFor={city.knownFor}
                                image={city.image || 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop'}
                                onClick={() => handleCityClick(city.cityId, city.cityName)}
                            />
                        </div>
                    ))}
                </CarouselWithSeeAll>
            ) : null}
        </GenericCard>
    )
}

export default TopCitiesSection
