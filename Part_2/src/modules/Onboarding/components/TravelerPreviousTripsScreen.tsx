import Typography from '@/components/shared/Typography'
import { MAX_WIDTH } from '../constants/width'
import type { TravelerTrip } from '@/pages/Landing/api/travelerTrips'
import CustomShimmer from '@/components/shared/Shimmer'
import { Button } from '@/components/shared/ButtonNew'
import { OrDivider } from '@/components/shared/OrDivider'
import StripAnimation from './StripAnimation'
import { TravelerPreviousTrips } from './TravelerPreviousTrips'

interface TravelerPreviousTripsScreenProps {
    tripsWithDestinations: TravelerTrip[]
    isLoading?: boolean
    onCreateNewTrip: () => void
    /** When provided, overrides the default trip click handler in TravelerPreviousTrips */
    onSelectTrip?: (tripId: string) => void
}

/**
 * TravelerPreviousTripsScreen Component
 * Displays a list of previous trips with a "Create New Trip" button
 */
export const TravelerPreviousTripsScreen = ({ tripsWithDestinations, isLoading = false, onCreateNewTrip, onSelectTrip }: TravelerPreviousTripsScreenProps) => {

    // Show shimmer while loading
    if (isLoading) {
        return (
            <div
                className="flex flex-col w-full px-[32px] pt-4 gap-4"
                style={{ maxWidth: `${MAX_WIDTH}px`, width: '100%', margin: '0 auto' }}>
                <CustomShimmer height={60} radius={12} />
                <CustomShimmer height={60} radius={12} />
            </div>
        )
    }

    const totalTrips = tripsWithDestinations.length

    return (
        <div className="flex relative flex-col w-full min-h-screen md:min-h-[100dvh] bg-gray-100">
            <div
                className="flex flex-col h-full items-center w-full py-6 pb-10 overflow-y-auto mx-auto"
                style={{ scrollbarWidth: 'none' }}>
                {/* Header */}
                <div className="relative z-10 w-full">
                    <StripAnimation />
                </div>

                <div
                    className="flex flex-col w-full px-[32px] pb-6"
                    style={{
                        maxWidth: `${MAX_WIDTH}px`,
                        width: '100%'
                    }}>
                    {totalTrips > 0 && (
                        <div className="flex flex-col gap-4">
                            {/* Page heading */}
                            <div className="flex flex-col w-full px-0">
                                <Typography
                                    textAlign="left"
                                    size="12"
                                    weight="bold"
                                    family="redhat"
                                    color="grey-2">
                                    Continue Planning
                                </Typography>
                                <Typography
                                    textAlign="left"
                                    size="24"
                                    weight="semibold"
                                    family="redhat"
                                    color="grey-0">
                                    Select from your saved trips
                                </Typography>
                            </div>

                            {/* Reuse TravelerPreviousTrips — role grouping + flat/dropdown logic all handled inside */}
                            <TravelerPreviousTrips
                                tripsWithDestinations={tripsWithDestinations}
                                isLoading={false}
                                onTripClick={onSelectTrip}
                            />
                        </div>
                    )}

                    <OrDivider className="my-6" />

                    {/* Create New Trip Button */}
                    <Button
                        variant="secondary"
                        title="Create new trip"
                        onClick={onCreateNewTrip}
                        className="w-full"
                        textStyle="text-[14px] font-semibold font-red-hat-display text-white-0"
                    />
                </div>
            </div>
        </div>
    )
}
