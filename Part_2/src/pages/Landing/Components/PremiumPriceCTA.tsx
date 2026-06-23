import { ArrowRight } from 'lucide-react'

const PremiumPriceCTA = () => {
  return (
    <div className="relative w-full flex justify-center">
      <div className="px-2 md:px-8 py-2 w-full max-w-md md:max-w-none">
        <div className="flex flex-row items-center gap-4 md:gap-6 justify-center">

          <span className="text-white text-3xl md:text-4xl font-medium font-red-hat-display">
            ₹5,000
          </span>

          <button
            onClick={() => window.open('/premium', '_blank', 'noopener,noreferrer')}
            className="group w-auto md:w-auto px-5 md:px-6 py-3 bg-primary-light text-white font-bold font-red-hat-display rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:cursor-pointer "
          >
            PLAN FOR ME
            <ArrowRight className="transition-transform group-hover:translate-x-1" />
          </button>

        </div>
      </div>
    </div>
  )
}

export default PremiumPriceCTA
