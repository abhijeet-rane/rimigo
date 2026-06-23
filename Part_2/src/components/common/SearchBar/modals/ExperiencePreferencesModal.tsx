import { PRIORITY_LABELS } from '@/modules/Experiences/constants/filterConstants'

interface ExperiencePreferencesModalProps {
    isOpen: boolean
    onClose: () => void
    selectedPreferences: string[] // These are backendValue strings (e.g., 'traditional', 'cultural') or PRIORITY_LABELS keys
    onPreferenceToggle: (value: string) => void
    onSkip?: () => void
    experiencePreferences?: Array<{ id: number; labelUi: string; backendValue: string; description: string; imageSrc: string; type: 'day' | 'month' }>
    isLoadingExperiencePreferences?: boolean
}

export const ExperiencePreferencesModal = ({
    isOpen,
    onClose,
    selectedPreferences,
    onPreferenceToggle,
    onSkip,
    experiencePreferences,
    isLoadingExperiencePreferences = false
}: ExperiencePreferencesModalProps) => {
    if (!isOpen) return null

    // Use fetched preferences if available, otherwise fall back to PRIORITY_LABELS
    const priorities =
        experiencePreferences && experiencePreferences.length > 0
            ? experiencePreferences.map((pref) => ({
                  id: pref.backendValue,
                  label: pref.labelUi,
                  icon: pref.imageSrc,
                  description: pref.description
              }))
            : Object.entries(PRIORITY_LABELS).map(([id, data]) => ({
                  id,
                  label: data.label,
                  icon: data.icon,
                  description: ''
              }))

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 w-screen h-screen bg-transparent z-40"
                onClick={onClose}
            />
            <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full right-0 transform mt-2 w-[400px] z-50">
                <div className="bg-white border border-feature-card-border rounded-lg shadow-lg h-[400px] overflow-y-auto">
                    <div className="p-3">
                        {isLoadingExperiencePreferences ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-default"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {priorities.map((priority) => {
                                    const isSelected = selectedPreferences.includes(priority.id)
                                    return (
                                        <button
                                            key={priority.id}
                                            onClick={() => onPreferenceToggle(priority.id)}
                                            className={`flex items-center gap-2 p-3 rounded-md border transition-colors cursor-pointer text-left ${
                                                isSelected
                                                    ? 'bg-primary-default_10 border-primary-default'
                                                    : 'hover:bg-grey-grey_5 border-feature-card-border'
                                            }`}>
                                            <img
                                                src={priority.icon}
                                                alt={priority.label}
                                                className="w-5 h-5 object-contain"
                                            />
                                            <span className={`text-sm font-medium ${isSelected ? 'text-primary-default' : 'text-header-black'}`}>
                                                {priority.label}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                        {/* Skip button */}
                        {onSkip && (
                            <div className="mt-3 pt-3 border-t border-feature-card-border">
                                <button
                                    onClick={onSkip}
                                    className="w-full px-4 py-2 text-sm font-medium text-grey-grey_2 hover:text-header-black transition-colors">
                                    Skip
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
