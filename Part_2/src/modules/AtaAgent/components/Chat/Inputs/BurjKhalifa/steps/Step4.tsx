import React from 'react'
import { StepComponentProps } from '../SteppedInputLayout'

const Step4: React.FC<StepComponentProps> = ({ onNext }) => {
    return (
        <div className="flex flex-col gap-4">
            {/* Step 4 Content - Empty for now */}
            <div className="text-center py-8 text-grey_2">
                Step 4 Content (To be implemented)
            </div>
            {/* Temporary Next Button */}
            <button
                onClick={() => onNext()}
                className="mt-4 px-4 py-2 bg-primary-default text-white rounded-lg font-medium hover:bg-primary-default_80 transition-colors">
                Next
            </button>
        </div>
    )
}

export default Step4

