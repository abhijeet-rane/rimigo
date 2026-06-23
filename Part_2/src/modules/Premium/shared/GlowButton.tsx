import React from "react"
import Button from "@/components/shared/Button"

type GlowButtonProps = {
  children: React.ReactNode
  onClick?: () => void
  href?: string

  /* Glow */
  showGlow?: boolean
  glowClassName?: string

  /* Styling */
  buttonClassName?: string
  className?: string
}

const GlowButton: React.FC<GlowButtonProps> = ({
  children,
  onClick,
  href,

  showGlow = true,
  glowClassName = `
    bg-linear-to-r from-primary-default to-primary-dark
    blur-xl opacity-50
    scale-110
  `,

  buttonClassName = `
    px-[1.5rem] py-[0.9rem] text-[1.3rem]
    md:px-[clamp(2.5rem,5vw,3.5rem)]
    md:py-[clamp(1.2rem,2vw,0.9rem)]
    md:text-[clamp(1.1rem,1.5vw,1.4rem)]
    font-semibold font-red-hat-display
    bg-linear-to-r! from-primary-default! to-primary-dark!
    text-white
    rounded-xl
  `,

  className = "",
}) => {
  return (
    <div
      className={`relative inline-block w-fit ${className}`}
      onClick={onClick}
    >
      {/* Glow */}
      {showGlow && (
        <div
          className={`
            absolute inset-0
            rounded-xl
            pointer-events-none
            -z-10
            ${glowClassName}
          `}
        />
      )}

      {/* Button */}
      <Button
        href={href}
        className={`relative z-10 cursor-pointer ${buttonClassName}`}
      >
        {children}
      </Button>
    </div>
  )
}

export default GlowButton
