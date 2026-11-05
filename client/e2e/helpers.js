import process from 'node:process'
import { expect, request } from '@playwright/test'

// API base URL: the Express server, whose routes all live under /api
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8000/api'

// For request.newContext: with a trailing slash, a relative path such as 'auth/login'
// keeps /api. A leading slash ('/auth/login') would replace /api and hit a 404.
export const API_BASE_URL = `${API_URL.replace(/\/$/, '')}/`

// Test accounts created by `pnpm seed` (see server/scripts/seed-data.js).
// Override with E2E_PASSWORD if your database uses another password.
export const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'test-password-123'
export const USERS = {
  customer: 'test-customer-1',
  business: 'test-business'
}

// The seeded admin account; override with E2E_ADMIN_PASSWORD if your database uses another password
export const ADMIN = { username: 'admin', password: process.env.E2E_ADMIN_PASSWORD ?? 'admin123' }

// The company that test-business owns
export const BUSINESS_COMPANY = 'Tan Repair'

// Logs in through the login form and waits until the navbar shows the user
export async function login(page, username, password = TEST_PASSWORD) {
  await page.goto('/login')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('navigation').getByText(username)).toBeVisible()
}

// Opens a company page from the companies list by its card title
export async function openCompany(page, companyName) {
  await page.goto('/companies')
  const card = page.locator('.card').filter({ has: page.getByRole('heading', { name: companyName, exact: true }) })
  await card.getByRole('link', { name: 'Details' }).click()
  await expect(page.getByRole('heading', { name: companyName, level: 2 })).toBeVisible()
}

// A title that no other run uses, so a test can find (and clean up) its own data
export function uniqueTitle(prefix) {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

// Seeded timeslots expire as days pass, so a booking test makes its own free slot.
// test-business creates a 30-minute slot tomorrow evening (after every seeded closing time, which is
// 19:00 Singapore time at the latest). Call `remove()` in `finally`, after any booking on it is cancelled.
export async function createFreeSlot(companyName = BUSINESS_COMPANY) {
  const api = await request.newContext({ baseURL: API_BASE_URL })
  const login = await api.post('auth/login', { data: { username: USERS.business, password: TEST_PASSWORD } })
  expect(login.ok()).toBeTruthy()

  const companies = await (await api.get('companies')).json()
  const companyId = companies.find((item) => item.name === companyName)._id

  // 12:00 UTC is 20:00 in Singapore; a random minute avoids a slot that another run left behind
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  let slot = null
  for (let attempt = 0; attempt < 5 && !slot; attempt++) {
    const start = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(),
      12, Math.floor(Math.random() * 30)))
    const end = new Date(start.getTime() + 30 * 60 * 1000)
    const response = await api.post('timeslots', { data: { companyId, start, end } })
    if (response.status() === 201) slot = await response.json()
  }
  expect(slot).toBeTruthy()

  return {
    slot,
    companyId,
    async remove() {
      await api.delete(`timeslots/${slot._id}`)
      await api.dispose()
    }
  }
}

// An API client logged in as `username`, for setting up and cleaning up test data.
// Call `dispose()` when done.
export async function apiAs(username, password = TEST_PASSWORD) {
  const api = await request.newContext({ baseURL: API_BASE_URL })
  const login = await api.post('auth/login', { data: { username, password } })
  expect(login.ok()).toBeTruthy()
  return api
}

// Books `slot` as the given customer API client and returns the booking
// ---- shop ----

// a seeded seller and its business account (server/scripts/seed-data.js)
export const SHOP_SELLER = 'Arctic Air Aircon'
export const SHOP_SELLER_LOGIN = { username: 'arcticair', password: 'arcticair123' }

// empties the saved cart of the logged-in API user
export async function clearCart(api) {
  const response = await api.put('shop/cart', { data: { items: [] } })
  expect(response.ok()).toBeTruthy()
}

// places an order for one unit of a product, without the UI
export async function placeOrderByApi(api, productId) {
  const response = await api.post('shop/orders', {
    data: {
      recipientName: uniqueTitle('E2E order'),
      deliveryAddress: '1 Test Street, Singapore 000001',
      items: [{ id: productId, quantity: 1 }]
    }
  })
  expect(response.status()).toBe(201)
  return response.json()
}

// the API cannot delete an order, so cancel it and hide it from the customer instead
export async function removeOrder(api, orderId) {
  const cancel = await api.put(`shop/orders/${orderId}/cancel`, { data: { reason: 'E2E test clean-up' } })
  // 409: the order is already cancelled (for example by the company)
  expect([200, 409]).toContain(cancel.status())
  const hide = await api.put(`shop/orders/${orderId}/hide`)
  expect(hide.ok()).toBeTruthy()
}

export async function bookSlot(api, slot, service = 'Test service') {
  const response = await api.post('bookings', { data: { timeslotId: slot._id, service } })
  expect(response.status()).toBe(201)
  return response.json()
}
