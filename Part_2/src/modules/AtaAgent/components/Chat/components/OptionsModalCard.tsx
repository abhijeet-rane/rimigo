import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import { SVG_ICON_STAR } from '@/constants/icons/svgUrls'
import EducationalPoints from './EducationalPoints'
import CardSelectButton from './CardSelectButton'

interface OptionsModalCardProps {
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
            max_price?: string
            currency: string
            type: string
        }
    }
    isSelected?: boolean
    onSelect?: () => void
    width?: string
}

const OptionsModalCard = ({ option, isSelected = false, onSelect }: OptionsModalCardProps) => {
    const images = option.content?.filter((item) => item.type === 'image' || item.type === 'image_with_redirection') || []
    const firstImage = images[0]?.url || ''
    const secondImage = images[1]?.url || ''
    const secondImageRedirection = images[1]?.redirection_url || ''
    const details = option.details || []
    const educationTips = option.education_tips || []
    const pricing = option.pricing

    const budgetTypeLabel =
        option.budget_type === 'budget_friendly' ? 'BUDGET FRIENDLY' : option.budget_type === 'premium_experience' ? 'PREMIUM' : ''

    const getBudgetTypeBgColor = () => {
        if (option.budget_type === 'budget_friendly') return 'bg-secondary-green'
        if (option.budget_type === 'premium_experience') return 'bg-primary-default'
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

    return (
        <div
            onClick={onSelect}
            // style={{ width }}
            className={`flex-1 relative rounded-xl bg-primary-default-80 shrink-0 flex flex-col items-start gap-0 text-left text-[16px] text-gray font-red-hat-display cursor-pointer h-full ${
                isSelected ? 'border border-primary-default' : ''
            }`}>
            {option.recommendation_reason && (
                <div className="w-full rounded-t-xl flex gap-[10px] items-center justify-start py-2 px-4 shrink-0">
                    <img
                        src="/icons/wand.png"
                        alt="wand"
                        className="w-4 h-4"
                    />
                    <div className="relative text-[12px] tracking-[-0.01em] font-medium text-gray">{option.recommendation_reason}</div>
                </div>
            )}
            <GenericCard className="flex-1 w-full h-full p-4 flex flex-col gap-6 bg-white justify-between">
                <div className="flex flex-col gap-6 flex-1 min-h-0">
                    <div className="self-stretch flex items-center justify-between gap-5 shrink-0">
                        <div className="relative tracking-num--0_02 font-semibold text-[16px] text-grey-0">{option.name}</div>
                        {budgetTypeLabel && (
                            <div
                                className={`rounded-2xl ${getBudgetTypeBgColor()} flex items-center justify-center py-0.5 px-[7px] text-[11px] text-white`}>
                                <div className="relative tracking-[-0.01em] leading-4 font-extrabold">{budgetTypeLabel}</div>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-start gap-4 text-[12px] flex-1 min-h-0">
                        <div className="self-stretch flex items-center gap-3 shrink-0">
                            {firstImage && (
                                <img
                                    src={firstImage}
                                    className="h-40 w-[210px] relative rounded-xl object-cover"
                                    alt={option.name}
                                />
                            )}
                            {secondImage && (
                                <div className="h-40 w-[210px] relative">
                                    <img
                                        src={secondImage}
                                        className="absolute top-0 left-0 rounded-xl w-[210px] h-40 object-cover"
                                        alt={option.name}
                                    />
                                    {secondImageRedirection && (
                                        <div className="absolute top-[112px] left-[16px] shadow-[0px_2px_8px_#363636] rounded bg-whitesmoke flex items-center justify-center py-2 px-3 cursor-pointer hover:bg-gray-100 transition-colors">
                                            <b className="relative tracking-[-0.01em]">See View</b>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* details */}
                        <div className="self-stretch flex flex-col items-start gap-4 text-num-14 font-manrope flex-1">
                            <div className="self-stretch h-px relative border-grey-4 border-solid border-t-[1px] box-border" />
                            <div className="self-stretch flex flex-col items-start content-start gap-2">
                                {details.map((detail, index) => (
                                    <div
                                        key={index}
                                        className="w-num-212 flex items-center gap-2">
                                        <img
                                            className="h-[11px] w-[11px] relative"
                                            alt=""
                                            src={SVG_ICON_STAR}
                                        />
                                        <div className="relative tracking-num--0_02 font-medium font-manrope text-grey-0 text-[14px]">{detail}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="self-stretch h-px relative border-grey-4 border-solid border-t-[1px] box-border" />
                        </div>

                        {/* education tips */}
                        {educationTips.length > 0 && <EducationalPoints educationTips={educationTips} />}
                    </div>
                </div>

                {pricing && (
                    <div className="self-stretch flex items-center justify-between gap-5 text-darkslategray font-manrope shrink-0 mt-auto pt-2">
                        <div className="flex flex-col items-start gap-0.5">
                            <div className="relative tracking-num--0_02 font-medium flex items-center text-darkslategray">from</div>
                            <div className="flex items-center justify-center gap-1 text-[16px] text-gray font-red-hat-display">
                                <div className="relative tracking-num--0_02 font-semibold">{formatPrice(pricing.min_price)}</div>
                                {pricing.max_price && pricing.max_price !== pricing.min_price && (
                                    <>
                                        <div className="relative tracking-num--0_02 font-semibold"> - {formatPrice(pricing.max_price)}</div>
                                    </>
                                )}
                                <div className="relative text-[12px] tracking-num--0_02 font-medium font-manrope text-darkslategray">
                                    {pricing.type === 'per_person' ? 'per person' : ''}
                                </div>
                            </div>
                        </div>
                        <CardSelectButton
                            isSelected={isSelected}
                            onSelect={() => onSelect?.()}
                        />
                    </div>
                )}
            </GenericCard>
        </div>
    )
}

export default OptionsModalCard
