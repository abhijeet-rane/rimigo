import React, { useState, useMemo, useEffect } from 'react'
import TripSummaryBadge from '@/components/common/TripSummaryBadge'
import TripPreferencesModal from '@/components/common/TripPreferencesModal'
import TripCreationFlow from '@/components/common/TripCreationFlow'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CountrySwitcher } from './CountrySwitcher'
import { useCountries } from '@/hooks/useCountries'
import { useOptionalTravelerTrips } from '../context/travelerTripsContext'
import { useLoginModal } from '@/modules/Onboarding/context/LoginModalContext'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

type HeaderWithSidebarProps = {
    showCountrySwitcher?: boolean
    heading?: React.ReactNode
    showTripSelectionButton?: boolean
}

export const HeaderWithSidebar: React.FC<HeaderWithSidebarProps> = ({
    showCountrySwitcher = true,
    heading,
    showTripSelectionButton = false
}) => {
    const [isTripPreferencesOpen, setIsTripPreferencesOpen] = useState(false)
    const [isTripCreationOpen, setIsTripCreationOpen] = useState(false)
    const [tripPreferencesAnchor, setTripPreferencesAnchor] = useState<DOMRect | null>(null)
    const { isAuthenticated } = useAuth()
    const { openLoginModal } = useLoginModal()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const { trackButtonClickCustom } = usePostHog()

    
    const isTripPlanned = Boolean(
        activeTrip?.final_destination_countries && 
        activeTrip.final_destination_countries.length > 0
    )
    const shouldUsePrioritized = isAuthenticated && isTripPlanned

    // const { countries, isLoadingCountries, isTripPlanned, activeTrip } = useCountries()

   const { 
       allCountries: countries, 
       isLoading: isLoadingCountries 
   } = useCountries({ 
       shouldUsePrioritized 
   } )

    // Get country from URL params (needed for mismatch detection)
    const countryIdFromURL = searchParams.get('country_id')
    const countryNameFromURL = searchParams.get('country_name')

    // Check if URL country is in active trip (for mismatch detection)
    const isCountryMismatch = useMemo(() => {
        if (!countryIdFromURL || !activeTrip?.final_destination_countries) return false
        const tripCountryIds = activeTrip.final_destination_countries.map((c) => c.id)
        return !tripCountryIds.includes(countryIdFromURL)
    }, [countryIdFromURL, activeTrip?.final_destination_countries])

    // Filter countries based on active trip
    // If trip exists, show only trip's final_destination_countries
    // If no trip, show all live countries
    // If country mismatch (URL country not in trip), show all countries
    // Sort alphabetically by country name
    const filteredCountries = useMemo(() => {
        if (!showCountrySwitcher || !countries) return []

        let filtered = [] as typeof countries

        // If there's a country mismatch, show all countries
        if (isCountryMismatch) {
            filtered = countries
        }
        // If there's an active trip with final_destination_countries, filter to only those
        else if (isTripPlanned && activeTrip?.final_destination_countries) {
            const tripCountryIds = activeTrip.final_destination_countries.map((c) => c.id)
            filtered = countries.filter((country) => tripCountryIds.includes(country.country_id))
        } else {
            // No trip or no countries in trip, show all live countries
            filtered = countries
        }

        // Sort alphabetically by country name
        return filtered.sort((a, b) => a.country_name.localeCompare(b.country_name))
    }, [showCountrySwitcher, countries, activeTrip?.final_destination_countries, isCountryMismatch])

    // Find URL country in all countries (not just filtered) for mismatch case
    const urlCountry = countryIdFromURL && countryNameFromURL ? countries?.find((c) => c.country_id === countryIdFromURL) : null
    const urlCountryInFiltered = countryIdFromURL ? filteredCountries?.find((c) => c.country_id === countryIdFromURL) : null

    // Determine selected country:
    // - If URL country exists in filteredCountries → use it
    // - If country mismatch (URL country not in trip but in all countries) → use URL country from all countries
    // - If no URL country → use first country alphabetically
    const selectedCountry = useMemo(() => {
        if (!showCountrySwitcher) return null
        // If URL has country params
        if (countryIdFromURL || countryNameFromURL) {
            // If URL country is in filteredCountries, use it
            if (urlCountryInFiltered) {
                return urlCountryInFiltered
            }
            // If country mismatch, use the country from all countries (it will be in filteredCountries now since we show all)
            if (isCountryMismatch && urlCountry) {
                return urlCountry
            }
            // Otherwise, return null (no selection)
            return null
        }
        // No URL params, use first alphabetical country
        return filteredCountries?.[0] || null
    }, [showCountrySwitcher, countryIdFromURL, countryNameFromURL, urlCountryInFiltered, urlCountry, isCountryMismatch, filteredCountries])

    const selectedCountryId = showCountrySwitcher && selectedCountry ? selectedCountry.country_id : null

    // Sync selected country to URL if no URL param exists (initial load)
    // This ensures URL is the single source of truth for both Header and MainContent
    useEffect(() => {
        if (!showCountrySwitcher || !selectedCountry || isLoadingCountries) return
        // Only sync if there's no country in URL
        if (countryIdFromURL || countryNameFromURL) return

        // Update URL with selected country (first alphabetical)
        const params = new URLSearchParams(searchParams.toString())
        params.set('country_id', selectedCountry.country_id)
        params.set('country_name', selectedCountry.country_name)
        navigate(`?${params.toString()}`, { replace: true })
    }, [showCountrySwitcher, selectedCountry, countryIdFromURL, countryNameFromURL, navigate, searchParams, isLoadingCountries])

    const handleCreateTrip = (rect?: DOMRect) => {
        trackButtonClickCustom?.({
            buttonPage: 'ata_landing_page_header',
            buttonName: 'create_trip',
            buttonAction: 'click'
        })
        // Open trip creation flow directly - it will handle authentication when needed
        setTripPreferencesAnchor(rect || null)
        setIsTripCreationOpen(true)
    }

    const handleEditTrip = (rect: DOMRect) => {
        trackButtonClickCustom?.({
            buttonPage: 'ata_landing_page_header',
            buttonName: 'edit_trip_modal',
            buttonAction: 'click'
        })
        // Open trip preferences modal
        setTripPreferencesAnchor(rect)
        setIsTripPreferencesOpen(true)
    }

    const handleCountrySelect = (countryId: string, countryName: string) => {
        if (!showCountrySwitcher) return
        trackButtonClickCustom?.({
        buttonPage: 'ata_landing_page_header',
        buttonName: 'country_select',
        buttonAction: 'select',
            extra: {
                selectedCountryId: countryId,
                selectedCountryName: countryName,
            }
        })
        // Update URL with country params
        const params = new URLSearchParams(searchParams.toString())
        params.set('country_id', countryId)
        params.set('country_name', countryName)
        navigate(`?${params.toString()}`, { replace: true })
        // Keep dropdown open - don't close it
    }

    const shouldRenderTripSummaryBadge = showTripSelectionButton || isAuthenticated
    const renderHeading = () => {
        if (!heading) return null
        if (typeof heading === 'string') {
            return (
                <h1 className="text-xl font-semibold text-grey-0 md:text-2xl">
                    {heading}
                </h1>
            )
        }
        return heading
    }

    return (
        <header className="bg-white border-b-0 md:border-b border-feature-card-border w-full">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-3 items-center py-2 md:py-4 min-h-[72px]">
                    {/* Left */}
                    <div className="hidden md:flex items-center gap-3 md:gap-2 lg:gap-2.5">
                        {isAuthenticated ? (
                            <span className="flex items-center gap-2 font-red-hat-display font-semibold text-xl"></span>
                        ) : (
                            <img
                                src="/icons/logo-transparent-indigo.png"
                                alt="Rimigo"
                                className="h-8 w-auto"
                            />
                        )}
                    </div>

                    {/* Center - CountrySwitcher */}
                    <div className="col-span-3 md:col-span-1 flex items-center justify-center">
                        {showCountrySwitcher ? (
                            <CountrySwitcher
                                countries={filteredCountries}
                                selectedCountryId={selectedCountryId}
                                onCountrySelect={handleCountrySelect}
                                isLoading={isLoadingCountries}
                            />
                        ) : (
                            renderHeading()
                        )}
                    </div>

                    {/* Right */}
                    <div className="flex items-center justify-end gap-3 md:gap-2 lg:gap-2.5">
                        {shouldRenderTripSummaryBadge ? (
                            <TripSummaryBadge
                                onEdit={handleEditTrip}
                                onCreate={handleCreateTrip}
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    // If not authenticated, open login modal first
                                    // After successful login, open trip creation flow
                                    if (!isAuthenticated) {
                                        openLoginModal({
                                            redirectAfterLogin: false,
                                            onLoginSuccess: () => {
                                                // Open trip creation flow after successful login
                                                setTripPreferencesAnchor(null)
                                                setIsTripCreationOpen(true)
                                            }
                                        })
                                    } else {
                                        // If authenticated, open trip creation flow directly
                                        setTripPreferencesAnchor(null)
                                        setIsTripCreationOpen(true)
                                    }
                                }}
                                className="hidden md:flex items-center gap-3 md:gap-2 lg:gap-2.5 px-4 py-3 md:px-3 md:py-2 lg:px-3.5 lg:py-2.5 rounded-lg text-white cursor-pointer"
                                style={{
                                    borderRadius: 8,
                                    background: 'linear-gradient(90deg, var(--primary-indigo, #7011F6) 0%, var(--primary-dark, #4D1D91) 100%)'
                                }}
                            >
                                <span className="text-sm md:text-xs lg:text-xs font-semibold tracking-[-0.28px] font-['Red_Hat_Display']">
                                    CREATE TRIP
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Trip Preferences Modal */}
            {isAuthenticated && (
                <TripPreferencesModal
                    isOpen={isTripPreferencesOpen}
                    onClose={() => setIsTripPreferencesOpen(false)}
                    trip={activeTrip || undefined}
                    anchorRect={tripPreferencesAnchor}
                />
            )}

            {/* Trip Creation Flow */}
            <TripCreationFlow
                isOpen={isTripCreationOpen}
                onClose={() => setIsTripCreationOpen(false)}
                anchorRect={tripPreferencesAnchor}
                countryMismatchInfo={null}
                onSuccess={() => {
                    // Optionally show a success message or refresh data
                    setIsTripCreationOpen(false)
                }}
            />
        </header>
    )
}
