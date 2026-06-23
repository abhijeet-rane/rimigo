import { Check } from 'lucide-react'
import type { WizardStep } from './types'
import { FlagChip } from './FlagChip'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'who',   label: 'Who'   },
  { id: 'when',  label: 'When'  },
  { id: 'where', label: 'Where' },
  { id: 'how',   label: 'How'   },
]

export interface StepIndicatorProps {
  currentStep: WizardStep
  completedSteps: Set<WizardStep>
  onStepClick: (step: WizardStep) => void
  /** All picked country flag URLs / emojis for the completed Where step —
   *  replaces the "Where" label. The indicator shows the first 2 and a "+N"
   *  badge for the rest. */
  whereFlags?: string[]
  /** Compact label for the completed When step — e.g. "24 Sep - 12 Oct" or
   *  "Jun 2026 · 7-14 days". Renders in place of the "When" text once the
   *  user has finished the When step. */
  whenLabel?: string
  /** Compact label for the completed Who step — e.g. "3 people". */
  whoLabel?: string
}

export function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
  whereFlags,
  whenLabel,
  whoLabel,
}: StepIndicatorProps) {
  const handleClick = (step: WizardStep) => {
    if (step === currentStep) return
    if (!completedSteps.has(step)) return
    onStepClick(step)
  }

  return (
    <div className="flex w-full flex-col items-center gap-3 bg-[var(--surface-raised)] pt-[18px] pb-3">
      {/* Heading hidden on mobile — WizardShell renders the heading inside
          a flex row with the back arrow and close (X) buttons instead. */}
      <h1
        className="wf-heading-xs hidden md:block"
        style={{ color: 'var(--text-primary)' }}
      >
        Planning your trip
      </h1>
      {/* 390px container with 12/24 padding; inner grid puts the 4 dots at
          equal column centers (12.5%, 37.5%, 62.5%, 87.5%). A single track
          spans 12.5%→87.5% so it terminates exactly at the first and last
          dots — no overflow past the outer dots. Dots sit on top via z-10. */}
      <div style={{ width: 390, padding: '0 24px' }}>
        <div className="relative grid grid-cols-4">
          <span
            aria-hidden
            className="pointer-events-none absolute h-px bg-[var(--border-subtle)]"
            style={{ left: '12.5%', right: '12.5%', top: '7px' /* half of 16px dot */ }}
          />
          {STEPS.map((s) => {
            const active = s.id === currentStep
            const completed = completedSteps.has(s.id)
            const clickable = completed && !active
            // Once the user has moved past a step, render a green check dot
            // and a custom label below it (country flags for Where, date/
            // timeframe text for When). Falls back to the plain dot + label.
            const whereCompletedLabel = s.id === 'where' && completed && (whereFlags?.length ?? 0) > 0
            const whenCompletedLabel = s.id === 'when' && completed && !!whenLabel
            const whoCompletedLabel = s.id === 'who' && completed && !!whoLabel
            const showGreenCheck = whereCompletedLabel || whenCompletedLabel || whoCompletedLabel
            return (
              <div key={s.id} className="relative z-10 flex flex-col items-center gap-1">
                {showGreenCheck ? (
                  <button
                    type="button"
                    data-testid={`step-dot-${s.id}`}
                    onClick={() => handleClick(s.id)}
                    aria-label={`Step ${s.label} (completed)`}
                    className={`flex h-4 w-4 items-center justify-center rounded-full ${
                      clickable ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    style={{ background: '#1AB35E' }}
                    disabled={!clickable && !active}
                  >
                    <Check size={10} strokeWidth={3} color="#FFF" />
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid={`step-dot-${s.id}`}
                    onClick={() => handleClick(s.id)}
                    className={`wf-step-dot ${active ? 'wf-step-dot--active' : ''} ${
                      clickable ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    aria-label={`Step ${s.label}`}
                    aria-current={active ? 'step' : undefined}
                    disabled={!clickable && !active}
                  />
                )}
                {whereCompletedLabel ? (
                  <span className="flex items-center" aria-label="Selected countries">
                    {whereFlags!.slice(0, 2).map((flag, i) => (
                      <FlagChip
                        key={i}
                        flag={flag}
                        // Round + object-cover so wide flag images crop instead
                        // of stretching into the fixed box.
                        imgClassName={`h-[18px] w-[18px] shrink-0 rounded-full border border-white object-cover ${i === 0 ? '' : '-ml-1.5'}`}
                        emojiClassName={`text-base leading-none ${i === 0 ? '' : '-ml-1'}`}
                      />
                    ))}
                    {whereFlags!.length > 2 && (
                      <span
                        className="-ml-1 flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full border border-white px-1 text-[10px] font-semibold leading-none"
                        style={{
                          background: 'var(--surface-sunken, #F0EEF2)',
                          color: 'var(--text-tertiary, #4F4F50)',
                        }}
                      >
                        +{whereFlags!.length - 2}
                      </span>
                    )}
                  </span>
                ) : whenCompletedLabel || whoCompletedLabel ? (
                  <span
                    className="whitespace-nowrap"
                    style={{
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-family-body, Manrope)',
                      fontSize: '11px',
                      fontWeight: 600,
                      lineHeight: '14px',
                      letterSpacing: '-0.22px',
                    }}
                  >
                    {whenCompletedLabel ? whenLabel : whoLabel}
                  </span>
                ) : (
                  <span className="wf-heading-3xs" style={{ color: 'var(--text-primary)' }}>
                    {s.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
