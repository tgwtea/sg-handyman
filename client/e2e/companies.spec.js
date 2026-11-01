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

  test('filters and sort live in the URL and survive a reload', async ({ page }) => {
    await page.goto('/companies')
    await expect(page.locator('.card').first()).toBeVisible()

    await page.getByLabel('Aircon Servicing', { exact: true }).check()
    await page.getByLabel('Sort companies').selectOption('name-desc')
    await expect(page).toHaveURL(/cat=Aircon(\+|%20)Servicing/)
    await expect(page).toHaveURL(/sort=name-desc/)

    await page.reload()
    await expect(page.getByLabel('Aircon Servicing', { exact: true })).toBeChecked()
    await expect(page.getByLabel('Sort companies')).toHaveValue('name-desc')

    // every card left on screen offers Aircon Servicing
    const cards = page.locator('.card')
    await expect(cards.first()).toBeVisible()
    for (const card of await cards.all()) {
      await expect(card.getByText('Aircon Servicing', { exact: true })).toBeVisible()
    }
  })

  test('Home search fills the filter, and typing replaces history instead of adding to it', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Describe the problem').fill('aircon')
    await page.getByRole('button', { name: 'Search' }).click()

    await expect(page).toHaveURL(/\/companies\?q=aircon$/)
    const search = page.getByLabel('Search', { exact: true })
    await expect(search).toHaveValue('aircon')

    const lengthBefore = await page.evaluate(() => history.length)
    // the caret starts at the front of the field, so move it to the end first
    await search.click()
    await search.press('End')
    await search.pressSequentially(' servicing')
    await expect(page).toHaveURL(/q=aircon(\+|%20)servicing$/)
    expect(await page.evaluate(() => history.length)).toBe(lengthBefore)

    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
  })

  test('a failed load shows an error with Retry, not an empty search', async ({ page }) => {
    await page.route(/\/api\/companies$/, (route) => route.abort())
    await page.goto('/companies')

    await expect(page.getByRole('alert')).toContainText('Could not load companies.')
    await expect(page.getByText(/companies? found/)).toBeHidden()

    await page.unroute(/\/api\/companies$/)
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.locator('.card').first()).toBeVisible()
    await expect(page.getByRole('alert')).toBeHidden()
  })
})
