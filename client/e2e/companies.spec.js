import { test, expect } from '@playwright/test'
import { openCompany, BUSINESS_COMPANY } from './helpers.js'

test.describe('Companies', () => {
  test('lists companies as cards', async ({ page }) => {
    await page.goto('/companies')

    const cards = page.locator('.card')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThan(0)
    await expect(cards.first().getByRole('link', { name: 'Details' })).toBeVisible()
  })

  test('Details opens the company page with its services and prices', async ({ page }) => {
    await openCompany(page, BUSINESS_COMPANY)

    await expect(page).toHaveURL(/\/companies\/[a-f0-9]{24}$/)
    const table = page.getByRole('table').first()
    await expect(table.getByRole('columnheader', { name: 'Service' })).toBeVisible()
    await expect(table.getByRole('columnheader', { name: 'Starting Price' })).toBeVisible()
    await expect(table.getByRole('row').nth(1)).toBeVisible()
  })
})
