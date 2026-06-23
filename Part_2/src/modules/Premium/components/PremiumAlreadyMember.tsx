import { CardContent } from "@/components/ui/card"
import { THREESTAR_PRIMARY_INDIGO } from "@/constants/icons/svgFromCDN"
import { cn } from "@/lib/utils"

export function PremiumAlreadyMember({ name, compact = false }: { name?: string; compact?: boolean }) {
    return (
        <CardContent className={cn("text-center", compact ? "py-12" : "py-24")}>
            <h2 className={cn("text-[28px] sm:text-[35px] font-red-hat-display font-[550] leading-tight", compact ? "text-grey-0" : "text-white")}>
                You’re already{" "}
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    Premium
                    <img src={THREESTAR_PRIMARY_INDIGO} alt="threestar" className="w-10 h-10 sm:w-14 sm:h-14"
                    />
                </span>
            </h2>

            <p className={cn("mt-2 text-[16px] sm:text-[18px] font-medium font-manrope", compact ? "text-grey-1" : "text-white")}>
                {name?.split(" ")[0]}, you already have full access to premium
                travel support. Our team will get in touch with you shortly.
            </p>
        </CardContent>
    )
}
