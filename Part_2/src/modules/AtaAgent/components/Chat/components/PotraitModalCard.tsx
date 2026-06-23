import EducationalPoints from './EducationalPoints'
import CardSelectButton from './CardSelectButton'

interface PotraitModalCardProps {
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

const PotraitModalCard = ({ option, isSelected = false, onSelect }: PotraitModalCardProps) => {
    const imageUrl = option.content?.find((item) => item.type === 'image')?.url || ''
    const details = option.details || []
    const educationTips = option.education_tips || []
    const pricing = option.pricing

    const formatPrice = (price: string) => {
        const currencyMap: Record<string, string> = {
            INR: '₹',
            USD: '$',
            EUR: '€',
            GBP: '£'
        }
        const currency = pricing?.currency || 'INR'
        const symbol = currencyMap[currency] || currency

        let formattedPrice = price
        Object.keys(currencyMap).forEach((code) => {
            formattedPrice = formattedPrice.replace(new RegExp(code, 'gi'), '').trim()
        })

        return `${symbol}${formattedPrice}`
    }

    return (
        <div
            onClick={onSelect}
            className={`relative flex-1 rounded-xl bg-white border-solid border border-grey-4 box-border flex flex-col  items-stretch p-4 gap-4 text-left text-[16px] text-grey-0 font-red-hat-display cursor-pointer transition-colors shrink-0 h-full ${
                isSelected ? 'border-primary-default' : 'border-grey-4'
            }`}>
            <div className="self-stretch relative tracking-num--0_02 font-semibold shrink-0">{option.name}</div>
            <div className="self-stretch flex flex-col gap-4 text-num-14 font-manrope flex-1 w-full min-h-0">
                {imageUrl && (
                    <img
                        src={imageUrl}
                        className="self-stretch h-40 relative rounded-xl max-w-full overflow-hidden shrink-0 object-cover"
                        alt={option.name}
                    />
                )}
                <div className="self-stretch flex flex-col items-start gap-[15px] flex-1">
                    {details.length > 0 && (
                        <div className="self-stretch flex flex-col items-start gap-4">
                            <div className="self-stretch h-px relative border-grey-4 border-solid border-t box-border" />
                            <div className="self-stretch flex flex-col items-start gap-1">
                                {details.map((detail, index) => (
                                    <div
                                        key={index}
                                        className="self-stretch flex items-start gap-1">
                                        <img
                                            src="/icons/purple-star.png"
                                            className="h-6 w-6 md:h-5 md:w-5 object-contain mt-[1px]"
                                            alt=""
                                            srcSet="/icons/purple-star.png"
                                        />
                                        <div className="flex-1 text-[14px] relative tracking-num--0_02 font-medium">{detail}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="self-stretch h-px relative border-grey-4 border-solid border-t box-border" />
                        </div>
                    )}

                    {/* Keep in mind section   */}
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
        </div>
    )
}

export default PotraitModalCard
