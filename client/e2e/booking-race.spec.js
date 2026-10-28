import { test, expect, request } from '@playwright/test'
import { API_URL, TEST_PASSWORD, BUSINESS_COMPANY } from './helpers.js'

const CUSTOMERS = ['test-customer-1', 'test-customer-2']

// An API client with its own session cookie, logged in as `username`
async function loggedInApi(username) {
  const api = await request.newContext({ baseURL: API_URL })
  const response = await api.post('/auth/login', { data: { username, password: TEST_PASSWORD } })
  expect(response.ok()).toBeTruthy()
  return api
}

async function findCompanyId(api, companyName) {
  const companies = await (await api.get('/companies')).json()
  const company = companies.find((item) => item.name === companyName)
  expect(company).toBeTruthy()
  return company._id
}

test.describe('Booking under race conditions', () => {
  test('two customers book the same slot at once: only one gets it', async () => {
    const apis = await Promise.all(CUSTOMERS.map(loggedInApi))
    let bookingId = null

    try {
      const companyId = await findCompanyId(apis[0], BUSINESS_COMPANY)
      const timeslots = await (await apis[0].get(`/companies/${companyId}/timeslots`)).json()
      const freeSlot = timeslots.find((slot) => !slot.taken)
      expect(freeSlot).toBeTruthy()

      // both requests leave together, so neither sees the other's booking first
      const responses = await Promise.all(apis.map((api) =>
        api.post('/bookings', { data: { timeslotId: freeSlot._id } })
      ))
      const statuses = responses.map((response) => response.status()).sort()
      expect(statuses).toEqual([201, 409])

      const winner = responses.find((response) => response.status() === 201)
      bookingId = (await winner.json())._id

      const loser = responses.find((response) => response.status() === 409)
      expect((await loser.json()).message).toBe('Someone else just booked this slot. Pick another one.')
    } finally {
      // the database is shared, so never leave a test booking behind
      if (bookingId) {
        const owners = await Promise.all(apis.map((api) => api.delete(`/bookings/${bookingId}`)))
        expect(owners.some((response) => response.ok())).toBeTruthy()
      }
      await Promise.all(apis.map((api) => api.dispose()))
    }
  })

  test('next-free lists each company\'s earliest free slot in the future', async () => {
    const api = await request.newContext({ baseURL: API_URL })
    try {
      const response = await api.get('/timeslots/next-free')
      expect(response.ok()).toBeTruthy()
      const nextFree = await response.json()

      const now = Date.now()
      for (const entry of nextFree) {
        expect(new Date(entry.start).getTime()).toBeGreaterThan(now)
      }

      const companyId = await findCompanyId(api, BUSINESS_COMPANY)
      expect(nextFree.map((entry) => entry.companyId)).toContain(companyId)
    } finally {
      await api.dispose()
    }
  })
})
