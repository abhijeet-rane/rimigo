import EnhanceContent from "../components/EnhanceContent"
import { SectionIntro } from "../shared/SectionIntro" 

export const EnhanceYourTrip = () => {
  return (
    <section className="py-16">
      <SectionIntro
        title="Get expert inputs"
        heading="Travel with an expert in your pocket"
        subtitle="From booking changes to local advice your expert handles it all"
      />

      {/* section-specific content goes here */}
      <EnhanceContent/>
    </section>
  )
}
