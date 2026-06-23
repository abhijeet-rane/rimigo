import React, { useState, useEffect } from 'react'
import { StepComponentProps } from '../SteppedInputLayout'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import TravelerTripPreferences from '../../../components/TravelerTripPreferences'
import BottomSelectButtons from '../../../components/Generics/BottomSelectButtons'
import ProfilePreferencesModal from '../../../components/ProfilePreferencesModal'
import AnimatedTypingText from '@/components/shared/AnimatedTypingText'
import TypingContentLoader, { TypingContentLoaderConfig } from '@/components/shared/TypingContentLoader'

const Step1: React.FC<StepComponentProps> = ({ onNext }) => {
    // get active trip from context
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip

    const trip_id = activeTrip?.trip_id
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isTypingComplete, setIsTypingComplete] = useState(false)

    const typingText = "First, let's confirm your details in order to provide a personalised experience."
    const variableSpeed = { min: 20, max: 50 }
    const initialDelay = 0

    // Configuration for TravelerTripPreferences shimmer
    // Matches: GenericCard with title and tag elements
    const travelerPreferencesShimmerConfig: TypingContentLoaderConfig = {
        shimmerElements: [
            {
                // Title shimmer
                height: 24,
                width: '60%',
                radius: 0,
                marginBottom: 12
            },
            {
                // Tags container wrapper - flex container
                isContainer: true,
                containerClassName: 'flex flex-wrap gap-2 mt-2',
                marginBottom: 0
            },
            {
                // Tags - first row
                height: 28,
                width: 120,
                radius: 8
            },
            {
                height: 28,
                width: 100,
                radius: 8
            },
            {
                height: 28,
                width: 140,
                radius: 8
            }
        ],
        containerClassName: 'w-full max-w-[382px] bg-white rounded-2xl border border-feature-card-border pt-4 px-4 pb-4',
        animationDuration: 0.3,
        animationEasing: 'ease-in',
        fadeInDelay: 0
    }

    // Configuration for BottomSelectButtons shimmer
    // Matches: rounded container with title (dot + text) and buttons
    const bottomButtonsShimmerConfig: TypingContentLoaderConfig = {
        shimmerElements: [
            {
                // Container shimmer - matches the full button group
                height: 48,
                width: 450,
                radius: 12,
                className: 'rounded-xl'
            }
        ],
        containerClassName: 'w-fit',
        animationDuration: 0.3,
        animationEasing: 'ease-in',
        fadeInDelay: 100
    }

    useEffect(() => {
        // Calculate completion time: initialDelay + (text length * max typing speed)
        // Use max speed to ensure we wait long enough for variable speed typing
        const maxSpeed = variableSpeed.max
        const completionTime = initialDelay + typingText.length * maxSpeed

        const timeout = setTimeout(() => {
            setIsTypingComplete(true)
        }, completionTime)

        return () => clearTimeout(timeout)
    }, [])

    return (
        <div className="flex flex-col gap-4">
            {/* Title rendered in component */}
            <AnimatedTypingText
                text={typingText}
                className="text-lg font-medium text-grey-0 font-red-hat-display mb-1 tracking-[-0.02em] leading-7"
                variableSpeed={variableSpeed}
                initialDelay={initialDelay}
                onSentenceComplete={() => setIsTypingComplete(true)}
            />
            {/* Step 1 Content */}
            <TypingContentLoader
                isTypingComplete={isTypingComplete}
                config={travelerPreferencesShimmerConfig}>
                {trip_id ? <TravelerTripPreferences tripId={trip_id} /> : <div className="text-center py-4 text-grey_2">No trip selected</div>}
            </TypingContentLoader>
            {/* Temporary Next Button */}
            <TypingContentLoader
                isTypingComplete={isTypingComplete}
                config={bottomButtonsShimmerConfig}>
                <BottomSelectButtons
                    config={{
                        title: 'Is this information correct?',
                        buttons: [
                            {
                                label: 'Yes, this is correct',
                                onClick: () => onNext(),
                                className:
                                    'rounded-xl bg-white border-gray border-solid border-[1px] flex items-center justify-center py-3 px-4 text-base cursor-pointer hover:bg-gray-50 transition-colors'
                            },
                            {
                                label: 'No, let me edit',
                                onClick: () => setIsEditModalOpen(true),
                                className:
                                    'rounded-xl bg-white border-gray border-solid border-[1px] flex items-center justify-center py-3 px-4 text-base cursor-pointer hover:bg-gray-50 transition-colors'
                            }
                        ]
                    }}
                />
            </TypingContentLoader>
            {/* <button
                onClick={() => onNext()}
                className="mt-4 w-fit px-4 py-2 bg-primary-default text-white rounded-lg font-medium hover:bg-primary-default_80 transition-colors">
                Next
            </button> */}
            {/* Profile Preferences Modal */}
            <ProfilePreferencesModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={() => {
                    // Optionally refresh trip data or trigger a callback
                    // The modal will handle the API call
                }}
            />
        </div>
    )
}

export default Step1
