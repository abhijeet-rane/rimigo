import { PlanTripButton } from '@/components/PlanTripButton'

const AboutHeroSection = () => {
    return (
        <section className="pt-32 pb-20 md:pt-44 md:pb-32 px-6 md:px-10">
            <div className=" mx-auto">
                <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
                    <span className="inline-block px-4 py-1 rounded-full bg-careers-tag text-primary-default text-sm font-medium mb-6  animate-fade-in">
                        Travel Done Right, Every Time
                    </span>

                    <h1 className="text-4xl md:text-6xl font-semibold leading-tight md:leading-tight text-careers-dark mb-6  animate-fade-in delay-100">
                        Transforming Travel with Innovation
                    </h1>

                    <p className="text-lg md:text-xl text-careers-muted mb-10 max-w-2xl  animate-fade-in delay-200">
                        At Rimigo, we're redefining the way people explore the world. Our mission is to make travel seamless, personalized, and
                        unforgettable through cutting-edge AI and innovative technology. Join us in shaping the future of travel experiences.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6  animate-fade-in delay-300">
                        <PlanTripButton
                            text="Start Planning"
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AboutHeroSection
