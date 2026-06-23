import './InfoCard.css'

function CalendarIcon() {
  return (
    <span className="calendar-icon" aria-hidden="true">
      <span className="calendar-icon__v1"></span>
      <span className="calendar-icon__v2"></span>
      <span className="calendar-icon__v3"></span>
      <span className="calendar-icon__v4"></span>
      <span className="calendar-icon__v5"></span>
      <span className="calendar-icon__v6"></span>
      <span className="calendar-icon__v7"></span>
      <span className="calendar-icon__v8"></span>
      <span className="calendar-icon__v9"></span>
      <span className="calendar-icon__v10"></span>
    </span>
  )
}

function VisaIcon() {
  return (
    <svg
      className="info-card__label-icon"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="3"
        width="12"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M3.5 7h3M3.5 9h2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle
        cx="10"
        cy="7.5"
        r="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  )
}

const ICON_MAP = {
  calendar: CalendarIcon,
  visa: VisaIcon,
}

function InfoCard({ label, value, icon = 'calendar' }) {
  const Icon = ICON_MAP[icon] ?? CalendarIcon

  return (
    <div className="info-card">
      <span className="info-card__label">
        {label}
        <Icon />
      </span>
      <span className="info-card__value">{value}</span>
    </div>
  )
}

function InfoCards({ cards }) {
  return (
    <div className="info-cards" aria-label="Destination information">
      {cards.map((card) => (
        <InfoCard key={card.label} {...card} />
      ))}
    </div>
  )
}

export { InfoCard, InfoCards }
export default InfoCards
