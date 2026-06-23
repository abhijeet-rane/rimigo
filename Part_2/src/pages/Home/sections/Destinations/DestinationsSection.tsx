import LargeBentoCard from '@/components/LargeBentoCard'
import DestinationBentoCard from '@/components/DestinationBentoCard'
import { DISCOUNT_THIINGS } from '@/constants/thiingsIcons'
import { getBentoCards, LargeBentoText } from './BentoCards'

const DestinationsSection = () => {

  const bentoCards = getBentoCards()

  return (
    <section className="py-24 bg-grey-4/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          
          {/* Large banner card */}
          <LargeBentoCard
            className="col-span-12 bg-gradient-to-r from-primary-default to-primary-dark"
            icon={DISCOUNT_THIINGS}
            title={
              <div className='flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5'>
                <div className='flex flex-col items-start justify-center gap-2'>
                    <span className="text-[25px] font-bold md:text-[40px]">{LargeBentoText.number}</span>{" "}
                    <p className='block md:hidden text-[18px] font-medium font-red-hat-display md:text-[22px]'>{LargeBentoText.heading}</p>
                </div>
                <div className='flex flex-col items-start justify-center md:gap-3'>
                  <p className='hidden md:block text-[20px] font-semibold font-red-hat-display md:text-[22px]'>{LargeBentoText.heading}</p>
                  <p className='text-[16px] font-normal font-manrope md:text-[18px]'>{LargeBentoText.description}</p>
                </div>
              </div>
            }
          />

          {/* Bento cards */}
          {bentoCards.map((card) => (
            <DestinationBentoCard
              key={card.id}
              cardId={card.id}
              className={card.className}
              titleNumber={card.titleNumber}
              titleText={card.titleText}
              description={card.description}
              images={card.images}
            />
          ))}

        </div>
      </div>
    </section>
  )
}

export default DestinationsSection