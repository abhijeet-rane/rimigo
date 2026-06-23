import React, { useState, useEffect, useCallback } from 'react'
import { Search, Check, Users, Utensils, IndianRupee, Calendar, Heart } from 'lucide-react'
import { fetchInteraction } from '@/api/ataAPI/ataApi'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ProgressDetails {
    current_step: string
    progress: ProgressStep[]
}

interface ProgressStep {
    key: string
    type: 'scanning' | 'db_search' | 'analyzing' | 'picking'
    ui_config: ScanningUIConfig | DBSearchUIConfig | AnalyzingUIConfig | PickingUIConfig
}

interface ScanningUIConfig {
    title: string
    description: string
    databaseText: string
    providersText: string
    providers: string[]
}

interface DBSearchUIConfig {
    title: string
    description: string
    queries: string[]
}

interface AnalyzingUIConfig {
    title: string
    description: string
    criteriaHeading: string
    chips: CriteriaChip[]
    progressText: string
}

interface PickingUIConfig {
    title: string
    description: string
    text: string
    pillIcon: string
}

interface CriteriaChip {
    text: string
    kind: 'default' | 'success' | 'warning' | 'error'
    icon: string
    imgSrc?: string
}

interface Interaction {
    id: string
    agent_id: string
    thread_id: string
    trip_id: string | null
    user_id: string | null
    space: string
    input_data: any
    output_data?: any
    output_status: 'queued' | 'in_progress' | 'completed' | 'failed'
    metadata: Record<string, any>
    created_at: string
    updated_at: string
    type: string
    sub_type: string
    progress_details?: ProgressDetails | null
}

interface BackendControlledProgressLoaderProps {
    agentId: string
    threadId: string
    interactionId: string
    onInteractionUpdate?: (interaction: Interaction) => void
    onComplete?: (interaction: Interaction) => void
    onError?: (error: Error) => void
    className?: string
    pollingInterval?: number // milliseconds, default 1500
}

// ============================================================================
// ICON MAPPING
// ============================================================================

// const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
//     users: Users,
//     utensils: Utensils,
//     check: Check,
//     rupee: IndianRupee,
//     calendar: Calendar,
//     heart: Heart
// }

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Calculate connector height based on step type and state
const getConnectorHeight = (step: ProgressStep, isActive: boolean, isCompleted: boolean): number => {
    if (isActive) {
        switch (step.type) {
            case 'scanning':
                return 130 // with sub-components
            case 'db_search':
                return 190 // with query list
            case 'analyzing':
                return 234 // with criteria chips
            case 'picking':
                return 80 // with selection component
            default:
                return 48
        }
    } else if (isCompleted) {
        switch (step.type) {
            case 'scanning':
                return 34
            case 'db_search':
                return 34
            case 'analyzing':
                return 34
            case 'picking':
                return 34
            default:
                return 38
        }
    }
    return 40 // default/future steps
}

// ============================================================================
// STEP COMPONENTS (matching OutputLoadingComponent exactly)
// ============================================================================

const ScanningStepContent: React.FC<{ config: ScanningUIConfig }> = ({ config }) => {
    const hasDatabaseText = config.databaseText && config.databaseText.trim().length > 0
    const hasProviders = config.providers && config.providers.length > 0 && config.providersText && config.providersText.trim().length > 0

    if (!hasDatabaseText && !hasProviders) {
        return null
    }

    return (
        <div className="space-y-0">
            {/* Database Analysis Pill */}
            {hasDatabaseText && (
                <div className="flex items-center gap-3 bg-white rounded-[8px] px-4 py-3 w-fit">
                    <div className="">
                        <Search className="w-5 h-5 text-grey_2" />
                    </div>
                    <span className="text-[12px] font-semibold tracking-[-0.24px] text-grey_1 font-manrope">{config.databaseText}</span>
                </div>
            )}

            {/* Providers Consultation Pill */}
            {hasProviders && (
                <div className="flex items-center gap-2 bg-white rounded-[8px] px-4 py-2 w-fit">
                    <div className="flex items-center gap-1">
                        {config.providers.map((src, i) => (
                            <img
                                key={i}
                                src={src}
                                alt={`provider-${i}`}
                                className="w-5 h-5 rounded-full"
                            />
                        ))}
                    </div>
                    <span className="text-[12px] font-semibold tracking-[-0.24px] text-grey_1 font-manrope">{config.providersText}</span>
                </div>
            )}
        </div>
    )
}

