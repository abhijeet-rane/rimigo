import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown, PencilIcon } from 'lucide-react'
import type { TravelerTrip } from '@/pages/Landing/api/travelerTrips'
import { format, differenceInCalendarDays } from 'date-fns'
import TripQuestionModal from '@/components/common/TripQuestionModal'
import TripPreferencePurposeStep, {
    TripPreferencePurposeInitialData,
    TripPreferencePurposeResult
} from './trip-preferences-steps/TripPreferencePurposeStep'
import { RoomsGuestsModal } from '@/components/common/SearchBar/modals/RoomsGuestsModal'
import { RoomsGuestsContent } from '@/components/common/SearchBar/modals/RoomsGuestsContent'
import { useIsMobile } from '@/hooks/use-mobile'
import { updateTripPartial } from '@/api/trip/tripAPI'
import {
    flattenOccupancies,
    guestsDataToOccupancies,
    normalizeOccupancies,
    type OccupanciesConfig,
} from '@/types/occupancy'
import TripPreferenceStayStep, { TripPreferenceStayResult } from './trip-preferences-steps/TripPreferenceStayStep'
import TripPreferenceActivitiesStep, { TripPreferenceActivitiesResult } from './trip-preferences-steps/TripPreferenceActivitiesStep'
import TripPreferenceDestinationStep, { TripPreferenceDestinationResult } from './trip-preferences-steps/TripPreferenceDestinationStep'
import TripPreferenceTripDatesStep, { TripPreferenceTripDatesResult } from './trip-preferences-steps/TripPreferenceTripDatesStep'
import { ACCOMMODATION_OPTIONS } from './trip-preferences-steps/constants'
import { vacationPurposeOptions } from '@/modules/Onboarding/pages/TravelPurposeQuestionPage'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { toast } from 'sonner'
import { UpdateTripProfileData } from '@/api/tripProfileAPI/tripProfileAPI'
import { useLocation, useNavigate } from 'react-router-dom'
import InviteGenerationModal from './InviteGenerationModal'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { useQuery } from '@tanstack/react-query'
import { getLiveCountries } from '@/api/curation/locationPersonalizationAPI'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { BEACH_TREE } from '@/constants/icons/svgFromCDN'
import { formatCapitalizeFirstLetter, formatDestinationTripName, formatTripDropdownData } from '@/utils/tripFormatters'
import { useTripFlags, useTripFlagsMap } from '@/hooks/useTripFlags'

interface TripPreferencesModalProps {
    isOpen: boolean
    onClose: () => void
    trip?: TravelerTrip
    anchorRect?: DOMRect | null
}

const formatDestination = (trip: TravelerTrip) => {
    const countries = trip.final_destination_countries?.map((c) => c.name).filter(Boolean)
    if (countries?.length) {
        return countries.join(', ')
    }
    return '—'
}

const formatTripDates = (trip: TravelerTrip) => {
    const start = trip.preferred_travel_time?.startDate
    const end = trip.preferred_travel_time?.endDate
    if (!start || !end) return '—'
    const startDate = new Date(start)
    const endDate = new Date(end)
    const nights = Math.max(differenceInCalendarDays(endDate, startDate), 0)
    return `${format(startDate, 'do MMM yyyy')} - ${format(endDate, 'do MMM yyyy')} (${nights} nights)`
}

const formatStayType = (trip: TravelerTrip) => {
    const accommodations = trip.trip_preference?.accommodation_preferences
    if (!accommodations || accommodations.length === 0) return '—'
    return accommodations
        .map((option) => option.sub_type || option.primary_type)
        .filter(Boolean)
        .map((value) =>
            value
                .split('_')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
        )
        .join(', ')
}

const formatPurpose = (trip: TravelerTrip) => {
    const purpose = trip.trip_preference?.purpose_specific_experiences?.special_requirements
    if (purpose) return purpose
    const eventType = trip.trip_preference?.destination_specific_event?.event_type
    if (eventType) {
        return eventType
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }
    return '—'
}

