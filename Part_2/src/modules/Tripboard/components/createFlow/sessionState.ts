import type { SelectedCountry, WhereSubTab, WizardStep } from './types'

/** Bump this whenever PersistedWizardState shape (or step ordering) changes. */
export const CREATE_FLOW_VERSION = 2

/* ── Session storage keys ─────────────────────────────────────────────────
   The create-flow touches three sessionStorage keys, each with a distinct
   lifecycle. Keeping them in one place clarifies who owns what and prevents
   us from silently leaking state across orchestration boundaries.

   1. WIZARD_RESUME_KEY (`tripboard_create_wizard`)
      One-shot pre-login submit payload. Set right before a login redirect
      when the user submitted the wizard while logged out. Read once on the
      post-login page, then cleared. Schema is shared with the orchestration
      hand-off (`PendingWizardData`). Owned by TripboardCreateFlow (write)
      and TripboardPage / TripboardCreatePage (read).

   2. SHELL_STATE_KEY (`tripboard_create_wizard_v2`)
      Wizard UI scratch state — currentStep / currentSubTab / completedSteps
      / selectedCountries. Persisted on every change so an accidental refresh
      mid-flow doesn't lose the user's progress. Owned by TripboardCreateFlow.
      MUST be cleared once the user has handed off to orchestration (submit),
      otherwise a remount post-create rehydrates the wizard at the HOW step.

   3. ORCH_STATE_KEY (`tripboard_orchestration_state`)
      Owned by useTripboardOrchestration. Authoritative signal that an
      orchestration is in flight (or just finished). When this key contains
      anything other than an `idle` phase, the shell-state cache is stale by
      definition — the user is no longer "in the wizard", they're in the
      creation pipeline.
*/
export const WIZARD_RESUME_KEY = 'tripboard_create_wizard'
export const SHELL_STATE_KEY = 'tripboard_create_wizard_v2'
export const ORCH_STATE_KEY = 'tripboard_orchestration_state'

export interface PersistedWizardState {
  version: number
  currentStep: WizardStep
  currentSubTab: WhereSubTab | null
  completedSteps: Set<WizardStep>
  selectedCountries: SelectedCountry[]
}

interface SerialisedShape {
  version: number
  currentStep: WizardStep
  currentSubTab: WhereSubTab | null
  completedSteps: WizardStep[]
  selectedCountries: SelectedCountry[]
}

export function toJSON(state: PersistedWizardState): string {
  const out: SerialisedShape = {
    version: state.version,
    currentStep: state.currentStep,
    currentSubTab: state.currentSubTab,
    completedSteps: Array.from(state.completedSteps),
    selectedCountries: state.selectedCountries,
  }
  return JSON.stringify(out)
}

export function fromJSON(raw: string): PersistedWizardState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SerialisedShape>
    if (parsed.version !== CREATE_FLOW_VERSION) return null
    return {
      version: parsed.version,
      currentStep: parsed.currentStep as WizardStep,
      currentSubTab: (parsed.currentSubTab ?? null) as WhereSubTab | null,
      completedSteps: new Set(parsed.completedSteps ?? []),
      selectedCountries: parsed.selectedCountries ?? [],
    }
  } catch {
    return null
  }
}

/**
 * Returns `true` when an orchestration is in flight or recently completed.
 * Used by `loadShellState` to refuse stale hydration after the post-create
 * reload. Looks at the raw payload (not the parsed phase) because phase
 * names are owned by useTripboardOrchestration and we don't want a circular
 * import; the mere presence of a non-idle phase string is sufficient.
 */
function isOrchestrationOwnedByPipeline(): boolean {
  try {
    const raw = sessionStorage.getItem(ORCH_STATE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { phase?: string }
    if (!parsed?.phase) return false
    return parsed.phase !== 'idle'
  } catch {
    return false
  }
}

/**
 * Hydrate the wizard shell state if-and-only-if it is safe to do so.
 *
 * Returns `null` (and proactively clears the cache) when:
 *   • An orchestration is in flight or completed — the user belongs to the
 *     pipeline view, not a fresh wizard mount.
 *   • A pre-login resume payload is pending — the resume flow rebuilds
 *     selections from `WIZARD_RESUME_KEY` and shell state would conflict.
 *
 * Otherwise reads + parses the persisted shell state for refresh resilience.
 */
export function loadShellState(): PersistedWizardState | null {
  try {
    if (isOrchestrationOwnedByPipeline() || sessionStorage.getItem(WIZARD_RESUME_KEY)) {
      sessionStorage.removeItem(SHELL_STATE_KEY)
      return null
    }
    const raw = sessionStorage.getItem(SHELL_STATE_KEY)
    if (!raw) return null
    return fromJSON(raw)
  } catch {
    return null
  }
}

/** Persist the wizard shell state. Cheap to call on every state change. */
export function saveShellState(state: PersistedWizardState): void {
  try {
    sessionStorage.setItem(SHELL_STATE_KEY, toJSON(state))
  } catch {
    /* non-fatal — sessionStorage may be unavailable / over quota */
  }
}

/**
 * Explicitly clear the shell state cache. Called on submit (the user has
 * handed off to orchestration, scratch state is no longer authoritative)
 * and during cross-flow housekeeping.
 */
export function clearShellState(): void {
  try {
    sessionStorage.removeItem(SHELL_STATE_KEY)
  } catch {
    /* non-fatal */
  }
}
