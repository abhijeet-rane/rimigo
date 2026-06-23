import React from "react"
import LogoWithBadge from "../components/LogoWithBadge" 
import { GradientLoading } from "@/utils/SvgUtils"

type HeroBackgroundProps = {
  /** Enable / disable ALL gradients */
  showGradient?: boolean

  /** Top gradient image */
  topGradientSrc?: string
  topHeightClass?: string

  /** Side image */
  sideImageSrc?: string
  sideHeightClass?: string
  sideWidthClass?: string
  sideTopClass?: string
  leftOffsetClass?: string
  rightOffsetClass?: string

  /** Fade config */
  fadeColor?: string
  fadeStrength?: string

  /** Logo */
  logoSrc?: string
  badgeText?: string
  logoClassName?: string
}

const HeroBackground: React.FC<HeroBackgroundProps> = ({
  showGradient = true,

  topGradientSrc = "/rimigo ai/gradient_desktop.png",
  topHeightClass = "h-[30%]",

  sideImageSrc,
  sideHeightClass = "h-[60vh]",
  sideWidthClass = "w-xl",
  sideTopClass = "top-2/9",
  leftOffsetClass = "-left-75",
  rightOffsetClass = "-right-75",

  fadeColor = "white",
  fadeStrength = "70%",

  logoSrc,
  badgeText,
  logoClassName = "mt-[28%] md:mt-[6%]",
}) => {
  return (
    <>
      {/* TOP GRADIENT IMAGE */}
      {topGradientSrc && showGradient && (
        <GradientLoading
          className={`block absolute -top-14 md:-top-3 left-0 w-full ${topHeightClass} pointer-events-none z-0 scale-x-100 md:scale-x-300`}
        />
      )}

      {/* SIDE IMAGES */}
      {sideImageSrc && (
        <>
          {/* LEFT SIDE */}
          <div
            className={`
              hidden md:block absolute
              ${sideTopClass} ${leftOffsetClass}
              ${sideHeightClass} ${sideWidthClass}
              bg-no-repeat bg-right bg-cover
              pointer-events-none z-0
            `}
            style={{
              backgroundImage: showGradient
                ? `
                  linear-gradient(
                    to left,
                    ${fadeColor} 0%,
                    rgba(255,255,255,0) ${fadeStrength}
                  ),
                  url(${sideImageSrc})
                `
                : `url(${sideImageSrc})`,
            }}
          />

          {/* RIGHT SIDE */}
          <div
            className={`
              hidden md:block absolute
              ${sideTopClass} ${rightOffsetClass}
              ${sideHeightClass} ${sideWidthClass}
              bg-no-repeat bg-left bg-cover
              pointer-events-none z-0
            `}
            style={{
              backgroundImage: showGradient
                ? `
                  linear-gradient(
                    to right,
                    ${fadeColor} 0%,
                    rgba(255,255,255,0) ${fadeStrength}
                  ),
                  url(${sideImageSrc})
                `
                : `url(${sideImageSrc})`,
            }}
          />
        </>
      )}

      {/* LOGO */}
      {logoSrc && (
        <LogoWithBadge
          logoSrc={logoSrc}
          badgeText={badgeText}
          className={logoClassName}
        />
      )}
    </>
  )
}

export default HeroBackground
