import StatInfo from './StatInfo'
import { STATIC_TEXT } from '@/constants'
import { Button } from '@/components/ui/button'
import { useStartPlanningCTA } from '@/pages/Home/hooks/useStartPlanningCTA'

const Stats = () => {
    const handleStartPlanningClick = useStartPlanningCTA('stats_section')

    return (
        <section className="text-gray-600 body-font">
            <div className="w-full min-h-[60vh] px-5 py-12 mx-auto md:flex md:flex-col md:justify-center md:items-center">
                <div className="flex flex-col text-center w-full mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold mt-4 font-red-hat-display text-header-black">{STATIC_TEXT.STATS_HEADER}</h1>
                    <div className="w-full lg:w-[100%] flex justify-center items-center mx-auto lg:my-2">
                        <p className="text-xl text-grey-2 font-manrope font-medium">{STATIC_TEXT.STATS_DESCRIPTION}</p>
                    </div>
                </div>
                <div className="-m-4 grid grid-cols-2 gap-4 md:gap-10 lg:grid-cols-4 lg:max-w-4xl mt-2">
                    {STATIC_TEXT.STATS_ITEMS.map((item, index) => (
                        <StatInfo
                            key={index}
                            stat={item.stat}
                            description={item.description}
                            imageURL={item.imageURL}
                        />
                    ))}
                </div>
                <div className="mt-12 hidden md:flex justify-center items-center">
                    <Button
                        onClick={handleStartPlanningClick}
                        className="w-full sm:w-[220px] h-11 bg-gradient-to-r from-primary-default to-primary-dark text-white font-semibold flex items-center justify-center gap-2 text-[18px] cursor-pointer transition-all duration-300 hover:brightness-110 active:scale-[0.98] font-red-hat-display"
                    >
                            {STATIC_TEXT.STATS_BTN}
                    </Button>
                </div>
            </div>
        </section>
    )
}

export default Stats
