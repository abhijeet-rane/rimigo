import ApplicationCTA from './ApplicationCTA'
import CareersHeroSection from './CareersHeroSection'
import CareersLayout from './CareersLayout'

const Careers = () => {
    return (
        <CareersLayout>
            <CareersHeroSection />
            {/* <JobListings /> */}
            {/* <div className="w-4/5 m-auto h-auto min-h-screen border-[1px] border-gray-200">
                <iframe src="https://jobs.reczee.com/rimigo/job-embed" className="w-full h-full min-h-screen" id="open-positions"></iframe>
            </div> */}
            <ApplicationCTA />
        </CareersLayout>
    )
}

export default Careers
