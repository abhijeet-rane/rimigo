type Traveller = {
  name: string
  img: string
  location: string
  review: string
}

type TravellerCardProps = {
  traveller: Traveller
}

const TravellerCard = ({ traveller }: TravellerCardProps) => {
  return (
    <div className="flex-none w-80 md:w-97.5 h-100">
      <div className="relative h-full rounded-2xl bg-grey-4/10 px-6 pb-6 pt-16 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex flex-col">
        {/* Floating Image */}
        <div className="absolute w-full -top-8 left-6">
          <div className="relative  w-full h-45">
            {/* Tilted shadow */}
            <div className="absolute inset-0 rounded-xl bg-purple-500/15 rotate-[3deg] translate-x-1 translate-y-1 z-0" />

            {/* Image */}
            <div className="relative w-full h-full rounded-3xl  -rotate-1 overflow-hidden z-10">
              <img src={traveller.img} alt={traveller.name} className="w-full h-full object-cover " />
            </div>
          </div>
        </div>

        {/* lower div */}
        <div className="mt-auto pt-30">
          <p className="leading-relaxed text-grey-1 font-manrope font-medium text-[17px] md:text-[15px]">
            {traveller.review}
          </p>

          <div className="mt-4">
            <p className="text-[16px] md:text-[18px] text-grey-0 font-bold font-stretch-condensed">
              {traveller.name}
            </p>
            <p className="text-grey-2 mt-0.5 font-manrope text-[14px] md:text-[16px] font-semibold">
              {traveller.location}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TravellerCard
