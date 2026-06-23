import { SWISS_SCENIC_VIEW } from "../constants"
import { FormSection } from "./FormSection"


const AreYouReady = () => {
    return (
        <section
            className="relative w-full h-[70vh] flex items-center justify-center"
            style={{
                backgroundImage: `url(${SWISS_SCENIC_VIEW})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            {/* Black gradient overlay */}
            <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/70 to-black/70" />

            {/* Content */}
            <div className=" z-10 text-center px-10 md:px-6  max-w-[100%] ">
                {/* <h2 className="text-white font-medium font-red-hat-display leading-tight mb-6 text-2xl md:text-4xl">
                    <span className="block md:hidden text-[32px]  text-center">
                        Your questions,<br />
                        answered.
                    </span>

                    <span className="hidden md:block text-center text-[48px]">
                        Don't you deserve more than just a basic vacation?
                    </span>
                </h2>


                <Button
                    title="BUY NOW"
                    onClick={onRequestCallback}
                    variant="outline"
                    size="default"
                    className="bg-white text-black hover:bg-gray-200 px-5 md:px-13 py-7 font-bold font-red-hat-display text-[20px]"
                >
                    REQUEST CALLBACK
                </Button> */}

            <FormSection />
                

                
            </div>
        </section>
    )
}

export default AreYouReady
