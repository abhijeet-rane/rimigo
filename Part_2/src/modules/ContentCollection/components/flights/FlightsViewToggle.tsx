import React from 'react'
import { Heart, Sparkles } from 'lucide-react'

export type FlightsView = 'shortlisted' | 'explore'

interface FlightsViewToggleProps {
    view: FlightsView
    shortlistedCount: number
    onChange: (next: FlightsView) => void
}

const FlightsViewToggle: React.FC<FlightsViewToggleProps> = ({ view, shortlistedCount, onChange }) => {
    const renderButton = (key: FlightsView, label: string, icon: React.ReactNode, badge?: number) => {
        const active = view === key
        return (
            <button
                type="button"
                onClick={() => onChange(key)}
                className="font-red-hat-display inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    background: active ? '#101010' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#363636',
                    border: `1px solid ${active ? '#101010' : '#E0E0E0'}`,
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: '-0.02em'
                }}>
                {icon}
                <span>{label}</span>
                {typeof badge === 'number' && badge > 0 && (
                    <span
                        className="inline-flex items-center justify-center font-red-hat-display"
                        style={{
                            minWidth: 18,
                            height: 18,
                            padding: '0 5px',
                            borderRadius: 999,
                            background: active ? '#FFFFFF' : '#7011F6',
                            color: active ? '#101010' : '#FFFFFF',
                            fontSize: 11,
                            fontWeight: 700,
                            marginLeft: 2
                        }}>
                        {badge}
                    </span>
                )}
            </button>
        )
    }

    return (
        <div className="flex items-center gap-2">
            {renderButton('explore', 'Explore', <Sparkles className="w-3.5 h-3.5" />)}
            {renderButton('shortlisted', 'Shortlisted', <Heart className="w-3.5 h-3.5" />, shortlistedCount)}
        </div>
    )
}

export default FlightsViewToggle
