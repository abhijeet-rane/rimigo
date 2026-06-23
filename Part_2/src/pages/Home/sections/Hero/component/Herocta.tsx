import { Home } from 'lucide-react'
import { STATIC_LANDING_TEXT } from '@/constants' 
import { Button } from '@/components/ui/button'
import { useStartPlanningCTA } from '@/pages/Home/hooks/useStartPlanningCTA'


interface HeroCTAProps { 
    isAuthenticated?: boolean 
    onShowVideo?: () => void 
}

const HeroCTA = ({ isAuthenticated }: HeroCTAProps) => {
  const handleStartPlanningClick = useStartPlanningCTA('hero_section')
  return (
    <div className="flex justify-center mb-16 px-4">
      <div className="flex flex-col md:flex-row items-center gap-3 w-full">
      <Button
        onClick={handleStartPlanningClick}
        className="cursor-pointer px-11 py-6 font-red-hat-display bg-gradient-to-r from-primary-default to-primary-dark text-white font-semibold text-[18px]"
      >
        {isAuthenticated ? (
          <span className="flex items-center gap-3 text-[18px] font-semibold">
            <Home className="w-5! h-5!" strokeWidth={2} />
            {STATIC_LANDING_TEXT.cta.HomeCta}
          </span>
        ) : (
          STATIC_LANDING_TEXT.cta.startPlanning
        )}
      </Button>
      </div>
    </div>
  )
}

export default HeroCTA
