import { STATIC_TEXT, testimonialData } from '@/constants'
import CollectionVideosSection from '@/modules/ContentCollection/components/CollectionVideosSection' 

const TestimonalsWrapper = () => {


  return (
    <section className="w-full py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
              <h1 className="text-center mx-2 md:mx-10 text-3xl md:text-4xl font-bold mb-10 text-header-black">{STATIC_TEXT.TESTMONIAL_HEADING}</h1>

        {/* Video Testimonials Carousel */}
        <CollectionVideosSection
          videos={testimonialData}
          autoPlayOnHover={true}
          showPlayButton={true}
          autoPlayInView={false}
          className='max-w-full'
          mediaContainerClassname='h-[500px] md:h-[550px]'
        />
      </div>
    </section>
  )
}

export default TestimonalsWrapper