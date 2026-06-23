import { THREESTAR_PRIMARY_LIGHT } from '@/constants/icons/svgFromCDN'

const PremiumHeading = () => {
  return (
    <div className="text-center flex flex-col gap-5 sm:flex-col items-center justify-center md:gap-2 px-7 md:pt-5">
      <p className="text-3xl md:text-[48px] font-normal text-white font-red-hat-display tracking-[-4%]">
        {/* Want your trip planned <br className='block md:hidden' /> by experts?  */}
        Need help planning  <br className='block md:hidden' /> your trip?        
      </p>
      <div className='relative'>
        <p className="font-manrope font-medium text-[16px] md:text-[18px] tracking-[-4%] text-grey-4 text-center">
        {/* From research and planning to bookings - <br className='block md:hidden' /> everything handled for */}
        Get travel experts to plan, book, and support <br className='block md:hidden' /> everything handled for
          <span className="relative inline-block pl-1">
          finish.
            <img
              src={THREESTAR_PRIMARY_LIGHT}
              alt="threestar"
              className="absolute -top-2 -right-6 w-8 h-8"
            />
          </span>
        </p>

      </div>
    </div>
  )
}

export default PremiumHeading
