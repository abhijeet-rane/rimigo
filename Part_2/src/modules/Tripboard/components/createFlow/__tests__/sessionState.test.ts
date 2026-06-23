import { describe, it, expect } from 'vitest'
import { CREATE_FLOW_VERSION, toJSON, fromJSON, type PersistedWizardState } from '../sessionState'

const sample: PersistedWizardState = {
  version: CREATE_FLOW_VERSION,
  currentStep: 'when',
  currentSubTab: 'destination',
  completedSteps: new Set(['where']),
  selectedCountries: [{ id: 'JP', name: 'Japan', flag: '/jp.svg', source: 'popular' }],
}

describe('sessionState', () => {
  it('roundtrips Set <-> Array via toJSON / fromJSON', () => {
    const restored = fromJSON(toJSON(sample))
    expect(restored).not.toBeNull()
    expect(restored!.completedSteps).toBeInstanceOf(Set)
    expect(Array.from(restored!.completedSteps)).toEqual(['where'])
    expect(restored!.selectedCountries).toEqual(sample.selectedCountries)
  })

  it('returns null when version mismatches', () => {
    const json = toJSON(sample).replace(`"version":${CREATE_FLOW_VERSION}`, '"version":-1')
    expect(fromJSON(json)).toBeNull()
  })

  it('returns null when JSON is unparseable', () => {
    expect(fromJSON('not json')).toBeNull()
  })

  it('returns null when version field is missing', () => {
    expect(fromJSON('{"foo":1}')).toBeNull()
  })
})
