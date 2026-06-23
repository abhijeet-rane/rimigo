type BlogCard = {
  image: string
  title: string
  subtitle: string
}

const blogCards: BlogCard[] = [
  {
    image: "https://media.rimigo.com/1768196375686_enhance_trip1.webp",
    title: "Personal trip manager",
    subtitle:
      "Your expert handles the complex planning so you do not have to.",
  },
  {
    image: "https://media.rimigo.com/1768196374831_enhance_trip2.webp",
    title: "On-trip assistance",
    subtitle:
      "Travel with confidence knowing your expert is monitoring your entire journey.",
  },
  {
    image: "https://media.rimigo.com/1768196375362_enhance_trip3.webp",
    title: "Assisted bookings support",
    subtitle:
      "Experts handle the tedious booking work so you can simply show up and enjoy",
  },
]


const BlogCardImage = ({ image, title }: Pick<BlogCard, "image" | "title">) => {
  return (
    <div className="mt-6 md:w-full md:max-w-80 max-w-full">
      <div className="aspect-square rounded-md border border-gray-200 flex items-center justify-center bg-white">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-contain p-3"
        />
      </div>
    </div>
  )
}



const BlogCardContent = ({
  title,
  subtitle,
}: Pick<BlogCard, "title" | "subtitle">) => {
  return (
    <div className="px-3 py-6 flex flex-col items-start text-left">
      <h3 className="mb-2 font-semibold text-grey-0 font-red-hat-display text-[20px]">
        {title}
      </h3>

      <p className="leading-relaxed text-grey-2 font-manrope font-medium text-[16px]">
        {subtitle}
      </p>
    </div>
  )
}


const EnhanceContent = () => {
  return (
    <section className="body-font text-gray-600">
      <div className="mx-auto md:px-23 py-12">
        <div className="flex flex-wrap -m-4 items-start justify-center">
          {blogCards.map((card, index) => (
            <div
              key={index}
              className="px-4 pt-2 w-full sm:w-1/2 md:w-1/3 flex justify-center"
            >
              <div className="rounded-lg bg-white overflow-hidden flex flex-col max-w-[320px] md:max-w-97.5 w-full">
                <BlogCardImage image={card.image} title={card.title} />
                <BlogCardContent
                  title={card.title}
                  subtitle={card.subtitle}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default EnhanceContent
