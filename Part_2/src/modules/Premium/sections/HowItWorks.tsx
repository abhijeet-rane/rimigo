import HowItWorksContent from "../components/HowItWorksContent"
import SectionStarHeading from "../components/SectionStarHeading"

const HowItWorks = () => {
    return (
        <section className="bg-grey-5 py-16 ">
            {/* Heading */}
            <SectionStarHeading
                title="How It Works"
                className="text-header-black"
            />
            <HowItWorksContent />
        </section>

    )
}

export default HowItWorks