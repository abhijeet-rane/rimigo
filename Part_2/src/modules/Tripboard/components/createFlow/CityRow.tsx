/**
 * Departure-city row used on the FLYING FROM? sub-tab.
 *
 * Layout: [city name] [country] ... [IATA badge]
 * The IATA badge is a lavender pill — Surface-Brand-Subtle bg, Text-Brand text.
 */
export interface CityRowProps {
    city_name: string
    country_name: string
    iata: string
    selected: boolean
    onSelect: () => void
}

export function CityRow({ city_name, country_name, iata, selected, onSelect }: CityRowProps) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onSelect}
            className={`flex w-full items-center justify-between rounded-xl border bg-[var(--surface-raised)] px-4 py-3 text-left transition ${
                selected
                    ? 'border-[var(--border-brand)] bg-[var(--surface-brand-subtle)]'
                    : 'border-[var(--border-subtle)] hover:border-[var(--border-brand)]'
            }`}
        >
            <span className="flex items-baseline gap-2">
                <span className="wf-heading-xs" style={{ color: 'var(--text-primary)' }}>
                    {city_name}
                </span>
                <span className="wf-body-s" style={{ color: 'var(--text-tertiary)' }}>
                    {country_name}
                </span>
            </span>
            <span
                className="rounded-md bg-[var(--surface-brand-subtle)] px-2 py-1 wf-caption-s uppercase"
                style={{ color: 'var(--text-brand)' }}
            >
                {iata}
            </span>
        </button>
    )
}
