import { ReactNode } from 'react'
import StackedImages from './StackedImages'

interface BentoCardProps {
  className?: string
  titleNumber: string
  titleText: string
  description: string
  children?: ReactNode
  cardId?: string
  images?: string[]
}

const DestinationBentoCard = ({
  className = '',
  titleNumber,
  titleText,
  description,
  children,
  cardId,
  images = []
}: BentoCardProps) => {

  return (
    <div
      className={`rounded-3xl relative overflow-hidden pt-10 ${className}`}
    >
      <div className="relative z-10 flex flex-col justify-between items-start h-full gap-3 md:gap-5">
            {/* Render custom image stack if images provided and cardId matches */}
            {images.length > 0
              ? <StackedImages images={images} variant={cardId as 'itineraries' | 'group-planning' | 'support' | 'destinations'} />
              : children && <div className="mt-5">{children}</div>
            }

          <div className=''>

                <h3 className="text-[18px] md:text-[18px] font-red-hat-display text-careers-dark font-medium mb-2">
                  <span className="text-[26px] md:text-[40px] block font-bold md:font-semibold">{titleNumber}</span>{" "}
                  {titleText}
                </h3>

                <p className="text-[14px] md:text-[16px] font-manrope font-medium text-grey-2">
                  {description}
                </p>

          </div>
      </div>
    </div>
  )
}

export default DestinationBentoCard