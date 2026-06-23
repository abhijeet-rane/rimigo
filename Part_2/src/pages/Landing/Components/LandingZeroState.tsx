import { useEffect, useMemo, useRef, useState } from 'react'
import { ImageShowCase } from '../../../pages/Landing/Components/ImageShowCase'
// import SearchBar from '@/components/common/SearchBar'
// import { useActivitiesSearch } from '../hooks/useActivitiesSearch'
import { getLiveCountries, type LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'
import { EXPERIENCE_IMG_1, EXPERIENCE_IMG_2, EXPERIENCE_IMG_3, EXPERIENCE_IMG_4, EXPERIENCE_IMG_5 } from '@/constants/icons/svgUrls'
import React from 'react'
import { GradientLoadingFooter } from '@/components/Footer/RimigoFooter'
import { GradientLoadingReversed } from '@/modules/Onboarding/pages/SettingUpTripLoading'
import { toast } from 'sonner'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { useSearchParams } from 'react-router-dom'

// Using the same images but will arrange them differently
const imgRectangle327 = EXPERIENCE_IMG_1
const imgRectangle292 = EXPERIENCE_IMG_2
const imgRectangle325 = EXPERIENCE_IMG_3
const imgRectangle326 = EXPERIENCE_IMG_4
const imgRectangle305 = EXPERIENCE_IMG_5

const staticImages = [imgRectangle327, imgRectangle292, imgRectangle325, imgRectangle326, imgRectangle305]

const LandingZeroStatePage = () => {
    const [searchParams] = useSearchParams()
    const [countries, setCountries] = useState<LocationPersonalizationResponse[]>([])
    const [displayedCountries, setDisplayedCountries] = useState<LocationPersonalizationResponse[]>([])
    const [selectedCountry, setSelectedCountry] = useState<string>('')
    const [selectedCountryName, setSelectedCountryName] = useState<string>('')
    const [isCountriesLoading, setIsCountriesLoading] = useState<boolean>(false)
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false)
    const [searchTerm, setSearchTerm] = useState<string>('')
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let isMounted = true

        const fetchCountries = async () => {
            setIsCountriesLoading(true)
            try {
                const response = await getLiveCountries()
                if (!isMounted) return
                setCountries(response)
                setDisplayedCountries(response)
                if (response.length) {
                    setSelectedCountry((prev) => prev || response[0].country_id)
                    setSelectedCountryName((prev) => prev || response[0].country_name)
                }
            } catch (error) {
                // Keep UI stable and log for debugging; add toast if desired.
                toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
            } finally {
                if (isMounted) setIsCountriesLoading(false)
            }
        }

        fetchCountries()

        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (!searchTerm.trim()) {
            setDisplayedCountries(countries)
            return
        }

        // Client-side filtering like in ChooseDestinationScreen
        const filtered = countries.filter((country) => country.country_name.toLowerCase().includes(searchTerm.toLowerCase()))
        setDisplayedCountries(filtered)
    }, [searchTerm, countries])

    const selectedCountryOption = useMemo(
        () =>
            countries.find((country) => country.country_id === selectedCountry) ||
            displayedCountries.find((country) => country.country_id === selectedCountry) ||
            null,
        [countries, displayedCountries, selectedCountry]
    )

    const handleCountrySelect = (country: LocationPersonalizationResponse) => {
        setSelectedCountry(country.country_id)
        setSelectedCountryName(country.country_name)
        setIsDropdownOpen(false)
        setSearchTerm('')
    }

    const handleGoClick = () => {
        if (!selectedCountry || !selectedCountryName) {
            return
        }

        const params = new URLSearchParams({
            // preserve existing query params
            ...Object.fromEntries(searchParams),
            country_id: selectedCountry,
            country_name: selectedCountryName,
            checkCountryMismatch: 'false'
        })

        window.location.href = `${DEFAULT_LANDING_PAGE_ROUTE}?${params.toString()}`
    }

    return (
        <div className="relative w-full min-h-screen bg-grey-5 md:bg-white flex flex-col items-center justify-start">
            <div className="w-full h-[100dvh] md:h-auto flex flex-col items-center justify-center bg-grey-5 pt-[4%] md:pt-[6%] rounded-b-[32px] md:shadow-[0px_2px_8px_#e0e0e0]">
                {/* Top Images Fan */}
                <div className="flex items-center justify-center mt-30 md:mt-0 mb-6 md:mb-12 px-4">
                    <ImageShowCase
                        className="max-md:w-[64px] max-md:h-[52px]"
                        images={staticImages}
                        aspectRatio="landscape"
                        showPlayButton={false}
                        isHovered={false}
                        enableTiltOnHover={false}
                        showBorder={false}
                        maxImages={5}
                        imageWidthPortraitCustom="w-20"
                        imageHeightPortraitCustom="h-16"
                        gap="none"
                    />
                </div>

                {/* Header */}
                <h1
                    className="text-[35px] md:text-[56px] leading-[32px] md:leading-[56px] mt-30 md:mt-0 font-red-hat-display font-[467] font-medium text-grey-0 text-center mb-8 md:mb-16 tracking-tight px-4"
                    style={{
                        filter: 'drop-shadow(0px 2px 8px #e0e0e0)'
                    }}>
                    End-to-end travel
                    <br />
                    assistance for{' '}
                    <span
                        className="text-primary-default italic font-[467]"
                        style={{
                            filter: 'drop-shadow(0px 2px 8px #e0e0e0)'
                        }}>
                        you
                    </span>
                </h1>

                {/* Search Section */}
                <div className="flex items-center w-fit max-w-[1000px] px-4 pb-0 md:pb-25 gap-5">
                    {/* Where are you going text */}
                    <div className="hidden md:block text-grey-2 text-[16px] font-medium leading-[18px] text-centre font-red-hat-display ">
                        Where are
                        <br />
                        you going?
                    </div>

                    {/* Destination dropdown with search + flags */}
                    <div
                        className="flex-1 min-w-[250px] relative"
                        ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsDropdownOpen((prev) => !prev)
                                // Scroll into view on mobile when dropdown opens
                                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                                    setTimeout(() => {
                                        window.scrollTo({
                                            top: document.documentElement.scrollHeight,
                                            behavior: 'smooth'
                                        })
                                    }, 100)
                                }
                            }}
                            className="w-full flex items-center justify-between rounded-2xl border border-grey-4 bg-white px-4 py-3 text-grey-0 shadow-sm transition hover:shadow-md"
                            style={{ minHeight: 56 }}>
                            <div className="flex items-center gap-3 overflow-hidden">
                                {selectedCountryOption?.flag_icon_url ? (
                                    <img
                                        src={selectedCountryOption.flag_icon_url}
                                        alt={selectedCountryOption.country_name}
                                        className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-md bg-grey-5 flex-shrink-0" />
                                )}
                                <span className="truncate font-manrope font-semibold text-[16px]">
                                    {selectedCountryName || 'Select a destination'}
                                </span>
                            </div>
                            <svg
                                className="w-5 h-5 text-grey-1 flex-shrink-0"
                                viewBox="0 0 20 20"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M5 7.5L10 12.5L15 7.5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-grey-4 shadow-xl z-20 overflow-hidden">
                                <div className="p-3 border-b border-grey-4 bg-grey-5">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder="Search for destination"
                                        className="w-full rounded-xl border border-grey-4 bg-white px-3 py-2 text-[16px] text-grey-0 outline-none focus:border-primary-default"
                                    />
                                </div>
                                <div className="max-h-64 overflow-auto bg-white">
                                    {isCountriesLoading && <div className="p-3 text-sm text-grey-2">Loading destinations...</div>}
                                    {!isCountriesLoading && displayedCountries.length === 0 && searchTerm.trim() && (
                                        <div className="p-3 text-sm text-grey-2">No destinations found</div>
                                    )}
                                    {!isCountriesLoading &&
                                        displayedCountries.map((country, idx) => (
                                            <React.Fragment key={country.country_id}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCountrySelect(country)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-grey-5 transition">
                                                    {country.flag_icon_url ? (
                                                        <img
                                                            src={country.flag_icon_url}
                                                            alt={country.country_name}
                                                            className="w-8 h-8 rounded-md object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-md bg-grey-4" />
                                                    )}
                                                    <span className="font-manrope text-[16px] text-grey-0">{country.country_name}</span>
                                                </button>
                                                {idx < displayedCountries.length - 1 && <div className="h-px bg-grey-4" />}
                                            </React.Fragment>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="rounded-2xl px-5 py-5 font-semibold text-white on hover: cursor-pointer"
                        style={{
                            background: 'linear-gradient(135deg, #7011F6 0%, #5310C7 50%, #3B0F98 100%)'
                        }}
                        onClick={handleGoClick}>
                        GO
                    </button>

                    {/* SearchBar Component with global search */}
                    {/* <div className="flex-1">
                        <SearchBar
                            iconSrc={FERRIS_WHEEL_ICON}
                            iconAlt="Activities"
                            onSearch={onSearch}
                            showFilters={false}
                            showSort={false}
                            whereConfig={whereConfig}
                            whenConfig={whenConfig}
                            preferencesConfig={preferencesConfig}
                            locationPreferences={[]}
                        />
                    </div> */}
                </div>

                {!isDropdownOpen && (
                    <div className="block md:hidden mt-auto w-full">
                        <GradientLoadingReversed />
                    </div>
                )}
            </div>

            <div className="hidden md:block mt-auto w-full">
                <GradientLoadingFooter />
            </div>
        </div>
    )
}

export default LandingZeroStatePage
