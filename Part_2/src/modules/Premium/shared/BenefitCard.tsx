import { LucideIcon } from "lucide-react"

type BenefitCardProps = {
  icon: LucideIcon
  title: string
}

const BenefitCard = ({
  icon: Icon,
  title,
}: BenefitCardProps) => {
  return (
    <div
      className={`
        relative
        bg-white
        rounded-full
        px-4 py-2
        flex items-center gap-1
        w-fit shadow-lg
      `}
    >
      {/* Icon badge */}
      <div className="flex items-center justify-center w-8 h-8 rounded-full  ">
        <Icon size={22} className="text-primary-default" />
      </div>

      {/* Text */}
      <div>
        <p className="text-[16px] font-manrope font-[500] text-grey-0 -tracking-[4%]
        ">{title}</p>
      </div>
    </div>
  )
}

export default BenefitCard
