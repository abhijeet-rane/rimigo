import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrchestrationSnapshot } from '../hooks/useTripboardOrchestration'

/**
 * A compact "Creating <trip>…" indicator shown when a tripboard create flow is in
 * progress but the user has navigated to a different page / trip. Clicking it jumps
 * back to the orchestration's URL so the user can resume watching creation progress.
 *
 * Hidden while the user IS on the orchestration's own URL (the creation spinner already
 * fills the screen in that case — the banner would be redundant).
 */
const OrchestrationInProgressBanner: React.FC<{ className?: string }> = ({ className }) => {
    const snapshot = useOrchestrationSnapshot()
    const navigate = useNavigate()
    const location = useLocation()

    const isActive =
        snapshot.phase === 'creating_trip' ||
        snapshot.phase === 'generating_itinerary' ||
        snapshot.phase === 'creating_tripboard'
    if (!isActive) return null

    const targetPath = snapshot.tripId ? `/tripboard/${snapshot.tripId}?create=true` : '/tripboard/new?create=true'
    const targetTripPath = snapshot.tripId ? `/tripboard/${snapshot.tripId}` : '/tripboard/new'

    // Already on the orchestration's page — nothing to nudge about.
    if (location.pathname === targetTripPath) return null

    const tripLabel = snapshot.tripName ?? 'your trip'

    return (
        <button
            type="button"
            onClick={() => navigate(targetPath)}
            className={cn(
                'flex items-center gap-2 w-full rounded-lg border border-primary-default/30 bg-primary-default/5 px-3 py-2 text-left text-sm font-medium text-grey-0 hover:bg-primary-default/10 transition-colors cursor-pointer',
                className
            )}
        >
            <Loader2 className="w-4 h-4 animate-spin text-primary-default shrink-0" />
            <span className="truncate">Creating {tripLabel}…</span>
        </button>
    )
}

export default OrchestrationInProgressBanner
