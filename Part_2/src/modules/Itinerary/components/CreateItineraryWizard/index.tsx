import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useSidebarContext } from '@/components/layouts/SideBarLayout'
import { useCountries } from '@/hooks/useCountries'
import { NotLiveCountryMessage } from '@/pages/Landing/Components/NotLiveCountryMessage'
import SearchHeaderCalendar from '../SearchHeaderCalendar'
import StepIndicator from './StepIndicator'
import Step1TravelDates from './Step1_TravelDates'
import Step2CitiesRoute from './Step2_CitiesRoute'
import Step3Preferences from './Step3_Preferences'
import { WizardState, INITIAL_WIZARD_STATE, BUDGET_MAP, WizardSubmitData } from './types'
import { TOUR_GUIDE_ICON } from '@/constants/thiingsIcons'
import TripCreationFlow from '@/components/common/TripCreationFlow'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

interface CreateItineraryWizardProps {
    onSubmit: (data: WizardSubmitData) => void
    /** When true, hides the floating expert/assistant button in the header (e.g. when shown from Itenerary page) */
    hideFloatingExpert?: boolean
    /** When true, disables the Generate Itinerary button (e.g. while API request is in progress) */
    isSubmitting?: boolean
}

const CreateItineraryWizard = ({ onSubmit, hideFloatingExpert = true, isSubmitting = false }: CreateItineraryWizardProps) => {
    const { activeTrip } = useTravelerTrips()
    const { toggleSidebar } = useSidebarContext()
    const { trackButtonClickCustom } = usePostHog()
    

    // Fetch all countries with is_live status to check if trip countries are supported
    const { allCountries: prioritizedCountries, isLoading: isLoadingCountries } = useCountries({ shouldUsePrioritized: true })

    const tripCountries = activeTrip?.final_destination_countries || []
    const hasNoDestinationCountries =
        !!activeTrip &&
        !(activeTrip?.tripProfile?.final_destination_countries?.length || activeTrip?.final_destination_countries?.length)

    // Check if ALL trip countries are non-live (i.e. none are supported)
    const allCountriesNonLive = useMemo(() => {
        if (!prioritizedCountries.length || !tripCountries.length) return false
        return tripCountries.every((tc) => {
            const found = prioritizedCountries.find((c) => c.country_id === tc.id)
            return found ? found.is_live !== true : true
        })
    }, [prioritizedCountries, tripCountries])

    // Build pre-filled initial state from trip context
    const initialState = useMemo<WizardState>(() => {
        const base = { ...INITIAL_WIZARD_STATE }

        if (!activeTrip) return base

        // Pre-fill dates from trip preferred_travel_time
        const travelTime = activeTrip.tripProfile?.preferred_travel_time || activeTrip.preferred_travel_time
        if (travelTime) {
            const startRaw = travelTime.startDate
            const endRaw = travelTime.endDate
            if (startRaw && endRaw) {
                const start = new Date(startRaw)
                const end = new Date(endRaw)
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    base.startDate = start
                    base.endDate = end
                    base.dateMode = 'exact'
                }
            }
        }

        // Pre-fill group setup — first try explicit group_setup, then derive from group_type
        const groupSetup = activeTrip.trip_preference?.group_setup || activeTrip.tripProfile?.group_setup
        const isGroupSetupValid = groupSetup && !(groupSetup.adults === 0 && groupSetup.children === 0 && groupSetup.infants === 0)

        if (isGroupSetupValid) {
            base.groupSetup = {
                adults: groupSetup.adults || 1,
                children: groupSetup.children || 0,
                infants: groupSetup.infants || 0,
                children_age: groupSetup.children_age || []
            }
        } else {
            // Derive from group_type (e.g. "couple", "solo_traveler", etc.)
            const groupType = activeTrip.tripProfile?.group_type
            if (groupType) {
                switch (groupType) {
                    case 'solo_traveler':
                        base.groupSetup = { adults: 1, children: 0, infants: 0, children_age: [] }
                        break
                    case 'couple':
                        base.groupSetup = { adults: 2, children: 0, infants: 0, children_age: [] }
                        break
                    case 'couple_with_children':
                        base.groupSetup = { adults: 2, children: 1, infants: 0, children_age: [5] }
                        break
                    case 'immediate_family':
                        base.groupSetup = { adults: 2, children: 2, infants: 0, children_age: [8, 5] }
                        break
                    case 'friends_group':
                        base.groupSetup = { adults: 4, children: 0, infants: 0, children_age: [] }
                        break
                    case 'large_group':
                        base.groupSetup = { adults: 6, children: 0, infants: 0, children_age: [] }
                        break
                }
            }
        }

        // Pre-fill travel styles
        const styles = activeTrip.trip_preference?.travel_style_preferences
        if (styles && styles.length > 0) {
            base.travelStyles = styles
        }

        // Pre-fill dietary restrictions
        const diet = activeTrip.trip_preference?.diet_preferences
        if (diet && diet.length > 0) {
            base.dietaryRestrictions = diet
        }

        return base
    }, [activeTrip])

    const [step, setStep] = useState(1)
    const [state, setState] = useState<WizardState>(initialState)
    const [direction, setDirection] = useState<'forward' | 'back'>('forward')
    const [isTripCreationFlowOpen, setIsTripCreationFlowOpen] = useState(false)

    // Sync pre-fill when trip context data loads asynchronously.
    // activeTrip shell may exist on mount, but trip_preference (group_setup, styles, etc.)
    // often loads later. We wait until meaningful prefill data is available, then apply once.
    const hasPrefilledRef = useRef(false)
    useEffect(() => {
        if (hasPrefilledRef.current) return
        if (!activeTrip) return

        // Only pre-fill once we have substantial trip data (not just the trip shell)
        const hasGroupData = !!(activeTrip.trip_preference?.group_setup || activeTrip.tripProfile?.group_setup || activeTrip.tripProfile?.group_type)
        const hasDatesData = !!(activeTrip.tripProfile?.preferred_travel_time?.startDate || activeTrip.preferred_travel_time?.startDate)

        if (hasGroupData || hasDatesData) {
            hasPrefilledRef.current = true
            setState(initialState)
        }
    }, [activeTrip, initialState])

    const handleChange = useCallback((partial: Partial<WizardState>) => {
        setState((prev) => ({ ...prev, ...partial }))
    }, [])

    const handleNext = useCallback(() => {
        if (step < 3) {
            trackButtonClickCustom({
                buttonPage: 'create_itinerary_page',
                buttonName: `step${step}_next`,
                buttonAction: 'creation_step_advance',
                extra: { from_step: step, to_step: step + 1 }
            })
            setDirection('forward')
            setStep((s) => s + 1)
        }
    }, [step])

    const handleBack = useCallback(() => {
        if (step > 1) {
            trackButtonClickCustom({
                buttonPage: 'create_itinerary_page',
                buttonName: `step${step}_back`,
                buttonAction: 'creation_step_back',
                extra: { from_step: step, to_step: step - 1 }
            })
            setDirection('back')
            setStep((s) => s - 1)
        }
    }, [step])

    const handleSubmit = useCallback(() => {
        trackButtonClickCustom({
        buttonPage: 'create_itinerary_page',
        buttonName: 'step3_generate_itinerary',
        buttonAction: 'creation_submit',
            extra: {
                date_mode: state.dateMode,
                total_cities: state.cities.length,
                adults: state.groupSetup.adults,
                children: state.groupSetup.children,
                budget_tier: state.budgetTier,
                has_preferences: !!state.preferences.trim(),
                travel_styles: state.travelStyles,
                ai_route_optimize: state.aiRouteOptimize
            }
        })
        // Compute dates
        let startDate: Date
        let endDate: Date

        if (state.dateMode === 'exact' && state.startDate && state.endDate) {
            startDate = state.startDate
            endDate = state.endDate
        } else if (state.dateMode === 'flexible' && state.flexibleDuration) {
            if (state.flexibleMonths.length > 0) {
                const sorted = [...state.flexibleMonths].sort()
                const [year, month] = sorted[0].split('-').map(Number)
                startDate = new Date(year, month - 1, 1)
            } else {
                startDate = new Date()
                startDate.setDate(startDate.getDate() + 30)
            }
            endDate = new Date(startDate)
            endDate.setDate(endDate.getDate() + state.flexibleDuration - 1)
        } else {
            return
        }

        // Compute budget (INR)
        const budgetPerPerson = state.budgetTier ? BUDGET_MAP[state.budgetTier] : 150000
        const totalBudget = budgetPerPerson * Math.max(1, state.groupSetup.adults)

        // Build user_text_input: purpose/interests first, then optional parts
        const parts: string[] = []
        if (state.preferences.trim()) {
            parts.push(state.preferences.trim())
        } else {
            parts.push('Help me create itinerary')
        }
        if (state.travelStyles.length > 0) {
            parts.push(`Travel style preferences: ${state.travelStyles.join(', ')}.`)
        }
        if (state.aiRouteOptimize) {
            parts.push('Please optimize the route order between cities for minimal travel time.')
        }

        // Route/nights prompt based on user's per-city night preferences
        const citiesWithNights = state.cities.filter((c) => typeof c.nights === 'number')
        if (citiesWithNights.length === state.cities.length && state.cities.length > 0) {
            // ALL cities have specific nights → strict route
            const routeStr = state.cities.map((c) => `${c.city.cityName} (${c.nights} nights)`).join(' → ')
            parts.push(`Follow this exact route strictly: ${routeStr}. Do not change the route order or night distribution.`)
        } else if (citiesWithNights.length > 0) {
            // MIXED → partial preferences
            const prefs = citiesWithNights.map((c) => `${c.nights} nights in ${c.city.cityName}`).join(', ')
            parts.push(`User prefers ${prefs}. For the remaining cities, optimize the night distribution.`)
        }
        // ALL AUTO → nothing added, AI decides everything

        // Cap at 4000 chars to match the backend's max_length on
        // both ``user_text_input`` and ``purpose`` fields.
        const preferences = parts.join(' ').slice(0, 4000)

        const cities = state.cities.map((item) => item.city)
        const dietaryRestrictions = state.dietaryRestrictions.length > 0 ? state.dietaryRestrictions.filter((d) => d !== 'None') : []

        // Pass geo locations for the generation loader map
        const cityGeoLocations = state.cities
            .filter((item) => item.geoLocation)
            .map((item) => ({
                cityId: item.city.cityId,
                lat: item.geoLocation!.lat,
                lng: item.geoLocation!.lng,
                nights: item.nights
            }))

        onSubmit({
            preferences,
            cities,
            startDate,
            endDate,
            budget: totalBudget,
            stayBudgetRange: state.stayBudgetRange,
            groupSetup: state.groupSetup,
            startLocation: state.departureCity,
            endLocation: state.returnCity ?? state.departureCity,
            dietaryRestrictions,
            cityGeoLocations
        })
    }, [state, onSubmit])

    const slideVariants = {
        enter: (dir: 'forward' | 'back') => ({
            x: dir === 'forward' ? 80 : -80,
            opacity: 0
        }),
        center: { x: 0, opacity: 1 },
        exit: (dir: 'forward' | 'back') => ({
            x: dir === 'forward' ? -80 : 80,
            opacity: 0
        })
    }

    // No active trip — show CTA to create one
    if (!activeTrip) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white flex flex-col items-center justify-center px-4">
                <div className="bg-white rounded-2xl border border-grey-4/50 shadow-sm p-8 max-w-md w-full text-center flex flex-col items-center">
                    <img
                        src={TOUR_GUIDE_ICON}
                        alt="Trip"
                        className="w-16 h-16 mx-auto mb-5"
                    />
                    <h2 className="text-xl font-bold font-red-hat-display text-grey-0 mb-2">Create a trip first</h2>
                    <p className="text-sm font-medium text-grey-2 font-manrope mb-6">
                        To generate an itinerary, you need to set up your trip with destinations.
                    </p>
                    <button
                        onClick={() => {
                            trackButtonClickCustom({
                                buttonPage: 'create_itinerary_page',
                                buttonName: 'create_trip_cta',
                                buttonAction: 'open_sidebar',
                                extra: { reason: 'no_active_trip' }
                            })
                            toggleSidebar()
                        }}
                        className="px-6 py-3 rounded-xl bg-primary-default text-white font-semibold font-manrope cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95">
                        Create Trip
                    </button>
                </div>
            </div>
        )
    }

    // Active trip but no final destination countries — show CTA to set up trip (TripCreationFlow)
    if (hasNoDestinationCountries) {
        return (
            <>
                <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white flex flex-col items-center justify-center px-4">
                    <div className="bg-white rounded-2xl border border-grey-4/50 shadow-sm p-8 max-w-md w-full text-center flex flex-col items-center">
                        <img
                            src={TOUR_GUIDE_ICON}
                            alt="Trip"
                            className="w-16 h-16 mx-auto mb-5"
                        />
                        <h2 className="text-[18px] font-bold font-red-hat-display text-grey-0 mb-2">Update Your Trip</h2>
                        <p className="text-[14px] font-medium text-grey-2 font-manrope mb-6">
                            Add destinations to your trip to start planning your itinerary.
                        </p>
                        <button
                            onClick={() => setIsTripCreationFlowOpen(true)}
                            className="px-6 py-3 rounded-xl bg-primary-default text-white font-semibold font-manrope cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95">
                            Create Your Trip
                        </button>
                    </div>
                </div>
                <TripCreationFlow
                    isOpen={isTripCreationFlowOpen}
                    onClose={() => setIsTripCreationFlowOpen(false)}
                    onSuccess={() => setIsTripCreationFlowOpen(false)}
                />
            </>
        )
    }

    // All trip countries are non-live — show not-supported screen
    if (!isLoadingCountries && allCountriesNonLive && tripCountries.length > 0) {
        const nonLiveNames = tripCountries.map((c) => c.name).join(', ')
        return (
            <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white flex flex-col">
                <SearchHeaderCalendar hideAssistant={hideFloatingExpert} />
                <div className="flex-1 flex justify-center">
                    <NotLiveCountryMessage
                        countryName={nonLiveNames}
                        descriptionText="This destination isn't live yet. Our travel experts are working on it — you can still explore other live destinations."
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white flex flex-col">
            {/* ── Search header (same as other itinerary pages) ── */}
            {/* <SearchHeaderCalendar hideAssistant={hideFloatingExpert} /> */}

            {/* Header */}
            <div className="sm:pt-10 pb-4 sm:px-4">
                <StepIndicator
                    currentStep={step}
                    className="mb-6"
                />
                {/* <h1 className="text-2xl sm:text-4xl md:text-5xl font-semibold text-center text-gray-900 font-manrope">
                    Plan your perfect
                    <br />
                    <span className="text-primary-default italic">adventure</span>
                </h1> */}
            </div>

            {/* Step content */}
            <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pb-32 md:pb-20">
                <AnimatePresence
                    mode="wait"
                    custom={direction}>
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3, ease: 'easeInOut' }}>
                            <Step1TravelDates
                                state={state}
                                onChange={handleChange}
                                onNext={handleNext}
                                onBack={handleBack}
                            />
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3, ease: 'easeInOut' }}>
                            <Step2CitiesRoute
                                state={state}
                                onChange={handleChange}
                                onNext={handleNext}
                                onBack={handleBack}
                            />
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3, ease: 'easeInOut' }}>
                            <Step3Preferences
                                state={state}
                                onChange={handleChange}
                                onNext={handleSubmit}
                                onBack={handleBack}
                                isSubmitting={isSubmitting}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

export default CreateItineraryWizard
