import { Plus, Check } from 'lucide-react'

export interface CountryCardProps {
  display_name: string
  flag_url: string
  image_url: string
  selected: boolean
  onToggle: () => void
}

export function CountryCard({
  display_name,
  flag_url,
  image_url,
  selected,
  onToggle,
}: CountryCardProps) {
  const actionLabel = selected ? `Remove ${display_name}` : `Add ${display_name}`

  return (
    <div
      className="relative flex w-[150px] shrink-0 flex-col items-start gap-8 rounded-xl p-4 transition-shadow"
      style={{
        background: `linear-gradient(180deg, rgba(13, 12, 13, 0.00) 0%, #0D0C0D 115.85%), url(${image_url}) lightgray 50% / cover no-repeat`,
        // Selected = an INSET brand ring (drawn inside the card so the horizontal
        // scroller never clips it). The ring is ALWAYS present — only its colour
        // animates transparent → brand — so the box-shadow lists stay the same
        // length and the transition interpolates cleanly (mismatched-length
        // shadow lists are what made the old transition look "weird").
        boxShadow: `inset 0 0 0 3px ${selected ? '#7011F6' : 'transparent'}, 0 2px 8px 0 rgba(13,12,13,0.16)`,
      }}
    >
      <img
        src={flag_url}
        alt={`${display_name} flag`}
        className="h-6 w-6 aspect-square"
      />

      <span
        className="wf-heading-xs"
        style={{ color: 'var(--text-inverse)' }}
      >
        {display_name}
      </span>

      <button
        type="button"
        aria-label={actionLabel}
        aria-pressed={selected}
        onClick={onToggle}
        className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-[4px] shadow-[0_2px_8px_0_rgba(13,12,13,0.16)] transition-colors"
        style={{
          background: selected ? '#7011F6' : 'var(--fill-neutral, #FFF)',
          color: selected ? '#FFF' : 'var(--text-primary, #0D0C0D)',
        }}
      >
        {selected
          ? <Check size={20} strokeWidth={2} />
          : <Plus  size={20} strokeWidth={1.667} />}
      </button>
    </div>
  )
}
