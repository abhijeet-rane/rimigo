import { NumberTicker } from '@/components/magicui/number-ticker'
import { cn } from '@/lib/utils'

const StatInfo = ({ stat, description, imageURL }: { stat: number | string; description: string; imageURL: string }) => {
    return (
        <div className="h-full w-full flex flex-col bg-white rounded-2xl overflow-hidden border border-grey-4">
            <div className="relative flex-1 overflow-hidden">
                <img
                    alt="team"
                    className="w-full h-full object-cover"
                    src={imageURL}
                />
                <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-white via-white/80 from-45% to-transparent pb-40">
                    <div className="flex flex-col items-start justify-center gap-1 md:gap-3 px-4 pt-4">
                {/* html code for ruppes */}
                {description === 'Traveller ratings' ? (
                    <>
                        <span className={cn('inline-block tabular-nums tracking-[-2%] text-[30px] mdtext-[40px] font-medium leading-[48px] text-header-black')}>
                            <NumberTicker
                                value={Number(stat)}
                                decimalPlaces={1}
                                className=" leading-[48px] text-header-black tracking-[-2%] font-red-hat-display"
                            />
                        </span>
                    </>
                ) : description === 'Average Savings' ? (
                    <>
                        {/* html code for rupees */}
                        <span className="tracking-[-2%] font-red-hat-display text-[40px] font-medium leading-[48px] text-header-black"> &#8377; </span>
                        <NumberTicker
                            value={Number(stat)}
                            className="tracking-[-2%] font-red-hat-display text-[40px] font-medium leading-[48px] text-header-black"
                        />
                    </>
                ) : description === 'Total savings' ? (
                    <div>
                        <span className="tracking-[-2%] font-red-hat-display text-[30px] md:text-[30px] font-medium leading-[48px] text-header-black">₹</span>
                        <NumberTicker
                            value={Number(stat)}
                            locale="en-IN"
                            decimalPlaces={2}
                            className="tracking-[-2%] font-red-hat-display text-[30px] md:text-[30px] font-medium leading-[48px] text-header-black"
                        />
                        <span className="tracking-[-2%] font-red-hat-display text-[30px] md:text-[30px] font-medium leading-[48px] text-header-black"> L</span>
                    </div>
                ) : (
                                <NumberTicker
                        value={Number(stat)}
                        className="tracking-[-2%] font-red-hat-display text-[30px] mdtext-[40px] font-medium leading-[48px] text-header-black"
                    />
                )}
                <h3 className="text-[16px] text-grey-2 font-semibold leading-[100%] tracking-[-2%] mb-3">{description}</h3>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default StatInfo
