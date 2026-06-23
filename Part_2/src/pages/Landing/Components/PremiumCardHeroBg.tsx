import { ReactNode } from 'react'

type PremiumCardHeroBgProps = {
  leftSlot?: ReactNode
  rightSlot?: ReactNode
}

const PremiumCardHeroBg = ({ leftSlot, rightSlot }: PremiumCardHeroBgProps) => {
  return (
    <div className="absolute inset-x-0 bottom-0 z-0 pointer-events-none">
      <div className="relative w-full h-80 md:h-95">

        {/* LEFT BOTTOM SLOT */}
        <div className="absolute bottom-[20%] -left-[60%] md:-bottom-8 md:-left-25 w-[35%] -rotate-12 md:-rotate-6 opacity-25 md:opacity-27">
          {leftSlot}
        </div>

        {/* RIGHT BOTTOM SLOT */}
        <div className="absolute bottom-[35%] right-[-55%] md:-bottom-25 md:-right-23 w-70 md:w-[30%] opacity-25 md:opacity-27 rotate-5 md:rotate-4">
          {rightSlot}
        </div>
      </div>
    </div>
  )
}

export default PremiumCardHeroBg
