import SectionTitle from '@/components/SectionTitle'
import { STATIC_TEXT } from '@/constants'
import ImageCaraouselContainer from './ImageCaraousel/ImageCaraouselContainer'
const Stories = () => {
    return (
        <section className="text-gray-600 body-font bg-primary">
            <div className="w-[90%] py-24 mx-auto">
                <div className="flex flex-col">
                    <div className="text-white">
                        <SectionTitle
                            title={'Experiences that speak for themselves'}
                            className="text-white"
                            align="left"
                        />
                        <br className="md:hidden" />
                        <p>
                            <span className="align-middle text-white text-[18px] md:leading-feature-card-header-mobile md:text-lg lg:text-xl leading-5  tracking-header-description-mobile">
                                {STATIC_TEXT.STORIES_DESCRIPTION_2}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap  mt-8">
                    <ImageCaraouselContainer />
                </div>
            </div>
        </section>
    )
}

export default Stories
