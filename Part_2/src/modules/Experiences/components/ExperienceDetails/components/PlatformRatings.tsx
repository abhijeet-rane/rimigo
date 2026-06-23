import { PlatformRating } from '../../../hooks/useToursForExperience'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

const formatReviewCount = (count: number) => {
    if (!Number.isFinite(count) || count <= 0) {
        return ''
    }
    if (count >= 1000) {
        const value = count % 1000 === 0 ? (count / 1000).toFixed(0) : (count / 1000).toFixed(1)
        return `${value}k reviews`
    }
    return `${count} reviews`
}

type PlatformRatingsProps = {
    platformRatings: PlatformRating[]
}

const PlatformRatings = ({ platformRatings }: PlatformRatingsProps) => {
    const { trackButtonClickCustom } = usePostHog()

    if (platformRatings.length === 0) {
        return null
    }

    return (
        <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-row md:flex-wrap gap-3 max-md:overflow-x-auto">
                {platformRatings.map((platform) => {
                    const handlePlatformClick = () => {
                        if (platform.url) {
                            trackButtonClickCustom({
                                buttonPage: 'Experience',
                                buttonName: 'Platform_Rating_Chip',
                                buttonAction: 'Clicked',
                                location: 'Experience Summary Section',
                                extra: {
                                    platform: platform.platform,
                                    rating: platform.rating,
                                    review_count: platform.reviewCount,
                                    platform_external_link: platform.url
                                }
                            })
                            window.open(platform.url, '_blank', 'noopener,noreferrer')
                        }
                    }

                    return (
                        <a
                            key={platform.platform}
                            href={platform.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                                if (platform.url) {
                                    e.preventDefault()
                                    handlePlatformClick()
                                } else {
                                    e.preventDefault()
                                }
                            }}
                            className={`flex items-center gap-2 max-md:shrink-0 px-3 md:px-4 py-1.5 md:py-2 rounded-[8px] max-md:bg-grey-5 md:rounded-full border border-feature-card-border bg-white hover:shadow-sm transition-shadow ${
                                platform.url ? 'cursor-pointer' : 'cursor-default'
                            }`}>
                            <img
                                src={platform.logoUrl}
                                alt={platform.platform}
                                className="h-5 w-5 md:h-6 md:w-6 object-cover"
                            />
                            <div className="flex max-md:flex-col flex-row gap-1 md:items-center ">
                                <span className="text-[14px] md:text-[16px] font-semibold text-header-black">{platform.rating.toFixed(1)}</span>
                                <span className="text-[14px] leading-5 text-grey-2 tracking-[-0.01em] font-medium font-manrope">
                                    ({formatReviewCount(platform.reviewCount)})
                                </span>
                            </div>
                        </a>
                    )
                })}
            </div>
        </div>
    )
}

export default PlatformRatings
