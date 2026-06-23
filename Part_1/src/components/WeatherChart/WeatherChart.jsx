import './WeatherChart.css'

function WeatherBar({ month, temp, emoji, height, variant = 'teal', isActive = false }) {
  const barClass = [
    'weather-bar__bar',
    `weather-bar__bar--${variant}`,
    isActive ? 'weather-bar__bar--active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const columnClass = [
    'weather-bar',
    isActive ? 'weather-bar--active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={columnClass} role="listitem">
      <span className="weather-bar__emoji" aria-hidden="true">
        {emoji}
      </span>
      <div
        className={barClass}
        style={{ height: `${height}px` }}
        aria-label={`${month}: ${temp}`}
      >
        <span className="weather-bar__temp">{temp}</span>
      </div>
      <span className="weather-bar__month" aria-hidden="true">
        {month}
      </span>
    </div>
  )
}

function WeatherChart({ months }) {
  return (
    <section className="weather-chart" aria-labelledby="weather-chart-heading">
      <h2 className="weather-chart__heading" id="weather-chart-heading">
        Best months to visit
      </h2>
      <div className="weather-chart__bars-scroll">
        <div className="weather-chart__bars" role="list" aria-label="Monthly weather data">
          {months.map((month) => (
            <WeatherBar key={`${month.month}-${month.temp}`} {...month} />
          ))}
        </div>
      </div>
    </section>
  )
}

export { WeatherBar }
export default WeatherChart
