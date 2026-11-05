import { describe, it, expect } from 'vitest'
import { searchTerms, searchScore } from '../utils/companySearch.js'

const plumber = {
  name: 'Pipe Pros',
  services: [{ category: 'Basins & Taps', details: [{ service: 'Leaking Basin Pipe Repair' }] }],
}
const carpenter = {
  name: 'Wood Works',
  services: [{ category: 'Cabinets', details: [{ service: 'Kitchen Cabinet Door Replacement' }] }],
}
const aircon = {
  name: 'Cool Air',
  services: [{ category: 'Aircon Servicing', details: [{ service: 'Chemical Wash (Per Unit)' }] }],
}

describe('company search', () => {
  it('drops filler words and adds everyday synonyms', () => {
    expect(searchTerms('My sink is leaking')).toEqual([['sink', 'basin', 'tap'], ['leaking', 'leak']])
  })

  it('finds a plumber for "kitchen sink leaking" and ranks it first', () => {
    const terms = searchTerms('kitchen sink leaking')
    expect(searchScore(plumber, terms)).toBe(2)
    expect(searchScore(carpenter, terms)).toBe(1)
    expect(searchScore(aircon, terms)).toBe(0)
  })

  it('matches "aircon not cold" and "AC" to aircon companies', () => {
    expect(searchScore(aircon, searchTerms('aircon not cold'))).toBeGreaterThan(0)
    expect(searchScore(aircon, searchTerms('AC'))).toBe(1)
    expect(searchScore(plumber, searchTerms('aircon not cold'))).toBe(0)
  })
})
