// Icons from BudgetQuestionPage (Onboarding)
const BUDGET_ICONS = {
    budget: 'https://media.rimigo.com/1764778090062_5ae4267a9465536cbf3877072bb65037.png', // Pocket friendly
    moderate: 'https://media.rimigo.com/1764778087129_df9140663e8651689329d962c3b6b497.png', // Balanced Spend
    premium: 'https://media.rimigo.com/1764778088763_3342e12de68b5574a3e4b07a9421d975.png' // Premium Escape
}

interface BudgetRangeCardsProps {
    selected: 'budget' | 'moderate' | 'premium' | null
    onSelect: (tier: 'budget' | 'moderate' | 'premium') => void
}

const TIERS = [
    {
        key: 'budget' as const,
        label: 'Budget (per person)',
        range: '₹60k - ₹1L',
        description: 'Hostels, street food, public transit',
        image: BUDGET_ICONS.budget,
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-300',
        activeBg: 'bg-green-50',
    },
    {
        key: 'moderate' as const,
        label: 'Moderate (per person)',
        range: '₹1L - ₹2L',
        description: '3-4 star hotels, local dining',
        image: BUDGET_ICONS.moderate,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-300',
        activeBg: 'bg-blue-50',
    },
    {
        key: 'premium' as const,
        label: 'Premium (per person)',
        range: '₹2L - ₹5L+',
        description: 'Luxury stays, fine dining, private transfers',
        image: BUDGET_ICONS.premium,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        activeBg: 'bg-amber-50',
    }
]

const BudgetRangeCards = ({ selected, onSelect }: BudgetRangeCardsProps) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TIERS.map((tier) => {
                const isSelected = selected === tier.key

                return (
                    <button
                        key={tier.key}
                        onClick={() => onSelect(tier.key)}
                        className={`flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl transition-all duration-200 cursor-pointer text-center border-[1px] ${
                            isSelected
                                ? `${tier.border} ${tier.activeBg} shadow-sm`
                                : 'border-grey-4 bg-white hover:border-grey-3'
                        }`}>
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden ${
                                isSelected ? tier.bg : 'bg-white'
                            }`}>
                            <img
                                src={tier.image}
                                alt={tier.label}
                                className="w-12 h-12 object-contain"
                            />
                        </div>
                        <span
                            className={`text-base font-bold font-manrope ${
                                isSelected ? 'text-grey-0' : 'text-grey-0'
                                }`}>
                            {tier.range}
                           
                        </span>
                        <span className={`text-[14px] font-medium font-red-hat-display ${isSelected ? tier.color : 'text-grey-2'}`}>
                        {tier.label}
                        </span>
                        <span className="text-[12px] font-medium text-grey-1 font-manrope leading-tight">
                            {tier.description}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}

export default BudgetRangeCards
