type RateHeaderProps = {
    title: string
    variant?: "primary" | "default"
}

export default function RateHeader({ title, variant = "default" }: RateHeaderProps) {
    return (
        <div className="relative text-center font-semibold font-red-hat-display text-[14px]">
            {variant === "primary" && (
                <div className="absolute inset-x-0 top-0 h-13 bg-secondary-green rounded-t-2xl" />
            )}

            <div
                className={`relative py-1.5 ${variant === "primary"
                        ? "text-white"
                        : "text-header-black bg-white rounded-t-2xl"
                    }`}
            >
                {title}
            </div>
        </div>
    )
}
