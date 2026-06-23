import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useCountryCities } from '../hooks/useCountryCities'
import { useQueryParams } from '@/hooks/useQueryParams'
import Divider from '@/components/shared/Divider/Divider'
import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import { DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE } from '@/routes/routes'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface AllCitiesSectionProps {
    countryId: string | null
    /** Override city card clicks (default: navigate to the standalone city
     *  explore page). The Tripboard Activities tab uses this to keep
     *  navigation inside the tab. */
    onCityClick?: (cityId: string, cityName?: string) => void
    /** Title style override (replaces the default heading classes) — the
     *  Tripboard country overview passes its shared section-heading
     *  classes so this matches the other headings. */
    titleClassName?: string
    /** Extra classes merged onto the wrapping GenericCard — the Tripboard
     *  country overview passes `bg-transparent` to drop the white card
     *  background. */
    containerClassName?: string
}

const ALL_CITIES_DEFAULT_TITLE_CLASS = "font-['Red_Hat_Display'] font-semibold text-[20px] text-[color:var(--color-grey-0)] tracking-[-0.4px]"

const AllCitiesSection: React.FC<AllCitiesSectionProps> = ({ countryId, onCityClick, titleClassName, containerClassName }) => {
    // "All cities" → the full city list (top + other), not just the
    // non-carousel `other_cities` (which collapses to one for countries
    // whose cities are mostly "top", e.g. Bali).
    const { allCities, isLoading } = useCountryCities({ countryId })
    const navigate = useNavigate()
    const queryParams = useQueryParams()
    const { trackButtonClickCustom } = usePostHog()
    const scrollRef = useRef<HTMLDivElement>(null)
    const [scrollProgress, setScrollProgress] = useState(0)
    const hasInteractedRef = useRef(false)
    const isMobile = useIsMobile()
    useEffect(() => {
        handleScroll()
    }, [])

    // Handle city click
    const handleCityClick = (cityId: string, cityName?: string) => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_ALL_CITIES_CITY_CLICK,
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
        params.set('city_id', cityId)

        // Add city_name to query params if available
        if (cityName) {
            params.set('city_name', cityName)
        }

        // Navigate to ${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/<city_id>/ with all query params
        navigate(`${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/city/${cityId}/?${params.toString()}`)
    }
    const handleScroll = () => {
        const el = scrollRef.current
        if (!el) return

        hasInteractedRef.current = true

        const maxScroll = el.scrollWidth - el.clientWidth

        let progress = 0

        if (maxScroll > 0) {
            if (!hasInteractedRef.current) {
                progress = (el.clientWidth / el.scrollWidth) * 100
            } else {
                progress = (el.scrollLeft / maxScroll) * 100
            }
        }

        setScrollProgress(Math.max(progress, 6))
    }

    if (isLoading) {
        return (
            <div className="w-full">
                <h2 className={`${titleClassName ?? ALL_CITIES_DEFAULT_TITLE_CLASS} mb-6`}>
                    All cities
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 p-4 rounded-xl border border-[color:var(--color-grey-4)] bg-gray-200 animate-pulse h-16"
                        />
                    ))}
                </div>
            </div>
        )
    }

    if (allCities.length === 0) {
        return null
    }

    // Calculate number of rows needed for mobile grid (max 3 rows, but adjust if fewer items)
    // With grid-flow-col, items fill column by column, so we need to calculate rows based on items
    // For a horizontal scrolling grid, we want to limit to 3 rows max, but use fewer if not needed
    const calculateRows = () => {
        const itemCount = allCities.length
        // If we have 3 or fewer items, we only need 1 row
        // If we have 4-6 items, we need 2 rows
        // If we have 7+ items, we need 3 rows
        if (itemCount <= 3) return 1
        if (itemCount <= 6) return 2
        return 3
    }

    const mobileRows = calculateRows()

    return (
        <>
            <Divider className="my-6 md:my-6 " />
            <GenericCard className={`w-full border-none max-md:pr-0 md:pl-0 ${containerClassName ?? ''}`}>
                <div id="all-cities-section" className="flex items-center justify-between mb-6 scroll-mt-36 md:scroll-mt-24">
                    <h2 className={titleClassName ?? ALL_CITIES_DEFAULT_TITLE_CLASS}>
                        All cities
                    </h2>

                    {/* Mobile scroll indicator */}
                    <div className="md:hidden pr-[20px]">
                        <div className="w-[80px] h-[4px] bg-grey-4 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-grey-0 rounded-full transition-[width] duration-150"
                                style={{ width: `${scrollProgress}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    style={{
                        scrollbarWidth: 'none',
                        ...(isMobile ? { gridTemplateRows: `repeat(${mobileRows}, minmax(0, 1fr))` } : {})
                    }}
                    className="max-md:pr-[20px]
    grid
    grid-flow-col auto-cols-[240px]
    gap-4
    overflow-x-auto pb-2
    sm:grid-flow-row sm:grid-rows-none sm:auto-cols-auto sm:overflow-x-visible
    sm:grid-cols-2
    md:grid-cols-3
    lg:grid-cols-4">
                    {allCities.map((city) => (
                        <div
                            key={city.id}
                            onClick={() => handleCityClick(city.id, city.name)}
                            className="flex items-center gap-4 p-2 md:p-3 rounded-[16px] border border-grey-4 bg-white cursor-pointer hover:shadow-md transition-shadow">
                            {city.image ? (
                                <img
                                    src={city.image}
                                    alt={city.name || city.id}
                                    className="w-[56px] h-[56px] md:w-20 md:h-20 rounded-[8px] object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-[8px] bg-primary-default-08 flex items-center justify-center flex-shrink-0">
                                    {/* #7011F629 */}
                                    <MapPin className="w-8 h-8 text-primary-default" />
                                </div>
                            )}
                            <span className="font-['Manrope'] font-medium text-[14px] md:text-[16px] text-[color:var(--color-grey-0)]">
                                {city.name}
                            </span>
                        </div>
                    ))}
                </div>
            </GenericCard>
        </>
    )
}

export default AllCitiesSection
