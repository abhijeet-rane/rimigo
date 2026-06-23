type PriceItem = {
    price: string
    note: string
    highlight?: boolean
}

type RatePricesProps = {
    items: PriceItem[]
    align?: "start" | "end"
}

export default function RatePrices({ items, align = "end" }: RatePricesProps) {
    return (
        <div
            className={`flex flex-col gap-3 flex-1  justify-around ${align === "end" ? "items-end pr-1" : "items-center"
                }`}
        >
            {items.map((item, index) => (
                <div key={index} className="text-center">
                    <p className="text-base font-bold text-gray-900">{item.price}</p>
                    <p
                        className={`text-xs mt-0.5 font-manrope font-extrabold italic ${item.highlight
                            ? "font-semibold text-secondary-green"
                            : "text-grey-2"
                            }`}
                    >
                        {item.note}
                    </p>
                </div>
            ))}
        </div>
    )
}
