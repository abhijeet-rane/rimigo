import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { CountryCard } from '../components/CountryCard'
import { Loading } from '@/components/shared/Loading'
import SearchHeader from '@/components/common/SearchHeader'
import Typography from '@/components/shared/Typography'
import { RIMIGO_COLLECTION_ROUTE } from '@/routes/routes'

const ContentListPublicPage = () => {
    const navigate = useNavigate()
    
    // Fetch countries with content collections
    const {
        data: countriesData,
        isLoading,
        isError
    } = useQuery({
        queryKey: ['countries-with-collections'],
        queryFn: () => contentCollectionApi.getCountriesWithCollections()
    })

    const handleMultidestinationClick = () => {
        navigate(`${RIMIGO_COLLECTION_ROUTE}/multidestination`)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName="Collections"
                    assistantConfig={{ enabled: false }}
                    ctaConfig={{ enabled: false }}
                />
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    <Loading />
                </div>
            </div>
        )
    }

    if (isError || !countriesData) {
        return (
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName="Collections"
                    assistantConfig={{ enabled: false }}
                    ctaConfig={{ enabled: false }}
                />
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    <div className="text-center text-red-500">Failed to load countries. Please try again.</div>
                </div>
            </div>
        )
    }

    const countries = countriesData.data || []

    return (
        <div className="min-h-screen bg-white">
            <SearchHeader
                pageName="Collections"
                assistantConfig={{ enabled: false }}
                ctaConfig={{ enabled: false }}
            />
            <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="flex flex-col gap-3 mb-8">
                    <Typography
                        size="24"
                        weight="bold"
                        family="redhat"
                        color="grey-0"
                        className="leading-[100%] tracking-[-2%]">
                        Explore Collections by Country
                    </Typography>
                    <Typography
                        size="16"
                        weight="medium"
                        family="manrope"
                        color="grey-2"
                        className="leading-[20px] tracking-[-0.02em]">
                        Discover curated collections of experiences and stays from around the world
                    </Typography>
                </div>

                {/* Countries Grid */}
                {countries.length === 0 ? (
                    <div className="text-center py-12">
                        <Typography
                            size="16"
                            weight="medium"
                            color="grey-1">
                            No countries with collections found.
                        </Typography>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {/* Multidestination Card */}
                        <div
                            className="relative w-full overflow-hidden aspect-6/2 md:aspect-3/2 cursor-pointer group transition-transform hover:scale-[1.03] shadow-md"
                            style={{
                                backgroundColor: '#FFF',
                                borderRadius: '12px',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: '#E0E0E0',
                                position: 'relative',
                                zIndex: 1
                            }}
                            onClick={handleMultidestinationClick}
                            role="button"
                            tabIndex={0}
                            aria-label="Multidestination"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    handleMultidestinationClick()
                                }
                            }}>
                            {/* Content Wrapper */}
                            <div className="md:absolute inset-0 flex flex-row md:flex-col items-center justify-start gap-3 md:block px-3 md:px-0">
                                {/* Icon */}
                                <div className="mt-3 md:mt-0 md:absolute md:top-20 md:left-4 flex items-center">
                                    <img
                                        src="https://media.rimigo.com/1765349447051_tour_guide.png"
                                        alt="Multidestination"
                                        className="w-[80px] h-[90px] md:w-[100px] md:h-[110px] object-contain"
                                        onError={(e) => {
                                            // Fallback to a placeholder if image fails to load
                                            ;(e.target as HTMLImageElement).src = 'https://via.placeholder.com/100x110?text=MD'
                                        }}
                                    />
                                </div>

                                {/* Title */}
                                <div className="md:absolute md:top-4 md:left-4 mt-5 md:mt-0">
                                    <h3
                                        className="text-[18px] font-bold font-red-hat-display md:text-[20px] leading-5 m-0"
                                        style={{
                                            fontFamily: 'Red Hat Display',
                                            fontWeight: 550,
                                            letterSpacing: '-0.02em',
                                            color: '#101010'
                                        }}
                                    >
                                        Multidestination
                                    </h3>
                                </div>
                            </div>

                            {/* CTA Button */}
                            <div
                                className="absolute bottom-0 right-0 z-10"
                                onClick={(e) => e.stopPropagation()}
                                style={{ pointerEvents: 'none' }}>
                                <div
                                    className="flex items-center justify-center group-hover:opacity-90 transition-opacity"
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        backgroundColor: '#101010',
                                        color: '#FFF',
                                        borderTopLeftRadius: '12px',
                                        borderBottomRightRadius: '8px',
                                        pointerEvents: 'none'
                                    }}>
                                    <span
                                        className="text-s font-semibold"
                                        style={{
                                            color: '#FFF'
                                        }}>
                                        &gt;
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Country Cards */}
                        {countries.map((country) => (
                            <CountryCard
                                key={country.country_id}
                                countryId={country.country_id}
                                countryName={country.country_name}
                                iconUrl={country.icon_url}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ContentListPublicPage
