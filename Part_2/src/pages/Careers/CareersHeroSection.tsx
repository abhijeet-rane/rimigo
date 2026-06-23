const CareersHeroSection = () => {
    return (
        <section className="pt-32 pb-20 md:pt-44 md:pb-32 px-6 md:px-10">
            <div className=" mx-auto">
                <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
                    <span className="inline-block px-4 py-1 rounded-full bg-careers-tag text-primary text-sm font-medium mb-6  animate-fade-in">
                        Join Our Team
                    </span>

                    <h1 className="text-4xl md:text-6xl font-semibold leading-tight md:leading-tight text-careers-dark mb-6  animate-fade-in delay-100">
                        Do the best work of your life
                    </h1>

                    <p className="text-lg md:text-xl text-careers-muted mb-10 max-w-2xl  animate-fade-in delay-200">
                        Join us in our mission to revolutionize travel through AI innovation. We're seeking exceptional individuals passionate about
                        creating impactful experiences that make exploration more accessible and personalized.
                    </p>

                    {/* <div className="flex flex-col sm:flex-row gap-4 sm:gap-6  animate-fade-in delay-300">
                        <PlanTripButton text="View Open Positions" href="#open-positions" />
                    </div> */}
                </div>
            </div>
        </section>
    )
}

export default CareersHeroSection
