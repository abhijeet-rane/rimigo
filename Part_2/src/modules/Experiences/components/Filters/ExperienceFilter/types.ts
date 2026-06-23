/**
 * Experience Filter Types
 * Metadata/InitialData/Result pattern for experiences filter
 */

// ============ Metadata Types (UI Structure) ============

export interface ExperiencePriorityOption {
    id: string
    label: string
    icon: string
}

export interface ExperienceFilterMetadata {
    suggestionPriorities: ExperiencePriorityOption[]
}

// ============ Initial Data Types (Preselected Values) ============

export interface ExperienceFilterInitialData {
    selectedPriorities?: string[]
}

// ============ Result Type (Output) ============

export interface ExperienceFilterResult {
    priorities: string[] // Array of priority IDs: ['0', '2', '4']
}
