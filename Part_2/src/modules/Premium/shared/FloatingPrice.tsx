type FloatingPriceProps = {
    icon: string
    price: string
    className?: string
}

const FloatingPrice = ({ icon, price, className }: FloatingPriceProps) => {
    return (
        <div
            className={`absolute ${className}`}
        >
            {/* Glow layer */}
            <div className="absolute inset-0 rounded-full bg-white blur-md opacity-70" />

            {/* Actual content */}
            <div className="relative flex items-center gap-1.5 rounded-full border border-black shadow-lg bg-white px-2.5 py-1 text-xs font-semibold">
                <img
                    src={icon}
                    alt="Logo"
                    className="w-7 h-7 object-contain rounded-full"
                />

                <span className="text-grey-0 font-manrope font-extrabold text-[16px]">
                    {price}
                </span>
            </div>
        </div>

    )
}

export default FloatingPrice
