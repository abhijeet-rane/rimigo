import SectionStarHeading from "../components/SectionStarHeading"
import { features } from "../constants"

const WhatyouGet = () => {


  return (
    <section className="bg-primary-pale-purple py-16 flex flex-col items-center justify-center gap-10">
      {/* Heading */}
      <SectionStarHeading
        title="Travel like VIP every time"
        className="text-header-black"
      />

      {/* Content */}
      <div className="mx-auto px-10 lg:px-15">
        <div className="grid grid-cols-1 gap-10 md:gap-0 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((item, index) => (
            <div
              key={index}
              className={`
                mx-auto flex px-2 md:px-20 flex-col items-center text-center
                ${item.type === "stacked"
                  ? "order-first md:order-0"
                  : ""
                }
              `}
            >
              {/* Visual */}
              {item.type === "stacked" ? (
                <div className="mb-6 flex -space-x-8">
                  {item.images.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt="image"
                      className="h-16 w-16 rounded-full border-2 object-cover shadow-sm"
                    />
                  ))}
                </div>
              ) : (
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-primary-default-12">
                  <item.icon
                    className="h-12 w-12 text-primary-default"
                    strokeWidth={1.5}
                  />
                </div>
              )}

              {/* Title */}
              <h3 className="mb-2 text-[22px] font-semibold font-red-hat-display">
                {item.title}
              </h3>

              {/* Subtitle */}
              <p className="text-[16px] font-medium font-manrope text-grey-2 3xl:px-10 ">
                {item.subtitle}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

export default WhatyouGet
