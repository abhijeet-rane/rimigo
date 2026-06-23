import React, { useState, useEffect, useRef, useMemo } from 'react'
import StepProgressBar from './StepProgressBar'
import { IATAFeature } from '@/api/ataAPI/types/getATAByAgentIdTypes'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { toast } from 'sonner'
import AnimatedTypingText from '@/components/shared/AnimatedTypingText'

export interface StepConfig {
    id: number
    component: React.ComponentType<StepComponentProps>
    title?: string
    description?: string
    nextStepMessage?: string // Message to show after clicking next, before moving to next step
    preferenceQuestionIndex?: number // Index of preference_question in feature.input_parameters.preference_questions
}

// Extended preference question type with additional fields from JSON
export interface ExtendedPreferenceQuestion {
    id: string
    sequence: number
    expert_context: string
    title: string
    description: string
    type: string
    selection_type?: string
    required: boolean
    options: Array<{
        id: string
        name: string
        recommendation_reason?: string
        budget_type?: string
        content?: Array<{ type: string; url: string; redirection_url?: string }>
        details?: string[]
        education_tips?: string[]
        pricing?: {
            min_price: string
            max_price: string
            currency: string
            type: string
        }
    }>
    education_tips?: string[]
    post_input_field?: {
        type: string
        content: string
    }
    is_thinking?: boolean
}

export interface StepComponentProps {
    currentStep: number
    totalSteps: number
    onNext: (data?: Record<string, unknown>) => void
    onPrevious?: () => void
    feature?: IATAFeature // Feature data containing all preference questions
    preferenceQuestion?: ExtendedPreferenceQuestion // Current preference question for this step
    selectedOptions?: Record<string, unknown> // Previously selected options across all steps
    preselectedOptionId?: string | null // Pre-selected option ID from providedData for this step
}

interface SteppedInputLayoutProps {
    steps: StepConfig[]
    totalSteps?: number
    onComplete?: (allPreferences: Record<string, unknown>) => void // Changed to pass all preferences combined
    initialStep?: number
    feature?: IATAFeature // Feature data to be passed to steps
    providedData?: Record<string, unknown> | null // Pre-populated data from API response
}

