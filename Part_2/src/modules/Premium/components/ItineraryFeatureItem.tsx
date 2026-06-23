type ItineraryFeature = {
  title: string
  description: string
}

type ItineraryFeatureItemProps = {
  feature: ItineraryFeature
  isLast: boolean
}

const ItineraryFeatureItem = ({ feature, isLast }: ItineraryFeatureItemProps) => {
  return (
    <div className="flex flex-1 max-w-99 ">
      <div className="flex-1 py-4 md:pl-2 md:pr-6">
        <h3 className="mb-2 text-[20px] font-semibold text-header-black font-red-hat-display">
          {feature.title}
        </h3>
        <p className="text-grey-2 font-medium text-[16px] font-manrope pr-3">
          {feature.description}
        </p>

        {!isLast && (
          <div className="mt-6 h-px w-full bg-gray-200 md:hidden" />
        )}
      </div>

      {!isLast && (
        <div className="hidden md:block w-px bg-gray-200" />
      )}
    </div>
  )
}

export default ItineraryFeatureItem
