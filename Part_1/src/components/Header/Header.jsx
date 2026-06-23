import logoSrc from '../../assets/logo/logo_transparent_white.png'
import './Header.css'

function Header() {
  return (
    <header className="header" role="banner">
      <a href="/" className="header__logo" aria-label="Rimigo home">
        <img
          src={logoSrc}
          alt="Rimigo"
          className="header__logo-img"
          width={128}
          height={40}
        />
      </a>

      <nav className="header__actions" aria-label="Primary navigation">
        <button
          id="btn-login"
          type="button"
          className="btn btn--outline"
          aria-label="Log in to your account"
        >
          Log In
        </button>
        <button
          id="btn-plan"
          type="button"
          className="btn btn--primary"
          aria-label="Plan my trip"
        >
          Plan my trip
        </button>
      </nav>
    </header>
  )
}

export default Header
