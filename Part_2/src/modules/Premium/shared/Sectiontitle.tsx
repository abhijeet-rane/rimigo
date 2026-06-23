import { THREESTAR_PRIMARY_INDIGO } from "@/constants/icons/svgFromCDN"

type SectionTitleProps = {
  title: string
  className?: string
  bgColor?: string        
  imgSrc?: string         
}

const SectionTitle = ({
  title,
  className = "",
  bgColor = "bg-primary-pale-purple",         
  imgSrc = THREESTAR_PRIMARY_INDIGO 
}: SectionTitleProps) => {
  return (
    <div
      className={`inline-flex items-center rounded-full px-[1px] py-0 text-primary-default ${bgColor}`}
    >
      <div>
        <img
          src={imgSrc}
          alt="threestar"
          className="w-[26px] h-[26px] md:w-[26px] md:h-[26px] object-contain"
        />
      </div>

      <p
        className={`text-[18px] font-bold font-red-hat-display tracking-[-4%] mr-3 ${className}`}
      >
        {title}
      </p>
    </div>
  )
}

export default SectionTitle
