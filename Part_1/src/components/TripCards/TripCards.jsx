import img1 from '../../assets/tripboard/1.png'
import img2 from '../../assets/tripboard/2.png'
import img3 from '../../assets/tripboard/3.png'
import img4 from '../../assets/tripboard/4.png'
import img5 from '../../assets/tripboard/5.png'
import img6 from '../../assets/tripboard/6.png'
import './TripCards.css'
import correctIcon from '../../assets/correct.png'
import starIcon from '../../assets/star.png'

function CheckIcon() {
  return (
    <span className="check-icon" aria-hidden="true" />
  )
}

function FeatureTag({ label }) {
  return (
    <div className="feature-tag">
      <div className="feature-tag__inner">
        <CheckIcon />
        <span className="feature-tag__label">{label}</span>
      </div>
    </div>
  )
}

function ImageStack({ variant = 'default', srcs }) {
  return (
    <div className="image-stack">
      {srcs ? (
        <>
          <img
            src={srcs[0]}
            alt=""
            className="image-stack__img image-stack__img--1"
          />
          <img
            src={srcs[1]}
            alt=""
            className="image-stack__img image-stack__img--2"
          />
          <img
            src={srcs[2]}
            alt=""
            className="image-stack__img image-stack__img--3"
          />
        </>
      ) : (
        <>
          <div className={`image-stack__img image-stack__img--1 image-stack__img--1-${variant}`} />
          <div className={`image-stack__img image-stack__img--2 image-stack__img--2-${variant}`} />
          <div className={`image-stack__img image-stack__img--3 image-stack__img--3-${variant}`} />
        </>
      )}
    </div>
  )
}

function TripBadge({ type, label }) {
  const iconSrc = type === 'recommended' ? correctIcon : starIcon
  return (
    <div className="trip-badge" aria-label={label}>
      <img src={iconSrc} alt="" className="trip-badge__icon-img" />
      <span className="trip-badge__label">{label}</span>
    </div>
  )
}

function RouteStop({ label, position, filled }) {
  return (
    <div className={`route-stop route-stop--${position}`}>
      <span
        className={`route-stop__dot${filled ? ' route-stop__dot--filled' : ''}`}
        aria-hidden="true"
      />
      <span className="route-stop__label">{label}</span>
    </div>
  )
}

function RouteMap({ stops }) {
  return (
    <div className="route-map" aria-label="Trip route">
      <div className="route-map__line" aria-hidden="true" />
      {stops.map((stop, i) => (
        <RouteStop
          key={stop.city}
          label={stop.city}
          position={i % 2 === 0 ? 'top' : 'bottom'}
          filled={i === 0}
        />
      ))}
    </div>
  )
}

function PricingBadge({ label, variant }) {
  return (
    <div className={`pricing-badge pricing-badge--${variant}`}>
      <span className="pricing-badge__label">{label}</span>
    </div>
  )
}

function TripCard({ trip }) {
  const { badge, title, features, route, pricing, imageVariant, srcs } = trip

  return (
    <article className="trip-card" aria-label={title}>
      <div className="trip-card__inner">
        <div className="trip-card__top">
          <ImageStack variant={imageVariant} srcs={srcs} />
          <TripBadge type={badge.type} label={badge.label} />
        </div>

        <div className="trip-card__content">
          <h3 className="trip-card__title">{title}</h3>

          <div className="trip-card__features" aria-label="Trip highlights">
            {features.map((f) => (
              <FeatureTag key={f} label={f} />
            ))}
          </div>

          <RouteMap stops={route} />

          <div className="trip-card__bottom">
            <div className="trip-card__pricing">
              <PricingBadge label={pricing.badge} variant={pricing.variant} />
              <span className="trip-card__estimate">{pricing.estimate}</span>
            </div>
            <button type="button" className="btn-view-trip" id={`btn-view-${trip.id}`}>
              View Tripboard
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function CreateTripCard() {
  return (
    <article className="trip-card trip-card--create" aria-label="Create your own trip from scratch">
      <div className="trip-card__inner trip-card__inner--create">
        <ImageStack srcs={[img1, img2, img3]} />
        <p className="create-trip__label">
          Create your own trip<br />from scratch
        </p>
        <button
          type="button"
          className="create-trip__btn"
          id="btn-create-trip"
          aria-label="Create a new trip from scratch"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </article>
  )
}

const TRIPS = [
  {
    id: 'italy',
    imageVariant: 'italy',
    srcs: [img4, img5, img6],
    badge: { type: 'recommended', label: 'Recommended' },
    title: '7-day cultural immersion in Italy',
    features: [
      'Boutique family-run inns',
      '15 activities',
      'Historical charm',
      'Gluten-free options',
    ],
    route: [
      { city: 'Rome' },
      { city: 'Florence' },
      { city: 'Venice' },
      { city: '+2 more' },
    ],
    pricing: {
      badge: '₹₹ · Mid-range',
      variant: 'blue',
      estimate: '~1L per head (excl. flight)',
    },
  },
  {
    id: 'costa-rica',
    imageVariant: 'costa-rica',
    srcs: [img4, img5, img6],
    badge: { type: 'top-pick', label: 'Top Pick' },
    title: '5-day adventure through Costa Rica',
    features: [
      'Eco-friendly hostels',
      '10 activities',
      'Nature & wildlife',
      'Vegetarian-friendly',
    ],
    route: [
      { city: 'San José' },
      { city: 'Monteverde' },
      { city: 'Tamarindo' },
      { city: '+1 more' },
    ],
    pricing: {
      badge: '₹ · Economy',
      variant: 'green',
      estimate: '~1L per head (excl. flight)',
    },
  },
]

function TripCardsSection() {
  return (
    <section className="trip-cards-section" aria-labelledby="trip-cards-title">
      <div className="trip-cards-scroll">
        <div className="trip-cards-row">
          <CreateTripCard />
          {TRIPS.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default TripCardsSection
