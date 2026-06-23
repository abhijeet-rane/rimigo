import React from 'react'
import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import SectionTitle from '@/components/shared/Sections/SectionTitle'
import {
    BIKE_ICON,
    BOAT_ICON,
    BUS_ICON,
    CABLE_CAR_ICON,
    CAR_ICON,
    FERRY_ICON,
    METRO_ICON,
    SHUTTLE_ICON,
    TAXI_ICON,
    TRAIN_ICON,
    WALKING_ICON
} from '@/constants/thiingsIcons'
import { UITransportOptions } from '../components/HowToGetThere/TransportInformationCard'
import { createDescriptionLookup, isValidRecommendedOption, labelMap } from './transportUtils'

const SECTION_TITLE = 'How to get there'

type RawTransportOptions = {
    bus: boolean
    metro: boolean
    train: boolean
    taxi: boolean
    car: boolean
    bike: boolean
    cable_car: boolean
    walking: boolean
    shuttle_service: boolean
    boat_service: boolean
    ferry_service: boolean
    description: string
    recommended_option: string[]
    transport_option_description?: Array<{
        key: string
        description: string
    }>
}

// Optional map if you have icon URLs per mode
const transportIconUrlMap: Partial<Record<keyof RawTransportOptions, string>> = {
    bus: BUS_ICON,
    metro: METRO_ICON,
    train: TRAIN_ICON,
    taxi: TAXI_ICON,
    car: CAR_ICON,
    bike: BIKE_ICON,
    cable_car: CABLE_CAR_ICON,
    walking: WALKING_ICON,
    shuttle_service: SHUTTLE_ICON,
    boat_service: BOAT_ICON,
    ferry_service: FERRY_ICON
}

// Helper function to check if transport section should be shown
const shouldShowTransportSection = (transportData: RawTransportOptions | UITransportOptions): boolean => {
    // Check if it's raw transport options (has boolean flags)
    if ('bus' in transportData) {
        const rawData = transportData as RawTransportOptions
        // Check if all boolean transport options are false
        const allFalse =
            !rawData.bus &&
            !rawData.metro &&
            !rawData.train &&
            !rawData.taxi &&
            !rawData.car &&
            !rawData.bike &&
            !rawData.cable_car &&
            !rawData.walking &&
            !rawData.shuttle_service &&
            !rawData.boat_service &&
            !rawData.ferry_service

        // Check if description is null/empty
        const descriptionEmpty = !rawData.description || rawData.description.trim() === ''

        // Check if there are any valid recommended options (ones that exist in labelMap)
        const validRecommendedOptions =
            rawData.recommended_option && rawData.recommended_option.length > 0 ? rawData.recommended_option.filter(isValidRecommendedOption) : []
        const hasValidRecommendedOptions = validRecommendedOptions.length > 0

        // Don't show section if all conditions are true
        return !(allFalse && descriptionEmpty && !hasValidRecommendedOptions)
    }

    // It's already UI-adapted format
    const uiData = transportData as UITransportOptions
    const descriptionEmpty = !uiData.description || uiData.description.trim() === ''
    const recommendedEmpty = !uiData.recommended_option || uiData.recommended_option.length === 0
    const modesEmpty = !uiData.modes || uiData.modes.length === 0

    // Don't show section if description is empty, recommended is empty, and modes are empty
    return !(descriptionEmpty && recommendedEmpty && modesEmpty)
}

type TransportMode = {
    name: string
    iconUrl?: string
    isRecommended: boolean
    details: string
}

const adaptTransportDataForUI = (transportData: RawTransportOptions): { modes: TransportMode[]; description: string } => {
    const modes: TransportMode[] = []
    const recommendedSet = new Set(transportData.recommended_option.filter(isValidRecommendedOption))
    const modeDescriptionMap = createDescriptionLookup(transportData.transport_option_description)

    // Process each transport mode
    ;(
        ['bus', 'metro', 'train', 'taxi', 'car', 'bike', 'cable_car', 'walking', 'shuttle_service', 'boat_service', 'ferry_service'] as Array<
            keyof RawTransportOptions
        >
    ).forEach((key) => {
        if (transportData[key] === true) {
            const modeName = labelMap[key]
            const isRecommended = recommendedSet.has(key)
            modes.push({
                name: modeName,
                iconUrl: transportIconUrlMap[key],
                isRecommended,
                details: modeDescriptionMap.get(key) || ''
            })
        }
    })

    // Also add recommended modes that might not be in the boolean flags
    transportData.recommended_option.forEach((option) => {
        if (isValidRecommendedOption(option)) {
            const modeName = labelMap[option as keyof typeof labelMap]
            // Check if already added
            const exists = modes.some((m) => m.name === modeName)
            if (!exists) {
                modes.push({
                    name: modeName,
                    iconUrl: transportIconUrlMap[option as keyof typeof transportIconUrlMap],
                    isRecommended: true,
                    details: modeDescriptionMap.get(option) || ''
                })
            } else {
                // Mark as recommended if not already
                const mode = modes.find((m) => m.name === modeName)
                if (mode) {
                    mode.isRecommended = true
                    if (!mode.details) {
                        mode.details = modeDescriptionMap.get(option) || ''
                    }
                }
            }
        }
    })

    return {
        modes,
        description: transportData.description || ''
    }
}

