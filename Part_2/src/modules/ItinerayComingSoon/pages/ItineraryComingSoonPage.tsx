import { useMemo } from 'react'
import { WEBSITE_CONFIG } from '@/constants/websiteConfig'
// import { countryCodes } from '@/utils/country-code'
import { ZERO_STATE_IMG } from '@/constants/icons/svgFromCDN'
import { LocationResponse } from '@/modules/Onboarding/api'

interface ItineraryComingSoonPageProps {
    tripCountryIds: string[]
    allCountries?: LocationResponse[]
    tripCountries: Array<string | { id?: string; name?: string }>
}

// Helper function to get flag emoji from country name
// const getCountryFlag = (countryName: string): string => {
//     const country = countryCodes.find((c) => c.name.toLowerCase() === countryName.toLowerCase())
//     return country?.flag || '🏳️'
// }

// Format countries for display - get names from liveCountries by matching IDs
const formatCountries = (
    tripCountryIds: string[],
    allCountries?: LocationResponse[],
    tripCountries?: Array<string | { id?: string; name?: string }>
): Array<{ id: string; name: string }> => {
    return tripCountryIds
        .map((countryId) => {
            // First try to find in liveCountries
            const liveCountry = allCountries?.find((c) => c.country_id === countryId)
            if (liveCountry) {
                return {
                    id: liveCountry.country_id,
                    name: liveCountry.country_name
                }
            }
            // Fallback: check if tripCountries already has name (object format)
            const tripCountry = tripCountries?.find((c) => {
                if (typeof c === 'string') return c === countryId
                return (c as { id?: string })?.id === countryId
            })
            if (tripCountry && typeof tripCountry === 'object') {
                const countryObj = tripCountry as { id?: string; name?: string }
                if (countryObj.name) {
                    return {
                        id: countryId,
                        name: countryObj.name
                    }
                }
            }
            return null
        })
        .filter((country): country is { id: string; name: string } => country !== null && country.name !== '')
}

function ItineraryComingSoonPage({ tripCountryIds, allCountries, tripCountries }: ItineraryComingSoonPageProps) {
    // Format countries for display
    const countries = useMemo(() => formatCountries(tripCountryIds, allCountries, tripCountries), [tripCountryIds, allCountries, tripCountries])
    return (
        <div className="min-h-screen bg-white flex items-center justify-start">
            <div className="absolute top-0 w-full">
                <GradientLoading />
            </div>
            <div className="w-full text-center flex flex-col items-center justify-start">
                <div
                    className="animate-fade-in-up"
                    style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
                    <div className="flex flex-col gap-1 items-center ">
                        <div className="flex gap-2 flex-row items-center">
                            <img
                                src="/icons/logo-transparent-indigo.png"
                                alt="Rimigo Logo"
                                className="w-20 h-20 object-contain rounded-full"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <img
                        src={ZERO_STATE_IMG}
                        alt="Itinerary Coming Soon"
                        className="w-64 h-64 object-contain mb-4"
                    />
                </div>
                <div className='px-3 md:px-0 flex flex-col items-center justify-center '>
                    <h1
                        className="text-[40px] font-[600] mb-2 animate-fade-in-up"
                        style={{
                            animationDelay: '0.2s',
                            opacity: 0,
                            animationFillMode: 'forwards',
                            color: '#101010',
                            letterSpacing: '-0.02em'
                        }}>
                        AI-powered Itinerary
                    </h1>

                    <p
                        className="text-xl md:text-[16px] mb-12 animate-fade-in-up"
                        style={{
                            animationDelay: '0.3s',
                            opacity: 0,
                            animationFillMode: 'forwards',
                            color: '#747474',
                            fontWeight: 400
                        }}>
                        Add cities, plan experiences, and see your journey come to life.
                    </p>

                    <button
                        type="button"
                        disabled={true}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-not-allowed  bg-white border-[2px] border-grey-4 text-grey-2"
                        style={{
                            borderRadius: 8
                        }}>
                        <span className="text-[18px] font-[500]  font-red-hat-display">
                            Coming Soon for{' '}
                            {countries.length > 0 ? (
                                countries.length === 1 ? (
                                    <>
                                        {/* {getCountryFlag(countries[0].name)}  */}
                                        {countries[0].name}
                                    </>
                                ) : (
                                    'Multidestination Trips'
                                )
                            ) : (
                                WEBSITE_CONFIG.TRIPBOOKING_TITLE
                            )}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ItineraryComingSoonPage

// =============================================================
// Gradient Loading SVG
// =============================================================
export const GradientLoading: React.FC = () => (
    <svg
        className="w-full h-[200px]"
        viewBox="0 0 390 202"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <g
            opacity="0.5"
            filter="url(#filter0_f_351_6000)">
            <ellipse
                cx="195"
                cy="-54"
                rx="221"
                ry="132"
                fill="url(#paint0_linear_351_6000)"
                fillOpacity="0.8"
            />
        </g>
        <defs>
            <filter
                id="filter0_f_351_6000"
                x="-150"
                y="-310"
                width="690"
                height="512"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB">
                <feFlood
                    floodOpacity="0"
                    result="BackgroundImageFix"
                />
                <feBlend
                    mode="normal"
                    in="SourceGraphic"
                    in2="BackgroundImageFix"
                    result="shape"
                />
                <feGaussianBlur
                    stdDeviation="62"
                    result="effect1_foregroundBlur_351_6000"
                />
            </filter>
            <linearGradient
                id="paint0_linear_351_6000"
                x1="4.05456"
                y1="-0.756294"
                x2="404.782"
                y2="-10.7361"
                gradientUnits="userSpaceOnUse">
                <stop stopColor="#7011F6" />
                <stop
                    offset="1"
                    stopColor="#4D1D91"
                />
            </linearGradient>
        </defs>
    </svg>
)

export const GradientLoadingReversed: React.FC = () => (
    <svg
        className="w-full h-[200px] scale-y-[-1]"
        viewBox="0 0 390 202"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <g
            opacity="0.5"
            filter="url(#filter0_f_351_6000)">
            <ellipse
                cx="195"
                cy="-54"
                rx="221"
                ry="132"
                fill="url(#paint0_linear_351_6000)"
                fillOpacity="0.8"
            />
        </g>
        <defs>
            <filter
                id="filter0_f_351_6000"
                x="-150"
                y="-310"
                width="690"
                height="512"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB">
                <feFlood
                    floodOpacity="0"
                    result="BackgroundImageFix"
                />
                <feBlend
                    mode="normal"
                    in="SourceGraphic"
                    in2="BackgroundImageFix"
                    result="shape"
                />
                <feGaussianBlur
                    stdDeviation="62"
                    result="effect1_foregroundBlur_351_6000"
                />
            </filter>
            <linearGradient
                id="paint0_linear_351_6000"
                x1="4.05456"
                y1="-0.756294"
                x2="404.782"
                y2="-10.7361"
                gradientUnits="userSpaceOnUse">
                <stop stopColor="#7011F6" />
                <stop
                    offset="1"
                    stopColor="#4D1D91"
                />
            </linearGradient>
        </defs>
    </svg>
)
