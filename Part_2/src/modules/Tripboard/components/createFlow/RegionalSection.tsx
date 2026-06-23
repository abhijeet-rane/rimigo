import type { LocationResponse } from '@/modules/Onboarding/api/onboardingAPI'
import { CountryListItem } from './CountryListItem'
import { SectionHeader } from './SectionHeader'

export interface RegionalSectionProps {
  region: string
  countries: LocationResponse[]
  selectedIds: Set<string>
  onToggle: (country: LocationResponse, source: 'regional') => void
}

export function RegionalSection({
  region,
  countries,
  selectedIds,
  onToggle,
}: RegionalSectionProps) {
  if (countries.length === 0) return null

  const headingId = `region-${region.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <section aria-labelledby={headingId} className="w-full">
      <SectionHeader label={region} id={headingId} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {countries.map((c) => (
          <CountryListItem
            key={c.country_id}
            display_name={c.country_name}
            flag_url={c.flag_icon_url || c.icon_url}
            selected={selectedIds.has(c.country_id)}
            onToggle={() => onToggle(c, 'regional')}
          />
        ))}
      </div>
    </section>
  )
}
