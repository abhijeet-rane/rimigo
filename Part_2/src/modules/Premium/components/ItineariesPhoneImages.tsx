import { phoneOverlayImages } from "../types/ItineariesPhoneImages" 

const ItineariesPhoneImages = () => {
  return (
    <div className="relative flex justify-center items-center">
      {/* Back phones */}
      <div className="absolute h-94.75 w-63.75 rounded-2xl border border-grey-0 -rotate-6 -translate-x-2 z-10 opacity-[0.1]" />
      <div className="absolute h-97.25 w-63.75 rounded-2xl border border-grey-0 rotate-6 translate-x-2 z-20 bg-white opacity-[0.1]" />

      {/* Main phone */}
      <div className="relative h-97.25 w-63.75 rounded-2xl z-30">
        <img
          // src="https://media.rimigo.com/1768197418952_Unlimited_itineraries_main.webp"
          src="https://media.rimigo.com/1772460227771_itinerary_img.png"
          alt="Unlimited itineraries preview"
          className="h-full w-full object-cover rounded-2xl"
        />

        {/* Floating image cards */}
        {phoneOverlayImages.map((img) => (
          <div
            key={img.src}
            className={`absolute ${img.className} rounded-xl overflow-hidden z-40`}
          >
            <img
              src={img.src}
              alt={img.alt}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default ItineariesPhoneImages
