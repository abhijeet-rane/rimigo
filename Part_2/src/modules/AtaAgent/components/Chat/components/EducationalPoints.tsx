import { BULB_ICON } from '@/constants/thiingsIcons'

const EducationalPoints = ({ educationTips }: { educationTips: string[] }) => {
    return (
        <div className="self-stretch rounded-lg bg-grey-5  flex flex-col items-start py-2 px-3 gap-1 border border-grey-4 ">
            <div className="flex items-start gap-0.5">
                <img
                    className="w-3.5 relative max-h-full object-cover"
                    alt=""
                    src={BULB_ICON}
                />
                <b className="text-[14px] leading-[18px] font-semibold font-red-hat-display text-grey-0">KEEP IN MIND:</b>
            </div>
            <div className="relative leading-[18px] font-medium font-manrope text-grey-1">
                <div className="">
                    {educationTips.map((tip, index) => (
                        <li
                            key={index}
                            className="flex items-start gap-1"
                            style={{ listStyleType: 'disc', listStylePosition: 'inside' }}>
                            <span className="flex items-start gap-1">
                                <img
                                    src="/icons/purple-star.png"
                                    className="h-6 w-6 md:h-5 md:w-5 object-contain"
                                    alt=""
                                    srcSet="/icons/purple-star.png"
                                />
                                <p className="text-[14px] leading-[18px] font-medium font-manrope text-grey-1">{tip}</p>
                            </span>
                        </li>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default EducationalPoints
