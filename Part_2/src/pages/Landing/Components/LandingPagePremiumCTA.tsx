import BenefitsSection from "./BenefitsSection"
import PremiumCardHeroBg from "./PremiumCardHeroBg"
import PremiumHeading from "./PremiumHeading"
import PremiumPriceCTA from "./PremiumPriceCTA"
import { GradientDivider } from "@/modules/Premium/components/GradientDivider"
import PriceComparisonCard, { BookingPlatform } from "@/modules/Onboarding/components/PriceComparisonCard"
import { getPlatformLogoURL } from "@/constants/icons/platformIcons"
import ComparepriceswithPill from "@/modules/Premium/components/ComparepriceswithPill"
import { FloatingCardDetails } from "@/modules/Premium/components/ComparePrices"


// const HeroWithPortraits = () => {
//   return (
//     <div className="relative w-full">
//       <img
//         src={HERO_IMAGES}
//         alt="Premium background"
//         className="w-full object-contain opacity-20 -rotate-6"
//       />

//       <div className="absolute bottom-[45%] left-[20%]">
//         <PortraitCluster />
//       </div>
//     </div>
//   )
// }

// const PremiumPreviewCard = () => {
//   return (
//     <div
//       className="
//         w-full
//         bg-natural-white border border-grey-4
//         rounded-[16px]
//         shadow-[0px_2px_8px_rgba(77,29,145,0.16)]
//         opacity-20 rotate-6
//       "
//     >
//       <div className="bg-primary-pale-purple px-3 py-2 flex items-center gap-1.5">
//         <img
//           src="/illustrations/wand.png"
//           alt="Magic wand icon"
//           className="w-3 h-3 object-contain"
//         />
//         <p className="font-manrope font-[500] text-[12px] leading-[12px] text-primary-default">
//           This is great for first-time visits and couples
//         </p>
//       </div>

//       <div className="w-full h-[140px] p-2">
//         <img
//           src="https://media.rimigo.com/1762868978543_63cea0cd611251aea0f08691aa2dad3e.png"
//           alt="Burj Khalifa sunset view"
//           className="w-full h-full object-cover rounded-2xl"
//         />
//       </div>

//       <div className="px-3 pb-3">
//         <Typography size="14" weight="semibold" family="redhat" color="grey-0">
//           Burj Khalifa
//         </Typography>
//         <Typography size="10" weight="medium" family="manrope" color="grey-2">
//           Sunrise (5:00AM - 6:30 AM, Weekends Only)
//         </Typography>
//       </div>
//     </div>
//   )
// }

const bookingPlatforms: BookingPlatform[] = [
  {
    name: 'Agoda',
    logo: getPlatformLogoURL('AGODA') ?? '',
    price: '₹4,700',
    isCheapest: true
  },
  {
    name: 'Booking.com',
    logo: getPlatformLogoURL('BOOKING_COM') ?? '',
    price: '₹4,950',
    isCheapest: false
  },
  {
    name: 'MakeMyTrip',
    logo: getPlatformLogoURL('MAKE_MY_TRIP') ?? '',
    price: '₹4,999',
    isCheapest: false
  },
  {
    name: 'Goibibo',
    logo: getPlatformLogoURL('GOIBIBO') ?? '',
    price: '₹5,500',
    isCheapest: false
  },
  {
    name: 'Expedia',
    logo: getPlatformLogoURL('EXPEDIA') ?? '',
    price: '₹5,000',
    isCheapest: false
  }
]


const LandingPagePremiumCTA = () => {
  const handleCardClick = () => {
    window.open('/premium', '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="w-full flex items-center justify-center md:py-10 md:px-4">
      <div 
        onClick={handleCardClick}
        className="relative w-full md:w-[85%] lg:w-[65%] h-full bg-black overflow-hidden py-12 md:py-16 md:rounded-4xl hover:cursor-pointer"
      >
        {/* BACKGROUND LAYER */}
        <PremiumCardHeroBg
          leftSlot={
            <PriceComparisonCard
              platforms={bookingPlatforms}
              rotation={-20}
              className="relative!  "
            />
          }
          rightSlot={
            <ComparepriceswithPill
              imageUrl="https://media.rimigo.com/1768214262255_compare_prices.webp"
              floatingCards={FloatingCardDetails}
            />
          }
        />

        <img src="/rimigo%20ai/gradient_desktop.png" alt="gradient_img" className="absolute top-0" />



        {/* FOREGROUND CONTENT */}
        <div className="relative z-20 flex flex-col items-center justify-center gap-5 md:gap-8 w-full mt-5">

          <PremiumHeading />
          <BenefitsSection />
          <GradientDivider className="scale-x-250 md:scale-x-600" />
          <PremiumPriceCTA />
        </div>
      </div>
    </section>
  )
}

export default LandingPagePremiumCTA
