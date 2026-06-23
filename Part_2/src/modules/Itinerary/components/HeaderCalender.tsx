import Typography from '@/components/shared/Typography'
import { Check, Loader2, WandSparkles } from 'lucide-react'
import React from 'react'
import type { TripboardStatus } from '../hooks/useTripboardCreation'

export type ItineraryViewMode = 'calendar' | 'kanban' | 'map'

interface HeaderCalenderProps {
    isViewer?: boolean
    viewMode?: ItineraryViewMode
    onViewModeChange?: (mode: ItineraryViewMode) => void
    onCreateTripboard?: () => void
    tripboardStatus?: TripboardStatus
    showCreateTripboardBtn?: boolean
}

// ---------- Header ----------
//
// Prior versions of this component housed a 3-dot overflow dropdown
// (Add slot / Recreate / Share / Clone). That menu moved to
// TripboardHeader so there's a single canonical overflow surface for
// the page. All that remains here is the state-driven "Create
// Tripboard" CTA, which has distinct idle / creating / completed
// states that don't collapse cleanly into a dropdown row.

const HeaderCalender: React.FC<HeaderCalenderProps> = ({
    isViewer,
    onCreateTripboard,
    tripboardStatus,
    showCreateTripboardBtn = true,
}) => {
    if (isViewer || !onCreateTripboard || !showCreateTripboardBtn) return null

    return (
        <div className="flex flex-row items-center justify-end shrink-0 gap-2 px-4 ml-auto">
            <button
                onClick={onCreateTripboard}
                disabled={tripboardStatus === 'creating'}
                className={`hidden md:flex items-center gap-1.5
                    rounded-lg px-2.5 py-1.5 transition-colors
                    cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        tripboardStatus === 'completed'
                            ? 'border border-grey_4 bg-white hover:bg-grey_5'
                            : 'border border-primary-default bg-primary-default-08 hover:bg-primary-default-12 shadow-sm'
                    }`}>
                {tripboardStatus === 'creating' ? (
                    <Loader2 className="text-grey_2 animate-spin" size={16} />
                ) : tripboardStatus === 'completed' ? (
                    <Check className="text-secondary-green" size={16} />
                ) : (
                    <WandSparkles className="text-primary-default" size={16} />
                )}
                <Typography
                    size="13"
                    weight="medium"
                    color={tripboardStatus === 'completed' ? 'grey-1' : 'primary-default'}>
                    {tripboardStatus === 'creating'
                        ? 'Creating...'
                        : tripboardStatus === 'completed'
                          ? 'Tripboard Ready'
                          : 'Create Tripboard'}
                </Typography>
            </button>
        </div>
    )
}

export default HeaderCalender
