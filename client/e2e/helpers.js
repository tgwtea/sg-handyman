import process from 'node:process'
import { expect } from '@playwright/test'

// API base URL, same as client/constants/urls.js
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8000'

// Test accounts created by `pnpm seed` (see server/scripts/seed-data.js).
// Override with E2E_PASSWORD if your database uses another password.
export const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'test-password-123'
export const USERS = {
  customer: 'test-customer-1',
  business: 'test-business'
}

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
