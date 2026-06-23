import React from 'react'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import Typography from '@/components/shared/Typography'
import type { Country } from '../utils/countrySearch'

interface CountryRowProps {
    country: Country
    selected: boolean
    onClick: () => void
}

export const CountryRow: React.FC<CountryRowProps> = ({ country, selected, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={clsx(
            'flex items-center w-full px-4 py-2.5 gap-3 text-left transition-colors',
            'hover:bg-grey-5',
            selected && 'bg-grey-5'
        )}>
        <span className="text-[20px] leading-none">{country.flag}</span>
        <span className="flex-1 truncate">
            <Typography
                family="manrope"
                weight={selected ? 'semibold' : 'medium'}
                size="15"
                color="grey-0">
                {country.name}
            </Typography>
        </span>
        <Typography
            family="manrope"
            weight="medium"
            size="14"
            color="grey-1">
            {country.code}
        </Typography>
        {selected && (
            <Check
                size={16}
                className="text-grey-0 ml-1 shrink-0"
            />
        )}
    </button>
)
