import { ReactNode } from "react"
import { GradientDivider } from "../components/GradientDivider"
import StatsGrid from "../components/StatsGrid"

export type StatItem = {
    value?: string
    label: string
    icon?: ReactNode
    labelClassname?: string
}

const stats: StatItem[] = [
    { value: "203", label: "Destinations live" },
    { value: "17 Lakh+", label: "Total money saved on bookings" },
    { value: "4.55", label: "Average trip rating" },
    { value: "1068+", label: "Happy Travelers" },
]

const NumberWeProud = () => {
    return (
        <section className="text-gray-600 body-font flex flex-col items-center justify-center pt-10">
            <GradientDivider  />
            <div className=" md:mx-auto md:px-5 py-10">

                {/* Section Heading */}
                <h2 className="
                mb-12 text-center
                text-[16px] md:text-2xl
                font-red-hat-display font-semibold
                text-header-black
                ">
                    NUMBERS WE’RE PROUD OF
                </h2>

                {/* Stats */}
                <StatsGrid stats={stats}/>
                
            </div>
        </section>
    )
}

export default NumberWeProud
