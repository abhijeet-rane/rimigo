import FloatingPrice from "../shared/FloatingPrice"
import { getPlatformLogoURL } from "@/constants/icons/platformIcons"

type FloatingCard = {
    logoName: string
    price: string
    className: string
}

type ComparepriceswithPillProps = {
    imageUrl: string
    floatingCards: FloatingCard[]
    className?: string
    maxWidth?: string
}

const ComparepriceswithPill = ({
    imageUrl,
    floatingCards,
    className,
    maxWidth
}: ComparepriceswithPillProps) => {
    const content = (
        <div className={`relative w-full h-67.5 xl:h-72.5 rounded-2xl overflow-visible ${className}`}>
            <img
                src={imageUrl}
                alt="Trip preview"
                className="w-full h-full object-cover p-4 rounded-4xl"
            />

            {floatingCards.map(({ logoName, price, className }, index) => (
                <FloatingPrice
                    key={`${logoName}-${index}`}
                    icon={getPlatformLogoURL(logoName) ?? ""}
                    price={price}
                    className={className}
                />
            ))}
        </div>
    )

    if (maxWidth) {
        return (
            <>
                <style>{`
                    @media (min-width: 768px) {
                        .compare-prices-wrapper {
                            max-width: ${maxWidth};
                        }
                    }
                `}</style>
                <div className="w-full compare-prices-wrapper">
                    {content}
                </div>
            </>
        )
    }

    return content
}

export default ComparepriceswithPill
