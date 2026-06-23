import ImageStack from "../shared/imageStack"
import RatePrices from "../shared/RatePrices"

type RateCardProps = {
    platforms: string[]
    label: React.ReactNode
    prices: {
        price: string
        note: string
        highlight?: boolean
    }[]
    bordered?: boolean
}

export default function RateCard({
    platforms,
    label,
    prices,
    bordered = false,
}: RateCardProps) {
    return (
        <div
            className={`relative px-1 pt-4 pb-3 flex flex-col ${bordered
                ? "border rounded-2xl bg-white shadow-lg -mt-1"
                : "rounded-b-2xl"
                }`}
        >
            <div className="ml-2 pb-2">
                <ImageStack platforms={platforms} size={26} overlap={8} />
            </div>

            <div className="text-[12px] text-grey-2 font-manrope font-semibold text-center leading-tight mb-4">
                {label}
            </div>

            <RatePrices items={prices} />
        </div>
    )
}
