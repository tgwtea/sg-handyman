import { test, expect } from '@playwright/test'
import { login, openCompany, USERS, BUSINESS_COMPANY } from './helpers.js'

test.describe('Business owner', () => {
  test('sees the timeslot manager on their own company page', async ({ page }) => {
    await login(page, USERS.business)
    await openCompany(page, BUSINESS_COMPANY)

    await expect(page.getByRole('heading', { name: 'Manage timeslots' })).toBeVisible()
    await expect(page.getByLabel('Date')).toBeVisible()
  })

  test('does not see the timeslot manager when logged out', async ({ page }) => {
    await openCompany(page, BUSINESS_COMPANY)

    await expect(page.getByRole('heading', { name: 'Available timeslots' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Manage timeslots' })).toHaveCount(0)
  })
})
