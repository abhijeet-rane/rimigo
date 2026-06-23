import { POTRAIT_IMAGES } from '@/modules/Premium/constants'

const PORTRAIT_LIST = [
  POTRAIT_IMAGES.PORTRAIT_1,
  POTRAIT_IMAGES.PORTRAIT_2,
  POTRAIT_IMAGES.PORTRAIT_3,
]

const POSITIONS = [
  'w-16 md:w-14 h-16 md:h-14 md:mr-2',
  'w-18 md:w-16 h-18 md:h-16 mb-10 md:mb-20',
  'w-16 md:w-13 h-16 md:h-13 mt-5 md:mt-6',
]

const PortraitCluster = () => {
  return (
    <div className="flex items-center justify-center ml-20 opacity-80">
      {PORTRAIT_LIST.map((img, index) => (
        <img
          key={index}
          src={img}
          alt={`portrait-${index}`}
          className={`
            z-10 object-cover opacity-90 rounded-full
            border border-white
            drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]
            ${POSITIONS[index]}
          `}
        />
      ))}
    </div>
  )
}

export default PortraitCluster
