import { EARTH_THIINGS_ICON } from '@/constants/thiingsIcons'

export interface CountrySearchInputProps {
  value: string
  onChange: (next: string) => void
}

export function CountrySearchInput({ value, onChange }: CountrySearchInputProps) {
  return (
    <div className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-grey-4)] bg-white px-4 py-3">
      <img src={EARTH_THIINGS_ICON} alt="" aria-hidden className="h-5 w-5 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search country"
        className="wf-body-m flex-1 border-0 bg-transparent outline-none placeholder:text-[var(--text-placeholder)]"
      />
    </div>
  )
}