const DBSearchStepContent: React.FC<{ config: DBSearchUIConfig }> = ({ config }) => {
    const hasQueries = config.queries && config.queries.length > 0

    if (!hasQueries) {
        return null
    }

    return (
        <div className="space-y-2">
            {config.queries.map((query, idx) => (
                <div
                    key={idx}
                    className="flex items-start gap-1 bg-white rounded-[8px] px-4  w-fit">
                    <div className="">
                        <Search className="w-3 h-3 text-grey_2" />
                    </div>
                    <span className="text-[12px] font-medium tracking-[-0.24px] text-grey_1 font-manrope">{query}</span>
                </div>
            ))}
        </div>
    )
}

const AnalyzingStepContent: React.FC<{ config: AnalyzingUIConfig }> = ({ config }) => {
    const hasCriteria = config.criteriaHeading && config.chips && config.chips.length > 0
    const hasProgressText = config.progressText && config.progressText.trim().length > 0

    if (!hasCriteria && !hasProgressText) {
        return null
    }

    return (
        <div className="space-y-4">
            {/* YOUR CRITERIA Section */}
            {hasCriteria && (
                <div className="inline-flex flex-col items-start gap-2 p-3 rounded-[12px] border border-grey_4 bg-white">
                    <h4 className="text-[9px] font-extrabold text-grey_1 font-red-hat-display">{config.criteriaHeading}</h4>
                    <div className="w-full">
                        <div className="flex flex-wrap gap-2">
                            {config.chips.map((chip, idx) => {
                                const base = chip.kind === 'success' ? 'bg-green-100 border border-green-200' : 'bg-white border border-grey_4'

                                const iconEl = (() => {
                                    if (chip.icon === 'users') {
                                        return <Users className="w-4 h-4 text-grey_2" />
                                    } else if (chip.icon === 'utensils') {
                                        return <Utensils className="w-4 h-4 text-grey_2" />
                                    } else if (chip.icon === 'rupee') {
                                        return <IndianRupee className="w-4 h-4 text-grey_2" />
                                    } else if (chip.icon === 'calendar') {
                                        return <Calendar className="w-4 h-4 text-grey_2" />
                                    } else if (chip.icon === 'heart') {
                                        return <Heart className="w-4 h-4 text-grey_2" />
                                    } else if (chip.imgSrc) {
                                        return (
                                            <img
                                                src={chip.imgSrc}
                                                alt="chip"
                                                className="w-4 h-4"
                                            />
                                        )
                                    } else {
                                        return <Check className="w-4 h-4 text-green-600" />
                                    }
                                })()

                                return (
                                    <div
                                        key={idx}
                                        className={`flex items-center gap-2 ${base} px-3 py-2 rounded-full`}>
                                        {iconEl}
                                        <span className="text-sm text-grey_0">{chip.text?.replace(/\$/g, '') || chip.text}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Indicator */}
            {hasProgressText && (
                <div className="flex items-center gap-3">
                    <div
                        className="w-[18px] h-[18px] border border-primary-default rounded-full animate-pulse"
                        style={{ borderWidth: 2 }}></div>
                    <span className="text-[12px] leading-[18px] tracking-[-0.24px] font-bold text-grey_1 font-manrope">{config.progressText}</span>
                </div>
            )}
        </div>
    )
}

const PickingStepContent: React.FC<{ config: PickingUIConfig }> = ({ config }) => {
    const hasText = config.text && config.text.trim().length > 0
    const hasPillIcon = config.pillIcon && config.pillIcon.trim().length > 0

    if (!hasText && !hasPillIcon) {
        return null
    }

    return (
        <div className="space-y-4">
            {/* Picking Pill */}
            {(hasText || hasPillIcon) && (
                <div className="flex items-center gap-3 bg-white rounded-[8px] px-4 py-3 w-fit">
                    {hasPillIcon && (
                        <img
                            src={config.pillIcon}
                            alt="icon"
                            className="w-5 h-5"
                        />
                    )}
                    {hasText && <span className="text-[12px] font-semibold tracking-[-0.24px] text-grey_1 font-manrope">{config.text}</span>}
                </div>
            )}
        </div>
    )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const PollingInteractionLoader: React.FC<BackendControlledProgressLoaderProps> = ({
    agentId,
    threadId,
    interactionId,
    onInteractionUpdate,
    onComplete,
    onError,
    className = '',
    pollingInterval = 1500
}) => {
    const [interaction, setInteraction] = useState<Interaction | null>(null)
    const [error, setError] = useState<Error | null>(null)
    const [isPolling, setIsPolling] = useState(true)

    const fetchData = useCallback(async () => {
        try {
            const data = await fetchInteraction(agentId, threadId, interactionId)
            setInteraction(data)
            setError(null)

            onInteractionUpdate?.(data)

            if (data.output_status === 'completed' || data.output_status === 'failed') {
                setIsPolling(false)
                if (data.output_status === 'completed') {
                    onComplete?.(data)
                }
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to fetch interaction')
            setError(error)
            onError?.(error)
            setIsPolling(false)
        }
    }, [agentId, threadId, interactionId, onInteractionUpdate, onComplete, onError])

    useEffect(() => {
        if (!isPolling) return
        fetchData()
        const pollTimer = setInterval(fetchData, pollingInterval)
        return () => clearInterval(pollTimer)
    }, [isPolling, pollingInterval, fetchData])

    /* -------------------------------- ERROR -------------------------------- */
    if (error) {
        return (
            <div className="flex items-center justify-center w-full h-full">
                <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-[520px] w-full">
                    <p className="font-semibold text-red-600">Error loading progress</p>
                    <p className="text-sm mt-2 text-grey_2">{error.message}</p>
                </div>
            </div>
        )
    }

    /* ------------------------------ LOADING -------------------------------- */
    if (!interaction) {
        return (
            <div className="flex items-center justify-center w-full h-full">
                <div className="bg-white rounded-2xl border border-primary-default-12 shadow-[0_24px_60px_rgba(44,25,77,0.08)] p-6 flex items-center gap-3">
                    <img
                        src="/icons/compass.png"
                        className="w-[18px] h-[18px] animate-compass"
                    />
                    <span className="text-grey_1 font-medium">Preparing your itinerary…</span>
                </div>
            </div>
        )
    }

    const progressDetails = interaction.progress_details
    if (!progressDetails?.progress?.length) {
        return (
            <div className="flex items-center justify-center w-full h-full">
                <div className="bg-white rounded-2xl border border-primary-default-12 shadow-lg p-6">
                    <span className="text-grey_2">Processing your request…</span>
                </div>
            </div>
        )
    }

    const { current_step, progress } = progressDetails
    const currentStepIndex = progress.findIndex((step) => step.key === current_step)

    /* ------------------------------ MAIN UI -------------------------------- */
    return (
        <div className="flex w-full min-h-screen items-center justify-center    px-4">
            <div className="w-full max-w-[720px] flex flex-col gap-6  ">
                {/* Header */}
                <div className="text-center">
                    <div className="text-sm font-semibold text-primary-default mb-1">🚀 Working our magic</div>
                    <h2 className="text-2xl font-semibold text-header-black">Building your itinerary</h2>
                    <p className="text-sm text-grey_2 mt-1">We are carefully curating each step based on your preferences.</p>
                </div>

                {/* Card */}
                <div
                    className={`bg-white/90 backdrop-blur-sm rounded-2xl border border-primary-default-12 shadow-[0_24px_60px_rgba(44,25,77,0.08)] p-6 ${className}`}>
                    <div className="flex flex-col gap-1">
                        {progress.map((step, index) => {
                            const isLast = index === progress.length - 1
                            const isActive =
                                index === currentStepIndex && (interaction.output_status === 'in_progress' || interaction.output_status === 'queued')
                            const isCompleted = index < currentStepIndex || interaction.output_status === 'completed'
                            const connectorHeightPx = getConnectorHeight(step, isActive, isCompleted)
                            const config = step.ui_config as any

                            return (
                                <div
                                    key={step.key}
                                    className="flex items-start">
                                    {/* Left icon & connector */}
                                    <div className="flex flex-col items-center mr-4 mt-1">
                                        <div>
                                            {isActive ? (
                                                <img
                                                    src="/icons/compass.png"
                                                    className="w-[18px] h-[18px] animate-compass"
                                                />
                                            ) : isCompleted ? (
                                                <div className="h-[18px] w-[18px] bg-secondary-green rounded-full flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            ) : (
                                                <div className="h-[18px] w-[18px] bg-grey_4 rounded-full" />
                                            )}
                                        </div>

                                        {!isLast && (
                                            <div
                                                className={`w-0.5 mt-2 ${isCompleted ? 'bg-green-500' : 'bg-grey_4'}`}
                                                style={{ height: connectorHeightPx }}
                                            />
                                        )}
                                    </div>

                                    {/* Right content */}
                                    <div className={`flex-1 ${isActive || isCompleted ? 'opacity-100' : 'opacity-60'}`}>
                                        <h3 className="text-[14px] font-semibold text-grey_0 ">{config.title}</h3>
                                        <p className="text-[12px] text-grey_2 mb-4">{config.description}</p>

                                        {isActive && (
                                            <>
                                                {step.type === 'scanning' && <ScanningStepContent config={config} />}
                                                {step.type === 'db_search' && <DBSearchStepContent config={config} />}
                                                {step.type === 'analyzing' && <AnalyzingStepContent config={config} />}
                                                {step.type === 'picking' && <PickingStepContent config={config} />}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <span className="text-xs text-grey_3 text-center">This might take up to 10 minutes.</span>
            </div>
        </div>
    )
}

export default PollingInteractionLoader
