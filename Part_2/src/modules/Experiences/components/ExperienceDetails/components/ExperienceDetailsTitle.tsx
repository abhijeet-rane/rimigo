import DetailsShortlistButton from '@/components/common/DetailsShortlistButton'
import { RecommendedMode } from '@/modules/Experiences/types/experienceDetailTypes'
import { formatPrice } from '@/modules/Experiences/utils/priceFormatter'
import { BookmarkPlus, MapPin } from 'lucide-react'
import { FC } from 'react'
import { getPriorityStyles } from '@/modules/Experiences/utils/priorityMapper'
import ShareButton from '@/components/common/ShareButton'

interface ExperienceDetailsTitleProps {
    title: string
    location: {
        address: string
        city: {
            id: string
            name: string
        }
        country: {
            name: string
            id: string
        }
    }
    priceUpperBound: number | null
    priceLowerBound: number | null
    priceCurrency: string | null
    priceLabel?: string
    isTicketRequired: boolean | null
    recommendedMode: RecommendedMode | null
    suggestionPriority?: number | null
    isShortlisted?: boolean
    onShortlist?: () => Promise<void> | void
    isLoading?: boolean
    experienceId?: string
    experienceName?: string
    onAddToCollection?: () => void
}

const recommended_mode_mapper: Record<RecommendedMode, { text: string; bgcolor: string; borderColor: string }> = {
    guided_tour: {
        text: 'Recommended for Guided tour',
        bgcolor: 'bg-primary-default-80',
        borderColor: 'border border-primary-default'
    },
    self_explore: {
        text: 'Recommended to Self-explore',
        bgcolor: 'bg-primary-default-80',
        borderColor: 'border border-primary-default'
    }
}

const Pill = ({ recommendedMode }: { recommendedMode: RecommendedMode }) => {
    const recommendedModeData = recommended_mode_mapper[recommendedMode]
    return (
        <div className={`px-2 py-1 rounded-full text-xs font-medium text-black ${recommendedModeData.bgcolor} ${recommendedModeData.borderColor}`}>
            {recommendedModeData.text}
        </div>
    )
}

const ExperienceDetailsTitle: FC<ExperienceDetailsTitleProps> = ({
    title,
    location,
    priceUpperBound,
    priceLowerBound,
    priceCurrency,
    recommendedMode,
    suggestionPriority = null,
    isShortlisted = false,
    onShortlist,
    isLoading = false,
    experienceId,
    onAddToCollection
}) => {
    const formattedPrice = priceLowerBound && priceUpperBound && priceCurrency ? formatPrice(priceLowerBound, priceUpperBound, priceCurrency) : null
    const priorityStyles = getPriorityStyles(suggestionPriority)

    return (
        <div
            className="mb-3 md:mb-4 flex items-start md:pb-2 justify-between gap-4"
            style={{ fontFamily: 'Red Hat Display, ui-sans-serif, system-ui' }}>
            <div className="flex-1 md:mt-[-6px] max-md:p-5 w-full">
                <h1 className="text-[18px] md:text-3xl font-medium md:font-bold text-header-black mb-5 md:mb-2 leading-tight">{title}</h1>
                <div className="w-full flex items-center justify-between gap-2 text-base text-grey-grey_2">
                    <div className="flex items-center gap-2 flex-wrap max-md:hidden">
                        <MapPin className="w-4 h-4 text-grey-0" />
                        <div className="flex max-md:font-medium items-center gap-2 flex-wrap">
                            <span className="text-[14px] leading-[18px] font-medium font-red-hat-display text-grey-0">
                                {location.city.name}, {location.country.name}
                                &nbsp;
                                <span>
                                    {formattedPrice ? (
                                        <span className="text-right">
                                            {/* dot separator */}
                                            <span> • &nbsp; {formattedPrice} </span> <span> approx.</span>
                                        </span>
                                    ) : null}
                                </span>
                            </span>
                            {priorityStyles && (
                                <span className="flex items-center   text-grey-2 text-[14px] leading-[18px] font-medium font-red-hat-display tracking-[-0.01em]">
                                    • &nbsp; &nbsp;
                                    <span
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-medium font-red-hat-display bg-white border border-grey-4 text-grey-0`}>
                                        <img
                                            src={priorityStyles.icon}
                                            alt={priorityStyles.label}
                                            className="w-3.5 h-3.5"
                                            loading="lazy"
                                        />
                                        {priorityStyles.label}
                                    </span>
                                </span>
                            )}
                        </div>

                        {recommendedMode && !formattedPrice && <Pill recommendedMode={recommendedMode} />}
                    </div>
                    <div className="flex flex-col  md:hidden w-full md:items-center md:gap-2 ">
                        {/* ===== ROW 1: Location + Price ===== */}
                        <div className="flex items-center w-full justify-between gap-2">
                            {/* Location */}
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin className="w-4 h-4 text-grey-0 shrink-0" />
                                <span className="text-[14px] leading-[18px] font-medium font-red-hat-display text-grey-0">
                                    {location.city.name}, {location.country.name}
                                </span>
                            </div>

                            {/* Price */}
                            {formattedPrice && (
                                <span className="text-[18px] md:text-[14px] leading-[18px] font-bold md:font-medium font-red-hat-display text-grey-0 md:text-grey-2 whitespace-nowrap">
                                    • {formattedPrice}
                                </span>
                            )}
                        </div>

                        {/* ===== ROW 2: Tags + Approx ===== */}
                        <div className="flex items-start w-full justify-between  ">
                            {/* Tags */}
                            <div className="flex items-center max-md:mt-[6px]">
                                {priorityStyles && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-medium font-red-hat-display bg-white border border-grey-4 text-grey-0">
                                        <img
                                            src={priorityStyles.icon}
                                            alt={priorityStyles.label}
                                            className="w-3.5 h-3.5"
                                            loading="lazy"
                                        />
                                        {priorityStyles.label}
                                    </span>
                                )}

                                {recommendedMode && !formattedPrice && <Pill recommendedMode={recommendedMode} />}
                            </div>

                            {/* Approx */}
                            {formattedPrice && (
                                <span className="text-[14px] leading-[18px] font-medium font-red-hat-display text-grey-0 md:text-grey-2 whitespace-nowrap">
                                    approx.
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action buttons: Share, Add to Collection, Shortlist */}
            <div className="flex flex-col items-end gap-2 max-md:hidden">
                <div className="flex items-center gap-2">
                    <ShareButton
                        shareLink={typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://rimigo.com'}
                        location="Experience Details"
                        trackingData={{
                            experienceId: experienceId,
                            experienceName: title
                        }}
                        className='p-3!'
                    />
                    {onAddToCollection && (
                        <button
                            type="button"
                            aria-label="Add to collection"
                            title="Add to tripboard"
                            onClick={onAddToCollection}
                            className="flex items-center gap-2 border border-grey-4 bg-white rounded-[8px] px-3 py-2 transition-colors cursor-pointer hover:shadow-md">
                            <BookmarkPlus className="w-4 h-4 text-primary-default" />
                            <span className="text-sm font-medium font-red-hat-display">SAVE</span>
                        </button>
                    )}
                    <DetailsShortlistButton
                        onShortlist={onShortlist}
                        isShortlisted={isShortlisted}
                        isLoading={isLoading}
                    />
                </div>

                {recommendedMode && formattedPrice && <Pill recommendedMode={recommendedMode} />}
            </div>
        </div>
    )
}

export default ExperienceDetailsTitle
