import { LOGO_COMPASS } from '@/constants/icons/svgFromCDN'

type LogoRimigoIconTextProps = {
  text: string
  className?: string
  logoClassName?: string
  textClassName?: string
}

const LogoRimigoIconText = ({
  text,
  className = '',
  logoClassName = '',
  textClassName = ''
}: LogoRimigoIconTextProps) => {
  return (
    <div className={`flex items-center justify-center gap-2 mt-13 md:mt-16 mb-1 md:mb-1 ${className}`}>
      <img
        src={LOGO_COMPASS}
        alt="logo"
        className={`w-[30px] h-[30px] md:w-7 md:h-7 object-contain rounded-full ${logoClassName}`}
      />
      <p className={`text-white font-red-hat-display font-medium text-3xl md:text-3xl ${textClassName}`}>
        {text}
      </p>
    </div>
  )
}

export default LogoRimigoIconText
