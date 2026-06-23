import { useMemo, useState } from 'react'
import type { LocationResponse } from '@/modules/Onboarding/api/onboardingAPI'
import { CountrySearchInput } from './CountrySearchInput'
import { PopularDestinations } from './PopularDestinations'
import { RegionalSection } from './RegionalSection'
import { CountryListItem } from './CountryListItem'
import { RequestCallbackInline } from './RequestCallbackInline'
import { regionFromCountryName } from './regionMap'
import { WizardBackButton } from './WizardBackButton'
import { SectionError } from './SectionError'

export interface DestinationPickerProps {
    countries: LocationResponse[]
    /** Ranked country IDs from /popular-countries — passed straight to the
     *  Popular Destinations grid. */
    popularCountryIds: string[]
    /** country_id → banner image url from /popular-countries. Used by the
     *  Popular Destinations cards for their photo. */
    popularBannerById?: Record<string, string>
    selectedIds: Set<string>
    onToggle: (country: LocationResponse, source: 'popular' | 'regional' | 'search') => void
    /** Mobile step-back (inline in the heading). Omitted → no arrow. */
    onBack?: () => void
    /** Parent flags "no country picked" on Next → scroll to + red helper. */
    invalidSection?: { nonce: number } | null
}

export function DestinationPicker({ countries, popularCountryIds, popularBannerById, selectedIds, onToggle, onBack, invalidSection }: DestinationPickerProps) {
    const [query, setQuery] = useState('')
    const countriesError = !!invalidSection && selectedIds.size === 0

    const byRegion = useMemo(() => {
        const map = new Map<string, LocationResponse[]>()
        for (const c of countries) {
            // Backend region wins; fall back to a frontend mapping so we don't
            // dump everything into "Other" until the API exposes region for all
            // entries.
            const r = c.region || regionFromCountryName(c.country_name) || 'Other'
            map.set(r, [...(map.get(r) ?? []), c])
        }
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
    }, [countries])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return []
        return countries.filter((c) => c.country_name.toLowerCase().includes(q))
    }, [countries, query])

    const searching = query.trim().length > 0

    return (
        <div className="mx-auto flex w-full max-w-[690px] flex-col gap-6 py-8">
            <div className="flex items-start gap-1.5">
                <WizardBackButton onBack={onBack} />
                <header className="flex flex-col gap-1">
                    <h2
                        className="wf-heading-m"
                        style={{ color: 'var(--text-primary)' }}>
                        Where are you headed?
                    </h2>
                    <p
                        className="wf-body-s"
                        style={{ color: 'var(--text-tertiary)' }}>
                        Select the countries you plan to visit
                    </p>
                    <SectionError show={countriesError} nonce={invalidSection?.nonce} message="Select at least one destination to continue" />
                </header>
            </div>

            <CountrySearchInput
                value={query}
                onChange={setQuery}
            />

            {searching ? (
                <>
                    {filtered.length === 0 ? (
                        <p
                            className="wf-body-s text-center"
                            style={{ color: 'var(--text-tertiary)' }}>
                            No countries match "{query}"
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {filtered.map((c) => (
                                <CountryListItem
                                    key={c.country_id}
                                    display_name={c.country_name}
                                    flag_url={c.flag_icon_url || c.icon_url}
                                    selected={selectedIds.has(c.country_id)}
                                    onToggle={() => onToggle(c, 'search')}
                                />
                            ))}
                        </div>
                    )}
                    {/* Always offer a callback while searching — the team can match
                        on tags, not just exact country names. */}
                    <RequestCallbackInline
                        prompt="Can't find your destination?"
                        queryText={query}
                    />
                </>
            ) : (
                <>
                    <PopularDestinations
                        countries={countries}
                        popularCountryIds={popularCountryIds}
                        popularBannerById={popularBannerById}
                        selectedIds={selectedIds}
                        onToggle={(c) => onToggle(c, 'popular')}
                    />
                    {byRegion.map(([region, list]) => (
                        <RegionalSection
                            key={region}
                            region={region}
                            countries={list}
                            selectedIds={selectedIds}
                            onToggle={(c) => onToggle(c, 'regional')}
                        />
                    ))}
                </>
            )}
        </div>
    )
}
