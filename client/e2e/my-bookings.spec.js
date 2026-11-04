import { test, expect } from '@playwright/test'
import { login, openCompany, createFreeSlot, apiAs, bookSlot, uniqueTitle, USERS, BUSINESS_COMPANY } from './helpers.js'

test.describe('My Bookings', () => {
  test('a visitor is asked to log in, and a business account has no bookings', async ({ page }) => {
    await page.goto('/my-bookings')
    await expect(page.getByText('as a customer to see your bookings')).toBeVisible()

    await login(page, USERS.business)
    await page.goto('/my-bookings')
    await expect(page.getByText('Only customer accounts have bookings.')).toBeVisible()
  })

  test('a customer cancels an upcoming booking, which also deletes its review', async ({ page }) => {
    const created = await createFreeSlot()
    const customer = await apiAs(USERS.customer)
    // a unique service name finds this booking's card among the customer's other bookings
    const service = uniqueTitle('Test service')
    const booking = await bookSlot(customer, created.slot, service)
    const comment = uniqueTitle('Review that goes with its booking')
    let cancelled = false

    try {
      const review = await customer.post(`reviews/company/${created.companyId}`, {
        data: { bookingId: booking._id, rating: 5, comment }
      })
      expect(review.status()).toBe(201)

      await login(page, USERS.customer)
      await page.getByRole('navigation').getByRole('link', { name: 'My Bookings' }).click()
      await expect(page).toHaveURL(/\/my-bookings$/)

      const card = page.locator('.card').filter({ has: page.getByRole('heading', { name: service }) })
      await expect(card).toBeVisible()
      await expect(card.getByRole('link', { name: BUSINESS_COMPANY })).toBeVisible()

      // the warning mentions the review; "No, keep it" keeps the booking
      await card.getByRole('button', { name: 'Cancel booking' }).click()
      await expect(card.getByText('Any review you left for it will also be deleted.')).toBeVisible()
      await card.getByRole('button', { name: 'No, keep it' }).click()
      await expect(card.getByRole('button', { name: 'Cancel booking' })).toBeVisible()

      await card.getByRole('button', { name: 'Cancel booking' }).click()
      await card.getByRole('button', { name: 'Yes, cancel it' }).click()
      await expect(page.getByText('Booking cancelled.')).toBeVisible()
      await expect(card).toHaveCount(0)
      cancelled = true

      // the review went with the booking
      await openCompany(page, BUSINESS_COMPANY)
      await expect(page.locator('#reviews').getByRole('heading', { name: 'Reviews' })).toBeVisible()
      await expect(page.locator('#reviews').getByText(comment)).toHaveCount(0)
    } finally {
      // the database is shared, so never leave a test booking (or its review) behind
      if (!cancelled) await customer.delete(`bookings/${booking._id}`)
      await customer.dispose()
      await created.remove()
    }
  })
})
