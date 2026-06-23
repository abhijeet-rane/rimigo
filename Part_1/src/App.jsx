import './App.css'
import Header from './components/Header/Header'
import HeroSection from './components/HeroSection/HeroSection'
import TripCardsSection from './components/TripCards/TripCards'
import { DESTINATIONS } from './data/destinations'

function App() {
  const destination = DESTINATIONS['bali']

  return (
    <>
      <Header />
      <HeroSection destination={destination} />
      <TripCardsSection />
    </>
  )
}

export default App
