import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { StepIndicator } from '../StepIndicator'

describe('StepIndicator', () => {
  it('renders all four step labels and the title', () => {
    render(<StepIndicator currentStep="where" completedSteps={new Set()} onStepClick={() => {}} />)
    expect(screen.getByText('Planning your trip')).toBeInTheDocument()
    for (const label of ['Where', 'When', 'Who', 'How']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('marks the current step dot as active', () => {
    render(<StepIndicator currentStep="when" completedSteps={new Set(['where'])} onStepClick={() => {}} />)
    expect(screen.getByTestId('step-dot-when')).toHaveClass('wf-step-dot--active')
    expect(screen.getByTestId('step-dot-where')).not.toHaveClass('wf-step-dot--active')
  })

  it('clicking a completed step dot triggers onStepClick with that step', async () => {
    const onStepClick = vi.fn()
    render(<StepIndicator currentStep="when" completedSteps={new Set(['where'])} onStepClick={onStepClick} />)
    await userEvent.click(screen.getByTestId('step-dot-where'))
    expect(onStepClick).toHaveBeenCalledWith('where')
  })

  it('clicking a future (not completed) step dot is a no-op', async () => {
    const onStepClick = vi.fn()
    render(<StepIndicator currentStep="where" completedSteps={new Set()} onStepClick={onStepClick} />)
    await userEvent.click(screen.getByTestId('step-dot-who'))
    expect(onStepClick).not.toHaveBeenCalled()
  })
})
