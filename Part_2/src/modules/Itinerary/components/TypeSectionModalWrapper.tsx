import DropdownSection from './DropDownSection'
import { SlotType } from '../types/slotTypes'
import TransportSection, { type FlightSearchRequest, type TransportSectionHandle } from './TransportSection'
import ActivitySection from './ActivitySection'
import RestaurantSection from './RestaurantSection'
import { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react'
import { SlotPayloadProvider } from './SlotPayloadProvider'
import { CustomSection } from './CustomSection'
import MealSection, { PlaceSection } from './MealSection'
import { placePhotoProxyUrl } from '../utils/mealPlaceImage'
import { AlertCircle } from 'lucide-react'
import { ShortlistedByTripExperienceResponse } from '@/modules/Experiences/api/experienceShortlistAPI'
import SearchableCityDropdown from '@/components/common/SearchableCityDropdown'
import type { CityListItem } from '@/components/common/SearchBar'
import AddSlotLabel from './AddSlotLabel'

/** Slot kinds that carry a single per-slot city (and so show the picker). */
const CITY_AWARE_KINDS = ['experience', 'place', 'meal'] as const

/** Ref surface — adds the flight-search handoff on top of getPayload. */
export interface TypeSectionHandle extends SlotPayloadProvider {
    getFlightSearch: () => FlightSearchRequest | null
}

interface BaseCity {
    id: string
    name: string
    country: string
}

interface Props {
    slotType: SlotType
    baseCity?: BaseCity
    shortlistedExpercience: ShortlistedByTripExperienceResponse | undefined
    slot?: any
    onOpenChange?: (open: boolean) => void
    defaultOpen?: boolean
    validationError?: string
    onErrorClear?: () => void
    /** Slot day (``YYYY-MM-DD``) — seeds the commercial-flight search date. */
    slotDate?: string
    /** Bubbles the transport section's commercial-flight status to the composer. */
    onFlightModeChange?: (isFlight: boolean) => void
}

interface TransportPlace {
    place_id: string
    latitude: number
    longitude: number
    address: string
    google_maps_url: string
}

interface TransportData {
    mode: { label: string; kind: string } | null
    routeType: 'intra' | 'inter'
    fromCity: string
    toCity: string
    fromLocation: TransportPlace | null
    toLocation: TransportPlace | null
    fromCityId: string | null
    toCityId: string | null
    title: string
    estimatedCost: string
    currency: string
    fromAirport: string
    toAirport: string
    fromIata: string | null
    toIata: string | null
    flightDate: string
}

interface CustomData {
    title: string
}

const TypeSectionModalWrapper = forwardRef<TypeSectionHandle, Props>(
    (
        {
            slotType,
            baseCity,
            slot,
            defaultOpen = false,
            validationError,
            onErrorClear,
            shortlistedExpercience,
            onOpenChange,
            slotDate,
            onFlightModeChange
        },
        ref
    ) => {
        const [isOpen, setIsOpen] = useState(defaultOpen)

        const [selectedActivity, setSelectedActivity] = useState<ExperienceCardData | null>(null)
        const [transportData, setTransportData] = useState<TransportData | null>(null)
        const [customData, setCustomData] = useState<CustomData | null>(null)
        const [mealData, setMealData] = useState<{ title: string; placeData?: any } | null>(null)
        const [placeData, setPlaceData] = useState<{ title: string; placeData?: any } | null>(null)
        const mealRef = useRef<SlotPayloadProvider>(null)
        const placeRef = useRef<SlotPayloadProvider>(null)
        const transportRef = useRef<TransportSectionHandle>(null)
        const customRef = useRef<SlotPayloadProvider>(null)
        const hasInitializedExperienceRef = useRef(false)

        // Per-slot city. Seeded from the slot's own city on edit, else the
        // day's city (``baseCity``); for an experience it then follows the
        // picked activity's own city. Stays user-editable so a slot that
        // physically sits in a different city than the day's base can be
        // corrected. Only surfaced for ``CITY_AWARE_KINDS`` — transport
        // carries its own from/to cities and custom slots are city-agnostic.
        const [selectedCity, setSelectedCity] = useState<CityListItem | null>(() => {
            // ``slot.slotCity`` is the canonical ``{_id, name}`` object threaded
            // from the API slot; ``slot.city`` is occupied by the day's base-city
            // *name string* in the calendar view-model, so it can't be used here.
            const sc = slot?.slotCity ?? slot?.city
            if (sc && (sc._id || sc.id)) {
                return { id: sc._id ?? sc.id, name: sc.name }
            }
            if (baseCity?.id) {
                return { id: baseCity.id, name: baseCity.name }
            }
            return null
        })

        // Auto-open when validation error occurs
        useEffect(() => {
            if (validationError) {
                setIsOpen(true)
            }
        }, [validationError])
        useEffect(() => {
            if (slotType.value === 'experience' && slot?.slot_data && !hasInitializedExperienceRef.current) {
                setSelectedActivity(mapSlotDataToExperienceCard(slot.slot_data))
                hasInitializedExperienceRef.current = true
            }
        }, [slotType.value, slot])

        // Sync with parent's defaultOpen changes
        useEffect(() => {
            setIsOpen(defaultOpen)
        }, [defaultOpen])
        // Clear error when user interacts
        const handleDataChange = <T,>(data: T, setter: (data: T) => void) => {
            setter(data)
            if (onErrorClear) {
                onErrorClear()
            }
        }
        const hasValidTransportData = (data: TransportData) => {
            return Boolean(data.mode && data.fromCity && data.toCity)
        }

        const hasValidMealData = (data: { title: string }) => {
            return Boolean(data.title?.trim())
        }

        const hasValidCustomData = (data: CustomData) => {
            return Boolean(data.title?.trim())
        }

        useImperativeHandle(ref, () => ({
            getFlightSearch() {
                // Only the transport section ever produces a flight-search
                // handoff; every other slot type returns null.
                return slotType.value === 'transport' ? (transportRef.current?.getFlightSearch() ?? null) : null
            },
            getPayload() {
                // ``CITY_AWARE_KINDS`` get the canonical ``{_id, name}``
                // City dict folded onto their payload; the backend stores it
                // as ``ItinerarySlot.city``.
                const cityDict = selectedCity ? { _id: selectedCity.id, name: selectedCity.name } : undefined

                switch (slotType.value) {
                    case 'meal': {
                        const payload = mealRef.current?.getPayload()
                        if (!payload) return null
                        return cityDict ? { ...payload, city: cityDict } : payload
                    }

                    case 'place': {
                        const payload = placeRef.current?.getPayload()
                        if (!payload) return null
                        return cityDict ? { ...payload, city: cityDict } : payload
                    }

                    case 'experience':
                        return selectedActivity
                            ? {
                                  entity_id: selectedActivity.id,
                                  entity_model: 'experiences',
                                  ...(cityDict ? { city: cityDict } : {})
                              }
                            : null

                    case 'transport':
                        return transportRef.current?.getPayload() || null

                    case 'custom':
                        return customRef.current?.getPayload() || null

                    default:
                        return null
                }
            }
        }))

        const getSelectedContent = () => {
            if (slotType.value === 'experience' && selectedActivity) {
                return (
                    <div className="flex items-center gap-2">
                        <img
                            src={selectedActivity.images?.[0] ?? selectedActivity.image}
                            className="w-6 h-6 rounded object-cover"
                        />
                        <span className="text-sm font-medium">{selectedActivity.title}</span>
                    </div>
                )
            }
            if (slotType.value === 'meal' && mealData?.title) {
                return <span className="text-sm font-medium">{mealData.title}</span>
            }
            if (slotType.value === 'place' && placeData?.title) {
                return <span className="text-sm font-medium">{placeData.title}</span>
            }
            if (slotType.value === 'transport' && transportData?.fromCity && transportData?.toCity) {
                return (
                    <span className="text-sm font-medium">
                        {transportData.mode?.label ? `${transportData.mode.label}: ` : ''}
                        {transportData.fromCity} → {transportData.toCity}
                    </span>
                )
            }

            if (slotType.value === 'custom' && customData?.title) {
                return <span className="text-sm font-medium">{customData.title}</span>
            }

            return null
        }

        const getInitialTransportData = () => {
            if (transportData) {
                return {
                    modeLabel: transportData.mode?.label ?? null,
                    routeType: transportData.routeType,
                    fromCity: transportData.fromCity,
                    toCity: transportData.toCity,
                    fromLocation: transportData.fromLocation,
                    toLocation: transportData.toLocation,
                    fromCityId: transportData.fromCityId,
                    toCityId: transportData.toCityId,
                    title: transportData.title,
                    estimatedCost: transportData.estimatedCost,
                    currency: transportData.currency
                }
            }

            if (slot?.slot_data) {
                const fromCityId = (slot.slot_data.from_city_id as string | undefined) ?? null
                const toCityId = (slot.slot_data.to_city_id as string | undefined) ?? null
                // Slots saved as inter-city carry city IDs; otherwise treat
                // the persisted endpoints as Google Places venues.
                const routeType: 'intra' | 'inter' = fromCityId || toCityId ? 'inter' : 'intra'
                return {
                    modeLabel: slot.slot_data.mode || null,
                    routeType,
                    // Intra-city slots persist endpoints as venue fields;
                    // inter-city slots use city fields. Either should
                    // prefill the form's source/dest inputs so editing a
                    // taxi from "Phuket Airport" → "Patong" doesn't
                    // surface as empty fields the user has to retype.
                    fromCity: slot.slot_data.from_venue || slot.slot_data.from_city || '',
                    toCity: slot.slot_data.to_venue || slot.slot_data.to_city || '',
                    // Carry forward a previously picked Google place so
                    // the map link keeps using exact coords until the
                    // user re-searches.
                    fromLocation: (slot.slot_data.from_location as TransportPlace | undefined) ?? null,
                    toLocation: (slot.slot_data.to_location as TransportPlace | undefined) ?? null,
                    fromCityId,
                    toCityId,
                    title: slot.title || '',
                    estimatedCost: slot.estimated_cost?.toString() || '',
                    currency: slot.currency || 'INR'
                }
            }

            return undefined
        }

        const getInitialMealData = () => {
            if (mealData) {
                return mealData
            }
            if (slot) {
                // Rehydrate the Google-Place card on edit. Slots can
                // land here from any of three writers, each using its
                // own image field:
                //   - MealSection (manual)         → ``image_url``
                //   - Concierge Places enricher    → ``photo_url``
                //   - V2 itinerary generator       → ``display_props.landscape_image``
                // The Kanban / calendar already read all three via
                // ``resolveMealPlaceImage``; we mirror that fallback
                // here so the edit preview matches what the saved
                // card shows. Rating + review count come across when
                // the enricher populated them.
                const sd = slot.slot_data || {}
                const hasPlace = Boolean(sd.place_id && sd.name)
                // Canonical meal ``slot_data`` writes the Places-v1
                // shape (``formatted_address``, nested ``location``,
                // ``google_maps_uri``, ``photo_url``, ``photos[]``,
                // ``rating``, ``user_ratings_count``). Legacy writer
                // used flat ``address`` / ``map_link`` / ``image_url``
                // / ``user_ratings_total`` / top-level lat-lng — each
                // falls through as a backwards-compat fallback so old
                // slots keep rehydrating.
                // Prefer the place_id photo proxy (stable) when rehydrating
                // the edit form; legacy photo_url/image_url only for slots
                // that predate the proxy and carry no place_id.
                const photoUrl =
                    (sd.place_id ? placePhotoProxyUrl(sd.place_id as string, 800) : null) ||
                    sd.photo_url ||
                    sd.image_url ||
                    sd.display_props?.landscape_image ||
                    null
                const address = sd.formatted_address || sd.address || ''
                const googleMapsUrl = sd.google_maps_uri || sd.map_link || ''
                const latitude =
                    typeof sd.location?.latitude === 'number' ? sd.location.latitude : typeof sd.latitude === 'number' ? sd.latitude : null
                const longitude =
                    typeof sd.location?.longitude === 'number' ? sd.location.longitude : typeof sd.longitude === 'number' ? sd.longitude : null
                const userRatingsCount =
                    typeof sd.user_ratings_count === 'number'
                        ? sd.user_ratings_count
                        : typeof sd.user_ratings_total === 'number'
                          ? sd.user_ratings_total
                          : null
                return {
                    title: slot.title || sd.name || '',
                    placeData: hasPlace
                        ? {
                              placeId: sd.place_id,
                              name: sd.name,
                              address,
                              photoUrl,
                              googleMapsUrl,
                              latitude,
                              longitude,
                              primaryType: sd.primary_type || null,
                              rating: typeof sd.rating === 'number' ? sd.rating : null,
                              userRatingsCount,
                              photos: Array.isArray(sd.photos) ? sd.photos : undefined
                          }
                        : null
                }
            }
            return undefined
        }

        const getInitialCustomData = () => {
            if (customData) {
                return customData
            }

            if (slot) {
                const sd = slot.slot_data || {}
                return {
                    title: slot.title || '',
                    notes: slot.notes || '',
                    iconMode: typeof sd.icon_mode === 'string' ? sd.icon_mode : null,
                    iconUrl: typeof sd.icon_url === 'string' ? sd.icon_url : null,
                    bgColor: typeof sd.bg_color === 'string' ? sd.bg_color : null,
                    timeBound: typeof sd.time_bound === 'boolean' ? sd.time_bound : undefined,
                    description: typeof sd.description === 'string' ? sd.description : ''
                }
            }

            return undefined
        }
        const mapSlotDataToExperienceCard = (slotData: any): ExperienceCardData => {
            return {
                id: slotData?.id ?? '',
                title: slotData?.name ?? '',
                name: slotData?.name ?? undefined,
                identifier: slotData?.identifier ?? undefined,

                city_name: slotData?.city_name ?? '',
                city_id: slotData?.city_id ?? '',

                price: slotData?.price ?? {
                    currency: '',
                    lower_bound: null,
                    upper_bound: null
                },

                // Deprecated but still required
                image: slotData?.display_props?.landscape_image ?? slotData?.verified_photos?.[0]?.url ?? '',

                images: [
                    ...(slotData?.verified_photos?.map((p: any) => p.url) ?? []),
                    ...(slotData?.display_props?.landscape_image ? [slotData.display_props.landscape_image] : [])
                ],

                suggestion_priority: slotData?.suggestion_priority ?? null,

                experience_recommended: null,

                short_description: slotData?.short_description ?? null,

                category: slotData?.categories?.[0] ?? null,
                categoryBackendValue: slotData?.categories?.[0] ?? null,
                categories: slotData?.categories ?? null,

                categoryIcon: null
            }
        }

        const renderContent = () => {
            switch (slotType.value) {
                case 'meal':
                    return (
                        <MealSection
                            ref={mealRef}
                            initialData={getInitialMealData()}
                            onChange={(data) => {
                                setMealData(data)

                                if (hasValidMealData(data)) {
                                    onErrorClear?.()
                                }
                            }}
                        />
                    )
                case 'place':
                    return (
                        <PlaceSection
                            ref={placeRef}
                            initialData={getInitialMealData()}
                            onChange={(data) => {
                                setPlaceData(data)

                                if (hasValidMealData(data)) {
                                    onErrorClear?.()
                                }
                            }}
                        />
                    )
                case 'experience':
                    return (
                        <ActivitySection
                            shortlistedExpercience={shortlistedExpercience}
                            baseCity={baseCity}
                            value={selectedActivity}
                            onChange={(activity) => {
                                handleDataChange(activity, setSelectedActivity)
                                if (activity) {
                                    setIsOpen(false)
                                    // Default this slot's city to the experience's
                                    // own city; the user can still override below.
                                    if (activity.city_id && activity.city_name) {
                                        setSelectedCity({ id: activity.city_id, name: activity.city_name })
                                    }
                                }
                            }}
                        />
                    )

                case 'transport':
                    return (
                        <TransportSection
                            ref={transportRef}
                            initialData={getInitialTransportData()}
                            baseCity={baseCity}
                            slotDate={slotDate}
                            onFlightModeChange={onFlightModeChange}
                            onChange={(data) => {
                                setTransportData(
                                    data.mode ? { ...data, mode: { label: data.mode.label, kind: data.mode.kind } } : { ...data, mode: null }
                                )

                                if (hasValidTransportData({ ...data, mode: data.mode ? { label: data.mode.label, kind: data.mode.kind } : null })) {
                                    onErrorClear?.()
                                }
                            }}
                        />
                    )

                case 'custom':
                    return (
                        <CustomSection
                            ref={customRef}
                            initialData={getInitialCustomData()}
                            onChange={(data) => {
                                setCustomData(data)

                                if (hasValidCustomData(data)) {
                                    onErrorClear?.()
                                }
                            }}
                        />
                    )

                case 'restaurant':
                    return <RestaurantSection />

                default:
                    return null
            }
        }

        const showCityField = (CITY_AWARE_KINDS as readonly string[]).includes(slotType.value)

        return (
            <>
                <DropdownSection
                    errorContent={
                        validationError && (
                            <div className="flex flex-row  gap-2 items-center">
                                <AlertCircle className="w-4 h-4 text-secondary-red flex-shrink-0 " />
                                <p className="text-sm font-medium text-secondary-red font-manrope">{validationError}</p>
                            </div>
                        )
                    }
                    title={getTitle(slotType.value)}
                    selectedContent={getSelectedContent()}
                    defaultOpen={isOpen}
                    onOpenChange={(open) => {
                        setIsOpen(open)
                        onOpenChange?.(open) // Notify parent
                    }}>
                    {' '}
                    {renderContent()}
                </DropdownSection>

                {showCityField && (
                    <div className="flex flex-col gap-1">
                        <AddSlotLabel text="City" />
                        <SearchableCityDropdown
                            compact
                            value={selectedCity}
                            onChange={setSelectedCity}
                            placeholder="Search for a city…"
                            initialCities={selectedCity ? [selectedCity] : []}
                        />
                        <p className="text-[11px] font-manrope font-medium text-grey-2 leading-[15px] mt-0.5">
                            Defaults to this day’s city. Change it if this slot sits in a different city.
                        </p>
                    </div>
                )}
            </>
        )
    }
)

TypeSectionModalWrapper.displayName = 'TypeSectionModalWrapper'
export default TypeSectionModalWrapper

function getTitle(type: string) {
    switch (type) {
        case 'meal':
            return 'Meal Details'
        case 'place':
            return 'Place Details'
        case 'experience':
            return 'Select Activity'
        case 'transport':
            return 'Transport Details'
        case 'restaurant':
            return 'Select Restaurant'
        case 'custom':
            return 'Details'
        default:
            return 'Details'
    }
}
