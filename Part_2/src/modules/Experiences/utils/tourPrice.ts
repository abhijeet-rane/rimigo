import { AdaptedTourResponseType } from "../types/toursResponseTypes" 

export const getSortablePrice = (
  tour: AdaptedTourResponseType
): number | null => {
  const price = tour?.price?.min_price

  return typeof price === 'number' && Number.isFinite(price)
    ? price
    : null
}
