import { StatItem } from '../sections/NumberWeProud'

type StatsGridProps = {
  stats: StatItem[]
}

const StatsGrid = ({ stats }: StatsGridProps) => {
  const count = stats.length
  const isFour = count === 4
  const isThree = count === 3
  return (
      <div
        className={`
          grid text-center w-full
          ${isFour ? 'grid-cols-2 lg:grid-cols-4' : ''}
          ${isThree ? 'gap-x-2' : ''}
        `}
        style={
          !isFour ? { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` } : undefined
        }
      >
      {stats.map((item, index) => {
        const isLast = index === count - 1
        const col = index % (isFour ? 2 : count)
        const isLastCol = col === (isFour ? 2 : count) - 1

        return (
          <div
            key={index}
            className="relative flex md:flex-row flex-col items-center justify-center gap-2 py-6 px-4 md:px-20"
          >
            {/* Mobile separator: only between columns in the same row */}
            {!isLastCol && !isLast && (
              <span className=" md:hidden block absolute right-0 top-1/2 -translate-y-1/2 h-10 w-[1px] bg-grey-3" />
            )}
            {/* Desktop separator: between all items except last */}
            {!isLast && (
              <span className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 h-8 w-[1px] bg-grey-3" />
            )}

            {item.icon && (
              <div className="flex justify-center items-center text-primary-default-8">
                {item.icon}
              </div>
            )}
            <div className="flex flex-col items-center justify-center">
              <h2 className="text-2xl sm:text-4xl text-grey-0-80 font-red-hat-display font-[550]">
                {item.value}
              </h2>
              <p className={`leading-relaxed font-manrope text-[14px] font-medium text-grey-2 ${item.labelClassname}`}>
                {item.label}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StatsGrid