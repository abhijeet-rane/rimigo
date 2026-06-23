import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, AccordionWrapper } from '@/components/ui/accordion'
import { STATIC_TEXT } from '@/constants'

const AccordionItemComponent = ({ value, title, content }: { value: string; title: string; content: string }) => (
    <AccordionItem value={value}>
        <AccordionHeader>
            <h2 className="text-[16px] md:text-base lg:text-[18px] text-header-black leading-tight sm:leading-accordion-answer-mobile tracking-tight sm:tracking-accordion-answer-mobile font-medium font-red-hat-display">
                {title}
            </h2>
        </AccordionHeader>
        <AccordionPanel>
            <p className="text-[16px] font-medium text-icon leading-tight sm:leading-accordion-answer-mobile tracking-tight sm:tracking-accordion-answer-mobile font-manrope">
                {content}
            </p>
        </AccordionPanel>
    </AccordionItem>
)

const FAQ = () => {
    return (
        <section className=" bg-secondary-alice_blue min-h-[60vh] flex flex-col justify-center items-center py-12">
            <div className="container py-12 mx-auto w-full h-full max-w-4xl ">
                <h1 className="text-3xl md:text-4xl font-bold mt-4 font-red-hat-display text-header-black text-center">{STATIC_TEXT.FAQ_HEADER_1}</h1>
                <div className="w-[90%] flex justify-center items-center mx-auto mt-6  ">
                    <AccordionWrapper>
                        <Accordion defaultValue={['item-1']}>
                            <AccordionItemComponent
                                value="item-1"
                                title="What happens after I start planning my trip on Rimigo?"
                                content="Planning your trip is effortless. Just click on “Plan My Trip,” enter your preferences, and instantly generate a personalized itinerary. You can also explore curated stays and activities tailored to your interests, making it easy to shape the perfect journey your way."
                            />
                            <AccordionItemComponent
                                value="item-2"
                                title="How do bookings work on Rimigo?"
                                content="Rimigo fetches real-time options from trusted partners like Agoda, Kayak, and GetYourGuide. You can compare choices easily and complete bookings directly with these partners."
                            />
                            <AccordionItemComponent
                                value="item-3"
                                title="Can I make changes to my itinerary?"
                                content="Yes. Your itinerary is fully flexible. You can update stays, destinations, or experiences anytime using Rimigo AI."
                            />
                            <AccordionItemComponent
                                value="item-4"
                                title="How is Rimigo different from travel agents or booking websites?"
                                content="Travel agents offer fixed packages, while booking sites require you to plan everything yourself. Rimigo combines expert planning with the freedom to personalize your trip."
                            />
                            <AccordionItemComponent
                                value="item-5"
                                title="What kind of support do I get before and during my trip?"
                                content="Rimigo AI helps you make updates anytime. If you choose our premium assistance subscription, our travel experts are also available to support you before and during your trip."
                            />
                        </Accordion>
                    </AccordionWrapper>
                </div>
            </div>
        </section>
    )
}

export default FAQ
