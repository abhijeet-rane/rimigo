import type { ExperiencePreferenceUI } from '@/modules/Onboarding/adapters/experiencePreferenceAdapters'
import { PRIORITY_LABELS } from '@/modules/Experiences/constants/filterConstants'

interface ExperiencesListHeaderProps {
    locationName?: string
    totalExperiences?: number
    hasMultipleCities?: boolean
    selectedPreferences?: string[]
    selectedPriorities?: string[]
    experiencePreferences?: ExperiencePreferenceUI[]
}

const ExperiencesListHeader = ({
    locationName = 'All Destinations',
    totalExperiences = 0,
    hasMultipleCities = false,
    selectedPreferences = [],
    selectedPriorities = [],
    experiencePreferences = []
}: ExperiencesListHeaderProps) => {
    // If location name is empty, use "All Destinations"
    const displayLocation = locationName || 'All Destinations'

    // Get filter labels from backend values
    const getFilterLabels = () => {
        const labels: string[] = []

        // Get priority labels
        selectedPriorities.forEach((priorityId) => {
            const priorityInfo = PRIORITY_LABELS[priorityId]
            if (priorityInfo) {
                labels.push(priorityInfo.label)
            }
        })

        // Get preference labels from experiencePreferences
        selectedPreferences.forEach((prefBackendValue) => {
            const preference = experiencePreferences.find((pref) => pref.backendValue === prefBackendValue)
            if (preference) {
                labels.push(preference.labelUi)
            }
        })

        return labels
    }

    const filterLabels = getFilterLabels()
    const hasFilters = filterLabels.length > 0

    // Format filter text
    const formatFilterText = () => {
        if (filterLabels.length === 0) return ''
        if (filterLabels.length === 1) return ` with ${filterLabels[0]}`
        if (filterLabels.length === 2) return ` with ${filterLabels[0]} and ${filterLabels[1]}`
        // For 3 or more, show first two and count
        return ` with ${filterLabels[0]}, ${filterLabels[1]} and ${filterLabels.length - 2} more`
    }

    return (
        <div className="mb-4 flex items-center justify-between ">
            <div className="text-[16px] md:text-[18px] leading-[100%] font-semibold font-red-hat-display text-grey-0">
                {hasMultipleCities ? (
                    <>Explore over {totalExperiences.toLocaleString()} activities in selected filters</>
                ) : (
                    <>
                        Explore over {totalExperiences.toLocaleString()} activities in {displayLocation}
                        {hasFilters && formatFilterText()}
                    </>
                )}
            </div>
            {/* <div className="hidden lg:flex items-center gap-2 text-sm text-grey-grey_2">
                <span className="inline-flex items-center gap-1 text-primary-default">
                    <img
                        src="/illustrations/tag.png"
                        alt="tag"
                        className="h-6 w-6"
                        style={{
                            transform: 'scaleX(-1)',
                            mixBlendMode: 'multiply'
                        }}
                    />
                    Prices are
                </span>
            </div> */}
        </div>
    )
}

export default ExperiencesListHeader
