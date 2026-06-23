import React, { useEffect, useMemo, useState } from 'react'
import ThinkingLoader from '@/components/common/ThinkingLoader'
import { PROVIDER_LOGOS } from '@/constants/providerLogos'
import { DEFAULT_GROUP_TYPES, DEFAULT_LOCATION_PREFERENCES, DEFAULT_PURPOSE_TYPES } from '@/components/common/SearchBar/modals/PreferencesModal'

type CriteriaIcon = 'users' | 'utensils' | 'rupee' | 'check' | 'img'

type CriteriaChip = {
    text: string
    kind: 'default' | 'success'
    icon?: CriteriaIcon
    imgSrc?: string
}

export interface LoaderPreferences {
    guestSummary?: string
    groupType?: string
    travelPurpose?: string
    locationPreferences?: string[]
    budgetSummary?: string
}

interface ProgressStepsLoaderProps {
    cityName?: string
    preferences?: LoaderPreferences
    /**
     * Current SSE step from the rates_histogram stream. When set to one of the
     * discovery steps (discovering_hotels, discovering_hotels_in_progress,
     * saving_hotels) the first phase swaps from `scanning` to `discovering`.
     */
    progressStep?: string | null
}

const DISCOVERY_STEPS = new Set<string>([
    'discovering_hotels',
    'discovering_hotels_in_progress',
    'saving_hotels',
])

const discoveryStepMessage = (step?: string | null): string => {
    switch (step) {
        case 'saving_hotels':
            return 'Indexing freshly-discovered hotels'
        case 'discovering_hotels_in_progress':
            return 'Searching trusted aggregators for nearby hotels'
        case 'discovering_hotels':
        default:
            return 'Finding hotels near this destination'
    }
}

const humanizeValue = <T extends { value: string; label: string }>(collection: T[], value?: string | null) => {
    if (!value) return undefined
    return collection.find((item) => item.value === value)?.label
}

const ProgressStepsLoader: React.FC<ProgressStepsLoaderProps> = ({ cityName, preferences, progressStep }) => {
    const [status, setStatus] = useState<'queued' | 'in_progress' | 'completed'>('queued')
    const [elapsedMs, setElapsedMs] = useState(0)

    useEffect(() => {
        setStatus('in_progress')
        const start = performance.now()
        const interval = setInterval(() => {
            setElapsedMs(Math.floor(performance.now() - start))
        }, 300)
        return () => {
            clearInterval(interval)
        }
    }, [])

    const chips = useMemo<CriteriaChip[]>(() => {
        if (!preferences) return []

        const list: CriteriaChip[] = []

        if (preferences.guestSummary) {
            list.push({
                text: preferences.guestSummary,
                kind: 'default',
                icon: 'users'
            })
        }

        const groupTypeLabel = humanizeValue(DEFAULT_GROUP_TYPES, preferences.groupType)
        if (groupTypeLabel) {
            list.push({
                text: groupTypeLabel,
                kind: 'default',
                icon: 'check'
            })
        }

        const travelPurposeLabel = humanizeValue(DEFAULT_PURPOSE_TYPES, preferences.travelPurpose)
        if (travelPurposeLabel) {
            list.push({
                text: travelPurposeLabel,
                kind: 'default',
                icon: 'check'
            })
        }

        preferences.locationPreferences?.forEach((value) => {
            const pref = DEFAULT_LOCATION_PREFERENCES.find((item) => item.value === value)
            if (pref) {
                list.push({
                    text: pref.label,
                    kind: 'default',
                    icon: 'check'
                })
            }
        })

        if (preferences.budgetSummary) {
            list.push({
                text: preferences.budgetSummary,
                kind: 'default',
                icon: 'rupee'
            })
        }

        return list
    }, [preferences])

    const uiConfig = useMemo(() => {
        const citySuffix = cityName ? ` in ${cityName}` : ''
        const stepFriendly = discoveryStepMessage(progressStep)

        const scanning = {
            title: 'Fetching the best rates',
            description: `We are looking at trusted aggregators and comparing live prices${citySuffix}.`,
            databaseText: 'Analysing 100+ insights from our stay knowledge base',
            providersText: 'Opening booking engines and fetching availability right now',
            providers: [PROVIDER_LOGOS.BOOKING, PROVIDER_LOGOS.AGODA, PROVIDER_LOGOS.TRIP_COM]
        }

        const discovering = {
            title: `Discovering hotels${citySuffix}`,
            description: `This is a new destination for us — we are finding hotels near${citySuffix || ' this city'} now.`,
            databaseText: stepFriendly,
            providersText: 'Opening booking engines to locate stays in this area',
            providers: [PROVIDER_LOGOS.BOOKING, PROVIDER_LOGOS.AGODA, PROVIDER_LOGOS.TRIP_COM]
        }

        return {
            scanning: progressStep && DISCOVERY_STEPS.has(progressStep) ? discovering : scanning,
            analyzing: {
                title: 'Matching with hotels in our database',
                description: 'We are validating each stay against the preferences you just shared.',
                criteriaHeading: 'YOUR PREFERENCES',
                chips,
                progressText:
                    chips.length > 0
                        ? `Matching ${chips.length} preference${chips.length > 1 ? 's' : ''} against curated stays`
                        : 'Matching your latest preferences'
            },
            picking: {
                title: 'Picking the best ones based on our expertise',
                description: 'Our curation engine is ranking the top stays for you.',
                text: 'Deciding which hotels best fit your vibe',
                pillIcon: '/icons/wand.png'
            }
        }
    }, [chips, cityName, progressStep])

    return (
        <div className="flex w-full h-full items-center justify-center">
            <div className="w-full max-w-[680px] flex flex-col gap-8 items-center max-md:p-5  md:items-start text-left">
                <div className="flex flex-col gap-3 items-center max-md:hidden justify-center w-full max-w-[680px]">
                    <div>
                        <span>🚀 </span>
                        <span className="stays-gradient-text">Working our magic</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-header-black">Curating awesome stays for you</h2>
                    <p className="text-sm text-grey_2 max-w-[420px]">
                        We will show only curated hotels reviewed by top experts{cityName ? ` in ${cityName}` : ''}.
                    </p>
                </div>
                <ThinkingLoader
                    status={status}
                    elapsedMs={elapsedMs}
                    uiConfig={uiConfig}
                    className="bg-white/90! backdrop-blur-sm border border-primary-default-12 shadow-[0_24px_60px_rgba(44,25,77,0.08)] text-left"
                />
                <span className="text-xs font-medium text-grey_3">This might take up to 30 seconds.</span>
            </div>
        </div>
    )
}

export default ProgressStepsLoader
