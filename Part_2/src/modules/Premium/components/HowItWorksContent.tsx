type CardProps = {
    index: number;
    title: string;
    subtitle: string;
};

const Card = ({ index, title, subtitle }: CardProps) => {
    return (
        <div className="p-1 sm:p-2 md:p-4 w-full sm:w-1/2 md:w-1/3 lg:w-1/4 flex justify-center md:justify-start">
            <div className="flex flex-col items-center md:items-start rounded-lg h-full p-4 sm:p-6 md:p-8 max-w-xs text-center md:text-left md:ml-10 sm:ml-2">
                <span className="text-[36px] sm:text-[38px] md:text-[40px] font-[550] font-red-hat-display text-primary-default mb-2 sm:mb-3">
                    {index}
                </span>
                <h2 className="text-gray-900 mb-1 sm:mb-2 text-[19px] sm:text-[17px] md:text-[18px] font-[550] font-red-hat-display">
                    {title}
                </h2>
                <p className="text-gray-400 font-manrope font-medium text-[16px] sm:text-[15px] md:text-[16px]">
                    {subtitle}
                </p>
            </div>
        </div>
    );
};

type CardSectionProps = {
    cards: { index: number; title: string; subtitle: string }[];
};

const CardSection = ({ cards }: CardSectionProps) => {
    return (
        <section className="text-gray-600 body-font">
            <div className="px-4 sm:px-8 md:px-32 mx-auto">
                <div className="flex flex-wrap justify-center md:justify-start -m-1 sm:-m-2 md:-m-4">
                    {cards.map((card) => (
                        <Card
                            key={card.index}
                            index={card.index}
                            title={card.title}
                            subtitle={card.subtitle}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

const cardsData = [
    {
        index: 1,
        title: "Pay 5000/-",
        subtitle:
            "Subscribe to Rimigo premium plan to unlock dedicated expert assistance.",
    },
    {
        index: 2,
        title: "Expert assigned",
        subtitle: "Get paired with a travel professional who learns your unique travel style.",
    },
    {
        index: 3,
        title: "Review your plan",
        subtitle: "Your expert builds your custom itinerary and guides you through every booking step.",
    },
    {
        index: 4,
        title: "Travel stress-free",
        subtitle: "Enjoy your vacation knowing your expert is available to support you in real-time.",
    },
];

export default function HowItWorksContent() {
    return <CardSection cards={cardsData} />;
}
