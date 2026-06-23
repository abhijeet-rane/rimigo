import React, { useMemo } from 'react'
import SteppedInputLayout, { StepConfig, ExtendedPreferenceQuestion } from './SteppedInputLayout'
import Step1 from './steps/Step1'
import Step2 from './steps/Step2'
import Step3 from './steps/Step3'
import Step4 from './steps/Step4'
import { IATAFeature } from '@/api/ataAPI/types/getATAByAgentIdTypes'

interface BurjKhalifaTicketRecommendationInputProps {
    feature?: IATAFeature // Feature data containing preference questions
    assistantIdentifier?: string // Assistant identifier (ataId)
    steps?: StepConfig[]
    totalSteps?: number
    providedData?: Record<string, unknown> | null // Pre-populated data from API response
    onComplete?: (payload: { assistant_identifier: string; all_preferences: Record<string, unknown>; feature: IATAFeature }) => void // Callback with formatted payload
    initialStep?: number
}

const BurjKhalifaTicketRecommendationInput: React.FC<BurjKhalifaTicketRecommendationInputProps> = ({
    feature,
    assistantIdentifier,
    steps,
    totalSteps,
    providedData,
    onComplete,
    initialStep
}) => {
    // Generate steps from preference_questions if feature is provided and steps not custom
    const generatedStepsFromFeature = useMemo(() => {
        if (!feature?.input_parameters?.preference_questions || steps) {
            return null
        }

        const preferenceQuestions = feature.input_parameters.preference_questions
        const stepComponents = [Step2, Step3, Step4, Step1] // Step1 is for TravelerTripPreferences, others for preference questions

        // Start with TravelerTripPreferences step (always first)
        const travelerPreferencesStep: StepConfig = {
            id: 1,
            component: Step1,
            nextStepMessage: "Great! Let's move on to the next step."
        }

        // Map preference questions to steps (starting from step 2)
        const preferenceQuestionSteps: StepConfig[] = preferenceQuestions.map((question, index) => {
            const extendedQuestion = question as unknown as ExtendedPreferenceQuestion
            return {
                id: index + 2, // Start from 2 since step 1 is TravelerTripPreferences
                component: stepComponents[index] || Step2,
                preferenceQuestionIndex: index,
                // Use post_input_field message if available, otherwise use default
                nextStepMessage: extendedQuestion.post_input_field?.content || "Great! Let's move on to the next step."
            }
        })

        // Combine: TravelerTripPreferences first, then preference questions
        return [travelerPreferencesStep, ...preferenceQuestionSteps] as StepConfig[]
    }, [feature, steps])

    const effectiveSteps = (steps || generatedStepsFromFeature) ?? null
    const effectiveTotalSteps = (totalSteps || effectiveSteps?.length) ?? 0
    if (!effectiveSteps) {
        return null
    }

    // Handle completion - format payload and call onComplete
    const handleComplete = (allPreferences: Record<string, unknown>) => {
        if (!feature) {
            console.error('Feature is required to format payload')
            return
        }

        if (!assistantIdentifier) {
            console.error('Assistant identifier is required to format payload')
            return
        }

        // Format payload according to the specified structure
        const payload = {
            assistant_identifier: assistantIdentifier,
            all_preferences: allPreferences,
            feature: feature
        }

        // Call the onComplete callback with the formatted payload
        onComplete?.(payload)
    }

    return (
        <SteppedInputLayout
            feature={feature}
            steps={effectiveSteps}
            totalSteps={effectiveTotalSteps}
            providedData={providedData}
            onComplete={handleComplete}
            initialStep={initialStep}
        />
    )
}

export default BurjKhalifaTicketRecommendationInput
