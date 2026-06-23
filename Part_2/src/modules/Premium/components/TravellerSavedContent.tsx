import { primary_circle } from "../constants"

const TravellerSavedContent = () =>{
    return (
        <div className="relative z-10 flex h-full items-center justify-center text-center text-white">
                <div className="max-w-md md:max-w-xl px-14 md:px-0">
                  <p className="text-4xl italic font-red-hat-display md:text-5xl">
                    <span className="relative inline-block">
                      {/* Circle Image */}
                      <img
                        src={primary_circle}
                        alt="Highlight circle"
                        className="absolute top-0 md:top-2 -left-4 md:left-1 w-40 h-10 md:w-65 md:h-12 scale-150 md:scale-140 pointer-events-none filter-none"
                      />
        
                      {/* Text with glow */}
                      <span className="relative z-10 text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.6)]">
                        99%
                      </span>
                    </span>{" "}
                    <span className="text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.6)]">
                      of travellers have saved money with us.
                    </span>
                  </p>
                </div>
              </div>
    )
}

export default  TravellerSavedContent