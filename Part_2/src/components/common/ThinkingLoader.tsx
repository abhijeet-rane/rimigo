import React, { useState, useEffect } from 'react'
import { Compass, Search, Check, Users, Utensils, IndianRupee } from 'lucide-react'
import { PROVIDER_LOGOS } from '@/constants/providerLogos'

type ChipIcon = 'users' | 'utensils' | 'rupee' | 'check' | 'img'

interface CriteriaChipConfig {
    text: string
    kind: 'default' | 'success'
    icon?: ChipIcon
    imgSrc?: string
}

interface UIConfig {
    scanning: {
        title: string
        description: string
        databaseText: string
        providersText: string
        providers?: string[]
    }
    analyzing: {
        title: string
        description: string
        criteriaHeading: string
        chips: CriteriaChipConfig[]
        progressText: string
    }
    picking: {
        title: string
        description: string
        text: string
        pillIcon?: string
    }
}

interface OutputLoadingComponentProps {
    status: 'queued' | 'in_progress' | 'completed'
    className?: string
    uiConfig?: UIConfig
    elapsedMs?: number
}

const OutputLoadingComponent: React.FC<OutputLoadingComponentProps> = ({ status, className = '', uiConfig, elapsedMs = 0 }) => {
    const [currentStep, setCurrentStep] = useState(0)

    const defaultConfig: UIConfig = {
        scanning: {
            title: 'Scanning the web and our knowledge base',
            description:
                "We're looking at official websites, blogs, user reviews, forums etc. to find out relevant information. We're also sifting through our database for the same.",
            databaseText: 'Analysing 100+ insights from our database',
            providersText: 'Consulting several tour providers and reading user reviews',
            providers: [PROVIDER_LOGOS.AGODA, PROVIDER_LOGOS.BOOKING, PROVIDER_LOGOS.TRIP_COM]
        },
        analyzing: {
            title: 'Analysing against your criteria',
            description: 'Now we are matching the information against your criteria to filter out the most suitable options for you.',
            criteriaHeading: 'YOUR CRITERIA',
            chips: [
                { text: '2 adults, 2 children', kind: 'default', icon: 'users' },
                { text: 'Vegetarian (Indian, if available)', kind: 'default', icon: 'utensils' },
                { text: 'Kids want characters', kind: 'success', icon: 'check' },
                { text: 'Needs a stroller', kind: 'success', icon: 'check' },
                { text: 'Budget sensitive', kind: 'default', icon: 'rupee' }
            ],
            progressText: 'Matching 12 options against your criteria'
        },
        picking: {
            title: 'Picking the best choice based on our expertise',
            description: 'Our experts are selecting the most suitable options for your needs.',
            text: 'Deciding which option is the most suitable',
            pillIcon: '/icons/wand.png'
        }
    }

    const cfg = uiConfig ?? defaultConfig

    const steps = [
        {
            id: 'scanning',
            title: cfg.scanning.title,
            description: cfg.scanning.description,
            icon: Compass,
            duration: 5000 // 30 seconds
        },
        {
            id: 'analyzing',
            title: cfg.analyzing.title,
            description: cfg.analyzing.description,
            icon: Compass,
            duration: 8000 // 10 seconds
        },
        {
            id: 'picking',
            title: cfg.picking.title,
            description: cfg.picking.description,
            icon: Compass,
            duration: Infinity // Infinity
        }
    ]

    useEffect(() => {
        if (status === 'in_progress' || status === 'queued') {
            // Determine starting step from elapsed time
            const d0 = steps[0].duration
            const d1 = steps[1].duration
            let startStep = 0
            let remToStep1 = Math.max(0, d0 - elapsedMs)
            let remToStep2 = Math.max(0, d0 + d1 - elapsedMs)

            if (elapsedMs >= d0 + d1) {
                startStep = 2
            } else if (elapsedMs >= d0) {
                startStep = 1
            } else {
                startStep = 0
            }

            setCurrentStep(startStep)

            // Schedule transitions based on remaining time
            const toStep1 = startStep <= 0 ? remToStep1 : startStep === 1 ? 0 : 0
            const toStep2 = startStep <= 1 ? remToStep2 : 0

            let t1: ReturnType<typeof setTimeout> | undefined
            let t2: ReturnType<typeof setTimeout> | undefined

            if (startStep === 0 && toStep1 > 0) {
                t1 = setTimeout(() => setCurrentStep(1), toStep1)
            }
            if (startStep <= 1 && toStep2 > 0) {
                t2 = setTimeout(() => setCurrentStep(2), toStep2)
            }

            return () => {
                if (t1) clearTimeout(t1)
                if (t2) clearTimeout(t2)
            }
        } else if (status === 'completed') {
            setCurrentStep(2) // All steps completed
        } else {
            setCurrentStep(0) // Queued state
        }
    }, [status, elapsedMs])

    return (
        <div className={`bg-grey-6 rounded-2xl p-6 w-full   md:max-w-[68vw] ${className}`}>
            <div className="flex w-full">
                {/* Timeline */}
                <div className="flex flex-col items-center mr-6">
                    {steps.map((step, index) => {
                        const isLast = index === steps.length - 1
                        const isActive = index === currentStep
                        const isCompleted = index < currentStep || status === 'completed'

                        // Dynamic connector height based on content state
                        // Use pixel values with smooth height transition
                        let connectorHeightPx = 48 // default ~ h-16
                        if (isActive && step.id === 'scanning') {
                            connectorHeightPx = 164 // with sub-components
                        } else if (isActive && step.id === 'analyzing') {
                            connectorHeightPx = 234 // with criteria chips
                        } else if (isActive && step.id === 'picking') {
                            connectorHeightPx = 80 // with selection component
                        } else if (isCompleted) {
                            // Completed steps retain reasonable spacing
                            if (step.id === 'scanning') {
                                connectorHeightPx = 34
                            } else if (step.id === 'analyzing') {
                                connectorHeightPx = 44
                            } else {
                                connectorHeightPx = 64
                            }
                        }

                        return (
                            <div
                                key={step.id}
                                className="flex flex-col items-center pt-1">
                                <div className={`flex items-center justify-center transition-all duration-300`}>
                                    {isActive ? (
                                        <img
                                            src={'/icons/compass.png'}
                                            alt={step.id}
                                            className={`w-8 h-8 animate-compass`}
                                        />
                                    ) : isCompleted ? (
                                        <div className="h-8 w-8 bg-secondary-green rounded-full flex items-center justify-center">
                                            <Check
                                                color="white"
                                                className={`w-6 h-6`}
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-8 w-8 bg-grey_4 rounded-full"></div>
                                    )}
                                </div>

                                {/* Connecting Line */}
                                {!isLast && (
                                    <div
                                        className={`w-0.5 mt-2 ${isCompleted ? 'bg-green-500' : 'bg-grey_4'} transition-[height] duration-500 ease-out`}
                                        style={{ height: connectorHeightPx }}
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Content */}
                <div className="flex-1">
                    {steps.map((step, index) => {
                        const isActive = index === currentStep && (status === 'in_progress' || status == 'queued')
                        const isCompleted = index < currentStep || status === 'completed'

                        return (
                            <div
                                key={step.id}
                                className={`mb-8 last:mb-0 transition-all duration-500 ease-out ${
                                    isActive ? 'opacity-100 translate-y-0' : isCompleted ? 'opacity-100 translate-y-0' : 'opacity-60 translate-y-1'
                                }`}>
                                {/* Step Title */}
                                <h3
                                    className={`text-lg font-semibold mb-2 ${
                                        isActive ? 'text-grey_0' : isCompleted ? 'text-grey_0' : 'text-grey_2'
                                    }`}>
                                    {step.title}
                                </h3>

                                {/* Step Description */}
                                <p className="text-sm text-grey_2 mb-4">{step.description}</p>

                                {/* In-Progress Components for each step */}
                                {isActive && step.id === 'scanning' && (
                                    <div className="space-y-4 w-full">
                                        {/* Database Analysis Pill */}
                                        <div className="flex items-center gap-3 bg-white rounded-[8px] px-4 py-3 w-full">
                                            <Search className="w-5 h-5 text-grey_2 shrink-0" />
                                            <span className="text-[12px] font-semibold tracking-[-0.24px] text-grey_1 font-manrope">
                                                {cfg.scanning.databaseText}
                                            </span>
                                        </div>

                                        {/* Providers Consultation Pill */}
                                        <div className="flex items-center gap-3 bg-grey-5 rounded-[8px] px-4 py-3 w-full">
                                            <div className="flex items-center gap-1 shrink-0">
                                                {(cfg.scanning.providers ?? []).map((src, i) => (
                                                    <img
                                                        key={i}
                                                        src={src}
                                                        alt={`provider-${i}`}
                                                        className="w-5 h-5 rounded-full"
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[12px] font-semibold tracking-[-0.24px] text-grey_1 font-manrope">
                                                {cfg.scanning.providersText}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Analyzing Step - In Progress Component */}
                                {isActive && step.id === 'analyzing' && (
                                    <div className="space-y-4 w-full">
                                        {/* YOUR CRITERIA Section */}
                                        <div className="flex flex-col items-start gap-2 p-3 rounded-[12px] border border-grey_4 bg-white w-full">
                                            <h4 className="text-[9px] font-extrabold text-grey_1 font-red-hat-display">
                                                {cfg.analyzing.criteriaHeading}
                                            </h4>
                                            <div className="w-full">
                                                <div className="flex flex-wrap gap-2">
                                                    {cfg.analyzing.chips.map((chip, idx) => {
                                                        const base =
                                                            chip.kind === 'success'
                                                                ? 'bg-green-100 border border-green-200'
                                                                : 'bg-white border border-grey_4'
                                                        const iconEl =
                                                            chip.icon === 'users' ? (
                                                                <Users className="w-4 h-4 text-grey_2" />
                                                            ) : chip.icon === 'utensils' ? (
                                                                <Utensils className="w-4 h-4 text-grey_2" />
                                                            ) : chip.icon === 'rupee' ? (
                                                                <IndianRupee className="w-4 h-4 text-grey_2" />
                                                            ) : chip.icon === 'img' && chip.imgSrc ? (
                                                                <img
                                                                    src={chip.imgSrc}
                                                                    alt="chip"
                                                                    className="w-4 h-4"
                                                                />
                                                            ) : (
                                                                <Check className="w-4 h-4 text-green-600" />
                                                            )
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className={`flex items-center gap-2 ${base} px-3 py-2 rounded-full`}>
                                                                {iconEl}
                                                                <span className="text-sm text-grey_0">{chip.text}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Progress Indicator */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 border border-primary-default rounded-full animate-pulse"></div>
                                            <span className="text-[12px] leading-[18px] tracking-[-0.24px] font-bold text-grey_1 font-manrope">
                                                {cfg.analyzing.progressText}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Picking Step - In Progress Component */}
                                {isActive && step.id === 'picking' && (
                                    <div className="space-y-4 w-full">
                                        {/* Picking Pill */}
                                        <div className="flex items-center gap-3 bg-white rounded-[8px] px-4 py-3 w-full">
                                            <img
                                                src={cfg.picking.pillIcon ?? '/icons/wand.png'}
                                                alt="wand"
                                                className="w-5 h-5"
                                            />
                                            <span className="text-[12px] font-semibold tracking-[-0.24px] text-grey_1 font-manrope">
                                                {cfg.picking.text}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default OutputLoadingComponent
