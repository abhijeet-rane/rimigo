import { ReactNode } from 'react'
interface LargeBentoCardProps {
  className?: string
  icon: string
  title: ReactNode   
  footer?: ReactNode
}

const LargeBentoCard = ({
  className = '',
  icon,
  title,
  footer
}: LargeBentoCardProps) => {
  return (
    <div
      className={`rounded-3xl p-6 md:p-8 text-white relative overflow-hidden ${className}`}
    >
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-natural-white-16 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

      {/* ── MOBILE: original vertical layout ── */}
      <div className="relative z-10 flex flex-col items-start md:hidden">
        <div className="w-14 h-14 bg-natural-white-16 rounded-2xl flex items-center justify-center mb-6">
          <img src={icon} alt="Icon" />
        </div>

        <h3 className="text-2xl font-red-hat-display font-medium mb-3">
          {title}
        </h3>

        {footer && <div className="mt-8">{footer}</div>}
      </div>

      {/* ── DESKTOP: horizontal row layout ── */}
      <div className="relative z-10 hidden md:flex items-center gap-8">
        <div className="flex flex-col flex-1 min-w-0">
        <span className="text-4xl md:text-5xl font-red-hat-display font-bold mb-2">
          {title} {/* ₹17L+ */}
        </span>
      </div>

        {/* Divider */}
        <div className="w-px h-12 bg-natural-white-16 shrink-0" />

        {/* Icon at the end */}
        <div className="w-14 h-14  rounded-2xl flex items-center justify-center shrink-0">
          <img src={icon} alt="Icon" />
        </div>
      </div>
    </div>
  )
}

export default LargeBentoCard
