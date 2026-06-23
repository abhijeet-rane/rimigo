import { useRef, type ReactNode } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { StepIndicator } from './StepIndicator'
import { SubTabBar, type SubTabDescriptor } from './SubTabBar'
import type { WhereSubTab, WizardStep } from './types'
import RimigoLogo from '@/components/shared/RimigoLogo'
import { useHideOnScrollDown } from '@/hooks/useHideOnScrollDown'

/** "Login" pill — solid primary-purple (not the gradient primary CTA, since
 *  login is a secondary action in this flow). */
function LoginPill({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 items-center gap-3 rounded-lg px-4 text-white"
      style={{
        borderRadius: 8,
        background: 'var(--color-primary-default, #7011F6)',
      }}
    >
      <span className="font-red-hat-display text-sm font-semibold tracking-[-0.28px]">Login</span>
    </button>
  )
}

export interface WizardShellProps {
  currentStep: WizardStep
  completedSteps: Set<WizardStep>
  onStepClick: (step: WizardStep) => void
  subTabs: null | {
    activeId: WhereSubTab
    onChange: (id: WhereSubTab) => void
    tabs: readonly SubTabDescriptor[]
  }
  /** Optional: rendered in place of the SubTabBar. Used by frames that need a
   *  custom top strip — e.g., the journey strip on the cities-question frame. */
  headerStrip?: ReactNode
  /** Close (X) handler. Renders inline with the heading on mobile and as
   *  a floated top-right button on desktop. Kept under the legacy
   *  `onMobileClose` name so consumers don't need to rewire; both surfaces
   *  share one handler. */
  onMobileClose?: () => void
  /** Step-back handler. Used by the logged-out mobile header's top-left back
   *  button (logged-in users get the global hamburger there + inline heading
   *  arrows instead). */
  onBack?: () => void
  /** Flags (URLs or emoji) to display on the completed Where step indicator. */
  whereFlags?: string[]
  /** Compact label (date range / timeframe) to display on the completed When
   *  step indicator. */
  whenLabel?: string
  /** Compact label (traveler count) to display on the completed Who step
   *  indicator — e.g. "3 people". */
  whoLabel?: string
  /** Whether a traveler is signed in. Logged in → the global app sidebar +
   *  hamburger are shown (by the layout) and the header shows the close (X);
   *  logged out → a Login pill replaces the close. */
  isLoggedIn?: boolean
  /** Opens the login flow (logged-out CTA). */
  onLogin?: () => void
  /** Optional node rendered to the LEFT of the close (X) in the desktop
   *  top-right cluster — used for the internal Create/Clone toggle. */
  headerRightExtra?: ReactNode
  children: ReactNode
}

