import { LucideIcon } from "lucide-react"

type ColumnCompProps = {
  icon: LucideIcon
  title: string
}

const TitleWithBadge = ({ icon: Icon, title }: ColumnCompProps) => {
  return (
    <div className="flex items-center justify-start gap-2">
      <Icon className="h-5 w-5 text-header-black " />
      <span className="text-grey-0 font-semibold text-[14px] font-red-hat-display">
        {title}
      </span>
    </div>
  )
}

export default TitleWithBadge
