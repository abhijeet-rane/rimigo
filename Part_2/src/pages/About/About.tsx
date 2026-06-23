import AboutLayout from './AboutLayout'
import Team from './sections/Team'

import AboutHeroSection from './AboutHeroSection'
const About = () => {
    return (
        <>
            <AboutLayout>
                <AboutHeroSection />
                <Team />
            </AboutLayout>
        </>
    )
}

export default About
