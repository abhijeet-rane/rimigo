import indonesiaFlag from '../../assets/indonesia.png'
import './HeroSection.css'
import InfoCards from '../InfoCard/InfoCard'
import WeatherChart from '../WeatherChart/WeatherChart'
import DestinationMap from '../DestinationMap/DestinationMap'

function HeroSection({ destination }) {
  const {
    tagline,
    name,
    mapKey,
    infoCards,
    weatherMonths,
  } = destination

  return (
    <main className="page">
      <div className="hero__map-mobile" aria-hidden="true">
        <DestinationMap destination={mapKey} />
      </div>

      <section className="hero" aria-labelledby="hero-destination-name">
        <div className="hero__content">
          <img
            src={indonesiaFlag}
            alt="Flag of Indonesia"
            className="hero__flag-img"
          />

          <span className="hero__tagline" aria-hidden="true">
            {tagline}
          </span>

          <h1 className="hero__destination" id="hero-destination-name">
            {name}
          </h1>

          <InfoCards cards={infoCards} />

          <div className="hero__weather hero__weather--mobile">
            <WeatherChart months={weatherMonths} />
          </div>
        </div>

        <div className="hero__map-col">
          <div className="hero__map">
            <DestinationMap destination={mapKey} />
          </div>
          <div className="hero__weather hero__weather--desktop">
            <WeatherChart months={weatherMonths} />
          </div>
        </div>
      </section>
    </main>
  )
}

export default HeroSection
