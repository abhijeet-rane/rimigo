import SectionTitle from '@/components/shared/Sections/SectionTitle'
import {
    Accordion,
    AccordionHeader,
    AccordionItem,
    AccordionPanel,
    AccordionWrapper,
} from '@/components/ui/accordion'

interface FAQItem {
    value: string
    title: string
    content: string
}

interface FAQProps {
    title: string
    items: FAQItem[]
    defaultOpenItems?: string[]
    className?: string
}

const AccordionItemComponent = ({
    value,
    title,
    content,
}: {
    value: string
    title: string
    content: string
}) => (
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



const FAQ_REUSE = ({
    title,
    items,
    defaultOpenItems = [],
    className = '',
}: FAQProps) => {
    return (
        <section
            className={`bg-secondary-alice_blue min-h-[60vh] flex flex-col justify-center items-center py-12 ${className}`}
        >
            <div className="container py-12 mx-auto w-full h-full max-w-4xl">
                <SectionTitle
                    title={title}
                    titleStyle={{
                        fontSize: '28px',
                        lineHeight: '28px',
                        fontWeight: 700,
                        letterSpacing: '-0.36px', 
                        textAlign: 'center',
                        color: '#111111', 
                        marginBottom: '8px',
                        fontFamily: 'Red Hat Display',
                    }}
                    />


                <div className="w-[90%] flex justify-center items-center mx-auto mt-6">
                    <AccordionWrapper>
                        <Accordion defaultValue={defaultOpenItems}>
                            {items.map((item) => (
                                <AccordionItemComponent
                                    key={item.value}
                                    value={item.value}
                                    title={item.title}
                                    content={item.content}
                                />
                            ))}
                        </Accordion>
                    </AccordionWrapper>
                </div>
            </div>
        </section>
    )
}

export default FAQ_REUSE
