const EIFFEL_IMAGE = 'https://media.rimigo.com/images/1761750275_aba4e55f-4878-4cb0-96a4-b014fc5b4b1c.jpg'
const COLOSSEUM_IMAGE = 'https://media.rimigo.com/images/1761751238_cd3ee123-e838-48ba-bae0-e050092c6bed.jpg'
const TOWER_BRIDGE_IMAGE = 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300&q=80'
const CASTLE_IMAGE = 'https://media.rimigo.com/images/1761757517_8460bfd9-6872-4ddf-a891-f21e9e879d37.jpg'

const EyesIcon = () => (
  <svg width="18" height="12" viewBox="0 0 24 16" fill="currentColor" className="shrink-0 text-gray-700">
    <ellipse cx="8" cy="8" rx="3" ry="4" />
    <ellipse cx="16" cy="8" rx="3" ry="4" />
  </svg>
)

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const DestinationCard = ({
  image,
  alt,
  className = '',
}: {
  image: string
  alt: string
  className?: string
}) => (
  <div
    className={`absolute h-1/2 w-[60%] md:w-[58%] overflow-hidden rounded-xl border border-white shadow-[0px_4px_20px_rgba(0,0,0,0.12)] ${className}`}
  >
    <img src={image} alt={alt} className="h-full w-full object-cover" />
  </div>
)

const RimigoFeature4 = () => {
  return (
    <div className="relative flex w-full items-center justify-center overflow-visible">
      <div className="relative aspect-square w-full max-w-[280px] md:max-w-[320px]">
        {/* Row 1 - Left: Eiffel Tower (behind), anticlockwise, slightly lower */}
        <DestinationCard
          image={EIFFEL_IMAGE}
          alt="Eiffel Tower"
          className="left-0 top-0 z-10 translate-y-2 -rotate-3"
        />
        {/* Row 1 - Right: Colosseum (over left), clockwise, below 4th card */}
        <DestinationCard
          image={COLOSSEUM_IMAGE}
          alt="Colosseum"
          className="left-[45%] top-0 z-20 translate-y-8 rotate-3"
        />
        {/* Row 2 - Left: Tower Bridge (over 2nd card row 1, below 4th card), anticlockwise */}
        <DestinationCard
          image={TOWER_BRIDGE_IMAGE}
          alt="Tower Bridge"
          className="left-0 top-1/2 z-[25] -translate-y-3 -rotate-3"
        />
        {/* Row 2 - Right: Castle (over all cards), clockwise, slightly lower */}
        <DestinationCard
          image={CASTLE_IMAGE}
          alt="Castle"
          className="left-[45%] top-1/2 z-30 translate-y-2 rotate-3"
        />

        {/* Must see button - center of top of 1st card, white bg, same rotation as 1st card */}
        <div className="absolute top-[-4%] left-[29%] z-40 flex w-fit -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-[0px_2px_16px_rgba(0,0,0,0.12)] -rotate-3">
          <EyesIcon />
          <span className="font-red-hat-display">Must see</span>
        </div>

        {/* Add to trip button - center of bottom of 4th card, same rotation */}
        <div className="absolute bottom-[-8%] left-[74%] z-40 flex w-fit -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-[8px] bg-[#7011F6] px-3 py-2 text-sm font-semibold text-white shadow-[0px_2px_16px_#ab72fb] rotate-3">
          <PlusIcon />
          <span className="font-red-hat-display">Add to trip</span>
        </div>
      </div>
    </div>
  )
}

export default RimigoFeature4
