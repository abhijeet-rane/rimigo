import Hero from './sections/Hero/Hero'
import DestinationsSection from './sections/Destinations/DestinationsSection'
import Faq from './sections/FAQ/FAQ'
import TestimonalsWrapper from './sections/Hero/TestimonalsWrapper'
import MobileStickyCTA from '@/modules/Premium/components/MobileStickyCTA'
import { useStartPlanningCTA } from './hooks/useStartPlanningCTA'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'
import CustomShimmer from '@/components/shared/Shimmer'
import RimigoFeatures from './sections/RimigoFeatures/RimigoFeatures'
import CollectionsSection from './sections/Collections/CollectionsSection'
import { GradientDivider } from '@/modules/Premium/components/GradientDivider'

const Home = () => {
    const handleStartPlanningClick = useStartPlanningCTA('hero_sticky_mobile')
    const { isAuthenticated , isLoading} = useAuth()
    const navigate = useNavigate()


    useEffect(() => {
        if (!isLoading && isAuthenticated) {
        // Preserve existing query params
        const currentParams = new URLSearchParams(location.search)

        if (!currentParams.has('utm_source')) {
            currentParams.set('utm_source', 'rimigo_website')
        }

        navigate(
            `${DEFAULT_LANDING_PAGE_ROUTE}?${currentParams.toString()}`,
            { replace: true } 
        )
        }
    }, [isAuthenticated, navigate, location.search])

    // If authenticated, don't render marketing UI at all
    if (isLoading || isAuthenticated){return (
        <>
        <CustomShimmer
            className='min-h-screen bg-black w-full'
        />
        </>
    )}

    return (
        <main>
            <Hero onCtaClick={handleStartPlanningClick} />
            <CollectionsSection 
                title="Explore tripboards from real travelers"
                showTabs={true}
                limit={3} 
            />
            <GradientDivider className="scale-x-200 mt-10" />
            <RimigoFeatures/>
            {/* <Steps /> */}
            <DestinationsSection />
            <TestimonalsWrapper />
            <Faq />

            <MobileStickyCTA
                buttons={[
                    {
                        title: "Plan my trip",
                        onClick: handleStartPlanningClick,
                        textStyle: "text-[18px] font-red-hat-display font-[645]",
                        className:
                            "flex-1 py-3 bg-linear-to-r from-primary-default to-primary-dark text-white rounded-lg",
                        variant: "custom",
                    },
                ]}
                buttonsContainerClassName="flex-row gap-3"
            />
        </main>
    )
}

export default Home
