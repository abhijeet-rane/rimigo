import React, { useState, useEffect } from 'react'
import { ChevronDown, Coffee } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import { PROVIDER_LOGOS, ProviderName } from '@/constants/providerLogos'
import DealsLabel from './DealsLabel'

// --- Currency formatter (shared utility) ---
const formatCurrency = (amount: number, currency: string) => {
    if (!amount) return ''
    const rounded = Math.round(amount)
    const formatted = rounded.toLocaleString('en-IN') // adds commas like 1,23,456
    if (currency === 'INR') return `₹${formatted}`

    const symbolMap: Record<string, string> = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥'
    }
    const symbol = symbolMap[currency] || currency
    return `${symbol} ${formatted}`
}

interface DealBottomScrollProps {
    title: string
    roomData: any
    checkin: string
    checkout: string
    selectedCancellationPolicy?: string
}

const DealBottomScroll: React.FC<DealBottomScrollProps> = ({ title, roomData, checkin, checkout, selectedCancellationPolicy }) => {
    const icons = [Coffee]

    // Determine which tab to show based on cancellation policy filter
    const getFilteredTab = (): 'refundable' | 'non-refundable' | null => {
        if (!selectedCancellationPolicy || selectedCancellationPolicy === 'Any') return null
        // Map filter values to tab types (case-insensitive matching)
        const policy = selectedCancellationPolicy.toLowerCase()
        if (policy === 'free') return 'refundable'
        if (policy === 'non-refundable' || policy === 'nonrefundable') return 'non-refundable'
        return null
    }

    const filteredTab = getFilteredTab()
    const isFiltered = filteredTab !== null

    // Use filtered tab if filter is applied, otherwise use state
    const [activeTabState, setActiveTab] = useState<'refundable' | 'non-refundable'>('refundable')

    const nights = (() => {
        if (!checkin || !checkout) return 0
        const inDate = new Date(checkin)
        const outDate = new Date(checkout)
        const diffTime = Math.abs(outDate.getTime() - inDate.getTime())
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    })()

    // --- Extract providers ---
    const refundableProviders = roomData?.free?.providers || {}
    const nonRefundableProviders = roomData?.non_refundable?.providers || {}

    // --- Normalize deals ---
    const formatDeals = (providers: any, type: 'free' | 'non-refundable') =>
        Object.entries(providers).map(([providerName, providerData]: any) => {
            // Always use total_price if available, otherwise use price.amount
            const rawPrice = providerData?.total_price ?? providerData?.price?.amount ?? 0
            const currency = providerData?.price?.currency ?? 'INR'
            const redirectLink = providerData?.affiliate_link || ''
            const breakfastIncluded = providerData?.breakfast_included ?? false
            // 🧩 Normalize provider name (uppercased to match PROVIDER_LOGOS keys)
            const providerKey = providerName.toUpperCase().replace(/\s+/g, '_') as ProviderName

            // 🖼️ Use mapped logo if available, otherwise fallback
            const logo = providerData?.logo_url || PROVIDER_LOGOS[providerKey] || '/onBoarding/walkthrough/default_logo.jpg'

            // Check if provider is Rimigo
            const isRimigoProvider = providerName === 'Rimigo'

            return {
                id: `${type}-${providerName}`,
                platform: providerName,
                logo,
                price: formatCurrency(rawPrice, currency), // formatted string for UI
                rawPrice, // numeric value for math
                currency,
                cancellationType: type === 'free' ? 'free' : 'non-refundable',
                redirectLink,
                breakfastIncluded,
                nights: `for ${nights} night${nights > 1 ? 's' : ''}`,
                // Rimigo-specific data for internal users
                rimigoData: isRimigoProvider ? {
                    price_amount: providerData?.price?.amount,
                    total_price: providerData?.total_price,
                    lowest_price_provider: providerData?.lowest_price_provider,
                    service_charge_added: providerData?.service_charge_added,
                    service_charge_added_amount: providerData?.service_charge_added_amount
                } : undefined
            }
        })

    const refundableDeals = formatDeals(refundableProviders, 'free').sort((a, b) => (a.rawPrice || 0) - (b.rawPrice || 0))
    const nonRefundableDeals = formatDeals(nonRefundableProviders, 'non-refundable').sort((a, b) => (a.rawPrice || 0) - (b.rawPrice || 0))

    // --- Find lowest numeric price ---

    const addSavingsByTab = (deals: any[]) => {
        if (!deals.length) return []
        const highestPrice = Math.max(...deals.map((d) => d.rawPrice || 0))
        return deals.map((deal) => {
            const diff = highestPrice - deal.rawPrice
            return {
                ...deal,
                save: diff > 0 ? `Save ${formatCurrency(diff, deal.currency)}` : null
            }
        })
    }

    const finalRefundableDeals = addSavingsByTab(refundableDeals)
    const finalNonRefundableDeals = addSavingsByTab(nonRefundableDeals)

    // Check if tabs have deals
    const hasRefundableDeals = finalRefundableDeals.length > 0
    const hasNonRefundableDeals = finalNonRefundableDeals.length > 0

    // Only calculate cheapest tab if both have deals
    const refundableLowest = hasRefundableDeals ? Math.min(...finalRefundableDeals.map((d) => d.rawPrice || Infinity)) : Infinity
    const nonRefundableLowest = hasNonRefundableDeals ? Math.min(...finalNonRefundableDeals.map((d) => d.rawPrice || Infinity)) : Infinity

    let cheaperTab: 'refundable' | 'non-refundable' | null = null
    if (hasRefundableDeals && hasNonRefundableDeals) {
        if (refundableLowest < nonRefundableLowest) cheaperTab = 'refundable'
        else if (nonRefundableLowest < refundableLowest) cheaperTab = 'non-refundable'
    }

    // Auto-select tab: cheapest price first, then fallback to whichever has deals
    useEffect(() => {
        if (isFiltered) return
        if (hasRefundableDeals && hasNonRefundableDeals) {
            if (nonRefundableLowest < refundableLowest) {
                setActiveTab('non-refundable')
            } else {
                setActiveTab('refundable')
            }
        } else if (!hasRefundableDeals && hasNonRefundableDeals) {
            setActiveTab('non-refundable')
        } else if (hasRefundableDeals && !hasNonRefundableDeals) {
            setActiveTab('refundable')
        }
    }, [hasRefundableDeals, hasNonRefundableDeals, refundableLowest, nonRefundableLowest, isFiltered])

    // Determine which tab to display
    const effectiveActiveTab = isFiltered ? filteredTab! : activeTabState

    return (
        <div className="mt-4 flex h-fit min-w-[80%] max-w-[80%] md:min-w-[50%] md:max-w-[50%] flex-col rounded-[16px] overflow-hidden border border-grey-4  ">
            {/* Header */}
            <div className="flex flex-row justify-between bg-grey-5 p-3 rounded-t-[16px] border-b border-grey-4">
                <Typography
                    size="14"
                    weight="bold"
                    family="redhat"
                    color="grey-0">
                    {title}
                </Typography>
                <div className="flex flex-row items-center gap-3">
                    {/(meal|breakfast|lunch|dinner)/i.test(title) && (
                        <div className="flex flex-row items-center gap-3">
                            {icons.map((Icon, idx) => (
                                <Icon
                                    key={idx}
                                    size={16}
                                    className="text-grey-2"
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs - Show when at least one tab has deals (including when filter is applied) */}
            {(hasRefundableDeals || hasNonRefundableDeals) && (
                <div className={`relative border-b border-grey-4 h-[54px] ${hasRefundableDeals && hasNonRefundableDeals && !isFiltered ? 'grid grid-cols-2' : 'flex'}`}>
                    {hasRefundableDeals && (
                        <button
                            onClick={() => !isFiltered && setActiveTab('refundable')}
                            disabled={isFiltered}
                            className={`flex flex-col items-center justify-center transition-all duration-300 relative w-full ${effectiveActiveTab === 'refundable' ? 'bg-secondary-green/10' : 'bg-transparent'
                                } ${isFiltered ? 'cursor-default' : 'cursor-pointer'}`}>
                            <Typography
                                size="14"
                                weight="bold"
                                family="redhat"
                                color={effectiveActiveTab === 'refundable' ? 'secondary-green' : 'grey-1'}>
                                Refundable
                            </Typography>
                            {cheaperTab === 'refundable' && !isFiltered && (
                                <Typography
                                    size="11"
                                    weight="semibold"
                                    family="manrope"
                                    color="grey-2">
                                    Cheaper options
                                </Typography>
                            )}
                            {effectiveActiveTab === 'refundable' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-secondary-green" />}
                        </button>
                    )}

                    {hasNonRefundableDeals && (
                        <button
                            onClick={() => !isFiltered && setActiveTab('non-refundable')}
                            disabled={isFiltered}
                            className={`flex flex-col items-center justify-center transition-all duration-300 relative w-full ${effectiveActiveTab === 'non-refundable' ? 'bg-secondary-red/10' : 'bg-transparent'
                                } ${isFiltered ? 'cursor-default' : 'cursor-pointer'}`}>
                            <Typography
                                size="14"
                                weight="bold"
                                family="redhat"
                                color={effectiveActiveTab === 'non-refundable' ? 'secondary-red' : 'grey-1'}>
                                Non-refundable
                            </Typography>
                            {cheaperTab === 'non-refundable' && !isFiltered && (
                                <Typography
                                    size="11"
                                    weight="semibold"
                                    family="manrope"
                                    color="grey-2">
                                    Cheaper options
                                </Typography>
                            )}

                            {effectiveActiveTab === 'non-refundable' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-secondary-red" />}
                        </button>
                    )}
                </div>
            )}

            {/* Tab Content */}
            <TabDeals
                deals={effectiveActiveTab === 'refundable' ? finalRefundableDeals : finalNonRefundableDeals}
                tabKey={effectiveActiveTab}
            />
        </div>
    )
}

const TabDeals: React.FC<{ deals: any[]; tabKey: string }> = ({ deals, tabKey }) => {
    const [expanded, setExpanded] = useState(false)
    const hasMore = deals.length > 2
    const visibleDeals = expanded || !hasMore ? deals : deals.slice(0, 2)
    useEffect(() => { setExpanded(false) }, [tabKey])
    return (
        <>
            <div className="bg-white">
                {visibleDeals.map((deal) => (
                    <DealsLabel key={deal.id} deal={deal} />
                ))}
            </div>
            <button
                type="button"
                onClick={hasMore ? () => setExpanded((v) => !v) : undefined}
                className={`w-full py-1.5 px-[10px] bg-grey-4 flex items-center justify-center gap-1 ${hasMore ? 'cursor-pointer hover:bg-grey-3/40 transition-colors' : ''}`}>
                <Typography
                    size="11"
                    textAlign="center"
                    weight="semibold"
                    family="manrope"
                    color={hasMore ? 'primary-default' : 'grey-1'}>
                    {hasMore
                        ? expanded
                            ? 'Show less'
                            : `View ${deals.length - 2} more price${deals.length - 2 > 1 ? 's' : ''}`
                        : 'all prices are inclusive of fees & taxes'}
                </Typography>
                {hasMore && (
                    <ChevronDown className={`h-3 w-3 text-primary-default transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                )}
            </button>
        </>
    )
}

export default DealBottomScroll
