import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { WizardShell } from '../WizardShell'

describe('WizardShell', () => {
  it('renders the step indicator title and the children body', () => {
    render(
      <WizardShell
        currentStep="where"
        completedSteps={new Set()}
        onStepClick={() => {}}
        subTabs={null}
      >
        <p>step body content</p>
      </WizardShell>
    )
    expect(screen.getByText('Planning your trip')).toBeInTheDocument()
    expect(screen.getByText('step body content')).toBeInTheDocument()
  })

  it('renders sub-tabs when provided', () => {
    render(
      <WizardShell
        currentStep="where"
        completedSteps={new Set()}
        onStepClick={() => {}}
        subTabs={{
          activeId: 'destination',
          onChange: () => {},
          tabs: [
            { id: 'destination',    label: 'WHERE TO?',    subheading: 'Select Destination' },
            { id: 'departure-city', label: 'FLYING FROM?', subheading: 'Select City' },
          ],
        }}
      >
        <p>body</p>
      </WizardShell>
    )
    expect(screen.getByTestId('tab-destination')).toBeInTheDocument()
  })

  it('omits sub-tabs when subTabs is null', () => {
    render(
      <WizardShell
        currentStep="when"
        completedSteps={new Set(['where'])}
        onStepClick={() => {}}
        subTabs={null}
      >
        <p>body</p>
      </WizardShell>
    )
    expect(screen.queryByTestId('tab-destination')).not.toBeInTheDocument()
  })
})
