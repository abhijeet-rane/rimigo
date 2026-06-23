import React, { useState } from 'react'

import { StatusQuestionItem } from './StatusQuestionItem'
import { TripQuestionBaseLayout } from './TripQuestionBaseLayout'
import { InputBox } from '@/components/shared/InputBox'

interface NameQuestionProps {
    onStepNext: (step: number, payload?: any) => void // send values to backend
}

export const NameQuestion: React.FC<NameQuestionProps> = ({ onStepNext }) => {
    const NameBodyStructure = [
        {
            id: 1,
            questionUiText: 'Your gender',
            questionServer: 'your_gender',
            answerItem: [
                { id: 1, valueUi: 'Male', valueServer: 'male' },
                { id: 2, valueUi: 'Female', valueServer: 'female' },
                { id: 3, valueUi: 'Prefer not to say', valueServer: 'prefer_not_to_say' }
            ]
        }
    ]

    const currentStep = 1

    const [name, setName] = useState('')
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | string[]>>({})

    const isNextDisabled =
        name.trim() === '' ||
        NameBodyStructure.some((item) => {
            const answer = selectedAnswers[item.questionServer]
            if (!answer) return true
            if (Array.isArray(answer) && answer.length === 0) return true
            return false
        })

    const handleSelectionChange = (questionKey: string, selectedUiValue: string | string[]) => {
        const question = NameBodyStructure.find((q) => q.questionServer === questionKey)
        if (!question) return

        if (Array.isArray(selectedUiValue)) {
            const serverValues = selectedUiValue
                .map((uiVal) => question.answerItem.find((a) => a.valueUi === uiVal)?.valueServer)
                .filter(Boolean) as string[]
            setSelectedAnswers((prev) => ({
                ...prev,
                [questionKey]: serverValues
            }))
        } else {
            const serverValue = question.answerItem.find((a) => a.valueUi === selectedUiValue)?.valueServer ?? ''
            setSelectedAnswers((prev) => ({
                ...prev,
                [questionKey]: serverValue
            }))
        }
    }

    const handleNext = () => {
        const payload = {
            name,
            answers: selectedAnswers
        }
        onStepNext(currentStep + 1, payload)
    }

    return (
        <TripQuestionBaseLayout
            currentStep={currentStep}
            title="What kind of accommodation would you prefer?"
            description="One line of additional copy here"
            dynamicContent={
                <div className="flex flex-col gap-[48px]">
                    {/* Name Input */}
                    <div className="flex flex-col gap-[12px] ">
                        <InputBox
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Gender Question */}
                    {NameBodyStructure.map((q) => (
                        <StatusQuestionItem
                            key={q.id}
                            question={q.questionUiText}
                            subText=""
                            answers={q.answerItem.map((a) => a.valueUi)}
                            multiSelect={false}
                            onSelectionChange={(selected) => handleSelectionChange(q.questionServer, selected)}
                        />
                    ))}
                </div>
            }
            onNext={handleNext}
            showButton={true}
            buttonName="Next"
            buttonDisbale={isNextDisabled}
        />
    )
}
