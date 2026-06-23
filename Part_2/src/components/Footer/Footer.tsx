import FooterStats from "./FooterStats" 
import FooterMain from "./FooterMain" 
import { GradientDivider } from "@/modules/Premium/components/GradientDivider"

const Footer = () => {
  return (
    <>
    <GradientDivider className="scale-x-200" />
      <FooterStats />
      <FooterMain />
    </>
  )
}

export default Footer
