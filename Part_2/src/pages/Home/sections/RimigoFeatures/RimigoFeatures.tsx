import { STATIC_TEXT } from '@/constants'
import SectionDescription from '@/components/SectionDescription'
import RimigoFeatureCard2 from './Images/RimigoFeature2'
import RimigoFeature4 from './Images/RimigoFeature4'
import RimigoPhoneFeature1 from './Images/RimigoFeature1'
import RimigoFeatureCard, { highlightWords } from './RimigoFeatureCard'
import ComparepriceswithPill from '@/modules/Premium/components/ComparepriceswithPill'
import { FloatingCardDetails } from '@/modules/Premium/components/ComparePrices'

const RimigoFeatures = () => {
    return (
        <section className="text-gray-600 body-font">
            <div className="container px-2 lg:px-5 py-10 lg:py-8 mx-auto w-full lg:max-w-[70%] 2xl:max-w-[60%]">
                <div className="text-center lg:py-20 py-10 ">
                    <h1 className="text-3xl md:text-4xl font-bold text-grey-0">{STATIC_TEXT.STEPS_HEADER}</h1>
                    <SectionDescription
                        description={STATIC_TEXT.STEPS_DESCRIPTION}
                        align="center"
                        className="max-w-full mx-auto mt-4"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <RimigoFeatureCard
                        title={highlightWords("Access your custom itinerary", ["custom"])}
                        image={<RimigoPhoneFeature1 />}
                    />
                    <RimigoFeatureCard
                        title={highlightWords("Add activities you like", ["activities"])}
                        image={<RimigoFeature4 />}
                    />
                    <RimigoFeatureCard
                        
                        title={highlightWords("Find lowest prices easily", ["lowest"])}
                        image={<ComparepriceswithPill
                            className='h-70 xl:h-86'
                            maxWidth="400px"
                            imageUrl="https://media.rimigo.com/1768214262255_compare_prices.webp" floatingCards={FloatingCardDetails} />}
                    />
                    <RimigoFeatureCard
                        title={highlightWords("Invite and plan together", ["together"])}
                        image={<RimigoFeatureCard2 />}
                    />
                    
                </div>
            </div>
        </section>
    )
}

export default RimigoFeatures