const formatActivities = (trip: TravelerTrip) => {
    const activities = trip.trip_preference?.experiences_preferences
    if (!activities || activities.length === 0) return '—'
    return activities
        .map((activity) =>
            activity
                .split('_')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
        )
        .join(', ')
}

const slugToLabel = (value: string) =>
    value
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

const formatActivitiesSelection = (activities: string[]) => {
    if (!activities.length) return '—'
    return activities.map(slugToLabel).join(', ')
}

const formatStaySelection = (types: string[]) => {
    if (!types.length) return '—'
    return types.map((type) => ACCOMMODATION_OPTIONS.find((option) => option.valueServer === type)?.labelUi ?? slugToLabel(type)).join(', ')
}

const formatPurposeSelection = (state?: TripPreferencePurposeInitialData) => {
    if (!state?.travelPurpose) return null
    const label = vacationPurposeOptions.find((option) => option.backendValue === state.travelPurpose)?.labelUi ?? slugToLabel(state.travelPurpose)

    const month = state.preferredTravelTime?.months?.[0]
    const year = state.preferredTravelTime?.year
    if (month) {
        return `${label} • ${month}${year ? ` ${year}` : ''}`
    }
    return label
}

const formatPreferredTravelTime = (state?: TripPreferencePurposeInitialData) => {
    if (!state?.preferredTravelTime?.startDate || !state.preferredTravelTime.endDate) {
        return null
    }

    const startDate = new Date(state.preferredTravelTime.startDate)
    const endDate = new Date(state.preferredTravelTime.endDate)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return null
    }
    const nights = Math.max(differenceInCalendarDays(endDate, startDate), 0)
    return `${format(startDate, 'do MMM yyyy')} - ${format(endDate, 'do MMM yyyy')} (${nights} nights)`
}

