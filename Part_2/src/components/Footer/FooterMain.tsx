import { STATIC_TEXT } from '@/constants'
import { Facebook, Instagram, Linkedin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const FooterMain = () => {
  const location = useLocation()
  const [screenWidth, setScreenWidth] = useState(1024)

  const isHome = location.pathname === '/'


  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <footer className={`bg-black text-white ${isHome ? 'mb-10 md:mb-0' : ''}`}>
      <div className="w-[90%] mx-auto py-12">

        {/* Top Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Navigation */}
          <div>
            <h1 className="tracking-widest text-lg font-semibold mb-4">
              {STATIC_TEXT.FOOTER_NAVIGATION_HEADER_1}
            </h1>
            <ul className="space-y-2">
              {STATIC_TEXT.FOOTER_NAVIGATION_ITEMS_1.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-grey-3 text-white transition"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Traveller Navigation */}
          <div>
            <h1 className="tracking-widest text-lg font-semibold mb-4">
              {STATIC_TEXT.FOOTER_NAVIGATION_HEADER_3}
            </h1>
            <ul className="space-y-2">
              {STATIC_TEXT.FOOTER_NAVIGATION_ITEMS_3
                .filter((item) => item.label !== 'When to travel' && item.label !== 'Where to travel')
                .map((item) => (
                <li key={item.label}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-grey-3 text-white transition"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          {screenWidth > 768 && (
            <div>
              <h1 className="tracking-widest text-lg font-semibold mb-4">Contact</h1>
              <p>{STATIC_TEXT.FOOTER_COMPANY_NAME}</p>
              <p>{STATIC_TEXT.FOOTER_COMPANY_EMAIL}</p>
              <p className="mt-2">CIN: {STATIC_TEXT.CIN}</p>
              <p>GST: {STATIC_TEXT.GST}</p>
            </div>
          )}

          {/* Office */}
          {screenWidth > 768 && (
            <div>
              <h1 className="tracking-widest text-lg font-semibold mb-4">Office</h1>
              <p>{STATIC_TEXT.ADDRESS_LINE_1}</p>
              <p>{STATIC_TEXT.ADDRESS_LINE_2}</p>
              <p>{STATIC_TEXT.ADDRESS_LINE_3}</p>
              <p>{STATIC_TEXT.ADDRESS_LINE_4}</p>
            </div>
          )}
        </div>

        {/* Mobile Layout */}
        {screenWidth < 768 && (
          <div className="mt-10 space-y-6 border-t border-grey-1 pt-6">
            <div>
              <p>{STATIC_TEXT.FOOTER_COMPANY_NAME}</p>
              <p>{STATIC_TEXT.FOOTER_COMPANY_EMAIL}</p>
            </div>

            <div>
              <p>{STATIC_TEXT.ADDRESS_LINE_1}</p>
              <p>{STATIC_TEXT.ADDRESS_LINE_2}</p>
              <p>{STATIC_TEXT.ADDRESS_LINE_3}</p>
              <p>{STATIC_TEXT.ADDRESS_LINE_4}</p>
            </div>

            <div>
              <p>CIN: {STATIC_TEXT.CIN}</p>
              <p>GST: {STATIC_TEXT.GST}</p>
            </div>
          </div>
        )}

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-grey-1 flex flex-col md:flex-row md:justify-between md:items-center">
          <p className="text-white text-lg">
            © 2026 Rimigo by Viareel Travel Private Limited. All rights reserved.
          </p>

          <div className="flex gap-4 mt-4 md:mt-0">
            <a href={STATIC_TEXT.SOCIAL_MEDIA_LINKS.INSTAGRAM_LINK} target="_blank">
              <Instagram className="hover:text-grey-3 text-white" />
            </a>
            <a href={STATIC_TEXT.SOCIAL_MEDIA_LINKS.FACEBOOK_LINK} target="_blank">
              <Facebook className="hover:text-grey-3 text-white" />
            </a>
            <a href={STATIC_TEXT.SOCIAL_MEDIA_LINKS.LINKEDIN_LINK} target="_blank">
              <Linkedin className="hover:text-grey-3 text-white" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default FooterMain
