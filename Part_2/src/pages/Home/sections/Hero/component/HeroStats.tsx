import { StatItem } from "@/modules/Premium/sections/NumberWeProud"
import React from "react"

type HeroStatsProps = {
  stats: StatItem[]
}

const HeroStats: React.FC<HeroStatsProps> = ({ stats }) => {
  return (
    <div className="flex justify-center md:justify-between items-center gap-8 md:gap-25 w-full max-w-4xl mx-auto mt-6">
      {stats.map((item, index) => (
        <div key={index} className="flex flex-col md:flex-row items-center gap-2 md:gap-3 text-center text-grey-4 md:text-left leading-[-0.2px]">
          {item.icon}
          <span className={`text-[14px] md:text-[16px] text-grey-4 px-2 md:px-0 leading-[16px] font-semibold tracking-[-4%] ${item.labelClassname}`}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export default HeroStats