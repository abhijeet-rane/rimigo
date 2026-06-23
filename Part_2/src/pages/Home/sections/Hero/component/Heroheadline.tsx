import { STATIC_LANDING_TEXT } from "@/constants"

const HeroHeadline = () => {
    return (
        <div className="flex flex-col justify-center items-center md:gap-[16px] mt-0 md:mt-4 max-w-[90%]">
            <div className="flex flex-col md:flex-col mb-[20px] md:mb-0">                
                <span className="relative z-10 bg-white bg-clip-text text-transparent text-[40px] min-[376px]:text-[64px] md:text-[120px] font-medium font-red-hat-display tracking-[-2%] md:tracking-[-4%] leading-none">
                    {STATIC_LANDING_TEXT.hero.headline.highlighted}
                </span>

                <span className="text-[32px] min-[376px]:text-[40px] md:text-[64px] font-[400] font-red-hat-display tracking-[-4%] text-white max-w-[95%] md:max-w-none whitespace-nowrap inline-block">
                    {STATIC_LANDING_TEXT.hero.headline.prefix}{' '}
                    <span className="italic font-[400] text-primary-light"> 
                        {STATIC_LANDING_TEXT.hero.headline.suffix}
                    </span>
                </span>
            </div>

            <p className="text-[16px] md:text-[20px] text-white font-[450] font-manrope max-w-xl  px-10 md:px-0 mx-auto tracking-[-2%] leading-[20px]">
                {STATIC_LANDING_TEXT.hero.description}
            </p>
        </div>
    )
}

export default HeroHeadline