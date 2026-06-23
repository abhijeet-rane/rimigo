import TravellerSavedContent from "../components/TravellerSavedContent"
import TravllerSavedBg from "../components/TravllerSavedBg"
import { FAMILY_IMAGES } from "../constants"
import { TravellerBgImage } from "../types/TravllerSaved"


const travellerSavedImages: TravellerBgImage[] = [
  {
    src: FAMILY_IMAGES.FAMILY_2,
    className: "h-55 w-50 -top-6 -left-24 sm:h-40 sm:w-48 sm:-left-12 md:h-44 md:w-56 md:-left-10 lg:h-50 lg:w-36 lg:left-20 lg:top-15",
  },
  {
    src: FAMILY_IMAGES.FAMILY_1,
    className: "h-35 w-24 -top-10 left-1/2 -translate-x-1/2 sm:h-28 sm:w-36 md:h-32 md:w-40 md:-top-15 md:h-54 md:left-4/9",
  },
  {
    src: FAMILY_IMAGES.FAMILY_6,
    className: "h-32 w-40 top-6 -right-6 sm:h-40 sm:w-48 sm:-right-12 md:h-44 md:w-56 md:-right-20 lg:h-48 lg:w-64 lg:right-20 lg:-top-10",
  },
  {
    src: FAMILY_IMAGES.FAMILY_3,
    className: "h-50 w-33 bottom-3 -left-6 sm:h-40 sm:w-48 sm:-left-12 md:h-44 md:w-56 md:-left-20 lg:h-50 lg:w-36 lg:left-40 lg:-bottom-8",
  },
  {
    src: FAMILY_IMAGES.FAMILY_4,
    className: "h-34 w-32 -bottom-3 left-1/2 -translate-x-1/2 sm:h-28 sm:w-36 md:h-32 md:w-40 lg:h-44 lg:w-33 lg:-bottom-7",
  },
  {
    src: FAMILY_IMAGES.FAMILY_5,
    className: "h-32 w-40 bottom-6 -right-15 sm:h-40 sm:w-48 sm:-right-12 md:h-44 md:w-56 md:-right-20 lg:h-53 lg:w-48 lg:right-10",
  },
]

const TravllerSaved = () => {
  return (
    <section className="relative h-[67vh] overflow-hidden bg-grey-0">
      <TravllerSavedBg images={travellerSavedImages} />
      
      {/* Content */}
      <TravellerSavedContent/>

    </section>
  )
}

export default TravllerSaved
