import indonesiaLow from '../../assets/indonesiaLow.svg'
import './DestinationMap.css'

function IndonesiaMap() {
  return (
    <div className="destination-map__inner">
      <img
        src={indonesiaLow}
        alt="Map of Indonesia"
        className="destination-map__real-svg"
        draggable="false"
      />
    </div>
  )
}

const MAP_COMPONENTS = {
  indonesia: IndonesiaMap,
}

function DestinationMap({ destination }) {
  const MapComponent = MAP_COMPONENTS[destination] ?? IndonesiaMap

  return (
    <div className="destination-map">
      <MapComponent />
    </div>
  )
}

export default DestinationMap
