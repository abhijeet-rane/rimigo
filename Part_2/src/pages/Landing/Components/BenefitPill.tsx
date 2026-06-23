import { LucideIcon } from 'lucide-react'

type BenefitPillProps = {
  icon: LucideIcon
  title: string
  className?: string
}

const BenefitPill = ({ icon: Icon, title, className }: BenefitPillProps) => {
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-2 sm:px-3 sm:py-2 bg-white rounded-full border border-gray-200
        ${className ?? ''}
      `}
    >
      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" strokeWidth={2} />
      <span className="text-[11px] sm:text-[12px] font-bold font-manrope text-grey-0 tracking-[-4%]">
        {title}
      </span>
    </div>
  )
}


export default BenefitPill
