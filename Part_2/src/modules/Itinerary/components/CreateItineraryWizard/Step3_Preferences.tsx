import { useState, useMemo, useEffect, useRef } from 'react'
import { ArrowLeft, Sparkles, User, Baby } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { RenderGroupControl } from '../GroupTypeQuestion'
// BudgetRangeCards removed — only nightly budget inputs remain
import TravelStyleChips from './components/TravelStyleChips'
import { StepProps, DIETARY_OPTIONS } from './types'
import FormSectionCard from '@/components/shared/FormSectionCard'
import { useIsMobile } from '../../hooks/ItineraryHook'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { fetchItineraryPrompts } from '@/api/itineraryApi'
import { WIZARD_CONTENT_MAX_WIDTH } from '@/modules/Tripboard/components/createFlow/wizardConstants'
import CustomShimmer from '@/components/shared/Shimmer'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'
import { formatDateToYMD } from '@/utils/dateUtils'

// Fallback prompts when API fails or returns empty (inspired by HotelDetail FloatingQuestions)
const FALLBACK_ITINERARY_PROMPTS = [
    'I want a mix of culture, food and relaxation with some adventure.',
    'As a solo traveler, I want to explore local markets and hidden gems.',
    'I want a family-friendly trip with activities for kids and relaxing stays.',
    'I’m looking for a romantic getaway with great views and dining.'
]