const adaptUITransportData = (transportData: UITransportOptions): { modes: TransportMode[]; description: string } => {
    const modes: TransportMode[] = []
    const recommendedNames = new Set(transportData.recommended_option.map((opt) => opt.name))
    const modeDescriptionMap = createDescriptionLookup(transportData.transport_option_description)

    // Process recommended options first
    transportData.recommended_option.forEach((option) => {
        modes.push({
            name: option.name,
            iconUrl: option.iconUrl,
            isRecommended: true,
            details: modeDescriptionMap.get(option.name) || ''
        })
    })

    // Process other modes
    transportData.modes.forEach((mode) => {
        const exists = modes.some((m) => m.name === mode.name)
        if (!exists) {
            modes.push({
                name: mode.name,
                iconUrl: mode.iconUrl,
                isRecommended: recommendedNames.has(mode.name),
                details: modeDescriptionMap.get(mode.name) || ''
            })
        } else {
            // Mark as recommended if in recommended list
            const existingMode = modes.find((m) => m.name === mode.name)
            if (existingMode && recommendedNames.has(mode.name)) {
                existingMode.isRecommended = true
                if (!existingMode.details) {
                    existingMode.details = modeDescriptionMap.get(mode.name) || ''
                }
            }
        }
    })

    return {
        modes,
        description: transportData.description || ''
    }
}

const HowToGetThereSection = ({ transportOptions }: { transportOptions: RawTransportOptions | UITransportOptions }) => {
    // Check if we should show the section
    if (!shouldShowTransportSection(transportOptions)) {
        return null
    }

    // Adapt raw data to UI format if needed
    const { modes, description } =
        'bus' in transportOptions
            ? adaptTransportDataForUI(transportOptions as RawTransportOptions)
            : adaptUITransportData(transportOptions as UITransportOptions)

    // Only show if there's content to display
    if (modes.length === 0 && (!description || description.trim() === '')) {
        return null
    }

    // Sort modes: recommended first, then alphabetical
    const sortedModes = [...modes].sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1
        if (!a.isRecommended && b.isRecommended) return 1
        return a.name.localeCompare(b.name)
    })

    return (
        <GenericCard className="bg-white border-none px-0 py-0 max-md:px-[20px]">
            <div className="flex flex-col gap-4">
                {/* Section Title with dotted underline */}
                <div
                    className=""
                    style={{ borderColor: 'var(--color-grey-4, #e0e0e0)' }}>
                    <SectionTitle title={SECTION_TITLE} />
                </div>

                {/* Transport Options and Description Layout */}
                <div className="flex flex-col lg:flex-row gap-6 items-start mt-8 max-md:overflow-hidden max-md:border border-grey-4 max-md:rounded-[16px]">
                    {/* Transport Options Card */}
                    {sortedModes.length > 0 && (
                        <GenericCard className="w-full">
                            <div className="flex flex-col gap-0">
                                {sortedModes.map((mode, idx) => (
                                    <React.Fragment key={mode.name}>
                                        {idx > 0 && <div className="h-px bg-grey-4 my-4" />}
                                        <div className="flex items-center gap-3">
                                            {mode.iconUrl && (
                                                <img
                                                    src={mode.iconUrl}
                                                    alt={mode.name}
                                                    className="w-12 h-12 object-contain shrink-0"
                                                />
                                            )}
                                            <div className="flex flex-col items-start gap-2 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <div className="font-red-hat-display font-bold text-[18px] leading-[18px] tracking-[-0.01em] ">
                                                        {mode.name}
                                                    </div>
                                                    {mode.isRecommended && (
                                                        <div className="rounded-2xl px-2 py-0.5 shrink-0 bg-primary-default-80 text-white">
                                                            <div className="text-primary-default font-red-hat-display font-bold text-[14px] leading-[14px] tracking-[-0.02em] line-height-[18px]">
                                                                Recommended
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {mode.details ? (
                                                    <div
                                                        style={{
                                                            fontFamily: 'Manrope',
                                                            fontSize: '14px',
                                                            fontWeight: 500,
                                                            color: 'var(--color-grey-2, #747474)',
                                                            letterSpacing: '-0.02em',
                                                            lineHeight: '18px'
                                                        }}>
                                                        {mode.details}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </GenericCard>
                    )}

                    {/* Description Card - Beside transport options */}
                    {/* {description && description.trim() && (
                        <div className="w-full lg:w-80 lg:shrink-0">
                            <div
                                className="rounded-lg p-4 bg-grey-5 border border-grey-4 h-full"
                                style={{
                                    fontFamily: 'Manrope',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: 'var(--color-grey-0, #101010)',
                                    lineHeight: '20px'
                                }}>
                                <div className="flex items-start gap-3">
                                    <div
                                        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-grey-0 text-white"
                                        style={{
                                            fontFamily: 'Red Hat Display'
                                        }}>
                                        i
                                    </div>
                                    <div className="flex-1">
                                        <SectionParagraphText
                                            text={description}
                                            textStyle={{
                                                color: 'var(--color-grey-0, #101010)',
                                                fontSize: '14px',
                                                fontFamily: 'Manrope',
                                                fontWeight: 500,
                                                lineHeight: '20px'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )} */}
                </div>
            </div>
        </GenericCard>
    )
}

export default HowToGetThereSection
