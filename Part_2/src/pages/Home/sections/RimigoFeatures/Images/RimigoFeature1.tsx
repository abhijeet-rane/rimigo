const AirplaneIcon = () => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 text-blue-500">
        <path
            d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
            fill="currentColor"
        />
    </svg>
)

const TopCard = () => {
    return (
        <div className="absolute left-[calc(50%+60px)] md:left-1/2 top-[18%] -translate-x-1/2 md:translate-x-0 z-40 w-[220px] rotate-[2deg] rounded-xl border border-grey-0 bg-white p-3 shadow-lg">
            <div className="flex flex-col gap-1.5 text-left">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold leading-tight text-gray-900 tracking-tight">Flight from Bangalore to Tokyo</span>
                    <AirplaneIcon />
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-gray-600">Lands at 12:15pm</span>
                    <span className="text-gray-400">∙</span>
                    <div className="flex items-center gap-1.5">
                        <span
                            className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500"
                            aria-hidden
                        />
                        <span className="font-semibold text-gray-900">Japan Airlines</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

const MT_FUJI_IMAGE = 'https://media.rimigo.com/images/1761749060_e846f78b-4f92-4e7d-883d-700310629649.jpg'

const BottomCard = () => {
    return (
        <div className="absolute bottom-[12%] -left-[calc(50%)] md:-left-[calc(50%-64px)] md:right-1/2 translate-x-1/2 md:translate-x-0 z-40 w-[200px] overflow-hidden rounded-xl shadow-lg rotate-[-4deg] border border-grey-0">
            <div className="relative h-[140px] w-full">
                <img
                    src={MT_FUJI_IMAGE}
                    alt="Mt Fuji"
                    className="h-full w-full object-cover [background:linear-gradient(180deg,_rgba(16,_16,_16,_0),_#101010)] "
                />
                <div
                    className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/40 to-transparent pt-8 pb-2 pl-2.5 pr-2"
                    aria-hidden
                />
                <div className="absolute bottom-2 left-2.5 right-2 text-left">
                    <div className="text-sm font-bold leading-tight text-white">Mt Fuji</div>
                    <div className="text-xs font-medium text-white/90">9:00am - 3:00pm</div>
                </div>
            </div>
        </div>
    )
}

const RimigoPhoneFeature1 = () => {
    return (
        <div className="relative flex justify-center items-center">
            {/* Back phones */}
            <div className="absolute h-94.75 w-63.75 rounded-2xl border border-grey-0 -rotate-6 -translate-x-2 z-10 opacity-[0.1]" />
            <div className="absolute h-97.25 w-63.75 rounded-2xl border border-grey-0 rotate-6 translate-x-2 z-20 bg-white opacity-[0.1]" />

            {/* Main phone */}
            <div className="relative h-97.25 w-63.75 rounded-2xl z-30">
                <img
                    src="https://media.rimigo.com/1768197418952_Unlimited_itineraries_main.webp"
                    alt="Unlimited itineraries preview"
                    className="h-full w-full object-cover rounded-2xl blur-[2px]"
                />

                <TopCard />
                <BottomCard />
            </div>
        </div>
    )
}

export default RimigoPhoneFeature1
