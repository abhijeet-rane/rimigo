import SectionTitle from "./Sectiontitle"

type SectionIntroProps = {
  title: string
  heading: string
  subtitle: string
}

export const SectionIntro = ({
  title,
  heading,
  subtitle,
}: SectionIntroProps) => {
  return (
    <div className="mx-auto flex justify-center items-center flex-col px-10 text-center lg:w-full gap-7">
      <SectionTitle title={title} className=" text-center" />
      <div className="flex justify-center items-center flex-col md:max-w-3xl gap-2">
        <h2 className=" font-medium font-red-hat-display text-[28px] md:text-[40px]  text-gray-900">
          {heading}
        </h2>

        <p className="text-[16px] md:text-[18px] font-manrope font-medium text-grey-2  ">
          {subtitle}
        </p>
      </div>
    </div>
  )
}
