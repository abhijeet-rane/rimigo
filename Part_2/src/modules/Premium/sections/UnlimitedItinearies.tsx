import { itineariesFeatures } from "../constants"
import { SectionIntro } from "../shared/SectionIntro"
import ItineraryFeatureItem from "../components/ItineraryFeatureItem" 
import ItineariesPhoneImages from "../components/ItineariesPhoneImages"

export const UnlimitedItinearies = () => {
  return (
    <section className="py-16">
      <SectionIntro
        title="Plan better"
        heading="Unlimited customisation for your itinerary"
        subtitle="Your dedicated expert will refine your plan until you are fully satisfied"
      />

      <div className="mx-auto mt-12 px-10 md:px-28">
        <ItineariesPhoneImages />

        <div className="mt-12 flex flex-col md:flex-row text-start gap-5 md:gap-32 items-center justify-center">
          {itineariesFeatures.map((feature, index) => (
            <ItineraryFeatureItem
              key={feature.title}
              feature={feature}
              isLast={index === itineariesFeatures.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
