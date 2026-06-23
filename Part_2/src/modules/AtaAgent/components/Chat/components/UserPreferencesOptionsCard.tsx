import React from 'react'
import EducationalPoints from './EducationalPoints'
import Divider from '@/components/shared/Divider/Divider'
import CardSelectButton from './CardSelectButton'
import { SVG_ICON_STAR } from '@/constants/icons/svgUrls'

interface UserPreferencesOptionsCardProps {
    option: {
        id: string
        name: string
        recommendation_reason?: string
        budget_type?: string
        content?: Array<{ type: string; url: string; redirection_url?: string }>
        details?: string[]
        education_tips?: string[]
        pricing?: {
            min_price: string
            max_price: string
            currency: string
            type: string
        }
    }
    onSelect?: (optionId: string) => void
    onOpenModal?: () => void
    isSelected?: boolean
}

const UserPreferencesOptionsCard: React.FC<UserPreferencesOptionsCardProps> = ({ option, onOpenModal, onSelect, isSelected = false }) => {
    const imageUrl = option.content?.find((item) => item.type === 'image')?.url || ''
    const details = option.details || []
    const visibleDetails = details.slice(0, 2)
    const hasMoreDetails = details.length > 2
    const thirdDetail = details[2] || ''
    const remainingCount = details.length > 3 ? details.length - 3 : 0
    const recommendationReason = option.recommendation_reason || ''
    const pricing = option.pricing
    const budgetType = option.budget_type

    const budgetTypeLabel = budgetType === 'budget_friendly' ? 'BUDGET FRIENDLY' : budgetType === 'premium_experience' ? 'PREMIUM' : ''

    const getBudgetTypeBgColor = () => {
        if (budgetType === 'budget_friendly') return 'bg-secondary-green'
        if (budgetType === 'premium_experience') return 'bg-primary-default'
        return 'bg-gray-400'
    }

    const formatPrice = (price: string) => {
        // Convert currency codes to symbols
        const currencyMap: Record<string, string> = {
            INR: '₹',
            USD: '$',
            EUR: '€',
            GBP: '£'
        }
        const currency = pricing?.currency || 'INR'
        const symbol = currencyMap[currency] || currency

        // Remove currency code from price string if present
        let formattedPrice = price
        Object.keys(currencyMap).forEach((code) => {
            formattedPrice = formattedPrice.replace(new RegExp(code, 'gi'), '').trim()
        })

        return `${symbol}${formattedPrice}`
    }

    const handleCardClick = () => {
        // Select the card when clicked anywhere on the card
        if (onSelect) {
            onSelect(option.id)
        }
    }

    const handleSelectClick = () => {
        if (onSelect) {
            onSelect(option.id)
        }
    }

    return (
        // main card container
        <div
            className={`w-[456px] h-[450px] relative flex flex-col justify-end shrink-0 cursor-pointer ${isSelected ? ' ring-primary-default ring-offset-2' : ''}`}
            onClick={handleCardClick}>
            {/* recommendation reason section */}
            {recommendationReason && (
                <div className="absolute top-[20px] h-[42px] left-0 rounded-[12px] rounded-b-none bg-primary-default-80 w-[70%] overflow-hidden flex items-start justify-center py-2 pb-[calc(20px-32px)] px-3 box-border z-20">
                    <div className="flex-1 flex items-center gap-2.5">
                        <img
                            src="/icons/wand.png"
                            alt="wand"
                            className="w-4 h-4"
                        />
                        {/* truncate after 1 line */}
                        <div className="flex-1 relative tracking-[-0.01em] font-medium text-[12px] text-primary-default font-manrope truncate">
                            {recommendationReason}
                        </div>
                    </div>
                </div>
            )}

            {/* budget type section */}
            {budgetTypeLabel && (
                <div
                    className={`absolute top-[28px] h-[38px] right-0 z-20 pb-4  rounded-[12px]  ${getBudgetTypeBgColor()} flex items-center justify-center py-[1px] px-3 text-[11px] text-white  tracking-[-0.01em] leading-4`}>
                    <div className="relative tracking-[-0.01em] leading-4 font-extrabold">{budgetTypeLabel}</div>
                </div>
            )}
            {/* orioginal card */}
            <div
                className={`absolute h-[400px] rounded-xl bg-white border-solid z-60  box-border w-full flex flex-col items-start p-3 text-[16px] text-gray font-red-hat-display ${recommendationReason ? '' : ''} ${isSelected ? 'border-[2px] border-primary-default' : 'border-grey-4'} border`}>
                <div className="self-stretch flex items-start gap-3">
                    <div className="flex-1 flex flex-col items-start gap-2">
                        <div className="relative tracking-num--0_02 font-semibold text-[16px] text-grey-0">{option.name}</div>

                        <div className="flex flex-row items-start justify-start gap-2">
                            <div className="flex flex-col gap-2 px-3 py-2 bg-grey-5 rounded-[12px]">
                                {details.length > 0 && (
                                    <div className="self-stretch rounded-lg bg-whitesmoke flex flex-col items-start justify-center py-2 px-num-12 gap-2 text-num-14 font-manrope">
                                        {visibleDetails.map((detail, index) => (
                                            <div
                                                key={index}
                                                className="flex items-start gap-2">
                                                {/* show star icon only for first 2 details */}
                                                <img
                                                    src={SVG_ICON_STAR}
                                                    className="h-[11px] w-[11px] object-contain mt-[5px]"
                                                    alt=""
                                                />
                                                <div className="relative tracking-num--0_02 font-medium text-grey-0 text-[14px] ">{detail}</div>
                                            </div>
                                        ))}
                                        {hasMoreDetails && thirdDetail && (
                                            <div className="self-stretch flex flex-col items-start">
                                                <div className="self-stretch flex items-center justify-end gap-0">
                                                    <div className="flex-1 flex items-center gap-2">
                                                        <img
                                                            src={SVG_ICON_STAR}
                                                            className="h-[11px] w-[11px] object-contain"
                                                            alt=""
                                                        />
                                                        <div className="relative tracking-num--0_02 font-medium text-grey-0 text-[14px] ">
                                                            {thirdDetail}
                                                        </div>
                                                    </div>
                                                    <b className="relative tracking-num--0_02 leading-[18px] text-grey-2 text-[14px] ">
                                                        +{remainingCount} more
                                                    </b>
                                                </div>
                                            </div>
                                        )}
                                        {!hasMoreDetails && thirdDetail && (
                                            <div className="flex items-start gap-2">
                                                <img
                                                    className="h-4 w-4 relative"
                                                    alt=""
                                                />
                                                <div className="relative tracking-num--0_02 font-medium">{thirdDetail}</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {imageUrl && (
                                <div className="h-24 w-24  relative rounded-[8px] bg-gainsboro overflow-hidden shrink-0">
                                    <img
                                        src={imageUrl}
                                        alt={option.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <Divider className="w-full my-3" />
                {/* keep in mind sectiin */}
                {option.education_tips && option.education_tips.length > 0 && <EducationalPoints educationTips={option.education_tips.slice(0, 1)} />}

                {/* Price and Action Buttons Section */}
                <Divider className="w-full my-3" />
                {pricing && (
                    <div className="w-full flex items-end justify-between gap-3">
                        <div className="flex flex-col items-start gap-0.5">
                            <div className="relative tracking-num--0_02 font-medium text-[12px] text-grey-1 font-manrope">from</div>
                            <div className="flex items-center justify-center gap-1 text-[16px] text-grey-0 font-red-hat-display">
                                <div className="relative tracking-num--0_02 font-semibold">{formatPrice(pricing.min_price)}</div>
                                {pricing.max_price && pricing.max_price !== pricing.min_price && (
                                    <div className="relative tracking-num--0_02 font-semibold"> - {formatPrice(pricing.max_price)}</div>
                                )}
                                <div className="relative text-[12px] tracking-num--0_02 font-medium font-manrope text-darkslategray">
                                    {pricing.type === 'per_person' ? 'per person' : ''}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (onOpenModal) {
                                        onOpenModal()
                                    }
                                }}
                                className="text-[12px] font-light text-primary-default transition-colors uppercase font-semibold">
                                Learn more
                            </button>
                            <CardSelectButton
                                isSelected={isSelected}
                                onSelect={handleSelectClick}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default UserPreferencesOptionsCard
