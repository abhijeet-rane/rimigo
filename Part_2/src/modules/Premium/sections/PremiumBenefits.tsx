import BenefitCard from "../shared/BenefitCard"
import PremiumCard from "../shared/PremiumCard"
import { UserStar, SparklesIcon, BedDouble, ScanSearch, TvMinimalPlay, BadgePercentIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"


type ScrollNavbarProps = {
  onBuyNow: () => void
  onRequestCallback: () => void
  isProcessingPayment?: boolean
  isPremium?: boolean
}

type Benefit = {
  icon: LucideIcon
  title: string
  side: "left" | "right"
  offsetClass?: string
}

const benefits: Benefit[] = [
  {
    icon: UserStar,
    title: "Human travel expert",
    side: "left",
  },
  {
    icon: SparklesIcon,
    title: "Unlimited AI expert access",
    side: "left",
    offsetClass: "-translate-x-10",
  },
  {
    icon: BedDouble,
    title: "Curated hotel collections",
    side: "left",
  },
  {
    icon: ScanSearch,
    title: "Personalised review of itineraries",
    side: "right",
  },
  {
    icon: TvMinimalPlay,
    title: "Curated content for discovery",
    side: "right",
    offsetClass: "translate-x-10",
  },
  {
    icon: BadgePercentIcon,
    title: "Exclusive deals on select listings",
    side: "right",
  },
]


const PremiumBenefits = ({ onBuyNow, isProcessingPayment = false, isPremium = false }: ScrollNavbarProps) => {
return (
    <section className="w-full flex flex-col items-center gap-10 py-16 bg-primary-pale-purple px-9">
      {/* Heading */}
      <div className="text-center">
        <p className="text-[32px] font-red-hat-display font-medium leading-10 text-grey-0">
          Simple pricing, maximum benefit
        </p>
      </div>

      {/* Main content */}
      <div
        className="
          relative
          w-full max-w-6xl
          grid grid-cols-1 md:grid-cols-3
          gap-6
          items-center
        "
      >
        {/* LEFT COLUMN */}
        <div className="hidden md:flex flex-col justify-between gap-8 items-end">
        {benefits
          .filter(b => b.side === "left")
          .map(({ icon, title, offsetClass }, index) => (
            <div key={index} className={offsetClass}>
              <BenefitCard icon={icon} title={title} />
            </div>
          ))}
      </div>


        {/* CENTER */}
        <div className="flex justify-center">
          <PremiumCard
            onClick={onBuyNow}
            title="Premium"
            price="₹5,000"
            duration="for 1 year"
            note="(unlimited trips)"
            ctaText={isPremium ? "REQUEST CALLBACK" : "BUY NOW"}
            disabled={isProcessingPayment}
            isLoading={isProcessingPayment}
          />
        </div>

        {/* RIGHT COLUMN */}
        <div className="hidden md:flex flex-col justify-between gap-8 items-start">
        {benefits
          .filter(b => b.side === "right")
          .map(({ icon, title, offsetClass }, index) => (
            <div key={index} className={offsetClass}>
              <BenefitCard icon={icon} title={title} />
            </div>
          ))}
      </div>

      <div className="flex flex-col md:hidden items-start gap-4 mt-5 justify-center">
        {benefits.map(({ icon, title }, index) => (
          <BenefitCard key={index} icon={icon} title={title} />
        ))}
      </div>


      </div>
    </section>
  )
}

export default PremiumBenefits
