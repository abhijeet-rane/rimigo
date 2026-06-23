import { useMemo } from 'react'
import { normalizePlatform } from '@/pages/Stays/Utils/platformUtils' 

type BaseItem = {
  platform: string
  price: number
}

type Options = {
  isPremium?: boolean
  priorityPlatforms?: ('agoda' | 'trip')[]
  limit?: number
}

export const usePlatformPricing = <T extends BaseItem>(
  items: T[],
  options: Options = {}
) => {
  const { isPremium = false, priorityPlatforms = [], limit } = options

  return useMemo(() => {
    const normalized = items.map((item) => {
      const flags = normalizePlatform(item.platform)
      return { ...item, ...flags }
    })

    const hasPriorityPlatform = normalized.some(
      (i) => i.is_agoda || i.is_trip
    )

    const premiumFiltered =
      isPremium && hasPriorityPlatform
        ? normalized.filter((i) => i.is_agoda || i.is_trip)
        : normalized

    const pricedItems = premiumFiltered.filter((i) => i.price > 0)
    const cheapestPrice =
      pricedItems.length > 0
        ? Math.min(...pricedItems.map((i) => i.price))
        : null

    const withCheapestFlag = premiumFiltered.map((i) => ({
      ...i,
      is_cheapest: cheapestPrice !== null && i.price === cheapestPrice
    }))

    const sorted =
      priorityPlatforms.length > 0
        ? [
            ...withCheapestFlag.filter((i) => i.is_agoda),
            ...withCheapestFlag.filter((i) => i.is_trip),
            ...withCheapestFlag.filter((i) => !i.is_agoda && !i.is_trip)
          ]
        : withCheapestFlag

    const finalItems = limit ? sorted.slice(0, limit) : sorted

    return {
      items: finalItems,
      cheapestPrice,
      hasPriorityPlatform
    }
  }, [items, isPremium, priorityPlatforms, limit])
}