const Step3Preferences = ({ state, onChange, onNext, onBack, isSubmitting = false, submitButtonText, overrideCountries, renderAfterContent, hideGroupControl = false }: StepProps & { submitButtonText?: string; overrideCountries?: { id: string; name?: string }[]; renderAfterContent?: React.ReactNode; hideGroupControl?: boolean }) => {
    const isMobile = useIsMobile()
    const { trackButtonClickCustom } = usePostHog()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const [purposeFocused, setPurposeFocused] = useState(false)
    const [budgetError, setBudgetError] = useState<string | null>(null)
    const [dietaryError, setDietaryError] = useState<string | null>(null)
    const dietaryRef = useRef<HTMLDivElement>(null)
    const budgetRef = useRef<HTMLDivElement>(null)

    // Local strings for budget inputs so users can type freely (e.g. "1" then "1000"); sync from parent when tier changes
    const [minBudgetInput, setMinBudgetInput] = useState(() => String(state.stayBudgetRange.min))
    const [maxBudgetInput, setMaxBudgetInput] = useState(() => String(state.stayBudgetRange.max))
    useEffect(() => {
        setMinBudgetInput(String(state.stayBudgetRange.min))
        setMaxBudgetInput(String(state.stayBudgetRange.max))
    }, [state.stayBudgetRange.min, state.stayBudgetRange.max])

    // Build payload for itinerary floating prompts (page name: itinerary)
    // group_type and purpose_type from get_trip_basic (activeTrip.tripProfile); fallback to wizard state
    const promptPayload = useMemo(() => {
        const cities = state.cities.map((c) => c.city.cityName).filter(Boolean) as string[]
        const countries = overrideCountries
            ? (overrideCountries.map(c => c.name).filter(Boolean) as string[])
            : ((activeTrip?.final_destination_countries
                ?.map((c) => (typeof c === 'string' ? c : (c as { name?: string }).name))
                .filter(Boolean) as string[]) ?? [])
        const start = state.startDate
        const end = state.endDate
        if (!start || !end || cities.length === 0) return null
        const groupTypeFromTrip = activeTrip?.tripProfile?.group_type
        const purposeFromTrip = activeTrip?.tripProfile?.travel_purpose
        const groupType =
            groupTypeFromTrip && groupTypeFromTrip.trim() !== ''
                ? groupTypeFromTrip
                : state.groupSetup.adults === 1 && state.groupSetup.children === 0
                  ? 'solo_traveler'
                  : state.groupSetup.adults === 2 && state.groupSetup.children === 0
                    ? 'couple'
                    : 'group'
        const purposeType = purposeFromTrip && purposeFromTrip.trim() !== '' ? purposeFromTrip : 'itinerary'
        return {
            cities,
            countries: countries.length > 0 ? countries : [''],
            start_date: formatDateToYMD(start) ?? '',
            end_date: formatDateToYMD(end) ?? '',
            group_type: groupType,
            purpose_type: purposeType
        }
    }, [
        state.cities,
        state.startDate,
        state.endDate,
        state.groupSetup,
        activeTrip?.final_destination_countries,
        activeTrip?.tripProfile?.group_type,
        activeTrip?.tripProfile?.travel_purpose,
        overrideCountries
    ])

    const {
        data: promptResponse,
        isLoading: isPromptsLoading,
        isError: isPromptsError
    } = useQuery({
        queryKey: [
            'itineraryPrompts',
            'itinerary',
            promptPayload?.cities,
            promptPayload?.start_date,
            promptPayload?.end_date,
            promptPayload?.group_type,
            promptPayload?.purpose_type
        ],
        queryFn: () => fetchItineraryPrompts(promptPayload!),
        enabled: !!promptPayload && promptPayload.cities.length > 0,
        refetchInterval: (query) => {
            const currentData = query.state.data
            if (!currentData) return 2000
            return currentData.status === 'completed' || currentData.status === 'failed' ? false : 2000
        },
        refetchIntervalInBackground: true,
        staleTime: 0,
        gcTime: 0
    })

    // Use API prompts when completed; otherwise show fallback (no payload, loading failed, or empty result)
    const floatingPrompts = useMemo(() => {
        const fromApi = promptResponse?.result?.floating_prompt_questions
        if (fromApi && fromApi.length > 0) return fromApi
        if (!promptPayload || isPromptsError || (promptResponse && (!fromApi || fromApi.length === 0))) {
            return FALLBACK_ITINERARY_PROMPTS
        }
        return []
    }, [promptPayload, promptResponse?.result?.floating_prompt_questions, isPromptsError])

    const updateGroupSetup = (key: 'adults' | 'children' | 'infants', value: number) => {
        const updated = { ...state.groupSetup, [key]: value }

        // Sync children_age array length
        if (key === 'children') {
            if (value > updated.children_age.length) {
                const newAges = [...updated.children_age]
                for (let i = updated.children_age.length; i < value; i++) {
                    newAges.push(5)
                }
                updated.children_age = newAges
            } else {
                updated.children_age = updated.children_age.slice(0, value)
            }
        }

        onChange({ groupSetup: updated })
        trackButtonClickCustom({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'group_size_change',
            buttonAction: 'change',
            extra: { adults: updated.adults, children: updated.children, infants: updated.infants }
        })
    }

    const isStep3Complete = state.dietaryRestrictions.length > 0

    // The backend caps ``user_text_input`` / ``purpose`` at 4000 chars.
    // The wizard appends travel styles + route text to the user's typed
    // preferences before sending. Compute the appended portion so we can
    // show the user a real-time combined count against the true 4000 limit.
    const TOTAL_LIMIT = 4000
    const appendedParts = useMemo(() => {
        const parts: string[] = []
        if (state.travelStyles.length > 0) {
            parts.push(`Travel style preferences: ${state.travelStyles.join(', ')}.`)
        }
        if (state.aiRouteOptimize) {
            parts.push('Please optimize the route order between cities for minimal travel time.')
        }
        return parts
    }, [state.travelStyles, state.aiRouteOptimize])
    const appendedText = appendedParts.length > 0 ? ' ' + appendedParts.join(' ') : ''
    const combinedLength = state.preferences.length + appendedText.length
    const remainingForUser = Math.max(0, TOTAL_LIMIT - appendedText.length)

    const handlePreferencesChange = (value: string) => {
        if (value.length <= remainingForUser) return onChange({ preferences: value })
        onChange({ preferences: value.slice(0, remainingForUser) })
    }

    const handleNext = () => {
        const dietaryInvalid = state.dietaryRestrictions.length === 0

        setBudgetError(null)
        setDietaryError(dietaryInvalid ? 'Please select at least one dietary option (or None)' : null)

        if (dietaryInvalid) {
            setTimeout(() => {
                dietaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 100)
            return
        }

        onNext()
    }

    return (
        <div className={`mt-6 sm:mt-10 ${WIZARD_CONTENT_MAX_WIDTH} mx-auto pb-20`}>
            {/* Who's traveling */}
            {!hideGroupControl && (
            <div className="bg-white rounded-2xl border border-grey-4/50 shadow-sm p-5 sm:p-6 mb-5">
                <h3 className="text-[18px] font-red-hat-display font-medium text-grey-0 mb-0.5">Who's traveling?</h3>
                <div className="space-y-4">
                    {RenderGroupControl(
                        'Adults',
                        'Ages 13+',
                        <User
                            size={18}
                            className="text-grey-0"
                        />,
                        state.groupSetup.adults,
                        (val) => updateGroupSetup('adults', val),
                        1
                    )}
                    {RenderGroupControl(
                        'Children',
                        'Ages 2–12',
                        <User
                            size={16}
                            className="text-grey-0"
                        />,
                        state.groupSetup.children,
                        (val) => updateGroupSetup('children', val),
                        0
                    )}
                    {RenderGroupControl(
                        'Infants',
                        'Under 2',
                        <Baby
                            size={16}
                            className="text-grey-0"
                        />,
                        state.groupSetup.infants,
                        (val) => updateGroupSetup('infants', val),
                        0
                    )}
                </div>
            </div>
            )}

            {/* Budget */}
            <FormSectionCard error={budgetError} ref={budgetRef} className="mb-5">
                <p className="text-[18px] font-medium text-grey-0 font-red-hat-display">Preferred Stay Budget Range</p>
                {(
                    <div>
                        <div className="flex items-center gap-3 mt-2">
                            <div className="flex-1">
                                <label className="text-[11px] text-grey-2 font-manrope mb-1 block">Min</label>
                                <div className="flex items-center gap-1 rounded-lg border border-grey-4 px-3 py-2">
                                    <span className="text-[13px] text-grey-2 font-manrope">{'\u20B9'}</span>
                                    <input
                                        type="number"
                                        min={500}
                                        max={Math.max(500, state.stayBudgetRange.max - 500)}
                                        step={500}
                                        value={minBudgetInput}
                                        onChange={(e) => setMinBudgetInput(e.target.value)}
                                        onBlur={() => {
                                            const val = Number(minBudgetInput)
                                            const clamped = Number.isNaN(val) || val < 500 ? 500 : Math.min(val, state.stayBudgetRange.max - 500)
                                            onChange({ stayBudgetRange: { ...state.stayBudgetRange, min: clamped } })
                                            setMinBudgetInput(String(clamped))
                                        }}
                                        className="w-full text-[14px] font-semibold text-grey-0 font-manrope outline-none bg-transparent"
                                    />
                                </div>
                            </div>
                            <span className="text-grey-2 mt-5">—</span>
                            <div className="flex-1">
                                <label className="text-[11px] text-grey-2 font-manrope mb-1 block">Max</label>
                                <div className="flex items-center gap-1 rounded-lg border border-grey-4 px-3 py-2">
                                    <span className="text-[13px] text-grey-2 font-manrope">{'\u20B9'}</span>
                                    <input
                                        type="number"
                                        min={Math.max(500, state.stayBudgetRange.min + 500)}
                                        max={100000}
                                        step={500}
                                        value={maxBudgetInput}
                                        onChange={(e) => setMaxBudgetInput(e.target.value)}
                                        onBlur={() => {
                                            const val = Number(maxBudgetInput)
                                            const clamped =
                                                Number.isNaN(val) || val > 100000 ? 100000 : Math.max(val, state.stayBudgetRange.min + 500)
                                            onChange({ stayBudgetRange: { ...state.stayBudgetRange, max: clamped } })
                                            setMaxBudgetInput(String(clamped))
                                        }}
                                        className="w-full text-[14px] font-semibold text-grey-0 font-manrope outline-none bg-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </FormSectionCard>

            {/* Travel style */}
            {/* <div className="bg-white rounded-2xl border border-grey-4/50 shadow-sm p-5 sm:p-6 mb-5">
                <TravelStyleChips
                    label="What kind of experience are you looking for?"
                    options={TRAVEL_STYLE_OPTIONS}
                    selected={state.travelStyles}
                    onChange={(styles) => onChange({ travelStyles: styles })}
                />
            </div> */}

            {/* Dietary restrictions */}
            <FormSectionCard error={dietaryError} ref={dietaryRef} className="mb-5">
                <TravelStyleChips
                    label="Any dietary requirements?"
                    options={DIETARY_OPTIONS}
                    selected={state.dietaryRestrictions}
                    onChange={(restrictions) => {
                        // Determine which restriction was toggled
                        const added = restrictions.find((r) => !state.dietaryRestrictions.includes(r))
                        const removed = state.dietaryRestrictions.find((r) => !restrictions.includes(r))
                        const toggledRestriction = added || removed || ''
                        const isSelected = !!added
                        onChange({ dietaryRestrictions: restrictions })
                        setDietaryError(null)
                        trackButtonClickCustom({
                            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                            buttonName: 'dietary_restriction_toggle',
                            buttonAction: 'click',
                            extra: { restriction: toggledRestriction, selected: isSelected }
                        })
                    }}
                />
            </FormSectionCard>

            {/* Extra content injected by parent (e.g. Trip Setup cards) */}
            {renderAfterContent}

            {/* Describe your interests (purpose) */}
            <div className="bg-white rounded-2xl border border-grey-4/50 shadow-sm p-5 sm:p-6 mb-5">
                <p className="text-[18px] font-red-hat-display font-medium text-grey-0 mb-2 block">Anything else we should know?</p>
                <div
                    className={`flex items-start gap-2 rounded-xl border bg-white transition-all ${
                        purposeFocused ? 'border-primary-default ring-2 ring-primary-default/20' : 'border-grey-4'
                    }`}>
                    <div className="pt-3.5 pl-2 shrink-0">
                        <Sparkles
                            size={18}
                            className="text-primary-default"
                        />
                    </div>
                    <textarea
                        value={state.preferences}
                        onChange={(e) => handlePreferencesChange(e.target.value)}
                        onFocus={() => setPurposeFocused(true)}
                        onBlur={() => setPurposeFocused(false)}
                        placeholder="Share any interests, requirements or things to avoid."
                        rows={3}
                        maxLength={remainingForUser}
                        className="flex-1 py-3 pr-4 pb-3 font-medium font-manrope text-grey-0 placeholder:text-grey-2 placeholder:italic bg-transparent outline-none resize-none min-h-[80px]"
                        style={{ fontSize: '16px' }}
                    />
                </div>
                {combinedLength > 2000 && (
                    <div className="mt-1.5 flex items-baseline justify-between gap-2">
                        {appendedParts.length > 0 ? (
                            <p className="text-[11px] font-manrope font-medium text-grey-2">
                                Includes: {state.travelStyles.length > 0 && (
                                    <span className="text-grey-1">{state.travelStyles.join(', ')}</span>
                                )}
                                {state.travelStyles.length > 0 && state.aiRouteOptimize && ' · '}
                                {state.aiRouteOptimize && (
                                    <span className="text-grey-1">Route optimization</span>
                                )}
                            </p>
                        ) : <span />}
                        <p className={`shrink-0 text-[11px] font-manrope font-medium ${
                            combinedLength >= TOTAL_LIMIT ? 'text-secondary-red' : 'text-grey-2'
                        }`}>
                            {combinedLength}/{TOTAL_LIMIT}
                        </p>
                    </div>
                )}
                {/* Floating prompts: carousel row with reduced-width chips */}
                <div className="mt-3">
                    {!promptPayload || (isPromptsLoading && promptPayload) || (promptPayload && floatingPrompts.length === 0 && !isPromptsError) ? (
                        <GenericCarousel
                            gap={12}
                            className="py-1">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="shrink-0 w-[220px]">
                                    <CustomShimmer
                                        height={40}
                                        radius={28}
                                    />
                                </div>
                            ))}
                        </GenericCarousel>
                    ) : floatingPrompts.length > 0 ? (
                        <GenericCarousel
                            rightGradientStyle="white"
                            gradientEndColor="rgba(255,255,255,0)"
                            gap={12}
                            className="py-1">
                            {floatingPrompts.map((text, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => onChange({ preferences: text })}
                                    className={`shrink-0 w-[220px] flex items-start gap-2 rounded-[28px] border bg-white py-2 px-3 text-left transition-all duration-200 cursor-pointer hover:border-primary-default hover:bg-primary-default/5 ${
                                        state.preferences === text ? 'border-primary-default bg-primary-default/5' : 'border-grey-4'
                                    }`}>
                                    <Sparkles
                                        size={16}
                                        className="text-primary-default shrink-0 mt-0.5"
                                    />
                                    <span className="text-[13px] font-manrope font-medium text-grey-1 flex-1 min-w-0 break-words line-clamp-3">
                                        {text}
                                    </span>
                                </button>
                            ))}
                        </GenericCarousel>
                    ) : null}
                </div>
            </div>

            {/* Navigation buttons — floating on both mobile and desktop */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-grey-4/50 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-50">
                <div className={`${WIZARD_CONTENT_MAX_WIDTH} mx-auto flex items-center justify-between gap-4`}>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl border border-grey-4 text-grey-1 font-medium font-manrope hover:bg-grey-5 cursor-pointer transition-all">
                        <ArrowLeft size={18} />
                        <span>Back</span>
                    </button>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={isSubmitting}
                            className={`flex items-center gap-2 rounded-xl bg-primary-default text-white font-semibold font-manrope transition-all duration-200 ${
                                isSubmitting ? 'opacity-70 cursor-not-allowed' : !isStep3Complete ? 'opacity-50 cursor-pointer' : 'cursor-pointer hover:shadow-lg hover:scale-105 active:scale-95'
                            } ${isMobile ? 'px-4 py-2.5' : 'px-8 py-3.5'}`}>
                            <Sparkles
                                size={18}
                                className={isSubmitting ? 'animate-pulse' : undefined}
                            />
                            <span>{isSubmitting ? 'Generating…' : (submitButtonText || 'Generate Itinerary')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Step3Preferences
