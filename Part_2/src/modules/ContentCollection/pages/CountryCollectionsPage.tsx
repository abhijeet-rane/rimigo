import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { Loading } from '@/components/shared/Loading'
import SearchHeader from '@/components/common/SearchHeader'
import Typography from '@/components/shared/Typography'
import { RIMIGO_COLLECTION_ROUTE } from '@/routes/routes'
import ViewContentCollection from './ViewContentCollection'
import LinkCard from '@/components/Cards/LinkCard'
import { TAROT_CARD } from '@/constants/thiingsIcons'
import { useUserInfo } from '@/hooks/useUserInfo'

const CountryCollectionsPage = () => {
    const { countryName } = useParams<{ countryName: string }>()
    const navigate = useNavigate()
    const { isRimigoInternal } = useUserInfo()

    // Check if the param looks like a collection identifier (UUID-like format)
    // Collection identifiers are typically long alphanumeric strings without hyphens in the middle
    // Country names in URL format have hyphens between words
    const isLikelyIdentifier = countryName && /^[a-zA-Z0-9]{20,}$/.test(countryName) && !countryName.includes('-')

    // If it looks like an identifier, render ViewContentCollection instead
    if (isLikelyIdentifier) {
        return <ViewContentCollection />
    }

    // Decode country name from URL slug (convert hyphens back to spaces and capitalize)
    const decodedCountryName = countryName
        ? countryName
              .split('-')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
        : ''

    // Fetch collections by country name
    const {
        data: collectionsData,
        isLoading,
        isError
    } = useQuery({
        queryKey: ['collections-by-country-name', decodedCountryName],
        queryFn: () => contentCollectionApi.getByCountryName(decodedCountryName),
        enabled: !!decodedCountryName && !isLikelyIdentifier
    })

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName="Collections"
                    assistantConfig={{ enabled: false }}
                    ctaConfig={{ enabled: false }}
                    breadcrumbsConfig={{ enabled: isRimigoInternal, className: 'mb-6' }}
                />
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    <Loading />
                </div>
            </div>
        )
    }

    if (isError || !collectionsData) {
        return (
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName="Collections"
                    assistantConfig={{ enabled: false }}
                    ctaConfig={{ enabled: false }}
                    breadcrumbsConfig={{ enabled: isRimigoInternal, className: 'mb-6' }}
                />
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    <div className="text-center text-red-500">Failed to load collections. Please try again.</div>
                </div>
            </div>
        )
    }

    const collections = collectionsData.data || []

    const handleCollectionClick = (identifier: string) => {
        navigate(`${RIMIGO_COLLECTION_ROUTE}/${countryName}/${identifier}`)
    }

    return (
        <div className="min-h-screen bg-white">
            <SearchHeader
                pageName="Collections"
                assistantConfig={{ enabled: false }}
                ctaConfig={{ enabled: false }}
                breadcrumbsConfig={{ enabled: isRimigoInternal, className: 'mb-6' }}
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
                        Collections in {decodedCountryName}
                    </Typography>
                    <Typography
                        size="16"
                        weight="medium"
                        family="manrope"
                        color="grey-2"
                        className="leading-[20px] tracking-[-0.02em]">
                        Explore curated collections of experiences and stays
                    </Typography>
                </div>

                {/* Collections Grid */}
                {collections.length === 0 ? (
                    <div className="text-center py-12">
                        <Typography
                            size="16"
                            weight="medium"
                            color="grey-1">
                            No collections found for {decodedCountryName}.
                        </Typography>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {collections.map((collection) => (
                            <LinkCard
                                key={collection.identifier}
                                title={collection.name}
                                description={collection.description ?? ''}
                                iconSrc={collection.cover_image || TAROT_CARD}
                                onAction={() => handleCollectionClick(collection.identifier)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default CountryCollectionsPage
