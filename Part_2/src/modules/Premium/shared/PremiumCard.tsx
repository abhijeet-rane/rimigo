type PremiumCardProps = {
  title: string
  price: string
  duration: string
  note?: string
  ctaText: string
  onClick?: () => void
  disabled?: boolean
  isLoading?: boolean
}

const PremiumCard = ({
  title,
  price,
  duration,
  note,
  ctaText,
  onClick,
  disabled = false,
  isLoading = false,
}: PremiumCardProps) => {
  return (
    <div
      className="
        
        bg-grey-0
        rounded-2xl
        border-[2px] border-primary-light
        shadow-lg
        p-8
        text-start
      "
    >
      <h3 className="text-[20px] font-semibold font-red-hat-display text-primary-light">
        {title}
      </h3>

      <div className="flex flex-col items-start gap-1">
        <p className="text-[35px] font-medium font-red-hat-display text-white">
          {price}
        </p>

        <div className="flex items-center gap-2">
          <p className="text-[16px] text-white font-manrope font-semibold">
            {duration}
          </p>

          {note && (
            <p className="text-[14px] text-white font-manrope font-medium">
              {note}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`
          mt-6 w-full
          bg-primary-light text-white
          rounded-md
          px-5
          py-3
          text-[20px] font-bold
          font-red-hat-display
          transition-opacity
          ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}
        `}
      >
        {isLoading ? 'PROCESSING...' : ctaText}
      </button>
    </div>
  )
}

export default PremiumCard
