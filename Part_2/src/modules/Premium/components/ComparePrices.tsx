import ExclusiveCardBottom from "../shared/exclusiveCardBottom"
import ComparePricesWithPill from "./ComparepriceswithPill"


export const FloatingCardDetails = [
  {
    logoName: 'AGODA',
    price: '₹4,999',
    className: '-top-px left-4'
  },
  {
    logoName: 'MAKE_MY_TRIP',
    price: '₹7,499',
    className: 'top-4/10 left-1'
  },
  {
    logoName: 'BOOKING_COM',
    price: '₹5,499',
    className: 'top-16 -right-3'
  },
  {
    logoName: 'GOIBIBO',
    price: '₹6,999',
    className: "bottom-16 -right-3"
  },
  {
    logoName: 'EXPEDIA',
    price: '₹8,999',
    className: '-bottom-3 left-3/9 -translate-x-1/2 -translate-y-1/2'
  },
  
]


const ComparePrices = () => {
  return (
    <div className="w-full max-w-100 rounded-3xl border border-r-primary-default border-b-primary-default bg-white p-6 shadow-lg">
      <ComparePricesWithPill
        imageUrl="https://media.rimigo.com/1768214262255_compare_prices.webp"
        floatingCards={FloatingCardDetails}
      />

      <ExclusiveCardBottom
        title={
          <>
            Compare prices in{" "}
            <span className="text-purple-600 font-semibold italic">
              one
            </span>{" "}
            click
          </>
        }
        subtitle="Rimigo scans multiple platforms instantly to find the best price for you."
      />

    </div>
  )
}

export default ComparePrices
