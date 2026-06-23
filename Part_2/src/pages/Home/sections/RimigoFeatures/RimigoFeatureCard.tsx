import RimigoPhoneFeature1 from './Images/RimigoFeature1'

type RimigoFeatureCardProps = {
  title?: React.ReactNode
  description?: string
  image?: React.ReactNode
}

// Helper function to highlight specific words in purple
export const highlightWords = (text: string, wordsToHighlight: string[]): React.ReactNode => {
  const parts = text.split(new RegExp(`(${wordsToHighlight.join('|')})`, 'gi'))
  return (
    <>
      {parts.map((part, index) => {
        const isHighlighted = wordsToHighlight.some(
          word => part.toLowerCase() === word.toLowerCase()
        )
        return isHighlighted ? (
          <span key={index} className="text-[#7011F6]">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      })}
    </>
  )
}

const RimigoFeatureCard = ({ title, image }: RimigoFeatureCardProps) => {
  return (
    <div className="flex flex-col items-center text-center bg-white shadow-[0px_2px_8px_#e0e0e0] py-8 px-4 rounded-[24px]">
      {title && (
        <div className="mb-6 max-w-md">
          <h2 className="text-2xl md:text-3xl font-semibold text-grey-0 mb-2 font-red-hat-display">
            {title}
          </h2>
        </div>
      )}
      {image ?? <RimigoPhoneFeature1 />}
    </div>
  )
}

export default RimigoFeatureCard
