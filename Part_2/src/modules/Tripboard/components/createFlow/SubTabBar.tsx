import type { WhereSubTab } from './types'

export interface SubTabDescriptor {
  id: WhereSubTab
  label: string
  subheading: string
  /** When true, the subheading is a real selected value (e.g. country names,
   *  airport IATA) rather than the empty-state placeholder. Used to pick the
   *  inactive-tab subheading color: text-primary (grey-0) for values,
   *  text-placeholder for empty states. */
  subheadingHasValue?: boolean
}

export interface SubTabBarProps {
  tabs: readonly SubTabDescriptor[]
  activeId: WhereSubTab
  onChange: (id: WhereSubTab) => void
}

export function SubTabBar({ tabs, activeId, onChange }: SubTabBarProps) {
  return (
    <div className="flex w-full">
      {tabs.map((t) => {
        const active = t.id === activeId
        return (
          <button
            key={t.id}
            type="button"
            data-testid={`tab-${t.id}`}
            onClick={() => onChange(t.id)}
            className={`wf-tab ${active ? 'wf-tab--active' : ''}`}
          >
            <span
              className="wf-caption-s uppercase"
              style={{ color: active ? 'var(--text-brand)' : 'var(--text-primary)' }}
            >
              {t.label}
            </span>
            <span
              className="wf-body-s wf-body-s--semibold"
              style={{
                color: active
                  ? 'var(--text-brand-strong)'
                  : t.subheadingHasValue
                    ? 'var(--text-primary)'
                    : 'var(--text-placeholder)',
              }}
            >
              {t.subheading}
            </span>
          </button>
        )
      })}
    </div>
  )
}
