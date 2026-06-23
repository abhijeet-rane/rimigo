import RateHeader from "../shared/RateHeader"
import RateCard from "./RateCard"

type RateColumnProps = {
    title: string
    headerVariant?: "primary" | "default"
    platforms: string[]
    label: React.ReactNode
    prices: {
        price: string
        note: string
        highlight?: boolean
    }[]
    bordered?: boolean
}

export default function RateColumn({
    title,
    headerVariant,
    platforms,
    label,
    prices,
    bordered,
}: RateColumnProps) {
    return (
        <div className="flex-1 flex flex-col">
            <RateHeader title={title} variant={headerVariant} />
            <RateCard
                platforms={platforms}
                label={label}
                prices={prices}
                bordered={bordered}
            />
        </div>
    )
}
