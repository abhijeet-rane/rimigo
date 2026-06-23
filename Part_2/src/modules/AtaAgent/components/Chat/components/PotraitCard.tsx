import EducationalPoints from './EducationalPoints'
import Divider from '@/components/shared/Divider/Divider'
import CardSelectButton from './CardSelectButton'

interface PotraitCardProps {
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

const PotraitCard = ({ option, onOpenModal, onSelect, isSelected = false }: PotraitCardProps) => {
    const imageUrl = option.content?.find((item) => item.type === 'image')?.url || ''
    const details = option.details || []
    const visibleDetails = details.slice(0, 2)
    const hasMoreDetails = details.length > 2
    const remainingCount = details.length > 2 ? details.length - 2 : 0
    const pricing = option.pricing

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
        <div className="w-full flex flex-col items-stretch">
            {/* Recommendation reason positioned above card */}
            {option.recommendation_reason && (
                <div className="rounded-t-[12px] bg-primary-default-80 flex items-center justify-start py-2 px-3 box-border w-full">
                    <div className="flex items-center gap-2.5">
                        <img
                            src="/icons/wand.png"
                            alt="wand"
                            className="w-4 h-4 shrink-0"
                        />
                        <div className="relative tracking-[-0.01em] font-medium text-[12px] text-primary-default">{option.recommendation_reason}</div>
                    </div>
                </div>
            )}

            {/* Card Content */}
            <div
                className={`w-full relative rounded-b-xl bg-white border-solid border box-border flex flex-col items-start p-3 gap-3 text-left text-base text-gray font-red-hat-display cursor-pointer ${isSelected ? 'border-[2px] border-primary-default' : 'border border-grey-4'}`}
                onClick={handleCardClick}>
                {imageUrl && (
                    <img
                        src={imageUrl}
                        className="self-stretch h-[120px] relative rounded-[8px] max-w-full overflow-hidden shrink-0 object-cover"
                        alt={option.name}
                    />
                )}
                <div className="self-stretch flex flex-col items-start gap-2">
                    <div className="self-stretch relative text-grey-0 tracking-num--0_02 font-semibold">{option.name}</div>
                    {details.length > 0 && (
                        <div className="self-stretch rounded-lg bg-whitesmoke flex flex-col items-start justify-center py-2 px-3 gap-2 text-sm font-manrope">
                            {visibleDetails.map((detail, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-2">
                                    <img
                                        src="/icons/purple-star.png"
                                        className="h-6 w-6 md:h-5 md:w-5 object-contain mt-[1px]"
                                        alt=""
                                        srcSet="/icons/purple-star.png"
                                    />
                                    <div className=" text-grey-0 relative tracking-num--0_02 font-medium font-manrope">{detail}</div>
                                </div>
                            ))}
                            {hasMoreDetails && (
                                <>
                                    <div className="self-stretch flex items-start gap-2">
                                        <div className="flex-1 flex items-center gap-2">
                                            <img
                                                src="/icons/purple-star.png"
                                                className="h-6 w-6 md:h-5 md:w-5 object-contain mt-[1px]"
                                                alt=""
                                                srcSet="/icons/purple-star.png"
                                            />
                                            <div className=" text-grey-0 relative tracking-num--0_02 font-medium font-manrope">{details[2]}</div>
                                        </div>
                                    </div>
                                    {remainingCount > 0 && (
                                        <b className="relative tracking-num--0_02 leading-[18px] text-grey-0 font-manrope font-medium text-right">{`+${remainingCount} more`}</b>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Educational Points */}
                {option.education_tips && option.education_tips.length > 0 && (
                    <>
                        <Divider className="w-full my-2" />
                        <EducationalPoints educationTips={option.education_tips.slice(0, 1)} />
                    </>
                )}

                {/* Price and Action Buttons Section */}
                {pricing && (
                    <div className="w-full flex items-end justify-between gap-3 mt-2">
                        <div className="flex flex-col items-start gap-0.5">
                            <div className="relative tracking-num--0_02 font-medium text-[10px] text-grey-1 font-manrope">from</div>
                            <div className="flex items-center justify-center gap-1 text-[14px] text-grey-0 font-red-hat-display">
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
                                className="text-[10px] text-primary-default  transition-colors uppercase font-semibold">
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

export default PotraitCard
