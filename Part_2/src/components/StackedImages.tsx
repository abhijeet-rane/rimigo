interface ImageStackProps {
  images: string[]
  variant: 'itineraries' | 'group-planning' | 'support' | 'destinations'
}

const StackedImages = ({ images, variant }: ImageStackProps) => {
  if (!images.length) return null

  switch (variant) {
    case 'itineraries':
      return (
        <div className="flex items-center">
          <div className="relative flex items-center">
            <img src={images[0]} alt="traveler" className="w-20 h-full object-cover border-2 border-white relative z-10" />
            <img src={images[1] || images[0]} alt="traveler" className="w-20 h-full object-cover border-2 border-white relative z-20 -ml-10 mt-8" />
            <img src={images[2] || images[0]} alt="traveler" className="w-20 h-full object-cover border-2 border-white relative z-10 -ml-8 -mt-8" />
          </div>
        </div>
      )

    case 'group-planning':
    case 'support':
      return (
        <div className="flex items-center">
          <div className="relative flex items-start">
            <div className="relative flex items-center">
              <img src={images[0]} alt="item" className="w-15 h-15 rounded-full object-cover border-[2px] border-white relative z-40" />
              <img src={images[1] || images[0]} alt="item" className="w-15 h-15 rounded-full object-cover border-[2px] border-white relative z-30 -ml-3" />
            </div>
            <div className="relative flex items-center -ml-27 mt-10">
              <img src={images[2] || images[0]} alt="item" className="w-15 h-15 rounded-full object-cover border-[2px] border-white relative z-20" />
              <img src={images[3] || images[0]} alt="item" className="w-15 h-15 rounded-full object-cover border-[2px] border-white relative z-10 -ml-3" />
            </div>
          </div>
        </div>
      )

    case 'destinations':
      return (
        <div className="flex items-center md:mt-3">
          <div className="relative flex items-center">
            <img src={images[0]} alt="flag" className="w-24 h-24 rounded-full object-cover border-2 border-white relative z-20" />
            <img src={images[1] || images[0]} alt="flag" className="w-24 h-24 rounded-full object-cover border-2 border-white relative z-10 -ml-15 mt-[-40px]" />
          </div>
        </div>
      )

    default:
      return null
  }
}

export default StackedImages