const SteppedInputLayout: React.FC<SteppedInputLayoutProps> = ({ feature, steps, totalSteps, onComplete, initialStep = 1, providedData }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(Math.max(0, initialStep - 1))
    const [stepData, setStepData] = useState<Record<number, Record<string, unknown>>>({})
    const [showNextStepMessage, setShowNextStepMessage] = useState(false)
    const [nextStepMessage, setNextStepMessage] = useState<string | null>(null)
    const [travelerName, setTravelerName] = useState<string | null>(null)
    const [isTypingComplete, setIsTypingComplete] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Fetch traveler name from token storage
    useEffect(() => {
        const fetchTravelerName = async () => {
            try {
                const userInfo = await TokenStorage.getUserInfo()
                // Get first name from full name
                const firstName = userInfo?.name?.split(' ')[0] || null
                setTravelerName(firstName)
            } catch (error) {
                toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
                setTravelerName(null)
            }
        }
        fetchTravelerName()
    }, [])

    const effectiveTotalSteps = totalSteps || steps.length
    const currentStep = currentStepIndex + 1
    const currentStepConfig = steps[currentStepIndex]
    const CurrentStepComponent = currentStepConfig?.component

    // Get current preference question for this step
    const currentPreferenceQuestion: ExtendedPreferenceQuestion | undefined =
        feature?.input_parameters?.preference_questions && typeof currentStepConfig?.preferenceQuestionIndex === 'number'
            ? (feature.input_parameters.preference_questions[currentStepConfig.preferenceQuestionIndex] as unknown as ExtendedPreferenceQuestion)
            : undefined

    // Extract pre-selected option ID for current preference question from providedData
    // providedData structure: { "question_id": [{ "selected_id": "option_id", "selected_label": "..." }] }
    const preselectedOptionId: string | null = useMemo(() => {
        if (!providedData || !currentPreferenceQuestion?.id) {
            return null
        }

        const questionData = providedData[currentPreferenceQuestion.id]
        if (!questionData) {
            return null
        }

        // Handle array format: [{ selected_id: "...", selected_label: "..." }]
        if (Array.isArray(questionData) && questionData.length > 0) {
            const firstItem = questionData[0] as { selected_id?: string; selected_label?: string }
            return firstItem?.selected_id || null
        }

        // Handle direct string format (for backward compatibility)
        if (typeof questionData === 'string') {
            return questionData
        }

        return null
    }, [providedData, currentPreferenceQuestion?.id])

    // Collect all selected options from previous steps
    const selectedOptions = Object.values(stepData).reduce((acc, stepDataItem) => ({ ...acc, ...stepDataItem }), {} as Record<string, unknown>)

    // Clear timeout and message state when step changes
    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
        setShowNextStepMessage(false)
        setNextStepMessage(null)
        setIsTypingComplete(false)
    }, [currentStepIndex])

    // Calculate typing completion time as fallback (for single text strings)
    useEffect(() => {
        if (!showNextStepMessage || !nextStepMessage) return

        // Default typing configuration
        const variableSpeed = { min: 20, max: 50 }
        const initialDelay = 0
        const maxSpeed = variableSpeed.max
        const completionTime = initialDelay + nextStepMessage.length * maxSpeed

        // Set a fallback timeout in case onSentenceComplete doesn't fire
        const fallbackTimeout = setTimeout(() => {
            if (!isTypingComplete) {
                setIsTypingComplete(true)
            }
        }, completionTime)

        return () => clearTimeout(fallbackTimeout)
    }, [showNextStepMessage, nextStepMessage, isTypingComplete])

    // Move to next step when typing completes
    useEffect(() => {
        if (isTypingComplete && showNextStepMessage && nextStepMessage) {
            // Wait a brief moment after typing completes before moving to next step
            timeoutRef.current = setTimeout(() => {
                setShowNextStepMessage(false)
                setNextStepMessage(null)
                setIsTypingComplete(false)
                if (currentStepIndex < steps.length - 1) {
                    setCurrentStepIndex((prev) => prev + 1)
                }
                timeoutRef.current = null
            }, 500) // Small delay after typing completes
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }
        }
    }, [isTypingComplete, showNextStepMessage, nextStepMessage, currentStepIndex, steps.length])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [])

    const handleNext = (data?: Record<string, unknown>) => {
        // Save data for current step
        if (data !== undefined) {
            setStepData((prev) => {
                const updated = {
                    ...prev,
                    [currentStep]: data
                }

                return updated
            })
        }

        // Check if there's a post_input_field message from the preference question
        const postInputMessage = currentPreferenceQuestion?.post_input_field?.content

        // Check if there's a message for this step (prioritize post_input_field message)
        let message = postInputMessage || currentStepConfig?.nextStepMessage

        // Replace template variables in the message
        if (message) {
            // Replace {{traveler.name}} with actual traveler name
            message = message.replace(/\{\{traveler\.name\}\}/g, travelerName || '')
        }

        if (message && currentStepIndex < steps.length - 1) {
            // Show message with typing animation before moving to next step
            setNextStepMessage(message)
            setShowNextStepMessage(true)
            setIsTypingComplete(false)
            // The typing completion will be handled by the useEffect that watches isTypingComplete
        } else {
            // Move to next step immediately or complete
            if (currentStepIndex < steps.length - 1) {
                setCurrentStepIndex((prev) => prev + 1)
            } else {
                // All steps completed - pass all collected data
                // Use functional update to ensure we have the latest state including any just-saved data
                setStepData((prev) => {
                    // If data was just saved in this call, include it in the final collection
                    const finalStepData = data !== undefined ? { ...prev, [currentStep]: data } : prev
                    const allPreferences = Object.values(finalStepData).reduce(
                        (acc, stepDataItem) => ({ ...acc, ...stepDataItem }),
                        {} as Record<string, unknown>
                    )
                    // Call onComplete after state update
                    setTimeout(() => {
                        onComplete?.(allPreferences)
                    }, 0)
                    return finalStepData
                })
            }
        }
    }

    const handlePrevious = () => {
        // Clear any pending timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
        setShowNextStepMessage(false)
        setNextStepMessage(null)

        if (currentStepIndex > 0) {
            setCurrentStepIndex((prev) => prev - 1)
        }
    }

    if (!CurrentStepComponent) {
        return <div className="text-center py-4 text-grey_2">Step not found</div>
    }

    return (
        <div className="flex flex-col w-full bg-white ">
            {/* Progress Bar */}
            <div className=" pt-4 pb-3">
                <StepProgressBar
                    currentStep={currentStep}
                    totalSteps={effectiveTotalSteps}
                />
            </div>

            {/* Step Content */}
            <div className="flex-1 py-4 bg-white">
                {showNextStepMessage && nextStepMessage ? (
                    <div className="flex flex-col items-start justify-center py-8">
                        <AnimatedTypingText
                            text={nextStepMessage}
                            className="text-left text-grey_0 font-red-hat-display text-lg font-medium"
                            onSentenceComplete={() => setIsTypingComplete(true)}
                        />
                    </div>
                ) : (
                    <CurrentStepComponent
                        currentStep={currentStep}
                        totalSteps={effectiveTotalSteps}
                        onNext={handleNext}
                        onPrevious={currentStepIndex > 0 ? handlePrevious : undefined}
                        feature={feature}
                        preferenceQuestion={currentPreferenceQuestion}
                        selectedOptions={selectedOptions}
                        preselectedOptionId={preselectedOptionId}
                    />
                )}
            </div>
        </div>
    )
}

export default SteppedInputLayout
