// Step order for lead gen flow
type LeadGenStepType = 'select-group-type' | 'select-purpose' | 'select-status' | 'thank-you'

export const getLeadGenStepNumber = (stepRoute: LeadGenStepType): number => {
    const steps: LeadGenStepType[] = ['select-group-type', 'select-purpose', 'select-status']
    return steps.indexOf(stepRoute) + 1
}

export const getLeadGenTotalSteps = (): number => {
    return 3 // GroupType, Purpose, Status, ThankYou
}