const TripPreferencesModal = ({ isOpen, onClose, trip, anchorRect }: TripPreferencesModalProps) => {
    const container = typeof document !== 'undefined' ? document.body : null
    const isMobile = useIsMobile()
    const [activeSection, setActiveSection] = useState<'destination' | 'dates' | 'groupType' | 'purpose' | 'stay' | 'activities' | null>(null)
    const [inviteModalOpen, setInviteModalOpen] = useState(false)
    const travelerTripsContext = useOptionalTravelerTrips()
    const [isSaving, setIsSaving] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()
    const [isTripDropdownOpen, setIsTripDropdownOpen] = useState(false)
    const tripsList = travelerTripsContext?.tripsData?.trips || []

    // Fetch countries for flag icons
    const { data: countries } = useQuery({
        queryKey: ['liveCountries'],
        queryFn: getLiveCountries,
        staleTime: HOURS_24
    })

    const destinationFlags = useTripFlags(trip, countries)
    const tripFlagsMap = useTripFlagsMap(tripsList, countries)

    const tripDisplayName = useMemo(() => {
    if (!trip) return 'Select trip'
    return formatDestinationTripName(trip)
    }, [trip])

    const clearCurrentPageQueryParams = useCallback(() => {
        navigate(location.pathname, { replace: true })
        if (typeof window !== 'undefined') {
            window.location.reload()
        }
    }, [navigate, location.pathname])

    const initialPurposeState = useMemo<TripPreferencePurposeInitialData | undefined>(() => {
        if (!trip) return undefined

        // Prefer tripProfile data over trip_preference
        const profileData = trip.tripProfile
        const travelPurpose = profileData?.travel_purpose || undefined
        const preferredTime = profileData?.preferred_travel_time || trip.preferred_travel_time

        return {
            travelPurpose: travelPurpose,
            preferredTravelTime: preferredTime
                ? {
                      startDate: preferredTime.startDate || null,
                      endDate: preferredTime.endDate || null,
                      months: preferredTime.months || null,
                      year: preferredTime.year || null
                  }
                : undefined
        }
    }, [trip])

    const initialStayTypes = useMemo(() => {
        if (!trip) return [] as string[]

        // Prefer tripProfile data over trip_preference
        const profileData = trip.tripProfile
        const accommodations = profileData?.accommodation_preferences || trip.trip_preference?.accommodation_preferences

        if (!accommodations) return [] as string[]
        return accommodations.map((pref) => pref.primary_type).filter((value): value is string => value !== null && value !== undefined)
    }, [trip])

    const initialActivityTypes = useMemo(() => {
        if (!trip) return [] as string[]

        // Prefer tripProfile data over trip_preference
        const profileData = trip.tripProfile
        const experiences = profileData?.experiences_preferences || trip.trip_preference?.experiences_preferences

        if (!experiences) return [] as string[]
        return experiences
    }, [trip])

    const [purposeState, setPurposeState] = useState<TripPreferencePurposeInitialData | undefined>(initialPurposeState)
    const [guestOccupancies, setGuestOccupancies] = useState<OccupanciesConfig>(() => {
        const gs = trip?.group_setup
        if (gs?.rooms && gs.rooms.length > 0) {
            return normalizeOccupancies(gs.rooms.map((r) => ({
                numOfAdults: Math.max(1, r.adults || 1),
                childAges: Array.isArray(r.child_ages) ? [...r.child_ages] : []
            })))
        }
        const tpGs = trip?.trip_preference?.group_setup
        return normalizeOccupancies(guestsDataToOccupancies({
            adults: gs?.adults || tpGs?.adults || 2,
            children: gs?.children || tpGs?.children || 0,
            children_age: gs?.children_age || tpGs?.children_age || []
        }, 1))
    })
    const [stayTypes, setStayTypes] = useState<string[]>(initialStayTypes)
    const [activityTypes, setActivityTypes] = useState<string[]>(initialActivityTypes)
    const [destinations, setDestinations] = useState<{ id: string; name: string }[]>(trip?.final_destination_countries || [])
    const [tripDates, setTripDates] = useState<{ startDate: string | null; endDate: string | null }>({
        startDate: trip?.tripProfile?.preferred_travel_time?.startDate || trip?.preferred_travel_time?.startDate || null,
        endDate: trip?.tripProfile?.preferred_travel_time?.endDate || trip?.preferred_travel_time?.endDate || null
    })
    const { trackButtonClickCustom } = usePostHog()

    useEffect(() => {
        setPurposeState(initialPurposeState)
    }, [initialPurposeState])

    useEffect(() => {
        const gs = trip?.group_setup
        if (gs?.rooms && gs.rooms.length > 0) {
            setGuestOccupancies(normalizeOccupancies(gs.rooms.map((r) => ({
                numOfAdults: Math.max(1, r.adults || 1),
                childAges: Array.isArray(r.child_ages) ? [...r.child_ages] : []
            }))))
            return
        }
        const tpGs = trip?.trip_preference?.group_setup
        setGuestOccupancies(normalizeOccupancies(guestsDataToOccupancies({
            adults: gs?.adults || tpGs?.adults || 2,
            children: gs?.children || tpGs?.children || 0,
            children_age: gs?.children_age || tpGs?.children_age || []
        }, 1)))
    }, [trip?.group_setup, trip?.trip_preference?.group_setup])

    useEffect(() => {
        setStayTypes(initialStayTypes)
    }, [initialStayTypes])

    useEffect(() => {
        setActivityTypes(initialActivityTypes)
    }, [initialActivityTypes])

    useEffect(() => {
        setDestinations(trip?.final_destination_countries || [])
    }, [trip?.final_destination_countries])

    useEffect(() => {
        setTripDates({
            startDate: trip?.tripProfile?.preferred_travel_time?.startDate || trip?.preferred_travel_time?.startDate || null,
            endDate: trip?.tripProfile?.preferred_travel_time?.endDate || trip?.preferred_travel_time?.endDate || null
        })
    }, [trip?.tripProfile?.preferred_travel_time, trip?.preferred_travel_time])

    const derivePreferredTravelTimeFromTripDates = (dates?: { startDate: string | null; endDate: string | null }) => {
        if (!dates?.startDate) return undefined
        const start = new Date(dates.startDate)
        if (Number.isNaN(start.getTime())) return undefined
        const monthName = start.toLocaleString('default', { month: 'long' })
        return {
            startDate: dates.startDate,
            endDate: dates.endDate ?? dates.startDate,
            months: [monthName],
            year: start.getFullYear()
        }
    }

    const purposeInitialData = useMemo<TripPreferencePurposeInitialData | undefined>(() => {
        if (purposeState?.preferredTravelTime || purposeState?.travelPurpose) {
            return purposeState
        }

        const derivedTime = derivePreferredTravelTimeFromTripDates(tripDates)
        if (derivedTime) {
            return {
                travelPurpose: purposeState?.travelPurpose,
                preferredTravelTime: derivedTime
            }
        }

        return purposeState
    }, [purposeState, tripDates])

    const displayContent = useMemo(() => {
        if (!trip) return null
        const destination = formatDestination(trip)
        const dates = formatPreferredTravelTime(purposeState) ?? formatTripDates(trip)
        const flat = flattenOccupancies(guestOccupancies)
        const groupSetupParts: string[] = []
        if (flat.adults > 0) groupSetupParts.push(`${flat.adults} ${flat.adults === 1 ? 'adult' : 'adults'}`)
        if (flat.children > 0) groupSetupParts.push(`${flat.children} ${flat.children === 1 ? 'child' : 'children'}`)
        const numRooms = guestOccupancies.length
        if (numRooms > 1) groupSetupParts.push(`${numRooms} rooms`)
        const groupTypeSummary = groupSetupParts.length > 0 ? groupSetupParts.join(', ') : 'Add guests'
        const purposeSummary = formatPurposeSelection(purposeState) ?? formatPurpose(trip)
        const staySummary = stayTypes.length > 0 ? formatStaySelection(stayTypes) : formatStayType(trip)
        const activitiesSummary = activityTypes.length > 0 ? formatActivitiesSelection(activityTypes) : formatActivities(trip)

        return {
            destination,
            dates,
            groupType: groupTypeSummary,
            purpose: purposeSummary,
            stayType: staySummary,
            activities: activitiesSummary
        }
    }, [trip, purposeState, guestOccupancies, stayTypes, activityTypes])

    if (!isOpen || !container || !trip || !displayContent) {
        return null
    }

    const handleDestinationSave = async (result: TripPreferenceDestinationResult) => {
        if (isSaving || !travelerTripsContext?.updateTripDestinations) return
        setIsSaving(true)
        trackEvent?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'start_planning',
            buttonAction: 'choose_destination_name_submit',
            extra: { destination_name: result.countries }
        })

        try {
            await travelerTripsContext.updateTripDestinations({ final_destination_countries: result.countries })
            clearCurrentPageQueryParams()
            setActiveSection(null)
            toast.success('Destinations updated successfully')
        } catch (error) {
            console.error('Failed to update destinations:', error)
            toast.error('Failed to update destinations. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleTripDatesSave = async (result: TripPreferenceTripDatesResult) => {
        if (isSaving || !travelerTripsContext?.updateTripDates) return
        setIsSaving(true)
        trackEvent?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'Next',
            buttonAction: 'dates_page_submit',
            extra: { startDate: result.startDate, endDate: result.endDate }
        })
        try {
            const payload: UpdateTripProfileData = {
                preferred_travel_time: {
                    is_fixed: true,
                    startDate: result.startDate,
                    endDate: result.endDate,
                    year: null,
                    months: null
                }
            }

            await travelerTripsContext.updateTripDates(payload)

            setTripDates({
                startDate: result.startDate,
                endDate: result.endDate
            })
            setPurposeState((prev) => {
                const derived = derivePreferredTravelTimeFromTripDates({ startDate: result.startDate, endDate: result.endDate })
                if (!derived) return prev
                return {
                    travelPurpose: prev?.travelPurpose,
                    preferredTravelTime: derived
                }
            })
            setActiveSection(null)
            clearCurrentPageQueryParams()
            toast.success('Trip dates updated successfully')
        } catch (error) {
            console.error('Failed to update trip dates:', error)
            toast.error('Failed to update trip dates. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleGroupSetupSave = async (data: OccupanciesConfig) => {
        if (isSaving || !trip?.trip_id) return
        setIsSaving(true)
        const flat = flattenOccupancies(data)
        trackEvent?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'Next',
            buttonAction: 'group_setup_page_submit',
            extra: { adults: flat.adults, children: flat.children }
        })
        try {
            const roomsBreakdown = data.map((room) => ({
                adults: room.numOfAdults,
                children: room.childAges.length,
                child_ages: [...room.childAges]
            }))
            await updateTripPartial(trip.trip_id, {
                group_setup: {
                    adults: flat.adults,
                    children: flat.children,
                    infants: trip?.group_setup?.infants ?? trip?.trip_preference?.group_setup?.infants ?? 0,
                    children_age: flat.childAges,
                    rooms: roomsBreakdown
                }
            })
            setGuestOccupancies(data)
            setActiveSection(null)
            clearCurrentPageQueryParams()
            toast.success('Guest details updated successfully')
        } catch (error) {
            console.error('Failed to update guest details:', error)
            toast.error('Failed to update guest details. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    const handlePurposeSave = async (result: TripPreferencePurposeResult) => {
        if (isSaving || !travelerTripsContext?.updateTripPurpose) return
        setIsSaving(true)
        trackEvent?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'Next',
            buttonAction: 'trip_purpose_page_submit',
            extra: { purpose: result.travelPurpose }
        })

        try {
            const payload: any = {
                travel_purpose: result.travelPurpose,
                preferred_travel_time: result.preferredTravelTime
                    ? {
                          is_fixed: true,
                          startDate: result.preferredTravelTime.startDate || '',
                          endDate: result.preferredTravelTime.endDate || '',
                          year: result.preferredTravelTime.year,
                          months: result.preferredTravelTime.months
                      }
                    : undefined
            }

            await travelerTripsContext.updateTripPurpose(payload as UpdateTripProfileData)

            setPurposeState({
                travelPurpose: result.travelPurpose,
                preferredTravelTime: result.preferredTravelTime
            })
            setActiveSection(null)
            clearCurrentPageQueryParams()
            toast.success('Purpose updated successfully')
        } catch (error) {
            console.error('Failed to update purpose:', error)
            toast.error('Failed to update purpose. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }
    const trackEvent = (event: { buttonPage: string; buttonName: string; buttonAction: string; extra?: Record<string, any> }) => {
        trackButtonClickCustom?.({
            ...event,
            extra: {
                trigger_location: 'sidebar_top',
                ...(event.extra || {})
            }
        })
    }
    const handleStaySave = async (result: TripPreferenceStayResult) => {
        if (isSaving || !travelerTripsContext?.updateTripAccommodationAndExperiences) return
        setIsSaving(true)
        trackEvent?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'Next',
            buttonAction: 'accommodation_pref_page_submit',
            extra: {
                accommodation_prefs: result.accommodationTypes,
                count_of_prefs: result.accommodationTypes.length
            }
        })
        try {
            const accommodationPreferences = result.accommodationTypes.map((type) => ({
                primary_type: type,
                sub_type: ''
            }))

            await travelerTripsContext.updateTripAccommodationAndExperiences({ accommodation_preferences: accommodationPreferences })

            setStayTypes(result.accommodationTypes)
            setActiveSection(null)
            clearCurrentPageQueryParams()
            toast.success('Accommodation preferences updated successfully')
        } catch (error) {
            console.error('Failed to update accommodation:', error)
            toast.error('Failed to update accommodation. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleActivitiesSave = async (result: TripPreferenceActivitiesResult) => {
        if (isSaving || !travelerTripsContext?.updateTripAccommodationAndExperiences) return
        setIsSaving(true)
        trackEvent?.({
            buttonPage: 'lead_gen_v1',
            buttonName: 'FINISH',
            buttonAction: 'activity_pref_page_submit',
            extra: {
                activity_prefs: result.experiences,
                count_of_prefs: result.experiences.length
            }
        })
        try {
            await travelerTripsContext.updateTripAccommodationAndExperiences({ experiences_preferences: result.experiences })

            setActivityTypes(result.experiences)
            setActiveSection(null)
            clearCurrentPageQueryParams()
            toast.success('Activity preferences updated successfully')
        } catch (error) {
            console.error('Failed to update activities:', error)
            toast.error('Failed to update activities. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    const top = anchorRect ? anchorRect.bottom + 12 : window.innerHeight / 2 - 200
    const left = anchorRect ? anchorRect.left + anchorRect.width / 2 - 195 : window.innerWidth / 2 - 195
    const clampedLeft = Math.min(Math.max(16, left), window.innerWidth - 390 - 16)
    const panelHeight = 420
    const maxTop = Math.max(16, window.innerHeight - panelHeight - 16)
    const clampedTop = Math.min(Math.max(16, top), maxTop)

    const sections = [
        {
            key: 'destination',
            label: 'Destination',
            value: displayContent.destination,
            editable: true
        },
        {
            key: 'groupType',
            label: 'Guests',
            value: displayContent.groupType,
            editable: true
        },
        {
            key: 'purpose',
            label: 'Purpose',
            value: displayContent.purpose,
            editable: true
        },
    ] as const

    const modalContent = (
        <div className="fixed inset-0 z-60 shadow-sm">
            <div
                className="absolute inset-0"
                onClick={onClose}
            />
            <div
                className="absolute flex w-[390px] max-h-[80vh] flex-col overflow-hidden rounded-[24px] bg-white shadow-xl"
                style={{ top: clampedTop, left: clampedLeft }}>
                <div className="flex items-start justify-between p-6 pb-2 bg-grey-5">
                    <div>
                        <h2 className="text-[14px] font-semibold text-grey-1">Edit Trip Preferences</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer p-1 text-grey-2/80 hover:text-grey-1"
                        aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="border-t border-grey-4/80" />
                <div className="flex-1 overflow-y-auto py-0">
                    {sections.map((section) => (
                        <PreferenceRow
                            key={section.label}
                            label={section.label}
                            value={section.value}
                            onClick={
                                section.editable
                                    ? () => setActiveSection(section.key as 'destination' | 'dates' | 'groupType' | 'purpose' | 'stay' | 'activities')
                                    : undefined
                            }
                        />
                    ))}
                </div>
                {/* Trip Selection btn n Dropdown */}                   
                <div className="relative rounded-b-[24px] flex items-start flex-col gap-1 border-t border-grey-4/80 bg-grey-5">                            
                            <button
                                onClick={() => setIsTripDropdownOpen((prev) => !prev)}
                                className="flex items-center justify-between gap-2 text-[14px] text-grey-0 font-medium cursor-pointer bg-grey-5 px-5 py-5 w-full">
                                {/* Stacked Flag Icons */}
                                <div className='flex items-center gap-3'>
                                    <div className="flex items-center -space-x-2 shrink-0">
                                        {destinationFlags.flags.length > 0 ? (
                                            destinationFlags.flags.slice(0, 3).map((flagUrl, index) => (
                                                <img
                                                    key={index}
                                                    src={flagUrl}
                                                    alt="Flag"
                                                    className="w-6 h-6 rounded-full object-cover border-[2px] border-white"
                                                    style={{ zIndex: destinationFlags.flags.length - index }}
                                                />
                                            ))
                                        ) : (
                                            <img
                                                src={BEACH_TREE}
                                                alt="Beach"
                                                className="w-8 h-8 rounded-full object-cover border-[2px] border-white"
                                            />
                                        )}
                                        
                                    </div>
                                    {/* Trip Name */}
                                    <span className="flex-1 min-w-0 truncate text-[14px] font-medium font-red-hat-display">
                                        {travelerTripsContext?.activeTrip?.name || tripDisplayName || 'No trip selected'}
                                    </span>
                                </div>
                                {/* Chevron */}
                                <ChevronDown
                                    className={`h-4 w-4 shrink-0 transition-transform ${
                                        isTripDropdownOpen ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>


                            {/* Dropdown */}
                            {isTripDropdownOpen && (
                                <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsTripDropdownOpen(false)}
                                />
                                <div className="absolute z-50 mt-2 right-5 bottom-16 w-90 max-h-60 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg scrollbar-hide">
                                    {tripsList.map((t) => {
                                    const flagData = tripFlagsMap[t.trip_id]

                                    return (
                                        <button
                                            key={t.trip_id}
                                            className={`w-full text-left px-2 py-2 text-[13px] font-medium font-manrope text-grey-0
                                            hover:bg-gray-100 flex items-center gap-1 ${
                                                t.trip_id === travelerTripsContext?.activeTripId
                                                    ? 'bg-primary-default/10 font-semibold hover:bg-primary-default/10' : ''
                                            }`}
                                            onClick={() => {
                                                travelerTripsContext?.updateActiveTrip?.(t.trip_id)
                                                setIsTripDropdownOpen(false)
                                            }}
                                        >
                                            {/* Flags */}
                                            <div className="flex items-center justify-center -space-x-1 shrink-0 w-14">
                                                {flagData?.flags?.length > 0 ? (
                                                    flagData.flags.map((flagUrl, index) => (
                                                    <img
                                                        key={index}
                                                        src={flagUrl}
                                                        alt="flag"
                                                        className="w-5 h-5 rounded-full object-cover"
                                                        style={{ zIndex: flagData.flags.length - index }}
                                                    />
                                                    ))
                                                ) : (
                                                    <img
                                                    src={BEACH_TREE}
                                                    alt="no destination"
                                                    className="w-5 h-5 rounded-full object-cover"
                                                    />
                                                )}
                                            </div>

                                            {/* Text */}
                                            <div className="flex flex-col justify-center">
                                                <span className="font-red-hat-display">
                                                    {formatCapitalizeFirstLetter(t)}
                                                </span>
                                                <span className="text-[10px] font-manrope text-grey-2">
                                                     {formatTripDropdownData(t)}
                                                </span>
                                            </div>
                                        </button>
                                    )
                                })}
                                </div>
                                </>
                            )}
                </div>

            </div>
        </div>
    )

    return (
        <>
            {createPortal(modalContent, container)}
            {inviteModalOpen && trip?.trip_id && (
                <InviteGenerationModal
                    isOpen={inviteModalOpen}
                    onClose={() => setInviteModalOpen(false)}
                    tripId={trip.trip_id}
                    anchorRect={anchorRect}
                />
            )}
            {/* Mobile bottom sheet for Guests — always mounted so CSS transition animates out */}
            {container && createPortal(
                <>
                    <div
                        className="fixed inset-0 bg-black/20 transition-opacity duration-200 ease-out"
                        style={{
                            zIndex: 10050,
                            opacity: isMobile && activeSection === 'groupType' ? 1 : 0,
                            pointerEvents: isMobile && activeSection === 'groupType' ? 'auto' : 'none',
                        }}
                        onClick={() => setActiveSection(null)}
                    />
                    <div
                        className="fixed left-0 right-0 bottom-0 transition-transform duration-300"
                        style={{
                            zIndex: 10051,
                            transform: isMobile && activeSection === 'groupType' ? 'translateY(0)' : 'translateY(100%)',
                            transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
                            pointerEvents: isMobile && activeSection === 'groupType' ? 'auto' : 'none',
                        }}>
                        <div className="bg-white border-t border-feature-card-border rounded-t-2xl shadow-lg w-full flex flex-col max-h-[75vh]">
                            <div className="flex justify-center pt-3 pb-1 shrink-0">
                                <div className="w-10 h-1 rounded-full bg-grey-4" />
                            </div>
                            <RoomsGuestsContent
                                initialOccupancies={guestOccupancies}
                                onApply={handleGroupSetupSave}
                                onClose={() => setActiveSection(null)}
                            />
                        </div>
                    </div>
                </>,
                container
            )}
            {activeSection && activeSection !== 'groupType' || (activeSection === 'groupType' && !isMobile) ? (
                <TripQuestionModal
                    isOpen={true}
                    onClose={() => setActiveSection(null)}
                    anchorRect={anchorRect}
                    width={activeSection === 'dates' ? 646 : 390}>
                    {activeSection === 'groupType' && !isMobile && (
                        <RoomsGuestsModal
                            isOpen={true}
                            onClose={() => setActiveSection(null)}
                            initialOccupancies={guestOccupancies}
                            onApply={handleGroupSetupSave}
                            embedded={true}
                        />
                    )}
                    {activeSection === 'destination' && (
                        <TripPreferenceDestinationStep
                            flowType="edit"
                            initialCountries={destinations}
                            onSave={handleDestinationSave}
                            onClose={() => setActiveSection(null)}
                            isSaving={isSaving}
                        />
                    )}
                    {activeSection === 'dates' && (
                        <TripPreferenceTripDatesStep
                            flowType="edit"
                            initialDates={tripDates}
                            onSave={handleTripDatesSave}
                            onClose={() => setActiveSection(null)}
                            isSaving={isSaving}
                        />
                    )}
                    {activeSection === 'purpose' && (
                        <TripPreferencePurposeStep
                            flowType="edit"
                            initialData={purposeInitialData}
                            onSave={handlePurposeSave}
                            onClose={() => setActiveSection(null)}
                            isSaving={isSaving}
                        />
                    )}
                    {activeSection === 'stay' && (
                        <TripPreferenceStayStep
                            flowType="edit"
                            initialTypes={stayTypes}
                            onSave={handleStaySave}
                            onClose={() => setActiveSection(null)}
                            isSaving={isSaving}
                        />
                    )}
                    {activeSection === 'activities' && (
                        <TripPreferenceActivitiesStep
                            flowType="edit"
                            initialExperiences={activityTypes}
                            onSave={handleActivitiesSave}
                            onClose={() => setActiveSection(null)}
                            isSaving={isSaving}
                        />
                    )}
                </TripQuestionModal>
            ) : null}
        </>
    )
}

interface PreferenceRowProps {
    label: string
    value: string
    onClick?: () => void
}

const PreferenceRow = ({ label, value, onClick }: PreferenceRowProps) => {
    const isClickable = Boolean(onClick)
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full px-6 flex items-center justify-between py-3 border-b border-grey-4/80 last:border-0 text-left ${
                isClickable ? 'hover:bg-grey-5 cursor-pointer' : 'cursor-default'
            }`}>
            <div>
                <div className="text-[14px] font-medium font-red-hat-display text-grey-0">{label}</div>
                <div className="text-[12px] font-medium font-manrope text-grey-2 mt-1">{value}</div>
            </div>
            <PencilIcon className={`h-4 w-4 ${isClickable ? 'text-grey-2/80' : 'text-grey-4'}`} />
        </button>
    )
}

export default TripPreferencesModal
