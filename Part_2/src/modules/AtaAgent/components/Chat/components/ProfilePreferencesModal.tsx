import React, { useState, useEffect } from 'react'
import GenericChatModal from './Generics/GenericChatModal'
import GenericChatDropdown, { DropdownOption } from './Generics/GenericChatDropdown'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { toast } from 'sonner'
import { groupTypeOptions as onboardingGroupTypeOptions } from '@/modules/Onboarding/pages/GroupTypeQuestionPage'
import { vacationPurposeOptions } from '@/modules/Onboarding/pages/TravelPurposeQuestionPage'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'

interface ProfilePreferencesModalProps {
    isOpen: boolean
    onClose: () => void
    onSave?: () => void
}

// Map group type options to dropdown format
const groupTypeDropdownOptions: DropdownOption[] = onboardingGroupTypeOptions.map((option) => ({
    value: option.backendValue,
    label: option.labelUi,
    icon: (
        <img
            src={option.image}
            alt={option.labelUi}
            className="w-5 h-5 object-contain"
        />
    )
}))

// Map vacation purpose options to dropdown format
const travelPurposeDropdownOptions: DropdownOption[] = vacationPurposeOptions.map((option) => ({
    value: option.backendValue,
    label: option.labelUi,
    icon: (
        <img
            src={option.imageSrc}
            alt={option.labelUi}
            className="w-5 h-5 object-contain"
        />
    )
}))

const ProfilePreferencesModal: React.FC<ProfilePreferencesModalProps> = ({ isOpen, onClose, onSave }) => {
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const updateTripPurpose = travelerTripsContext?.updateTripPurpose

    // If context is not available, don't render the modal
    if (!travelerTripsContext || !activeTrip || !updateTripPurpose) {
        return null
    }

    // Initialize state from trip data from context
    const [groupType, setGroupType] = useState<string>('')
    const [travelPurpose, setTravelPurpose] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)

    // Prepopulate from trip data from context
    useEffect(() => {
        if (activeTrip?.tripProfile) {
            if (activeTrip.tripProfile.group_type) {
                setGroupType(activeTrip.tripProfile.group_type)
            }
            if (activeTrip.tripProfile.travel_purpose) {
                setTravelPurpose(activeTrip.tripProfile.travel_purpose)
            }
        }
    }, [activeTrip?.tripProfile])

    const handleSave = async () => {
        if (!updateTripPurpose) {
            toast.error('No active trip found')
            return
        }

        setIsSaving(true)
        try {
            // Use context method to update trip purpose (which includes group_type and travel_purpose)
            await updateTripPurpose({
                group_type: groupType || undefined,
                travel_purpose: travelPurpose || undefined
            })

            toast.success('Profile updated successfully')
            onSave?.()
            onClose()
        } catch (error) {
            toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        // Reset to original values from trip data from context
        if (activeTrip?.tripProfile) {
            setGroupType(activeTrip.tripProfile.group_type || '')
            setTravelPurpose(activeTrip.tripProfile.travel_purpose || '')
        } else {
            setGroupType('')
            setTravelPurpose('')
        }
        onClose()
    }

    return (
        <GenericChatModal
            isOpen={isOpen}
            onClose={handleCancel}
            title="Set your profile and preferences"
            description="We use this information to curate your experience"
            width={500}>
            <div className="flex flex-col min-h-0 flex-1">
                {/* Scrollable Content */}
                <div className="flex-1 min-h-0 overflow-y-auto pb-4">
                    <div className="flex flex-col gap-6">
                        {/* Group Type Dropdown */}
                        <GenericChatDropdown
                            label="Who are you travelling with?"
                            subtitle="This is specifically for Burj Khalifa"
                            options={groupTypeDropdownOptions}
                            value={groupType}
                            onChange={setGroupType}
                            placeholder="Select group type"
                        />

                        {/* Travel Purpose Dropdown */}
                        <GenericChatDropdown
                            label="Celebrating any occasion?"
                            subtitle="We can look for options that will make it more special"
                            options={travelPurposeDropdownOptions}
                            value={travelPurpose}
                            onChange={setTravelPurpose}
                            placeholder="Select occasion"
                        />
                    </div>
                </div>

                {/* Fixed Action Buttons at Bottom */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-grey_4 shrink-0">
                    <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="px-6 py-2.5 text-sm font-semibold text-primary-default hover:text-primary-default-80 transition-colors disabled:opacity-50">
                        CANCEL
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-default rounded-lg hover:bg-primary-default-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSaving ? 'SAVING...' : 'SAVE'}
                    </button>
                </div>
            </div>
        </GenericChatModal>
    )
}

export default ProfilePreferencesModal