export function WizardShell({
  currentStep,
  completedSteps,
  onStepClick,
  subTabs,
  headerStrip,
  onMobileClose,
  onBack,
  whereFlags,
  whenLabel,
  whoLabel,
  isLoggedIn,
  onLogin,
  headerRightExtra,
  children,
}: WizardShellProps) {
  // On scroll-down (mobile, logged-in only), collapse the "Planning your trip"
  // heading row so the step indicator slides up for more list real estate.
  // Logged-OUT: the heading must NOT collapse. The wizard's own `main` is the
  // scroller, and collapsing the heading shrinks the header → `main` grows
  // mid-flick. Resizing a scroll container during iOS momentum makes it
  // overshoot/bounce into empty space (worst on the long Where-step list).
  // Logged-in scrolls the app layout (not `main`), so the collapse is safe.
  const mainRef = useRef<HTMLElement>(null)
  const headerCollapsed = useHideOnScrollDown(isLoggedIn ? undefined : mainRef) && Boolean(isLoggedIn)
  return (
    // Two layouts:
    //
    //  • Logged IN — lives inside SideBarLayout's scroll area. We DON'T create our
    //    own scroller; the root is `min-h-screen` and the header is `sticky top-0`,
    //    pinning against the layout's scroller.
    //
    //  • Logged OUT — the wizard owns a flex-column scroller: a header that's a
    //    `shrink-0` sibling (pinned WITHOUT `sticky`, which is unreliable on real
    //    iOS under the app's global `overflow-x:hidden` + fixed overlay) above a
    //    `flex-1 min-h-0 overflow-y-auto` main. The height comes from an unbroken
    //    `flex-1 min-h-0` chain up to the fixed overlay (NOT a hardcoded `100dvh`),
    //    so the scroller is sized exactly — no momentum "overshoot".
    <div className={`wf-create-flow ${isLoggedIn ? 'flex min-h-screen flex-col bg-[#F5F5F5]' : 'flex min-h-0 flex-1 flex-col bg-[#F5F5F5]'}`}>
      <div className={`z-10 bg-[var(--surface-raised)] ${isLoggedIn ? 'sticky top-0' : 'shrink-0'}`}>
        <div className="relative">
          {/* Top-left (desktop only): the Rimigo logo. When logged in it sits
              right after the app's collapsed sidebar rail / hamburger (~69px on
              the far-left), so it's pushed clear of it; when logged out there's
              no rail, so it anchors at the header edge. Hidden on mobile. Floated
              so it doesn't shift the centered step indicator. */}
          <div
            className={`absolute top-1/2 hidden -translate-y-1/2 md:block ${isLoggedIn ? 'left-[88px]' : 'left-6'}`}
          >
            {/* `xl` preset scaled down a touch — sits between `lg` (too small)
                and full `xl` (too big). origin-left keeps it anchored at the
                header's left edge. */}
            <div className="origin-left scale-[0.78]">
              <RimigoLogo size="xl" />
            </div>
          </div>
          {/* Top-right cluster (desktop): optional extra (Create/Clone toggle)
              sits to the LEFT of the close (X). Logged in → close (X = browser
              back); logged out → Login pill. z-20 sits above the header z-10. */}
          <div className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 items-center gap-2 md:flex">
            {headerRightExtra}
            {isLoggedIn ? (
              onMobileClose && (
                <button
                  type="button"
                  onClick={onMobileClose}
                  aria-label="Close"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-white"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              )
            ) : onLogin ? (
              <LoginPill onClick={onLogin} />
            ) : null}
          </div>
          {/* Mobile-only top row: [left] [heading] [right]. Left is an empty
              slot — the GLOBAL app hamburger (from the sidebar layout) floats
              over the top-left for logged-in users, and step-back is a small
              arrow at the top of each section. Right = close X (logged in,
              = browser back) / Login pill (logged out). Collapses smoothly on
              scroll-down so the step indicator slides up. */}
          <div
            className={`overflow-hidden transition-[max-height,opacity] ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
              isLoggedIn ? 'duration-[520ms]' : 'duration-[760ms]'
            } ${headerCollapsed ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'}`}
          >
          <div className="flex items-center justify-between px-4 pt-4">
            {/* Left slot: logged OUT shows the step-back button (there's no app
                hamburger for guests). On the first step it acts as Close (same
                as the X / browser-back); on later steps it steps back. Logged IN
                leaves this empty — the global sidebar hamburger floats here and
                back-nav is inline in each step's heading. */}
            {!isLoggedIn ? (
              <button
                type="button"
                onClick={currentStep === 'who' ? onMobileClose : onBack}
                aria-label={currentStep === 'who' ? 'Close' : 'Back'}
                className="flex h-10 w-10 items-center justify-center"
              >
                <ArrowLeft size={22} strokeWidth={1.75} />
              </button>
            ) : (
              <span className="h-10 w-10" aria-hidden />
            )}
            <h1 className="wf-heading-xs" style={{ color: 'var(--text-primary)' }}>
              Planning your trip
            </h1>
            {!isLoggedIn && onLogin ? (
              <LoginPill onClick={onLogin} />
            ) : onMobileClose ? (
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            ) : (
              <span className="h-10 w-10" aria-hidden />
            )}
          </div>
          </div>
          <StepIndicator
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={onStepClick}
            whereFlags={whereFlags}
            whenLabel={whenLabel}
            whoLabel={whoLabel}
          />
        </div>
        {headerStrip ? (
          headerStrip
        ) : subTabs && (
          /* Full-width white strip (matches the wizard top region) with the
             actual tab cells constrained to the content column so the active
             lavender background only covers a tab cell — not the entire row. */
          <div className="w-full border-t border-[var(--border-subtle)]">
            <div className="mx-auto w-full max-w-[690px]">
              <SubTabBar
                tabs={subTabs.tabs}
                activeId={subTabs.activeId}
                onChange={subTabs.onChange}
              />
            </div>
          </div>
        )}
      </div>
      <main
        ref={mainRef}
        className={isLoggedIn ? 'flex-1' : 'min-h-0 flex-1 overflow-y-auto overscroll-none'}
        // Match the Activities-explore scroller: `overscroll-behavior: none`
        // kills the iOS rubber-band bounce into empty space (real devices —
        // `contain` only stops chaining, not the local overshoot), and
        // `overflow-anchor: none` stops the browser fighting the on-scroll
        // header collapse. Inert for logged-in (non-scrolling `main`).
        style={isLoggedIn ? undefined : { overflowAnchor: 'none', overscrollBehavior: 'none' }}>
        {children}
      </main>
    </div>
  )
}
