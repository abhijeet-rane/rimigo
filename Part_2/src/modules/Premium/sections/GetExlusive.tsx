import ComparePrices from "../components/ComparePrices"
import ExclusiveRates from "../components/ExclusiveRates"
import { SectionIntro } from "../shared/SectionIntro"


export const GetExlusive = () => {

  return (
    <section className="py-16 bg-grey-5">
      <SectionIntro
        title="Save your money"
        heading="Get exclusive deals"
        subtitle="Unlock best rates across 50+ partners so you never have to pay more than required"
      />

      {/* Placeholders row */}
      <div className="mx-auto mt-12 flex max-w-85.5 md:max-w-3xl flex-col md:flex-row justify-center items-center gap-10">
        <ExclusiveRates/>
        <ComparePrices />
      </div>
    </section>
  )
}
