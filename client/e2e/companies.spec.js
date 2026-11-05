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

    await expect(page).toHaveURL(/\/companies\/[a-f0-9]{24}#details$/)
    const table = page.getByRole('table').first()
    await expect(table.getByRole('columnheader', { name: 'Service' })).toBeVisible()
    await expect(table.getByRole('columnheader', { name: 'Starting Price' })).toBeVisible()
    await expect(table.getByRole('row').nth(1)).toBeVisible()
  })

  test('Book a slot opens the company page at the timeslots', async ({ page }) => {
    await page.goto('/companies')
    await page.locator('.card').first().getByRole('link', { name: 'Book a slot' }).click()

    await expect(page).toHaveURL(/#book-a-slot$/)
    await expect(page.getByRole('heading', { name: 'Available timeslots' })).toBeInViewport()
  })

  test('the side nav jumps to each section and highlights it', async ({ page }) => {
    await openCompany(page, BUSINESS_COMPANY)

    const nav = page.getByRole('navigation', { name: 'Company page sections' })
    const sections = [
      ['Book a Slot', 'book-a-slot'],
      ['Reviews', 'reviews'],
      ['Contact', 'contact'],
      ['Details & Pricing', 'details'],
    ]
    for (const [label, id] of sections) {
      const link = nav.getByRole('link', { name: label })
      await link.click()

      await expect(page).toHaveURL(new RegExp(`#${id}$`))
      await expect(page.locator(`#${id}`)).toBeInViewport()
      await expect(link).toHaveAttribute('aria-current', 'location')
    }
  })

  // the pin needs the OneMap login, which CI does not have, so this checks the map box only
  test('the contact section shows the company map', async ({ page }) => {
    await openCompany(page, BUSINESS_COMPANY)

    const map = page.getByRole('region', { name: 'Map of the company address' })
    await map.scrollIntoViewIfNeeded()
    await expect(map).toBeVisible()
    const box = await map.boundingBox()
    expect(box.height).toBeGreaterThan(200)
  })
})
