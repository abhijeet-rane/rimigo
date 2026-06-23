import { THREESTAR_PRIMARY_INDIGO } from "@/constants/icons/svgFromCDN"

type SectionStarHeadingProps = {
    title: string
    className?: string
}

const SectionStarHeading = ({
    title,
    className = "",
}: SectionStarHeadingProps) => {
    return (
        <div className="flex items-center justify-center ">
        <h2
            className={`
         text-center text-2xl font-semibold font-red-hat-display
        md:text-3xl ${className}
      `}
        >
            {title}
            {/* <ThreeStar className="ml-0 inline-block align-middle" /> */}
            
            
        </h2>
            <img src={THREESTAR_PRIMARY_INDIGO} alt="threestar" className="w-10 h-10 rotate-8 mb-4 " />
        </div>
    )
}

export default SectionStarHeading
