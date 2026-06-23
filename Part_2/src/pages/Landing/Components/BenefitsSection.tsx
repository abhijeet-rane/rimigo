import { UserCheck, BadgePercent, SquareKanban } from 'lucide-react'
import BenefitPill from './BenefitPill'

const BenefitsSection = () => {
  return (
    <div className="flex justify-center mt-5 md:mt-0">
      <div className="grid grid-cols-2 gap-4 px-4  sm:flex sm:flex-wrap sm:justify-center">
        <BenefitPill icon={UserCheck} title="Personal travel expert" className="w-fit whitespace-nowrap -rotate-2" />
        <BenefitPill icon={SquareKanban} title="Customized itinerary" className="w-fit whitespace-nowrap rotate-2" />
        <div className="col-span-2 flex justify-center">
          <BenefitPill icon={BadgePercent} title="Exclusive deals" className="-rotate-1" />
        </div>
      </div>
    </div>
  )
}

export default BenefitsSection
