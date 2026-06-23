import { Plane, BedDouble, FerrisWheel } from "lucide-react"
import ExclusiveCardBottom from "../shared/exclusiveCardBottom"
import RateColumn from "./RateColumn"
import TitleWithBadge from "../shared/TitleWithBadge"

export default function ExclusiveRates() {
    return (
        <div className="w-full max-w-100 rounded-3xl border border-l-primary-default border-b-0 border-r-0 border-t-primary-default bg-white p-6 shadow-lg">
            <div className="flex gap-4 pb-2">

                {/* COLUMN 1 */}
                <div className="flex flex-col gap-6 md:gap-9 justify-end pb-1 mb-5 md:mb-6">
                    <TitleWithBadge icon={Plane} title="Flights" />
                    <TitleWithBadge icon={BedDouble} title="Hotels" />
                    <TitleWithBadge icon={FerrisWheel} title="Attractions" />
                </div>

                {/* OUR RATES */}
                <RateColumn
                    title="Our rates"
                    headerVariant="primary"
                    bordered
                    platforms={["GETYOURGUIDE","HEADOUT", "KLOOK"]}
                    label={<>on select<br />listings</>}
                    prices={[
                        { price: "₹23,750", note: "save 5%", highlight: true },
                        { price: "₹5,720", note: "save 12%", highlight: true },
                        { price: "₹1,195", note: "save 8%", highlight: true },
                    ]}
                />

                {/* OTHER RATES */}
                <RateColumn
                    title="Other rates"
                    platforms={["BOOKIN","EXPEDIA","MAKE_MY_TRIP"]}
                    label={<>standard<br />pricing</>}
                    prices={[
                        { price: "₹25,000", note: "per person" },
                        { price: "₹6,499", note: "per night" },
                        { price: "₹1,299", note: "per ticket" },
                    ]}
                />
            </div>

            <ExclusiveCardBottom
                title={
                    <>
                        Unlock <span className="text-purple-600 font-semibold italic">negotiated</span> rates
                    </>
                }
                subtitle="Access special travel deals and insider prices found only by our experts"
            />
        </div>
    )
}
