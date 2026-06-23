import React from 'react'
import MobileSearchExpandContent from './MobileSearchExpandContent'
import GuestsSelector, { GuestsData } from './GuestsSelector'

interface WhoIsGoingProps {
    value: GuestsData
    onChange: (data: GuestsData) => void
    initialData?: GuestsData // Keep this for compatibility with parent, but don't use it
}

const WhoIsGoing: React.FC<WhoIsGoingProps> = ({ value, onChange }) => {
    return (
        <MobileSearchExpandContent title="Who is going?">
            <div className="px-2.5 pb-6">
                <GuestsSelector
                    value={value}
                    onChange={onChange}
                />
            </div>
        </MobileSearchExpandContent>
    )
}

export default WhoIsGoing
