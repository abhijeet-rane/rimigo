import { Check } from 'lucide-react'

export interface CountryListItemProps {
  display_name: string
  flag_url: string
  selected: boolean
  onToggle: () => void
}

export function CountryListItem({
  display_name,
  flag_url,
  selected,
  onToggle,
}: CountryListItemProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className="flex h-14 w-full items-center gap-3 rounded-xl px-4 text-left transition-colors"
      style={{
        // Selected = a clean 1.5px brand border + a faint lavender tint + the
        // check chip on the right. Kept light so it doesn't look heavy. (The
        // design tokens for border-brand can resolve empty, so colours are
        // explicit.)
        border: selected ? '1.5px solid #7011F6' : '1px solid var(--border-subtle, #DFDDE0)',
        background: selected ? '#FAF6FF' : 'var(--surface-raised, #FFF)',
      }}
    >
      <img
        src={flag_url}
        alt={`${display_name} flag`}
        loading="lazy"
        className="h-5 w-5"
      />
      <span className="wf-heading-xs flex-1" style={{ color: 'var(--text-primary)' }}>
        {display_name}
      </span>
      {selected && (
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{ background: '#7011F6' }}>
          <Check size={13} strokeWidth={2.5} color="#FFF" />
        </span>
      )}
    </button>
  )
}
