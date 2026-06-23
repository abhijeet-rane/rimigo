import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { getExperiencePreferencesWithFallback, FALLBACK_EXPERIENCE_PREFERENCES } from '@/modules/Onboarding/adapters/experiencePreferenceAdapters'
import { getTripExperienceType } from '@/modules/Onboarding/api/experiencePreferenceAPI'
import {
    User,
    Users2,
    Baby,
    UsersRound,
    Users,
    Umbrella,
    Cake,
    Heart,
    Sparkles,
    MapPin,
    Palette,
    Trees,
    Utensils,
    Mountain,
    Camera,
    Building2,
    LucideIcon
} from 'lucide-react'
import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import { vacationPurposeOptions } from '@/modules/Onboarding/pages/TravelPurposeQuestionPage'

interface TravelerTripPreferencesProps {
    tripId: string
}

interface TagWithIcon {
    label: string
    icon: LucideIcon
}

// Group type mapping
const groupTypeOptions = [
    { labelUi: 'Solo', backendValue: 'solo_traveler' },
    { labelUi: 'Couple', backendValue: 'couple' },
    { labelUi: 'Couple with children', backendValue: 'couple_with_children' },
    { labelUi: 'Family', backendValue: 'immediate_family' },
    { labelUi: 'Friends', backendValue: 'friends_group' },
    { labelUi: 'Large group', backendValue: 'large_group' }
]

// Icon mapping for group types
const groupTypeIconMap: Record<string, LucideIcon> = {
    Solo: User,
    Couple: Users2,
    'Couple with children': Baby,
    Family: UsersRound,
    Friends: Users,
    'Large group': UsersRound
}

// Icon mapping for travel purposes
const travelPurposeIconMap: Record<string, LucideIcon> = {
    'Leisure trip': Umbrella,
    'Birthday trip': Cake,
    'Anniversary trip': Heart,
    'Honeymoon trip': Heart,
    'Bachelorette/Bachelor Trip trip': Sparkles
}

// Icon mapping for experience preferences
const experiencePreferenceIconMap: Record<string, LucideIcon> = {
    'Heritage Districts': MapPin,
    'Cultural Venues': Palette,
    'Nature & Wildlife': Trees,
    'Food Tours': Utensils,
    'Scenic Adventures': Mountain,
    'Historical Districts': Building2,
    'Adventure Sports': Mountain,
    Entertainment: Sparkles,
    'Photography Tours': Camera,
    'Art & Museums': Palette
}

// Default icon fallback
const DefaultIcon = MapPin

const TravelerTripPreferences: React.FC<TravelerTripPreferencesProps> = ({ tripId }) => {
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip

    // If context is not available, show no data message
    if (!travelerTripsContext || !activeTrip) {
        return (
            <GenericCard className="w-full max-w-[382px]">
                <b className="self-stretch relative">{`Your profile & preferences`}</b>
                <div className="self-stretch text-center py-4 text-gray">No trip data available</div>
            </GenericCard>
        )
    }

    // Get trip data from context
    const tripProfile = activeTrip?.tripProfile
    const groupType = tripProfile?.group_type
    const travelPurpose = tripProfile?.travel_purpose
    const experiencesPreferences = tripProfile?.experiences_preferences || activeTrip?.trip_preference?.experiences_preferences || []
    const finalDestinationCountries = tripProfile?.final_destination_countries || activeTrip?.final_destination_countries || []

    // Fetch experience preferences for mapping (still needed to convert backend values to labels)
    const { data: experiencePreferences, isLoading: isExperiencePreferencesLoading } = useQuery({
        queryKey: ['experiencePreferences', tripId || activeTrip?.trip_id],
        queryFn: () => {
            const destinationCountries = finalDestinationCountries
            if (destinationCountries && destinationCountries.length > 1) {
                return Promise.resolve(FALLBACK_EXPERIENCE_PREFERENCES)
            }
            const currentTripId = tripId || activeTrip?.trip_id
            if (!currentTripId) {
                return Promise.resolve(FALLBACK_EXPERIENCE_PREFERENCES)
            }
            return getExperiencePreferencesWithFallback(() => getTripExperienceType(currentTripId))
        },
        enabled: !!(tripId || activeTrip?.trip_id)
    })

    const isTripDataError = false // No longer fetching from API

    // Map backend values to UI labels
    const getGroupTypeLabel = (backendValue: string | null): string | null => {
        if (!backendValue) return null
        return groupTypeOptions.find((opt) => opt.backendValue === backendValue)?.labelUi || null
    }

    const getTravelPurposeLabel = (backendValue: string | null): string | null => {
        if (!backendValue) return null
        const option = vacationPurposeOptions.find((opt) => opt.backendValue === backendValue)
        return option ? `${option.labelUi} trip` : null
    }

    const getExperiencePreferenceLabels = (backendValues: string[] | null): string[] => {
        if (!backendValues || backendValues.length === 0) return []
        const allPreferences = experiencePreferences || FALLBACK_EXPERIENCE_PREFERENCES
        return backendValues
            .map((backendValue) => allPreferences.find((pref) => pref.backendValue === backendValue)?.labelUi)
            .filter((label): label is string => !!label)
    }

    // Helper function to get icon for a tag
    const getIconForTag = (label: string, type: 'group' | 'purpose' | 'experience'): LucideIcon => {
        if (type === 'group') {
            return groupTypeIconMap[label] || DefaultIcon
        } else if (type === 'purpose') {
            return travelPurposeIconMap[label] || DefaultIcon
        } else {
            return experiencePreferenceIconMap[label] || DefaultIcon
        }
    }

    // Collect all tags with their types and icons
    const tags: TagWithIcon[] = []

    if (groupType) {
        const groupTypeLabel = getGroupTypeLabel(groupType)
        if (groupTypeLabel) {
            tags.push({
                label: groupTypeLabel,
                icon: getIconForTag(groupTypeLabel, 'group')
            })
        }
    }

    if (travelPurpose) {
        const travelPurposeLabel = getTravelPurposeLabel(travelPurpose)
        if (travelPurposeLabel) {
            tags.push({
                label: travelPurposeLabel,
                icon: getIconForTag(travelPurposeLabel, 'purpose')
            })
        }
    }

    if (experiencesPreferences && experiencesPreferences.length > 0) {
        const experienceLabels = getExperiencePreferenceLabels(experiencesPreferences)
        experienceLabels.forEach((label) => {
            tags.push({
                label: label,
                icon: getIconForTag(label, 'experience')
            })
        })
    }

    const hasData = tags.length > 0
    const isLoading = isExperiencePreferencesLoading
    const showNoData = !isLoading && !isTripDataError && !hasData

    return (
        <GenericCard className="w-full max-w-[382px]">
            <b className="self-stretch relative">{`Your profile & preferences`}</b>
            {isLoading ? (
                <div className="self-stretch text-center py-4 text-gray">Loading...</div>
            ) : showNoData ? (
                <div className="self-stretch text-center py-4 text-gray">No data available</div>
            ) : (
                <div className="self-stretch mt-2 flex items-start flex-wrap content-start gap-2 text-gray">
                    {tags.map((tag, index) => {
                        const IconComponent = tag.icon
                        return (
                            <div
                                key={index}
                                className="rounded-[8px] bg-grey_5 flex items-center justify-center py-1.5 px-2 gap-1">
                                <IconComponent className="h-3.5 w-3.5 text-gray" />
                                <div className="relative text-xs font-medium font-red-hat-display text-gray text-left">{tag.label}</div>
                            </div>
                        )
                    })}
                </div>
            )}
        </GenericCard>
    )
}

export default TravelerTripPreferences
