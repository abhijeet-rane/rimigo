import { TravellerBgImage } from "../types/TravllerSaved"

type TravllerSavedBgProps = {
  images: TravellerBgImage[]
}

const TravllerSavedBg = ({ images }: TravllerSavedBgProps) => {
  return (
    <div>
      {images.map((img, index) => (
        <div
          key={index}
          className={`absolute ${img.className} overflow-hidden rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.25)] shadow-primary-default/20`}
        >
          <img
            src={img.src}
            alt="Background img"
            className="h-full w-full object-cover opacity-50"
          />

          {/* Glow */}
          <div className="absolute inset-0 rounded-2xl bg-primary-default/20 blur-xl" />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-primary-default/5 to-transparent" />
        </div>
      ))}
    </div>
  )
}

export default TravllerSavedBg
