import type { LocationResponse } from '@/modules/Onboarding/api/onboardingAPI'
import { CountryCard } from './CountryCard'
import { SectionHeader } from './SectionHeader'

/** Max popular cards rendered. Backend returns up to 10 ranked countries
 *  (top by traveler-collection interest); we surface only the top 8 to fit
 *  the grid cleanly and leave headroom for filtering against live countries. */
const POPULAR_VISIBLE_COUNT = 8

export interface PopularDestinationsProps {
  countries: LocationResponse[]
  /** Country IDs in popularity-rank order from the popular-countries API.
   *  Cross-referenced against `countries` so display fields (flag, region)
   *  stay sourced from live-countries. */
  popularCountryIds: string[]
  /** country_id → banner image url from the popular-countries API. Preferred
   *  source for the card photo (the live-countries join doesn't reliably
   *  carry `banner_img_url`). */
  popularBannerById?: Record<string, string>
  selectedIds: Set<string>
  onToggle: (country: LocationResponse, source: 'popular') => void
}

export function PopularDestinations({
  countries,
  popularCountryIds,
  popularBannerById,
  selectedIds,
  onToggle,
}: PopularDestinationsProps) {
  const byId = new Map(countries.map((c) => [c.country_id, c]))

  const entries = popularCountryIds
    .map((id) => byId.get(id))
    .filter((c): c is LocationResponse => Boolean(c))
    .slice(0, POPULAR_VISIBLE_COUNT)

  if (entries.length === 0) return null

  return (
    <section aria-labelledby="popular-destinations-heading" className="mb-2 w-full">
      <SectionHeader label="Popular Destinations" id="popular-destinations-heading" />
      <div className="scrollbar-hide -mx-6 grid grid-flow-col grid-rows-2 auto-cols-[150px] gap-4 overflow-x-auto px-6 md:mx-0 md:flex md:flex-wrap md:overflow-visible md:px-0">
        {entries.map((country) => (
          <CountryCard
            key={country.country_id}
            display_name={country.country_name}
            flag_url={country.flag_icon_url || country.icon_url}
            image_url={popularBannerById?.[country.country_id] || country.banner_img_url || country.icon_url}
            selected={selectedIds.has(country.country_id)}
            onToggle={() => onToggle(country, 'popular')}
          />
        ))}
      </div>
    </section>
  )
}
